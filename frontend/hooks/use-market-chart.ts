"use client"

/**
 * `useMarketChart` — drop-in helper for a single-subscription live chart.
 *
 * Wraps the lower-level `useQuotexWs` so signal-room pages don't have to
 * re-implement the history / live-candle merging logic that already
 * exists on `/livechart`. The hook owns:
 *
 *   - The asset selection (first open asset is auto-picked).
 *   - The period (defaults to 60s; pages can override with 15 for the
 *     5-second signal page).
 *   - The merged candle buffer (history backfill + live updates).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  useQuotexWs,
  type Candle,
  type ChartPhase,
  type ChartPhaseMeta,
} from "@/hooks/use-quotex-ws"
import { useSubscriptionLock } from "@/hooks/use-subscription-lock"
import { matchAllowedMarket } from "@/lib/allowed-markets"

/**
 * Product default. When no ``preferredAsset`` is supplied, the chart
 * lands on USD/BRL OTC instead of whatever the broker happened to list
 * first (which used to surface alphabetical noise like ``ATOUSD_otc``
 * the moment the broker added a new exotic). USD/BRL is always
 * available on Quotex's OTC schedule so this is a safe fallback.
 */
const DEFAULT_ASSET_SYMBOL = "USDBRL_otc"

/**
 * Visible chart phase for the consumer (the card / page).
 *
 * - ``waiting`` — backend has gated this subscription behind the
 *   running-candle close. The card renders a "Waiting for closing
 *   running candle…" overlay.
 * - ``ready`` — the gate has opened; history + live ticks flow.
 */
export type MarketChartPhase = "idle" | "waiting" | "ready"

/**
 * FIFO sliding-window cap. Mirrors the backend's
 * ``python_backend/candle_store.py``::``MAX_CANDLES`` — the Node.js
 * website always shows exactly 500 candles. When a new bucket arrives
 * the oldest candle is dropped from the back.
 */
const MAX_CANDLES = 500

/**
 * Normalize asset symbol for comparison. The backend sends asset names
 * with `_otc` suffix (e.g. `EURUSD_otc`) but the frontend sometimes stores
 * them without the suffix (e.g. `EURUSD`). This function strips the suffix
 * to enable correct matching.
 */
function normalizeAsset(asset: string | null | undefined): string {
  if (!asset) return ""
  // Remove _otc or _OTC suffix for comparison
  return asset.replace(/_otc$/i, "").toUpperCase()
}

/**
 * Check if two asset symbols match, ignoring _otc suffix differences.
 */
function assetsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeAsset(a) === normalizeAsset(b)
}

export type MarketChartArgs = {
  /** Candle period in seconds. 60 for 1m, 15 for 15s. */
  period: number
  /**
   * Optional preferred asset symbol. When provided, we wait for the asset
   * list to arrive and then select it; otherwise we auto-pick the first
   * open asset. Pages don't usually need to set this.
   */
  preferredAsset?: string | null
  /**
   * Access token of the current user. When provided, the hook enforces
   * a per-user single-pair lock across every signal page in this
   * browser via `useSubscriptionLock`. If another tab already owns a
   * pair for this token, this hook becomes "blocked": no subscribe is
   * sent, the chart stays empty, and the consumer should render a
   * "Take over" overlay.
   *
   * Optional so legacy callers (and any non-gated page) keep working
   * unchanged.
   */
  accessToken?: string | null
}

