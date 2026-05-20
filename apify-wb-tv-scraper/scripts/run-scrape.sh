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

QUERIES=(
  # broad sorts
  'sort=priceup&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=pricedown&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=rate&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=newly&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  # per diagonal (телевизор + size)
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+24'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+32'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+43'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+50'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+55'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+65'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+75'
  'sort=popular&search=%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80+85'
  # per brand
  'sort=popular&search=samsung+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=lg+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=sony+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=hisense+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=tcl+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=xiaomi+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
  'sort=popular&search=haier+%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80'
)

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

declare -a RUN_IDS=()
for q in "${QUERIES[@]}"; do
  rid=$(start_run "$q")
  [ -n "$rid" ] || { echo "::error::failed to start run for $q"; exit 1; }
  RUN_IDS+=("$rid")
  echo "  ▸ started: $rid  ($q)"
done

echo "▸ Waiting for ${#RUN_IDS[@]} runs…"
declare -A DONE=()
for _ in $(seq 1 80); do
  pending=0
  for rid in "${RUN_IDS[@]}"; do
    [ -n "${DONE[$rid]:-}" ] && continue
    st=$(curl -fsSL "https://api.apify.com/v2/actor-runs/${rid}?token=${APIFY_TOKEN}" | jq -r '.data.status')
    case "$st" in
      SUCCEEDED) DONE[$rid]=ok ;;
      FAILED|ABORTED|TIMED-OUT|TIMING-OUT|ABORTING)
        echo "::error::run $rid finished with $st"
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
node apify-wb-tv-scraper/scripts/build-report.mjs --input "$COMBINED" --out-dir "$OUT_DIR"

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

echo "▸ Done. Files in $OUT_DIR:"
ls -la "$OUT_DIR"
