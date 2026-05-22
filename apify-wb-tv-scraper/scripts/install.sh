#!/usr/bin/env bash
# One-shot installer + validator for the WB TV Tracker.
#
# Runs the entire post-process pipeline on whatever data is already in
# report/ (no scraping — those need either Apify or RU egress as documented
# in docs/SCRAPER-WITHOUT-APIFY.md). Validates every script, then prints a
# checklist of what's wired up vs. what still needs credentials.
#
# Usage:
#   bash apify-wb-tv-scraper/scripts/install.sh            # validate + post-process
#   bash apify-wb-tv-scraper/scripts/install.sh --check    # validation only

set -euo pipefail
cd "$(dirname "$0")/../.."

OUT_DIR="apify-wb-tv-scraper/report"
SCRIPT_DIR="apify-wb-tv-scraper/scripts"
CHECK_ONLY=0
for a in "$@"; do [ "$a" = "--check" ] && CHECK_ONLY=1; done

# -------- env / tools ---------------------------------------------------------

cyan()   { printf '\033[36m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }

cyan "▸ Checking node…"
command -v node >/dev/null || { red "node not installed"; exit 1; }
NV=$(node -v); echo "  node $NV"
[[ "${NV:1:2}" -ge 20 ]] || { red "  need node ≥20, got $NV"; exit 1; }

cyan "▸ Syntax-checking scripts…"
fail=0
for f in "$SCRIPT_DIR"/*.mjs "apify-wb-tv-scraper/worker/index.mjs"; do
    if node --check "$f" 2>/dev/null; then
        printf '  \033[32m✓\033[0m %s\n' "$f"
    else
        printf '  \033[31m✗\033[0m %s\n' "$f"
        node --check "$f" || true
        fail=1
    fi
done
[ $fail -eq 0 ] || { red "syntax errors above"; exit 1; }

cyan "▸ Verifying expected data files…"
required=(REPORT.json MODELS.json models-history.json)
missing=0
for f in "${required[@]}"; do
    if [ -f "$OUT_DIR/$f" ]; then
        printf '  \033[32m✓\033[0m %s\n' "$f"
    else
        printf '  \033[33m⚠\033[0m %s (missing — needs a scrape first)\n' "$f"
        missing=1
    fi
done

if [ $missing -eq 1 ] && [ $CHECK_ONLY -eq 0 ]; then
    yellow ""
    yellow "Нет данных для пост-обработки. Чтобы получить REPORT.json:"
    yellow "  • Apify-путь:     APIFY_TOKEN=… bash $SCRIPT_DIR/run-scrape.sh"
    yellow "  • Без Apify:      см. apify-wb-tv-scraper/docs/SCRAPER-WITHOUT-APIFY.md"
    yellow ""
fi

if [ $CHECK_ONLY -eq 1 ]; then
    green "✓ Validation only — done."
    exit 0
fi

if [ $missing -eq 0 ]; then
    cyan "▸ Running enrichment (velocity, near-ATL, panel-twins)…"
    node "$SCRIPT_DIR/enrich-models.mjs" \
        --models "$OUT_DIR/MODELS.json" \
        --history "$OUT_DIR/models-history.json" \
        --out-dir "$OUT_DIR"

    cyan "▸ Computing listing reputation…"
    node "$SCRIPT_DIR/seller-rep.mjs" \
        --history-dir "$OUT_DIR/history" \
        --models "$OUT_DIR/MODELS.json" \
        --out "$OUT_DIR/SELLERS.json" || true

    cyan "▸ Detecting anomalies…"
    HIST_DIR="$OUT_DIR/history"
    mkdir -p "$HIST_DIR"
    PREV_SNAPSHOT="$(ls -t "$HIST_DIR"/*.json 2>/dev/null | head -1 || true)"
    PREV_ARG=()
    [ -n "$PREV_SNAPSHOT" ] && PREV_ARG=(--prev "$PREV_SNAPSHOT")
    node "$SCRIPT_DIR/anomalies.mjs" \
        --input "$OUT_DIR/REPORT.json" --out-dir "$OUT_DIR" "${PREV_ARG[@]}"

    cyan "▸ Running bot dispatch smoke test…"
    TELEGRAM_BOT_TOKEN=dummy node "$SCRIPT_DIR/test-commands.mjs" 2>&1 | tail -1
fi

# -------- credentials checklist ----------------------------------------------

echo
cyan "▸ Credentials checklist"
check_env() {
    local name=$1 purpose=$2
    if [ -n "${!name:-}" ]; then
        printf '  \033[32m✓\033[0m %-22s — %s\n' "$name" "$purpose"
    else
        printf '  \033[33m·\033[0m %-22s — %s\n' "$name" "$purpose"
    fi
}
check_env APIFY_TOKEN          "Apify-путь скрапинга (опционально, есть бесплатная альтернатива)"
check_env TELEGRAM_BOT_TOKEN   "бот @Valet_pdc_bot — обязателен для алёртов и поллера"
check_env TELEGRAM_CHAT_ID     "куда слать алёрты (канал/DM)"
check_env ANTHROPIC_API_KEY    "Claude API — для умного weekly digest (иначе fallback)"
check_env GH_TOKEN             "Yandex Cloud Function — пушить REPORT-raw.jsonl в репу"

# -------- repo-side secrets (read from GH if gh CLI is around, else hint) ----

echo
cyan "▸ GitHub repository secrets needed (add via Settings → Secrets)"
echo "  APIFY_TOKEN            — для wb-tv-report.yml (Apify-путь)"
echo "  TELEGRAM_BOT_TOKEN     — для wb-tv-report.yml и wb-tv-postproc.yml"
echo "  TELEGRAM_CHAT_ID       — то же"
echo "  ANTHROPIC_API_KEY      — опц. для wb-tv-weekly-digest.yml"

# -------- worker / dashboard --------------------------------------------------

echo
cyan "▸ Cloudflare worker"
echo "  Deploy:   cd apify-wb-tv-scraper/worker && wrangler deploy"
echo "  Webhook:  curl 'https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://wb-tv-tracker-bot.<sub>.workers.dev/webhook'"
echo "  Optional: wrangler secret put GH_PAT   # only needed if /watch /unwatch via worker"

echo
cyan "▸ Static dashboard"
echo "  apify-wb-tv-scraper/report/dashboard.html"
echo "  Открыть локально: open apify-wb-tv-scraper/report/dashboard.html"
echo "  Хостинг (опц.): GitHub Pages → Settings → Pages → main branch → /apify-wb-tv-scraper/report"

# -------- deployment paths ----------------------------------------------------

echo
cyan "▸ Daily scrape — выбери ОДИН путь"
echo
echo "  A) Apify (платный \$5/мес FREE)"
echo "     • GH secret APIFY_TOKEN установлен"
echo "     • Workflow .github/workflows/wb-tv-report.yml — cron 06:00 UTC"
echo
echo "  B) Yandex Cloud Functions (бесплатно навсегда)"
echo "     • Создать функцию + timer trigger (см. docs/SCRAPER-WITHOUT-APIFY.md)"
echo "     • Workflow .github/workflows/wb-tv-postproc.yml сработает на push REPORT-raw.jsonl"
echo
echo "  C) RU VPS (~90₽/мес timeweb.cloud)"
echo "     • cron 0 6 * * * bash apify-wb-tv-scraper/scripts/run-scrape-direct.sh"
echo
echo "  D) Локально с RU VPN"
echo "     • bash apify-wb-tv-scraper/scripts/run-scrape-direct.sh"

echo
green "✓ install.sh complete."
