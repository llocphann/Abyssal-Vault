# Architecture

Abyssal Vault is organized as a layered local-first system rather than a collection of unrelated Markdown files.

## Layer model

```text
Markdown Notes
      ↓
Frontmatter Schema
      ↓
Templates / Importers
      ↓
Bases / Dataview / Custom Views
      ↓
Homepage and Tracker Interfaces
```

### Content layer
Human-readable Markdown stores the durable data: journals, books, places, media, recipes, games, finance records, and notes.

### Schema layer
Frontmatter fields provide machine-readable structure. Scripts and Bases depend on these keys as if they were API contracts.

### Database layer
Obsidian Bases query Markdown records and project them as tables, cards, and maps without moving the underlying data into a separate database.

### Automation layer
Templater and DataviewJS create records, import metadata, synchronize external statistics, render dashboards, and perform service integrations.

### Configuration layer
`90_System/93_Configuration/settings.md` stores shared public/default configuration. Version-controlled Custom View files also live under `90_System/93_Configuration`.

### Presentation layer
Homepage, Bases, Custom Views, CSS, local media, the Globe, and map interfaces compose the visual experience.

## Ownership model

A key architectural rule is that rendered UI never owns canonical data.

```text
Canonical data      → Markdown + frontmatter
Configuration       → settings.md / local settings
Custom View source  → 90_System/93_Configuration/Custom_Views
Generated media     → 90_System/95_Media_Assets
Rendered UI         → Derived projection only
```

## Why this matters

- Records remain readable outside Obsidian.
- Git can diff schema and automation changes.
- Bases can be rebuilt because source records remain intact.
- Custom Views can be synchronized from repository-controlled files.
- External APIs enrich local records instead of becoming permanent dependencies.

## System boundaries

`00_Capture` primarily creates knowledge and journal notes.

`20_Personal_Life` primarily stores structured personal records.

`90_System` provides the automation, configuration, rendering, and reusable schemas used by those records.

The Homepage sits above these systems as an orchestrator and should not be treated as the owner of their data.