export function useMarketChart({
  period,
  preferredAsset = null,
  accessToken = null,
}: MarketChartArgs) {
  const [asset, setAsset] = useState<string | null>(preferredAsset)
  const [history, setHistory] = useState<Candle[]>([])
  const [latest, setLatest] = useState<Candle | null>(null)

  // Ref that always holds the LATEST asset value so that useCallback
  // closures never compare against a stale snapshot. Without this,
  // rapid market switches cause the backend's ``phase`` / ``history``
  // / ``candle`` frames to be silently dropped because the closure
  // still holds the PREVIOUS asset while React hasn't re-rendered yet.
  const assetRef = useRef<string | null>(asset)
  assetRef.current = asset

  // Mirror of the latest forming bar so cross-callback closures
  // (notably `handleHistory`) can compare the authoritative refetch
  // against the most recent live tick without going through stale
  // setState snapshots.
  const latestRef = useRef<Candle | null>(latest)
  latestRef.current = latest

  // Backend-driven wait-for-bucket-close gate. The card uses
  // ``phase === "waiting"`` to render the running-candle overlay
  // instead of the chart, with a live countdown to the next bucket
  // boundary derived from ``bucketEndAt``.
  // When no asset is selected, phase is "idle" to show the
  // "Select a Market" overlay instead.
  const [phase, setPhase] = useState<MarketChartPhase>("idle")
  const [bucketEndAt, setBucketEndAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const handleHistory = useCallback(
    (sub: { asset: string; period: number }, candles: Candle[]) => {
      if (!assetsMatch(sub.asset, assetRef.current) || sub.period !== period) return
      // Same logic as /livechart: keep the live buffer if the backfill
      // came back empty (which happens occasionally on a fresh stream).
      if (candles.length === 0) return

      // -------------------------------------------------------------
      // Forming-bar preservation
      // -------------------------------------------------------------
      // Authoritative history refetches arrive ~500ms after each
      // bucket closes (see handlePhase → running_candle_closed). The
      // last entry of the refetched array is often the freshly
      // opened forming bucket as it existed at the moment the
      // backend snapshotted it — typically just one tick, so its
      // OHLC is flat (O == H == L == C).
      //
      // Without merging, that flat snapshot stomps on our live
      // forming bar which has already accumulated several ticks
      // (and therefore has a real H/L range / body). The visible
      // symptom on the 1m chart is exactly what the user reported:
      // the latest few candles flash with a body for a millisecond
      // and then collapse to a dash until more ticks arrive. The 15s
      // chart hides this because ticks land so frequently that the
      // flat window is sub-frame.
      //
      // Fix: walk the most recent N entries of the refetch and, for
      // each one, prefer whichever version is "more developed" —
      // ours (live-built from ticks) vs theirs (refetched). H - L is
      // monotonically non-decreasing within a bucket and therefore a
      // safe progress proxy.
      //
      // Why N entries, not just the tail
      // ---------------------------------
      // On 1m we observed the user's reported symptom — recent few
      // candles flash with a body, then collapse to a dash — which
      // means MULTIPLE recent buckets (not only the forming one) are
      // being overwritten. The broker's authoritative history
      // refetch fires ~500 ms after each bucket close, and at that
      // moment the broker's own aggregator hasn't always finished
      // consolidating the just-closed bucket's ticks: the snapshot
      // returns an under-developed OHLC for the last closed bucket
      // (sometimes the last 2). Our live-built version of those same
      // buckets is already correct, so we keep it. On 15s this is
      // invisible because ticks arrive so frequently that the
      // under-developed window is sub-frame.
      const MERGE_TAIL = 12
      setHistory((prevHistory) => {
        if (prevHistory.length === 0) return candles.slice()
        // Index the previous live history by bucket time so we can
        // O(1) probe whether we already have a developed version of
        // any given bucket the refetch returned.
        const liveByTime = new Map<number, Candle>()
        const liveStart = Math.max(0, prevHistory.length - MERGE_TAIL)
        for (let i = liveStart; i < prevHistory.length; i++) {
          liveByTime.set(prevHistory[i].time, prevHistory[i])
        }
        // The very latest forming tick may live in `latestRef` if a
        // tick arrived between the last `setHistory` and now.
        const liveLatest = latestRef.current
        if (liveLatest) {
          const prior = liveByTime.get(liveLatest.time)
          if (!prior || liveLatest.high - liveLatest.low > prior.high - prior.low) {
            liveByTime.set(liveLatest.time, liveLatest)
          }
        }

        const merged = candles.slice()
        const mergeStart = Math.max(0, merged.length - MERGE_TAIL)
        for (let i = mergeStart; i < merged.length; i++) {
          const incoming = merged[i]
          const live = liveByTime.get(incoming.time)
          if (!live) continue
          if (live.high - live.low > incoming.high - incoming.low) {
            merged[i] = live
          }
        }
        return merged
      })

      setLatest((prev) => {
        const candidate = candles[candles.length - 1]
        if (!prev) return candidate
        // New bucket from the refetch — always adopt it; the live
        // tick stream will continue from here.
        if (candidate.time > prev.time) return candidate
        // Older snapshot than what we already have — ignore.
        if (candidate.time < prev.time) return prev
        // Same bucket: keep whichever forming bar is more developed
        // (see comment above). H - L is monotonically non-decreasing
        // within a bucket, so it's a robust progress signal.
        const candidateRange = candidate.high - candidate.low
        const prevRange = prev.high - prev.low
        return candidateRange > prevRange ? candidate : prev
      })
    },
    [period],
  )

  const handlePhase = useCallback(
    (
      sub: { asset: string; period: number },
      nextPhase: ChartPhase,
      _meta: ChartPhaseMeta,
    ) => {
      if (!assetsMatch(sub.asset, assetRef.current) || sub.period !== period) {
        return
      }
      if (nextPhase === "waiting_running_candle") {
        // No wait overlay: the backend streams every live market 24/7,
        // so the chart renders directly from whatever data arrives.
        setPhase("ready")
        setBucketEndAt(null)
        setSecondsLeft(null)
      } else if (nextPhase === "running_candle_closed") {
        // The freshly fetched 199 ``history`` frame is on its way; the
        // overlay can come down so the card can render the chart as
        // soon as ``handleHistory`` populates it.
        setPhase("ready")
        setBucketEndAt(null)
        setSecondsLeft(null)
      }
    },
    [period],
  )

  const handleCandle = useCallback(
    (sub: { asset: string; period: number }, candle: Candle) => {
      if (!assetsMatch(sub.asset, assetRef.current) || sub.period !== period) {
        return
      }
      // `latest` only drives the chart's cheap per-tick `series.update()`
      // path, which lightweight-charts requires to be non-decreasing in
      // time. When a backend authoritative correction arrives for an
      // already-closed bucket (its time is < the current forming bar),
      // we MUST NOT route it through `latest` — that update() would
      // throw / be ignored and the chart would keep rendering the stale
      // WS-built version. The history-array correction below will flow
      // through the trading-chart's `historyShape`-driven setData path
      // instead, which correctly redraws the corrected closed bar.
      setLatest((prevLatest) => {
        if (!prevLatest) return candle
        return candle.time >= prevLatest.time ? candle : prevLatest
      })
      setHistory((prev) => {
        if (prev.length === 0) return [candle]
        const last = prev[prev.length - 1]
        if (candle.time > last.time) {
          // New bucket — append, cap buffer to MAX_CANDLES (500).
          // Matches the backend's CandleStore window so the chart always
          // shows exactly 200 candles (FIFO sliding — oldest dropped).
          const next = prev.concat(candle)
          return next.length > MAX_CANDLES ? next.slice(next.length - MAX_CANDLES) : next
        }
        if (candle.time === last.time) {
          // Same bucket — update the forming bar in place.
          const next = prev.slice()
          next[next.length - 1] = candle
          return next
        }
        // Out-of-order: this is almost always a broker-authoritative
        // correction for a recently-closed bucket (the backend's
        // refetch-on-close path), or a synthetic gap-fill candle for a
        // bucket that was missing. Walk backwards (capped to the last
        // 64 entries — corrections never arrive further back than the
        // pending-queue cap on the backend) and either patch in place
        // or splice into the right slot. This is the fix for the
        // "previous candles wrong / gap until refresh" bug — without
        // it, every correction was silently dropped and the chart
        // stayed wrong until a fresh history backfill arrived.
        //
        // 1-minute "candle dash hoye jay" fix
        // ------------------------------------
        // ~500 ms after a 1m bucket closes the broker's authoritative
        // refetch + a stream of individual `candle` events arrive for
        // recently-closed buckets. On illiquid OTC pairs the broker's
        // own aggregator hasn't always finished consolidating those
        // ticks yet, so it returns an under-developed snapshot of the
        // bucket — frequently with O == H == L == C (a single-pixel
        // dash). Our live-built version of that same bucket already
        // saw every tick, so it has a real H/L range / body. Without a
        // guard the unconditional overwrite below would replace the
        // developed live candle with the flat broker snapshot and the
        // user sees "recent kichu candle dash hoye jay" within ~1s of
        // the chart rendering correctly. 15s charts hide this because
        // ticks arrive so often the flat window is sub-frame.
        //
        // Rule: H - L is monotonically non-decreasing within a bucket,
        // so it's a safe "progress" proxy. Keep whichever version has
        // the wider range; only adopt the incoming one when it's
        // strictly more developed (or equal — same-OHLC overwrites are
        // harmless).
        const searchStart = Math.max(0, prev.length - 64)
        for (let i = prev.length - 2; i >= searchStart; i--) {
          if (prev[i].time === candle.time) {
            const existing = prev[i]
            const existingRange = existing.high - existing.low
            const incomingRange = candle.high - candle.low
            if (existingRange > incomingRange) {
              // Existing live candle is more developed — keep it.
              return prev
            }
            const next = prev.slice()
            next[i] = candle
            return next
          }
          if (prev[i].time < candle.time) {
            const next = prev.slice()
            next.splice(i + 1, 0, candle)
            return next.length > MAX_CANDLES ? next.slice(next.length - MAX_CANDLES) : next
          }
        }
        return prev
      })
    },
    [period],
  )

  // Cross-tab single-pair lock. Only this user's CURRENT tab is allowed
  // to subscribe to a pair at a time. When another tab in the same
  // browser already owns a pair, ``lock.status`` is ``"blocked"`` and
  // we suppress wsSubscribe; the consumer should render a "take over"
  // overlay using the returned ``lock`` state.
  const lock = useSubscriptionLock({
    token: accessToken,
    desiredPair: asset,
    period,
  })

  // We forward the lock state into `useQuotexWs` as the `enabled` flag.
  // When this tab is "blocked" we keep the socket fully closed —
  // otherwise a passive second tab would still connect with the same
  // ``?token=…`` and trigger the backend's session-eviction, killing
  // the first tab's active stream. Only relevant when we have a token
  // (legacy pages without an access token bypass the lock entirely).
  const wsEnabled = !accessToken || lock.status !== "blocked"

  const ws = useQuotexWs({
    token: accessToken,
    enabled: wsEnabled,
    onHistory: handleHistory,
    onCandle: handleCandle,
    onPhase: handlePhase,
  })

  // Pull stable references out of `ws` so our effects don't re-run on
  // every render. `useQuotexWs` returns a brand-new object literal on
  // each render, but the values inside (state + useCallbacks with empty
  // deps) are individually stable, so depending on them by-name is safe.
  const { assets: wsAssets, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = ws


  // Auto-select rules, in order of priority:
  //   1. Explicit ``preferredAsset`` from the parent (signal pages may
  //      pin a specific market).
  //   2. ``USDBRL_otc`` if the broker lists it as open — the product
  //      default per spec.
  //   3. First open asset that's actually in the curated allow-list
  //      (so we never surface a non-allow-listed pair like the legacy
  //      ``ATOUSD_otc``).
  //   4. As a last resort, first open asset / first asset of any kind
  //      (keeps the chart functional even if the broker drops the
  //      whole allow-list temporarily).
  //
  // DISABLED: Auto-selection is now disabled. Users must manually select
  // a market from the dropdown. The chart shows "Select Market" until
  // the user picks one.
  /*
  useEffect(() => {
    if (asset || wsAssets.length === 0) return
    if (preferredAsset) {
      const match = wsAssets.find((a) => a.symbol === preferredAsset)
      if (match) {
        setAsset(match.symbol)
        return
      }
    }
    const usdbrl = wsAssets.find(
      (a) =>
        a.symbol.toLowerCase() === DEFAULT_ASSET_SYMBOL.toLowerCase() &&
        a.is_open !== false,
    )
    if (usdbrl) {
      setAsset(usdbrl.symbol)
      return
    }
    const firstAllowedOpen = wsAssets.find(
      (a) => a.is_open !== false && matchAllowedMarket(a.symbol, a.name),
    )
    if (firstAllowedOpen) {
      setAsset(firstAllowedOpen.symbol)
      return
    }
    const firstOpen = wsAssets.find((a) => a.is_open !== false) ?? wsAssets[0]
    if (firstOpen) setAsset(firstOpen.symbol)
  }, [wsAssets, asset, preferredAsset])
  */

  // (Re)subscribe whenever the (asset, period) pair changes. We depend
  // on the *stable* `wsSubscribe` callback rather than the whole `ws`
  // object — using `ws` here would re-fire this effect on every render
  // and constantly blank the chart history (and on /chart-to-autosignal
  // it cascaded into a "maximum update depth" loop).
  //
  // IMPORTANT: We only subscribe when asset is explicitly set by user.
  // If asset is null (no selection), we do NOT send any subscribe request
  // to the backend.
  useEffect(() => {
    // Guard: do not subscribe if no asset selected
    if (!asset) {
      return
    }
    // Guard: another tab in this browser already owns a pair for this
    // user. Stay quiet; the consumer renders a "take over" overlay.
    // Also tear down any subscription we may have had a moment ago —
    // when another tab calls `takeOver()` we flip from "owner" to
    // "blocked" mid-stream, and without an explicit unsubscribe the
    // backend would keep pushing candles to this tab.
    if (accessToken && lock.status === "blocked") {
      wsUnsubscribe()
      setHistory([])
      setLatest(null)
      setPhase("idle")
      setBucketEndAt(null)
      setSecondsLeft(null)
      return
    }
    // Every live market is already streaming on the backend, so the
    // chart goes straight to "ready" — no running-candle wait overlay.
    setHistory([])
    setLatest(null)
    setPhase("ready")
    setBucketEndAt(null)
    setSecondsLeft(null)
    wsSubscribe(asset, period)

    // Cleanup: when this hook unmounts (route change / page navigation
    // away from the chart) or the (asset, period) pair changes, tear
    // down the active subscription on the backend AND clear local
    // state. Without this, navigating from /chart -> /autosignal would
    // leave the previous pair streaming on the server (the lock would
    // also stay held, blocking the next page from subscribing). The
    // useWebSocket hook owns its own connection lifecycle, so calling
    // `wsUnsubscribe()` here just sends the unsubscribe frame; the
    // socket itself stays open for the next page if the same provider
    // is still mounted.
    return () => {
      wsUnsubscribe()
    }
  }, [asset, period, wsSubscribe, wsUnsubscribe, accessToken, lock.status])

  // Local 1-second countdown driven off the authoritative
  // ``bucketEndAt`` epoch second from the backend. Recomputing from
  // wall-clock instead of decrementing avoids drift if the tab is
  // throttled or the user's machine sleeps briefly.
  useEffect(() => {
    if (phase !== "waiting" || bucketEndAt == null) return
    const tick = () => {
      const left = Math.max(0, Math.ceil(bucketEndAt - Date.now() / 1000))
      setSecondsLeft(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, bucketEndAt])

  const currentAsset = useMemo(
    () => wsAssets.find((a) => a.symbol === asset) ?? null,
    [wsAssets, asset],
  )

  return {
    status: ws.status,
    assets: ws.assets,
    asset,
    setAsset,
    period,
    currentAsset,
    history,
    latest,
    error: ws.error,
    /**
     * Discriminator on ``error``. ``"replaced"`` means another tab /
     * device opened this account and the backend evicted our socket;
     * the chart card uses this to render a dedicated "Take over here"
     * button that calls ``reclaim()`` instead of the generic warning
     * banner.
     */
    errorKind: ws.errorKind,
    /** Forcefully reconnect after a session_replaced eviction. */
    reclaim: ws.reclaim,
    backendUrl: ws.url,
    setBackendUrl: ws.setUrl,
    refreshAssets: ws.refreshAssets,
    /** "waiting" while the user is held behind the running-candle gate; "ready" once the bucket closes. */
    phase,
    /** Seconds remaining on the running-candle countdown (null when not waiting). */
    secondsLeft,
    /**
     * Cross-tab subscription-lock state. ``status === "blocked"`` means
     * another tab in this browser already owns a pair for this user
     * and the chart card should render the "Active in another tab"
     * overlay. Call ``takeOver()`` to seize the lock for this tab.
     *
     * ``null`` when no ``accessToken`` was supplied (legacy callers).
     */
    lock: accessToken ? lock : null,
  }
}
