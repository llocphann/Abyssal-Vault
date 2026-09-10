<%*
const required = [
  {
    id: "maps",
    name: "Maps",
    purpose: "Map.base / Bases map views",
    runtime: ".obsidian/plugins/maps/main.js",
  },
  {
    id: "custom-views",
    name: "Custom Views",
    purpose: "Places detail view",
    runtime: ".obsidian/plugins/custom-views/main.js",
  },
  {
    id: "places-weather",
    name: "Places Weather",
    purpose: "live weather in Places and map popups",
    runtime: ".obsidian/plugins/places-weather/main.js",
  },
];

const manifests = app.plugins?.manifests ?? {};
const missing = [];

for (const plugin of required) {
  const installedOnDisk = await app.vault.adapter.exists(plugin.runtime);
  if (!manifests[plugin.id] && !installedOnDisk) missing.push(plugin);
}

if (missing.length) {
  const names = missing.map(plugin => plugin.name).join(", ");
  new Notice(
    `Abyssal-Vault: missing required plugin${missing.length > 1 ? "s" : ""}: ${names}. Restore/install them, then reload Obsidian.`,
    12000
  );
  console.warn("[Abyssal] Missing required plugins:", missing);
}
%>
