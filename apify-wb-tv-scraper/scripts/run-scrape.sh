#!/usr/bin/env bash
# Run the WB TV scrape end-to-end: launches N parallel powerai runs,
# combines their datasets, and post-processes into REPORT.md / REPORT.json.
#
# Required env vars:
#   APIFY_TOKEN — your Apify personal token (apify_api_…)
#
# Optional env vars:
#   APIFY_ACTOR_ID — defaults to powerai~wildberries-products-search-scraper
#   OUT_DIR        — defaults to apify-wb-tv-scraper/report (relative to repo root)
#   MAX_ITEMS      — maxItems per individual powerai run (default 200)
#
# Exits non-zero if any run fails or no items are collected.

set -euo pipefail

: "${APIFY_TOKEN:?APIFY_TOKEN env var is required}"
ACTOR="${APIFY_ACTOR_ID:-powerai~wildberries-products-search-scraper}"
OUT_DIR="${OUT_DIR:-apify-wb-tv-scraper/report}"
MAX_ITEMS="${MAX_ITEMS:-200}"

mkdir -p "$OUT_DIR"
COMBINED="$(mktemp -t wb-combined.XXXXXX.json)"
trap 'rm -f "$COMBINED"' EXIT
: > "$COMBINED"

# Whitelist: only these 8 brands. Each gets 2 sort orders (popular + priceup) for
# better coverage of both bestsellers and budget end of the line-up.
QUERIES=(
  'sort=popular&search=samsung+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=samsung+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=sony+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=sony+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=tcl+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=tcl+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=hisense+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=hisense+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=haier+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=haier+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=xiaomi+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=xiaomi+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=%D1%8F%D0%BD%D0%B4%D0%B5%D0%BA%D1%81+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=%D1%8F%D0%BD%D0%B4%D0%B5%D0%BA%D1%81+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=sber+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=priceup&search=%D1%81%D0%B1%D0%B5%D1%80+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
)

BRAND_WHITELIST="${BRAND_WHITELIST:-samsung,sony,tcl,hisense,haier,xiaomi,яндекс,sber}"

echo "▸ Actor: $ACTOR"
echo "▸ Queries: ${#QUERIES[@]}"
echo "▸ Out: $OUT_DIR"

start_run () {
  local qs="$1"
  local url="https://www.wildberries.ru/catalog/0/search.aspx?${qs}"
  local payload
  payload=$(jq -nc --arg u "$url" --argjson n "$MAX_ITEMS" \
    '{searchUrl:$u, maxItems:$n, proxyConfiguration:{useApifyProxy:false}}')
  curl -fsSL -X POST \
    "https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}&memory=2048&timeout=900" \
    -H "Content-Type: application/json" -d "$payload" \
    | jq -r '.data.id'
}

MAX_PARALLEL="${MAX_PARALLEL:-4}"   # FREE plan: 8GB memory cap, each run = 2GB

declare -a RUN_IDS=()
declare -A DONE=()

wait_until_capacity () {
  local cap="$1"
  while :; do
    local running=0
    for rid in "${RUN_IDS[@]}"; do
      [ -n "${DONE[$rid]:-}" ] && continue
      st=$(curl -fsSL "https://api.apify.com/v2/actor-runs/${rid}?token=${APIFY_TOKEN}" | jq -r '.data.status')
      case "$st" in
        SUCCEEDED) DONE[$rid]=ok ;;
        FAILED|ABORTED|TIMED-OUT|TIMING-OUT|ABORTING)
          echo "::warning::run $rid finished with $st"
          DONE[$rid]=fail ;;
        *) running=$((running+1)) ;;
      esac
    done
    [ "$running" -lt "$cap" ] && break
    sleep 10
  done
}

for q in "${QUERIES[@]}"; do
  wait_until_capacity "$MAX_PARALLEL"
  rid=$(start_run "$q") || { echo "::warning::failed to start run for $q"; continue; }
  [ -n "$rid" ] || { echo "::warning::no run id for $q"; continue; }
  RUN_IDS+=("$rid")
  echo "  ▸ started: $rid  ($q)"
done

