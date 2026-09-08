#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/Obsidian-Vault [destination]" >&2
  exit 2
fi

SOURCE="$(cd "$1" && pwd)"
DEST="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
DEST="$(cd "$DEST" && pwd)"

if [[ ! -d "$SOURCE/90_System" ]]; then
  echo "Source does not look like Obsidian-Vault: $SOURCE" >&2
  exit 2
fi
if [[ "$SOURCE" == "$DEST" ]]; then
  echo "Source and destination must be different repositories." >&2
  exit 2
fi

ensure_dir() {
  local rel="$1"
  mkdir -p "$DEST/$rel"
  if ! find "$DEST/$rel" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
    : > "$DEST/$rel/.gitkeep"
  fi
}

reset_empty_dir() {
  local rel="$1"
  rm -rf "$DEST/$rel"
  mkdir -p "$DEST/$rel"
  : > "$DEST/$rel/.gitkeep"
}

copy_dir() {
  local rel="$1"
  if [[ -d "$SOURCE/$rel" ]]; then
    mkdir -p "$DEST/$rel"
    rsync -a --delete "$SOURCE/$rel/" "$DEST/$rel/"
  else
    reset_empty_dir "$rel"
  fi
}

echo "==> Ensuring numbered top-level vault skeleton"
for rel in \
  "00_Capture" \
  "10_Projects" \
  "20_Personal_Life" \
  "40_Academics" \
  "60_Digital_Library" \
  "70_Interests_&_Research" \
  "90_System" \
  "99_Archives"
do
  ensure_dir "$rel"
done

echo "==> Importing allowed template notes"
mkdir -p "$DEST/90_System/91_Templates"
if [[ -d "$SOURCE/90_System/91_Templates" ]]; then
  rsync -a --delete "$SOURCE/90_System/91_Templates/" "$DEST/90_System/91_Templates/" \
    --exclude 'Onion_Site_Template.md' \
    --exclude 'Teaching_Session_Outline.md' \
    --exclude 'Vocabulary_Learning_Template.md' \
    --exclude 'Journal_Template.md' \
    --exclude 'Movie_Template.md' \
    --exclude 'TV_Show_Template.md' \
    --exclude 'Zettelkasten_Template.md'
fi
rm -f \
  "$DEST/90_System/91_Templates/Onion_Site_Template.md" \
  "$DEST/90_System/91_Templates/Teaching_Session_Outline.md" \
  "$DEST/90_System/91_Templates/Vocabulary_Learning_Template.md"
rm -f "$DEST/90_System/91_Templates/.gitkeep"

echo "==> Keeping system-only placeholders empty"
for rel in \
  "90_System/92_Scripts" \
  "90_System/93_Configuration" \
  "90_System/95_Media_Assets"
do
  reset_empty_dir "$rel"
done

echo "==> Mirroring 96, 97 and 98"
copy_dir "90_System/96_Auto_Attachments"
copy_dir "90_System/97_Daily_Schedule"
copy_dir "90_System/98_Homepage"

# Keep the classic homepage reusable by removing the source vault's personal-photo embed.
python3 - "$DEST" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
p = root / "90_System/98_Homepage/Homepage.md"
if p.exists():
    marker = "797722956_17919373971425474_540898127545340166_n.jpg"
    lines = [line for line in p.read_text(encoding="utf-8").splitlines() if marker not in line]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

echo "==> Migration complete"
echo "Review with: git -C '$DEST' status --short"
