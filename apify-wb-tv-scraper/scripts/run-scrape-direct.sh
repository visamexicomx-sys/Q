#!/usr/bin/env bash
# Apify-free pipeline. Same end-state as run-scrape.sh but uses
# scripts/wb-direct-scrape.mjs (hits search.wb.ru directly).
#
# Required env:
#   (none — but the host MUST have a Russian IP, or use WB_DEST_ID for region)
#
# Optional env:
#   WB_DEST_ID    — region code (default −1123300 = SPb)
#   OUT_DIR       — output dir (default apify-wb-tv-scraper/report)
#   MAX_PAGES     — pages per brand/sort (default 5)
#   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — same as run-scrape.sh

set -euo pipefail

OUT_DIR="${OUT_DIR:-apify-wb-tv-scraper/report}"
WB_DEST_ID="${WB_DEST_ID:--1123300}"
MAX_PAGES="${MAX_PAGES:-5}"
BRAND_WHITELIST="${BRAND_WHITELIST:-samsung,sony,tcl,hisense,haier,xiaomi,яндекс,sber}"

mkdir -p "$OUT_DIR"
RAW="$OUT_DIR/REPORT-raw.jsonl"

echo "▸ Direct WB scrape (no Apify) · dest=$WB_DEST_ID · pages=$MAX_PAGES"
node apify-wb-tv-scraper/scripts/wb-direct-scrape.mjs \
  --out "$RAW" \
  --dest "$WB_DEST_ID" \
  --max-pages "$MAX_PAGES" \
  --brands "$BRAND_WHITELIST"

echo "▸ Building report…"
node apify-wb-tv-scraper/scripts/build-report.mjs \
  --input "$RAW" --out-dir "$OUT_DIR" --brands "$BRAND_WHITELIST"

echo "▸ Tracking models…"
node apify-wb-tv-scraper/scripts/models.mjs \
  --input "$OUT_DIR/REPORT.json" --out-dir "$OUT_DIR"

echo "▸ Enriching…"
node apify-wb-tv-scraper/scripts/enrich-models.mjs \
  --models "$OUT_DIR/MODELS.json" \
  --history "$OUT_DIR/models-history.json" \
  --out-dir "$OUT_DIR"

echo "▸ Seller reputation…"
node apify-wb-tv-scraper/scripts/seller-rep.mjs \
  --history-dir "$OUT_DIR/history" \
  --models "$OUT_DIR/MODELS.json" \
  --out "$OUT_DIR/SELLERS.json"

echo "▸ Anomalies…"
HIST_DIR="$OUT_DIR/history"
mkdir -p "$HIST_DIR"
PREV_SNAPSHOT="$(ls -t "$HIST_DIR"/*.json 2>/dev/null | head -1 || true)"
PREV_ARG=()
[ -n "$PREV_SNAPSHOT" ] && PREV_ARG=(--prev "$PREV_SNAPSHOT")
node apify-wb-tv-scraper/scripts/anomalies.mjs \
  --input "$OUT_DIR/REPORT.json" --out-dir "$OUT_DIR" "${PREV_ARG[@]}"

STAMP=$(date -u +%Y-%m-%d)
cp "$OUT_DIR/REPORT.json" "$HIST_DIR/$STAMP.json"
ls -t "$HIST_DIR"/*.json | tail -n +31 | xargs -r rm -f

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "▸ Telegram notify…"
  node apify-wb-tv-scraper/scripts/notify-telegram.mjs \
    --models "$OUT_DIR/MODELS.json" \
    --report "$OUT_DIR/REPORT.json" \
    --anomalies "$OUT_DIR/ANOMALIES.json" \
    || echo "::warning::notify failed"

  echo "▸ Alerts…"
  node apify-wb-tv-scraper/scripts/alerts.mjs \
    --models "$OUT_DIR/MODELS.json" \
    --history "$OUT_DIR/models-history.json" \
    --state "$OUT_DIR/alerts-state.json" \
    || echo "::warning::alerts failed"

  echo "▸ Watchlist…"
  node apify-wb-tv-scraper/scripts/watchlist-check.mjs \
    --models "$OUT_DIR/MODELS.json" \
    --watchlist "$OUT_DIR/watchlist.json" \
    --state "$OUT_DIR/alerts-state.json" \
    || echo "::warning::watchlist failed"
fi

rm -f "$RAW"
echo "▸ Done."
