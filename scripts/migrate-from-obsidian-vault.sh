#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/Obsidian-Vault [destination]" >&2
  exit 2
fi

SOURCE="$(cd "$1" && pwd)"
DEST="${2:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
DEST="$(cd "$DEST" && pwd)"

if [[ ! -d "$SOURCE/.obsidian" || ! -d "$SOURCE/90_System" ]]; then
  echo "Source does not look like Obsidian-Vault: $SOURCE" >&2
  exit 2
fi
if [[ "$SOURCE" == "$DEST" ]]; then
  echo "Source and destination must be different repositories." >&2
  exit 2
fi

copy_dir() {
  local rel="$1"
  if [[ -d "$SOURCE/$rel" ]]; then
    mkdir -p "$DEST/$rel"
    rsync -a --delete "$SOURCE/$rel/" "$DEST/$rel/"
  fi
}

copy_file() {
  local rel="$1"
  if [[ -f "$SOURCE/$rel" ]]; then
    mkdir -p "$DEST/$(dirname "$rel")"
    cp -p "$SOURCE/$rel" "$DEST/$rel"
  fi
}

echo "==> Copying capture content"
copy_dir "00_Capture"

echo "==> Copying Base-backed collections (Contacts excluded)"
for rel in \
  "20_Personal_Life/22_Finance" \
  "20_Personal_Life/23_Places" \
  "20_Personal_Life/24_Book_Tracker" \
  "20_Personal_Life/25_Media_Tracker" \
  "20_Personal_Life/26_Food_&_Drinks" \
  "20_Personal_Life/27_Game_Tracker" \
  "20_Personal_Life/33_Bodybuilding"
do
  copy_dir "$rel"
done
rm -rf "$DEST/20_Personal_Life/29_Contact"

echo "==> Copying reusable vault structure"
for rel in \
  "40_Academics" \
  "60_Digital_Library" \
  "70_Interests_&_Research" \
  "99_Archives"
do
  copy_dir "$rel"
done

echo "==> Copying Obsidian configuration and requested plugins"
for rel in \
  ".obsidian/app.json" \
  ".obsidian/appearance.json" \
  ".obsidian/canvas.json" \
  ".obsidian/command-palette.json" \
  ".obsidian/community-plugins.json" \
  ".obsidian/core-plugins.json" \
  ".obsidian/daily-notes.json" \
  ".obsidian/graph.json" \
  ".obsidian/hotkeys.json" \
  ".obsidian/note-composer.json" \
  ".obsidian/page-preview.json" \
  ".obsidian/templates.json" \
  ".obsidian/webviewer.json"
do
  copy_file "$rel"
done

copy_dir ".obsidian/snippets"
copy_dir ".obsidian/icons"
copy_dir ".obsidian/dataview"
copy_dir ".obsidian/plugins/custom-views"
copy_dir ".obsidian/plugins/homepage"
copy_dir ".obsidian/plugins/obsidian-style-settings"
copy_dir ".obsidian/plugins/templater-obsidian"
copy_dir ".obsidian/plugins/places-weather"

# Never import transient/plugin state that is tied to one user's history.
rm -f "$DEST/.obsidian/file-recovery.json"
rm -f "$DEST/.obsidian/workspace.json" "$DEST/.obsidian/workspace-mobile.json"
rm -f "$DEST/.obsidian/plugins/obsidian-spaced-repetition/data.json"

echo "==> Copying system sources, scripts, templates, schedule and dashboard"
copy_dir "90_System/92_Scripts"
copy_dir "90_System/93_Configuration/Custom_Views"
copy_dir "90_System/95_Media_Assets/Dashboard"
copy_dir "90_System/97_Daily_Schedule"
copy_dir "90_System/98_Homepage"

# Copy templates except the four files that Abyssal keeps as English-sanitized variants.
if [[ -d "$SOURCE/90_System/91_Templates" ]]; then
  mkdir -p "$DEST/90_System/91_Templates"
  rsync -a "$SOURCE/90_System/91_Templates/" "$DEST/90_System/91_Templates/" \
    --exclude 'Teaching_Session_Outline.md' \
    --exclude 'Vocabulary_Learning_Template.md' \
    --exclude 'Journal_Template.md' \
    --exclude 'Movie_Template.md'
fi

# Homepage V2 is intentionally not part of Abyssal-Vault.
rm -f \
  "$DEST/90_System/93_Configuration/Custom_Views/HomepageV2.css" \
  "$DEST/90_System/93_Configuration/Custom_Views/HomepageV2.html" \
  "$DEST/90_System/93_Configuration/Custom_Views/HomepageV2.js" \
  "$DEST/90_System/93_Configuration/Custom_Views/.homepage-edit-lock.json"
rm -rf "$DEST/90_System/98_Homepage/V2"

DEST="$DEST" python3 <<'PY'
import json
import os
import re
from pathlib import Path

root = Path(os.environ["DEST"])

# Sanitize Custom Views runtime data while preserving all non-Homepage-V2 views.
p = root / ".obsidian/plugins/custom-views/data.json"
if p.exists():
    data = json.loads(p.read_text(encoding="utf-8"))
    views = data.get("views")
    if isinstance(views, list):
        data["views"] = [v for v in views if not (
            isinstance(v, dict) and (
                str(v.get("id", "")).strip().lower() == "homepage-v2" or
                str(v.get("name", "")).strip().lower() == "homepage v2"
            )
        )]
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Prevent the builder from regenerating Homepage V2.
p = root / "90_System/92_Scripts/Custom_Views/build-custom-views.mjs"
if p.exists():
    text = p.read_text(encoding="utf-8")
    text = re.sub(
        r'const homepageTemplate = readSource\("HomepageV2\\.html"\);\n'
        r'const homepageCss = readSource\("HomepageV2\\.css"\);\n'
        r'const homepageJs = readSource\("HomepageV2\\.js"\);\n',
        "",
        text,
    )
    text = re.sub(
        r'\n\s*\{\n\s*id: "homepage-v2",.*?\n\s*\},(?=\n\s*\{\n\s*id: "journal-daily-folio-v1")',
        "",
        text,
        flags=re.S,
    )
    p.write_text(text, encoding="utf-8")

