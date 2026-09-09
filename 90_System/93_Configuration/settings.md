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

# Vault settings example

This committed file is safe to publish. It contains placeholders only.

On first startup, Abyssal-Vault creates a private `settings.local.md` from this example. Placeholder values are blanked in the local copy so integrations fail closed until you configure them.

Use `settings.local.md` for personal values such as API keys, city, account IDs, local machine paths, preferred currency, and start date. That file is ignored by Git and must never be committed.

`settings.md` is also ignored by Git and may be generated as a compatibility mirror for older vault scripts/plugins that still read that path.

No recovery key or authentication token is required or stored by this template.
