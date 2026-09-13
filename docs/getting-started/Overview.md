# Overview

Abyssal Vault is an Obsidian vault template designed as a structured personal knowledge, tracking, and workflow system. It keeps human-readable Markdown as the durable data layer while using Obsidian features and JavaScript automation to provide richer interfaces.

## What the vault is built from

| Layer | Responsibility |
|---|---|
| Content | Journals, books, movies, games, places, recipes, finance records, exercise records, and knowledge notes. |
| Schema | Frontmatter fields shared by notes of the same type. |
| Templates | Create notes with a predictable schema and body structure. |
| Bases | Query frontmatter and present collections as cards, tables, or maps. |
| Scripts | Import metadata, create records, synchronize data, and render Homepage components. |
| Configuration | Stores shared settings and version-controlled Custom View source. |
| Presentation | Homepage, Bases, Custom Views, CSS, and local media assets. |

## Typical lifecycle of a record

```text
User action
   ↓
Template / Quick Add / Importer
   ↓
Markdown note + frontmatter
   ↓
Base / Dataview / Custom View
   ↓
Cards / Tables / Maps / Dashboard
```

For example, a Movie remains an ordinary Markdown file. `Movie_Template.md` imports metadata, `tmdb_media.js` stores poster/backdrop assets locally, and `Media_Tracker.base` renders the note as a ticket-like card.

## First-time setup

1. Clone or download the repository and open it as an Obsidian vault.
2. Review the included community plugins before enabling them.
3. Open `90_System/93_Configuration/settings.md` and replace template placeholders with your own non-sensitive configuration.
4. Keep real API keys, tokens, and machine-specific credentials out of the public repository.
5. Review [Settings](../configuration/Settings.md) before using TMDB, weather, recipe, Steam, GOG, or RAWG workflows.
6. Use the Homepage as the primary dashboard after configuration is complete.

## What should be edited directly

- Edit normal record notes when changing personal data.
- Edit weekday source notes when changing recurring daily schedules.
- Edit files under `90_System/93_Configuration/Custom_Views` when changing version-controlled Custom Views.
- Edit `settings.md` or the Settings Custom View when changing shared runtime configuration.
- Edit Templates and Scripts only when changing system behavior or schemas.

## What should not be treated as the source of truth

- Rendered Base cards.
- Plugin-internal copies of Custom View HTML/CSS/JS.
- Homepage output.
- Remote image URLs after media has been localized.

These are projections of source data rather than the canonical data itself.