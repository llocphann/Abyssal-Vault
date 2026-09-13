# Game Tracker

`20_Personal_Life/27_Game_Tracker` stores game catalog metadata, personal notes, and optional platform statistics as Markdown records.

## Game records

Current records include `Core Keeper.md`, `Crimson Desert Enhanced.md`, `Cult of the Lamb.md`, and `DEATH STRANDING DIRECTOR'S CUT.md`.

### Functions of a Game note

- **Title** — stores the game title.
- **Cover** — points to a local cover image.
- **Backdrop** — points to a local background image.
- **Platform** — stores supported platforms.
- **Developer** — stores developer information.
- **Publisher** — stores publisher information.
- **Genre** — stores one or more genres.
- **Release date** — stores the release date.
- **Metacritic** — stores an external review score when available.
- **Store** — identifies the source/store.
- **Store URL** — stores the direct store link.
- **Source** — records the metadata provider.
- **Steam App ID** — connects the record to Steam metadata and statistics.
- **GOG Product ID** — connects the record to GOG synchronization when available.
- **Status** — tracks backlog, playing, completed, or another custom state.
- **Rating** — stores personal evaluation.
- **Playtime** — stores synchronized playtime.
- **Achievements** — stores unlocked and total achievement counts.
- **Completion** — stores completion percentage.
- **Description** — stores catalog description.
- **Personal Log** — stores gameplay reflections.
- **Mechanics** — stores systems, builds, and strategy notes.
- **Story & World** — stores narrative/worldbuilding observations.
- **Memorable Moments** — stores notable gameplay moments.

## `Game_Template.md`

- **Metadata import** — calls `tp.user.game_metadata(tp)`.
- **Personal Log prompts** — adds reflection prompts.
- **Mechanics prompts** — adds prompts for gameplay systems and strategy.
- **Story prompts** — adds prompts for narrative and worldbuilding.
- **Memorable Moments** — adds prompts for standout experiences.

## `game_metadata.js`

- **Steam search/details** — retrieves Steam Store metadata.
- **Direct Steam input** — accepts a Steam URL or App ID.
- **RAWG fallback** — can use RAWG when configured.
- **Local media** — stores covers and backdrops under `90_System/95_Media_Assets/Games`.
- **Catalog metadata** — imports platform, developer, publisher, genres, release date, Metacritic, website/store URLs, provider IDs, and description.
- **Portable filenames** — sanitizes generated names.
- **Collision protection** — prevents binary asset collisions.

## `Game_Stats_Sync.md`

This note calls `tp.user.game_platform_stats(tp)` to update an existing Game record with account-specific statistics.

## `game_platform_stats.js`

- **SteamID64 validation** — validates the configured user identity.
- **App ID inference** — detects the Steam App ID from record metadata or prompts when required.
- **Steam playtime** — retrieves `playtime_forever` through GetOwnedGames.
- **Steam achievements** — retrieves unlocked/total achievements through GetPlayerAchievements.
- **Completion calculation** — derives achievement completion percentage.
- **Diagnostics** — reports privacy/not-owned conditions where possible.
- **Heroic GOG auth** — reads machine-local Heroic authentication without copying tokens into the vault.
- **GOG playtime** — retrieves gameplay sessions when available.
- **GOG achievements** — retrieves achievement progress when available.
- **Sync timestamp** — records when statistics were last synchronized.

## `Game_Collection.base`

- **Packed game dossier** — displays status, store, title, developer/year, platforms, genres, publisher, achievements, description, completion, rating, playtime, and Metacritic.
- **Completion bar** — visualizes progress.
- **Game Collection** — provides the main card view.
- **Game Data** — provides an editable metadata table.

Catalog metadata and personal platform statistics are deliberately separate so that reusable public metadata does not depend on a user's private account state.