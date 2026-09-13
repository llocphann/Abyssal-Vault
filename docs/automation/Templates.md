# Templates

Templates live under `90_System/91_Templates` and define the initial schema and body structure of notes created by Abyssal Vault.

## `Journal_Template.md`

- **Date detection** — reads a valid date from common date-style filenames.
- **Date fallback** — prompts when the filename does not provide a usable date.
- **Weekday detection** — resolves the weekday used by the Daily Schedule system.
- **Random quote** — calls `tp.user.quotes()`.
- **Quote parsing** — separates quote text and author.
- **Daily metadata** — creates Day, journal, mood, energy, weight, reflection, quote, and quote-author fields.
- **Daily tag** — adds the Daily Notes tag.
- **Schedule injection** — embeds the current weekday schedule.
- **Exercise injection** — embeds the current Calisthenics section.
- **Cardio injection** — embeds the current Cardio section.
- **Day Planner** — creates planning space.
- **Daily Log** — creates chronological logging space.
- **Body Pic** — creates a physique-tracking location.

## `Cornell_Template.md`

- **Title prompt** — asks for a topic and renames the file.
- **Course prompt** — asks for course or subject.
- **Context selector** — supports Lecture, Reading, Research, and Meeting.
- **Unique ID** — generates a timestamp identity.
- **Draft status** — initializes the note as draft.
- **Session Metadata** — stores context, course, date, source, and author/instructor information.
- **Learning Objectives** — defines expected learning outcomes.
- **Main Notes** — stores the main explanation.
- **Key Concept** — isolates definitions, principles, and mechanisms.
- **Example** — stores examples or cases.
- **Verified** — separates confirmed information.
- **Common Mistake** — records misconceptions and reasoning errors.
- **Related** — links prerequisites and neighboring notes.
- **Feynman Summary** — requires explanation in the learner's own words.
- **Active Recall** — creates self-test prompts.
- **Spaced Review** — creates Today, +1, +3, +7, +14, and +30 review checkpoints.

## `Zettelkasten_Template.md`

- **Timestamp ID** — generates a stable `YYYYMMDDHHmmss` identity.
- **Filename identity** — renames the note to `<ID> - <Title>`.
- **Note type** — supports Permanent, Literature, and Fleeting notes.
- **Core Idea** — requires a concise atomic proposition.
- **Content** — provides space for one self-contained idea.
- **Parent / Overview** — links the broader concept.
- **Supporting / Extension** — links supporting ideas.
- **Contradiction / Alternative** — links competing ideas.
- **Sources & References** — records provenance.

## `Clipping_Template.md`

- **Clipping identity** — uses `type: clipping`.
- **Source metadata** — stores title, author, published date, captured date, and source URL.
- **Site metadata** — stores site and domain.
- **Description** — stores a summary.
- **Image** — stores representative media.
- **Language** — records source language.
- **Word count** — stores article length.
- **Inbox state** — initializes as an inbox item.
- **Highlights** — stores important excerpts.
- **Article** — stores captured content.
- **Notes** — stores personal commentary.

## `Contact_Template.md`

- **Full Name** — stores contact name.
- **Birthday** — stores date of birth.
- **Phone** — stores phone number.
- **Address** — stores address.
- **Company** — stores organization.
- **Email** — stores email address.
- **Created** — stores creation timestamp.
- **Contact tag** — makes contact records queryable as a group.

## `Book_Template.md`

- **Book identity** — initializes a Book record compatible with `Book_Tracker.base`.
- **Author / Cover** — provides author and artwork fields.
- **Reading state** — initializes status to `Haven't started`.
- **Page progress** — initializes CurrentPage and TotalPages.
- **Reading dates** — provides DateStarted and DateFinished.
- **Rating / Genre** — provides evaluation and classification fields.
- **Synopsis** — creates summary space.
- **Notes & Takeaways** — creates knowledge-extraction space.
- **Highlights** — creates quotation/excerpt space.
- **Review & Thoughts** — creates personal review space.
- **Connections** — creates links to related books, topics, applications, or projects.

## `Place_Template.md`

- **Folder detection** — infers semantic type from the destination folder.
- **Place type** — assigns tourist, misc, restaurant, cafe, or bar.
- **Coordinates** — stores latitude/longitude for maps and weather.
- **Location metadata** — provides address, city, region, and country.
- **Visited / Wishlist / Favorite** — provides personal state fields.
- **Rating / Last visited** — provides evaluation and visit history.
- **Cover** — provides representative media.
- **Website / Phone / Opening hours** — provides venue information.
- **Cuisine / Price level** — provides food-place metadata.
- **Created** — records creation date.
- **Why remember** — records why the place matters.
- **Notes** — provides free-form observations.

