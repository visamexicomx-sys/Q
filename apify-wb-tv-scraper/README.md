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

В корне репо лежит workflow `.github/workflows/wb-tv-report.yml`,
который раз в неделю (и по кнопке `workflow_dispatch`) дёргает Apify
API, ждёт окончания прогона, скачивает `REPORT.md` + `REPORT.json` +
`dataset.csv` и коммитит их в `apify-wb-tv-scraper/report/`.

Чтобы он заработал, в репо нужно настроить:

| Где | Что | Зачем |
|-----|-----|-------|
| Settings → Secrets and variables → Actions → **Secrets** | `APIFY_TOKEN` | Токен Apify (`https://console.apify.com/account/integrations`) |
| Settings → Secrets and variables → Actions → **Variables** | `APIFY_ACTOR_ID` | ID собранного Actor, например `username~wildberries-tv-scraper` |

После этого Action можно запускать вручную через
**Actions → Wildberries TV report → Run workflow**, или ждать пятницы
06:00 UTC (расписание правится в самом yml).

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

## Лицензия / отказ от ответственности

Учебный инструмент. Соблюдайте `robots.txt` и условия использования
Wildberries; запускайте только с разрешённой нагрузкой.
