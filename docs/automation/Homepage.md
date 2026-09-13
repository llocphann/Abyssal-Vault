# Homepage

`90_System/98_Homepage/Homepage.md` is the orchestration layer of Abyssal Vault. It does not own most business logic; it composes independent scripts into one dashboard.

## Frontmatter

The Homepage uses dashboard-specific frontmatter including the banner image, `home-dashboard` CSS class, and dashboard tag.

## Functions

- **Dashboard identity** — applies Homepage-specific styling.
- **Banner** — displays `Banner.png`.
- **Header runtime** — calls `info-headers.js`.
- **Daily schedule** — calls `schedule-callout.js`.
- **Decorative media** — includes visual artwork within the layout.
- **Globe defaults** — calls `globe-settings-init.js` before rendering the Globe.
- **3D Globe** — calls `globe-widget.js`.
- **Vector overlay** — calls `globe-vector-map-overlay.js` after the Globe has initialized.
- **Exercise** — calls `exercise-callout.js`.
- **Cardio** — calls `cardio-callout.js`.
- **Finance Quick Add** — calls `finance-quick-add.js`.
- **Multi-column composition** — arranges schedule, visual media, Globe, exercise, cardio, and finance controls into a dashboard.

## Globe execution order

The current sequence is intentional:

```text
globe-settings-init.js
        ↓
globe-widget.js
        ↓
globe-vector-map-overlay.js
```

### Step 1 — Settings initialization

Ensures required Globe settings exist and restores missing defaults.

### Step 2 — Globe renderer

Creates the primary Globe state, geographic layers, Place markers, clustering, and interaction behavior.

### Step 3 — Vector overlay

Uses the initialized state to provide detailed vector geography and synchronized high-zoom interaction.

Changing this order without updating the synchronization logic can break the relationship between the Globe and its vector overlay.

## Header runtime

`info-headers.js` supplies:

- time-sensitive greeting;
- live clock;
- vault age;
- note, journal, book, and tag counts;
- OpenWeatherMap current conditions;
- recent activity heatmap;
- Abyssal palette information;
- dashboard actions/navigation.

## Daily content

The Homepage does not duplicate a weekly schedule. `schedule-callout.js`, `exercise-callout.js`, and `cardio-callout.js` select the correct weekday note under `90_System/97_Daily_Schedule` and transclude the configured heading.

## Finance creation

`finance-quick-add.js` turns the Homepage into a creation surface for Finance records without making the Homepage itself the Finance database.

## Design principle

The Homepage should remain replaceable. If it is removed, the underlying Journal, Places, Finance, Media, Game, Recipe, Book, and Exercise records still exist as ordinary Markdown data.