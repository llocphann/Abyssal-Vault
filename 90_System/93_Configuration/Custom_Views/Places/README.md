# Places

Places is split into three cooperating pieces:

1. `20_Personal_Life/23_Places/Map.base` — the global Bases map.
2. `places-v1` in Custom Views — the detail UI for individual Place notes.
3. `.obsidian/plugins/places-weather/` — the bundled Places runtime.

## Required plugins

- **Maps** (`maps`) provides the `type: map` Bases view used by `Map.base` and `Local.base`.
- **Custom Views** (`custom-views`) renders the Places detail view.
- **Places Weather** (`places-weather`) is bundled with the vault and initializes the Places runtime.
- **Templater** (`templater-obsidian`) is still used for normal note/folder templates, but Places initialization does not depend on Templater startup templates.

## Runtime initialization

When `places-weather` loads, it performs the runtime work required by Places:

1. Check whether Maps is registered and loaded.
2. If Maps is missing, install the pinned `obsidianmd/obsidian-maps` `0.2.2` release through Obsidian's community-plugin manager.
3. Refresh/load plugin manifests and enable/load Maps so the `type: map` Bases view is available in the current session.
4. Rebuild `places-v1` from the modular HTML/CSS/JS source in this directory and synchronize it into Custom Views.
5. Hydrate weather placeholders when a valid OpenWeatherMap key is configured.

This intentionally avoids Templater startup execution. Templater's startup-template toggle is device-local, so it is not a reliable dependency for functionality that must work on a fresh template clone.

If automatic Maps installation is blocked, install/enable **Maps** from Settings → Community plugins and reopen `Map.base`.

## Place data

`Map.base` indexes Place notes with a non-empty `place_type` from:

- `20_Personal_Life/23_Places/Tourist`
- `20_Personal_Life/23_Places/Misc`
- `20_Personal_Life/26_Food_&_Drinks/Restaurants`
- `20_Personal_Life/26_Food_&_Drinks/Cafes`
- `20_Personal_Life/26_Food_&_Drinks/Bars`

Place notes use `90_System/91_Templates/Place_Template.md`. Coordinates are stored as `latitude, longitude`.

## Settings and API keys

Weather uses OpenWeatherMap Current Weather Data. Places Weather reads:

- `openweathermap_key`
- `openweathermap_unit`

from `90_System/93_Configuration/settings.md`.

`settings.md` is intentionally the tracked configuration filename in Abyssal-Vault and ships with placeholders. There is no `settings.example.md`, `settings.local.md`, or `Bootstrap_Settings.md` indirection.

Because `settings.md` is tracked, do not commit/publish a customized copy containing a real API key or credential.

The map itself does not require an OpenWeatherMap key. Without a key, markers still work and weather is shown as unavailable.

Weather responses are cached in memory for 15 minutes and are not written into Place frontmatter.

## Custom View source

The editable source for `places-v1` lives in this directory. The bundled `places-weather` runtime reads `view.json`, `template.html`, and the modular CSS/JS files and synchronizes the assembled view into Custom Views after Obsidian's layout is ready.
