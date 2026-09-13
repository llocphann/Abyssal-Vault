# Data Model

Abyssal Vault uses Markdown files as records and YAML frontmatter as structured fields.

## Record pattern

```yaml
---
property_1: value
property_2: value
property_3: value
---
```

The Markdown body remains optimized for human reading, while frontmatter is optimized for scripts, Bases, filters, sorting, formulas, and Custom Views.

## Responsibility split

- **Markdown body** — reflections, reviews, logs, prose, explanations, and personal notes.
- **Frontmatter** — stable structured fields used by automation.
- **Templates** — initialize a valid schema.
- **Importers** — enrich a record from external sources.
- **Bases** — query and visualize records.
- **DataviewJS** — render dynamic dashboard components.
- **Custom Views** — provide application-like interfaces over Markdown data.

## Example: Movie record

```text
Movie.md
  ├── genres
  ├── directors
  ├── rating
  ├── status
  ├── runtime
  ├── cover
  ├── imdbId
  └── tmdbId
       ↓
Media_Tracker.base
       ↓
Ticket-style card
```

## Stable field names

Frontmatter keys should be treated as internal contracts. Renaming a field can affect multiple consumers at once.

Examples:

- Places depend on `place_type`, `coordinates`, `visited`, `want_to_visit`, `favorite`, `rating`, and `cover`.
- Books depend on `Title`, `Author`, `Cover`, `Status`, `CurrentPage`, `TotalPages`, and `Rating`.
- Finance depends on `RecordType`, `FinanceSchema`, `FinanceBook`, `Amount`, `Currency`, `Account`, and `Category`.
- Media depends on fields such as `categories`, `cover`, `backdrop`, `genres`, `rating`, `status`, `tmdbId`, and `imdbId`.
- Games depend on title/media/platform/progress fields plus provider IDs.

See [Frontmatter Schema](../reference/Frontmatter-Schema.md) for the field reference.

## Local-first consequence

The system can lose a Base, a Custom View, or a dashboard script without losing the underlying record. The UI may stop rendering correctly, but the Markdown source remains recoverable and portable.