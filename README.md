# Abyssal-Vault

Abyssal-Vault is a reusable Obsidian vault template derived from the author's working vault. It intentionally ships the vault structure, selected reusable content, themes/snippets, plugin configuration, templates, scripts, Custom Views, dashboards, and supporting media needed for the intended experience.

## Requirements

- A current Obsidian desktop release.
- **Obsidian 1.13.1 or newer** for the Maps plugin used by Bases map views.
- Community plugins must be enabled/trusted.
- Internet access when a missing community plugin needs to be installed.

## Vault structure

- `00_Capture` — Journal, Cornell, Zettelkasten and capture workflows.
- `10_Projects` — project space.
- `20_Personal_Life` — Books, Media, Places, Food & Drinks, Games, Finance, Bodybuilding and other reusable systems.
- `40_Academics` — academic/study space.
- `60_Digital_Library` — digital library space.
- `70_Interests_&_Research` — research and interest notes.
- `90_System` — templates, scripts, configuration, media assets, schedules and homepage infrastructure.
- `99_Archives` — archive space.

`90_System/92_Scripts`, `90_System/93_Configuration`, and `90_System/95_Media_Assets` are distributed implementation directories, not placeholders.

## First start

Open the repository as an Obsidian vault and enable/trust community plugins.

Places does **not** depend on Templater startup templates. The bundled local plugin `.obsidian/plugins/places-weather/` initializes the Places runtime when Obsidian loads it:

1. It ensures **Maps** (`maps`) is installed, registered, enabled and loaded. If Maps is missing, it installs the pinned `obsidianmd/obsidian-maps` `0.2.2` release through Obsidian's own community-plugin manager.
2. It synchronizes the modular `places-v1` source from `90_System/93_Configuration/Custom_Views/Places` into the Custom Views plugin.
3. It hydrates live weather for Place views and Map popups when an OpenWeatherMap key is configured.

If automatic Maps installation is blocked, install/enable **Maps** from Settings → Community plugins and reopen `Map.base`.

## Settings

Vault-wide configuration lives at:

`90_System/93_Configuration/settings.md`

The template tracks this file directly so scripts and plugins use the same path as the source vault. The committed version contains placeholders only.

There is no `settings.example.md`, `settings.local.md`, or `Bootstrap_Settings.md` layer.

Because `settings.md` is tracked, replacing placeholders with real API keys or account credentials creates normal Git changes. **Before publishing or pushing a customized copy, reset/remove real secrets from this file.**

Settings used by the vault include OpenWeatherMap, TMDB, Spoonacular, RAWG, Steam, Heroic/GOG paths, currency preferences and other vault-wide defaults.

## Places and `Map.base`

The global map is:

`20_Personal_Life/23_Places/Map.base`

It uses the `type: map` Bases view supplied by **Maps by Obsidian** (`maps`). The source vault uses Maps `0.2.2`.

The previous Abyssal-Vault implementation only wrote Maps files from a Templater startup template. That was unreliable because Templater's `Enable startup templates` toggle is device-local and because writing plugin files after Obsidian has scanned manifests does not by itself register the `type: map` view in the running plugin manager.

The current bundled Places runtime instead uses Obsidian's plugin manager to install Maps when necessary, refresh/load plugin manifests, and enable/load Maps in the current session.

`Map.base` indexes Place notes from:

- `20_Personal_Life/23_Places/Tourist`
- `20_Personal_Life/23_Places/Misc`
- `20_Personal_Life/26_Food_&_Drinks/Restaurants`
- `20_Personal_Life/26_Food_&_Drinks/Cafes`
- `20_Personal_Life/26_Food_&_Drinks/Bars`

A public sample Place is included so the map has a valid marker immediately.

### Weather

`.obsidian/plugins/places-weather/` reads `openweathermap_key` and `openweathermap_unit` directly from `90_System/93_Configuration/settings.md`.

The map does **not** require an OpenWeatherMap key to render markers. Without a key, only live weather is unavailable.

Detailed Places architecture is documented in `90_System/93_Configuration/Custom_Views/Places/README.md`.

## Templater folder mappings

Templater remains responsible for normal folder-template mappings. Its `startup_templates` list is intentionally empty; Places runtime initialization does not rely on Templater startup execution.

The Book Tracker targets `20_Personal_Life/24_Book_Tracker/Books`, and stale Vocabulary/Onion mappings have been removed.

## Reusable content

Book, Media, Game, recipe, exercise and other curated records may remain in the template. They are not treated as secrets. The release privacy boundary is credentials/API keys/tokens, account identifiers intended to stay private, and machine-local authentication data.
