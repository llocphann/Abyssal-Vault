# Dependencies

Abyssal Vault is intentionally modular, but many modules communicate through shared paths, frontmatter keys, and configuration values. This page summarizes the highest-impact dependencies.

## Configuration dependencies

| Change | Main consumers |
|---|---|
| `settings.md → vault_name` | Homepage identity/header. |
| `settings.md → username` | Homepage greeting. |
| `settings.md → start_date` | Vault-age calculation. |
| `settings.md → callout_path` | Schedule, Exercise, and Cardio renderers. |
| Daily heading names | Daily Schedule notes and their Dataview callout scripts. |
| OpenWeatherMap configuration | Homepage weather and Places weather runtime. |
| Finance configuration | Finance Quick Add and Finance defaults. |
| Globe configuration | Globe renderer and vector-map overlay. |
| `globe_source_folders` | Location discovery for the Globe/overlay. |

## Schema dependencies

| Schema area | Main consumers |
|---|---|
| Place fields | `Map.base`, food/drink `Places.base`, Places Custom View, Globe, vector overlay, weather. |
| Book fields | `Book_Tracker.base` and Book cards. |
| Movie fields | `Media_Tracker.base`, Movie ticket rendering, TMDB import. |
| TV fields | `Media_Tracker.base`, TV card rendering, TMDB import. |
| Game fields | `Game_Collection.base`, game metadata import, platform-stat synchronization. |
| Recipe fields | `FoodnDrinks.base` and recipe importer. |
| Finance fields | `Finance.base`, Finance Quick Add, Finance templates. |
| Exercise fields | `Bodybuilding.base` and exercise cards. |

## Path dependencies

Several workflows expect stable folder locations.

- Finance records are stored beneath `20_Personal_Life/22_Finance/Records`.
- Place discovery scans the configured Places/Food & Drinks source folders.
- Movie assets are stored under `90_System/95_Media_Assets/Movies`.
- TV assets are stored under `90_System/95_Media_Assets/TV_Series`.
- Game assets are stored under `90_System/95_Media_Assets/Games`.
- Recipe assets are stored under `90_System/95_Media_Assets/Recipes`.
- Daily Schedule sources live under the configured `callout_path`.
- Custom View source files live under `90_System/93_Configuration/Custom_Views`.

Moving one of these directories requires updating every consumer or configuration key that references it.

## Homepage dependencies

The Homepage composes several scripts but does not own their data.

```text
Homepage.md
├── info-headers.js
├── schedule-callout.js
├── globe-settings-init.js
├── globe-widget.js
├── globe-vector-map-overlay.js
├── exercise-callout.js
├── cardio-callout.js
└── finance-quick-add.js
```

The Globe scripts have an important runtime order:

```text
globe-settings-init.js
        ↓
globe-widget.js
        ↓
globe-vector-map-overlay.js
```

## Custom View dependencies

Settings source files are synchronized by `Sync_Settings_Custom_View.md` into `vault-settings-v1`.

Places source files are assembled and synchronized by `Sync_Places_Custom_View.md` into `places-v1`.

Editing only the plugin's internal stored copy risks losing changes when synchronization runs again.

## External-service dependencies

External services enrich local records but should not be treated as the permanent source of truth.

- **OpenWeatherMap** — current weather.
- **TMDB** — Movie and TV metadata/media paths.
- **Spoonacular / TheMealDB** — Recipe metadata.
- **Steam / RAWG** — Game catalog metadata.
- **Steam account APIs** — personal Game playtime and achievements.
- **GOG/Heroic** — optional personal Game statistics.
- **OpenFreeMap / OpenStreetMap ecosystem** — vector-map rendering/data attribution.

Generated or imported information is persisted into local Markdown/frontmatter and local media where the workflow supports it.