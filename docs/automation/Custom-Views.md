# Custom Views

Abyssal Vault keeps important Custom View source files inside the repository and synchronizes them into the Custom Views plugin at runtime. This makes the repository copy authoritative and keeps UI logic version-controlled.

## Synchronization model

```text
Repository source files
        ↓
Sync Template
        ↓
Custom Views plugin settings
        ↓
Rendered Custom View
```

The plugin-stored copy is a runtime target, not the source of truth.

# Settings Custom View

Authoritative files live under `90_System/93_Configuration/Custom_Views/Settings`.

## `Settings.html`

- **UI skeleton** — defines the DOM structure of the Vault Settings interface.

## `Settings.css`

- **Visual system** — defines layout, tabs, cards, controls, spacing, and responsive behavior.

## `Settings.js`

- **Settings renderer** — converts frontmatter properties into interactive controls.
- **General** — manages vault identity and start date.
- **Homepage & Daily** — manages schedule and weather configuration.
- **Services** — manages media, recipe, and related service configuration.
- **Games** — manages RAWG, Steam, and GOG settings.
- **Finance & Locale** — manages Finance defaults and formatting.
- **Advanced** — exposes technical/custom settings.
- **Globe Widget** — manages Globe appearance, zoom, rendering, sources, and texture settings.
- **Text control** — renders ordinary text fields.
- **Date control** — renders date values.
- **Secret control** — renders credential-style inputs.
- **Select control** — renders enumerated settings.
- **JSON control** — edits structured object/list values.
- **Currency control** — validates currency-style input.
- **Number control** — handles numeric values.
- **Size control** — handles `WIDTHxHEIGHT` settings.
- **Color control** — manages the Monochrome Globe color.
- **Layout persistence** — reads/writes `_settings_layout_v1` layout metadata.
- **Custom tabs/headings** — reorganizes the Settings UI without renaming the underlying configuration keys.

`Sync_Settings_Custom_View.md` loads these files, validates JavaScript, detects changes, and synchronizes the result into the `vault-settings-v1` plugin view.

# Places Custom View

Authoritative files live under `90_System/93_Configuration/Custom_Views/Places`.

## `view.json`

- **View descriptor** — defines identity and metadata for `places-v1`.

## `template.html`

- **DOM structure** — defines the Places interface markup.

## `script.js`

- **Core runtime** — coordinates the main Places behavior and data presentation.

## `inline-edit.js`

- **Inline editing** — allows supported Place metadata to be modified directly from the view.

## `media-parity.js`

- **Media behavior** — keeps Place media handling consistent between records and the Custom View.

## `map-controls.js`

- **Map controls** — manages map-specific interaction and UI actions.

## `weather.js`

- **Weather runtime** — retrieves and injects current conditions using Place location data.

## `styles.css`

- **Core styling** — defines the base visual language of the view.

## `local-map.css`

- **Map styling** — styles the map container and map-specific layout.

## `interactive.css`

- **Interaction states** — defines hover, active, focus, and other interactive states.

## `media-parity.css`

- **Media styling** — keeps imagery presentation consistent.

## `map-controls.css`

- **Control styling** — styles map controls and control states.

## `weather.css`

- **Weather styling** — styles weather values and weather-specific UI.

## `Local.base`

- **Local data view** — provides Base support for the Places interface.

`Sync_Places_Custom_View.md` assembles the HTML, CSS, and JavaScript modules, writes the composed view to the Custom Views plugin, refreshes it, and bootstraps the weather runtime.

## Why this design is used

- UI code can be reviewed through Git history.
- A cloned vault includes the authoritative interface source.
- Complex Custom Views can be split into maintainable modules.
- Plugin settings can be regenerated instead of manually repaired.
- Custom View changes can be synchronized without copying code by hand.