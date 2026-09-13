# Data Flows

This page shows how the major Abyssal Vault subsystems transform source data into rendered interfaces.

## Daily system

```text
System date
   ↓
schedule-callout.js / exercise-callout.js / cardio-callout.js
   ↓
01_Monday.md ... 07_Sunday.md
   ↓
Selected heading
   ↓
Homepage / Journal context
```

Edit the weekday source note once; consumers receive the updated content dynamically.

## Places

```text
Place_Template.md
   ↓
Place note + coordinates
   ├── Map.base
   ├── Places Custom View
   ├── Homepage Globe
   ├── Vector Map Overlay
   └── Weather Runtime
```

There is no separate Globe database. The same Place records are reused everywhere.

## Movies and TV

```text
Movie_Template.md / TV_Show_Template.md
   ↓
TMDB search + details + credits
   ↓
tmdb_media.js
   ↓
Local poster + backdrop (+ Movie barcode)
   ↓
Markdown media record
   ↓
Media_Tracker.base
```

## Games

Catalog metadata and personal platform statistics are intentionally separated.

```text
Game_Template.md
   ↓
game_metadata.js
   ↓
Steam Store / RAWG
   ↓
Game catalog record
```

```text
Existing Game note
   ↓
Game_Stats_Sync.md
   ↓
game_platform_stats.js
   ↓
Steam / GOG personal statistics
   ↓
Playtime + achievements + completion
```

## Recipes

```text
Recipe_Template.md
   ↓
spoonacular_recipe.js
   ↓
Spoonacular / TheMealDB
   ↓
Normalized schema + local image
   ↓
Recipe Markdown
   ↓
FoodnDrinks.base
```

## Finance

```text
Homepage
   ↓
finance-quick-add.js
   ↓
Expense / Income / Transfer / Account / Subscription
   ↓
Markdown record
   ↓
Finance.base
```

The Markdown record remains the database; the Homepage form is only a creation interface.

## Settings Custom View

```text
Settings.html + Settings.css + Settings.js
   ↓
Sync_Settings_Custom_View.md
   ↓
Custom Views plugin runtime copy
```

## Places Custom View

```text
Places/view.json + template.html + CSS + JS modules
   ↓
Sync_Places_Custom_View.md
   ↓
Assembled places-v1 Custom View
```

The files inside the repository are authoritative. Plugin-stored copies are runtime targets.