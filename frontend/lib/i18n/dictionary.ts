export type Language = "en" | "bn"

export const LANGUAGES: { code: Language; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "us" },
  { code: "bn", label: "Bangla", native: "বাংলা", flag: "bd" },
]

type Dict = Record<string, string>

const en: Dict = {
  // Header
  "header.liveChart": "Live Chart",
  "header.features": "Features",
  "header.pricing": "Pricing",
  "header.activate": "Login",
  "header.menu": "Menu",
  "header.menu.contact": "Contact Admin",
  "header.menu.language": "Language",

  // Language popup
  "lang.popup.eyebrow": "Select your language",
  "lang.popup.title": "Choose your language",
  "lang.popup.subtitle":
    "Pick the language you'd like to read ChartFlow Ai in. You can change it anytime from the menu.",
  "lang.popup.continue": "Continue",
  "lang.popup.changeLater": "You can change this later in the top menu.",

  // Hero
  "hero.badge": "Live Market Feed",
  "hero.title.1": "Trade Quotex with a",
  "hero.title.2": "two-candle",
  "hero.title.3": "advantage",
  "hero.subtitle":
    "Real-time Quotex charts and premium signals — designed to let you see the market move before it happens.",
  "hero.cta.activate": "Activate Account",
  "hero.cta.activeChartflow": "Active ChartFlow Ai",
  "hero.cta.features": "Features",
  "hero.chart.pair": "USD/BRL",
  "hero.chart.otc": "(OTC)",
  "hero.chart.pairName": "US Dollar / Brazilian Real",
  "hero.chart.live": "Live",

  // Feature section
  "why.title.1": "Real signals,",
  "why.title.2": "real results",
  "why.subtitle": "Everything ChartFlow Ai gives you — live signals, future signals, Telegram alerts and VIP care — built on real market data.",
  "why.1.tag": "Live signal",
  "why.1.title": "Live Signals on the Live Quotex Chart",
  "why.1.desc": "Take signals right on the live Quotex chart. Every signal shows its entry, direction and final result in real time.",
  "why.2.tag": "Future signal",
  "why.2.title": "Future Signal Generator",
  "why.2.desc": "Generate upcoming signals from proper market data — each one comes with a clear signal and a tracked result.",
  "why.3.tag": "Auto Telegram",
  "why.3.title": "Automatic Telegram Signals",
  "why.3.desc": "Signals are sent automatically to our Telegram bot and channel with a clean signal image and the result.",
  "why.4.tag": "Always on",
  "why.4.title": "24/7 Market · All Quotex Pairs",
  "why.4.desc": "Always on, day and night — coverage across every Quotex pair, including OTC markets.",
  "why.5.tag": "VIP care",
  "why.5.title": "VIP Care",
  "why.5.desc": "A direct line to senior admins for activation, signal questions and strategy help — answers in minutes.",
  "why.6.tag": "Real strategy",
  "why.6.title": "Real Data. Real Strategy. High Accuracy.",
  "why.6.desc": "Every signal is based on real market data and a real, tested strategy — so the accuracy stays high.",
  "why.6.meter": "Signal accuracy",
  "why.result.win": "Win",
  "why.5.admin": "Senior Admin",
  "why.5.status": "Online · replies in minutes",
  "why.4.all": "+ All OTC",
  "feature.tagline": "Powered by precision",
  "feature.badge": "Why ChartFlow Ai",
  "feature.title.1": "A premium edge,",
  "feature.title.2": "built for traders",
  "feature.subtitle":
    "Every layer — from the data feed to the support desk — is engineered to put you ahead of the candle.",

  "feature.1.eyebrow": "Signature edge",
  "feature.1.title": "2 Candles Ahead View",
  "feature.1.desc":
    "Forecast price action two candles before it prints on the chart. Plan entries with confidence — the single biggest edge in short-timeframe trading.",
  "feature.1.metric.value": "+2",
  "feature.1.metric.label": "candle preview window",
  "feature.1.footer": "Available on Standard, Premium & Extreme",

  "feature.2.eyebrow": "Verified",
  "feature.2.title": "94% Avg Accuracy",
  "feature.2.desc":
    "Independently tracked across thousands of live signals — no replays, no cherry-picked results, just real-time precision.",
  "feature.2.metric.value": "94%",
  "feature.2.metric.label": "win rate avg",

  "feature.3.eyebrow": "Always on",
  "feature.3.title": "24/7 Market Coverage",
  "feature.3.desc":
    "Every Quotex OTC and standard pair tracked continuously — including weekends, holidays and overnight sessions.",
  "feature.3.metric.value": "All",
  "feature.3.metric.label": "Quotex pairs",

  "feature.4.eyebrow": "VIP care",
  "feature.4.title": "Direct Admin Channel",
  "feature.4.desc":
    "Telegram-direct line to senior admins for activation help, signal questions and strategy guidance — answered in minutes, not hours.",

  // Testimonials
  "testimonials.badge": "Trader Stories",
  "testimonials.title.1": "Real results from",
  "testimonials.title.2": "real traders",
  "testimonials.subtitle":
    "Verified members sharing what changed when they switched to a two-candle-ahead workflow.",
  "testimonials.prev": "Previous testimonial",
  "testimonials.next": "Next testimonial",
  "testimonials.slide": "Go to slide",

  "tm.1.name": "Rahim Hossain",
  "tm.1.quote":
    "The two-candle preview is what makes this different from anything else I've used. I'm finally entering trades with conviction instead of guessing. Withdrew $2,450 in my first month.",
  "tm.1.result": "+$2,450 first month",

  "tm.2.name": "Karim Ahmed",
  "tm.2.quote":
    "I was skeptical at first, but the win rate is real. The auto-signals on my selected 30 markets fire exactly when a clean setup forms. Best investment I've made for trading.",
  "tm.2.result": "7 winning trades in a row",

  "tm.3.name": "Ayesha Siddika",
  "tm.3.quote":
    "Customer support is outstanding. The admin walked me through everything during setup. The 1-minute signals match my schedule perfectly — I trade during my lunch break.",
  "tm.3.result": "82% win rate sustained",

  "tm.4.name": "Shakib Mahmud",
  "tm.4.quote":
    "Extreme plan is worth every dollar. 150 signals daily, lifetime access, and the strategy team genuinely cares about your results. I've recommended it to every trader I know.",
  "tm.4.result": "Account 4x in 3 months",

  "tm.5.name": "Tanvir Rahman",
  "tm.5.quote":
    "The 1-minute signals are insane. I can take 20+ trades in a session with high accuracy. Quotex payouts plus this signal feed is a real edge.",
  "tm.5.result": "+$1,800 in two weeks",

  "tm.6.name": "Imran Hossain",
  "tm.6.quote":
    "I've tried five other signal providers. None come close to the precision and consistency here. The OTC weekend coverage alone has paid for the plan many times over.",
  "tm.6.result": "Profitable 11 weeks straight",

  "tm.country.dhaka": "Dhaka, Bangladesh",
  "tm.country.chittagong": "Chittagong, Bangladesh",
  "tm.country.khulna": "Khulna, Bangladesh",
  "tm.country.rajshahi": "Rajshahi, Bangladesh",
  "tm.country.sylhet": "Sylhet, Bangladesh",
  "tm.country.barisal": "Barisal, Bangladesh",

  // Pricing — section header
  "pricing.badge": "Pricing",
  "pricing.title.1": "Plans built for",
  "pricing.title.2": "every trader",
  "pricing.subtitle":
    "From a free starter route via Quotex deposit to lifetime flagship access — pick the plan that matches your edge.",
  "pricing.popular": "Most Popular",
  "pricing.viewDetails": "View full details",
  "pricing.dialog.plan": "Plan",
  "pricing.dialog.titlePrefix": "What you get with",
  "pricing.dialog.subtitle":
    "Below is the full breakdown of every benefit included.",
  "pricing.dialog.close": "Close",
  "pricing.notIncluded": "Not included",
  "pricing.cta.basic": "Create Quotex Account",
  "pricing.cta.purchase": "Purchase Now",
  "pricing.suffix.deposit": "min. deposit",
  "pricing.suffix.purchase": "purchase price",
  "pricing.meta.limited": "Limited",
  "pricing.meta.daily": "Daily",
  "pricing.meta.unlocked": "Unlocked",
  "pricing.meta.basicLimit": "Daily 15 Min",
  "pricing.meta.smartLimit": "Daily 50 Min",
  "pricing.meta.proLimit": "Daily 2 Hr",
  "pricing.meta.domLimit": "Daily 4 Hr",

  // Pricing — "2 candles ahead view" usage tags per tier (shown inline next
  // to the feature label and dialog title to communicate daily session
  // length included with each plan).
  "tier.basic.tag.candles": "Daily 15 min",
  "tier.smart.tag.candles": "Daily 50 min",
  "tier.pro.tag.candles": "Daily 120 min",
  "tier.dom.tag.candles": "Daily 4 hours",

  // Pricing — Basic
  "tier.basic.name": "Basic",
  "tier.basic.desc": "Create account with our Quotex link and deposit to get started.",
  "tier.basic.f1.label": "10 Quotex OTC markets",
  "tier.basic.f1.sub": "Curated live pairs",
  "tier.basic.f2.label": "10 live signals · 1-minute",
  "tier.basic.f2.sub": "Real-time chart analysis",
  "tier.basic.f3.label": "10 live signals · 15-second",
  "tier.basic.f3.sub": "Fast scalp entries",
  "tier.basic.f4.label": "Pick 10 markets for auto-signals",
  "tier.basic.f4.sub": "Choose freely · auto-fires on strong setups",
  "tier.basic.f5.label": "Basic trading strategy",
  "tier.basic.f5.sub": "OTC market signals",
  "tier.basic.f6.label": "2 candles ahead view",
  "tier.basic.f6.sub": "Forecast preview",
  "tier.basic.d1.title": "10 Quotex OTC markets",
  "tier.basic.d1.body":
    "Hand-picked, high-liquidity OTC pairs streamed live so you always trade where momentum is strongest. Slot rotation keeps the list fresh.",
  "tier.basic.d2.title": "10 live signals on 1-minute timeframe",
  "tier.basic.d2.body":
    "Issued daily from real-time analysis of the Quotex chart. Every signal includes asset, direction and entry — built for steady 1-minute expiries.",
  "tier.basic.d3.title": "10 fast-action signals on 15-second timeframe",
  "tier.basic.d3.body":
    "Same live analysis, scalp-grade execution. Ten daily entries calibrated for the 15-second timeframe, ideal for quick, high-frequency setups.",
  "tier.basic.d4.title": "Pick 10 markets for automatic signals",
  "tier.basic.d4.body":
    "You choose any 10 markets you want to track. The system watches them around the clock and auto-fires a signal the moment a strong, validated strategy aligns.",
  "tier.basic.d5.title": "Basic trading strategy",
  "tier.basic.d5.body":
    "A clean baseline strategy that runs on OTC markets — entry, direction and timing, with no extra setup required from you.",
  "tier.basic.d6.title": "2 candles ahead view · Daily 15 Min",
  "tier.basic.d6.body":
    "Reserved for paid plans. Upgrade to Standard, Premium or Extreme to unlock the forecast view that shows where price is heading two candles before it prints.",

  // Pricing — Standard
  "tier.smart.name": "Standard",
  "tier.smart.desc":
    "Step-up plan for serious traders ready to scale signal accuracy.",
  "tier.smart.f1.label": "50 Quotex Markets",
  "tier.smart.f1.sub": "Full pair coverage",
  "tier.smart.f2.label": "25 live signals · 1-minute",
  "tier.smart.f2.sub": "Pick your market · live chart entries",
  "tier.smart.f3.label": "25 live signals · 15-second",
  "tier.smart.f3.sub": "Pick your market · scalp entries",
  "tier.smart.f4.label": "Pick 20 markets for auto-signals",
  "tier.smart.f4.sub": "Auto-fires on strong setups",
  "tier.smart.f5.label": "2 candles ahead view",
  "tier.smart.f5.sub": "Forecast preview",
  "tier.smart.f6.label": "Powerful trading strategy",
  "tier.smart.f6.sub": "Premium high-accuracy engine",
  "tier.smart.d1.title": "50 Quotex Markets",
  "tier.smart.d1.body":
    "Full access to 50 Quotex markets — OTC. Trade where the action is, with no curated shortlist limiting your choices.",
  "tier.smart.d2.title": "25 live signals on 1-minute timeframe",
  "tier.smart.d2.body":
    "Issued daily. Select any market you want during a live chart session and take a 1-minute signal on demand — entry, direction and timing all delivered in real time.",
  "tier.smart.d3.title": "25 live signals on 15-second timeframe",
  "tier.smart.d3.body":
    "Same flexibility for scalpers. Pick any market while the chart is live and take a 15-second signal — built for fast, high-frequency execution.",
  "tier.smart.d4.title": "Pick 20 markets for automatic signals",
  "tier.smart.d4.body":
    "Choose any 20 markets you want monitored. The system tracks them around the clock and auto-fires a signal the moment a strong, validated setup aligns.",
  "tier.smart.d5.title": "2 candles ahead view · Daily 50 Min",
  "tier.smart.d5.body":
    "See projected price action two candles before it prints on Quotex. Plan entries with confidence and avoid getting caught in late chase trades.",
  "tier.smart.d6.title": "Powerful trading strategy",
  "tier.smart.d6.body":
    "Premium high-accuracy strategy with stricter filters, tighter entries and noise removed. Engineered for traders who need consistency over volume.",

  // Pricing — Premium
  "tier.pro.name": "Premium",
  "tier.pro.desc":
    "Premium-grade access engineered for traders ready to scale into serious daily volume with sharper precision and richer coverage.",
  "tier.pro.f1.label": "50 Quotex Markets",
  "tier.pro.f1.sub": "Full pair coverage · OTC",
  "tier.pro.f2.label": "50 live signals daily",
  "tier.pro.f2.sub": "1-minute · pick your market",
  "tier.pro.f3.label": "Pick 30 markets for auto-signals",
  "tier.pro.f3.sub": "24/7 monitoring · auto-fires on strong setups",
  "tier.pro.f4.label": "2 candles ahead view",
  "tier.pro.f4.sub": "Forecast preview before it prints",
  "tier.pro.f5.label": "Premium-grade trading strategy",
  "tier.pro.f5.sub": "Refined high-precision engine",
  "tier.pro.f6.label": "Higher accuracy filtering",
  "tier.pro.f6.sub": "Stricter rejection · cleaner entries",
  "tier.pro.f7.label": "Trend & reversal detection",
  "tier.pro.f7.sub": "Multi-layer market reading",
  "tier.pro.f8.label": "VIP support channel",
  "tier.pro.f8.sub": "Direct line to senior admins",
  "tier.pro.f9.label": "Includes everything in Standard",
  "tier.pro.f9.sub": "All lower-tier benefits carried over",
  "tier.pro.d1.title": "50 Quotex Markets",
  "tier.pro.d1.body":
    "Full access to 50 Quotex markets — OTC, majors, minors and crypto pairs. Trade where the action is with no curated shortlist limiting your choices and no pairs locked behind extra paywalls.",
  "tier.pro.d2.title": "50 live signals daily",
  "tier.pro.d2.body":
    "50 live signals issued every day on the 1-minute timeframe. Pick any market you want during a live chart session and take a signal on demand — entry, direction and timing delivered in real time the moment your selected market gives a clean setup.",
  "tier.pro.d3.title": "Pick 30 markets for automatic signals",
  "tier.pro.d3.body":
    "Choose any 30 markets you want monitored. The system tracks every one of them around the clock and auto-fires a signal the moment a strong, validated setup aligns — so you never miss a high-conviction move while you're away from the chart.",
  "tier.pro.d4.title": "2 candles ahead view · Daily 2 Hr",
  "tier.pro.d4.body":
    "See projected price action two candles before it prints on Quotex. Plan entries with confidence, line up better risk-to-reward and avoid getting caught in late chase trades or fakeout reversals.",
  "tier.pro.d5.title": "Premium-grade trading strategy",
  "tier.pro.d5.body":
    "Premium-grade entry filtering with sharper precision and stricter rejection logic. Fewer noise trades, cleaner setups, better risk-to-reward. Built on a multi-layer engine that combines momentum, trend strength and price-action confirmation before any signal is released.",
  "tier.pro.d6.title": "Higher accuracy filtering",
  "tier.pro.d6.body":
    "Every signal passes a tighter validation pass than the Standard tier — weak setups are filtered out before they ever reach you, so the signals you receive carry a higher conviction rate on average.",
  "tier.pro.d7.title": "Trend & reversal detection",
  "tier.pro.d7.body":
    "The strategy reads both trend continuation and exhaustion zones, so you get clean signals whether the market is running with momentum or flipping at a key level. No more guessing the direction.",
  "tier.pro.d8.title": "VIP support channel",
  "tier.pro.d8.body":
    "Private VIP line directly into the admin team. Faster help, dedicated guidance and live trade-related support when markets are open — including help interpreting signals and handling Quotex account questions.",
  "tier.pro.d9.title": "Includes everything in Standard",
  "tier.pro.d9.body":
    "Every Standard-tier benefit is carried over so you never lose features by upgrading — full markets access, the live-chart signal flow, the auto-signal market selector and the 2-candle forecast all remain part of your plan.",

  // Pricing — Extreme
  "tier.dom.name": "Extreme",
  "tier.dom.desc":
    "Flagship package — maximum signal volume, highest priority, the strictest precision and lifetime ownership of the platform.",
  "tier.dom.f1.label": "50 Quotex Markets",
  "tier.dom.f1.sub": "Full pair coverage · OTC",
  "tier.dom.f2.label": "150 live signals daily",
  "tier.dom.f2.sub": "1-minute · pick your market",
  "tier.dom.f3.label": "Pick 50 markets for auto-signals",
  "tier.dom.f3.sub": "24/7 monitoring · auto-fires on strong setups",
  "tier.dom.f4.label": "2 candles ahead view",
  "tier.dom.f4.sub": "Forecast preview before it prints",
  "tier.dom.f5.label": "Flagship trading strategy",
  "tier.dom.f5.sub": "Strictest filters · highest precision",
  "tier.dom.f6.label": "Highest signal priority",
  "tier.dom.f6.sub": "First in queue on every release",
  "tier.dom.f7.label": "Personal trading roadmap",
  "tier.dom.f7.sub": "Tailored to your style & risk profile",
  "tier.dom.f8.label": "Lifetime chart & forecast access",
  "tier.dom.f8.sub": "No expiry · no subscription",
  "tier.dom.f9.label": "Early access to new features",
  "tier.dom.f9.sub": "Beta releases before anyone else",
  "tier.dom.f10.label": "Dedicated VIP admin",
  "tier.dom.f10.sub": "Direct line · trade & account support",
  "tier.dom.f11.label": "Includes everything in Premium",
  "tier.dom.f11.sub": "All lower-tier benefits carried over",
  "tier.dom.d1.title": "50 Quotex Markets",
  "tier.dom.d1.body":
    "Full access to 50 Quotex markets — OTC, majors, minors and crypto pairs. Trade where the action is with no curated shortlist and no pairs locked behind extra paywalls.",
  "tier.dom.d2.title": "150 live signals daily",
  "tier.dom.d2.body":
    "150 live signals issued every day on the 1-minute timeframe — three times the daily volume of Premium. Pick any market you want during a live chart session and take a signal on demand, with entry, direction and timing delivered in real time the moment your selected market gives a clean setup.",
  "tier.dom.d3.title": "Pick 50 markets for automatic signals",
  "tier.dom.d3.body":
    "Choose any 50 markets you want monitored — the largest auto-signal capacity available on the platform. The system tracks every one of them around the clock and auto-fires a signal the moment a strong, validated setup aligns, so you never miss a high-conviction move regardless of which session you trade.",
  "tier.dom.d4.title": "2 candles ahead view · Daily 4 Hr",
  "tier.dom.d4.body":
    "See projected price action two candles before it prints on Quotex. Plan entries with confidence, line up superior risk-to-reward and avoid getting caught in late chase trades or fakeout reversals.",
  "tier.dom.d5.title": "Flagship trading strategy",
  "tier.dom.d5.body":
    "The strictest filters and the cleanest entries available on the platform. The Extreme engine combines momentum, trend strength, volatility regime and multi-timeframe price-action confirmation before any signal is released — engineered for maximum edge and consistency over a full trading day.",
  "tier.dom.d6.title": "Highest signal priority",
  "tier.dom.d6.body":
    "You sit at the top of the signal queue. New high-conviction setups land in your feed first, before any other tier sees them — a real timing advantage on fast-moving 1-minute trades where seconds matter.",
  "tier.dom.d7.title": "Personal trading roadmap",
  "tier.dom.d7.body":
    "Get a personalised roadmap — which markets to focus on, which timeframe suits your style, recommended position sizing and a step-by-step plan to scale up your account responsibly.",
  "tier.dom.d8.title": "Lifetime chart & forecast access",
  "tier.dom.d8.body":
    "Permanent access to the live USD/BRL chart and the 2-candle forecast view. No subscription, no monthly fee, no expiry — once you're in, you stay in. Future platform upgrades are included automatically.",
  "tier.dom.d9.title": "Early access to new features",
  "tier.dom.d9.body":
    "Be the first to use new strategies, new markets and new tools the moment they enter beta — before they're rolled out to lower tiers or to the public.",
  "tier.dom.d10.title": "Dedicated VIP admin",
  "tier.dom.d10.body":
    "A dedicated senior admin assigned to your account for direct help on signals, account questions, payouts and everything in between. The fastest support channel on the platform.",
  "tier.dom.d11.title": "Includes everything in Premium",
  "tier.dom.d11.body":
    "Every Premium-tier benefit is carried over so you never lose features by upgrading — full Quotex markets access, the live-chart signal flow, the auto-signal market selector, the 2-candle forecast and all Standard-tier benefits remain part of your plan.",

  // Founder
  "founder.badge": "Meet The Founder",
  "founder.title.1": "Founder of",
  "founder.title.2": "ChartFlow Ai",
  "founder.subtitle":
    "The story behind the platform — and the trader who built it for the community.",
  "founder.name": "Mushfiq",
  "founder.role": "Founder & Lead Strategist",
  "founder.handle": "@Mushfiq2615",
  "founder.bio.1":
    "Mushfiq is a full-time Quotex trader, strategist and the architect behind ChartFlow Ai. What started as a personal trading edge — a way to read price action two candles ahead — slowly grew into a platform built for serious traders who refuse to settle for noisy signals and guesswork.",
  "founder.bio.2":
    "Every signal engine, every chart layer and every line of strategy you see here was hand-crafted by Mushfiq with one obsession: precision. He didn't outsource the work. He built it himself, refined it across thousands of live trades and shipped it to a community that now stands 50,000 traders strong.",
  "founder.dedication.title": "Built with dedication",
  "founder.dedication.body":
    "ChartFlow Ai wasn't built overnight. It is the result of years of late-night chart sessions, brutal backtests and a refusal to publish anything until the win rate could speak for itself. This platform is Mushfiq&apos;s personal craft — built for traders, by a trader.",
  "founder.stat.community.value": "50K+",
  "founder.stat.community.label": "Trading Community",
  "founder.stat.signals.value": "10K+",
  "founder.stat.signals.label": "Signals Issued",
  "founder.stat.winrate.value": "94%",
  "founder.stat.winrate.label": "Avg Win Rate",
  "founder.cta.telegram": "Join the Community",
  "founder.cta.activate": "Activate Account",
  "founder.imageAlt": "Mushfiq — Founder of ChartFlow Ai",

  // Activate Account page
  "activate.badge": "Account Activation",
  "activate.title.1": "Activate your",
  "activate.title.2": "ChartFlow Ai access",
  "activate.subtitle":
    "Fill in your details with the QXL Key you received after purchase to unlock the live signal feed.",
  "activate.form.title": "Activation Details",
  "activate.form.subtitle": "Enter Your Credentials",
  "activate.form.fullName.label": "Your Full Name",
  "activate.form.fullName.placeholder": "Enter Your Name",
  "activate.form.fullName.hint": "4 to 14 characters. Letters, numbers, spaces & symbols allowed.",
  "activate.form.fullName.errorMin": "Full name must be at least 4 characters.",
  "activate.form.fullName.errorMax": "Full name cannot exceed 14 characters.",
  "activate.form.username.label": "Username",
  "activate.form.username.placeholder": "Enter Your Username",
  "activate.form.username.hint":
    "5 to 32 characters. Letters, numbers, and underscore (_) only — no spaces or symbols.",
  "activate.form.username.errorMin": "Username must be at least 5 characters.",
  "activate.form.username.errorMax": "Username cannot exceed 32 characters.",
  "activate.form.username.errorFormat":
    "Only letters, numbers and underscore are allowed.",
  "activate.form.qxlKey.label": "QXL Key",
  "activate.form.qxlKey.placeholder": "e.g. QXL-XXXX-XXXX-XXXX",
  "activate.form.qxlKey.hint":
    "The activation key shared by admin after your purchase.",
    "activate.form.qxlKey.errorRequired": "QXL Key is required.",
    "activate.form.qxlKey.errorNotFound":
      "We couldn't recognise that QXL Key. Please double-check it with admin.",
    "activate.form.qxlKey.errorClaimed":
      "This key has already been activated by another username.",
    "activate.form.qxlKey.errorNetwork":
      "Couldn't reach activation service. Check your connection and try again.",
    "activate.form.submit": "Activate Your Account",
    "activate.form.submitting": "Activating…",
    "activate.form.success.title": "Activation complete",
    "activate.form.success.body":
      "Welcome aboard, {name}. Your dashboard and signal rooms are ready.",
    "activate.form.success.cta": "Open my dashboard",
    "activate.form.success.redirecting": "Redirecting to your dashboard…",

  // QXL Key acquisition section
  "qxl.badge": "How to Get QXL Key",
  "qxl.title.1": "No QXL Key yet?",
  "qxl.title.2": "Pick a plan to receive one",
  "qxl.subtitle":
    "Each tier delivers a unique QXL Key the moment your purchase clears. Choose the access level that matches the way you trade.",
  "qxl.step": "Step",
  "qxl.includes": "Includes",
  "qxl.cta.choose": "Choose this plan",
  "qxl.cta.signup": "Create Quotex Account",
  "qxl.popular": "Most chosen",
  "qxl.help.title": "Already paid but no key yet?",
  "qxl.help.body":
    "Reach admin on Telegram with your transaction reference and you will receive the QXL Key right away.",
  "qxl.help.cta": "Message Admin",

  // FAQ
  "faq.badge": "Frequently Asked",
  "faq.title.1": "Everything you need",
  "faq.title.2": "to know",
  "faq.subtitle": "Straight answers to the questions every trader asks before joining.",
  "faq.cta.title": "Still have questions?",
  "faq.cta.subtitle": "Message admin directly — usually answered in minutes.",
  "faq.cta.button": "Contact Admin",

  "faq.1.q": "How fast do I get access after payment?",
  "faq.1.a":
    "Activation is instant in most cases. As soon as your payment is confirmed, our admin team activates your plan — usually within a few minutes. You'll receive direct access to the live chart, the signal feed and the Telegram channel right away.",
  "faq.2.q": "What happens if a signal doesn't profit?",
  "faq.2.a":
    "No signal provider in the world can promise 100% wins — markets are probabilistic. Our published win rate (around 90–94%) is the realistic average across hundreds of signals. We recommend proper risk management on every trade and never investing more than you can afford to lose.",
  "faq.3.q": "What's the difference between live signals and auto-signals?",
  "faq.3.a":
    "Live signals are issued during a live chart session — you pick a market, the engine analyzes it and you receive an entry on demand. Auto-signals work in the background: you select a watchlist of markets (20–50 depending on plan) and the system fires a signal automatically the moment a clean setup forms — even when you're away from the chart.",
  "faq.4.q": "Do I need any prior trading experience?",
  "faq.4.a":
    "No experience is required. Each signal includes the market, direction, timeframe and confidence score — everything you need to place the trade on Quotex. We also include a strategy onboarding walkthrough and the admin team is available to help you get started.",
  "faq.5.q": "Can I upgrade or change my plan later?",
  "faq.5.a":
    "Yes — you can upgrade your plan at any time. Just pay the price difference and message the admin on Telegram. Your account is upgraded within minutes, the new features unlock immediately and you keep full access without losing any of your current benefits or remaining time.",
  "faq.6.q": "How does the 2 candles ahead view actually work?",
  "faq.6.a":
    "Our engine analyzes Quotex price action across multiple timeframes and projects the next two candles before they print on your screen. This gives you a planning window for entries — you see the likely direction in advance rather than reacting after the fact, which is the single biggest edge for short-timeframe trading.",
  "faq.7.q": "Is my payment and account information secure?",
  "faq.7.a":
    "Yes. Payments are processed through secure providers and we never store card details. Account information stays between you and the admin team. Lifetime members on Extreme get a dedicated VIP admin for additional account safety and priority support.",

  // Footer
  "footer.contact": "Contact",
  "footer.privacy": "Privacy Policy",
  "footer.rights": "All rights reserved.",

  // Privacy Policy page
  "privacy.badge": "Legal · Privacy Policy",
  "privacy.title.1": "Your privacy,",
  "privacy.title.2": "our promise",
  "privacy.subtitle":
    "How ChartFlow Ai collects, handles and protects your information — and a transparent note on how our market data is sourced.",
  "privacy.lastUpdated": "Last updated",
  "privacy.lastUpdated.value": "April 28, 2026",

  "privacy.legal.title": "Legal disclosure on data sourcing",
  "privacy.legal.body":
    "ChartFlow Ai is an independent third-party signal & analytics service. We are not affiliated with, endorsed by, or in any way owned by Quotex, its parent company or any of its subsidiaries. The market data, candle feeds and pricing tickers shown on our platform are obtained through legally permissible channels — including Quotex's own publicly accessible chart endpoints, broker-grade aggregators (TradingView, Polygon, Twelve Data), and licensed market-data partners. We do not scrape private accounts, we do not bypass any authentication, and we do not redistribute proprietary or confidential data. All trademarks, including the Quotex name and logo, remain the property of their respective owners and are referenced only for identification.",

  "privacy.section.1.title": "Information we collect",
  "privacy.section.1.body":
    "When you activate an account on ChartFlow Ai, you provide us with your name and email address. We may also receive a Telegram username if you choose to contact our admin team via Telegram. We do not collect, store, or process your Quotex broker password, your Quotex account balance, your trading history on Quotex, or any payment card details — payments are handled exclusively by our payment partners.",

  "privacy.section.2.title": "How we use your information",
  "privacy.section.2.body":
    "Your information is used solely to (a) verify and activate your ChartFlow Ai access, (b) deliver signals, alerts and product updates relevant to your plan, and (c) provide customer support through our admin team. We never sell, rent, or trade your personal information to advertisers or any third party for marketing purposes.",

  "privacy.section.3.title": "Data storage & security",
  "privacy.section.3.body":
    "Your activation details are stored in encrypted, access-controlled databases hosted by reputable cloud providers. Only authorized members of the admin team can access this data, and access is logged. Communications carrying activation data are protected with industry-standard TLS encryption.",

  "privacy.section.4.title": "Third-party services",
  "privacy.section.4.body":
    "We use Telegram for community delivery and admin contact, hosting providers (Vercel) for serving the website, and analytics services for aggregate, non-identifying traffic measurement. These services have their own privacy policies and we recommend reviewing them. We do not share personally identifying data with these services beyond what is technically required to operate.",

  "privacy.section.5.title": "Your rights",
  "privacy.section.5.body":
    "You may request access to the data we hold on you, request a correction or update, or request deletion of your account and associated activation record at any time by contacting our admin team on Telegram. We aim to respond to all such requests within 7 business days.",

  "privacy.section.6.title": "Risk disclaimer",
  "privacy.section.6.body":
    "ChartFlow Ai provides market analysis and trade signals; it does not provide financial advice. Trading binary options and other speculative instruments carries a high level of risk and may not be suitable for all investors. Past performance is not indicative of future results. Always trade responsibly and only with capital you can afford to lose.",

  "privacy.section.7.title": "Changes to this policy",
  "privacy.section.7.body":
    "We may update this Privacy Policy from time to time. Material changes will be communicated through the website and the Telegram channel. Your continued use of ChartFlow Ai after such changes take effect indicates your acceptance of the revised policy.",

  "privacy.contact.title": "Questions about this policy?",
  "privacy.contact.body":
    "Our admin team responds personally — usually within minutes on Telegram.",
  "privacy.contact.cta": "Contact Admin",
  // ChartFlow Ai home (new design)
  "home.nav.reviews": "Reviews",
  "home.nav.faq": "FAQ",
  "home.nav.founder": "Founder",
  "home.hero.trust": "Trusted by serious Quotex traders",
  "home.chart.footer": "1-minute candles",
  "home.hero.headline.pre": "Read the Market ",
  "home.hero.headline.hl": "Two Candles Ahead",
  "home.hero.headline.post": "",
  "home.chart.chip.preview": "2 candles ahead",
  "home.chart.chip.accuracy": "avg accuracy",
  "home.steps.badge": "How it works",
  "home.steps.title.1": "Three steps to",
  "home.steps.title.2": "your edge",
  "home.steps.subtitle": "From choosing a plan to reading the chart ahead — the whole journey takes minutes.",
  "home.steps.1.title": "Create your account",
  "home.steps.1.desc": "Register with your email in seconds — every new account starts on the Free plan.",
  "home.steps.2.title": "Choose your plan",
  "home.steps.2.desc": "Pick Basic, Standard, Premium or Extreme — once your payment is verified, the admin unlocks it on your account.",
  "home.steps.3.title": "Log in & trade",
  "home.steps.3.desc": "Open your profile to use live charts and signals within your plan's daily limits.",
  "home.founder.verified": "Verified Founder",
  "home.founder.connect": "Connect",
  "home.founder.community": "Join 50,000+ traders",
  "home.founder.communityDesc": "Live signals, market reads & strategy drops on Telegram.",
  "home.cta.eyebrow": "Your edge starts here",
  "home.cta.title.1": "Your next trade deserves",
  "home.cta.title.2": "a clearer view",
  "home.cta.subtitle": "Join ChartFlow Ai and read the market two candles ahead — with live charts, premium signals and direct admin support.",
  "home.footer.tagline": "Premium signals and live charts for traders who want to see the move before it happens.",
  "home.footer.explore": "Explore",
  "home.footer.support": "Support",
  "home.footer.disclaimer": "Trading involves risk. ChartFlow Ai provides market analysis and signals, not financial advice. ChartFlow Ai is an independent service and is not affiliated with Quotex.",
  "home.reviews.rating": "Avg Rating",
  "home.reviews.proof": "Member Reviews",
  // /download page
  "download.back": "Back to home",
  "download.badge": "Source code",
  "download.title.1": "Download the full",
  "download.title.2": "website source code",
  "download.subtitle": "Get the complete ChartFlow Ai project — frontend, backend and docs — packed into a single zip file.",
  "download.stat.files": "Files",
  "download.stat.size": "Source size",
  "download.stat.updated": "Last updated",
  "download.button": "Download ZIP",
  "download.preparing": "Preparing zip…",
  "download.downloading": "Downloading…",
  "download.received": "received",
  "download.done": "Download complete",
  "download.again": "Download again",
  "download.error": "Download failed. Please try again.",
  "download.unavailable": "Source files are not available on this server right now.",
  "download.included": "What's inside",
  "download.filesCount": "files",
  "download.safe.title": "Safe to share",
  "download.safe.desc": "Secret keys (.env files), passwords, installed packages (node_modules), build output and git history are automatically left out of the zip.",
  "download.howto.title": "After downloading",
  "download.howto.desc": "Unzip the file, open the frontend folder, run yarn install and then yarn dev to start the website locally.",
  "auth.tab.login": "Login",
  "auth.tab.register": "Registration",
  "auth.login.title": "Welcome back",
  "auth.login.sub": "Log in to open your live charts and premium signals.",
  "auth.register.title": "Create account",
  "auth.register.sub": "Join ChartFlow Ai in seconds and start trading with an edge.",
  "auth.name": "Full name",
  "auth.name.ph": "Your full name",
  "auth.email": "Email",
  "auth.email.ph": "you@example.com",
  "auth.password": "Password",
  "auth.password.ph": "Enter your password",
  "auth.password.new.ph": "Create a strong password",
  "auth.forgot": "Forgot password?",
  "auth.login.submit": "Login",
  "auth.register.submit": "Create Account",
  "auth.or": "or",
  "auth.google": "Continue with Google",
  "auth.switch.toRegister": "Don't have an account?",
  "auth.switch.toLogin": "Already have an account?",
  "auth.reset.title": "Reset password",
  "auth.reset.sub": "Enter your email and we'll send you a link to reset your password.",
  "auth.reset.submit": "Send Reset Link",
  "auth.reset.back": "Back to login",
  "auth.reset.sent.title": "Check your inbox",
  "auth.reset.sent.sub": "If an account exists for this email, a password reset link is on its way. Check your Inbox or Spam folder.",
  "auth.newpw.title": "Set a new password",
  "auth.newpw.sub": "Choose a new password for:",
  "auth.newpw.label": "New password",
  "auth.newpw.submit": "Save Password",
  "auth.newpw.checking": "Checking your link…",
  "auth.newpw.done.title": "Password updated",
  "auth.newpw.done.sub": "You can now log in with your new password.",
  "auth.newpw.bad.title": "This link no longer works",
  "auth.newpw.bad.sub": "The link has expired or was already used. Request a new reset link.",
  "auth.newpw.login": "Go to login",
  "auth.err.fields": "Please fill in every field.",
  "auth.err.emailInUse": "An account with this email already exists. Try logging in.",
  "auth.err.invalidEmail": "That email address doesn't look right.",
  "auth.err.weakPassword": "Password must be at least 6 characters.",
  "auth.err.wrongCredentials": "Incorrect email or password.",
  "auth.err.tooMany": "Too many attempts. Please wait a moment and try again.",
  "auth.err.network": "Network error. Check your connection and try again.",
  "auth.err.popupClosed": "Google sign-in was cancelled. Please try again.",
  "auth.err.accountExists": "This email is already registered with a password. Log in with your password instead.",
  "auth.err.unauthorizedDomain": "Google sign-in isn't enabled for this domain yet. Please contact support.",
  "auth.err.generic": "Something went wrong. Please try again.",
  "account.eyebrow": "Dashboard",
  "account.title": "Hello,",
  "account.sub": "You're signed in to ChartFlow Ai. Your account details are below.",
  "account.name": "Full name",
  "account.email": "Email",
  "account.joined": "Member since",
  "account.logout": "Log out",
  "account.home": "Back to home",
  "account.loading": "Loading your account…",
  "header.account": "Profile",
  "dash.plans.title": "Get a plan",
  "dash.plans.sub": "See pricing and unlock live signals",
  "dash.contact.title": "Contact admin",
  "dash.contact.sub": "Get help on Telegram",
}

