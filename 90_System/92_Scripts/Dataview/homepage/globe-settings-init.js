const SETTINGS_PATH = "90_System/93_Configuration/settings.md";
const DEFAULTS = Object.freeze({
  // Appearance
  globe_size: "500x500",
  globe_style: "abyssal",
  globe_monochrome_color: "#10181b",
  location_pins: "line",

  // Data sources
  globe_source_folders: [
    "20_Personal_Life/23_Places",
    "20_Personal_Life/26_Food_&_Drinks/Restaurants",
    "20_Personal_Life/26_Food_&_Drinks/Cafes",
    "20_Personal_Life/26_Food_&_Drinks/Bars",
  ],

  // Display / render sizing
  globe_display_min: 250,
  globe_display_max: 2000,
  globe_render_min: 500,
  globe_render_max: 2000,

  // Navigation / scale
  globe_min_zoom: 0.72,
  globe_max_zoom: 32,
  globe_default_zoom: 0.92,
  globe_base_scale: 0.84,

  // Texture resolution
  globe_texture_width: 4096,
  globe_texture_height: 4096,
});

const GLOBE_SETTING_KEYS = Object.freeze(Object.keys(DEFAULTS));
const cloneSetting = value => Array.isArray(value) ? [...value] : value;

const app = dv.app ?? globalThis.app;
const page = dv.page("90_System/93_Configuration/settings") || dv.page("settings") || {};
const missing = GLOBE_SETTING_KEYS.filter(key => page?.[key] == null);

if (missing.length) {
  const file = app?.vault?.getAbstractFileByPath?.(SETTINGS_PATH);
  if (file && app?.fileManager?.processFrontMatter) {
    try {
      await app.fileManager.processFrontMatter(file, frontmatter => {
        const grouped = {};

        for (const key of GLOBE_SETTING_KEYS) {
          grouped[key] = frontmatter[key] != null
            ? frontmatter[key]
            : cloneSetting(DEFAULTS[key]);
        }

        // Reinsert the whole globe block together so restored/missing keys do not
        // end up scattered across the settings note.
        for (const key of GLOBE_SETTING_KEYS) delete frontmatter[key];
        for (const key of GLOBE_SETTING_KEYS) frontmatter[key] = grouped[key];
      });
    } catch (error) {
      console.warn("[homepage-globe] settings initializer failed:", error);
    }
  }
}
