"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { matchAllowedMarket } from "@/lib/allowed-markets"

export type Asset = {
  symbol: string
  name: string
  payout: number | null
  is_open: boolean | null
  type: string
  /** Quotex market group: currencies / crypto / commodities / stocks / indices. */
  category?: string
}

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ConnectionStatus = "connecting" | "open" | "closed" | "error"

/**
 * Backend-driven candle phase for one (asset, period) subscription.
 *
 * - ``waiting_running_candle`` — the user just subscribed; the backend
 *   is holding the chart back until the currently in-flight running
 *   candle closes. The frontend renders a "Waiting for closing
 *   running candle…" overlay during this phase. Useful payload:
 *   ``current_bucket_end`` (epoch seconds) and ``seconds_until_close``.
 * - ``running_candle_closed`` — the gate has just opened. A fresh
 *   ``history`` frame follows immediately and live ``candle`` frames
 *   resume.
 */
export type ChartPhase = "waiting_running_candle" | "running_candle_closed"

export type ChartPhaseMeta = {
  current_bucket_end?: number
  seconds_until_close?: number
}

type Subscription = { asset: string; period: number }

type Options = {
  url?: string
  /**
   * Per-user access token. When provided it's attached to the WS URL as
   * a ``?token=`` query string so the Python backend can enforce
   * "one active WebSocket per user" — a second tab opening the same
   * chat session causes the backend to evict the older socket with a
   * ``session_replaced`` close. The frontend single-pair lock already
   * keeps user-visible state consistent in the same browser; this
   * guarantee covers cross-browser / multi-device cases too so
   * ``connected_clients`` never bloats with stale duplicates.
   */
  token?: string | null
  /**
   * When ``false`` the hook stays disconnected — no socket is opened
   * and any open socket is closed without scheduling a reconnect. The
   * single-pair lock uses this on tabs that are currently in
   * ``blocked`` status so a passive second tab in the same browser
   * doesn't trigger a server-side eviction of the active first tab.
   * Defaults to ``true``.
   */
  enabled?: boolean
  onHistory?: (sub: Subscription, candles: Candle[]) => void
  onCandle?: (sub: Subscription, candle: Candle) => void
  onPhase?: (sub: Subscription, phase: ChartPhase, meta: ChartPhaseMeta) => void
}

const STORAGE_KEY = "quotex_ws_url"

/**
 * Resolve the WebSocket URL the frontend should connect to.
 *
 * Priority (production-safe order):
 *
 *   1. ``NEXT_PUBLIC_QUOTEX_WS`` env var — baked at build time. When set
 *      it ALWAYS wins so every visitor uses the configured backend,
 *      regardless of any stale ``localStorage`` value left over from
 *      earlier local-dev testing on this browser.
 *   2. ``localStorage`` (``quotex_ws_url``) — only consulted when the
 *      env var is NOT set. This is the local-dev convenience path: the
 *      ``/livechart`` URL editor saves to localStorage so iterating on a
 *      remote backend during development doesn't require a rebuild.
 *   3. Hard fallback to the public production backend
 *      ``wss://api.chartflow.online/ws`` so deployments without an
 *      explicit env var still hit the real backend instead of a dead
 *      ``ws://localhost:8000/ws``.
 */
const PRODUCTION_WS_URL = "wss://api.chartflow.online/ws"

