# Music Tracker — Custom Views & Base

## Setup

Music notes are stored under \`20_Personal_Life/28_Music_Tracker/Songs\` and \`Albums\`. Open \`Music_Tracker.base\` for Music Library and Favourite cards. New blank notes in the two folders trigger \`Song_Template.md\` and \`Album_Template.md\`.

Custom Views v0.5.0 is preconfigured in \`.obsidian/plugins/custom-views/data.json\` with \`music-song-v1\` and \`music-album-v1\`. Authoritative source files live in this folder. \`Sync_Music_Custom_Views.md\` runs during Templater startup and safely updates only those two views. Existing Views such as Movies, TV Series, Books, and Places are retained. The Custom Views plugin and JavaScript option must be enabled.

## Card rendering fix

The \`html()\` type in Obsidian Bases must wrap the **result** of string template replacements:
\`html(("<article>...</article>").replace("{title}", Title))\`.
Calling \`html("...").replace(...)\` returns plain text, which renders as raw tags in a card cell. The Music Base formulas now use the correct order.

## Notes UI

The Album view shows a cover-first hero, metadata, personal rating, favourite toggle, linked tracklist, and editable Album journal. The Song view shows cover art, metadata, album navigation, personal rating and favourite controls, and an editable Markdown journal for lyrics and reflections. Buttons save via Obsidian \`processFrontMatter\`. The original \`{{file.content}}\` is retained so native Live Preview remains usable.

External music links and external covers require HTTPS. Album tracklist entries using \`[[Song name]]\` open the linked note. Other entries stay readable as plain text. Do not embed third-party full lyrics without permission.

## Verification

After pulling \`dev\`, reload Obsidian or run the Music sync template. Create a Song and an Album note, check both Custom Views in Reading and Live Preview, toggle Favourite, set ratings, confirm track links, and test external covers. Run \`node tests/music_views.test.js\` and \`node tests/music_metadata.test.js\` from the repo root. UI layout still requires Owner acceptance on the installed desktop.

## Artwork and lyrics enrichment

The importer now tries Cover Art Archive release and release-group artwork before using a strictly matched Apple iTunes artwork URL. Apple artwork is linked to its official listing, not downloaded. Lyrics identity comes from LRCLIB, while copyrighted lyric text is fetched temporarily in Song Custom View rather than written into Markdown. For existing notes use Templater's `Music_Refresh_Metadata.md` on the open note; it only fills missing Cover/Lyrics source fields, never replaces personal reflections.


## Native artwork and Journal-style notebook (2026-10-20)

- **Bases artwork:** Uses Obsidian's \`image(Cover)\` instead of interpolating a raw \`<img>\` tag. Missing covers display an \`icon("disc-3")\` placeholder. Do not hide the \`formula.music_art\` property.
- **Automatic cover recovery:** Opening a Song/Album note with no \`Cover\` performs a single background metadata lookup. If a remote cover fails to load, the view offers the **Find artwork** action for retry. Matching song title + artist is required; an exact album match is preferred but not mandatory. The metadata importer still supports manual \`Music_Refresh_Metadata.md\` on an existing note.
- **CORS handling:** \`Sync_Music_Custom_Views.md\` registers a request bridge using Obsidian's \`requestUrl\` API, restricted to Cover Art Archive, iTunes, LRCLIB and MusicBrainz. This runs with Templater's startup templates. Restart/reload Obsidian after pulling this commit; an existing view instance may be using cached plugin JavaScript.
- **Journal parity:** Both Song and Album notes wrap the native \`{{file.content}}\` in a lined-paper view with the same \`--vault-note-paper-*\` variables, ruled lines, redacted margin, paper edge and shadow used in the Journal Custom View. \`Lyrics\` from LRCLIB stays separate from this editable Markdown paper.
- **Check:** Open \`Music_Tracker.base\`, then open an existing Song such as "Everybody Loves Somebody" and allow the background lookup to finish. If artwork remains absent, run Templater's \`Music_Refresh_Metadata.md\` and check the \`Cover\` and \`StoreUrl\` frontmatter properties. Remote provider availability and playback service license terms can still cause some images to be unavailable.
