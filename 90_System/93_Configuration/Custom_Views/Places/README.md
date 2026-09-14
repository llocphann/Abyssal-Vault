# Places Custom View

## Weather

Places shows current conditions for a note's `coordinates` using OpenWeatherMap Current Weather Data.

### Runtime architecture

Weather is intentionally **transient**. It is not written to Place frontmatter, so changing conditions do not make the Git working tree dirty.

`Places/weather.js` owns a shared in-memory runtime on the active Obsidian window. The same runtime serves both:

- the Weather panel inside a Place Custom View;
- the weather/metadata face inside `23_Places/Map.base` popups.

The runtime reads configuration from the vault Settings note, requests weather only when a Place card or map popup needs it, caches successful responses in memory for 15 minutes, and deduplicates concurrent requests for the same coordinates. No Places Weather plugin or `localStorage` weather cache is required.

The existing `Sync_Places_Custom_View.md` startup template bootstraps this same runtime after synchronizing the Places Custom View. This keeps standalone `Map.base` popups functional even when no Place note has been opened yet.

### API configuration

Weather configuration comes from `90_System/93_Configuration/settings.md`.

- `openweathermap_key` is the canonical OpenWeatherMap API credential used by the vault.
- `openweathermap_apikey` is accepted as a compatibility alias by the Places runtime.
- `openweathermap_unit` controls provider units. Supported values are `metric`, `imperial`, and `standard`.
- `openweathermap_city` remains the default location for weather views that are not tied to a Place note. Places itself uses each note's coordinates instead.

The API key is never copied into Place frontmatter, Custom Views plugin data, map formulas, logs, or browser storage by the Places runtime.

### Map popup

`Map.base` renders coordinates and weather placeholders only. The shared Places runtime watches for those popup elements and hydrates current conditions lazily when a popup exists.

For places with a `cover`, the popup keeps the Media Library two-face interaction:

- front: cover + centered place name;
- delayed hover/focus: live weather + metadata back face.

Without a cover, the weather/metadata face is shown directly.

The back face shows current temperature, condition, humidity, wind, place type, location and personal status. Its weather request uses the same 15-minute cache as the Place detail Weather card.

### Refresh and invalidation

The Weather card in a Place note has `↻` to force-refresh current weather.

Normal requests reuse cached data for up to 15 minutes. If the Settings note changes, its file modification time invalidates the runtime cache on the next weather request, so changing the API credential or unit does not require a separate plugin lifecycle listener.

### Custom View source sync

After changing Places source modules, run:

```bash
python3 90_System/93_Configuration/Custom_Views/sync_places_custom_view.py
```

or rely on `90_System/91_Templates/Sync_Places_Custom_View.md` at startup when Templater Startup Templates are enabled.
