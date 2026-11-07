# Issue: Quotex login e `HTTP 403` (VPS)

## 1. Error ta dekhte kemon chilo

```
Access page with SSL RESOLVER
[ERROR] quotex-session: connect() failed
  File ".../pyquotex/network/login.py", line 161, in _post
  File ".../pyquotex/network/navigator.py", line 144, in get_soup
RuntimeError: HTTP 403:
[x] Login failed: HTTP 403:
```

- Login er prothom page (GET `https://qxbroker.com/en`) thik moto khulto ("Access page with SSL RESOLVER").
- 403 ashto shudhu email/password submit korar somoy (POST `https://qxbroker.com/en/sign-in/`).
- 403 ta asole Quotex er server dey na, dey **Cloudflare**. Quotex er website Cloudflare er pichone thake. Response e `cf-mitigated: challenge` header ar "Just a moment..." page ashto. Mane Cloudflare request ta ke "bot" dhore niye atkay dito.

---

## 2. Asol karon ki chilo

Cloudflare shudhu IP dekhe na. Ekta request "asol browser" theke ashche kina, seta bojhar jonno se **request er fingerprint** dekhe:

| Ja dekhe | Mane |
|---|---|
| TLS fingerprint (JA3/JA4) | HTTPS connection er somoy client kon cipher, kon kromanushare pathay |
| HTTP/2 fingerprint | Header er kromo, setting |
| User-Agent | Nijeke ki browser bole porichoy dey |
| IP reputation | IP ta data-center (VPS) er kina, age oi IP theke kotobar bot er moto request esheche |

Duita setup er fingerprint alada:

| | Ager setup (ekhon chole na) | Ekhonkar setup (chole) |
|---|---|---|
| Library | Official **latest pyquotex** (`pip install git+https://github.com/cleitonleonel/pyquotex.git`) | crt-chk project er **nijer kache rakha fork** (`python_backend/pyquotex/`) |
| HTTP client | `curl_cffi` (`impersonate="chrome120"`) | Python er `requests` + custom `ssl` cipher suite |
| User-Agent | Chrome 120 | Firefox 119 |
| Websocket | `websockets` library | `websocket-client` library |

VPS er IP theke Cloudflare **Chrome120/curl_cffi fingerprint er login POST block kore**, kintu `requests` + Firefox fingerprint ke ekhono jete dey. Tai crt-chk (ar ekhon q-live-run) e login hoy.

> Note: Websocket server (`wss://ws2.qxbroker.com`) Cloudflare challenge er pichone nei. Test kore 200 OK peyechi. Block shudhu HTTP login page e.

---

## 3. Age cholto, koyek mash pore bondho holo keno

Code ek-i chilo, kintu **baire duita jinish bodle geche**:

1. **Cloudflare er niyom bodlay.** Cloudflare bot-detection niyomito update kore. Jokhon ekta fingerprint (jemon `curl_cffi` er `chrome120`) onek scraper/bot use korte thake, Cloudflare setake "sondehojonok" list e tule dey. Tai ekdin je request pass korto, koyek mash pore seta 403 khay.
2. **pyquotex nije o bodlay.** Official pyquotex kichudin por por login er poddhoti bodlay (`httpx` theke `curl_cffi` e, chrome120 impersonation). `pip install git+...` sobshomoy **latest** code ney. Tai VPS e notun kore install/update korle sei somoyer latest code ashe. Seta Cloudflare er sathe mile o jete pare, na o pare.
   - Ager bar "latest pyquotex e update korle thik hoy", tar karon holo tokhon latest version er fingerprint Cloudflare pass korto. Pore Cloudflare seta o atkay dise.
3. **Bar bar login korle IP flag hoy.** pyquotex docs e o shotorko kora ache: *"Possible blocking by Cloudflare due to multiple automated connection attempts"*. Ei project e tin ta jinish bar bar login korte thake:
   - systemd e `Restart=always` ar `RestartSec=5` (login fail korle proti 5 second e abar chalu hoy)
   - `quotex_session.py` session reject hole shob `session.json` muche feley, tai proti bar notun HTTP login lage
   - Watchdog 90 second tick na pele full reconnect kore

   Egulo milie VPS er IP er reputation kharap hoy, ar Cloudflare aro kora hoye jay.

**Shonkhepe:** code bodlay ni. Cloudflare er detection bodleche, ar official pyquotex er fingerprint Cloudflare er "bot" list e pore geche.

---

## 4. Ki fix kora hoyeche

