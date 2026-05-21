# WB TV Tracker — Cloudflare Worker

24/7 webhook-based Telegram bot. Replaces the 5-minute-cron polling with
instant responses (cold-start ≈ 50 ms, warm ≈ 5 ms).

## Архитектура

```
Telegram → POST /webhook → Cloudflare Worker
                              ↓ fetch (cached, 5 min)
                          raw.githubusercontent.com/.../REPORT.json
                          raw.githubusercontent.com/.../MODELS.json
                          raw.githubusercontent.com/.../ANOMALIES.json
                              ↓
                          dispatch(cmd) → reply
                              ↓
                          Telegram sendMessage (inline response)
```

Данные читаются с GitHub при каждом запросе с **5-минутным edge-кешем**
(Cloudflare Cache API), так что 99% запросов отвечают мгновенно из
кеша; первый запрос после `git push` подтянет свежий REPORT.json.

## Развёртывание

### Один раз

```bash
# 1. Зарегистрируйтесь на cloudflare.com (бесплатно)
# 2. Установите wrangler CLI
npm i -g wrangler

# 3. Логин (откроет браузер для OAuth)
wrangler login

# 4. Перейдите в папку worker'а и установите зависимости
cd apify-wb-tv-scraper/worker
npm install

# 5. Положите токен бота как secret (НЕ в код, НЕ в wrangler.toml)
echo 'YOUR_BOT_TOKEN_HERE' | wrangler secret put TELEGRAM_BOT_TOKEN

# 6. Деплой
wrangler deploy
```

Wrangler выведет URL вида `https://wb-tv-tracker-bot.<account>.workers.dev`.
Сохраните его.

### Привязать к Telegram

```bash
TG_TOKEN="<тот же токен что в secret>"
WORKER_URL="https://wb-tv-tracker-bot.<account>.workers.dev"

# Скажите Telegram'у слать апдейты в worker
curl -s "https://api.telegram.org/bot$TG_TOKEN/setWebhook?url=$WORKER_URL/webhook&allowed_updates=%5B%22message%22,%22callback_query%22%5D"

# Проверить
curl -s "https://api.telegram.org/bot$TG_TOKEN/getWebhookInfo" | jq
```

С этого момента бот отвечает **мгновенно 24/7**. Cron `wb-tv-bot.yml` в
GitHub Actions можно отключить (создаёт коллизии с webhook'ом):

```yaml
# .github/workflows/wb-tv-bot.yml
on:
  # schedule:                    # <-- закомментируйте
  #   - cron: "*/5 * * * *"
  workflow_dispatch:
```

### Откатиться на polling (если что-то не так)

```bash
TG_TOKEN="..."
curl -s "https://api.telegram.org/bot$TG_TOKEN/deleteWebhook"
```

После этого `wb-tv-bot.yml` GitHub Actions снова начнёт обрабатывать
сообщения раз в 5 минут.

## Что под капотом

- **`index.mjs`** — единственный файл worker'а. Содержит все 15 команд,
  4 inline-клавиатуры (бренды, диагонали, цены, аномалии), пагинацию,
  и dispatch для message + callback_query.
- **`wrangler.toml`** — конфиг Cloudflare. Только имя + дата
  совместимости; никакие данные внутри не лежат.
- **`package.json`** — wrangler как dev-зависимость.

## Лимиты

Cloudflare Workers **free** plan:

- 100 000 запросов/день
- 10 мс CPU на запрос (хватает — самая тяжёлая команда `/find` в текущей
  выборке занимает ~3 мс)
- Cache API без лимита по объёму
- Outbound fetch без лимита

Стоимость **$0/мес** для бота, который обрабатывает <10 000 сообщений в
день.

## Обновление кода

После любого изменения `index.mjs`:

```bash
cd apify-wb-tv-scraper/worker
wrangler deploy
```

Деплой занимает ~5 секунд, кеш сбрасывается автоматически. Чтобы
форсировать обновление данных раньше 5-минутного TTL, измените версию
ветки в константе `BRANCH` в `index.mjs`.

## Сравнение с polling-вариантом

|                        | Polling (cron 5 мин)             | Worker (webhook)           |
|------------------------|----------------------------------|----------------------------|
| Латентность ответа     | 0–5 минут                        | 0.1–1 секунда              |
| Доступность            | 99% (Actions иногда тормозит)    | 99.99% (Cloudflare edge)   |
| Стоимость              | $0 (но Actions считает минуты)   | $0 (Workers free tier)     |
| Настройка              | Только GitHub Secret             | + Cloudflare аккаунт + CLI |
| Свежесть данных        | Сразу после `git push`           | До 5 минут (edge-кеш)      |
