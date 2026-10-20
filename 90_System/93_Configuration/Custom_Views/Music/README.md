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
