<%*
async function waitForCustomViews() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const plugin = app.plugins.getPlugin?.("custom-views") ?? app.plugins.plugins?.["custom-views"];
    if (plugin?.settings?.views) return plugin;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return null;
}

const customViews = await waitForCustomViews();
if (!customViews) {
  console.warn("[Places] Custom Views plugin was not ready; Places view was not synchronized.");
  return;
}

const source = "90_System/93_Configuration/Custom_Views/Places";
const read = path => app.vault.adapter.read(path);

try {
  const view = JSON.parse(await read(`${source}/view.json`));
  view.template = await read(`${source}/template.html`);
  view.css = [
    await read(`${source}/styles.css`),
    await read(`${source}/local-map.css`),
    await read(`${source}/interactive.css`),
    await read(`${source}/media-parity.css`),
    await read(`${source}/map-controls.css`),
    await read(`${source}/weather.css`),
  ].map(value => value.trimEnd()).join("\n\n") + "\n";
  view.js = [
    await read(`${source}/script.js`),
    await read(`${source}/inline-edit.js`),
    await read(`${source}/media-parity.js`),
    await read(`${source}/map-controls.js`),
    await read(`${source}/weather.js`),
  ].map(value => value.trimEnd()).join("\n\n") + "\n";

  const serialized = JSON.stringify(view);
  const existing = customViews.settings.views.find(item => item?.id === view.id);
  const alreadyFirst = customViews.settings.views[0]?.id === view.id;
  const unchanged = existing && JSON.stringify(existing) === serialized;

  if (!unchanged || !alreadyFirst) {
    customViews.settings.views = [
      view,
      ...customViews.settings.views.filter(item => item?.id !== view.id),
    ];
    await customViews.saveSettings();
    customViews.refreshAllViews?.();
    console.info("[Places] Synced places-v1 Custom View.");
  }

  try {
    const startupDocument = app.workspace?.containerEl?.ownerDocument ?? globalThis.document;
    const startupWindow = startupDocument?.defaultView ?? globalThis.window;
    if (startupDocument && startupWindow) {
      const bootstrapContainer = startupDocument.createElement("div");
      const weatherSource = await read(`${source}/weather.js`);
      const runWeather = new Function("tp", weatherSource);
      runWeather({
        app,
        container: bootstrapContainer,
        frontmatter: {},
        bodyContent: "",
        activeDocument: startupDocument,
        activeWindow: startupWindow,
      });
    }
  } catch (error) {
    console.warn("[Places] Could not bootstrap weather runtime:", error);
  }
} catch (error) {
  console.error("[Places] Failed to sync places-v1 Custom View:", error);
}
%>
