---
type: vault-settings
vault_name: Abyssal-Vault
username: ""
start_date: ""
callout_path: 90_System/97_Daily_Schedule
schedule_heading: Daily Schedule
exercise_heading: Calisthenics
cardio_heading: Cardio
openweathermap_key: ""
openweathermap_city: ""
openweathermap_unit: metric
tmdb_key: ""
spoonacular_key: ""
mega_recovery_key: ""
rawg_api_key: ""
steam_api_key: ""
steam_id: ""
gog_heroic_auth_path: ""
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

Copy this file to `settings.local.md` in the same folder and fill in only the values you use. `settings.local.md` is intentionally ignored by Git and is the local source for credentials, personal identifiers, and machine-specific paths.

## Security

Never commit API keys, recovery keys, account identifiers, local authentication files, or other credentials. If a credential has previously been committed elsewhere, removing it from a later commit does not revoke it; rotate that credential with its provider.

## Weather

- `openweathermap_key`: OpenWeather API key.
- `openweathermap_city`: optional default city for weather views not tied to a Place note.
- `openweathermap_unit`: `metric`, `imperial`, or `standard`.

## Media and recipes

- `tmdb_key`: TMDB API key used by movie and TV importers.
- `spoonacular_key`: Spoonacular API key used by the recipe importer.

## Game services

- `rawg_api_key`: optional RAWG API key used as metadata fallback.
- `steam_api_key` and `steam_id`: used for Steam playtime and achievement sync.
- `gog_heroic_auth_path`: optional local Heroic GOG authentication file path. Do not copy OAuth tokens into the vault.
- `gog_locale`: locale used for GOG achievement data.

## Finance defaults

- `BookCurrency`: three-letter ISO 4217 currency code such as `USD`, `EUR`, `JPY`, or `VND`.
- `DisplayLocale: auto` follows the device/Obsidian locale.
- `CurrencyDisplay`: `symbol`, `narrowSymbol`, `code`, or `name`.
- `NegativeFormat`: `standard` or `accounting`.
- `FiscalYearStartMonth`: integer from `1` through `12`.
- `Budgets`: optional mapping of category names to amounts in `BookCurrency`.