# Remove the personal photo from the classic dashboard while keeping generic dashboard assets.
p = root / "90_System/98_Homepage/Homepage.md"
if p.exists():
    lines = [line for line in p.read_text(encoding="utf-8").splitlines()
             if "797722956_17919373971425474_540898127545340166_n.jpg" not in line]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Make the dashboard calendar portable across vault names.
p = root / "90_System/92_Scripts/Dataview/homepage/dashboard-calendar.js"
if p.exists():
    text = p.read_text(encoding="utf-8")
    text = re.sub(r'const VAULT\s*=\s*["\']Obsidian-Vault["\'];',
                  'const VAULT = dv.app.vault.getName();', text)
    p.write_text(text, encoding="utf-8")

# Consumers should use local settings first, with the committed example only as a safe fallback.
for p in root.rglob("*"):
    if not p.is_file() or p.suffix.lower() not in {".js", ".mjs", ".md"}:
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    original = text
    text = text.replace(
        'dv.page("90_System/93_Configuration/settings")',
        '(dv.page("90_System/93_Configuration/settings.local") || dv.page("90_System/93_Configuration/settings.example"))',
    )
    text = text.replace(
        '"90_System/93_Configuration/settings.md"',
        '"90_System/93_Configuration/settings.local.md"',
    )
    if text != original:
        p.write_text(text, encoding="utf-8")

# Fix stale Book template folder mapping in Templater data.
p = root / ".obsidian/plugins/templater-obsidian/data.json"
if p.exists():
    text = p.read_text(encoding="utf-8")
    text = text.replace(
        "10_Projects/12_Personal_Tracks/Book_Tracker/Books",
        "20_Personal_Life/24_Book_Tracker/Books",
    )
    p.write_text(text, encoding="utf-8")

# Ensure project-specific plugins/submodules are not part of the generic clone.
p = root / ".obsidian/community-plugins.json"
if p.exists():
    plugins = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(plugins, list):
        plugins = [x for x in plugins if str(x).lower() not in {"flashscript", "ledge", "veil"}]
    p.write_text(json.dumps(plugins, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

# The committed example config remains authoritative and contains placeholders only.
cat > "$DEST/90_System/93_Configuration/settings.example.md" <<'EOF'
---
type: vault-settings
vault_name: Abyssal-Vault
username: "fill in your username"
start_date: "fill in your start_date"
callout_path: 90_System/97_Daily_Schedule
schedule_heading: Daily Schedule
exercise_heading: Calisthenics
cardio_heading: Cardio
openweathermap_key: "fill in your openweathermap_api_key"
openweathermap_city: "fill in your city"
openweathermap_unit: metric
tmdb_key: "fill in your tmdb_api_key"
spoonacular_key: "fill in your spoonacular_api_key"
rawg_api_key: "fill in your rawg_api_key"
steam_api_key: "fill in your steam_api_key"
steam_id: "fill in your steam_id"
gog_heroic_auth_path: "fill in your gog_heroic_auth_path"
gog_locale: en-US
FinanceSchema: 1
FinanceBook: default
BookCurrency: USD
DisplayLocale: auto
CurrencyDisplay: symbol
NegativeFormat: standard
WeekStartsOn: monday
FiscalYearStartMonth: 1
Budgets: {}
---

# Vault settings example

Copy this file to `settings.local.md` and replace only the placeholders for features you use. `settings.local.md` must remain untracked.

No recovery key is required by Abyssal-Vault. API keys, account identifiers and machine-local authentication paths belong only in `settings.local.md`.
EOF
rm -f "$DEST/90_System/93_Configuration/settings.md"

# Keep private/local configuration and transient Obsidian state out of Git.
touch "$DEST/.gitignore"
for rule in \
  '90_System/93_Configuration/settings.local.md' \
  '.obsidian/workspace*.json' \
  '.obsidian/file-recovery.json' \
  '.obsidian/cache/' \
  '.env' \
  '.env.*'
do
  grep -qxF "$rule" "$DEST/.gitignore" || echo "$rule" >> "$DEST/.gitignore"
done

# Hard safety checks.
if [[ -e "$DEST/20_Personal_Life/29_Contact" ]]; then
  echo "ERROR: Contact data exists in destination." >&2
  exit 1
fi
if grep -RIl --exclude-dir=.git 'mega_recovery_key' "$DEST" >/dev/null; then
  echo "ERROR: mega_recovery_key leaked into destination." >&2
  exit 1
fi
if find "$DEST/90_System/93_Configuration/Custom_Views" -maxdepth 1 -iname 'HomepageV2*' -print -quit 2>/dev/null | grep -q .; then
  echo "ERROR: Homepage V2 source leaked into destination." >&2
  exit 1
fi
if [[ -e "$DEST/90_System/98_Homepage/V2" ]]; then
  echo "ERROR: Homepage V2 dashboard tree exists in destination." >&2
  exit 1
fi

echo "==> Migration complete"
echo "Review with: git -C '$DEST' status --short"
echo "Then scan before commit: grep -RInE '(api[_-]?key|token|secret|password|recovery)' '$DEST/90_System' '$DEST/.obsidian'"
