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
