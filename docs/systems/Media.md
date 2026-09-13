# Media Tracker

`20_Personal_Life/25_Media_Tracker` stores Movies and TV Series as Markdown records and presents them through `Media_Tracker.base`.

## Movie records

Movie notes are created by `Movie_Template.md` and enriched from TMDB.

### Functions

- **`categories`** — identifies the record as a Movie.
- **`genres`** — stores multiple genres.
- **Directors / Writers / Cast** — stores credits and can link people to notes.
- **`cover`** — points to a locally stored poster.
- **`backdrop`** — points to a locally stored backdrop.
- **`description`** — stores the TMDB overview.
- **`tagline`** — stores the official tagline.
- **`runtime`** — stores duration.
- **`year`** — stores release year.
- **`published`** — stores full release date.
- **`rating`** — stores a personal score from 1–10.
- **`status`** — stores watch state.
- **`last` / last watched** — stores the most recent watch date.
- **`imdbId`** — stores IMDb identity.
- **`tmdbId`** — stores TMDB identity.
- **Barcode** — supports a generated Code 128 SVG used by ticket-style cards.
- **Alias preservation** — keeps the original title when a portable filename is required.

## TV Series records

TV records are created by `TV_Show_Template.md`.

### Functions

- **`categories`** — identifies the record as a TV Series.
- **Creators / Directors / Writers / Cast** — stores principal credits.
- **`genres`** — stores genres.
- **`networks`** — stores networks or platforms.
- **`seasons`** — stores total season count.
- **`episodes`** — stores total episode count.
- **`runtime`** — stores episode runtime.
- **Airing status** — stores the current TMDB series state.
- **`published`** — stores first air date.
- **`ended`** — stores last/final air date.
- **`cover` / `backdrop`** — point to local media assets.
- **Description / Tagline** — store summary metadata.
- **`rating`** — stores personal evaluation.
- **`status`** — stores watch state.
- **Last watched** — stores the latest viewing date.
- **IMDb/TMDB IDs** — preserve external identities.

## `Media_Tracker.base`

### Functions

- **Unified Media Library** — combines Movies and TV Series.
- **Movie ticket renderer** — converts Movie metadata into a cinema-ticket card.
- **Movie detail side** — displays genre, runtime, year, release date, director, cast, description, rating, and status.
- **Barcode display** — renders the locally generated Movie barcode.
- **External ID display** — exposes IMDb/TMDB identifiers.
- **TV card renderer** — uses a TV-specific card layout.
- **TV run summary** — displays seasons, episodes, years, runtime, networks, creators, and cast.
- **Media Library** — provides the main grouped card collection.
- **Movies Data** — provides an editable Movie table.
- **TV Series Data** — provides an editable TV table.

## Local media

`tmdb_media.js` stores Movie assets under `90_System/95_Media_Assets/Movies` and TV assets under `90_System/95_Media_Assets/TV_Series`. It uses TMDB IDs for stable filenames, avoids redundant downloads, and tolerates partial poster/backdrop failures.