<%*
const required = [
  { id: "maps", name: "Maps", purpose: "Map.base / Bases map views" },
  { id: "custom-views", name: "Custom Views", purpose: "Places detail view" },
  { id: "places-weather", name: "Places Weather", purpose: "live weather in Places and map popups" },
];

const manifests = app.plugins?.manifests ?? {};
const missing = required.filter(plugin => !manifests[plugin.id]);

if (missing.length) {
  const names = missing.map(plugin => plugin.name).join(", ");
  new Notice(
    `Abyssal-Vault: missing required plugin${missing.length > 1 ? "s" : ""}: ${names}. Install/restore them, then reload Obsidian.`,
    12000
  );
  console.warn("[Abyssal] Missing required plugins:", missing);
}
%>
