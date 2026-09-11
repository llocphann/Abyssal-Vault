---
type: vault-settings
vault_name: Abyssal-Vault
username: fill in your username
start_date: ""
callout_path: 90_System/97_Daily_Schedule
schedule_heading: Daily Schedule
exercise_heading: Calisthenics
cardio_heading: Cardio
openweathermap_key: fill in your openweathermap_api_key
openweathermap_city: fill in your city
openweathermap_unit: metric
tmdb_key: fill in your api key
spoonacular_key: fill in your spoonacular_api_key
recipe_provider: auto
rawg_api_key: fill in your rawg_api_key
steam_api_key: fill in your steam_api_key
steam_id: fill in your steam_id
gog_heroic_auth_path: fill in your gog_heroic_auth_path
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
globe_size: 500x500
globe_style: abyssal
globe_monochrome_color: "#10181b"
location_pins: line
globe_source_folders:
  - 20_Personal_Life/23_Places
  - 20_Personal_Life/26_Food_&_Drinks/Restaurants
  - 20_Personal_Life/26_Food_&_Drinks/Cafes
  - 20_Personal_Life/26_Food_&_Drinks/Bars
globe_display_min: 250
globe_display_max: 2000
globe_render_min: 500
globe_render_max: 2000
globe_min_zoom: 0.72
globe_max_zoom: 32
globe_default_zoom: 0.92
globe_base_scale: 0.84
globe_texture_width: 4096
globe_texture_height: 4096
_settings_layout_v1:
  version: 1
  tabs:
    tab-globe-widget:
      label: Globe Widget
      eyebrow: Custom
      description: Settings for globe
  tabOrder:
    - tab-globe-widget
  headings:
    heading-globe-general:
      label: Globe General
      note: ""
    heading-zoom:
      label: Zoom
      note: ""
  headingTabs:
    heading-globe-general: tab-globe-widget
    heading-zoom: tab-globe-widget
  headingOrder:
    advanced:
      - technical
      - globe
      - custom
    tab-globe-widget:
      - heading-globe-general
      - heading-zoom
  settingPlacement:
    globe_source_folders:
      heading: globe
    globe_max_zoom:
      heading: heading-zoom
    globe_monochrome_color:
      heading: globe
    globe_texture_height:
      heading: heading-globe-general
    globe_texture_width:
      heading: heading-globe-general
    globe_default_zoom:
      heading: globe
    globe_base_scale:
      heading: heading-globe-general
    globe_min_zoom:
      heading: heading-zoom
  settingOrder:
    heading:globe:
      - globe_source_folders
      - globe_default_zoom
      - globe_size
      - globe_monochrome_color
      - globe_style
      - location_pins
      - globe_display_min
      - globe_display_max
      - globe_render_min
      - globe_render_max
    tab:finance:root: []
    tab:advanced:root: []
    tab:tab-globe-widget:root: []
    heading:heading-zoom:
      - globe_min_zoom
      - globe_max_zoom
    heading:heading-globe-general:
      - globe_texture_height
      - globe_texture_width
      - globe_base_scale
---

# Vault settings

This note is the single source for vault-wide user configuration used by Homepage,
Places, importers, Finance, and other vault automation.

The template ships only placeholder values. **Do not commit real API keys, tokens,
account credentials, recovery keys, or machine-local authentication data to a public
copy of this repository.**

## Weather

- `openweathermap_key` is used by the Places Custom Views weather runtime and other weather integrations.
- `openweathermap_city` is the fallback city for weather views not tied to a Place note.
- `openweathermap_unit` supports `metric`, `imperial`, and `standard`.

## Game services

- `rawg_api_key` is optional metadata-import configuration.
- `steam_api_key` and `steam_id` are used for Steam statistics sync.
- `gog_heroic_auth_path` points to Heroic's local GOG authentication file; OAuth tokens are not copied into this vault.

## Finance defaults

- `BookCurrency` is the default ISO 4217 currency code.
- `DisplayLocale: auto` follows the device/Obsidian locale.
- `CurrencyDisplay` may be `symbol`, `narrowSymbol`, `code`, or `name`.
- `NegativeFormat` may be `standard` or `accounting`.
- `FiscalYearStartMonth` accepts `1` through `12`.
- `Budgets` is an optional mapping of category names to amounts in `BookCurrency`.

## Homepage globe

- `globe_source_folders` lists the Abyssal-Vault folders scanned for Place notes with coordinates.
- `globe_size`, `globe_style`, `globe_monochrome_color`, and `location_pins` control the globe appearance.
- `globe_min_zoom`, `globe_max_zoom`, `globe_default_zoom`, and `globe_base_scale` control navigation and scale.
- `globe_display_*`, `globe_render_*`, and `globe_texture_*` control display and render limits.