export function resolveDefaultWsUrl(): string {
  // 1. Build-time env var wins — production deployments always set this.
  const env = process.env.NEXT_PUBLIC_QUOTEX_WS
  if (env) return env

  // 2. localStorage override (dev only, since env-var-less builds are dev).
  //    Defensive: if the saved URL points at localhost but the page itself
  //    is NOT on localhost, ignore it. Otherwise a stale dev value
  //    poisons production visitors and they end up trying to connect to
  //    ``ws://localhost:8000/ws`` from their browser forever.
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const pageHost = window.location.hostname
      const pageIsLocal =
        pageHost === "localhost" ||
        pageHost === "127.0.0.1" ||
        pageHost === "0.0.0.0"
      const savedPointsAtLocalhost = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(saved)
      if (savedPointsAtLocalhost && !pageIsLocal) {
        // Drop the poisonous value so subsequent calls (and the
        // ``/livechart`` URL editor) don't keep showing it.
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
      } else {
        return saved
      }
    }
  }

  // 3. Hard fallback to the public production backend so a fresh
  //    visitor (no env var, no localStorage) connects to the real
  //    server instead of localhost. Local-dev users can still point
  //    at ``ws://localhost:8000/ws`` via the ``/livechart`` URL editor
  //    or the ``NEXT_PUBLIC_QUOTEX_WS`` env var.
  return PRODUCTION_WS_URL
}

/**
 * Per-tab monotonic counter used to detect in-tab navigation between
 * signal pages. Each ``useQuotexWs`` mount increments
 * ``sessionStorage["qxl:ws-mount-id"]`` and remembers the value it saw.
 * When a ``session_replaced`` frame arrives, the hook compares its own
 * mount id with the current counter — if the counter has moved on, a
 * newer hook in the **same tab** (i.e. a route change) caused the
 * eviction, and the error should be suppressed.
 *
 * sessionStorage is scoped per browser tab, so a genuine second-tab /
 * second-device takeover starts at counter 0 and never matches this
 * tab's mount id — the error UI works as before for that case.
 */
const MOUNT_ID_KEY = "qxl:ws-mount-id"
function nextMountId(): number {
  if (typeof window === "undefined") return 0
  try {
    const cur = Number(window.sessionStorage.getItem(MOUNT_ID_KEY) || "0")
    const next = (Number.isFinite(cur) ? cur : 0) + 1
    window.sessionStorage.setItem(MOUNT_ID_KEY, String(next))
    return next
  } catch {
    return 0
  }
}
function readMountId(): number {
  if (typeof window === "undefined") return 0
  try {
    return Number(window.sessionStorage.getItem(MOUNT_ID_KEY) || "0")
  } catch {
    return 0
  }
}

