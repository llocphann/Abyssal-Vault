<div align="center">

# Abyssal Vault

Structured notes, visual collections, automation, dashboards, and custom workflows — while keeping Markdown and YAML as the source of truth.

</div>

<p align="center">
  <a href="docs/assets/images/homepage.png">
    <img src="docs/assets/images/homepage.png" alt="Abyssal Vault homepage" width="82%">
  </a>
</p>
<p align="center"><sub><b>Homepage</b> — the daily control center for the vault.</sub></p>

## What is Abyssal Vault?

Abyssal Vault is a reusable **Obsidian vault template** for building a structured personal knowledge and workflow system.

It combines an organized vault architecture with **Templates, Bases, Dataview, automation scripts, Custom Views, local media assets, and selected community-plugin configuration**. Collections are optimized for browsing; individual notes are designed for actual use, reflection, and long-term memory.

## Showcase

### Daily Journal

<p align="center">
  <a href="docs/assets/images/journal-note.png">
    <img src="docs/assets/images/journal-note.png" alt="Daily journal" width="68%">
  </a>
</p>
<p align="center"><sub>Schedule, training, reflection, health, weather, and archive context in one daily workspace.</sub></p>

### Learning · Reading

<p align="center">
  <a href="docs/assets/images/book-base.png"><img src="docs/assets/images/book-base.png" alt="Book collection" width="48%"></a>
  <a href="docs/assets/images/book-note.png"><img src="docs/assets/images/book-note.png" alt="Reading dossier" width="48%"></a>
</p>
<p align="center"><sub><b>Book Collection</b> · <b>Reading Dossier</b></sub></p>

<p align="center">
  <a href="docs/assets/images/cornell.png"><img src="docs/assets/images/cornell.png" alt="Cornell study note" width="48%"></a>
  <a href="docs/assets/images/cornell-studymode.png"><img src="docs/assets/images/cornell-studymode.png" alt="Cornell study mode" width="48%"></a>
</p>
<p align="center"><sub><b>Cornell Notes</b> · <b>Active Recall Study Mode</b></sub></p>

Books move from a visual collection into focused reading dossiers, while Cornell notes can switch from normal notes into an active-recall study interface.

### Training

<p align="center">
  <a href="docs/assets/images/exercise-base.png"><img src="docs/assets/images/exercise-base.png" alt="Exercise library" width="57%"></a>
  <a href="docs/assets/images/exercise-note.png"><img src="docs/assets/images/exercise-note.png" alt="Exercise dossier" width="39%"></a>
</p>
<p align="center"><sub><b>Exercise Library</b> · <b>Exercise Dossier</b></sub></p>

Structured exercise data powers the visual library, technique sheets, equipment references, difficulty information, and muscle maps.

### Finance

<p align="center">
  <a href="docs/assets/images/financial-report-yearly.png">
    <img src="docs/assets/images/financial-report-yearly.png" alt="Yearly financial report" width="84%">
  </a>
</p>
<p align="center"><sub>Structured transactions become income, expense, savings, balance, category, and trend reports.</sub></p>

### Movies · TV

<p align="center">
  <a href="docs/assets/images/media-movies.png"><img src="docs/assets/images/media-movies.png" alt="Movie collection" width="48%"></a>
  <a href="docs/assets/images/media-tvseries.png"><img src="docs/assets/images/media-tvseries.png" alt="TV series collection" width="48%"></a>
</p>
<p align="center"><sub><b>Movie Collection</b> · <b>TV Series Collection</b></sub></p>

<p align="center">
  <a href="docs/assets/images/movie-journal.png"><img src="docs/assets/images/movie-journal.png" alt="Movie journal" width="31.5%"></a>
  <a href="docs/assets/images/movie-videos.png"><img src="docs/assets/images/movie-videos.png" alt="Movie videos" width="31.5%"></a>
  <a href="docs/assets/images/movie-cast.png"><img src="docs/assets/images/movie-cast.png" alt="Movie cast" width="31.5%"></a>
</p>
<p align="center"><sub><b>Journal</b> · <b>Videos</b> · <b>Cast & Crew</b></sub></p>

Metadata-driven collections expand into personal media dossiers instead of stopping at a poster grid or watchlist.

### Games

<p align="center">
  <a href="docs/assets/images/game-base.png"><img src="docs/assets/images/game-base.png" alt="Game collection" width="62%"></a>
  <a href="docs/assets/images/game-note.png"><img src="docs/assets/images/game-note.png" alt="Game dossier" width="34%"></a>
</p>
<p align="center"><sub><b>Game Collection</b> · <b>Game Dossier</b></sub></p>

Game notes combine imported metadata with status, progress, playtime, achievements, external records, and a personal journal.

### Recipes

<p align="center">
  <a href="docs/assets/images/recipe-base.png">
    <img src="docs/assets/images/recipe-base.png" alt="Recipe collection" width="74%">
  </a>
</p>
<p align="center"><sub><b>Recipe Collection</b></sub></p>

<p align="center">
  <a href="docs/assets/images/recipe-overview.png"><img src="docs/assets/images/recipe-overview.png" alt="Recipe overview" width="48%"></a>
  <a href="docs/assets/images/recipe-method.png"><img src="docs/assets/images/recipe-method.png" alt="Recipe method" width="48%"></a>
</p>
<p align="center"><sub><b>Overview & Ingredients</b> · <b>Method, Tips & Pairings</b></sub></p>

Recipe metadata is turned into a practical cooking interface rather than left as a plain Markdown record.

## Automation

Abyssal Vault is designed so information is entered or fetched once and reused throughout the system.

- **Movies & TV:** TMDB provides metadata, credits, posters, and backdrops.
- **Games:** external metadata providers populate game records; Steam integration can synchronize playtime and achievements.
- **Recipes:** Spoonacular / TheMealDB can populate structured recipe data, ingredients, instructions, and artwork.
- **Finance:** standardized records feed Bases and reporting dashboards automatically.
- **UI:** templates and YAML hold state; Bases, Dataview, scripts, and Custom Views turn that data into interfaces.

> Markdown and YAML remain the source of truth. The visual layer can evolve without locking data into a proprietary format.

## Getting started

1. Clone or download this repository.
2. Open it as an Obsidian vault.
3. Enable the included community plugins as needed.
4. Review `90_System/93_Configuration/settings.md` and replace placeholders with your own configuration.

Do not commit real API keys, tokens, credentials, or private configuration.

## Documentation

Detailed architecture documentation, subsystem guides, configuration references, data-flow explanations, and maintenance notes are available in the [Abyssal Vault Documentation](docs/README.md).

## License

See [LICENSE](LICENSE).
