# 🌴 Cancún Hub — Telegram Community System

> Лучший Telegram-бот и канал о Канкуне. Better than cancun_live in every way.

## Что это

Полноценная система управления Telegram-сообществом для Канкуна:

- **🤖 Cloudflare Worker** — 24/7 webhook-бот без сервера
- **📅 GitHub Actions** — автопостинг ежедневных дайджестов
- **🌀 Weather Alerts** — алерты о штормах и ураганах в реальном времени
- **📊 Умный контент** — рестораны, пляжи, трансферы, недвижимость, события

## Преимущества перед cancun_live

| Параметр | cancun_live | Cancún Hub |
|---|---|---|
| Язык | Только испанский | 🇷🇺 Русский + 🇲🇽 Испанский |
| Бот | Нет | ✅ 24/7 интерактивный |
| Погода | Нет | ✅ Real-time + uraganы |
| Пляжи | Иногда | ✅ 6 пляжей + флаги безопасности |
| Дайджест | Нет | ✅ Ежедневно в 8:00 |
| Экстренные | Нет | ✅ /emergency со всеми номерами |
| Трансфер | Нет | ✅ Цены на такси, ADO, Uber |
| Недвижимость | Нет | ✅ Цены аренды и покупки |
| Модерация | Ручная | ✅ Авто-приветствие новых |
| Events | Вручную | ✅ По категориям + расписание |

## Быстрый старт

### 1. Создай бота

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → имя: **Cancún Hub Bot** → юзернейм: **CancunHubBot**
3. Сохрани токен

### 2. Задай команды бота (через BotFather)

```
weather - 🌤 Погода/Clima
beach - 🏖 Пляжи/Playas  
events - 🎉 События/Eventos
deals - 💰 Скидки/Ofertas
emergency - 🚨 Экстренные/Emergencias
taxi - 🚕 Трансфер/Traslados
help - ℹ️ Помощь/Ayuda
report - 📩 Репорт/Reporte
```

### 3. Создай канал и группу

- Канал: `@cancun_hub` (публичный)
- Чат: `@cancun_hub_chat` (публичный)
- Добавь бота в оба как **администратора**

### 4. Деплой Cloudflare Worker

```bash
cd cancun-hub/worker
# Установи wrangler если нет:
npm i -g wrangler

# Залогинься в Cloudflare:
wrangler login

# Заполни account_id в wrangler.toml (из cloudflare.com/dashboard)

# Загрузи секреты:
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_ADMIN_IDS   # твои Telegram user ID через запятую
wrangler secret put OPENWEATHER_API_KEY  # опционально

# Деплой:
wrangler deploy
```

### 5. Установи webhook

```bash
# После деплоя получишь URL вида:
# https://cancun-hub-bot.YOUR-SUBDOMAIN.workers.dev

curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://cancun-hub-bot.YOUR-SUBDOMAIN.workers.dev/webhook"
```

### 6. Настрой GitHub Actions

В настройках репозитория → Settings → Secrets → New repository secret:

| Secret | Значение |
|---|---|
| `CANCUN_HUB_BOT_TOKEN` | Токен от BotFather |
| `CANCUN_HUB_CHANNEL_ID` | `@cancun_hub` или `-100xxxxxxxx` |
| `OPENWEATHER_API_KEY` | Ключ с [openweathermap.org](https://openweathermap.org/api) (бесплатно) |

### 7. Запости приветствие

В GitHub Actions → **Cancún Hub — Daily Digest** → Run workflow → `welcome`

## Архитектура

```
cancun-hub/
├── worker/
│   ├── index.mjs        ← Cloudflare Worker (24/7 webhook-бот)
│   └── wrangler.toml    ← конфиг деплоя
├── scripts/
│   ├── post-daily.mjs        ← утренний дайджест (8am CST)
│   ├── weather-alert.mjs     ← алерты о штормах (каждый час)
│   └── welcome-new-members.mjs ← пиннованное приветствие
└── data/
    └── weather-state.json    ← стейт алертов (не слать дважды)

.github/workflows/
└── cancun-hub-daily.yml  ← GitHub Actions для автоматизации
```

## Команды бота

| Команда | Описание |
|---|---|
| `/start` или `/help` | Приветствие + меню |
| `/weather` | Текущая погода + прогноз 7 дней |
| `/beach [nombre]` | Состояние пляжа + флаги безопасности |
| `/events` | События по категориям |
| `/deals` | Сегодняшние скидки и happy hours |
| `/emergency` | Все экстренные телефоны |
| `/taxi` | Цены на такси и транспорт |
| `/report [тип] [текст]` | Репорт администраторам |

## Переменные окружения

| Переменная | Где | Обязательна |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Worker secret + GH secret | ✅ |
| `TELEGRAM_CHANNEL_ID` | GH secret | ✅ для постинга |
| `TELEGRAM_ADMIN_IDS` | Worker secret | Рекомендуется |
| `OPENWEATHER_API_KEY` | Worker + GH secret | Опционально |

## Roadmap (следующие фичи)

- [ ] Scraper новостей (Por Esto!, Noticaribe) для авто-постинга
- [ ] Интеграция с Google Maps API для поиска ресторанов
- [ ] Airbnb/Inmuebles24 парсер для горящих предложений
- [ ] Telegram Mini App — интерактивная карта Канкуна
- [ ] AI-модерация чата (блокировка спама/рекламы)
- [ ] Еженедельные опросы сообщества
- [ ] Интеграция с Tripadvisor API для рейтингов
