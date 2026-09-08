# Abyssal-Vault

A community-ready Obsidian vault template derived from `Obsidian-Vault`.

## Template scope

The top-level vault skeleton mirrors the main numbered folders from the source vault:

- `00_Capture`
- `10_Projects`
- `20_Personal_Life`
- `40_Academics`
- `60_Digital_Library`
- `70_Interests_&_Research`
- `90_System`
- `99_Archives`

Existing reusable content already curated in `20_Personal_Life` is preserved.

### `90_System`

- `91_Templates`: reusable template notes are kept, except `Onion_Site_Template.md`, `Teaching_Session_Outline.md`, and `Vocabulary_Learning_Template.md`.
- `92_Scripts`: folder placeholder only; source-vault scripts are not distributed.
- `93_Configuration`: folder placeholder only; source-vault configuration is not distributed.
- `95_Media_Assets`: folder placeholder only; source-vault media is not distributed.
- `96_Auto_Attachments`: folder is present in the repository. The local migration helper can mirror its binary contents from a local source vault when explicitly run.
- `97_Daily_Schedule`: copied from the source vault.
- `98_Homepage`: the classic homepage is retained in its public-safe form.

## Refresh from a local source vault

Run:

```bash
./scripts/migrate-from-obsidian-vault.sh /path/to/Obsidian-Vault
```

The helper follows the same inclusion rules: it preserves the numbered top-level skeleton, imports allowed templates, keeps `92`, `93`, and `95` empty, mirrors `96`, `97`, and `98`, and removes the personal-photo line from the classic homepage.
