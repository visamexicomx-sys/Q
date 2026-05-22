# WB TV Tracker — без Apify

GitHub Actions runner живёт в США/EU → Wildberries геоблочит запрос. Apify обходит это через RU-прокси, но стоит $5/мес на FREE, а на Starter — $49.

Этот гайд — три способа получить ту же данную **бесплатно**, использовав публичный JSON-эндпоинт `search.wb.ru`, который вызывает сам wildberries.ru.

## Архитектура

```
RU-IP source            GitHub
─────────────           ──────
  scraper        push      Action `wb-tv-postproc`
  (YC / VPS) ──────────>   reads REPORT-raw.jsonl
                           → build-report → models → enrich
                           → anomalies → telegram alerts
                           → commits REPORT.json etc.
```

Скрипт скрапит → пишет `REPORT-raw.jsonl` в репу через GitHub Contents API → `wb-tv-postproc.yml` срабатывает на push этого пути и крутит всю обработку на обычном GitHub runner'е (никаких WB-запросов оттуда).

---

## Опция 1 — Yandex Cloud Functions (рекомендуется, бесплатно)

YC даёт **1 млн вызовов / 1 ГБ-час в месяц бесплатно**. Нам нужен 1 вызов / день, ~30 сек выполнения → пожизненно бесплатно.

### Шаги

```bash
# 1. Установить yc CLI
curl https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# 2. Авторизоваться
yc init

# 3. Создать сервисный аккаунт + ключ
yc iam service-account create --name wb-scraper
yc iam access-key create --service-account-name wb-scraper

# 4. Создать функцию
cd apify-wb-tv-scraper/scripts
yc serverless function create --name wb-tv-scraper

# 5. Залить код
yc serverless function version create \
  --function-name wb-tv-scraper \
  --runtime nodejs20 \
  --entrypoint wb-yandex-cloud-function.handler \
  --memory 512m \
  --execution-timeout 540s \
  --source-path . \
  --environment GH_TOKEN=ghp_xxxxxxxxxxxx,GH_REPO=visamexicomx-sys/Q,GH_BRANCH=claude/scrape-wildberries-tvs-oUS2f

# 6. Создать cron-триггер: каждый день в 09:00 МСК (06:00 UTC)
yc serverless trigger create timer \
  --name wb-tv-daily \
  --cron-expression "0 6 ? * * *" \
  --invoke-function-name wb-tv-scraper \
  --invoke-function-service-account-name wb-scraper
```

GH_TOKEN — это GitHub Personal Access Token (classic) со скоупом `repo` (или fine-grained с `Contents: write` на этой репе). Создать: https://github.com/settings/tokens

После этого: каждое утро функция вытащит каталог из WB, запушит `REPORT-raw.jsonl` в репу, `wb-tv-postproc.yml` подхватит и сделает всю аналитику + алёрты.

---

## Опция 2 — RU VPS + cron (~$3/мес)

Российские провайдеры с самыми дешёвыми VPS:
- timeweb.cloud — от 90 ₽/мес
- ihor.ru — от 99 ₽/мес
- ruvds.com — от 130 ₽/мес

### Шаги

```bash
# На VPS:
apt install -y nodejs git
git clone https://github.com/visamexicomx-sys/Q.git
cd Q
git checkout claude/scrape-wildberries-tvs-oUS2f

# Прогнать один раз:
bash apify-wb-tv-scraper/scripts/run-scrape-direct.sh

# Положить в cron — каждый день в 09:00 МСК:
crontab -e
0 6 * * * cd /root/Q && git pull --rebase \
  && bash apify-wb-tv-scraper/scripts/run-scrape-direct.sh \
  && git add apify-wb-tv-scraper/report \
  && git commit -m "chore: VPS scrape $(date -u +%Y-%m-%d)" \
  && git push
```

Telegram-секреты задать через `~/.bashrc`:
```bash
export TELEGRAM_BOT_TOKEN=8840...
export TELEGRAM_CHAT_ID=1312189374
```

Преимущество: нет вообще никакой задержки post-process — всё крутится на VPS, в репо льётся уже готовый `REPORT.json`.

---

## Опция 3 — локальный запуск с VPN

Самый дешёвый вариант для разовых прогонов: включить любой РФ VPN (`hideme`, `freevpn`) и запустить локально:

```bash
bash apify-wb-tv-scraper/scripts/run-scrape-direct.sh
git add apify-wb-tv-scraper/report
git commit -m "chore: manual scrape"
git push
```

Не годится для automation — но идеально для теста.

---

## Тестирование скрипта

```bash
# Сухая проверка (без push в репу). Свалится с exit 3 если ты не в RU.
node apify-wb-tv-scraper/scripts/wb-direct-scrape.mjs \
  --out /tmp/wb.jsonl --max-pages 1
wc -l /tmp/wb.jsonl
head -1 /tmp/wb.jsonl | jq
```

Ожидаемый вывод: `~100-150 уникальных товаров` (1 страница × 16 запросов).

---

## Когда что выбирать

| Сценарий | Лучший вариант |
|---|---|
| Хочу всё бесплатно и навсегда | **YC Functions** |
| Уже есть RU VPS / хочу контроль | **VPS + cron** |
| Просто хочу один скрап сейчас | **Локально с VPN** |
| Готов платить $5/мес и не возиться | Остаться на Apify |

## Лимиты эндпоинта

`search.wb.ru/exactmatch/ru/common/v9/search` — публичный, без авторизации, **БЕЗ rate-limit** в разумных пределах. 100 запросов/мин — норма. Мы делаем ~80 в день (16 запросов × 5 страниц) — это безопасно с большим запасом.

Эндпоинт может слегка меняться (WB иногда обновляет до v10/v11). Если скрипт начнёт возвращать 0 — проверьте URL в DevTools на wildberries.ru → Network → fetch with `search.wb.ru` в имени.
