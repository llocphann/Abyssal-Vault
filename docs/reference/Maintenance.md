# Maintenance

This page summarizes the rules that keep Abyssal Vault portable, recoverable, and internally consistent.

## Core rules

1. **Do not commit real secrets.** Keep API keys, OAuth tokens, recovery material, account credentials, and machine-local authentication data out of the public repository.
2. **Treat Markdown as the source of truth.** Bases, dashboards, and Custom Views are projections of record data.
3. **Keep schema keys stable.** Frontmatter fields act as contracts between records and automation.
4. **Change schemas atomically.** Update templates, scripts, Bases, Custom Views, and existing records together.
5. **Keep records in expected folders.** Several systems use folder scope as part of discovery or type inference.
6. **Keep generated media in System assets.** Avoid scattering importer-generated posters, backdrops, covers, and recipe images across content folders.
7. **Edit weekday source notes instead of duplicating schedules.** Homepage and Journal consumers should continue to share one recurring source.
8. **Preserve Globe execution order.** Initialize settings before the Globe, then mount the vector overlay.
9. **Edit repository Custom View source, not only plugin copies.** Synchronization can overwrite runtime copies.
10. **Separate catalog metadata from personal account statistics.** This is especially important in the Game subsystem.
11. **Archive rather than corrupt.** Prefer moving inactive records to an archive over changing schema just to hide them.
12. **Keep sample records clearly distinguishable from runtime engines.** Samples demonstrate schemas; they should not become undocumented dependencies.

## Before renaming a field

Search for the field in:

- Templates;
- Template Scripts;
- DataviewJS scripts;
- `.base` files and formulas;
- Custom View JavaScript;
- Custom View HTML/CSS where selectors depend on generated attributes;
- existing record notes;
- documentation.

Then migrate consumers and data together.

## Before moving a folder

Check whether the path is used by:

- Base filters;
- Templater scripts;
- Dataview scripts;
- `settings.md`;
- Globe source configuration;
- local media download logic;
- Custom Views;
- attachment/plugin configuration.

## Custom View maintenance

### Settings

Edit:

```text
90_System/93_Configuration/Custom_Views/Settings/
```

Then synchronize with `Sync_Settings_Custom_View.md`.

### Places

Edit:

```text
90_System/93_Configuration/Custom_Views/Places/
```

Then synchronize with `Sync_Places_Custom_View.md`.

Do not rely on manual changes made only inside plugin settings.

## Service credentials

The published `settings.md` should remain safe as template configuration. Sensitive scripts may use `settings.local.md` for local-only credentials and machine-specific settings.

Never publish:

- production API keys;
- Steam or service secrets;
- OAuth access/refresh tokens;
- Heroic/GOG authentication payloads;
- recovery keys;
- personal account identifiers that should remain private;
- machine-local authentication files.

## Local media maintenance

Known generated asset groups include:

```text
90_System/95_Media_Assets/
├── Movies/
├── TV_Series/
├── Games/
└── Recipes/
```

Importer scripts should reuse existing assets where possible and avoid filename collisions.

## Documentation maintenance

When architecture changes materially:

1. update the relevant page under `docs/`;
2. update [Frontmatter Schema](Frontmatter-Schema.md) if a data contract changes;
3. update [Dependencies](Dependencies.md) if a consumer relationship changes;
4. update the documentation index if a new subsystem/page is added.

The documentation should describe the current repository behavior, not an aspirational design that the source does not yet implement.