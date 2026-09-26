# Scripts

Automation scripts live under `90_System/92_Scripts`. They are divided broadly into Template Scripts and Homepage/Dataview scripts.

# Template Scripts

## `quotes.js`

- **Quote library** — stores the quote collection used by Daily Journals.
- **Random selection** — returns a random quote.
- **Callout formatting** — returns output suitable for an Obsidian quote callout.

## `game_metadata.js`

- **Steam search/details** — retrieves catalog metadata from Steam.
- **Steam URL/App ID input** — accepts direct Steam identities.
- **RAWG fallback** — can query RAWG when configured.
- **Cover download** — stores a local game cover.
- **Backdrop download** — stores a local game background.
- **Platform import** — stores supported platforms.
- **Developer / Publisher import** — stores studio metadata.
- **Genre import** — stores game genres.
- **Release date normalization** — stores a consistent release date.
- **Metacritic import** — stores the score when available.
- **Description cleanup** — converts provider HTML into clean text.
- **Provider identity** — stores Steam App ID or RAWG identity.
- **Portable filenames** — removes problematic filename characters.
- **Asset collision protection** — avoids ambiguous generated binary names.

## `game_platform_stats.js`

- **Personal-data separation** — keeps account-specific statistics outside the catalog import step.
- **SteamID64 validation** — validates the configured user identity.
- **App ID inference** — finds an App ID in frontmatter/store URLs or prompts when needed.
- **Steam playtime** — uses GetOwnedGames to retrieve total playtime.
- **Steam achievements** — uses GetPlayerAchievements to retrieve achievement progress.
- **Completion calculation** — derives achievement completion percentage.
- **Diagnostics** — reports likely privacy or ownership problems.
- **Heroic GOG authentication** — reads a configured local Heroic auth file.
- **Token isolation** — does not copy the Heroic OAuth token into the vault.
- **GOG playtime** — retrieves gameplay-session information when supported.
- **GOG achievements** — retrieves achievement progress when supported.
- **Sync timestamp** — records the latest synchronization time.

## `spoonacular_recipe.js`

- **Provider selection** — supports Auto, Spoonacular, and TheMealDB.
- **Local configuration** — reads provider/API settings from local configuration.
- **Recipe search** — queries external recipe catalogs.
- **Normalization** — converts different provider responses into one Recipe schema.
- **Ingredient import** — stores structured ingredients.
- **Instruction cleanup** — removes markup and normalizes steps.
- **Prep/cook time** — imports or derives timing information.
- **Difficulty derivation** — estimates complexity from time, ingredients, and instructions.
- **Category derivation** — derives the `recipe_category` value.
- **Cuisine import** — stores cuisine metadata.
- **Serving import** — stores serving count.
- **Description cleanup** — removes unwanted HTML/entities.
- **Illustration selection** — chooses a semantic illustration key.
- **Local image download** — stores recipe imagery locally.
- **Provider identity** — preserves external recipe IDs.
- **Source tracking** — stores provider and source URL.

## `tmdb_media.js`

- **Movie asset folder** — stores Movie assets under `90_System/95_Media_Assets/Movies`.
- **TV asset folder** — stores TV assets under `90_System/95_Media_Assets/TV_Series`.
- **Poster download** — retrieves a local poster.
- **Backdrop download** — retrieves a local backdrop.
- **Folder creation** — creates missing media directories.
- **TMDB-ID filenames** — uses stable TMDB identities in generated filenames.
- **Collision protection** — avoids conflicting local media names.
- **Cache-by-file** — reuses already downloaded files.
- **Partial-failure tolerance** — lets poster and backdrop downloads fail independently.

# Homepage / Dataview Scripts

## `info-headers.js`

- **Vault identity** — reads `vault_name` and `username`.
- **Time-aware greeting** — changes greeting according to local time.
- **Live clock** — updates continuously while the dashboard is mounted.
- **Vault age** — calculates age from `start_date`.
- **Note count** — counts Markdown notes.
- **Journal count** — counts Daily Notes.
- **Book count** — counts Book records.
- **Tag count** — counts distinct tags.
- **Weather** — retrieves current conditions from OpenWeatherMap.
- **Weather cache** — reduces repeated requests with a short-lived cache.
- **Weather timeout** — aborts slow requests.
- **Activity heatmap** — builds a recent activity grid from file modification timestamps.
- **Theme palette** — exposes Abyssal palette swatches.
- **Quick actions** — provides dashboard navigation/action controls.

