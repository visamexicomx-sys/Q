#!/usr/bin/env bash
# One-shot local setup for the Bybit options bot.
#   - creates a virtualenv and installs deps
#   - interactively writes a gitignored .env (secrets never touch git)
#   - runs a connectivity + Telegram check
#
# Run from the bybit-options-bot/ directory:  bash deploy/setup.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env"

echo "== bybit-options-bot setup =="
echo

# --- venv + deps ---
if [ ! -d ".venv" ]; then
  echo "Creating virtualenv (.venv)..."
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "Dependencies installed."
echo

# --- .env ---
if [ -f "$ENV_FILE" ]; then
  read -r -p ".env already exists. Overwrite? [y/N] " ow
  [[ "${ow:-N}" =~ ^[Yy]$ ]] || { echo "Keeping existing .env."; SKIP_ENV=1; }
fi

if [ -z "${SKIP_ENV:-}" ]; then
  echo "Enter Bybit API credentials (use a NEWLY CREATED key; never reuse a leaked one)."
  echo "Recommended permissions: Contract+Options Trade & Read. NO withdrawal. IP-whitelist this host."
  read -r -p "  BYBIT_API_KEY: " API_KEY
  read -r -s -p "  BYBIT_API_SECRET (hidden): " API_SECRET; echo
  echo
  read -r -p "Use MAINNET (real funds)? [y/N] " MAIN
  if [[ "${MAIN:-N}" =~ ^[Yy]$ ]]; then MAINNET=true; else MAINNET=false; fi
  read -r -p "Enable LIVE trading now (send real orders)? [y/N] " LIVE_IN
  if [[ "${LIVE_IN:-N}" =~ ^[Yy]$ ]]; then LIVE=true; else LIVE=false; fi
  echo
  read -r -p "Enable Telegram alerts? [y/N] " TG_IN
  if [[ "${TG_IN:-N}" =~ ^[Yy]$ ]]; then
    TG_ENABLED=true
    read -r -p "  TELEGRAM_BOT_TOKEN: " TG_TOKEN
    read -r -p "  TELEGRAM_CHAT_ID: " TG_CHAT
  else
    TG_ENABLED=false; TG_TOKEN=""; TG_CHAT=""
  fi

  umask 077
  cat > "$ENV_FILE" <<EOF
BYBIT_API_KEY=${API_KEY}
BYBIT_API_SECRET=${API_SECRET}
BYBIT_LIVE=${LIVE}
BYBIT_MAINNET=${MAINNET}
TELEGRAM_ENABLED=${TG_ENABLED}
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
TELEGRAM_CHAT_ID=${TG_CHAT}
EOF
  chmod 600 "$ENV_FILE"
  echo "Wrote $ENV_FILE (chmod 600, gitignored)."
fi
echo

# --- checks ---
set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a
echo "Running connectivity check..."
python run.py --check || true
if [ "${TELEGRAM_ENABLED:-false}" = "true" ]; then
  echo "Testing Telegram..."
  python run.py --test-telegram || true
fi

echo
echo "Done. Next:"
echo "  Dry-run / scan only:   source .env && python run.py --no-exec"
echo "  Single cycle:          source .env && python run.py --once"
echo "  24/7 service:          see deploy/bybit-options-bot.service"
echo "  EMERGENCY STOP:        touch .KILL   (removes all trading instantly)"
