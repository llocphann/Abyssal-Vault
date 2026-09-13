<%*
const SETTINGS_NOTE = "90_System/93_Configuration/settings.md";
const SETTINGS_TEMPLATE = "90_System/93_Configuration/Custom_Views/Settings/Settings.html";
const SETTINGS_CSS = "90_System/93_Configuration/Custom_Views/Settings/Settings.css";
const SETTINGS_JS = "90_System/93_Configuration/Custom_Views/Settings/Settings.js";

const normalizeSize = value => {
  const match = String(value ?? "500x500").trim().match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})$/i);
  if (!match) return "500x500";
  const width = Math.max(250, Math.min(2000, Number(match[1])));
  const height = Math.max(250, Math.min(2000, Number(match[2])));
  return `${width}x${height}`;
};

const normalizeStyle = value => {
  const raw = String(value ?? "abyssal").trim().toLowerCase();
  const aliases = {
    "carbon-cyan": "abyssal",
    "carbon_cyan": "abyssal",
    "dark": "abyssal",
    "travel-dashboard": "abyssal",
  };
  const style = aliases[raw] ?? raw;
  return ["abyssal", "monochrome", "revert", "colorful"].includes(style) ? style : "abyssal";
};

const normalizePins = value => {
  const raw = String(value ?? "line").trim().toLowerCase().replace(/\s+/g, "-");
  return ["line", "connected-dots", "dots"].includes(raw) ? raw : "line";
};

const normalizeColor = value => {
  const color = String(value ?? "#a0cddf").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : "#a0cddf";
};

async function waitForCustomViews() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const plugin = app.plugins.getPlugin?.("custom-views") ?? app.plugins.plugins?.["custom-views"];
    if (plugin?.settings?.views) return plugin;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

try {
  const settingsFile = app.vault.getAbstractFileByPath(SETTINGS_NOTE);
  if (settingsFile && app.fileManager?.processFrontMatter) {
    const current = app.metadataCache?.getFileCache?.(settingsFile)?.frontmatter || {};
    const legacyStyle = current.globe_style ?? current.homepage_globe_style;
    const legacyPins = current.location_pins ?? current.homepage_globe_marker_style;
    const nextSize = normalizeSize(current.globe_size);
    const nextStyle = normalizeStyle(legacyStyle);
    const nextColor = normalizeColor(current.globe_monochrome_color);
    const nextPins = normalizePins(legacyPins);
    const needsPreferenceWrite = current.globe_size !== nextSize
      || current.globe_style !== nextStyle
      || current.globe_monochrome_color !== nextColor
      || current.location_pins !== nextPins
      || Object.prototype.hasOwnProperty.call(current, "homepage_globe_style")
      || Object.prototype.hasOwnProperty.call(current, "homepage_globe_marker_style");

    if (needsPreferenceWrite) {
      await app.fileManager.processFrontMatter(settingsFile, frontmatter => {
        frontmatter.globe_size = nextSize;
        frontmatter.globe_style = nextStyle;
        frontmatter.globe_monochrome_color = nextColor;
        frontmatter.location_pins = nextPins;
        delete frontmatter.homepage_globe_style;
        delete frontmatter.homepage_globe_marker_style;
      });
    }
  }

  const plugin = await waitForCustomViews();
  if (!plugin) {
    console.warn("[Settings] Custom Views was not ready; startup sync skipped.");
    return;
  }

  const view = plugin.settings.views.find(item => item?.id === "vault-settings-v1");
  if (!view) {
    console.warn("[Settings] vault-settings-v1 was not found; startup sync skipped.");
    return;
  }

  const [template, css, js] = await Promise.all([
    app.vault.adapter.read(SETTINGS_TEMPLATE),
    app.vault.adapter.read(SETTINGS_CSS),
    app.vault.adapter.read(SETTINGS_JS),
  ]);

  try {
    new Function("tp", js);
  } catch (error) {
    throw new Error(`Settings runtime is not valid JavaScript: ${error.message}`);
  }

  const next = {
    template: template.trimEnd(),
    css: css.trimEnd(),
    js: js.trimEnd(),
  };
  const changed = view.template !== next.template || view.css !== next.css || view.js !== next.js;

  if (changed) {
    view.template = next.template;
    view.css = next.css;
    view.js = next.js;
    await plugin.saveSettings();
    plugin.refreshAllViews?.();
    console.info("[Settings] Synchronized authoritative Vault Settings Custom View.");
  }
} catch (error) {
  console.error("[Settings] Startup synchronization failed:", error);
}
%>