## `Finance_Transaction_Template.md`

- **Record identity** — initializes `RecordType: FinanceTransaction` and a unique transaction ID.
- **Finance schema/book** — associates the record with the Finance engine and logical book.
- **Date / Type / Description** — stores transaction context.
- **Amount / Currency** — stores original value.
- **Account / ToAccount** — supports ordinary transactions and transfers.
- **Category / Fixed** — supports reporting classification.
- **Commitment link** — can associate a transaction with a recurring commitment.
- **FX fields** — stores conversion rate and normalized base amount.
- **Fee fields** — supports transfer fees.
- **Transaction notes** — provides additional body notes.

## `Finance_Subscription_Template.md`

- **Record identity** — initializes `RecordType: FinanceCommitment` and a commitment ID.
- **Name / Amount / Currency** — stores recurring payment information.
- **Account / Category** — stores payment source and classification.
- **Frequency** — defaults to monthly in the current schema.
- **Due day** — stores the recurring day of payment.
- **Start / End dates** — define active period.
- **FX fields** — support base-currency normalization.
- **Active** — disables a commitment without deleting its history.
- **Subscription notes** — provides additional notes.

## `Movie_Template.md`

- **Private TMDB configuration** — reads the TMDB key from local configuration.
- **Search** — searches TMDB by prompt or filename.
- **Result selection** — lets the user choose the correct match.
- **Detail fetch** — retrieves details, credits, and external IDs.
- **Metadata import** — imports title, year, genres, overview, tagline, runtime, release date, IMDb ID, and TMDB ID.
- **Credits** — imports director, writer, and cast information.
- **Knowledge links** — converts people to wikilinks where appropriate.
- **Barcode** — generates a local Code 128 SVG identity.
- **Local poster/backdrop** — delegates media download to `tmdb_media.js`.
- **Personal rating** — prompts for a 1–10 score.
- **Last watched** — accepts relative or natural-language dates where available.
- **Filename sanitation** — creates portable filenames.
- **Alias preservation** — preserves the original title when the filename changes.
- **Failure safety** — avoids deleting an existing note when import fails.

## `TV_Show_Template.md`

- **Private TMDB configuration** — reads TMDB credentials locally.
- **TV search and selection** — searches the TMDB TV catalog and lets the user choose a result.
- **Metadata import** — imports creators, directors, writers, cast, genres, networks, seasons, episodes, runtime, status, dates, language, description, tagline, and external IDs.
- **Local poster/backdrop** — delegates download to `tmdb_media.js`.
- **Personal rating / Last watched** — records user-specific state.
- **Filename sanitation / Alias preservation** — keeps filenames portable without losing the original title.
- **Failure safety** — protects existing records.

## `Game_Template.md`

- **Metadata import** — calls `tp.user.game_metadata(tp)`.
- **Personal Log** — adds gameplay-reflection prompts.
- **Mechanics** — adds prompts for systems, builds, and strategy.
- **Story & World** — adds prompts for narrative/worldbuilding.
- **Memorable Moments** — adds prompts for standout experiences.

## `Game_Stats_Sync.md`

- **Statistics entrypoint** — calls `tp.user.game_platform_stats(tp)`.
- **Existing-record update** — synchronizes personal statistics without recreating the Game record.

## `Recipe_Template.md`

- **Importer entrypoint** — calls `tp.user.spoonacular_recipe(tp)`.
- **Provider abstraction** — delegates provider choice and schema normalization to the importer.

## `Sync_Settings_Custom_View.md`

- **Normalization** — normalizes Globe-related settings and migrates supported legacy keys.
- **Plugin readiness** — waits for Custom Views to load.
- **View identity** — targets `vault-settings-v1`.
- **Source loading** — reads authoritative Settings HTML, CSS, and JS from the repository.
- **JavaScript validation** — validates the source before writing it to plugin settings.
- **Change detection** — avoids unnecessary writes.
- **Save and refresh** — persists the synchronized view and refreshes runtime output.

## `Sync_Places_Custom_View.md`

- **Plugin readiness** — waits for Custom Views.
- **Descriptor/template loading** — reads `view.json` and `template.html`.
- **CSS assembly** — combines core, map, interaction, media, controls, and weather styles.
- **JavaScript assembly** — combines core runtime, inline editing, media behavior, map controls, and weather runtime.
- **View ordering** — keeps the Places view in the intended plugin order.
- **Change detection** — avoids unnecessary writes.
- **Save and refresh** — persists and refreshes the assembled Custom View.
- **Weather bootstrap** — initializes Places weather behavior.