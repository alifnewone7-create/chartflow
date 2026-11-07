# VPS এ Backend Setup Guide (api.chartflow.online)

এই backend login এর পর **সব market একসাথে 24/7 subscribe করে রাখে** এবং
tick-by-tick data সবসময় collect করতে থাকে। ফলে user যেকোনো chart খুললে
সাথে সাথে পুরো 200টা candle + live tick দেখতে পায় — কোনো waiting নেই।

```
Browser (chartflow.online)  ──wss──>  api.chartflow.online (nginx + SSL)
                                        │
                                        └──> 127.0.0.1:8000  python main.py
                                                 │
                                                 └──> Quotex (pyquotex)
```

---

## ১. VPS কেমন লাগবে

| জিনিস | Recommended |
|---|---|
| OS | **Ubuntu 24.04 LTS** (এতে Python 3.12 আগে থেকেই থাকে) |
| CPU / RAM | কমপক্ষে **2 vCPU / 2 GB RAM** (43 market × 2 timeframe = ~86 stream) |
| Disk | 20 GB |
| Port | 22 (SSH), 80, 443 খোলা রাখুন |

> Quotex কিছু datacenter IP block করে। login এ `cloudflare` / `recaptcha`
> error এলে VPS এর region বা provider বদলান।

---

## ২. DNS সেট করুন (Cloudflare বা আপনার domain panel)

| Type | Name | Value |
|---|---|---|
| A | `privateapi` | আপনার VPS এর IP |

Cloudflare ব্যবহার করলে প্রথমে **DNS only (grey cloud)** রাখুন। SSL লাগানো
হয়ে গেলে চাইলে Proxy (orange cloud) চালু করতে পারেন — তখন Cloudflare
এর **SSL/TLS → Full (strict)** এবং **Network → WebSockets = ON** রাখবেন।

---

## ৩. Server এ দরকারি package install

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
apt install -y python3.12 python3.12-venv python3-pip git nginx certbot python3-certbot-nginx ufw

# firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## ৪. Code আনুন এবং Python environment তৈরি করুন

```bash
# শুধু frontend/python_backend folder টা VPS এর /root/python_backend এ যাবে
cd /root
git clone https://github.com/alifnewone7-create/q-live-run.git
cp -r /root/q-live-run/frontend/python_backend /root/python_backend

cd /root/python_backend
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**পরে code update করতে** (`.env` আর `venv` যেমন আছে তেমনই থাকবে, শুধু code বদলাবে):

```bash
cd /root/q-live-run && git pull
cp -r /root/q-live-run/frontend/python_backend/. /root/python_backend/
systemctl restart quotex-backend
```

> `/root/python_backend` আগে থেকে থাকলে সবসময় উপরের `/.` যুক্ত কমান্ড
> ব্যবহার করবেন — না হলে ভেতরে আরেকটা `python_backend/python_backend`
> folder তৈরি হয়ে যাবে।

> আমাদের VPS এ backend এর folder সবসময় **`/root/python_backend`** —
> service file, nginx, সব কমান্ড এই path ধরেই লেখা।

---

## ৫. `.env` file তৈরি করুন

```bash
cd /root/python_backend
cp .env.example .env
nano .env
```

অবশ্যই এগুলো ঠিক করবেন:

```ini
# সর্বোচ্চ 10 টা Quotex account (_1 থেকে _10)
QUOTEX_EMAIL_1=প্রথম_account_email
QUOTEX_PASSWORD_1=প্রথম_account_password
QUOTEX_EMAIL_2=দ্বিতীয়_account_email
QUOTEX_PASSWORD_2=দ্বিতীয়_account_password
# ... QUOTEX_EMAIL_10 / QUOTEX_PASSWORD_10 পর্যন্ত
QUOTEX_HOST=market-qx.pro

# প্রতি 3 ঘণ্টায় (10800s) নতুন account এ নতুন session, login এর 2 মিনিট পর switch
ACCOUNT_ROTATE_S=10800
ACCOUNT_SWITCH_DELAY_S=120
QUOTEX_ACCOUNT=PRACTICE

# nginx এর পেছনে থাকবে, তাই শুধু localhost
HOST=127.0.0.1
PORT=8000

# শুধু নিজের domain থেকে connect করা যাবে
ALLOWED_ORIGINS=https://chartflow.online,https://www.chartflow.online
ALLOW_ANY_ORIGIN=0
# সব website খুলে দিতে চাইলে:
# ALLOWED_ORIGINS=*
# ALLOW_ANY_ORIGIN=1

# সব market 24/7  (allowed = website এর 43টা market, periods = 1 মিনিট + 15 সেকেন্ড)
ALWAYS_ON_ENABLED=1
ALWAYS_ON_MARKETS=allowed
ALWAYS_ON_PERIODS=60,15

