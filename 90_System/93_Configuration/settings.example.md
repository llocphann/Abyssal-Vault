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

Copy this file to `settings.local.md` in the same folder and replace the placeholder values with your own configuration. `settings.local.md` is intentionally ignored by Git and is the local source for credentials, personal identifiers, and machine-specific paths.

## Security

Never commit API keys, account identifiers, local authentication files, recovery keys, or other credentials. This template intentionally does not include any MEGA recovery-key field.

## Weather

- `openweathermap_key`: fill in your OpenWeather API key.
- `openweathermap_city`: fill in your default city if you want a global weather location.
- `openweathermap_unit`: `metric`, `imperial`, or `standard`.

## Media and recipes

- `tmdb_key`: fill in your TMDB API key.
- `spoonacular_key`: fill in your Spoonacular API key.

## Game services

- `rawg_api_key`: fill in your RAWG API key if you use the fallback metadata provider.
- `steam_api_key`: fill in your Steam Web API key.
- `steam_id`: fill in your Steam account ID.
- `gog_heroic_auth_path`: fill in the local path to Heroic's GOG authentication file if you use that integration. Do not copy OAuth tokens into the vault.
- `gog_locale`: locale used for GOG achievement data.

## Finance defaults

- `BookCurrency`: three-letter ISO 4217 currency code such as `USD`, `EUR`, `JPY`, or `VND`.
- `DisplayLocale: auto` follows the device/Obsidian locale.
- `CurrencyDisplay`: `symbol`, `narrowSymbol`, `code`, or `name`.
- `NegativeFormat`: `standard` or `accounting`.
- `FiscalYearStartMonth`: integer from `1` through `12`.
- `Budgets`: optional mapping of category names to amounts in `BookCurrency`.
