# Wildberries TV scraper (Apify Actor)

Apify Actor, который собирает все телевизоры с Wildberries.ru через
публичный JSON-эндпоинт `search.wb.ru`, фильтрует аксессуары
(кронштейны, пульты, чехлы и т.п.), считает скидки и сохраняет
Markdown-отчёт с топом артикулов по цене.

## Что делает

1. Ходит на `https://search.wb.ru/exactmatch/ru/common/v9/search` со
   страницами 1..`maxPages` (WB отдаёт до ~100 страниц по 100 карточек).
2. Дедуплицирует по `id` и фильтрует аксессуары по словарю
   (`кронштейн`, `пульт`, `чехол`, …) — оставляет только карточки,
   у которых в названии есть `телевизор`/`smart tv`/`LED`/`QLED`/`OLED`/`UHD`.
3. Для каждой карточки кладёт в Dataset поля:
   `id`, `name`, `brand`, `diagonal`, `price`, `basicPrice`, `discount`,
   `rating`, `feedbacks`, `supplier`, `supplierId`, `supplierRating`,
   `subjectId`, `url`.
4. Парсит диагональ из названия (`32"`, `43 дюйма`, fallback по
   стандартному ряду 19/22/24/…/100) и забирает рейтинг продавца,
   когда WB его отдаёт.
5. Сортирует по цене, фильтрует по `minRating` / `minFeedbacks` и
   сохраняет в Key-Value Store:
   - `REPORT` — Markdown-отчёт с тремя секциями:
     1. **Топ артикулов по цене** (с колонками `Диаг.`, `Продавец (★)`),
     2. **Разбивка по брендам** — топ-15 по числу карточек, для каждого
        мин/медианная цена, средний рейтинг и самый дешёвый артикул,
     3. **Разбивка по диагоналям** — для каждой диагонали топ-3 дешёвых.
     Все ссылки ведут на `https://www.wildberries.ru/catalog/<id>/detail.aspx`.
   - `REPORT_JSON` — структурированные данные тех же секций.

## Как запустить

### На платформе Apify (UI)

1. Создайте новый Actor → "Empty" template.
2. Загрузите содержимое этой папки (или подключите репозиторий).
3. Соберите образ (`Build`).
4. Запустите со стандартным вводом или задайте свой:
   ```json
   {
     "query": "телевизор",
     "maxPages": 100,
     "sort": "priceup",
     "minRating": 4,
     "minFeedbacks": 10,
     "topN": 100,
     "useProxy": true
   }
   ```
5. После прогона возьмите файл из Key-Value Store → ключ **REPORT**
   (это готовый Markdown-отчёт с лучшими артикулами).

### Локально через Apify CLI

```bash
npm install -g apify-cli
cd apify-wb-tv-scraper
npm install
apify run -p   # -p = чистый KV-стор перед запуском
# отчёт появится в storage/key_value_stores/default/REPORT.md
```

## Вход (input_schema.json)

| Поле | Тип | По умолчанию | Назначение |
|------|-----|--------------|------------|
| `query` | string | `"телевизор"` | Поисковый запрос WB |
| `maxPages` | int | `100` | До скольких страниц обходить |
| `sort` | enum | `"priceup"` | `priceup`, `pricedown`, `popular`, `rate`, `newly` |
| `dest` | int | `-1257786` | Код региона WB (по умолчанию Москва) |
| `minPrice` / `maxPrice` | int | `0` / `0` | Диапазон цен в рублях (0 = без лимита) |
| `minRating` | int | `4` | Минимальный рейтинг для попадания в топ |
| `minFeedbacks` | int | `5` | Минимум отзывов для попадания в топ |
| `topN` | int | `50` | Размер итогового топа |
| `onlyTVs` | bool | `true` | Фильтровать аксессуары |
| `useProxy` | bool | `true` | Включать Apify Proxy (рекомендуется) |
| `proxyGroups` | array | `[]` | Например `["RESIDENTIAL"]` |
| `delayMs` | int | `600` | Задержка между запросами |

## Авто-прогон по расписанию (GitHub Action)

В корне репо лежит workflow `.github/workflows/wb-tv-report.yml`. По
расписанию (пятница 09:00 МСК) и по кнопке `workflow_dispatch` он
запускает `apify-wb-tv-scraper/scripts/run-scrape.sh`, который:

1. Дёргает Apify Actor (по умолчанию `powerai/wildberries-products-search-scraper`
   — работает без residential-прокси на FREE-плане) **восемью параллельными
   запросами** по разным сортировкам и подзапросам.