const bn: Dict = {
  // Header
  "header.liveChart": "লাইভ চার্ট",
  "header.features": "ফিচার",
  "header.pricing": "প্রাইসিং",
  "header.activate": "লগইন",
  "header.menu": "মেনু",
  "header.menu.contact": "অ্যাডমিনের সাথে যোগাযোগ",
  "header.menu.language": "ভাষা",

  // Language popup
  "lang.popup.eyebrow": "আপনার ভাষা নির্বাচন করুন",
  "lang.popup.title": "আপনার ভাষা বেছে নিন",
  "lang.popup.subtitle":
    "কোন ভাষায় ChartFlow Ai দেখতে চান তা নির্বাচন করুন। যেকোনো সময় মেনু থেকে পরিবর্তন করতে পারবেন।",
  "lang.popup.continue": "চালিয়ে যান",
  "lang.popup.changeLater": "পরবর্তীতে উপরের মেনু থেকে পরিবর্তন করতে পারবেন।",

  // Hero
  "hero.badge": "লাইভ মার্কেট ফিড",
  "hero.title.1": "Quotex ট্রেড করুন",
  "hero.title.2": "দুই ক্যান্ডেল",
  "hero.title.3": "এগিয়ে থেকে",
  "hero.subtitle":
    "রিয়েল-টাইম Quotex চার্ট এবং প্রিমিয়াম সিগনাল — মার্কেট মুভ করার আগেই দেখার সুবিধা পান।",
  "hero.cta.activate": "অ্যাকাউন্ট অ্যাক্টিভেট করুন",
  "hero.cta.activeChartflow": "ChartFlow Ai অ্যাক্টিভ করুন",
  "hero.cta.features": "ফিচার দেখুন",
  "hero.chart.pair": "USD/BRL",
  "hero.chart.otc": "(OTC)",
  "hero.chart.pairName": "ইউএস ডলার / ব্রাজিলিয়ান রিয়াল",
  "hero.chart.live": "লাইভ",

  // Feature section
  "why.title.1": "রিয়েল সিগনাল,",
  "why.title.2": "রিয়েল রেজাল্ট",
  "why.subtitle": "লাইভ সিগনাল, ফিউচার সিগনাল, টেলিগ্রাম অ্যালার্ট আর ভিআইপি কেয়ার — সবকিছুই রিয়েল মার্কেট ডেটার উপর তৈরি।",
  "why.1.tag": "লাইভ সিগনাল",
  "why.1.title": "লাইভ Quotex চার্টে লাইভ সিগনাল",
  "why.1.desc": "সরাসরি লাইভ Quotex চার্টে সিগনাল নিন। প্রতিটি সিগনালের এন্ট্রি, ডিরেকশন আর ফাইনাল রেজাল্ট রিয়েল টাইমে দেখুন।",
  "why.2.tag": "ফিউচার সিগনাল",
  "why.2.title": "ফিউচার সিগনাল জেনারেটর",
  "why.2.desc": "সঠিক মার্কেট ডেটা থেকে আগাম সিগনাল তৈরি করুন — প্রতিটির সাথে পরিষ্কার সিগনাল আর রেজাল্ট।",
  "why.3.tag": "অটো টেলিগ্রাম",
  "why.3.title": "অটোমেটিক টেলিগ্রাম সিগনাল",
  "why.3.desc": "আমাদের টেলিগ্রাম বট ও চ্যানেলে সিগনাল অটোমেটিক চলে যায় — সুন্দর সিগনাল ইমেজ আর রেজাল্ট সহ।",
  "why.4.tag": "সবসময় চালু",
  "why.4.title": "২৪/৭ মার্কেট · সব Quotex পেয়ার",
  "why.4.desc": "দিন-রাত সবসময় চালু — OTC সহ Quotex-এর সব পেয়ারে কভারেজ।",
  "why.5.tag": "ভিআইপি কেয়ার",
  "why.5.title": "ভিআইপি কেয়ার",
  "why.5.desc": "অ্যাক্টিভেশন, সিগনাল প্রশ্ন আর স্ট্র্যাটেজি সাহায্যের জন্য সিনিয়র অ্যাডমিনদের সাথে সরাসরি যোগাযোগ — মিনিটেই উত্তর।",
  "why.6.tag": "রিয়েল স্ট্র্যাটেজি",
  "why.6.title": "রিয়েল ডেটা। রিয়েল স্ট্র্যাটেজি। হাই অ্যাকুরেসি।",
  "why.6.desc": "প্রতিটি সিগনাল রিয়েল মার্কেট ডেটা আর পরীক্ষিত রিয়েল স্ট্র্যাটেজির উপর ভিত্তি করে — তাই অ্যাকুরেসি থাকে হাই।",
  "why.6.meter": "সিগনাল অ্যাকুরেসি",
  "why.result.win": "উইন",
  "why.5.admin": "সিনিয়র অ্যাডমিন",
  "why.5.status": "অনলাইন · মিনিটেই উত্তর",
  "why.4.all": "+ সব OTC",
  "feature.tagline": "নির্ভুলতার শক্তিতে",
  "feature.badge": "কেন ChartFlow Ai",
  "feature.title.1": "প্রিমিয়াম এজ,",
  "feature.title.2": "ট্রেডারদের জন্য তৈরি",
  "feature.subtitle":
    "ডেটা ফিড থেকে সাপোর্ট ডেস্ক পর্যন্ত প্রতিটি স্তর — আপনাকে ক্যান্ডেলের আগে রাখতে ইঞ্জিনিয়ার করা।",

  "feature.1.eyebrow": "সিগনেচার এজ",
  "feature.1.title": "২ ক্যান্ডেল এগিয়ে দেখুন",
  "feature.1.desc":
    "চার্টে প্রিন্ট হওয়ার দুই ক্যান্ডেল আগেই প্রাইস অ্যাকশন পূর্বাভাস দেখুন। আত্মবিশ্বাসের সাথে এন্ট্রি প্ল্যান করুন — শর্ট-টাইমফ্রেম ট্রেডিংয়ের সবচেয়ে বড় এজ।",
  "feature.1.metric.value": "+২",
  "feature.1.metric.label": "ক্যান্ডেল প্রিভিউ উইন্ডো",
  "feature.1.footer": "Standard, Premium এবং Extreme-এ উপলব্ধ",

  "feature.2.eyebrow": "যাচাইকৃত",
  "feature.2.title": "৯৪% গড় নির্ভুলতা",
  "feature.2.desc":
    "হাজার হাজার লাইভ সিগনালে স্বাধীনভাবে ট্র্যাক করা — কোনো রিপ্লে নেই, কোনো বাছাই করা ফলাফল নেই, শুধুই রিয়েল-টাইম নির্ভুলতা।",
  "feature.2.metric.value": "৯৪%",
  "feature.2.metric.label": "গড় উইন রেট",

  "feature.3.eyebrow": "সবসময় সক্রিয়",
  "feature.3.title": "২৪/৭ মার্কেট কভারেজ",
  "feature.3.desc":
    "প্রতিটি Quotex OTC এবং স্ট্যান্ডার্ড পেয়ার ক্রমাগত ট্র্যাক করা — সপ্তাহান্ত, ছুটির দিন এবং রাতের সেশন সহ।",
  "feature.3.metric.value": "সব",
  "feature.3.metric.label": "Quotex পেয়ার",

  "feature.4.eyebrow": "ভিআইপি কেয়ার",
  "feature.4.title": "সরাসরি অ্যাডমিন চ্যানেল",
  "feature.4.desc":
    "অ্যাক্টিভেশন সাহায্য, সিগনাল প্রশ্ন এবং স্ট্র্যাটেজি গাইডেন্সের জন্য সিনিয়র অ্যাডমিনদের সাথে টেলিগ্রাম-সরাসরি লাইন — মিনিটে উত্তর, ঘণ্টা নয়।",

  // Testimonials
  "testimonials.badge": "ট্রেডার স্টোরি",
  "testimonials.title.1": "প্রকৃত ফলাফল,",
  "testimonials.title.2": "প্রকৃত ট্রেডারদের কাছ থেকে",
  "testimonials.subtitle":
    "যাচাইকৃত সদস্যরা শেয়ার করছেন কী পরিবর্তন হয়েছে যখন তারা টু-ক্যান্ডেল-এহেড ওয়ার্কফ্লোতে স্যুইচ করেছেন।",
  "testimonials.prev": "পূর্ববর্তী টেস্টিমোনিয়াল",
  "testimonials.next": "পরবর্তী টেস্টিমোনিয়াল",
  "testimonials.slide": "স্লাইডে যান",

  "tm.1.name": "রহিম হোসেন",
  "tm.1.quote":
    "টু-ক্যান্ডেল প্রিভিউই এটাকে অন্য সবকিছু থেকে আলাদা করে। অবশেষে অনুমান না করে আত্মবিশ্বাসের সাথে ট্রেডে প্রবেশ করছি। প্রথম মাসেই $2,450 উইথড্র করেছি।",
  "tm.1.result": "প্রথম মাসে +$২,৪০০",

  "tm.2.name": "করিম আহমেদ",
  "tm.2.quote":
    "প্রথমে সন্দেহ ছিল, কিন্তু উইন রেট সত্যি। আমার নির্বাচিত ৩০টি মার্কেটে অটো-সিগনাল ঠিক তখনই ফায়ার হয় যখন একটি ক্লিন সেটআপ গঠন হয়। ট্রেডিংয়ের জন্য আমার সেরা বিনিয়োগ।",
  "tm.2.result": "টানা ৭টি জয়ী ট্রেড",

  "tm.3.name": "আয়েশা সিদ্দিকা",
  "tm.3.quote":
    "কাস্টমার সাপোর্ট অসাধারণ। অ্যাডমিন সেটআপের সময় সবকিছু দেখিয়ে দিয়েছেন। ১-মিনিট সিগনাল আমার সময়সূচির সাথে পুরোপুরি মিলে — দুপুরের বিরতিতে ট্রেড করি।",
  "tm.3.result": "৮২% উইন রেট ধরে রাখা",

  "tm.4.name": "শাকিব মাহমুদ",
  "tm.4.quote":
    "Extreme প্ল্যান প্রতিটি ডলারের যোগ্য। প্রতিদিন ১৫০টি সিগনাল, লাইফটাইম অ্যাক্সেস, এবং স্ট্র্যাটেজি টিম আন্তরিকভাবে আপনার ফলাফলের যত্ন নেয়। প্রত্যেক ট্রেডারকে এটি সুপারিশ করেছি।",
  "tm.4.result": "৩ মাসে অ্যাকাউন্ট ৪ গুণ",

  "tm.5.name": "তানভীর রহমান",
  "tm.5.quote":
    "১-মিনিটের সিগনাল অসাধারণ। উচ্চ নির্ভুলতার সাথে এক সেশনে ২০+ ট্রেড করতে পারি। Quotex পেআউট প্লাস এই সিগনাল ফিড একটি প্রকৃত এজ।",
  "tm.5.result": "দুই সপ্তাহে +$১,৮০০",

  "tm.6.name": "ইমরান হোসেন",
  "tm.6.quote":
    "অন্য পাঁচটি সিগনাল প্রোভাইডার ব্যবহার করেছি। কেউই এখানকার নির্ভুলতা ও ধারাবাহিকতার কাছাকাছিও নেই। শুধু OTC সাপ্তাহিক কভারেজই প্ল্যানের খরচ বহুবার পুষিয়ে দিয়েছে।",
  "tm.6.result": "টানা ১১ সপ্তাহ লাভজনক",

  "tm.country.dhaka": "ঢাকা, বাংলাদেশ",
  "tm.country.chittagong": "চট্টগ্রাম, বাংলাদেশ",
  "tm.country.khulna": "খুলনা, বাংলাদেশ",
  "tm.country.rajshahi": "রাজশাহী, বাংলাদেশ",
  "tm.country.sylhet": "সিলেট, বাংলাদেশ",
  "tm.country.barisal": "বরিশাল, বাংলাদেশ",

  // Pricing — section header
  "pricing.badge": "প্রাইসিং",
  "pricing.title.1": "প্রতিটি ট্রেডারের জন্য",
  "pricing.title.2": "তৈরি প্ল্যান",
  "pricing.subtitle":
    "Quotex ডিপোজিটের মাধ্যমে ফ্রি স্টার্টার থেকে লাইফটাইম ফ্ল্যাগশিপ অ্যাক্সেস পর্যন্ত — আপনার এজের সাথে মানানসই প্ল্যান বেছে নিন।",
  "pricing.popular": "সবচেয়ে জনপ্রিয়",
  "pricing.viewDetails": "সম্পূর্ণ বিস্তারিত দেখুন",
  "pricing.dialog.plan": "প্ল্যান",
  "pricing.dialog.titlePrefix": "আপনি যা পাবেন",
  "pricing.dialog.subtitle":
    "নিচে অন্তর্ভুক্ত প্রতিটি সুবিধার সম্পূর্ণ বিবরণ দেওয়া হলো।",
  "pricing.dialog.close": "বন্ধ করুন",
  "pricing.notIncluded": "অন্তর্ভুক্ত নয়",
  "pricing.cta.basic": "Quotex অ্যাকাউন্ট তৈরি করুন",
  "pricing.cta.purchase": "এখনই কিনুন",
  "pricing.suffix.deposit": "ন্যূনতম ডিপোজিট",
  "pricing.suffix.purchase": "ক্রয় মূল্য",
  "pricing.meta.limited": "সীমিত",
  "pricing.meta.daily": "দৈনিক",
  "pricing.meta.unlocked": "আনলক",
  "pricing.meta.basicLimit": "দৈনিক ১৫ মিনিট",
  "pricing.meta.smartLimit": "দৈনিক ৫০ মিনিট",
  "pricing.meta.proLimit": "দৈনিক ২ ঘণ্টা",
  "pricing.meta.domLimit": "দৈনিক ৪ ঘণ্টা",

  // Pricing — "2 candles ahead view" usage tags per tier
  "tier.basic.tag.candles": "দৈনিক ১৫ মিনিট",
  "tier.smart.tag.candles": "দৈনিক ৫০ মিনিট",
  "tier.pro.tag.candles": "দৈনিক ১২০ মিনিট",
  "tier.dom.tag.candles": "দৈনিক ৪ ঘণ্টা",

  // Pricing — Basic
  "tier.basic.name": "Basic",
  "tier.basic.desc":
    "আমাদের Quotex লিংকে অ্যাকাউন্ট তৈরি করুন এবং শুরু করতে ডিপোজিট দিন।",
  "tier.basic.f1.label": "১০টি Quotex OTC মার্কেট",
  "tier.basic.f1.sub": "বাছাই করা লাইভ পেয়ার",
  "tier.basic.f2.label": "১০টি লাইভ সিগনাল · ১-মিনিট",
  "tier.basic.f2.sub": "রিয়েল-টাইম চার্ট অ্যানালাইসিস",
  "tier.basic.f3.label": "১০টি লাইভ সিগনাল · ১৫-সেকেন্ড",
  "tier.basic.f3.sub": "দ্রুত স্ক্যাল্প এন্ট্রি",
  "tier.basic.f4.label": "অটো-সিগনালের জন্য ১০টি মার্কেট বাছাই",
  "tier.basic.f4.sub": "স্বাধীনভাবে বাছাই · শক্তিশালী সেটআপে অটো-ফায়ার",
  "tier.basic.f5.label": "Basic ট্রেডিং স্ট্র্যাটেজি",
  "tier.basic.f5.sub": "OTC মার্কেট সিগনাল",
  "tier.basic.f6.label": "২ ক্যান্ডেল এগিয়ে দেখুন",
  "tier.basic.f6.sub": "পূর্বাভাস প্রিভিউ",
  "tier.basic.d1.title": "১০টি Quotex OTC মার্কেট",
  "tier.basic.d1.body":
    "হাতে বাছাই করা, উচ্চ-তারল্যের OTC পেয়ার লাইভ স্ট্রিম করা — সর্বদা সেখানে ট্রেড করুন যেখানে মোমেন্টাম সবচেয়ে শক্তিশালী। স্লট রোটেশন তালিকা সতেজ রাখে।",
  "tier.basic.d2.title": "১-মিনিট টাইমফ্রেমে ১০টি লাইভ সিগনাল",
  "tier.basic.d2.body":
    "Quotex চার্টের রিয়েল-টাইম অ্যানালাইসিস থেকে দৈনিক ইস্যু করা। প্রতিটি সিগনালে অ্যাসেট, ডিরেকশন এবং এন্ট্রি অন্তর্ভুক্ত — স্থির ১-মিনিট মেয়াদের জন্য তৈরি।",
  "tier.basic.d3.title": "১৫-সেকেন্ড টাইমফ্রেমে ১০টি দ্রুত-অ্যাকশন সিগনাল",
  "tier.basic.d3.body":
    "একই লাইভ অ্যানালাইসিস, স্ক্যাল্প-গ্রেড এক্সিকিউশন। ১৫-সেকেন্ড টাইমফ্রেমের জন্য ক্যালিব্রেট করা দশটি দৈনিক এন্ট্রি, দ্রুত উচ্চ-ফ্রিকোয়েন্সি সেটআপের জন্য আদর্শ।",
  "tier.basic.d4.title": "অটোমেটিক সিগনালের জন্য ১০টি মার্কেট বাছাই",
  "tier.basic.d4.body":
    "যেকোনো ১০টি মার্কেট বেছে নিন যা ট্র্যাক করতে চান। সিস্টেম ২৪/৭ এগুলো পর্যবেক্ষণ করে এবং একটি শক্তিশালী, বৈধ স্ট্র্যাটেজি মিললেই সিগনাল অটো-ফায়ার করে।",
  "tier.basic.d5.title": "Basic ট্রেডিং স্ট্র্যাটেজি",
  "tier.basic.d5.body":
    "একটি পরিচ্ছন্ন বেসলাইন স্ট্র্যাটেজি যা OTC মার্কেটে চলে — এন্ট্রি, ডিরেকশন এবং টাইমিং, আপনার থেকে কোনো অতিরিক্ত সেটআপ ছাড়াই।",
  "tier.basic.d6.title": "২ ক্যান্ডেল এগিয়ে দেখুন · দৈনিক ১৫ মিনিট",
  "tier.basic.d6.body":
    "পেইড প্ল্যানের জন্য সংরক্ষিত। প্রিন্ট হওয়ার দুই ক্যান্ডেল আগে প্রাইস কোথায় যাচ্ছে তা দেখানো ফোরকাস্ট ভিউ আনলক করতে Standard, Premium বা Extreme-এ আপগ্রেড করুন।",

  // Pricing — Standard
  "tier.smart.name": "Standard",
  "tier.smart.desc":
    "সিগনাল নির্ভুলতা স্কেল করতে প্রস্তুত গুরুতর ট্রেডারদের জন্য স্টেপ-আপ প্ল্যান।",
  "tier.smart.f1.label": "৫০টি Quotex মার্কেট",
  "tier.smart.f1.sub": "সম্পূর্ণ পেয়ার কভারেজ",
  "tier.smart.f2.label": "২৫টি লাইভ সিগনাল · ১-মিনিট",
  "tier.smart.f2.sub": "মার্কেট বাছাই · লাইভ চার্ট এন্ট্রি",
  "tier.smart.f3.label": "২৫টি লাইভ সিগনাল · ১৫-সেকেন্ড",
  "tier.smart.f3.sub": "মার্কেট বাছাই · স্ক্যাল্প এন্ট্রি",
  "tier.smart.f4.label": "অটো-সিগনালের জন্য ২০টি মার্কেট বাছাই",
  "tier.smart.f4.sub": "শক্তিশালী সেটআপে অটো-ফায়ার",
  "tier.smart.f5.label": "২ ক্যান্ডেল এগিয়ে দেখুন",
  "tier.smart.f5.sub": "পূর্বাভাস প্রিভিউ",
  "tier.smart.f6.label": "শক্তিশালী ট্রেডিং স্ট্র্যাটেজি",
  "tier.smart.f6.sub": "প্রিমিয়াম উচ্চ-নির্ভুলতা ইঞ্জিন",
  "tier.smart.d1.title": "৫০টি Quotex মার্কেট",
  "tier.smart.d1.body":
    "৫০টি Quotex মার্কেটে সম্পূর্ণ অ্যাক্সেস — OTC। কোনো বাছাই করা শর্টলিস্ট আপনার পছন্দকে সীমিত না করে যেখানে অ্যাকশন সেখানেই ট্রেড করুন।",
  "tier.smart.d2.title": "১-মিনিট টাইমফ্রেমে ২৫টি লাইভ সিগনাল",
  "tier.smart.d2.body":
    "দৈনিক ইস্যু করা। লাইভ চার্ট সেশনে যেকোনো মার্কেট বেছে নিন এবং চাহিদামতো ১-মিনিট সিগনাল নিন — এন্ট্রি, ডিরেকশন এবং টাইমিং সবই রিয়েল টাইমে।",
  "tier.smart.d3.title": "১৫-সেকেন্ড টাইমফ্রেমে ২৫টি লাইভ সিগনাল",
  "tier.smart.d3.body":
    "স্ক্যাল্পারদের জন্য একই নমনীয়তা। চার্ট লাইভ থাকাকালীন যেকোনো মার্কেট বাছাই করুন এবং ১৫-সেকেন্ড সিগনাল নিন — দ্রুত উচ্চ-ফ্রিকোয়েন্সি এক্সিকিউশনের জন্য তৈরি।",
  "tier.smart.d4.title": "অটোমেটিক সিগনালের জন্য ২০টি মার্কেট বাছাই",
  "tier.smart.d4.body":
    "মনিটর করতে চান এমন যেকোনো ২০টি মার্কেট বেছে নিন। সিস্টেম ২৪/৭ এগুলো ট্র্যাক করে এবং একটি শক্তিশালী, বৈধ সেটআপ মিললেই সিগনাল অটো-ফায়ার করে।",
  "tier.smart.d5.title": "২ ক্যান্ডেল এগিয়ে দেখুন · দৈনিক ৫০ মিনিট",
  "tier.smart.d5.body":
    "Quotex-এ প্রিন্ট হওয়ার দুই ক্যান্ডেল আগে প্রজেক্টেড প্রাইস অ্যাকশন দেখুন। আত্মবিশ্বাসের সাথে এন্ট্রি প্ল্যান করুন এবং দেরিতে চেজ ট্রেডে আটকা পড়া এড়িয়ে চলুন।",
  "tier.smart.d6.title": "শক্তিশালী ট্রেডিং স্ট্র্যাটেজি",
  "tier.smart.d6.body":
    "কঠোর ফিল্টার, টাইট এন্ট্রি এবং নয়েজ মুছে ফেলা প্রিমিয়াম উচ্চ-নির্ভুলতার স্ট্র্যাটেজি। ভলিউমের চেয়ে ধারাবাহিকতা প্রয়োজন এমন ট্রেডারদের জন্য ইঞ্জিনিয়ারড।",

  // Pricing — Premium
  "tier.pro.name": "Premium",
  "tier.pro.desc":
    "ধারালো নির্ভুলতা এবং সমৃদ্ধ কভারেজের সাথে গুরুতর দৈনিক ভলিউমে স্কেল করতে প্রস্তুত ট্রেডারদের জন্য Premium-গ্রেড অ্যাক্সেস।",
  "tier.pro.f1.label": "৫০টি Quotex মার্কেট",
  "tier.pro.f1.sub": "সম্পূর্ণ পেয়ার কভারেজ · OTC",
  "tier.pro.f2.label": "প্রতিদিন ৫০টি লাইভ সিগনাল",
  "tier.pro.f2.sub": "১-মিনিট · মার্কেট বাছাই",
  "tier.pro.f3.label": "অটো-সিগনালের জন্য ৩০টি মার্কেট বাছাই",
  "tier.pro.f3.sub": "২৪/৭ মনিটরিং · শক্তিশালী সেটআপে অটো-ফায়ার",
  "tier.pro.f4.label": "২ ক্যান্ডেল এগিয়ে দেখুন",
  "tier.pro.f4.sub": "প্রিন্ট হওয়ার আগে পূর্বাভাস প্রিভিউ",
  "tier.pro.f5.label": "Premium-গ্রেড ট্রেডিং স্ট্র্যাটেজি",
  "tier.pro.f5.sub": "পরিমার্জিত উচ্চ-নির্ভুলতা ইঞ্জিন",
  "tier.pro.f6.label": "উচ্চতর নির্ভুলতা ফিল্টারিং",
  "tier.pro.f6.sub": "কঠোর প্রত্যাখ্যান · পরিচ্ছন্ন এন্ট্রি",
  "tier.pro.f7.label": "ট্রেন্ড ও রিভার্সাল সনাক্তকরণ",
  "tier.pro.f7.sub": "মাল্টি-লেয়ার মার্কেট রিডিং",
  "tier.pro.f8.label": "ভিআইপি সাপোর্ট চ্যানেল",
  "tier.pro.f8.sub": "সিনিয়র অ্যাডমিনদের সরাসরি লাইন",
  "tier.pro.f9.label": "Standard-এর সমস্ত কিছু অন্তর্ভুক্ত",
  "tier.pro.f9.sub": "নিম্ন স্তরের সমস্ত সুবিধা বহন করা হয়েছে",
  "tier.pro.d1.title": "৫০টি Quotex মার্কেট",
  "tier.pro.d1.body":
    "৫০টি Quotex মার্কেটে সম্পূর্ণ অ্যাক্সেস — OTC, মেজর, মাইনর এবং ক্রিপ্টো পেয়ার। কোনো বাছাই করা শর্টলিস্ট সীমাবদ্ধ না করে এবং অতিরিক্ত পেওয়ালের পেছনে কোনো পেয়ার লক না করে যেখানে অ্যাকশন সেখানে ট্রেড করুন।",
  "tier.pro.d2.title": "প্রতিদিন ৫০টি লাইভ সিগনাল",
  "tier.pro.d2.body":
    "১-মিনিট টাইমফ্রেমে প্রতিদিন ৫০টি লাইভ সিগনাল ইস্যু করা। লাইভ চার্ট সেশনে যেকোনো মার্কেট বাছাই করুন এবং চাহিদামতো সিগনাল নিন — আপনার নির্বাচিত মার্কেট পরিচ্ছন্ন সেটআপ দিলেই এন্ট্রি, ডিরেকশন এবং টাইমিং রিয়েল টাইমে দেওয়া হয়।",
  "tier.pro.d3.title": "অটোমেটিক সিগনালের জন্য ৩০টি মার্কেট বাছাই",
  "tier.pro.d3.body":
    "মনিটর করতে চান এমন যেকোনো ৩০টি মার্কেট বেছে নিন। সিস্টেম প্রত্যেকটিকে ২৪/৭ ট্র্যাক করে এবং একটি শক্তিশালী, বৈধ সেটআপ মিললেই সিগনাল অটো-ফায়ার করে — যাতে চার্ট থেকে দূরে থাকার সময়েও কোনো উচ্চ-প্রত্যয়ের মুভ মিস না হয়।",
  "tier.pro.d4.title": "২ ক্যান্ডেল এগিয়ে দেখুন · দৈনিক ২ ঘণ্টা",
  "tier.pro.d4.body":
    "Quotex-এ প্রিন্ট হওয়ার দুই ক্যান্ডেল আগে প্রজেক্টেড প্রাইস অ্যাকশন দেখুন। আত্মবিশ্বাসের সাথে এন্ট্রি প্ল্যান করুন, ভালো রিস্ক-টু-রিওয়ার্ড সারিবদ্ধ করুন এবং দেরিতে চেজ ট্রেড বা ফেকআউট রিভার্সালে আটকা পড়া এড়িয়ে চলুন।",
  "tier.pro.d5.title": "Premium-গ্রেড ট্রেডিং স্ট্র্যাটেজি",
  "tier.pro.d5.body":
    "ধারালো নির্ভুলতা এবং কঠোর প্রত্যাখ্যান লজিকের সাথে Premium-গ্রেড এন্ট্রি ফিল্টারিং। কম নয়েজ ট্রেড, পরিচ্ছন্ন সেটআপ, ভালো রিস্ক-টু-রিওয়ার্ড। মোমেন্টাম, ট্রেন্ড স্ট্রেংথ এবং প্রাইস-অ্যাকশন কনফার্মেশন একত্রিত করে এমন একটি মাল্টি-লেয়ার ইঞ্জিনের উপর নির্মিত।",
  "tier.pro.d6.title": "উচ্চতর নির্ভুলতা ফিল্টারিং",
  "tier.pro.d6.body":
    "প্রতিটি সিগনাল Standard স্তরের চেয়ে কঠোর বৈধতা পাস অতিক্রম করে — দুর্বল সেটআপগুলি আপনার কাছে পৌঁছানোর আগেই ফিল্টার করা হয়, তাই আপনি যে সিগনালগুলি পান তা গড়ে উচ্চতর প্রত্যয় হার বহন করে।",
  "tier.pro.d7.title": "ট্রেন্ড ও রিভার্সাল সনাক্তকরণ",
  "tier.pro.d7.body":
    "স্ট্র্যাটেজি ট্রেন্ড কন্টিনুয়েশন এবং এক্সহশন জোন উভয়ই পড়ে, তাই মার্কেট মোমেন্টামে চলুক বা মূল লেভেলে ফ্লিপ করুক — পরিচ্ছন্ন সিগনাল পান। আর ডিরেকশন অনুমান নয়।",
  "tier.pro.d8.title": "ভিআইপি সাপোর্ট চ্যানেল",
  "tier.pro.d8.body":
    "অ্যাডমিন টিমে সরাসরি প্রাইভেট ভিআইপি লাইন। মার্কেট খোলা থাকাকালীন দ্রুত সাহায্য, নিবেদিত গাইডেন্স এবং লাইভ ট্রেড-সম্পর্কিত সাপোর্ট — সিগনাল ব্যাখ্যা এবং Quotex অ্যাকাউন্ট প্রশ্ন পরিচালনায় সাহায্য সহ।",
  "tier.pro.d9.title": "Standard-এর সমস্ত কিছু অন্তর্ভুক্ত",
  "tier.pro.d9.body":
    "প্রতিটি Standard-স্তরের সুবিধা বহন করা হয়েছে যাতে আপগ্রেড করে কোনো ফিচার না হারান — সম্পূর্ণ মার্কেট অ্যাক্সেস, লাইভ-চার্ট সিগনাল ফ্লো, অটো-সিগনাল মার্কেট সিলেক্টর এবং ২-ক্যান্ডেল ফোরকাস্ট সবই আপনার প্ল্যানের অংশ থাকে।",

  // Pricing — Extreme
  "tier.dom.name": "Extreme",
  "tier.dom.desc":
    "ফ্ল্যাগশিপ প্যাকেজ — সর্বোচ্চ সিগনাল ভলিউম, সর্বোচ্চ অগ্রাধিকার, কঠোরতম নির্ভুলতা এবং প্ল্যাটফর্মের লাইফটাইম মালিকানা।",
  "tier.dom.f1.label": "৫০টি Quotex মার্কেট",
  "tier.dom.f1.sub": "সম্পূর্ণ পেয়ার কভারেজ · OTC",
  "tier.dom.f2.label": "প্রতিদিন ১৫০টি লাইভ সিগনাল",
  "tier.dom.f2.sub": "১-মিনিট · মার্কেট বাছাই",
  "tier.dom.f3.label": "অটো-সিগনালের জন্য ৫০টি মার্কেট বাছাই",
  "tier.dom.f3.sub": "২৪/৭ মনিটরিং · শক্তিশালী সেটআপে অটো-ফায়ার",
  "tier.dom.f4.label": "২ ক্যান্ডেল এগিয়ে দেখুন",
  "tier.dom.f4.sub": "প্রিন্ট হওয়ার আগে পূর্বাভাস প্রিভিউ",
  "tier.dom.f5.label": "ফ্ল্যাগশিপ ট্রেডিং স্ট্র্যাটেজি",
  "tier.dom.f5.sub": "কঠোরতম ফিল্টার · সর্বোচ্চ নির্ভুলতা",
  "tier.dom.f6.label": "সর্বোচ্চ সিগনাল অগ্রাধিকার",
  "tier.dom.f6.sub": "প্রতিটি রিলিজে কিউয়ের শীর্ষে",
  "tier.dom.f7.label": "ব্যক্তিগত ট্রেডিং রোডম্যাপ",
  "tier.dom.f7.sub": "আপনার শৈলী ও রিস্ক প্রোফাইল অনুসারে",
  "tier.dom.f8.label": "লাইফটাইম চার্ট ও ফোরকাস্ট অ্যাক্সেস",
  "tier.dom.f8.sub": "কোনো মেয়াদ নেই · কোনো সাবস্ক্রিপশন নেই",
  "tier.dom.f9.label": "নতুন ফিচারে আগাম অ্যাক্সেস",
  "tier.dom.f9.sub": "অন্য সবার আগে বিটা রিলিজ",
  "tier.dom.f10.label": "নিবেদিত ভিআইপি অ্যাডমিন",
  "tier.dom.f10.sub": "সরাসরি লাইন · ট্রেড ও অ্যাকাউন্ট সাপোর্ট",
  "tier.dom.f11.label": "Premium-এর সমস্ত কিছু অন্তর্ভুক্ত",
  "tier.dom.f11.sub": "নিম্ন স্তরের সমস্ত সুবিধা বহন করা হয়েছে",
  "tier.dom.d1.title": "৫০টি Quotex মার্কেট",
  "tier.dom.d1.body":
    "৫০টি Quotex মার্কেটে সম্পূর্ণ অ্যাক্সেস — OTC, মেজর, মাইনর এবং ক্রিপ্টো পেয়ার। কোনো বাছাই করা শর্টলিস্ট ছাড়াই এবং অতিরিক্ত পেওয়ালের পেছনে কোনো পেয়ার লক না করে যেখানে অ্যাকশন সেখানে ট্রেড করুন।",
  "tier.dom.d2.title": "প্রতিদিন ১৫০টি লাইভ সিগনাল",
  "tier.dom.d2.body":
    "১-মিনিট টাইমফ্রেমে প্রতিদিন ১৫০টি লাইভ সিগনাল ইস্যু করা — Premium-এর দৈনিক ভলিউমের তিনগুণ। লাইভ চার্ট সেশনে যেকোনো মার্কেট বাছাই করুন এবং চাহিদামতো সিগনাল নিন, এন্ট্রি, ডিরেকশন এবং টাইমিং আপনার নির্বাচিত মার্কেট পরিচ্ছন্ন সেটআপ দিলেই রিয়েল টাইমে।",
  "tier.dom.d3.title": "অটোমেটিক সিগনালের জন্য ৫০টি মার্কেট বাছাই",
  "tier.dom.d3.body":
    "মনিটর করতে চান এমন যেকোনো ৫০টি মার্কেট বেছে নিন — প্ল্যাটফর্মে উপলব্ধ সর্বোচ্চ অটো-সিগনাল ক্ষমতা। সিস্টেম প্রত্যেকটিকে ২৪/৭ ট্র্যাক করে এবং একটি শক্তিশালী সেটআপ মিললেই সিগনাল অটো-ফায়ার করে, তাই আপনি যে সেশনেই ট্রেড করুন কোনো উচ্চ-প্রত্যয়ের মুভ মিস হবে না।",
  "tier.dom.d4.title": "২ ক্যান্ডেল এগিয়ে দেখুন · দৈনিক ৪ ঘণ্টা",
  "tier.dom.d4.body":
    "Quotex-এ প্রিন্ট হওয়ার দুই ক্যান্ডেল আগে প্রজেক্টেড প্রাইস অ্যাকশন দেখুন। আত্মবিশ্বাসের সাথে এন্ট্রি প্ল্যান করুন, উচ্চতর রিস্ক-টু-রিওয়ার্ড সারিবদ্ধ করুন এবং দেরিতে চেজ ট্রেড বা ফেকআউট রিভার্সালে আটকা পড়া এড়িয়ে চলুন।",
  "tier.dom.d5.title": "ফ্ল্যাগশিপ ট্রেডিং স্ট্র্যাটেজি",
  "tier.dom.d5.body":
    "প্ল্যাটফর্মে উপলব্ধ কঠোরতম ফিল্টার এবং পরিচ্ছন্নতম এন্ট্রি। Extreme ইঞ্জিন মোমেন্টাম, ট্রেন্ড স্ট্রেংথ, ভোলাটিলিটি রেজিম এবং মাল্টি-টাইমফ্রেম প্রাইস-অ্যাকশন কনফার্মেশন একত্রিত করে যেকোনো সিগনাল রিলিজের আগে — সম্পূর্ণ ট্রেডিং দিনে সর্বাধিক এজ এবং ধারাবাহিকতার জন্য ইঞ্জিনিয়ারড।",
  "tier.dom.d6.title": "সর্বোচ্চ সিগনাল অগ্রাধিকার",
  "tier.dom.d6.body":
    "আপনি সিগনাল কিউয়ের শীর্ষে বসেন। নতুন উচ্চ-প্রত্যয়ের সেটআপ অন্য কোনো স্তর দেখার আগে আপনার ফিডে আসে — দ্রুত-গতিশীল ১-মিনিট ট্রেডে প্রকৃত টাইমিং সুবিধা যেখানে সেকেন্ডের গুরুত্ব আছে।",
  "tier.dom.d7.title": "ব্যক্তিগত ট্রেডিং রোডম্যাপ",
  "tier.dom.d7.body":
    "একটি ব্যক্তিগতকৃত রোডম্যাপ পান — কোন মার্কেটে ফোকাস করবেন, কোন টাইমফ্রেম আপনার শৈলীর সাথে মানানসই, প্রস্তাবিত পজিশন সাইজিং এবং দায়িত্বশীলভাবে আপনার অ্যাকাউন্ট স্কেল করার একটি ধাপে ধাপে প্ল্যান।",
  "tier.dom.d8.title": "লাইফটাইম চার্ট ও ফোরকাস্ট অ্যাক্সেস",
  "tier.dom.d8.body":
    "লাইভ USD/BRL চার্ট এবং ২-ক্যান্ডেল ফোরকাস্ট ভিউতে স্থায়ী অ্যাক্সেস। কোনো সাবস্ক্রিপশন নেই, মাসিক ফি নেই, মেয়াদ নেই — একবার যোগ দিলে চিরকাল থাকেন। ভবিষ্যতের প্ল্যাটফর্ম আপগ্রেড স্বয়ংক্রিয়ভাবে অন্তর্ভুক্ত।",
  "tier.dom.d9.title": "নতুন ফিচারে আগাম অ্যাক্সেস",
  "tier.dom.d9.body":
    "নতুন স্ট্র্যাটেজি, নতুন মার্কেট এবং নতুন টুল বিটাতে প্রবেশ করার মুহূর্তেই প্রথম ব্যবহার করুন — নিম্ন স্তর বা পাবলিকে রোলআউটের আগে।",
  "tier.dom.d10.title": "নিবেদিত ভিআইপি অ্যাডমিন",
  "tier.dom.d10.body":
    "আপনার অ্যাকাউন্টে সিগনাল, অ্যাকাউন্ট প্রশ্ন, পেআউট এবং এর মধ্যে সবকিছুতে সরাসরি সাহায্যের জন্য একজন নিবেদিত সিনিয়র অ্যাডমিন বরাদ্দ। প্ল্যাটফর্মের দ্রুততম সাপোর্ট চ্যানেল।",
  "tier.dom.d11.title": "Premium-এর সমস্ত কিছু অন্তর্ভুক্ত",
  "tier.dom.d11.body":
    "প্রতিটি Premium-স্তরের সুবিধা বহন করা হয়েছে যাতে আপগ্রেড করে কোনো ফিচার না হারান — সম্পূর্ণ Quotex মার্কেট অ্যাক্সেস, লাইভ-চার্ট সিগনাল ফ্লো, অটো-সিগনাল মার্কেট সিলেক্টর, ২-ক্যান্ডেল ফোরকাস্ট এবং Standard-স্তরের সমস্ত সুবিধা আপনার প্ল্যানের অংশ থাকে।",

  // Founder
  "founder.badge": "প্রতিষ্ঠাতার পরিচয়",
  "founder.title.1": "প্রতিষ্ঠাতা",
  "founder.title.2": "ChartFlow Ai",
  "founder.subtitle":
    "প্ল্যাটফর্মের পেছনের গল্প — এবং সেই ট্রেডার, যিনি এটি কমিউনিটির জন্য তৈরি করেছেন।",
  "founder.name": "মুশফিক",
  "founder.role": "প্রতিষ্ঠাতা ও প্রধান কৌশলবিদ",
  "founder.handle": "@Mushfiq2615",
  "founder.bio.1":
    "মুশফিক একজন পূর্ণকালীন Quotex ট্রেডার, কৌশলবিদ এবং ChartFlow Ai-এর স্থপতি। যা শুরু হয়েছিল একটি ব্যক্তিগত ট্রেডিং এজ হিসেবে — দুই ক্যান্ডেল আগে প্রাইস অ্যাকশন পড়ার একটি উপায় — তা আজ গড়ে উঠেছে একটি প্ল্যাটফর্ম, যা সত্যিকারের সিরিয়াস ট্রেডারদের জন্য তৈরি যারা শব্দময় সিগনাল আর অনুমানের ট্রেডিং মেনে নিতে রাজি নন।",
  "founder.bio.2":
    "এখানে প্রতিটি সিগনাল ইঞ্জিন, প্রতিটি চার্ট লেয়ার এবং কৌশলের প্রতিটি লাইন মুশফিক নিজের হাতে তৈরি করেছেন — একটাই লক্ষ্য নিয়ে: নির্ভুলতা। তিনি কাজটি অন্যকে দেননি। নিজে বানিয়েছেন, হাজারো লাইভ ট্রেডে পরিশীলিত করেছেন এবং একটি কমিউনিটির হাতে তুলে দিয়েছেন — যা আজ ৫০,০০০ ট্রেডারের শক্তিশালী পরিবার।",
  "founder.dedication.title": "নিষ্ঠা দিয়ে গড়া",
  "founder.dedication.body":
    "ChartFlow Ai এক রাতে তৈরি হয়নি। এটি বছরের পর বছর গভীর রাতের চার্ট সেশন, কঠোর ব্যাকটেস্ট এবং উইন রেট নিজে কথা না বলা পর্যন্ত কিছু প্রকাশ না করার অঙ্গীকারের ফসল। এই প্ল্যাটফর্ম মুশফিকের ব্যক্তিগত শ্রম — ট্রেডারদের জন্য, একজন ট্রেডারের হাতে গড়া।",
  "founder.stat.community.value": "৫০K+",
  "founder.stat.community.label": "ট্রেডিং কমিউনিটি",
  "founder.stat.signals.value": "১০K+",
  "founder.stat.signals.label": "সিগনাল ইস্যু",
  "founder.stat.winrate.value": "৯৪%",
  "founder.stat.winrate.label": "গড় উইন রেট",
  "founder.cta.telegram": "কমিউনিটিতে যোগ দিন",
  "founder.cta.activate": "অ্যাকাউন্ট অ্যাক্টিভেট",
  "founder.imageAlt": "মুশফিক — ChartFlow Ai-এর প্রতিষ্ঠাতা",

  // Activate Account page
  "activate.badge": "অ্যাকাউন্ট অ্যাক্টিভেশন",
  "activate.title.1": "অ্যাক্টিভেট করুন",
  "activate.title.2": "ChartFlow Ai অ্যাক্সেস",
  "activate.subtitle":
    "আপনার তথ্য এবং কেনার পর পাওয়া QXL Key দিয়ে লাইভ সিগনাল ফিড আনলক করুন।",
  "activate.form.title": "অ্যাক্টিভেশন বিবরণ",
  "activate.form.subtitle":
    "আপনার তথ্য দিন",
  "activate.form.fullName.label": "আপনার পূর্ণ নাম",
  "activate.form.fullName.placeholder": "Enter Your Name",
  "activate.form.fullName.hint":
    "৪ থেকে ১৪ অক্ষর। অক্ষর, সংখ্যা, স্পেস ও সিম্বল অনুমোদিত।",
  "activate.form.fullName.errorMin":
    "পূর্ণ নাম কমপক্ষে ৪ অক্ষরের হতে হবে।",
  "activate.form.fullName.errorMax":
    "পূর্ণ নাম ১৪ অক্ষরের বেশি হতে পারবে না।",
  "activate.form.username.label": "ইউজারনেম",
  "activate.form.username.placeholder": "Enter Your Username",
  "activate.form.username.hint":
    "৫ থেকে ৩২ অক্ষর। শুধু অক্ষর, সংখ্যা ও আন্ডারস্কোর (_) অনুমোদিত — স্পেস বা সিম্বল নয়।",
  "activate.form.username.errorMin":
    "ইউজারনেম কমপক্ষে ৫ অক্ষরের হতে হবে।",
  "activate.form.username.errorMax":
    "ইউজারনেম ৩২ অক্ষরের বেশি হতে পারবে না।",
  "activate.form.username.errorFormat":
    "শুধু অক্ষর, সংখ্যা এবং আন্ডারস্কোর অনুমোদিত।",
  "activate.form.qxlKey.label": "QXL Key",
  "activate.form.qxlKey.placeholder": "যেমন: QXL-XXXX-XXXX-XXXX",
  "activate.form.qxlKey.hint":
    "কেনার পর অ্যাডমিনের কাছ থেকে পাওয়া অ্যাক্টিভেশন কী।",
    "activate.form.qxlKey.errorRequired": "QXL Key আবশ্যক।",
    "activate.form.qxlKey.errorNotFound":
      "এই QXL Key চিনতে পারছি না। অনুগ্রহ করে অ্যাডমিনের সাথে যাচাই করুন।",
    "activate.form.qxlKey.errorClaimed":
      "এই Key অন্য একজন username দিয়ে ইতিমধ্যেই অ্যাক্টিভেট করা হয়েছে।",
    "activate.form.qxlKey.errorNetwork":
      "অ্যাক্টিভেশন সার্ভারে পৌঁছানো যাচ্ছে না। কানেকশন চেক করে আবার চেষ্টা করুন।",
    "activate.form.submit": "অ্যাকাউন্ট অ্যাক্টিভেট করুন",
    "activate.form.submitting": "অ্যাক্টিভেট হচ্ছে…",
    "activate.form.success.title": "অ্যাক্টিভেশন সম্পন্ন",
    "activate.form.success.body":
      "স্বাগতম, {name}। আপনার ড্যাশবোর্ড ও signal রুমগুলো প্রস্তুত।",
    "activate.form.success.cta": "আমার ড্যাশবোর্ড খুলুন",
    "activate.form.success.redirecting": "ড্যাশবোর্ডে নিয়ে যাচ্ছি…",

  // QXL Key acquisition section
  "qxl.badge": "QXL Key কীভাবে পাবেন",
  "qxl.title.1": "QXL Key এখনো নেই?",
  "qxl.title.2": "একটি প্ল্যান বেছে নিন",
  "qxl.subtitle":
    "প্রতিটি টিয়ার পেমেন্ট কনফার্ম হওয়ার সাথে সাথেই একটি ইউনিক QXL Key দেয়। আপনার ট্রেডিং স্টাইল অনুযায়ী অ্যাক্সেস বেছে নিন।",
  "qxl.step": "ধাপ",
  "qxl.includes": "যা থাকছে",
  "qxl.cta.choose": "এই প্ল্যান নিন",
  "qxl.cta.signup": "Quotex অ্যাকাউন্ট খুলুন",
  "qxl.popular": "সর্বাধিক জনপ্রিয়",
  "qxl.help.title": "পেমেন্ট করেছেন কিন্তু কী পাননি?",
  "qxl.help.body":
    "আপনার ট্রানজেকশন রেফারেন্স নিয়ে Telegram-এ অ্যাডমিনের সাথে যোগাযোগ করুন — সাথে সাথেই QXL Key পাবেন।",
  "qxl.help.cta": "অ্যাডমিনকে মেসেজ করুন",

  // FAQ
  "faq.badge": "প্রায়শই জিজ্ঞাসিত",
  "faq.title.1": "যা কিছু আপনার",
  "faq.title.2": "জানা দরকার",
  "faq.subtitle": "যোগদানের আগে প্রতিটি ট্রেডারের প্রশ্নের সরাসরি উত্তর।",
  "faq.cta.title": "আরও প্রশ্ন আছে?",
  "faq.cta.subtitle": "অ্যাডমিনকে সরাসরি বার্তা পাঠান — সাধারণত মিনিটের মধ্যে উত্তর।",
  "faq.cta.button": "অ্যাডমিনের সাথে যোগাযোগ",

  "faq.1.q": "পেমেন্টের পর কত দ্রুত অ্যাক্সেস পাব?",
  "faq.1.a":
    "বেশিরভাগ ক্ষেত্রে অ্যাক্টিভেশন তাৎক্ষণিক। আপনার পেমেন্ট নিশ্চিত হলেই আমাদের অ্যাডমিন টিম আপনার প্ল্যান অ্যাক্টিভেট করে — সাধারণত কয়েক মিনিটের মধ্যে। আপনি অবিলম্বে লাইভ চার্ট, সিগনাল ফিড এবং টেলিগ্রাম চ্যানেলে সরাসরি অ্যাক্সেস পাবেন।",
  "faq.2.q": "একটি সিগনাল লাভজনক না হলে কী হবে?",
  "faq.2.a":
    "বিশ্বের কোনো সিগনাল প্রোভাইডার ১০০% জয় প্রতিশ্রুতি দিতে পারে না — মার্কেট সম্ভাবনাময়। আমাদের প্রকাশিত উইন রেট (প্রায় ৯০–৯৪%) শত শত সিগনালের বাস্তবসম্মত গড়। আমরা প্রতিটি ট্রেডে যথাযথ রিস্ক ম্যানেজমেন্ট এবং বহন করতে পারবেন না এমন বিনিয়োগ এড়িয়ে চলার সুপারিশ করি।",
  "faq.3.q": "লাইভ সিগনাল ও অটো-সিগনালের মধ্যে পার্থক্য কী?",
  "faq.3.a":
    "লাইভ সিগনাল লাইভ চার্ট সেশনের সময় ইস্যু করা হয় — আপনি একটি মার্কেট বাছাই করেন, ইঞ্জিন এটি বিশ্লেষণ করে এবং আপনি চাহিদামতো এন্ট্রি পান। অটো-সিগনাল ব্যাকগ্রাউন্ডে কাজ করে: আপনি একটি মার্কেট ওয়াচলিস্ট নির্বাচন করেন (প্ল্যানের উপর নির্ভর করে ২০–৫০) এবং একটি পরিচ্ছন্ন সেটআপ গঠনের মুহূর্তে সিস্টেম স্বয়ংক্রিয়ভাবে সিগনাল ফায়ার করে — এমনকি আপনি চার্ট থেকে দূরে থাকলেও।",
  "faq.4.q": "কোনো পূর্ব ট্রেডিং অভিজ্ঞতা প্রয়োজন?",
  "faq.4.a":
    "কোনো অভিজ্ঞতা প্রয়োজন নেই। প্রতিটি সিগনালে মার্কেট, ডিরেকশন, টাইমফ্রেম এবং কনফিডেন্স স্কোর অন্তর্ভুক্ত — Quotex-এ ট্রেড স্থাপনের জন্য আপনার যা যা লাগবে। আমরা একটি স্ট্র্যাটেজি অনবোর্ডিং ওয়াকথ্রু-ও অন্তর্ভুক্ত করি এবং অ্যাডমিন টিম আপনাকে শুরু করতে সাহায্য করতে উপলব্ধ।",
  "faq.5.q": "পরবর্তীতে কি প্ল্যান আপগ্রেড বা পরিবর্তন করতে পারব?",
  "faq.5.a":
    "হ্যাঁ — আপনি যেকোনো সময় আপনার প্ল্যান আপগ্রেড করতে পারেন। শুধু মূল্যের পার্থক্য পরিশোধ করুন এবং টেলিগ্রামে অ্যাডমিনকে বার্তা পাঠান। আপনার অ্যাকাউন্ট মিনিটের মধ্যে আপগ্রেড হয়, নতুন ফিচারগুলি অবিলম্বে আনলক হয় এবং আপনি বর্তমান কোনো সুবিধা বা অবশিষ্ট সময় হারানো ছাড়াই সম্পূর্ণ অ্যাক্সেস বজায় রাখেন।",
  "faq.6.q": "২ ক্যান্ডেল এগিয়ে দেখা আসলে কীভাবে কাজ করে?",
  "faq.6.a":
    "আমাদের ইঞ্জিন একাধিক টাইমফ্রেম জুড়ে Quotex প্রাইস অ্যাকশন বিশ্লেষণ করে এবং আপনার স্ক্রিনে প্রিন্ট হওয়ার আগে পরবর্তী দুটি ক্যান্ডেল প্রজেক্ট করে। এটি আপনাকে এন্ট্রির জন্য একটি প্ল্যানিং উইন্ডো দেয় — পরে প্রতিক্রিয়া দেওয়ার পরিবর্তে আপনি আগেই সম্ভাব্য দিক দেখেন, যা শর্ট-টাইমফ্রেম ট্রেডিংয়ের সবচেয়ে বড় এজ।",
  "faq.7.q": "আমার পেমেন্ট ও অ্যাকাউন্টের তথ্য কি নিরাপদ?",
  "faq.7.a":
    "হ্যাঁ। পেমেন্ট সুরক্ষিত প্রোভাইডারের মাধ্যমে প্রক্রিয়া করা হয় এবং আমরা কখনই কার্ডের বিবরণ সংরক্ষণ করি না। অ্যাকাউন্টের তথ্য আপনার এবং অ্যাডমিন টিমের মধ্যেই থাকে। Extreme-এ লাইফটাইম সদস্যরা অতিরিক্ত অ্যাকাউন্ট সুরক্ষা এবং অগ্রাধিকার সাপোর্টের জন্য একজন নিবেদিত ভিআইপি অ্যাডমিন পান।",

  // Footer
  "footer.contact": "যোগাযোগ",
  "footer.privacy": "প্রাইভেসি পলিসি",
  "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",

  // Privacy Policy page
  "privacy.badge": "লিগ্যাল · প্রাইভেসি পলিসি",
  "privacy.title.1": "আপনার গোপনীয়তা,",
  "privacy.title.2": "আমাদের অঙ্গীকার",
  "privacy.subtitle":
    "ChartFlow Ai কীভাবে আপনার তথ্য সংগ্রহ ও সুরক্ষিত রাখে — এবং আমাদের মার্কেট ডেটা কোথা থেকে আসে তার স্বচ্ছ ব্যাখ্যা।",
  "privacy.lastUpdated": "সর্বশেষ আপডেট",
  "privacy.lastUpdated.value": "২৮ এপ্রিল, ২০২৬",

  "privacy.legal.title": "ডেটা সোর্সিং সংক্রান্ত আইনি ঘোষণা",
  "privacy.legal.body":
    "ChartFlow Ai একটি স্বাধীন থার্ড-পার্টি সিগনাল ও অ্যানালিটিক্স সার্ভিস। আমরা Quotex, এর প্যারেন্ট কোম্পানি বা কোনো সাবসিডিয়ারির সাথে যুক্ত নই, কোনো অনুমোদনপ্রাপ্ত পার্টনার নই, এবং কোনোভাবেই তাদের মালিকানাধীন নই। আমাদের প্ল্যাটফর্মে দেখানো মার্কেট ডেটা, ক্যান্ডেল ফিড এবং প্রাইস টিকার সম্পূর্ণ আইনসঙ্গত উপায়ে সংগ্রহ করা — যার মধ্যে রয়েছে Quotex-এর নিজস্ব পাবলিকলি অ্যাক্সেসিবল চার্ট এন্ডপয়েন্ট, ব্রোকার-গ্রেড অ্যাগ্রিগেটর (TradingView, Polygon, Twelve Data), এবং লাইসেন্সকৃত মার্কেট-ডেটা পার্টনার। আমরা কোনো প্রাইভেট অ্যাকাউন্ট স্ক্র্যাপ করি না, কোনো অথেন্টিকেশন বাইপাস করি না, এবং কোনো প্রপ্রাইটারি বা গোপনীয় ডেটা পুনঃবিতরণ করি না। Quotex নাম ও লোগো সহ সকল ট্রেডমার্ক তাদের নিজ নিজ মালিকদের সম্পত্তি এবং কেবল শনাক্তকরণের উদ্দেশ্যে উল্লেখ করা হয়েছে।",

  "privacy.section.1.title": "আমরা কী তথ্য সংগ্রহ করি",
  "privacy.section.1.body":
    "ChartFlow Ai-এ অ্যাকাউন্ট অ্যাক্টিভেট করার সময় আপনি আমাদের আপনার নাম ও ইমেইল ঠিকানা দেন। অ্যাডমিনের সাথে Telegram-এ যোগাযোগ করলে আপনার Telegram ইউজারনেমও আমরা পেতে পারি। আমরা আপনার Quotex ব্রোকার পাসওয়ার্ড, Quotex অ্যাকাউন্ট ব্যালেন্স, Quotex-এ আপনার ট্রেডিং হিস্টরি বা কোনো পেমেন্ট কার্ডের তথ্য সংগ্রহ, সংরক্ষণ বা প্রক্রিয়াকরণ করি না — পেমেন্ট সম্পূর্ণরূপে আমাদের পেমেন্ট পার্টনাররা পরিচালনা করেন।",

  "privacy.section.2.title": "আপনার তথ্য কীভাবে ব্যবহার করি",
  "privacy.section.2.body":
    "আপনার তথ্য কেবল (ক) ChartFlow Ai অ্যাক্সেস ভেরিফাই ও অ্যাক্টিভেট করতে, (খ) আপনার প্ল্যান অনুযায়ী সিগনাল, অ্যালার্ট ও প্রোডাক্ট আপডেট পৌঁছে দিতে এবং (গ) অ্যাডমিন টিমের মাধ্যমে কাস্টমার সাপোর্ট দিতে ব্যবহৃত হয়। আমরা কখনো আপনার ব্যক্তিগত তথ্য বিজ্ঞাপনদাতা বা কোনো তৃতীয় পক্ষের কাছে মার্কেটিংয়ের উদ্দেশ্যে বিক্রি, ভাড়া বা বিনিময় করি না।",

  "privacy.section.3.title": "ডেটা স্টোরেজ ও সুরক্ষা",
  "privacy.section.3.body":
    "আপনার অ্যাক্টিভেশন বিবরণ এনক্রিপ্টেড, অ্যাক্সেস-নিয়ন্ত্রিত ডেটাবেসে সংরক্ষিত হয় যা স্বনামধন্য ক্লাউড প্রোভাইডারে হোস্ট করা। কেবল অনুমোদিত অ্যাডমিন টিম সদস্যরাই এই ডেটা অ্যাক্সেস করতে পারেন এবং প্রতিটি অ্যাক্সেস লগ করা হয়। অ্যাক্টিভেশন ডেটা বহনকারী যোগাযোগ ইন্ডাস্ট্রি-স্ট্যান্ডার্ড TLS এনক্রিপশন দিয়ে সুরক্ষিত।",

  "privacy.section.4.title": "তৃতীয় পক্ষের সার্ভিস",
  "privacy.section.4.body":
    "আমরা কমিউনিটি ডেলিভারি ও অ্যাডমিন যোগাযোগের জন্য Telegram, ওয়েবসাইট সার্ভিংয়ের জন্য হোস্টিং প্রোভাইডার (Vercel) এবং সামগ্রিক, পরিচয়হীন ট্র্যাফিক পরিমাপের জন্য অ্যানালিটিক্স সার্ভিস ব্যবহার করি। এই সার্ভিসগুলোর নিজস্ব প্রাইভেসি পলিসি আছে এবং সেগুলো পড়ে দেখার সুপারিশ করছি। প্রযুক্তিগতভাবে যা প্রয়োজন তার বাইরে আমরা এসব সার্ভিসের সাথে কোনো ব্যক্তি-শনাক্তকারী ডেটা শেয়ার করি না।",

  "privacy.section.5.title": "আপনার অধিকার",
  "privacy.section.5.body":
    "আপনি যেকোনো সময় Telegram-এ অ্যাডমিন টিমের সাথে যোগাযোগ করে আপনার সম্পর্কে আমাদের কাছে সংরক্ষিত ডেটা দেখতে, সংশোধন বা আপডেট করতে অথবা আপনার অ্যাকাউন্ট ও সংশ্লিষ্ট অ্যাক্টিভেশন রেকর্ড মুছে ফেলার অনুরোধ করতে পারেন। আমরা সাধারণত ৭ কর্মদিবসের মধ্যে এমন অনুরোধে সাড়া দেই।",

  "privacy.section.6.title": "ঝুঁকির ডিসক্লেইমার",
  "privacy.section.6.body":
    "ChartFlow Ai মার্কেট অ্যানালাইসিস ও ট্রেড সিগনাল প্রদান করে; এটি কোনো আর্থিক উপদেশ দেয় না। বাইনারি অপশন এবং অন্যান্য জল্পনামূলক ইনস্ট্রুমেন্ট ট্রেডিংয়ে উচ্চ মাত্রার ঝুঁকি জড়িত এবং সকল বিনিয়োগকারীর জন্য উপযুক্ত নাও হতে পারে। অতীত পারফরম্যান্স ভবিষ্যতের ফলাফলের নিশ্চয়তা দেয় না। সর্বদা দায়িত্বশীলভাবে এবং কেবল সেই পরিমাণ মূলধন দিয়ে ট্রেড করুন যা আপনি হারাতে পারলে কোনো ক্ষতি হবে না।",

  "privacy.section.7.title": "পলিসিতে পরিবর্তন",
  "privacy.section.7.body":
    "আমরা সময়ে সময়ে এই প্রাইভেসি পলিসি আপডেট করতে পারি। গুরুত্বপূর্ণ পরিবর্তনগুলো ওয়েবসাইট ও Telegram চ্যানেলের মাধ্যমে জানানো হবে। পরিবর্তনের পর ChartFlow Ai-এর ব্যবহার চালিয়ে গেলে তা সংশোধিত পলিসি গ্রহণের সম্মতি হিসেবে বিবেচিত হবে।",

  "privacy.contact.title": "এই পলিসি সম্পর্কে প্রশ্ন আছে?",
  "privacy.contact.body":
    "আমাদের অ্যাডমিন টিম ব্যক্তিগতভাবে উত্তর দেন — সাধারণত Telegram-এ কয়েক মিনিটের মধ্যে।",
  "privacy.contact.cta": "অ্যাডমিনকে মেসেজ করুন",
  // ChartFlow Ai home (new design)
  "home.nav.reviews": "রিভিউ",
  "home.nav.faq": "প্রশ্নোত্তর",
  "home.nav.founder": "প্রতিষ্ঠাতা",
  "home.hero.trust": "সিরিয়াস Quotex ট্রেডারদের আস্থার প্ল্যাটফর্ম",
  "home.chart.footer": "১ মিনিটের ক্যান্ডেল",
  "home.hero.headline.pre": "",
  "home.hero.headline.hl": "দুই ক্যান্ডেল আগেই",
  "home.hero.headline.post": " মার্কেট বুঝে নিন",
  "home.chart.chip.preview": "২ ক্যান্ডেল আগে",
  "home.chart.chip.accuracy": "গড় নির্ভুলতা",
  "home.steps.badge": "কীভাবে কাজ করে",
  "home.steps.title.1": "মাত্র তিন ধাপে",
  "home.steps.title.2": "আপনার এজ",
  "home.steps.subtitle": "প্ল্যান বেছে নেওয়া থেকে চার্ট আগে পড়া পর্যন্ত — পুরো প্রক্রিয়া মাত্র কয়েক মিনিটের।",
  "home.steps.1.title": "অ্যাকাউন্ট খুলুন",
  "home.steps.1.desc": "ইমেইল দিয়ে কয়েক সেকেন্ডে রেজিস্টার করুন — প্রতিটি নতুন অ্যাকাউন্ট Free প্ল্যানে শুরু হয়।",
  "home.steps.2.title": "প্ল্যান বেছে নিন",
  "home.steps.2.desc": "Basic, Standard, Premium অথবা Extreme — পেমেন্ট ভেরিফাই হলে অ্যাডমিন আপনার অ্যাকাউন্টে প্ল্যান চালু করে দেবে।",
  "home.steps.3.title": "লগইন করে ট্রেড করুন",
  "home.steps.3.desc": "প্রোফাইল থেকে আপনার প্ল্যানের দৈনিক লিমিট অনুযায়ী লাইভ চার্ট ও সিগনাল ব্যবহার করুন।",
  "home.founder.verified": "ভেরিফায়েড প্রতিষ্ঠাতা",
  "home.founder.connect": "যুক্ত হন",
  "home.founder.community": "৫০,০০০+ ট্রেডারের সাথে যোগ দিন",
  "home.founder.communityDesc": "Telegram-এ লাইভ সিগনাল, মার্কেট রিড ও স্ট্র্যাটেজি আপডেট।",
  "home.cta.eyebrow": "আপনার এজ এখান থেকেই শুরু",
  "home.cta.title.1": "আপনার পরের ট্রেড পাওয়ার যোগ্য",
  "home.cta.title.2": "আরও পরিষ্কার দৃষ্টি",
  "home.cta.subtitle": "ChartFlow Ai-তে যোগ দিন এবং দুই ক্যান্ডেল আগে মার্কেট পড়ুন — লাইভ চার্ট, প্রিমিয়াম সিগনাল আর সরাসরি অ্যাডমিন সাপোর্ট সহ।",
  "home.footer.tagline": "যারা মুভ হওয়ার আগেই দেখতে চান, সেই ট্রেডারদের জন্য প্রিমিয়াম সিগনাল ও লাইভ চার্ট।",
  "home.footer.explore": "এক্সপ্লোর",
  "home.footer.support": "সাপোর্ট",
  "home.footer.disclaimer": "ট্রেডিংয়ে ঝুঁকি আছে। ChartFlow Ai মার্কেট অ্যানালাইসিস ও সিগনাল দেয়, কোনো আর্থিক উপদেশ নয়। ChartFlow Ai একটি স্বাধীন সার্ভিস এবং Quotex-এর সাথে যুক্ত নয়।",
  "home.reviews.rating": "গড় রেটিং",
  "home.reviews.proof": "মেম্বার রিভিউ",
  // /download page
  "download.back": "হোমে ফিরে যান",
  "download.badge": "সোর্স কোড",
  "download.title.1": "ডাউনলোড করুন পুরো",
  "download.title.2": "ওয়েবসাইটের সোর্স কোড",
  "download.subtitle": "ChartFlow Ai-এর সম্পূর্ণ প্রজেক্ট — ফ্রন্টএন্ড, ব্যাকএন্ড ও ডকুমেন্টস — একটি zip ফাইলে।",
  "download.stat.files": "ফাইল",
  "download.stat.size": "সোর্সের সাইজ",
  "download.stat.updated": "সর্বশেষ আপডেট",
  "download.button": "ZIP ডাউনলোড করুন",
  "download.preparing": "zip তৈরি হচ্ছে…",
  "download.downloading": "ডাউনলোড হচ্ছে…",
  "download.received": "এসেছে",
  "download.done": "ডাউনলোড সম্পন্ন",
  "download.again": "আবার ডাউনলোড করুন",
  "download.error": "ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
  "download.unavailable": "এই মুহূর্তে সার্ভারে সোর্স ফাইল পাওয়া যাচ্ছে না।",
  "download.included": "ভেতরে যা আছে",
  "download.filesCount": "টি ফাইল",
  "download.safe.title": "শেয়ার করা নিরাপদ",
  "download.safe.desc": "গোপন কী (.env ফাইল), পাসওয়ার্ড, ইনস্টল করা প্যাকেজ (node_modules), বিল্ড ফাইল ও git হিস্টোরি স্বয়ংক্রিয়ভাবে zip থেকে বাদ দেওয়া হয়।",
  "download.howto.title": "ডাউনলোডের পর",
  "download.howto.desc": "ফাইলটি unzip করুন, frontend ফোল্ডার খুলুন, yarn install এবং তারপর yarn dev চালিয়ে লোকালি ওয়েবসাইট চালু করুন।",
  "auth.tab.login": "লগইন",
  "auth.tab.register": "রেজিস্ট্রেশন",
  "auth.login.title": "আবার স্বাগতম",
  "auth.login.sub": "লাইভ চার্ট ও প্রিমিয়াম সিগন্যাল দেখতে লগইন করুন।",
  "auth.register.title": "অ্যাকাউন্ট খুলুন",
  "auth.register.sub": "কয়েক সেকেন্ডে ChartFlow Ai-তে যোগ দিন এবং এগিয়ে থেকে ট্রেড শুরু করুন।",
  "auth.name": "পুরো নাম",
  "auth.name.ph": "আপনার পুরো নাম",
  "auth.email": "ইমেইল",
  "auth.email.ph": "you@example.com",
  "auth.password": "পাসওয়ার্ড",
  "auth.password.ph": "আপনার পাসওয়ার্ড দিন",
  "auth.password.new.ph": "একটি শক্তিশালী পাসওয়ার্ড দিন",
  "auth.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.login.submit": "লগইন",
  "auth.register.submit": "অ্যাকাউন্ট তৈরি করুন",
  "auth.or": "অথবা",
  "auth.google": "Google দিয়ে চালিয়ে যান",
  "auth.switch.toRegister": "অ্যাকাউন্ট নেই?",
  "auth.switch.toLogin": "আগেই অ্যাকাউন্ট আছে?",
  "auth.reset.title": "পাসওয়ার্ড রিসেট",
  "auth.reset.sub": "আপনার ইমেইল দিন, পাসওয়ার্ড রিসেট করার লিংক পাঠানো হবে।",
  "auth.reset.submit": "রিসেট লিংক পাঠান",
  "auth.reset.back": "লগইনে ফিরে যান",
  "auth.reset.sent.title": "ইমেইল চেক করুন",
  "auth.reset.sent.sub": "এই ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিসেটের লিংক পাঠানো হয়েছে। Inbox বা Spam ফোল্ডার দেখুন।",
  "auth.newpw.title": "নতুন পাসওয়ার্ড দিন",
  "auth.newpw.sub": "এই অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন:",
  "auth.newpw.label": "নতুন পাসওয়ার্ড",
  "auth.newpw.submit": "পাসওয়ার্ড সেভ করুন",
  "auth.newpw.checking": "লিংক যাচাই করা হচ্ছে…",
  "auth.newpw.done.title": "পাসওয়ার্ড বদলানো হয়েছে",
  "auth.newpw.done.sub": "এখন নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।",
  "auth.newpw.bad.title": "লিংকটি আর কাজ করছে না",
  "auth.newpw.bad.sub": "লিংকের মেয়াদ শেষ অথবা আগেই ব্যবহার করা হয়েছে। নতুন রিসেট লিংক চেয়ে নিন।",
  "auth.newpw.login": "লগইনে যান",
  "auth.err.fields": "অনুগ্রহ করে সব ঘর পূরণ করুন।",
  "auth.err.emailInUse": "এই ইমেইলে আগেই একটি অ্যাকাউন্ট আছে। লগইন করে দেখুন।",
  "auth.err.invalidEmail": "ইমেইল ঠিকানাটি সঠিক মনে হচ্ছে না।",
  "auth.err.weakPassword": "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
  "auth.err.wrongCredentials": "ইমেইল বা পাসওয়ার্ড ভুল।",
  "auth.err.tooMany": "অনেকবার চেষ্টা করা হয়েছে। একটু পরে আবার চেষ্টা করুন।",
  "auth.err.network": "নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
  "auth.err.popupClosed": "Google সাইন-ইন বাতিল হয়েছে। আবার চেষ্টা করুন।",
  "auth.err.accountExists": "এই ইমেইলে পাসওয়ার্ড দিয়ে অ্যাকাউন্ট আছে। পাসওয়ার্ড দিয়ে লগইন করুন।",
  "auth.err.unauthorizedDomain": "এই ডোমেইনে Google সাইন-ইন এখনও চালু হয়নি। সাপোর্টে যোগাযোগ করুন।",
  "auth.err.generic": "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
  "account.eyebrow": "ড্যাশবোর্ড",
  "account.title": "হ্যালো,",
  "account.sub": "আপনি ChartFlow Ai-তে লগইন করা আছেন। নিচে আপনার অ্যাকাউন্টের তথ্য।",
  "account.name": "পুরো নাম",
  "account.email": "ইমেইল",
  "account.joined": "সদস্য হয়েছেন",
  "account.logout": "লগআউট",
  "account.home": "হোমে ফিরে যান",
  "account.loading": "আপনার অ্যাকাউন্ট লোড হচ্ছে…",
  "header.account": "প্রোফাইল",
  "dash.plans.title": "প্ল্যান নিন",
  "dash.plans.sub": "প্রাইসিং দেখুন ও লাইভ সিগন্যাল আনলক করুন",
  "dash.contact.title": "অ্যাডমিনের সাথে যোগাযোগ",
  "dash.contact.sub": "Telegram-এ সাহায্য নিন",
}

export const dictionaries: Record<Language, Dict> = { en, bn }
