# Abyssal-Vault

Abyssal-Vault is a reusable Obsidian vault template derived from the author's working vault. It intentionally ships the vault structure, selected reusable content, themes/snippets, plugin configuration, templates, scripts, Custom Views, dashboards, and supporting media needed for the intended experience.

## Requirements

- A current Obsidian desktop release.
- **Obsidian 1.13.1 or newer** for the current Maps plugin used by Bases map views.
- Community plugins must be enabled/trusted when opening the vault.

## Vault structure

The template keeps the numbered top-level layout used by the source vault:

- `00_Capture` — capture workflows such as Journal, Cornell notes, and Zettelkasten notes.
- `10_Projects` — project space.
- `20_Personal_Life` — reusable trackers and personal-life systems, including Books, Media, Places, Food & Drinks, Games, Finance, and Bodybuilding references.
- `40_Academics` — academic/study space.
- `60_Digital_Library` — digital library space.
- `70_Interests_&_Research` — research and interest notes.
- `90_System` — templates, scripts, configuration, media assets, schedules, and homepage infrastructure.
- `99_Archives` — archive space.

Unlike the earlier migration-only version of this repository, `90_System/92_Scripts`, `90_System/93_Configuration`, and `90_System/95_Media_Assets` are real distributed parts of the template, not placeholders.

## First start

Open the repository folder as an Obsidian vault and enable the bundled community plugins you want to use. Templater startup tasks then perform three template-maintenance actions:

1. `Bootstrap_Settings.md` creates local settings files for machine-specific values and secrets.
2. `Check_Required_Plugins.md` warns when a required Places/Map dependency is missing.
3. `Sync_Places_Custom_View.md` synchronizes the modular Places implementation into the Custom Views plugin configuration.

If a startup task has just generated local configuration or you have installed a missing plugin, reload Obsidian once.

## Settings and secrets

The repository commits only:

`90_System/93_Configuration/settings.example.md`

This file contains public defaults/placeholders and must not contain a real API key, account identifier, or local machine path.

At startup, `Bootstrap_Settings.md` creates:

- `90_System/93_Configuration/settings.local.md` — the editable local configuration.
- `90_System/93_Configuration/settings.md` — an ignored compatibility mirror used by existing scripts/plugins.

Both runtime files are ignored by Git. Put real values such as OpenWeatherMap, TMDB, Spoonacular, RAWG, Steam credentials/IDs, local Heroic paths, location, currency preferences, and other machine/user-specific values in `settings.local.md`, not in `settings.example.md`.

After editing `settings.local.md`, reload Obsidian so the compatibility mirror is refreshed.

## Places and Map.base

The Places system uses `20_Personal_Life/23_Places/Map.base` as its global map and `90_System/91_Templates/Place_Template.md` for individual Place notes.

### Maps plugin

`Map.base` uses the `type: map` Bases view supplied by **Maps by Obsidian** (`maps`). The source vault currently uses Maps `0.2.2`.

If the template reports that Maps is missing, install **Maps** from Obsidian's Community Plugins browser, enable it, and reload Obsidian. Merely having `"maps"` in `.obsidian/community-plugins.json` does not provide the plugin runtime when `.obsidian/plugins/maps/main.js` is absent.

### Indexed Place folders

The map indexes notes with a non-empty `place_type` from:

- `20_Personal_Life/23_Places/Tourist`
- `20_Personal_Life/23_Places/Misc`
- `20_Personal_Life/26_Food_&_Drinks/Restaurants`
- `20_Personal_Life/26_Food_&_Drinks/Cafes`
- `20_Personal_Life/26_Food_&_Drinks/Bars`

These folders are retained in the template so Templater's folder-template mappings work immediately. A public sample Place is included so `Map.base` has a marker to render before you add your own locations.

### Weather

`.obsidian/plugins/places-weather/` provides the same local weather runtime used by the source vault. It hydrates current conditions in individual Place views and Map popups.

Weather reads `openweathermap_key` and `openweathermap_unit` from the ignored runtime `settings.md`. The key is therefore not committed to the repository. `Map.base` itself still works without a weather key; only live weather remains unavailable until one is configured.

Detailed Places architecture is documented in `90_System/93_Configuration/Custom_Views/Places/README.md`.

## Templater folder mappings

Folder mappings are kept only for templates that are actually distributed. The Book Tracker mapping targets `20_Personal_Life/24_Book_Tracker/Books`, and obsolete mappings to removed Vocabulary/Onion templates have been removed.

## Reusable content

Existing reusable Book, Media, Game, recipe, exercise, and other curated records are intentionally allowed to remain in the template. They are not treated as secrets. Before publishing changes, the important privacy boundary is that credentials, API keys, account IDs intended to remain private, and machine-local paths stay in ignored local settings rather than committed configuration.

## Updating the template

This repository is now maintained directly as a distributable vault. The old `./scripts/migrate-from-obsidian-vault.sh` migration workflow is no longer the documented update path; make template-safe changes directly and keep local/private settings outside Git.
