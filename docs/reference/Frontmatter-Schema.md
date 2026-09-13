# Frontmatter Schema Reference

This page summarizes fields that act as contracts between Markdown records and Abyssal Vault automation. Renaming them requires updating every Base, script, formula, and Custom View that reads them.

## Places

| Field | Purpose |
|---|---|
| `place_type` | Classifies tourist, misc, restaurant, cafe, or bar. |
| `coordinates` | Supplies latitude/longitude to maps, Globe, and weather. |
| `visited` | Stores visited state. |
| `want_to_visit` | Stores wishlist state. |
| `favorite` | Stores favorite state. |
| `rating` | Stores personal rating. |
| `cover` | Supplies Place imagery. |
| `city`, `region`, `country` | Store geographic metadata. |
| `last_visited` | Stores latest visit date. |

## Books

| Field | Purpose |
|---|---|
| `Title` | Display title. |
| `Author` | Author name. |
| `Cover` | Book artwork. |
| `Status` | Reading state. |
| `CurrentPage` | Current reading position. |
| `TotalPages` | Total book length. |
| `DateStarted` | Start date. |
| `DateFinished` | Completion date. |
| `Rating` | Personal score. |
| `Genre` | Multi-value classification. |

## Finance

### Shared

| Field | Purpose |
|---|---|
| `RecordType` | Identifies report, transaction, account, or commitment. |
| `FinanceSchema` | Tracks data-model version. |
| `FinanceBook` | Assigns the record to a logical finance book. |

### Transactions

`TransactionId`, `Date`, `Type`, `Description`, `Amount`, `Currency`, `Account`, `ToAccount`, `Category`, `Fixed`, `CommitmentId`, `FxRateToBase`, `BaseAmount`, and fee fields.

### Accounts

`AccountId`, `Account`, `AccountType`, `Currency`, `OpeningBalance`, `OpeningDate`, `BaseOpeningBalance`, `OpeningFxRateToBase`, `IncludeInNetWorth`, and `Active`.

### Commitments

`CommitmentId`, `Name`, `Amount`, `Currency`, `Account`, `Category`, `Frequency`, `DueDay`, `StartDate`, `EndDate`, base/FX fields, and `Active`.

## Movies and TV

Common high-value fields include:

- `categories` — determines Movies vs TV Series grouping.
- `cover` — local poster path.
- `backdrop` — local backdrop path.
- `genres` — genre collection.
- `rating` — personal evaluation.
- `status` — watch state.
- `tmdbId` — canonical TMDB identity.
- `imdbId` — IMDb identity.

Movie-specific consumers also use runtime, year/release metadata, credits, description, and barcode data. TV consumers additionally use creators, networks, seasons, episodes, airing state, and first/last-air metadata.

## Games

Important fields include:

- `Title`
- `Cover`
- `Backdrop`
- `Platform`
- `Developer`
- `Publisher`
- `Genre`
- `Status`
- `Rating`
- playtime fields
- completion fields
- achievement fields
- `SteamAppId`
- GOG provider identity when available

These fields are shared between `Game_Collection.base`, catalog import, and platform-stat synchronization.

## Recipes

Important fields include `category`, `cuisine`, `tagline`, `cover`, `recipe_illustration`, `description`, `servings`, `prep_time`, `cook_time`, `difficulty`, `favorite`, `bookmarked`, `ingredients`, `instructions`, `tips`, `pairs_well_with`, and provider/source metadata.

## Exercises

Important fields include `name`, `level`, `force`, `mechanic`, `equipment`, `category`, `primaryMuscles`, `secondaryMuscles`, `preview`, and `animation`.

## Settings

Configuration keys under `settings.md` are also contracts. In particular, avoid renaming Daily Schedule headings/paths, Finance settings, service keys, or Globe settings without updating their consumers.

## Migration rule

When a schema key must change:

1. identify every script, Base, formula, template, and Custom View that references it;
2. update consumers and templates together;
3. migrate existing records;
4. test record creation and rendering;
5. only then remove compatibility handling for the old key.