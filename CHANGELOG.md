# Changelog

All notable changes to Abyssal Vault are documented here.

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
