# Book Tracker

`20_Personal_Life/24_Book_Tracker` stores books as Markdown records and renders them through `Book_Tracker.base`.

## Book records

Current sample/library records include the A Song of Ice and Fire volumes and `Donquixote.md`.

### Functions of a Book note

- **`Title`** — stores the display title separately from the filename.
- **`Author`** — stores the author.
- **`Cover`** — supplies cover art to the collection view.
- **`Status`** — tracks reading state.
- **`CurrentPage`** — stores current progress.
- **`TotalPages`** — stores total length.
- **Reading progress** — derived from `CurrentPage / TotalPages`.
- **`DateStarted`** — stores the reading start date.
- **`DateFinished`** — stores the completion date.
- **`Rating`** — stores personal evaluation.
- **`Genre`** — supports multiple genres.
- **Synopsis** — stores a summary.
- **Notes & Takeaways** — stores extracted lessons and ideas.
- **Highlights** — stores notable quotations or passages.
- **Review & Thoughts** — stores personal evaluation and commentary.
- **Connections** — links related books, topics, applications, or projects.

## `Book_Template.md`

The template initializes a valid Book schema with `Status: Haven't started`, zeroed page progress, empty reading dates, optional rating, the `Book` tag, and a multi-value `Genre` field.

## `Book_Tracker.base`

### Functions

- **Book discovery** — queries notes tagged `#Book`.
- **System exclusion** — excludes records under `90_System` and `99_Archives`.
- **Status normalization** — converts stored status into a compact front-card label.
- **Reading progress** — calculates percentage from current and total pages.
- **Packed book card** — renders title, author, genres, status, progress, pages, and rating.
- **Book Collection** — provides the primary card library.
- **Book Data — Edit** — provides a table for direct metadata editing.

The Markdown Book note remains the source of truth; the Base only renders and edits its fields.