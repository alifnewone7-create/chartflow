# ChartFlow (imported from GitHub)
Original request: clone https://github.com/alifnewone7-create/chartflow.git, run website, add Firebase API key + service account via secure box.
## Architecture
- Next.js 16 app in /app/frontend (yarn start builds + serves on :3000), Firebase client + firebase-admin (RTDB asia-southeast1)
- FastAPI /app/backend/server.py proxies /api/* to Next (NEXT_INTERNAL_URL=http://localhost:3000)
- Secrets: CHARTFLOW_FIREBASE_API_KEY, FIREBASE_SERVICE_ACCOUNT (set). DATABASE_URL (Neon, payment proofs) NOT set.
## Done (Jun 2026)
- Repo imported & running; Firebase verified; smoke tests 100% pass
## Backlog
- P1: Neon DATABASE_URL for payment-proof uploads; ADMIN_PASSWORD/ADMIN_SECRET_KEY (default "iamhear")
- P2: External live chart websocket api.chartflow.online returning 502

## Jun 2026 iteration 2
- Auto-signal page: gear Settings icon, Telegram logo, mobile status badge fix, channel saved view + delete, closed session hides monitoring markets
## Jun 2026 iteration 3 (VPS bot: frontend/python_backend)
- Result message: removed ChartFlow Ai header + Candle line
- /start status: Not Connected / Connected + spoiler email
- Admin "TG Bot Settings": editable signal/result/partial templates (RTDB bot_config/templates, placeholders auto-filled, validated) + premium emoji ID map (bot_config/emojis); personal chats get <tg-emoji>, fallback to plain on error, channels plain
- Needs VPS redeploy of python_backend to take effect
- Iteration 4: admin 'Send test message' (POST /engine/admin/bot-test, admin claim) sends sample signal/result/partial to a Telegram user ID; friendly error if user hasn't /start-ed. Needs VPS redeploy.
- Iteration 5-7: full OTC names + show all/less in payout preview; mode buttons wrap on mobile; Market type (Only OTC / Only Real / OTC + Real) in payout mode rules (frontend + VPS features.py market_type); tab divider before settings icon
- Iteration 8: /profile redesigned (identity card, Daily limit quotas for live/future/auto/2-candle, plan comparison); Plan Benefits removed

## Re-import (Nov 2026)
- Repo re-cloned into /app, Firebase keys re-added via secure card (runtime env)
- Removed first-visit LanguageSelectPopup from app/layout.tsx (header switcher remains)
- Added app/not-found.tsx: 404 page in home Volt theme with Go Back (history back, fallback /) + Home
- Fixed '//' URLs showing Next 'This page couldn't load' (head script collapses slashes); 404 Go Back fallback hardened (fresh tab -> /)
- Desktop collapsible left sidebar for signed-in pages (components/signal/desktop-sidebar.tsx): home Volt theme, toggle in bottom account card (replaces profile icon), icons-only when collapsed, state persisted in localStorage cf_sidebar via html[data-sidebar]; no glow on active item. Mobile keeps bottom nav.
- Test user created in Firebase: sidebar.tester.cf@example.com (see test_credentials.md)
- Backlog: /upgrade-your-plan has no sidebar (standalone page)
- Sidebar footer: name/tier removed, toggle alone with no card/shadow behind it

## Jun 2026 — Volt redesign of /profile, /chart-2candle, /upgrade-your-plan (tested: iteration_6, all pass)
- New bespoke duotone icons appended to components/home/icons.tsx (IdBadge, MailSeal, Membership, Gauge, Pulse, FutureClock, Bot, Refresh, Rocket, Infinity, Lock, Timer, Eye, Alert, TrendUp/Down, Waves, Exit)
- /profile: identity card (cf-card-strong, Eyebrow pill, cf-headline name, Emblem tiles), Daily limit + Plan comparison with home SectionHead; profile/ui.tsx rewritten (PANEL, HAZE, SectionHead, Chip, TIER_ICON)
- /chart-2candle: top eyebrow/title removed; See2CandleCard + QuotaCard + limit overlay recolored to lime/charcoal with bespoke icons
- /upgrade-your-plan: now inside SignalShell (sidebar/top nav/bottom nav like other pages; old header removed); reuses home PricingCard (new props badge/footer/current) with state-aware footer (Purchased / Your current account / Upgrade CTA). signal-shell.tsx: free tier ungated on /profile and /upgrade-your-plan
- Test users: pro.tester.cf@example.com (pro), sidebar.tester.cf@example.com (free) — see test_credentials.md
- NOTE: frontend is a production build; run `yarn build` in /app/frontend then `supervisorctl restart frontend` after code changes
