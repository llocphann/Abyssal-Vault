# Abyssal Vault Documentation

Abyssal Vault is a local-first personal information system built on Obsidian and plain Markdown. Notes remain portable source data, while frontmatter, Bases, Templater scripts, DataviewJS, Custom Views, and the Homepage build an application-like interface above them.

> **Mental model:** Notes are data, frontmatter is the schema, Templates create the schema, Bases read the schema, Scripts automate the schema, Custom Views present the schema, Settings control the system, and the Homepage brings everything together.

## Start here

- [Overview](getting-started/Overview.md) — what Abyssal Vault is and how its major layers fit together.
- [Vault Structure](getting-started/Vault-Structure.md) — what each top-level directory is responsible for.
- [Architecture](architecture/Architecture.md) — the system architecture and ownership model.
- [Data Model](architecture/Data-Model.md) — how Markdown and frontmatter act as the database.
- [Data Flows](architecture/Data-Flows.md) — end-to-end flows for Places, Media, Games, Recipes, Finance, Daily Notes, and Custom Views.

## Personal systems

- [Capture](systems/Capture.md)
- [Finance](systems/Finance.md)
- [Places](systems/Places.md)
- [Book Tracker](systems/Books.md)
- [Media Tracker](systems/Media.md)
- [Food & Drinks](systems/Food-and-Drinks.md)
- [Game Tracker](systems/Games.md)
- [Bodybuilding](systems/Bodybuilding.md)

## Automation and UI

- [Templates](automation/Templates.md)
- [Scripts](automation/Scripts.md)
- [Custom Views](automation/Custom-Views.md)
- [Homepage](automation/Homepage.md)

## Configuration

- [Settings](configuration/Settings.md)
- [Daily Schedule](configuration/Daily-Schedule.md)

## Reference

- [Frontmatter Schema](reference/Frontmatter-Schema.md)
- [Dependencies](reference/Dependencies.md)
- [Maintenance](reference/Maintenance.md)

## Core principles

1. **Markdown is the source of truth.** Bases and Custom Views visualize data; they do not own it.
2. **Frontmatter is an API contract.** Stable field names allow scripts, Bases, and views to interoperate.
3. **Automation stays inside the vault.** Most runtime behavior lives under `90_System` and can be version-controlled.
4. **Generated media is local-first.** Posters, backdrops, covers, barcodes, and recipe images are stored locally when supported.
5. **Configuration is centralized.** `90_System/93_Configuration/settings.md` controls shared behavior, while sensitive importer credentials can live in local-only configuration.
6. **The Homepage orchestrates; it does not own business logic.** It composes scripts and views into a dashboard.

## Repository map

```text
Abyssal-Vault/
├── 00_Capture/
├── 10_Projects/
├── 20_Personal_Life/
├── 40_Academics/
├── 60_Digital_Library/
├── 70_Interests_&_Research/
├── 90_System/
├── 99_Archives/
└── docs/
```

For setup, begin with [Overview](getting-started/Overview.md), then review [Settings](configuration/Settings.md) before enabling workflows that use external services.