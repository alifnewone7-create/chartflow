# ChartFlow Ai — Signal Engine (VPS backend)

The package `signal_engine/` adds three independent signal features on top of the
existing live-candle backend. It starts automatically with `python main.py`.

| Feature | Page | RTDB data (owner-readable only) |
|---|---|---|
| Chart-to-Signal (upgraded) | `/chart-to-signal` | `signals/c2s/{uid}/{entry}_{asset}` |
| Future Signals (paid plans) | `/future-signals` | `signals/future/{uid}/{entry}_{asset}` |
| Automatic Signal (paid plans) | `/automatic-signal` | `auto/settings/{uid}`, `auto/sessions/{uid}/{sid}`, `auto/signals/{uid}/{sid}/{entry}_{asset}`, `auto/reports/{uid}/{sid}` |

Backend-only paths: `eval/pending/*` (shared evaluation queue), `auto/active/*`
(running sessions for restart recovery), `telegram/tokens/*`, `telegram/by_tg/*`,
`telegram/state/offset`. `telegram/links/{uid}` is readable by its owner.
All writes go through the Admin SDK on this server; browsers can only read their
own data (see `../database.rules.json`).

## Modules

* `market_data.py` — Market Data / Active Market / Candle Retrieval + Validation (reads the live `candle_store`, broker fallback only when no collector runs).
* `generation.py` — Shared Signal Generation Engine (existing `strategies.py` votes + trend / momentum / volatility / support-resistance summary, deterministic `{entry}_{asset}` keys = no duplicates).
* `evaluation.py` — Shared Signal Evaluation Engine + background worker (one queue for all features, restart recovery, idempotent final write via RTDB transaction).
* `features.py` — Chart-to-Signal, Future Signals and Automatic Session managers.
* `telegram_bot.py` — one main bot: deep-link connect (single-use, 10-min, SHA-256 hashed tokens), channel permission check, signal/result captions.
* `chart_image.py` — candlestick PNG from real candles (matplotlib).
* `reports.py` — partial report (finalized signals only; PENDING listed separately).
* `api.py` — `/engine/*` routes (Firebase ID token required; paid-plan check on Future/Automatic; per-user rate limits).
* `rtdb.py` — Firebase Admin repository.

## Result rules (identical for all features)

M1 only — entry candle `[entry, entry+60)`. CALL wins on close > open, PUT wins on
close < open. A loss moves to the next consecutive M1 candle (MTG, default 1 step).
Final results: `WIN`, `MTG WIN`, `LOSS`. Anything not yet verified is `PENDING`.
There is no VOID status.

* Missing / delayed / incomplete candle → stays PENDING, retried every 3 s; after 30 min `eval_state=unverifiable` and retried every 2 min.
* Doji (open == close) → stays PENDING (`doji_hold`), re-read every 20 s for 10 min; afterwards it stays PENDING with `review_required=true` (never forced to WIN/LOSS).
* A candle counts as closed only when a later candle exists in the live buffer (or, without the collector, when the broker history returns it after its close).

## Automatic Signal worker

Runs every minute at second 35 for every running session: checks plan, markets
(manual list or payout ≥ minimum), analyses closed candles, signals the best market
whose confidence ≥ minimum for the next minute, renders the chart, sends it to the
chosen Telegram destination(s) and, when the result is verified, edits the original
message caption with the result (falls back to a reply message). Only one open trade
(incl. its MTG step) per session at a time. Closing a session stops new signals;
pending ones keep being evaluated. Sessions, pending evaluations and the Telegram
update offset all live in RTDB, so a restart resumes everything. Telegram sends are
claimed with an RTDB transaction first, so a message is never sent twice.

## Environment (`python_backend/.env`)

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}   # JSON on one line, or a path to the JSON file
TELEGRAM_BOT_TOKEN=123456:ABC...                           # from @BotFather; backend only
# optional
FIREBASE_DATABASE_URL=https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app
```

The website keeps using `NEXT_PUBLIC_QUOTEX_WS` / `NEXT_PUBLIC_WS_SHARED_SECRET`
to find this server; make sure the site's domain is in `ALLOWED_ORIGINS`.

## Deploy

```bash
cd /root/python_backend
source venv/bin/activate
pip install -r requirements.txt          # adds firebase-admin + matplotlib
# add FIREBASE_SERVICE_ACCOUNT + TELEGRAM_BOT_TOKEN to .env
systemctl restart quotex-backend
journalctl -u quotex-backend -f | grep signal-engine
```

Only ONE process may run with a given bot token (Telegram long polling).

## Tests

```bash
python -m pytest tests_signal_engine.py -q
```

Covers CALL/PUT, MTG WIN, final LOSS, no-MTG, doji, missing/delayed candles,
identical results across features, M1 timing, duplicate prevention, restart
recovery, session flow, stats and the partial report.
