# 🌴 Playa del Carmen Hub — Telegram Community System

> The #1 PDC Telegram bot — trilingual (English + Spanish + Russian), fully automated, 24/7.

## What it does

| Feature | Description |
|---|---|
| 🤖 Cloudflare Worker bot | 24/7 webhook — zero server cost |
| 🌤 Live weather | OpenWeatherMap, PDC coordinates |
| 🏖 6 beaches | Mamitas, Coco, Esmeralda, Xcacel, Akumal, Cozumel |
| ⛴️ Cozumel ferry | Schedule, prices, tips |
| 🎉 Events | 6 categories with inline navigation |
| 🌀 Hurricane alerts | NHC + CONAGUA, every hour via GH Actions |
| 📅 Daily digest | 8:00 AM CST, auto-posted to channel |
| 🍽 Restaurants | Best spots by cuisine and budget |
| 🏠 Real estate | PDC rentals + sales with current prices |
| 🚨 Emergency | All PDC emergency numbers |
| 🚌 Transport | ADO, colectivos, taxis, airport transfers |
| 🛍 5th Ave guide | Complete Quinta Avenida breakdown |
| 📩 Admin reports | Users send tips/incidents directly to admins |

## Why it's better

| Metric | cancun_live | **PDC Hub** |
|---|---|---|
| City | Cancún | ✅ Playa del Carmen |
| Languages | Spanish only | ✅ English + Spanish + Russian |
| Bot | None | ✅ 24/7 Cloudflare Worker |
| Live weather | No | ✅ OpenWeatherMap API |
| Beach details | Rarely | ✅ 6 locations + safety flags |
| Storm alerts | No | ✅ NHC + CONAGUA, hourly |
| Daily digest | No | ✅ Every morning 8am CST |
| Emergency numbers | No | ✅ All PDC services |
| Ferry guide | No | ✅ Cozumel ferry complete |
| Real estate | No | ✅ Current market prices |
| 5th Ave guide | No | ✅ Full breakdown by zone |

## Quick Start

### 1. Create the bot

Open [@BotFather](https://t.me/BotFather):
```
/newbot
Name: Playa del Carmen Hub
Username: PDCHubBot
```
Save the token.

### 2. Set bot commands via BotFather

```
weather - 🌤 Live weather / Clima / Погода
beach - 🏖 Beach conditions / Playas / Пляжи
events - 🎉 Events / Eventos / События
deals - 💰 Deals & happy hours
ferry - ⛴ Cozumel ferry info
emergency - 🚨 Emergency numbers
taxi - 🚌 Transport & prices
quinta - 🛍 5th Avenue guide
help - ℹ️ Full command list
report - 📩 Report to admins
```

### 3. Create channel + group

- Channel: `@pdchub` (public)
- Chat: `@pdchub_chat` (public, linked to channel)
- Add the bot to both as **admin**

### 4. Deploy Cloudflare Worker

```bash
cd cancun-hub/worker

# Install wrangler if needed:
npm i -g wrangler

# Login to Cloudflare:
wrangler login

# Fill in your account_id in wrangler.toml

# Upload secrets:
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_ADMIN_IDS   # your Telegram user IDs, comma-separated
wrangler secret put OPENWEATHER_API_KEY  # optional, free at openweathermap.org

# Deploy:
wrangler deploy
```

### 5. Set webhook

```bash
curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://pdc-hub-bot.YOUR-SUBDOMAIN.workers.dev/webhook"
```

### 6. Configure GitHub Secrets

In repo → Settings → Secrets → New repository secret:

| Secret | Value |
|---|---|
| `PDC_HUB_BOT_TOKEN` | BotFather token |
| `PDC_HUB_CHANNEL_ID` | `@pdchub` or `-100xxxxxxxx` |
| `OPENWEATHER_API_KEY` | Free key from [openweathermap.org](https://openweathermap.org/api) |

### 7. Post welcome message

GitHub Actions → **PDC Hub — Daily Digest & Alerts** → Run workflow → select `welcome`

## Architecture

```
cancun-hub/
├── worker/
│   ├── index.mjs           ← Cloudflare Worker (24/7 webhook bot)
│   └── wrangler.toml       ← deploy config
├── scripts/
│   ├── post-daily.mjs      ← morning digest (8am CST)
│   ├── weather-alert.mjs   ← storm/hurricane alerts (hourly)
│   └── welcome-new-members.mjs ← pinned welcome post
└── data/
    └── weather-state.json  ← tracks sent alerts (no duplicates)

.github/workflows/
└── cancun-hub-daily.yml    ← automation: digest + alerts
```

## Bot commands

| Command | EN | ES | RU |
|---|---|---|---|
| `/start` | Welcome + menu | Bienvenida | Приветствие |
| `/help` | Full command list | Lista de comandos | Все команды |
| `/weather` | Live weather + forecast | Clima en vivo | Погода |
| `/beach [name]` | Beach conditions | Condiciones playa | Пляж |
| `/events` | Events by category | Eventos | События |
| `/deals` | Today's deals | Ofertas hoy | Скидки |
| `/ferry` | Cozumel ferry | Ferry Cozumel | Паром |
| `/emergency` | All emergency #s | Emergencias | Экстренные |
| `/taxi` | Transport prices | Transporte | Транспорт |
| `/quinta` | 5th Ave guide | Guía La Quinta | Путеводитель |
| `/report` | Report to admins | Reporte | Репорт |

## Environment variables

| Variable | Where | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Worker secret + GH secret | ✅ |
| `PDC_HUB_CHANNEL_ID` | GH secret | ✅ for posting |
| `TELEGRAM_ADMIN_IDS` | Worker secret | Recommended |
| `OPENWEATHER_API_KEY` | Worker secret + GH secret | Optional |

## Roadmap

- [ ] Auto-scrape PDC news (Noticaribe, Playa News Room)
- [ ] Airbnb price tracker for PDC rentals
- [ ] Google Maps integration for restaurant search
- [ ] AI chat moderation (spam/promo detection)
- [ ] Weekly community poll
- [ ] Tide & surf forecast integration
- [ ] Telegram Mini App — interactive PDC map
- [ ] Tripadvisor integration for restaurant ratings