2. Объединяет датасеты и прогоняет через `scripts/build-report.mjs`.
3. Коммитит свежие `REPORT.md` + `REPORT.json` в
   `apify-wb-tv-scraper/report/` и заливает их в Actions artifacts.

### Быстрый setup одной командой

После ротации Apify-токена в
[Apify Console → Integrations](https://console.apify.com/account/integrations):

```bash
APIFY_TOKEN=apify_api_xxxxxxxxxxxx \
  ./apify-wb-tv-scraper/setup-actions.sh --dispatch
```

Скрипт через ваш `gh` CLI положит токен в Secrets, выставит
`APIFY_ACTOR_ID` Variable и сразу запустит workflow. Без `--dispatch` —
только настройка, без запуска.

### Локальный прогон

Тот же `run-scrape.sh` работает локально:

```bash
APIFY_TOKEN=apify_api_xxxxxxxxxxxx bash apify-wb-tv-scraper/scripts/run-scrape.sh
ls apify-wb-tv-scraper/report
```

## Замечания

- Без Apify Proxy WB часто блокирует датацентровые IP. Оставляйте
  `useProxy: true`. Для устойчивого прогона лучше всего
  `proxyGroups: ["RESIDENTIAL"]` с `countryCode: "RU"`.
- WB периодически меняет схему ответа. Скрипт читает цену из
  `sizes[0].price.{product|total|basic}` с фолбэком на устаревшие
  `salePriceU` / `priceU` — но если WB поменяет формат снова, поправьте
  `priceFromProduct` в `src/main.js`.
- Капчи/блокировки HTTP-кодом 403/429 трактуются как пустая страница;
  после 3 подряд скрипт останавливается. Смотрите логи прогона.
- Скрипт уважителен к WB (`delayMs` по умолчанию 600 мс); не
  занижайте значение без необходимости.

## Telegram-канал с автопостингом

### Настройка (5 минут)

1. **Создайте бота.** В Telegram: `@BotFather` → `/newbot` → задайте имя
   (например `wb_tv_tracker_bot`) → скопируйте токен формата
   `123456789:ABCdef…` — это `TELEGRAM_BOT_TOKEN`.

2. **Создайте канал.** Telegram → меню → *New Channel*. Канал может
   быть публичным (с `@username`) или приватным.

3. **Добавьте бота админом канала.** Settings канала → Administrators
   → Add Administrator → найдите бота по имени → включите *Post
   Messages* (остальные права не нужны).

4. **Получите `chat_id`:**
   - Публичный канал: `chat_id = @your_channel_name` (со знаком `@`).
   - Приватный: отправьте в канал любое сообщение, потом откройте
     `https://api.telegram.org/bot<TOKEN>/getUpdates` — там будет
     `chat.id` вида `-1001234567890`.

5. **Положите оба значения в GitHub Secrets:**

   ```bash
   gh secret set TELEGRAM_BOT_TOKEN -b "123456789:ABCdef…"   -R visamexicomx-sys/Q
   gh secret set TELEGRAM_CHAT_ID   -b "@your_channel_name"  -R visamexicomx-sys/Q
   ```

   Или вручную: *Settings → Secrets and variables → Actions → New
   repository secret*.

6. **Готово.** Workflow `wb-tv-report.yml` подхватит секреты и будет
   постить в канал при каждом прогоне (по пятницам и при ручном
   `gh workflow run wb-tv-report.yml`). Если оба секрета не заданы —
   шаг тихо пропускается.

### Локальная проверка формата (без отправки)

```bash
node apify-wb-tv-scraper/scripts/notify-telegram.mjs \
  --models    apify-wb-tv-scraper/report/MODELS.json \
  --report    apify-wb-tv-scraper/report/REPORT.json \
  --anomalies apify-wb-tv-scraper/report/ANOMALIES.json \
  --dry-run
```

### Разовый пост из терминала

```bash
export TELEGRAM_BOT_TOKEN='123456789:ABCdef…'
export TELEGRAM_CHAT_ID='@your_channel_name'
node apify-wb-tv-scraper/scripts/notify-telegram.mjs
```

### Кастомизация

- Лимиты топов (25 ATL, 25 сделок, 20 падений) и пороги (`-10%` к
  прошлому снимку, `< 80% медианы` для in-model deal) задаются прямо в
  `scripts/notify-telegram.mjs` — секции `buildAtl`, `buildDeals`,
  `buildDrops`.
- Сообщения автоматически режутся на куски по ~3800 символов, чтобы
  не упереться в лимит Telegram 4096.

## Лицензия / отказ от ответственности

Учебный инструмент. Соблюдайте `robots.txt` и условия использования
Wildberries; запускайте только с разрешённой нагрузкой.
