#!/usr/bin/env bash
# One-command setup for the Wildberries TV report workflow.
#
# Configures the repo's GitHub Actions:
#   1. Stores APIFY_TOKEN as a Secret
#   2. Stores APIFY_ACTOR_ID as a Variable
#   3. Optionally dispatches the workflow on the current branch
#
# Prereqs:
#   - gh CLI installed and authenticated:        gh auth status
#   - Apify token just rotated in Apify Console: https://console.apify.com/account/integrations
#
# Usage:
#   APIFY_TOKEN=apify_api_xxxxxxxxxxxx \
#     ./apify-wb-tv-scraper/setup-actions.sh [--dispatch]
#
# Env overrides:
#   REPO            default: $(gh repo view --json nameWithOwner -q .nameWithOwner)
#   APIFY_ACTOR_ID  default: powerai~wildberries-products-search-scraper
#   BRANCH          default: current git branch

set -euo pipefail

REPO_DEFAULT="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')"
REPO="${REPO:-$REPO_DEFAULT}"
ACTOR_ID="${APIFY_ACTOR_ID:-powerai~wildberries-products-search-scraper}"
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)}"
WORKFLOW="wb-tv-report.yml"
DISPATCH=0
[[ "${1:-}" == "--dispatch" ]] && DISPATCH=1

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found. Install: https://cli.github.com/" >&2
  exit 1
fi

if [[ -z "${APIFY_TOKEN:-}" ]]; then
  echo "ERROR: APIFY_TOKEN env var required." >&2
  echo "Rotate at https://console.apify.com/account/integrations and re-run:" >&2
  echo "  APIFY_TOKEN=apify_api_xxx $0 [--dispatch]" >&2
  exit 1
fi

if ! [[ "$APIFY_TOKEN" =~ ^apify_api_[A-Za-z0-9]{20,}$ ]]; then
  echo "WARN: APIFY_TOKEN doesn't look like a real Apify token (expected apify_api_…)" >&2
fi

if [[ -z "$REPO" ]]; then
  echo "ERROR: cannot detect repo. Set REPO=owner/name or run inside a git repo with gh authed." >&2
  exit 1
fi

echo "▸ Repo:    $REPO"
echo "▸ Branch:  $BRANCH"
echo "▸ Actor:   $ACTOR_ID"
echo

echo "▸ Setting Secret APIFY_TOKEN…"
gh secret set APIFY_TOKEN --body "$APIFY_TOKEN" --repo "$REPO"

echo "▸ Setting Variable APIFY_ACTOR_ID…"
if gh variable list --repo "$REPO" --json name -q '.[].name' | grep -qx APIFY_ACTOR_ID; then
  gh variable set APIFY_ACTOR_ID --body "$ACTOR_ID" --repo "$REPO"
else
  gh variable set APIFY_ACTOR_ID --body "$ACTOR_ID" --repo "$REPO"
fi

if [[ "$DISPATCH" -eq 1 ]]; then
  echo "▸ Dispatching workflow $WORKFLOW on $BRANCH…"
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH" \
    -f query=телевизор -f topN=100 -f maxPages=100
  echo
  echo "▸ Watch progress:"
  echo "    gh run watch --repo $REPO"
else
  echo
  echo "✓ Secret + Variable set."
  echo "  Re-run with --dispatch to immediately trigger the workflow, or use:"
  echo "    gh workflow run $WORKFLOW --repo $REPO --ref $BRANCH"
fi
