# Abyssal-Vault

A personal Obsidian vault cloned from `Obsidian-Vault` and sanitized for reuse.

## Migration status

- Classic dashboard is retained; Homepage V2 is intentionally excluded.
- Base-backed collections are copied, except Contacts (`20_Personal_Life/29_Contact`) which are intentionally excluded.
- `00_Capture` is part of the migration scope.
- Custom Views plugin/runtime and editable Custom Views sources are part of the migration scope.
- Credentials and private configuration belong in `90_System/93_Configuration/settings.local.md`.
- Copy `settings.example.md` to `settings.local.md` and replace values such as `fill in your ...` only for integrations you use.
- `mega_recovery_key` is not used or carried into this vault.

## Bulk migration

For a byte-for-byte local migration including images and bundled plugin files, run:

```bash
./scripts/migrate-from-obsidian-vault.sh /path/to/Obsidian-Vault
```

The migration script excludes Contact data, removes Homepage V2, sanitizes the committed settings example, preserves the classic dashboard, and patches portable vault paths.
