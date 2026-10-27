# Changelog

All notable changes to Abyssal Vault are documented here.

## 1.0.2 — 2026-10-28

### Added

- Added the Music Tracker system (`20_Personal_Life/28_Music_Tracker/Music_Tracker.base`) with `Music Library`, `Favourite Songs`, `Favourite Albums`, `Songs Data`, and `Albums Data` views, plus bundled sample Album and Song notes.
- Added `music-song-v1` and `music-album-v1` Custom Views featuring a cover-first hero, interactive Favourite and 5-star Personal Rating controls, linked Album tracklists, local LRCLIB lyrics loading (`Lyrics/LRCLIB-<id>.txt`), and Journal-style writing paper that switches to Live Preview on click.
- Added the Music metadata importer (`music_metadata.js`) and Templater startup bridge (`Sync_Music_Custom_Views.md`) supporting MusicBrainz, Cover Art Archive, Apple iTunes Search API fallback, LRCLIB lyrics persistence, and non-destructive background metadata enrichment.
- Added the Book metadata importer (`book_metadata.js`) with Open Library and Google Books fallback and multilingual search preferences.
- Added the shared 5-step non-blocking import progress notice (`import_progress.js`) across Movie, TV Series, Game, Recipe, Book, Song, and Album template workflows.

### Fixed

- Upgraded Apple iTunes cover artwork URLs from `100x100bb.jpg` to high-resolution `600x600bb.jpg` across the importer, Custom View artwork recovery, and existing Music notes.
- Eliminated the fixed right-side blank gutter in `Music_Tracker.base` and fixed `.bases-group-heading` width so category dividers span the full container width.
- Reflowed Music Base cards across rows when a card expands (`2-column` span with automatic row wrapping) and anchored right-corner cards to open their metadata drawer to the left without clipping or covering adjacent cards.
- Synchronized Album-generated Song notes (`createSongNotes`) with standalone Song note creation, including `TrackCount`, formatted `Genre` fallback, work credits, Apple track metadata, and enrichment provenance stamps.
- Fixed false `identity_conflict` warnings on Apple iTunes albums whose collection `trackCount` includes digital booklets or bonus videos alongside song tracks.
- Removed hover tooltip attributes (`title`, `aria-label`) from Exercise Custom View target maps, movement profiles, and Music Base cards.

### Improved

- Styled Music Base cards and category group headers (`01 ALBUMS · LONG-PLAY RELEASES`, `02 SONGS · SINGLES & TRACKS`) to match the Media Library aesthetic using Core snippet color tokens (`--bases-*`, `--lake-*`, `--cc-p*`) in both Dark and Abyssal Light (`.theme-light`) themes.
- Differentiated genre chip indicator colors in both compact and expanded Music Base card views, and allowed long `Album artist` metadata values in Song Custom Views to wrap cleanly across lines.

## 1.0.1.1 — 2026-09-26

### Fixed

- Added the missing sample media assets used by the Game, Movie, TV Series, and Recipe notes so their Bases render with images out of the box.
- Updated ignore rules so these bundled sample assets remain tracked in the reusable vault.

### Improved

- Refreshed Obsidian graph/workspace state included with the sample-media update.

## 1.0.1 — 2026-09-26

### Fixed

- Open Journal, Cornell, and Zettelkasten notes from their Custom Views in Live Preview instead of Source mode.
- Queue rapid Game Play Status updates so a newer selection is not overwritten by an older pending write.
- Let the Journal Custom View read schedule, Calisthenics, and Cardio sections directly from the configured weekday source instead of relying on embedded DataviewJS blocks.
- Preserve Custom Views settings/frontmatter formatting during updates.
- Correct Recipe documentation to use the implemented `recipe_category` frontmatter field.
- Correct documented top-level vault paths to `40_Academics`, `60_Digital_Library`, and `70_Interests_&_Research`.
- Remove stale CSS snippet references, unbundled community-plugin entries, and hotkeys for unavailable legacy plugins.

### Improved

- Migrate the Cornell template to semantic Markdown headings while retaining legacy fenced-Cornell compatibility in the Custom View.
- Keep Cornell Live Preview native and editable while preserving the two-column Cornell presentation in Reading mode.
- Simplify Zettelkasten Core Idea and Content sections to plain Markdown, leaving visual treatment to the Custom View.
- Add `journal-date` to new Journal notes and align the template with the Journal Custom View workflow.
- Refine Custom View editing behavior and runtime synchronization.
- Improve Graph View organization with top-level vault color groups and tuned display/force settings.
- Update architecture, capture, template, schedule, and schema documentation to match the current runtime behavior.
- Remove temporary Cornell sample content from the repository after validating the new Markdown-native format.