## `schedule-callout.js`

- **Settings lookup** — reads `callout_path` and `schedule_heading`.
- **Weekday resolution** — maps the current date to Monday–Sunday source notes.
- **Schedule transclusion** — embeds the selected Daily Schedule heading.
- **Journal integration** — can hide the raw source after a journal snapshot is available.

## `exercise-callout.js`

- **Settings lookup** — reads `callout_path` and `exercise_heading`.
- **Weekday resolution** — selects the current weekday note.
- **Exercise transclusion** — embeds the Calisthenics section.
- **Journal integration** — supports the same snapshot behavior as the schedule renderer.

## `cardio-callout.js`

- **Settings lookup** — reads `callout_path` and `cardio_heading`.
- **Weekday resolution** — selects the current weekday note.
- **Cardio transclusion** — embeds the Cardio section.
- **Journal integration** — supports journal snapshot behavior.

## `finance-quick-add.js`

- **Homepage form** — renders Finance creation controls directly on the dashboard.
- **Expense** — creates expense transactions.
- **Income** — creates income transactions.
- **Transfer** — creates transfers between accounts.
- **Account** — creates Finance account records.
- **Subscription** — creates recurring commitments.
- **Folder creation** — ensures required Finance record directories exist.
- **Finance defaults** — reads FinanceBook and BookCurrency.
- **Default categories** — provides common categories.
- **Learned categories** — discovers categories from existing records.
- **Custom categories** — allows new category values.
- **FX normalization** — stores conversion rate and base amount.
- **Transfer fees** — supports fee metadata.
- **Net-worth flag** — configures account inclusion in net worth.
- **Manage Base** — can open `Finance.base`.

## `globe-settings-init.js`

- **Default recovery** — restores missing Globe settings.
- **Appearance defaults** — restores size, style, color, and marker style.
- **Source defaults** — restores location source folders.
- **Display/render limits** — restores size constraints.
- **Zoom defaults** — restores minimum, maximum, and initial zoom.
- **Base scale** — restores the Globe base scale.
- **Texture resolution** — restores texture width/height.
- **Frontmatter persistence** — writes missing defaults back into Settings frontmatter.

## `globe-widget.js`

- **Primary Globe renderer** — renders the interactive Homepage Globe.
- **Settings-driven behavior** — reads appearance and interaction settings from configuration.
- **Place discovery** — scans configured Place/Restaurant/Cafe/Bar folders.
- **Coordinate parsing** — converts Place coordinates into Globe positions.
- **Supported-type filtering** — renders only recognized place types.
- **Visit-state styling** — differentiates visited, wishlist, and saved locations.
- **Marker clustering** — combines nearby points.
- **Pin modes** — supports line, connected-dots, and dots.
- **Theme modes** — supports Abyssal, Monochrome, Revert, and Colorful.
- **Geographic layers** — renders land, lakes, rivers, borders, coastline, admin regions, roads, urban areas, and cities where data is available.
- **Auto rotation** — rotates while idle.
- **Reduced motion** — respects the operating-system reduced-motion preference.
- **Zoom scaling** — adjusts scene scale with zoom.
- **Precision drag** — lowers drag sensitivity at high zoom levels.
- **Texture controls** — uses configurable texture dimensions.
- **Lifecycle registry** — cleans up and reinitializes safely across Dataview rerenders.

## `globe-vector-map-overlay.js`

- **MapLibre renderer** — supplies the high-detail vector overlay.
- **CDN fallback** — can load MapLibre from alternate CDN sources.
- **OpenFreeMap Liberty** — provides the vector base style/data.
- **Theme recoloring** — maps vector layers to Abyssal/Monochrome/Revert/Colorful palettes.
- **Place reuse** — reads the same Place records as the Globe.
- **Marker clustering** — clusters nearby records.
- **Visit-state colors** — differentiates personal place state.
- **Connected dots** — supports connection geometry between locations.
- **Globe synchronization** — coordinates center, zoom, and interaction state.
- **High-zoom geography** — provides detailed vector information beyond the Globe's coarse view.
- **Precision drag** — reduces drag speed at deep zoom.
- **Attribution** — exposes OpenFreeMap/OpenStreetMap attribution.

## `dashboard-calendar.js`

- **Calendar utility** — provides calendar/dashboard rendering helpers.
- **Current status** — exists in the engine but is not called directly by the current `Homepage.md`.