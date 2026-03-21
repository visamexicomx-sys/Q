#!/usr/bin/env bash
# Downloads all files from https://repodatos.atdt.gob.mx/api_update/
set -euo pipefail

BASE_URL="https://repodatos.atdt.gob.mx/api_update"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/data/repodatos"
PARALLEL=8

mkdir -p "$OUT_DIR"

download_file() {
  local url="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [[ -f "$dest" ]]; then
    echo "[SKIP] $dest"
    return
  fi
  curl -sf --retry 3 --retry-delay 2 -o "$dest" "$url" && echo "[OK] $dest" || echo "[FAIL] $url"
}

export -f download_file

# Collect all file URLs and their local paths into a temp file
TMP=$(mktemp)

echo "Fetching agency list..."
agencies=$(curl -sf "$BASE_URL/" | python3 -c "import json,sys; [print(d['name']) for d in json.load(sys.stdin) if d['type']=='directory']")

for agency in $agencies; do
  echo "  -> $agency"
  subdirs=$(curl -sf "$BASE_URL/$agency/" | python3 -c "import json,sys; data=json.load(sys.stdin); [print(d['name']+'|'+d['type']) for d in data]" 2>/dev/null || true)
  while IFS='|' read -r name type; do
    if [[ "$type" == "file" ]]; then
      echo "$BASE_URL/$agency/$name $OUT_DIR/$agency/$name" >> "$TMP"
    elif [[ "$type" == "directory" ]]; then
      files=$(curl -sf "$BASE_URL/$agency/$name/" | python3 -c "import json,sys; data=json.load(sys.stdin); [print(d['name']+'|'+d['type']) for d in data]" 2>/dev/null || true)
      while IFS='|' read -r fname ftype; do
        if [[ "$ftype" == "file" ]]; then
          echo "$BASE_URL/$agency/$name/$fname $OUT_DIR/$agency/$name/$fname" >> "$TMP"
        fi
      done <<< "$files"
    fi
  done <<< "$subdirs"
done

total=$(wc -l < "$TMP")
echo ""
echo "Found $total files. Downloading with $PARALLEL parallel workers..."

xargs -a "$TMP" -n2 -P"$PARALLEL" bash -c 'download_file "$@"' _

rm -f "$TMP"
echo ""
echo "Done. Files saved to: $OUT_DIR"
