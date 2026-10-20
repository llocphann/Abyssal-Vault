<%*
/* Startup sync from authoritative Music Custom Views source files.
   The plugin data snapshot is also committed so the views are available immediately. */
const root = "90_System/93_Configuration/Custom_Views/Music";

/* Same-origin-free HTTP bridge for Music Custom Views. Registered at Templater
 * startup; restrict outbound calls to publicly accessible Music metadata
 * providers. No credentials, headers from notes, or arbitrary hosts. */
try {
  const win = app.workspace?.containerEl?.ownerDocument?.defaultView;
  const request = tp.obsidian?.requestUrl;
  if (win && typeof request === "function") {
    win.__abyssalMusicRequest = async url => {
      const parsed = new URL(String(url));
      const allowed = new Set([
        "coverartarchive.org", "itunes.apple.com", "lrclib.net",
        "musicbrainz.org"
      ]);
      if (parsed.protocol !== "https:" || !allowed.has(parsed.hostname)) {
        throw new Error("Music request rejected: provider not allowlisted");
      }
      const result = await request({
        url: parsed.toString(), method: "GET",
        headers: { Accept: "application/json" }
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error("Music metadata HTTP " + result.status);
      }
      return result.json != null ? result.json : JSON.parse(result.text || "{}");
    };
  }
} catch (error) {
  console.warn("[Music] Could not initialize Obsidian request bridge:", error);
}

async function waitForCustomViews() {
  for (let n = 0; n < 30; n++) {
    const plugin = app.plugins.getPlugin?.("custom-views") ?? app.plugins.plugins?.["custom-views"];
    if (plugin?.settings?.views) return plugin;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return null;
}
try {
  const plugin = await waitForCustomViews();
  if (!plugin) {
    console.warn("[Music] Custom Views plugin not ready. Music view sync skipped.");
    return;
  }
  const read = path => app.vault.adapter.read(root + "/" + path);
  const [css, js, songTemplate, albumTemplate, songDescriptor, albumDescriptor] = await Promise.all([
    read("styles.css"), read("script.js"), read("Song.html"), read("Album.html"),
    read("song-view.json"), read("album-view.json")
  ]);
  new Function("tp", js);
  const entries = [
    { ...JSON.parse(albumDescriptor), template: albumTemplate.trimEnd(), css: css.trimEnd(), js: js.trimEnd() },
    { ...JSON.parse(songDescriptor), template: songTemplate.trimEnd(), css: css.trimEnd(), js: js.trimEnd() }
  ];
  const ownedIds = new Set(entries.map(entry => entry.id));
  const oldViews = plugin.settings.views;
  const previous = entries.map(entry => oldViews.find(item => item?.id === entry.id));
  const unchanged = entries.every((entry, index) =>
    previous[index] && JSON.stringify(previous[index]) === JSON.stringify(entry));
  if (!unchanged || previous.some(view => !view)) {
    const others = oldViews.filter(item => !ownedIds.has(item?.id));
    // Music-specific folder rules are independent of the existing Media/Book views.
    const before = others.findIndex(item => item?.id === "default-1");
    if (before < 0) others.unshift(...entries);
    else others.splice(before, 0, ...entries);
    plugin.settings.views = others;
    await plugin.saveSettings();
    plugin.refreshAllViews?.();
    console.info("[Music] Music Song and Album Custom Views synchronized.");
  }
} catch (error) {
  console.error("[Music] Music Custom Views startup synchronization failed:", error);
}
%>
