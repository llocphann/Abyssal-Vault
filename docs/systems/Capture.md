# Capture System

`00_Capture` is the high-frequency entry point for information that is created, learned, or collected before it becomes long-term structured knowledge.

## `01_Journal`

Daily Journal notes are created from `Journal_Template.md`.

### Functions

- **Date identity** — each Journal note represents one calendar day.
- **Daily metadata** — stores mood, energy, weight, reflection, quote, and quote author.
- **Dynamic schedule** — embeds the current weekday schedule from `90_System/97_Daily_Schedule`.
- **Dynamic exercise** — embeds the current Calisthenics section.
- **Dynamic cardio** — embeds the current Cardio section.
- **Day Planner** — provides planning space.
- **Daily Log** — provides chronological logging space.
- **Body Pic** — provides a location for physique-tracking images.

`Samples/2026-01-05.md` and `Samples/2026-01-06.md` demonstrate generated Journal structure and are sample data rather than runtime components.

## `02_Cornell`

Cornell notes are created from `Cornell_Template.md` and are intended for structured learning.

The note body is plain Markdown: H2 headings define major Cornell sections, while H3 marker headings define individual cue/note entries. Reading mode converts those entries into the two-column Cornell sheet; Live Preview remains a native editable Markdown document. Legacy fenced `cornell` blocks remain supported while older notes are migrated.

`Sample — Quang hợp cơ bản.md` demonstrates the Markdown-native Cornell structure.

### Functions

- **Session Metadata** — identifies course, context, date, author/instructor, and source.
- **Learning Objectives** — states what should be understood after the session.
- **Main Notes** — stores the primary explanation.
- **Key Concept** — isolates definitions, principles, and mechanisms.
- **Example** — stores worked examples or cases.
- **Verified** — separates confirmed information.
- **Common Mistake** — records misconceptions and reasoning errors.
- **Related** — links prerequisites and neighboring concepts.
- **Feynman Summary** — requires an explanation in the learner's own words.
- **Active Recall** — creates self-test prompts.
- **Spaced Review** — creates checkpoints for Today, +1, +3, +7, +14, and +30 days.

## `03_Zettelkasten`

Zettelkasten notes store atomic ideas with stable timestamp identities.

`20260105103000 - Meaning Depends on Context.md` is a sample permanent note.

### Functions

- **Timestamp ID** — provides a stable identity independent of the note title.
- **Atomic Core Idea** — captures the note in one concise proposition.
- **Content** — develops one self-contained idea.
- **Parent / Overview** — connects the idea to a broader concept.
- **Supporting / Extension** — links evidence or extensions.
- **Contradiction / Alternative** — links competing ideas.
- **Sources & References** — keeps provenance attached to the idea.

## `09_Clippings`

This folder is reserved for article and web captures created with `Clipping_Template.md`.

### Functions

- **Source metadata** — stores author, URL, site, domain, publication date, and capture date.
- **Inbox workflow** — new clippings start in an inbox-style state.
- **Highlights** — stores important excerpts.
- **Article** — stores captured content.
- **Notes** — stores personal commentary and synthesis.