export function useQuotexWs(opts: Options = {}) {
  // Bump the per-tab counter on every mount and remember our slot. If a
  // later mount in the same tab bumps it again, we'll detect that when
  // the backend evicts our socket and silently swallow the error.
  const myMountIdRef = useRef<number>(0)
  if (myMountIdRef.current === 0) {
    myMountIdRef.current = nextMountId()
  }
  const [url, setUrlState] = useState<string>(() => opts.url ?? resolveDefaultWsUrl())

  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [assets, setAssets] = useState<Asset[]>([])
  const [account, setAccount] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  /**
   * When the backend evicts our socket with a ``session_replaced``
   * frame, we surface a string in ``error`` *and* flip this kind to
   * ``"replaced"`` so the consumer can render a dedicated
   * "Take over here" affordance instead of a generic warning. Cleared
   * back to ``null`` whenever ``error`` is cleared.
   */
  const [errorKind, setErrorKind] = useState<null | "replaced">(null)

  const wsRef = useRef<WebSocket | null>(null)
  const onHistoryRef = useRef(opts.onHistory)
  const onCandleRef = useRef(opts.onCandle)
  const onPhaseRef = useRef(opts.onPhase)
  const tokenRef = useRef<string | null>(opts.token ?? null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const subscriptionRef = useRef<Subscription | null>(null)
  // Set to true when the server tells us another tab/device took over
  // this user's session. We use this to skip the auto-reconnect that
  // ``onclose`` would otherwise schedule — re-dialing here would race
  // the new session and trigger another eviction round-trip.
  const replacedRef = useRef(false)
  /**
   * Latched ``true`` by the effect's cleanup function when the hook
   * unmounts (route change away from a chart page) OR the ``enabled``
   * flag flips off. ``onclose`` checks this before scheduling its
   * 2s auto-reconnect — without the guard, the close handler of a
   * socket that we just torn down in cleanup would happily schedule a
   * **new** WebSocket on the dead hook instance, which would in turn
   * also schedule its own reconnect when evicted, etc. The end result
   * was an ever-growing pile of zombie sockets all carrying the same
   * ``?token=`` query string (exactly what the dev-tools screenshot
   * shows) plus a permanent "Connecting…" glitch on the new page
   * because the backend kept evicting the zombies' replacements via
   * ``session_replaced``.
   *
   * Reset to ``false`` on every successful ``connect()`` so the same
   * hook instance can be re-enabled (e.g. lock flips from blocked back
   * to owner) without losing auto-reconnect.
   */
  const unmountedRef = useRef(false)

  useEffect(() => {
    onHistoryRef.current = opts.onHistory
    onCandleRef.current = opts.onCandle
    onPhaseRef.current = opts.onPhase
  }, [opts.onHistory, opts.onCandle, opts.onPhase])

  // Reconnect when the user's token changes (e.g. profile switch on the
  // same browser): we want the new token tied to a fresh backend WS so
  // the per-user "one active socket" rule is enforced cleanly.
  useEffect(() => {
    const next = opts.token ?? null
    if (tokenRef.current === next) return
    tokenRef.current = next
    // Token actually changed (e.g. profile switch on the same browser
    // tab). Clear the "replaced" latch and force a fresh reconnect with
    // the new token.
    replacedRef.current = false
    const current = wsRef.current
    if (current) {
      // Closing triggers the existing onclose -> reconnect timer, which
      // will dial again with the new token from `tokenRef`.
      try {
        current.close()
      } catch {
        /* ignore */
      }
    }
  }, [opts.token])

  const setUrl = useCallback((next: string) => {
    const cleaned = next.trim()
    if (!cleaned) return
    // In production the URL editor UI is hidden (see ``ALLOW_URL_EDIT``
    // in ``app/livechart/page.tsx``), but we still defensively refuse
    // to write to ``localStorage`` whenever a build-time env var is in
    // play. This means even if some future code path calls ``setUrl``,
    // we won't poison the cache and cause production users to start
    // hitting a non-production backend on their next visit.
    if (!process.env.NEXT_PUBLIC_QUOTEX_WS && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, cleaned)
    }
    setUrlState(cleaned)
  }, [])

  const connect = useCallback(() => {
    if (!url) return
    // Refuse to dial if the hook was already torn down. This can happen
    // when ``onclose`` of a socket we just cleaned up fires its 2-second
    // reconnect timer — by then the cleanup already nulled wsRef but the
    // timer was queued. Without this guard each unmount leaks a fresh
    // WebSocket that itself reconnects forever.
    if (unmountedRef.current) return
    setStatus("connecting")
    setError(null)
    setErrorKind(null)
    // Append the per-user token as a query param so the backend can
    // tie this socket to a session and evict any stale duplicate. We
    // do this every connect (rather than baking the token into the
    // stored URL) so a token change picks up cleanly on the next
    // reconnect, and the localStorage URL stays sharable across users.
    let connectUrl = url
    const token = tokenRef.current
    // Optional shared secret enforced by the backend when
    // ``WS_SHARED_SECRET`` is configured. Exposed to the browser via
    // ``NEXT_PUBLIC_WS_SHARED_SECRET`` so it gets baked into the
    // bundle at build time. This is the second layer of defense on
    // top of the Origin allow-list — Origin blocks browsers on
    // foreign sites, this blocks non-browser clients (curl, scripts).
    const sharedSecret = process.env.NEXT_PUBLIC_WS_SHARED_SECRET
    // Per-browser-tab id (same one ``useSubscriptionLock`` persists in
    // sessionStorage). Sending it lets the backend distinguish "same
    // tab navigated to a different signal page" — which should *not*
    // surface a session_replaced error — from a real second-tab /
    // second-device takeover.
    let tabId: string | null = null
    if (typeof window !== "undefined") {
      try {
        tabId = window.sessionStorage.getItem("qxl:tab-id")
        if (!tabId) {
          tabId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `tab_${Math.random().toString(36).slice(2)}_${Date.now()}`
          window.sessionStorage.setItem("qxl:tab-id", tabId)
        }
      } catch {
        tabId = null
      }
    }
    if (token || sharedSecret || tabId) {
      try {
        const u = new URL(url)
        if (token) u.searchParams.set("token", token)
        if (sharedSecret) u.searchParams.set("key", sharedSecret)
        if (tabId) u.searchParams.set("tab", tabId)
        connectUrl = u.toString()
      } catch {
        // URL constructor doesn't accept relative WS URLs; fall back
        // to a manual query-string append so we still send the token.
        const params: string[] = []
        if (token) params.push("token=" + encodeURIComponent(token))
        if (sharedSecret) params.push("key=" + encodeURIComponent(sharedSecret))
        if (tabId) params.push("tab=" + encodeURIComponent(tabId))
        connectUrl = url + (url.includes("?") ? "&" : "?") + params.join("&")
      }
    }
    console.log("connecting to", connectUrl)

    let ws: WebSocket
    try {
      ws = new WebSocket(connectUrl)
    } catch (e) {
      console.log("ws constructor failed", e)
      setStatus("error")
      setError(`Could not open WebSocket to ${url}: ${String(e)}`)
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      console.log("ws open")
      setStatus("open")
      setError(null)
      const sub = subscriptionRef.current
      if (sub) {
        ws.send(JSON.stringify({ action: "subscribe", asset: sub.asset, period: sub.period }))
      }
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: "ping" }))
        }
      }, 20000)
    }

    ws.onmessage = (evt) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(evt.data)
      } catch {
        return
      }
      switch (msg.type) {
        case "assets":
          console.log("assets received:", (msg.assets as unknown[] | undefined)?.length ?? 0)
          setAssets((msg.assets as Asset[]) ?? [])
          break
        case "ready":
          console.log("ready", msg.account)
          setAccount((msg.account as Record<string, unknown>) ?? {})
          break
        case "history": {
          const candles = (msg.candles as Candle[]) ?? []
          console.log(
            "ws history:",
            msg.asset,
            msg.period,
            "candles=",
            candles.length,
            "sample=",
            candles[0],
          )
          onHistoryRef.current?.(
            { asset: msg.asset as string, period: msg.period as number },
            candles,
          )
          break
        }
        case "candle": {
          const c = msg.candle as Candle | undefined
          if (c) {
            onCandleRef.current?.(
              { asset: msg.asset as string, period: msg.period as number },
              c,
            )
          }
          break
        }
        case "phase": {
          // Backend-driven gate: "waiting_running_candle" until the
          // current bucket closes, then "running_candle_closed" right
          // before a fresh `history` frame is pushed.
          const phase = msg.phase as ChartPhase | undefined
          if (
            phase === "waiting_running_candle" ||
            phase === "running_candle_closed"
          ) {
            console.log(
              "ws phase:",
              msg.asset,
              msg.period,
              phase,
              "bucket_end=",
              msg.current_bucket_end,
              "secs_left=",
              msg.seconds_until_close,
            )
            onPhaseRef.current?.(
              { asset: msg.asset as string, period: msg.period as number },
              phase,
              {
                current_bucket_end:
                  typeof msg.current_bucket_end === "number"
                    ? msg.current_bucket_end
                    : undefined,
                seconds_until_close:
                  typeof msg.seconds_until_close === "number"
                    ? msg.seconds_until_close
                    : undefined,
              },
            )
          }
          break
        }
        case "error": {
          // Backend sends raw broker symbols (e.g. ``EURUSD_otc``) inside
          // ``message`` for asset-level errors. Users expect the curated
          // display label (``EUR/USD (OTC)``) instead — same string the
          // dropdown shows. Resolve via the allow-list and substitute.
          const rawMsg = String(msg.message ?? "unknown error")
          const errAsset =
            typeof msg.asset === "string" ? (msg.asset as string) : null
          let prettyMsg = rawMsg
          if (errAsset) {
            const entry = matchAllowedMarket(errAsset)
            if (entry && rawMsg.includes(errAsset)) {
              prettyMsg = rawMsg.split(errAsset).join(entry.label)
            }
          }
          console.log("ws server error", prettyMsg)
          setError(prettyMsg)
          break
        }
        case "session_replaced": {
          // The backend evicted this socket because another connection
          // for the same token came online. In practice this almost
          // always means the user just navigated to another signal
          // page within the same tab — the previous page's hook is
          // unmounting while the new page's hook is already mounting.
          //
          // We deliberately do NOT surface an error UI here anymore.
          // Cross-tab single-pair enforcement is handled separately by
          // ``useSubscriptionLock`` (which uses localStorage and shows
          // its own "Take over here" overlay), so by the time we get
          // here we can safely treat eviction as a benign handoff:
          // stay silent and let ``onclose`` run the standard reconnect
          // path. The new page just keeps working.
          console.log("ws session_replaced — silent reconnect")
          break
        }
      }
    }

    ws.onerror = (e) => {
      console.log("ws error", e)
      // Treat transport errors as a transient "connecting" state instead
      // of a hard error/offline. The auto-reconnect loop in `onclose`
      // will keep retrying, so from the user's perspective we are simply
      // still trying to connect — never "Offline" and never showing the
      // raw "WebSocket error while connecting to ws://localhost:8000/ws"
      // message that leaks the backend URL into the UI.
      setStatus("connecting")
      setError(null)
    }

    ws.onclose = () => {
      console.log("ws closed")
      if (pingTimer.current) clearInterval(pingTimer.current)
      pingTimer.current = null
      wsRef.current = null
      if (unmountedRef.current) {
        // Hook is gone (route change / disabled). Do NOT schedule a
        // reconnect — that's how we used to leak zombie sockets that
        // each kept reconnecting forever.
        return
      }
      if (replacedRef.current) {
        // Session was taken over by another tab/device. Stay closed and
        // surface the error — no reconnect, otherwise we'd ping-pong
        // with the new session forever.
        setStatus("error")
        return
      }
      // Keep the UI in a "Connecting" state during reconnect attempts
      // rather than flashing "Offline". The reconnect timer below will
      // re-open the socket within 2s.
      setStatus("connecting")
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null
        if (unmountedRef.current) return
        connect()
      }, 2000)
    }
  }, [url])

  const enabled = opts.enabled !== false

  useEffect(() => {
    // Re-arm: this effect just (re)mounted, so allow ``connect()`` to
    // dial again. Cleanup below latches it back to ``true``.
    unmountedRef.current = false
    if (!enabled) {
      // Disabled (e.g. another tab in this browser owns the per-user
      // lock). Tear down any existing socket and stay disconnected so
      // the backend's single-socket-per-user enforcement doesn't evict
      // the active tab on every passive second tab that happens to
      // load the page.
      //
      // CRITICAL: latch ``unmountedRef`` BEFORE closing the socket and
      // detach all of its handlers. Otherwise ``onclose`` would still
      // run and schedule a 2s reconnect which would re-open the socket
      // even though we wanted to stay closed.
      unmountedRef.current = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (pingTimer.current) {
        clearInterval(pingTimer.current)
        pingTimer.current = null
      }
      const current = wsRef.current
      if (current) {
        try {
          current.onopen = null
          current.onmessage = null
          current.onerror = null
          current.onclose = null
        } catch {
          /* ignore */
        }
        try {
          current.close()
        } catch {
          /* ignore */
        }
      }
      wsRef.current = null
      setStatus("closed")
      return
    }
    connect()
    return () => {
      // Hook is unmounting (route change away from a chart page) OR
      // ``connect``/``enabled`` changed. Latch the unmount flag FIRST
      // so any in-flight ``onclose`` handler skips the reconnect timer.
      unmountedRef.current = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (pingTimer.current) {
        clearInterval(pingTimer.current)
        pingTimer.current = null
      }
      const current = wsRef.current
      wsRef.current = null
      if (current) {
        // Strip handlers BEFORE closing so a late ``onclose`` from the
        // browser's WS state machine cannot resurrect this hook with
        // a fresh zombie WebSocket.
        try {
          current.onopen = null
          current.onmessage = null
          current.onerror = null
          current.onclose = null
        } catch {
          /* ignore */
        }
        try {
          current.close()
        } catch {
          /* ignore */
        }
      }
    }
  }, [connect, enabled])

  const subscribe = useCallback((asset: string, period: number) => {
    // Guard: do not subscribe if asset is empty/null
    if (!asset) {
      return
    }
    const previous = subscriptionRef.current
    subscriptionRef.current = { asset, period }
    // Clear any previous asset-level error (e.g. "X is currently closed
    // by the broker"). When the user switches to a different pair we
    // either land on an open one (no error needed) or the backend will
    // send a fresh error frame for the new pair — either way the stale
    // message must not linger under the chart.
    setError(null)
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (previous) {
      ws.send(
        JSON.stringify({ action: "unsubscribe", asset: previous.asset, period: previous.period }),
      )
    }
    ws.send(JSON.stringify({ action: "subscribe", asset, period }))
  }, [])

  const refreshAssets = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "refresh_assets" }))
    }
  }, [])

  /**
   * Drop the current backend subscription without replacing it.
   *
   * Used by `useMarketChart` when the per-user single-pair lock flips
   * this tab to "blocked" (another tab in this browser took over). We
   * cannot just stop reading candle frames — without an explicit
   * `unsubscribe`, the Python backend keeps streaming candles to this
   * tab, which both wastes bandwidth and leaves stale state in the
   * chart hook. Clearing `subscriptionRef` here also stops the
   * reconnect handler from auto-resubscribing if the WS bounces while
   * we're blocked.
   */
  const unsubscribe = useCallback(() => {
    const previous = subscriptionRef.current
    if (!previous) return
    subscriptionRef.current = null
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({
        action: "unsubscribe",
        asset: previous.asset,
        period: previous.period,
      }),
    )
  }, [])

  /**
   * Manually reconnect after a ``session_replaced`` eviction. Used by
   * the chart card's "Take over here" button when the user explicitly
   * wants to seize the account back from whatever other tab / device
   * opened it. We bump our per-tab mount id so the *other* connection
   * sees the eviction it triggers as a real takeover (not in-tab
   * navigation), clear the replaced flag, and force a fresh connect.
   */
  const reclaim = useCallback(() => {
    replacedRef.current = false
    setError(null)
    setErrorKind(null)
    // Bump the per-tab mount counter so we present as a "newer" mount
    // than whatever other session is currently registered server-side.
    myMountIdRef.current = nextMountId()
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    // Tear down any lingering socket before redialing so onclose runs
    // its bookkeeping cleanly and we don't end up with two sockets.
    //
    // CRITICAL: detach all handlers on the old socket *before* closing
    // it. Otherwise this sequence happens and the modal flashes back:
    //   1. We close the old ws locally; the close is in-flight.
    //   2. ``connect()`` opens a new ws to the backend with the same
    //      token.
    //   3. The backend sees an existing socket for that token (the one
    //      we just closed but whose close hasn't propagated yet),
    //      evicts it, and pushes ``session_replaced`` to it.
    //   4. The old socket's onmessage — still attached via closure —
    //      fires and sets errorKind="replaced" again, re-rendering the
    //      "Take over here" overlay we were trying to dismiss.
    // Stripping the handlers makes step 4 a no-op.
    const old = wsRef.current
    if (old) {
      try {
        old.onopen = null
        old.onmessage = null
        old.onerror = null
        old.onclose = null
      } catch {
        /* ignore */
      }
      try {
        old.close()
      } catch {
        /* ignore */
      }
    }
    wsRef.current = null
    connect()
  }, [connect])

  return {
    status,
    assets,
    account,
    error,
    errorKind,
    reclaim,
    subscribe,
    unsubscribe,
    refreshAssets,
    url,
    setUrl,
  }
}