# ---- Signal engine (Firebase RTDB + Telegram) ----
# Firebase service account: পুরো JSON টা এক লাইনে (নিচের নিয়ম দেখুন)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"chartflow-ai-476d2","private_key_id":"আপনার_private_key_id","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...আপনার_key...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@chartflow-ai-476d2.iam.gserviceaccount.com","client_id":"আপনার_client_id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40chartflow-ai-476d2.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
# @BotFather থেকে পাওয়া bot token (শুধু backend এ থাকবে)
TELEGRAM_BOT_TOKEN=123456:ABC...
FIREBASE_DATABASE_URL=https://chartflow-ai-476d2-default-rtdb.asia-southeast1.firebasedatabase.app
```

**`FIREBASE_SERVICE_ACCOUNT` কীভাবে দেবেন (২টা উপায়, যেকোনো একটা):**

**উপায় ১ — এক লাইনে JSON (উপরের মতো):**
- Firebase থেকে download করা `.json` ফাইলের পুরো লেখা **একটা লাইনে** দিন — মাঝে কোনো Enter থাকবে না।
- `=` এর পরে সরাসরি `{` শুরু হবে, আগে-পরে কোনো `'` বা `"` quote দেবেন না।
- `private_key` এর ভেতরের `\n` গুলো যেমন আছে **তেমনই** রাখবেন (এগুলো আসল লাইন-ব্রেক না, `\` আর `n` দুইটা অক্ষর)।
- নিজে হাতে এক লাইন না বানিয়ে VPS এ এই কমান্ড দিয়ে বানাতে পারেন:
  ```bash
  printf 'FIREBASE_SERVICE_ACCOUNT=%s\n' "$(python3 -c 'import json;print(json.dumps(json.load(open("service-account.json")),separators=(",",":")))')" >> .env
  ```

**উপায় ২ — ফাইলের path (সবচেয়ে সহজ ও নিরাপদ):**
```bash
# json ফাইলটা VPS এ রাখুন, যেমন /root/python_backend/service-account.json
chmod 600 /root/python_backend/service-account.json
```
```ini
FIREBASE_SERVICE_ACCOUNT=/root/python_backend/service-account.json
```

> service account / private key কখনো GitHub এ push করবেন না বা কাউকে পাঠাবেন না।

> value এর একই লাইনে `#` comment লিখবেন না — comment সবসময় আলাদা লাইনে।

**Optional (extra security):** `WS_SHARED_SECRET` এ একটা লম্বা random
value দিন (`openssl rand -hex 32`) এবং একই value frontend এ (Vercel →
Settings → Environment Variables) `NEXT_PUBLIC_WS_SHARED_SECRET` নামে দিন,
তারপর frontend redeploy করুন। দুই জায়গায় একই না হলে connection reject হবে।

---

### Account rotation কিভাবে কাজ করে

- Server চালু হলে `.env` এর প্রথম যে account login হয় সেটা দিয়ে data আসে।
- প্রতি 3 ঘণ্টা পর পরের account (1 → 2 → … → 10 → আবার 1) **নতুন session** এ login করে,
  পুরনো session তখনও চলতে থাকে।
- নতুন session সব market subscribe করে, 2 মিনিট অপেক্ষা করে, তারপর **একদম মিনিটের শুরুতে**
  (যেমন 09:46:00) switch হয়। 09:46:00 এর আগের tick পুরনো session থেকে, পরের tick নতুন session
  থেকে — একই candle এর সাথেই data চলতে থাকে, chart reset হয় না।
- প্রতি market এ সর্বোচ্চ 500 candle রাখা হয়; নতুন candle এলে সবচেয়ে পুরনোটা বাদ যায়।
- এই candle গুলো VPS এর disk এ save হয়: `/root/python_backend/data/candles/<market>_<period>.json`
  (যেমন `EURUSD_otc_60.json`)। প্রতি 10 সেকেন্ডে (`CANDLE_SAVE_INTERVAL_S`) নতুন close হওয়া candle
  save হয়, service বন্ধ হওয়ার সময় সব save হয়। Restart এর পর এই file থেকেই candle load হয়।
  অন্য folder চাইলে `.env` এ `CANDLE_DATA_DIR=/path` দিন।
- কোনো account login না হলে (ভুল password / PIN চাইলে) পরের account চেষ্টা করে।
- অবস্থা দেখতে: `curl http://127.0.0.1:8000/health` → `accounts` অংশ।

**সব account এর PIN একবারে দিয়ে রাখুন** (service চলার সময় PIN দেওয়া যায় না):

```bash
cd /root/python_backend && source venv/bin/activate
python main.py --login-all
```

প্রতিটা account এর PIN চাইলে লিখে দিন — token `session.json` এ save থাকবে।

---

## ৬. প্রথমবার হাতে চালিয়ে login + 2FA করুন (একবারই)

Quotex নতুন IP থেকে login এ email এ 6-digit code পাঠায়। তাই প্রথমবার
terminal এ চালান:

```bash
cd /root/python_backend
source venv/bin/activate
python main.py
```

- 2FA চাইলে email এর code টা লিখে Enter দিন।
- `[+] Logged in` দেখার পর দেখবেন
  `[*] Market data collection starts at 06:46:00 (in 40.0s, aligned to 60s)` —
  অর্থাৎ server যখনই চালু হোক (যেমন 06:45:20), data collect শুরু হবে
  **পরের মিনিটের একদম শুরুতে** (06:46:00), যাতে প্রথম candle টাও সম্পূর্ণ হয়।
  (`.env` এ `COLLECTION_ALIGN_S=0` দিলে সাথে সাথে শুরু হবে।)
- এরপর `always-on: 43 markets x [60, 15] = 86 streams` দেখলে সব ঠিক আছে।
- Session token `~/.pyquotex/` এ save হয়ে যায়, পরে আর code লাগবে না।
- এখন `Ctrl + C` দিয়ে বন্ধ করুন।

---

## ৭. systemd service — 24/7 চালু রাখুন (crash / reboot হলেও auto start)

```bash
cp /root/python_backend/deploy/quotex-backend.service /etc/systemd/system/
cp /root/python_backend/deploy/quotex-backend-health.service /etc/systemd/system/
cp /root/python_backend/deploy/quotex-backend-health.timer /etc/systemd/system/
chmod +x /root/python_backend/deploy/healthcheck.sh
systemctl daemon-reload
systemctl enable --now quotex-backend
# প্রতি মিনিটে /health চেক — backend আটকে গেলে (৩ বার সাড়া না দিলে) auto restart
systemctl enable --now quotex-backend-health.timer

# status + live log
systemctl status quotex-backend
journalctl -u quotex-backend -f
journalctl -u quotex-backend-health -n 50 --no-pager
```

এই কমান্ডগুলো কাজে লাগবে:

```bash
systemctl restart quotex-backend   # .env বদলানোর পর
systemctl stop quotex-backend
journalctl -u quotex-backend -n 200 --no-pager
```

---

## ৮. Nginx + SSL (api.chartflow.online)

```bash
cp /root/python_backend/deploy/nginx-privateapi.conf /etc/nginx/sites-available/api.chartflow.online
ln -s /etc/nginx/sites-available/api.chartflow.online /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ফ্রি SSL (Let's Encrypt) — auto renew হয়
certbot --nginx -d api.chartflow.online --redirect -m you@example.com --agree-tos -n
```

---

## ৯. সব ঠিক আছে কিনা চেক করুন

```bash
curl https://api.chartflow.online/health
```

Response এ দেখবেন:

```json
"logged_in": true,
"collection": { "align_s": 60, "start_at": 1790209980, "started": true },
"always_on": { "markets": 43, "streams": 86, "warm_streams": 86, ... }
```

- প্রথম boot এ সব stream warm হতে **কয়েক মিনিট** লাগে (প্রতিটা market এর
  199 candle history একটা একটা করে আনা হয় যাতে data ভুল না হয়)। এরপর থেকে
  সবসময় instant।
- প্রতি market এর বিস্তারিত (কত candle, শেষ tick কত সেকেন্ড আগে, কতজন দেখছে):

```bash
curl -H "Origin: https://chartflow.online" https://api.chartflow.online/markets/status
```

---

## ১০. Frontend

Frontend এর code এ আগে থেকেই default backend
`wss://api.chartflow.online/ws` দেওয়া আছে — তাই কিছু বদলাতে হবে না।
অন্য domain ব্যবহার করলে frontend env এ দিন:

```
NEXT_PUBLIC_QUOTEX_WS=wss://your-api-domain/ws
```

---

## Troubleshooting

| সমস্যা | সমাধান |
|---|---|
| `logged_in: false` / login fail | `.env` এর email/password চেক করুন, `journalctl -u quotex-backend -n 100` দেখুন |
| 2FA চাইছে কিন্তু service এ input দেওয়া যায় না | service বন্ধ করে ধাপ ৬ আবার করুন, অথবা `.env` এ সাময়িক `QUOTEX_2FA_CODE=123456` দিয়ে restart করুন, পরে মুছে দিন |
| Browser এ WebSocket connect হয় না | `ALLOWED_ORIGINS` এ আপনার frontend domain আছে কিনা দেখুন; Cloudflare এ WebSockets ON কিনা দেখুন |
| `unresolved` এ কিছু market নাম দেখাচ্ছে | ঐ market broker এ এখন নেই / নাম বদলেছে — backend নিজে থেকে প্রতি 60s এ আবার খোঁজে |
| CPU / RAM বেশি লাগছে | `ALWAYS_ON_PERIODS=60` (শুধু 1m) দিন, অথবা `ALWAYS_ON_MARKETS` এ নির্দিষ্ট কয়েকটা symbol দিন |
| কিছু market এ tick আসছে না | backend নিজে REST fallback দিয়ে data আনে; `/markets/status` এ `tick_age_s` দেখুন |
