# Places

Places is split into three cooperating pieces:

1. `20_Personal_Life/23_Places/Map.base` — the global Bases map.
2. `places-v1` in Custom Views — the detail UI for individual Place notes.
3. `.obsidian/plugins/places-weather/` — the local runtime that loads current weather for Place views and Map popups.

## Required plugins

- **Maps** (`maps`) provides the `type: map` Bases view used by `Map.base` and `Local.base`.
- **Custom Views** (`custom-views`) renders the Places detail view.
- **Templater** (`templater-obsidian`) synchronizes the modular Places source into Custom Views at startup.
- **Places Weather** (`places-weather`) is bundled with this vault and hydrates weather placeholders.

If `Map.base` opens without a map view, install/enable **Maps by Obsidian** from Community Plugins and reload Obsidian.

## Place data

`Map.base` indexes Place notes with a non-empty `place_type` from:

- `20_Personal_Life/23_Places/Tourist`
- `20_Personal_Life/23_Places/Misc`
- `20_Personal_Life/26_Food_&_Drinks/Restaurants`
- `20_Personal_Life/26_Food_&_Drinks/Cafes`
- `20_Personal_Life/26_Food_&_Drinks/Bars`

Place notes use `90_System/91_Templates/Place_Template.md`. Coordinates are stored as `latitude, longitude`.

## Weather and API-key safety

Weather uses OpenWeatherMap Current Weather Data. The runtime reads:

- `openweathermap_key`
- `openweathermap_unit`

from `90_System/93_Configuration/settings.md`.

`settings.md` is a generated compatibility file and is ignored by Git. The public repository stores only `settings.example.md`. At startup, `Bootstrap_Settings.md` creates `settings.local.md` from the example, blanks placeholder values, and mirrors the local file to ignored `settings.md`.

Put real API keys only in `settings.local.md`, then reload Obsidian so the compatibility mirror is refreshed. Do not put secrets in `settings.example.md`.

The map itself does not require an OpenWeatherMap key. Without a key, markers still work and weather is shown as unavailable.

Weather responses are cached in memory for 15 minutes and are not written into Place frontmatter.

## Custom View source sync

The editable source for `places-v1` lives in this directory. `90_System/91_Templates/Sync_Places_Custom_View.md` rebuilds the Custom Views entry from these HTML/CSS/JS modules at startup.
