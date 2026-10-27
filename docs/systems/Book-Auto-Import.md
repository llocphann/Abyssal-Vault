# Automatic Book Notes

Book notes use the existing `Book_Tracker.base` and `book-v1` Custom View. Markdown and YAML remain the source of truth; importing does not overwrite personal reading notes.

## Use

1. Open Obsidian and reload Templater user scripts (restart once after pulling the new files).
2. Create a **new blank note** inside `20_Personal_Life/24_Book_Tracker/Books`.
3. The existing Templater folder mapping automatically invokes `90_System/91_Templates/Book_Template.md`, which delegates to `book_metadata.js`.
4. Enter a title, author or valid ISBN-10/13. Choose a preferred language (default: **Auto — All Languages**), then select the book and exact edition. Esc at the search prompt creates a blank note; Esc in the language selector keeps the configured default.
5. Verify edition, page count and cover. Reading progress, rating, highlights and personal notes remain yours to edit.

## Preferred language

**Default: `auto` — Auto, All Languages.** No language restrictions are added for Auto. Unicode search terms and filenames retain Vietnamese accents and Japanese, Chinese, or Korean writing.

| Preference | Behavior |
| --- | --- |
| `auto` | Search every language with no `lang` or `langRestrict` filter. |
| `vi` | Prefer Vietnamese. Open Library's `lang=vi` boosts appropriate editions without excluding others. Google Books tries `langRestrict=vi` first, then searches all languages if it finds no result. |
| `en` | Prefer English with `lang=en` and `langRestrict=en`; Google Books also has unrestricted fallback. |
| `original` | Where Open Library explicitly declares a Work's original language, prioritize matching editions. Otherwise no language restriction; Google Books does not reliably identify original-language editions. |

A precise ISBN lookup remains exact, regardless of language preference. The importer will not silently replace an ISBN's edition with a different translation. Available metadata (page count, cover, summary) may differ by edition; verify the selected result.

The persistent default is `book_language: auto` in `settings.md`. You may override it with `book_language: vi` (or another supported value) in the gitignored `settings.local.md`. The selection for one new note does not change the default or any existing reading record.

## Providers

- **Auto** (default): searches Open Library and Google Books; an error at one provider does not stop the other.
- **Open Library**: searches works, identifies ISBN editions, fetches edition-specific data and, where available, author and work metadata.
- **Google Books**: searches Volumes; the selected Volume supplies edition-specific pages and cover.
- Data from different editions is **not merged**. If a provider has no page count, `TotalPages: 0` is retained instead of guessing.

Optional non-secret setting in `90_System/93_Configuration/settings.md`:

```yaml
book_provider: auto # auto | openlibrary | googlebooks
book_language: auto # auto | vi | en | original
```

Optional local override in **gitignored** `90_System/93_Configuration/settings.local.md`:

```yaml
book_provider: auto
book_language: auto
google_books_key: "" # optional; never commit a real key
```

Open Library needs no API key. Public Google Books metadata queries can work without a key but remain subject to service limits.

## Google Books fallback and progress

To avoid an unresponsive-looking import, the importer shows a non-blocking
Obsidian progress notice with a **five-step bar, current activity and elapsed
seconds**. This indicates workflow steps, not an invented network-download
percentage; API calls do not provide byte-level progress. The indicator is
closed even if the user cancels, a request fails or the note is rejected as
a duplicate.

1. **Searching Google Books** — in `auto` or `googlebooks` provider mode.
2. **Checking / switching to Open Library** — Google failures and empty search
   results show an explicit "Switching to Open Library..." notice. Auto also
   offers Open Library as an additional option when Google search succeeds.
3. **Retrieving metadata** — after selecting a result. If a Google Books
   edition is missing key metadata, the importer can recover a *better*
   Open Library record only when its ISBN is identical.
4. **Downloading cover** — if a Google cover is missing or invalid, the
   importer looks for a cover from an ISBN-matched Open Library edition.
   Other metadata stays attributed to Google Books for cover-only fallback.
5. **Creating Book note** — preserves the existing Book Tracker schema.

In `googlebooks` provider mode, Open Library is still tried if Google
search fails or yields no results. In `openlibrary` mode, Google Books
is not queried. If both sources are unavailable, the importer creates a
valid blank Book note instead of hanging.

JSON requests have a **15-second timeout** and cover requests a **12-second
timeout**. Obsidian's `requestUrl` does not support aborting an in-flight
request, so these timeouts stop waiting for slow requests without cancelling
their underlying network transport. When no verified ISBN exists, no
different-language edition is silently substituted; incomplete Google
metadata may instead be kept intact for manual correction.

All UI labels and notifications remain **in English**, while book titles,
authors and content remain multilingual.

## Schema

**Unchanged fields:** `Title`, `Author`, `Cover`, `Status`, `CurrentPage`, `TotalPages`, `DateStarted`, `DateFinished`, `Rating`, `Genre`, and `tags: [Book]`. Imported books start at `Haven't started`, page 0, and unrated. The Synopsis body imports the source description when available, but personal takeaways, reviews and highlights are never fabricated.

**Additional optional import fields:** `isbn10`, `isbn13`, `openlibrary_work_id`, `openlibrary_edition_id`, `google_books_id`, `book_provider`, `provider_book_id`, `publisher`, `published_date`, `language` and `source_url`.

Book cover images are downloaded to `90_System/95_Media_Assets/Books`, named by provider and stable edition/volume identity, and referenced by `Cover: "[[...-cover.jpg]]"`. The downloader uses trusted HTTPS provider hosts, verifies JPEG/PNG/WebP binary signatures, reuses existing local covers and avoids basename collisions. Image failures leave a valid note without a cover.

## Safety

- Existing nonempty Book notes are never replaced by the importer.
- Duplicate ISBN, Open Library edition, Google Books Volume or matching provider identifiers prevent creation of a second imported record. A newly-created empty placeholder may be trashed only after its identity and empty state are rechecked through Templater's completion hook.
- Legacy manual notes may not have IDs, so title-only duplication is not automatically blocked: separate editions may legitimately share a title.
- On errors, cancel or no results, a valid blank Book note is generated.
- API credentials, if provided, must remain in local settings and never be committed.

## Tests

From the repository root:

```bash
node --check 90_System/92_Scripts/Template_Scripts/book_metadata.js
node tests/book_metadata.test.js
```

Twenty-five tests use mocked Obsidian APIs and make no external network calls, including multilingual search, provider fallback, incomplete metadata, ISBN-safe cover recovery and progress UI. A manual smoke test in Obsidian remains necessary to verify dialogs, real provider responses and Custom View rendering.
