# Music Tracker — Custom Views & Base

## Setup

Music notes are stored under \`20_Personal_Life/28_Music_Tracker/Songs\` and \`Albums\`. Open \`Music_Tracker.base\` for Music Library and Favourite cards. New blank notes in the two folders trigger \`Song_Template.md\` and \`Album_Template.md\`.

Custom Views v0.5.0 is preconfigured in \`.obsidian/plugins/custom-views/data.json\` with \`music-song-v1\` and \`music-album-v1\`. Authoritative source files live in this folder. \`Sync_Music_Custom_Views.md\` runs during Templater startup and safely updates only those two views. Existing Views such as Movies, TV Series, Books, and Places are retained. The Custom Views plugin and JavaScript option must be enabled.

## Card rendering fix

The \`html()\` type in Obsidian Bases must wrap the **result** of string template replacements:
\`html(("<article>...</article>").replace("{title}", Title))\`.
Calling \`html("...").replace(...)\` returns plain text, which renders as raw tags in a card cell. The Music Base formulas now use the correct order.

## Notes UI

The Album view shows a cover-first hero, metadata, personal rating, favourite toggle, linked tracklist, and editable Album journal. The Song view shows cover art, metadata, album navigation, personal rating and favourite controls, and an editable Markdown journal for personal reflections. Buttons save via Obsidian \`processFrontMatter\`. The original \`{{file.content}}\` is retained so native Live Preview remains usable.

External music links and external covers require HTTPS. Album tracklist entries using \`[[Song name]]\` open the linked note. Other entries stay readable as plain text. Do not embed third-party full lyrics without permission.

## Verification

After pulling \`dev\`, reload Obsidian or run the Music sync template. Create a Song and an Album note, check both Custom Views in Reading and Live Preview, toggle Favourite, set ratings, confirm track links, and test external covers. Run \`node tests/music_views.test.js\` and \`node tests/music_metadata.test.js\` from the repo root. UI layout still requires Owner acceptance on the installed desktop.

## Artwork and lyrics enrichment

The importer now tries Cover Art Archive release and release-group artwork before using a strictly matched Apple iTunes artwork URL. Apple artwork is linked to its official listing, not downloaded. Lyrics are resolved through LRCLIB and saved into separate local .txt files, rather than being inserted into Song Markdown. For existing notes use Templater's `Music_Refresh_Metadata.md` on the open note; it only fills missing Cover/Lyrics metadata and local LyricsFile, never replaces personal reflections.


## Native artwork and Journal-style notebook (2026-10-20)

- **Bases artwork:** Uses Obsidian's \`image(Cover)\` instead of interpolating a raw \`<img>\` tag. Missing covers display an \`icon("disc-3")\` placeholder. Do not hide the \`formula.music_art\` property.
- **Automatic cover recovery:** Opening a Song/Album note with no \`Cover\` performs a single background metadata lookup. If a remote cover fails to load, the view offers the **Find artwork** action for retry. Matching song title + artist is required; an exact album match is preferred but not mandatory. The metadata importer still supports manual \`Music_Refresh_Metadata.md\` on an existing note.
- **CORS handling:** \`Sync_Music_Custom_Views.md\` registers a request bridge using Obsidian's \`requestUrl\` API, restricted to Cover Art Archive, iTunes, LRCLIB and MusicBrainz. This runs with Templater's startup templates. Restart/reload Obsidian after pulling this commit; an existing view instance may be using cached plugin JavaScript.
- **Journal parity:** Both Song and Album notes wrap the native \`{{file.content}}\` in a lined-paper view with the same \`--vault-note-paper-*\` variables, ruled lines, redacted margin, paper edge and shadow used in the Journal Custom View. \`Lyrics\` from LRCLIB stays separate from this editable Markdown paper.
- **Check:** Open \`Music_Tracker.base\`, then open an existing Song such as "Everybody Loves Somebody" and allow the background lookup to finish. If artwork remains absent, run Templater's \`Music_Refresh_Metadata.md\` and check the \`Cover\` and \`StoreUrl\` frontmatter properties. Remote provider availability and playback service license terms can still cause some images to be unavailable.


## Local lyrics files and paper editing (2026-10-20)

- New Song notes contain a single editable question under `## Personal Reflections`, while Album notes contain one under `## Album Impressions`. There is no Lyrics placeholder or separate Prompts section. Existing personal entries are preserved.
- With the owner's permission to keep lyrics locally, LRCLIB text is saved as a separate \`.txt\` asset at \`20_Personal_Life/28_Music_Tracker/Lyrics/LRCLIB-<id>.txt\`. Its path is stored in \`LyricsFile\`. If the asset exists, it is not overwritten; the panel loads the local text first, including offline. If local saving fails, the panel says so instead of claiming success.
- The Song Lyrics panel no longer shows the temporary/read-only copy notices. The original LRCLIB source link remains available for attribution.
- Clicking the Song or Album writing-paper content (not links or form controls) switches the matching Obsidian Markdown leaf to Live Preview (\`mode=source\`, \`source=false\`).
- Opening an older note cleans up exact generated placeholder text and unchanged prompt lines. When an existing Lyrics section contains substantive text, it first moves that text into a separate `Lyrics/Personal-<song name>.txt` asset and links it through LyricsFile, then removes the section. If writing fails or the destination contains different content, the original Lyrics section is left untouched. Personal reflections are preserved.
- Reload Obsidian after pulling to let Templater's startup \`Sync_Music_Custom_Views.md\` synchronize the authoritative HTML/CSS/JS. The committed plugin data snapshot may be older until startup sync runs.

## Compact journals and source synchronization (2026-10-20)

- The **Song Lyrics** panel is now simply **Lyrics**, with Refresh and a small source link. The retired "Read-only display" status and "Displayed temporarily" notice are not used.
- There is **no separate Prompts card or HTML overlay**. A short question is written directly into the Markdown under `## Personal Reflections` (Songs) or `## Album Impressions` (Albums), so it remains visible and editable in Live Preview. On older notes, source migration adds it only when that section is completely blank. It never duplicates a question or overwrites authored reflections. Because it is Markdown, the user may edit or remove the question when ready to write.
- The journal headings no longer repeat lengthy instructions. The editable Markdown content and local LyricsFile logic are unchanged.
- `Sync_Music_Custom_Views.md` is the authoritative sync entry point. At startup it replaces only `music-song-v1` and `music-album-v1`, places them ahead of default/broad matching views, saves them through Custom Views' `saveSettings`, and forces a re-render. While Obsidian remains open it watches changes to Music view source files and rechecks on opening a Music note.
- **If an older view persists after pulling dev:** fully restart Obsidian, or run **Templater: Open insert template modal → Sync_Music_Custom_Views.md** from a scratch note. Reopen the Song/Album note. The enabled `03_Compatibility.css` snippet also hides retired Prompts and lyrics notices while the in-memory view remains stale.
- The tracked `.obsidian/plugins/custom-views/data.json` is a generated snapshot. Authoritative Music Custom Views live in this directory, and live plugin settings may lag until synchronization runs.

## Song and Album import progress

The Song and Album folder templates use the same `tp.user.import_progress` five-step non-blocking Obsidian Notice as Games and Recipes. It shows elapsed time, step counter, progress bar, and the active operation.

1. Search MusicBrainz; show Apple iTunes fallback when needed
2. Wait for Song or Album selection
3. Fetch recording/album metadata and tracklist
4. Retrieve artwork and Song lyrics information
5. Write the Song/Album note; Album imports update the same popup for each Song note created or reused

An album's optional track creation is included within step 5, with messages such as `Creating Song notes (3/12): Track name`. The popup closes in a `finally` block on success, cancellation, provider errors or empty search results. Existing filled notes and intentionally blank templates do not initiate network import progress. This shows workflow milestones, not byte-transfer percentages.

Run `node tests/music_metadata.test.js` to check real shared Notice mocking, correct five-stage progression, no-result/cancellation cleanup, iTunes fallback and Album track creation.


## Music Base compact cards and hover drawer

`Music_Tracker.base` now renders the same **250px cover-first compact card** in Music Library, Favourite Songs and Favourite Albums. The native `image(Cover)` formula remains responsible for album/song artwork; `icon("disc-3")` is the fallback. The `formula.music_card` HTML includes two complementary regions: a short title/artist/genre/year caption and a detail pane containing metadata, description and available music links.

On desktop hover or keyboard focus, `.music-peek-detail` slides out beside the card. It is **absolutely positioned** so the underlying Obsidian Bases grid retains its original card widths; opening one card does not move other cards. The Templater startup script `Sync_Music_Custom_Views.md` registers a lightweight delegated pointer/focus handler which flips the drawer toward the side with available screen space. The handler is de-duplicated on reload. If that startup script has not run, the drawer opens to the right.

The external **Listen** anchor is included only when the note has a music link. The card itself is the existing Obsidian action to open the Song or Album note and, for Albums, inspect its tracklist. No fake local playback controls are introduced. Touch screens and narrow windows keep a compact card that opens its note; reduced-motion preferences disable sliding transitions.

After pulling `dev`, reload Obsidian and ensure `02_Components.css` is enabled in Appearance → CSS snippets. To check the hover placement handler, the existing Templater startup template must also be enabled. Test with an album card on the right edge of the Music Library gallery; its drawer should open left rather than be cut off by the viewport. You can run `node tests/music_base_peek.test.js` to test formulas, both categories and the panel's pointer/focus direction logic without writing to the vault.