- crt-chk er kaj kora `pyquotex/` fork ta hubohu `python_backend/pyquotex/` e copy kora hoyeche.
  - `python main.py` chalale Python age script er nijer folder e library khoje. Tai venv e official pyquotex install thakleo **local folder er ta-i load hoy**.
  - Check korte: `python -c "import pyquotex; print(pyquotex.__file__)"` chalan. Output e `/root/python_backend/pyquotex/__init__.py` ashle thik ache.
- `requirements.txt` e `orjson` jog kora hoyeche, karon fork e eta lage.

---

## 5. Future e abar 403 hole ki korben (dhap onujayi)

### Dhap 0: Nishchit hon je eta Cloudflare
```bash
curl -s -o /dev/null -D - https://qxbroker.com/en/sign-in/modal/ | grep -i -E "HTTP/|cf-mitigated"
```
- `403` ar `cf-mitigated: challenge` dekhale Cloudflare block korche.

### Dhap 1: Bar bar login bondho korun (sobar age)
```bash
systemctl stop quotex-backend
```
- 30-60 minute opekkha korun, jate IP er "bot" chhap kete jay.
- Bondho na korle proti 5 second e login hote thakbe, ar block aro lomba hobe.

### Dhap 2: `session.json` diye login ghure jan (sobcheye druto upay)
Token thakle pyquotex HTTP login page e jay-i na, sorasori websocket e connect kore, ar websocket block na.

1. Nijer PC te (basar internet, jekhane browser e Quotex khole) `python_backend` folder ta rakhun. Sekhane ekbar `python main.py` chalan, ar PIN diye login korun.
2. Toiri howa `session.json` VPS e pathan:
   ```bash
   scp session.json root@VPS_IP:/root/python_backend/session.json
   ```
3. `systemctl start quotex-backend`

- `session.json` er vitorer email ar VPS er login email ek hote hobe.
- Token expire hole ba "log out all devices" korle ei kaj ta abar korte hobe.

### Dhap 3: Kon library load hocche check korun
```bash
cd /root/python_backend && source venv/bin/activate
python -c "import pyquotex; print(pyquotex.__file__)"
```
- Local folder er path na dekhale (venv er `site-packages` dekhale) `pyquotex/` folder ta VPS e copy hoy ni.
- **`pip install -U git+https://github.com/cleitonleonel/pyquotex.git` diye "update" kore thik korar cheshta korben na.** Ekhon ei official version tai block hocche.

### Dhap 4: Fork o block hole: arekta login fingerprint try korun
- Onno kono project (jemon crt-chk) VPS e ekhono login korte parle, tar `pyquotex/` folder ta ekhane copy korun. Ei bar thik eta-i kora hoyeche.
- Kono kaj kora version na paile official pyquotex er GitHub e notun commit/issue dekhun ("403", "cloudflare" likhe khujun). Maintainer Cloudflare er sathe milie update dile, sei commit ta test korun.
- Kheyal rakhben: `requests` diye sadharon GET-o 403 khele, fingerprint bodle kaj hobe na. Tokhon IP-i block, Dhap 5 dekhun.

### Dhap 5: IP bodlan ba residential proxy use korun (sthayi upay)
- Data-center IP (jemon Contabo, `vmi...`) Cloudflare beshi block kore. Onno provider ba notun IP try korun.
- Residential proxy: fork er `Quotex(...)` `proxies` parameter nite pare:
  ```python
  Quotex(email=..., password=..., host="qxbroker.com", lang="en",
         proxies={"http": "http://user:pass@ip:port", "https": "http://user:pass@ip:port"})
  ```
  (Ekhon `quotex_session.py` e proxy pass kora hoy na. Dorkar hole ekta env setting, jemon `QUOTEX_PROXY`, jog korte hobe.)
- VPS e VPN chalu thakle VPN chara ekbar try korun. VPN er IP o block thakte pare.

### Dhap 6: Jeno abar na hoy: bhobishyoter jonno sotorkota
- `deploy/quotex-backend.service` e `RestartSec=5` bariye `RestartSec=120` (ba beshi) korun, jate fail korle bar bar login na hoy.
- `pyquotex/` folder ta repo tei rakhun. **Official pyquotex auto-update hote diben na.**
- Ekta kaj kora `session.json` er backup rakhun.
- Ek-i account e eki shathe onek jayga (PC, VPS, onno bot) theke bar bar login korben na.

---

## 6. Ek line e mone rakhar jonno

> **403 = Cloudflare atkacche, code na.** Prothome service bondho korun. `session.json` diye login ghure jan. Kaj kora `pyquotex/` fork local folder e rakhun. Tatei na hole IP bodlan ba residential proxy nin.