echo "▸ Waiting for final ${#RUN_IDS[@]} runs to drain…"
for _ in $(seq 1 80); do
  pending=0
  for rid in "${RUN_IDS[@]}"; do
    [ -n "${DONE[$rid]:-}" ] && continue
    st=$(curl -fsSL "https://api.apify.com/v2/actor-runs/${rid}?token=${APIFY_TOKEN}" | jq -r '.data.status')
    case "$st" in
      SUCCEEDED) DONE[$rid]=ok ;;
      FAILED|ABORTED|TIMED-OUT|TIMING-OUT|ABORTING)
        echo "::warning::run $rid finished with $st"
        DONE[$rid]=fail ;;
      *) pending=$((pending+1)) ;;
    esac
  done
  echo "  ▸ pending=$pending done=$(( ${#DONE[@]} ))"
  [ "$pending" -eq 0 ] && break
  sleep 15
done

ok=0; fail=0
for rid in "${RUN_IDS[@]}"; do
  if [ "${DONE[$rid]:-}" = "ok" ]; then
    ds=$(curl -fsSL "https://api.apify.com/v2/actor-runs/${rid}?token=${APIFY_TOKEN}" | jq -r '.data.defaultDatasetId')
    cnt=$(curl -fsSL "https://api.apify.com/v2/datasets/${ds}/items?token=${APIFY_TOKEN}&limit=5000" | jq 'length')
    echo "  ▸ run $rid → $cnt items"
    curl -fsSL "https://api.apify.com/v2/datasets/${ds}/items?token=${APIFY_TOKEN}&limit=5000" \
      | jq -c '.[]' >> "$COMBINED"
    ok=$((ok+1))
  else
    fail=$((fail+1))
  fi
done

total=$(wc -l < "$COMBINED")
echo "▸ Collected lines: $total (ok=$ok fail=$fail)"
if [ "$total" -eq 0 ]; then
  echo "::error::no items collected — bailing out"
  exit 2
fi

echo "▸ Building report…"
node apify-wb-tv-scraper/scripts/build-report.mjs \
  --input "$COMBINED" --out-dir "$OUT_DIR" --brands "$BRAND_WHITELIST"

echo "▸ Tracking models…"
node apify-wb-tv-scraper/scripts/models.mjs \
  --input "$OUT_DIR/REPORT.json" --out-dir "$OUT_DIR"

echo "▸ Detecting anomalies…"
HIST_DIR="$OUT_DIR/history"
mkdir -p "$HIST_DIR"
# pick the most recent previous snapshot (if any) before we overwrite
PREV_SNAPSHOT="$(ls -t "$HIST_DIR"/*.json 2>/dev/null | head -1 || true)"
PREV_ARG=()
if [ -n "$PREV_SNAPSHOT" ]; then
  echo "  using previous snapshot: $PREV_SNAPSHOT"
  PREV_ARG=(--prev "$PREV_SNAPSHOT")
else
  echo "  no previous snapshot yet — trend sections will be skipped"
fi
node apify-wb-tv-scraper/scripts/anomalies.mjs \
  --input "$OUT_DIR/REPORT.json" --out-dir "$OUT_DIR" "${PREV_ARG[@]}"

# rotate: snapshot current REPORT.json into history/YYYY-MM-DD.json, keep last 30
STAMP=$(date -u +%Y-%m-%d)
cp "$OUT_DIR/REPORT.json" "$HIST_DIR/$STAMP.json"
ls -t "$HIST_DIR"/*.json | tail -n +31 | xargs -r rm -f

# optional Telegram notification (no-op if TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID unset)
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "▸ Posting summary to Telegram…"
  REPO_URL_ARG=()
  if [ -n "${REPO_URL:-}" ]; then
    REPO_URL_ARG=(--repo-url "$REPO_URL")
  fi
  node apify-wb-tv-scraper/scripts/notify-telegram.mjs \
    --models "$OUT_DIR/MODELS.json" \
    --report "$OUT_DIR/REPORT.json" \
    --anomalies "$OUT_DIR/ANOMALIES.json" \
    "${REPO_URL_ARG[@]}" || echo "::warning::telegram notify failed (non-fatal)"

  echo "▸ Broadcasting hot deals + sharp price changes…"
  node apify-wb-tv-scraper/scripts/alerts.mjs \
    --models "$OUT_DIR/MODELS.json" \
    --history "$OUT_DIR/models-history.json" \
    --state "$OUT_DIR/alerts-state.json" \
    || echo "::warning::alerts broadcast failed (non-fatal)"
fi

echo "▸ Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR"
