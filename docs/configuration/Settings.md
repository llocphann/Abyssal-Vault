# Settings

`90_System/93_Configuration/settings.md` is the main public/default configuration note used by multiple Abyssal Vault subsystems.

It should contain reusable defaults and placeholders rather than real secrets when the vault is published as a template.

## General

- **`type`** — identifies the note as Vault Settings.
- **`vault_name`** — display name used by the Homepage.
- **`username`** — user name used by the Homepage greeting.
- **`start_date`** — reference date used to calculate vault age.

## Daily system

- **`callout_path`** — folder containing weekday source notes.
- **`schedule_heading`** — heading used for the Daily Schedule section.
- **`exercise_heading`** — heading used for the Calisthenics section.
- **`cardio_heading`** — heading used for the Cardio section.

The three heading names act as contracts between Settings, weekday notes, and the corresponding Dataview scripts.

## Weather

- **`openweathermap_key`** — credential used by current-weather requests.
- **`openweathermap_city`** — fallback/default city where a coordinate-specific location is not used.
- **`openweathermap_unit`** — controls metric, imperial, or standard units.

## Media and recipe services

- **`tmdb_key`** — credential used by Movie and TV metadata workflows.
- **`spoonacular_key`** — credential used by Spoonacular recipe workflows.
- **`recipe_provider`** — selects `auto`, Spoonacular, or TheMealDB behavior.

## Game services

- **`rawg_api_key`** — optional RAWG credential used as a game-metadata fallback.
- **`steam_api_key`** — credential used for Steam personal statistics.
- **`steam_id`** — SteamID64 used for account-specific synchronization.
- **`gog_heroic_auth_path`** — local path to Heroic's GOG authentication data.
- **`gog_locale`** — locale used by supported GOG requests.

## Finance

- **`FinanceSchema`** — Finance schema version.
- **`FinanceBook`** — default logical finance book.
- **`BookCurrency`** — base ISO currency code.
- **`DisplayLocale`** — locale used for number/currency formatting.
- **`CurrencyDisplay`** — controls symbol/code/name presentation.
- **`NegativeFormat`** — controls negative-number formatting.
- **`WeekStartsOn`** — sets the first day of the week.
- **`FiscalYearStartMonth`** — sets the fiscal-year boundary.
- **`Budgets`** — stores category-to-budget mappings.

## Globe

- **`globe_size`** — controls the Globe viewport size.
- **`globe_style`** — selects Abyssal, Monochrome, Revert, or Colorful.
- **`globe_monochrome_color`** — defines the base color for Monochrome mode.
- **`location_pins`** — selects line, connected-dots, or dots markers.
- **`globe_source_folders`** — defines the folders scanned for location records.
- **`globe_display_min` / `globe_display_max`** — constrain visible display size.
- **`globe_render_min` / `globe_render_max`** — constrain internal render size.
- **`globe_min_zoom`** — minimum interaction zoom.
- **`globe_max_zoom`** — maximum interaction zoom.
- **`globe_default_zoom`** — initial zoom.
- **`globe_base_scale`** — base scene scale.
- **`globe_texture_width` / `globe_texture_height`** — control Globe texture resolution.

## `_settings_layout_v1`

This object stores presentation metadata for the Settings Custom View without changing the actual configuration keys.

- **Tabs** — stores custom tabs.
- **Tab order** — stores tab ordering.
- **Headings** — stores heading metadata.
- **Heading tabs** — assigns headings to tabs.
- **Heading order** — stores heading ordering.
- **Setting placement** — assigns settings to headings.
- **Setting order** — stores control order.
- **Globe tab metadata** — allows Globe settings to be presented as a dedicated Settings section.

# Public and local configuration

Abyssal Vault uses two practical configuration layers.

## `settings.md`

- Version-controlled as part of the reusable vault template.
- Contains public/default runtime configuration and placeholders.
- Is read directly by Homepage, Globe, Finance, and other shared components.
- Is the data source edited by the Settings Custom View.

## `settings.local.md`

Several sensitive import/synchronization scripts explicitly reference `90_System/93_Configuration/settings.local.md` for local-only configuration.

Use this layer for real credentials and machine-specific values when applicable.

Examples include:

- TMDB credentials used by importers;
- recipe-service credentials;
- RAWG/Steam credentials;
- machine-local Heroic/GOG authentication paths.

The public repository should not contain real API keys, OAuth tokens, authentication data, recovery keys, or other secrets.

## Settings Custom View

The version-controlled Settings interface is stored under `90_System/93_Configuration/Custom_Views/Settings` and synchronized into the Custom Views plugin by `Sync_Settings_Custom_View.md`.

See [Custom Views](../automation/Custom-Views.md) for details.