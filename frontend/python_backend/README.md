# Quotex Live Chart Backend

A FastAPI + pyquotex backend that:

1. Prompts you for your Quotex email / password in the **terminal**.
2. Lets pyquotex prompt you for the email 2FA code in that same terminal.
3. Once logged in, opens a WebSocket + HTTP server on port `8000`.
4. The Next.js site connects to `ws://<host>:8000/ws` and receives
   the full asset list + live candles for whichever market you pick.

## Requirements

- **Python 3.12 ONLY.**
  - 3.11 fails: `Package 'pyquotex' requires a different Python: 3.11.x not in '<4.0,>=3.12'`
    (pyquotex on PyPI pins `>=3.12,<4.0`).
  - 3.13 / 3.14 fail because pydantic-core has no prebuilt wheels for them yet,
    so pip tries to build Rust from source and on Windows you get:

    ```
    error: linker `link.exe` not found
    note: the msvc targets depend on the msvc linker
    ERROR: Failed building wheel for pydantic-core
    ```

  Install Python 3.12 from https://www.python.org/downloads/release/python-3128/
  (tick "Add python.exe to PATH"), then recreate the venv.

- **VPN must be active** before running (Quotex blocks datacenter / flagged IPs).

## Install (Windows)

```powershell
cd python_backend
py -3.12 -m venv venv
venv\Scripts\activate
python --version                 # should print Python 3.12.x
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Install (macOS / Linux)

```bash
cd python_backend
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If pyquotex fails to install from PyPI, use the GitHub fork:

```bash
pip install git+https://github.com/cleitonleonel/pyquotex.git
```

## Run

```bash
python main.py
```

You will see:

```
============================================================
  Quotex Live Chart Backend
  Make sure your VPN is ACTIVE before logging in.
============================================================
Quotex email: you@example.com
Quotex password: ********

[*] Connecting to Quotex ...
(If 2FA is required, pyquotex will ask for the code here)
[+] Logged in. Account: {...}

[+] Server live: http://0.0.0.0:8000
    Browser WebSocket: ws://0.0.0.0:8000/ws
    Open your Next.js site now.
```

Now start the Next.js site (`pnpm dev` in the project root) and the chart
page will auto-connect via WebSocket.

## Environment variables (optional)

| Variable          | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `QUOTEX_EMAIL`    | Skip the email prompt                                |
| `QUOTEX_PASSWORD` | Skip the password prompt                             |
| `QUOTEX_HOST`     | Defaults to `market-qx.pro`                           |
| `HOST`            | Bind address for the HTTP server (default `0.0.0.0`) |
| `PORT`            | Port for the HTTP server (default `8000`)            |

On the Next.js side set `NEXT_PUBLIC_QUOTEX_WS` if the backend is not on the
same host, e.g. `NEXT_PUBLIC_QUOTEX_WS=ws://192.168.1.10:8000/ws`.

## WebSocket protocol

Client → server:

```json
{ "action": "subscribe",   "asset": "EURUSD_otc", "period": 60 }
{ "action": "unsubscribe", "asset": "EURUSD_otc", "period": 60 }
{ "action": "refresh_assets" }
{ "action": "ping" }
```

Server → client:

```json
{ "type": "ready",   "account": { "email": "...", "balance": 10000 } }
{ "type": "assets",  "assets": [ { "symbol": "EURUSD_otc", "name": "EUR/USD OTC", "payout": 85, "is_open": true, "type": "otc" } ] }
{ "type": "history", "asset": "...", "period": 60, "candles": [ ... ] }
{ "type": "candle",  "asset": "...", "period": 60, "candle": { "time": 1700000000, "open": 1.09, "high": 1.091, "low": 1.089, "close": 1.0905 } }
{ "type": "error",   "message": "..." }
{ "type": "pong" }
```

## Troubleshooting

| Symptom                                            | Fix                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `cloudflare` / `recaptcha` errors on login         | Enable / change VPN region.                                                                     |
| 2FA prompt never appears                           | Some pyquotex forks don't ask — try logging into the web Quotex once first to trust the IP.     |
| Assets list is empty                               | pyquotex may not have finished its first WS handshake; click "Refresh markets" after a couple s.|
| `pyquotex` import error                            | `pip install git+https://github.com/cleitonleonel/pyquotex.git`                                 |
