// Homepage globe v14 — theme-aware high-detail globe with resilient lifecycle and marker clustering.

const GLOBE_REGISTRY_KEY = "__abyssal_homepage_globe_v14";
const GEO_LAYER_CACHE_KEY = "__abyssal_homepage_globe_geo_layers_v14";
const STYLE_ID = "abyssal-homepage-globe-style-v14";

const DEFAULT_SOURCE_FOLDERS = Object.freeze([
  "20_Personal_Life/23_Places",
  "20_Personal_Life/26_Food_&_Drinks/Restaurants",
  "20_Personal_Life/26_Food_&_Drinks/Cafes",
  "20_Personal_Life/26_Food_&_Drinks/Bars",
]);
const GLOBE_SETTINGS_PAGE = dv.page("90_System/93_Configuration/settings") || dv.page("settings") || {};
const settingNumber = (key, fallback, min, max) => {
  const value = Number(GLOBE_SETTINGS_PAGE?.[key]);
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, resolved));
};
function settingTexture(key, fallback) {
  const value = Number(GLOBE_SETTINGS_PAGE?.[key]);
  return Number.isInteger(value) && value >= 256 && value <= 8192 && (value & (value - 1)) === 0 ? value : fallback;
}
function settingFolders(key, fallback) {
  let value = GLOBE_SETTINGS_PAGE?.[key];
  if (value && typeof value.array === "function") value = value.array();
  else if (!Array.isArray(value) && value && typeof value !== "string" && typeof value[Symbol.iterator] === "function") value = [...value];
  if (typeof value === "string") value = value.split(/\r?\n|,/);
  if (!Array.isArray(value)) return [...fallback];
  const folders = value.map(item => String(item ?? "").trim()).filter(Boolean);
  return folders.length ? folders : [...fallback];
}
const SOURCE_FOLDERS = settingFolders("globe_source_folders", DEFAULT_SOURCE_FOLDERS);
const ALLOWED_TYPES = new Set(["tourist", "misc", "restaurant", "cafe", "bar"]);
const ALLOWED_STYLES = new Set(["abyssal", "monochrome", "revert", "colorful"]);
const ALLOWED_PINS = new Set(["line", "connected-dots", "dots"]);

const DEG = Math.PI / 180;
const DISPLAY_MIN = settingNumber("globe_display_min", 250, 100, 4096);
const DISPLAY_MAX = settingNumber("globe_display_max", 2000, DISPLAY_MIN, 4096);
const RENDER_MIN = settingNumber("globe_render_min", 500, 128, 8192);
const RENDER_MAX = settingNumber("globe_render_max", 2000, RENDER_MIN, 8192);
const MIN_ZOOM = settingNumber("globe_min_zoom", 0.72, 0.1, 128);
const MAX_ZOOM = settingNumber("globe_max_zoom", 32, MIN_ZOOM, 128);
const DEFAULT_ZOOM = settingNumber("globe_default_zoom", 0.92, MIN_ZOOM, MAX_ZOOM);
const BASE_SCALE = settingNumber("globe_base_scale", 0.84, 0.1, 4);
const DRAG_PRECISION_START = 2.18;
const DRAG_PRECISION_CURVE = Object.freeze([
  [DRAG_PRECISION_START, 1],
  [4, .8],
  [8, .45],
  [16, .2],
  [32, .1],
]);
const AUTO_DELAY_MS = 1800;
const AUTO_DEG_PER_MS = 0.0019;
const TEXTURE_WIDTH = settingTexture("globe_texture_width", 4096);
const TEXTURE_HEIGHT = settingTexture("globe_texture_height", 4096);
const GEO_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
const GEO_LOCAL_BASE = "90_System/92_Scripts/Dataview/homepage/globe-data/";

const GEO_SOURCES = Object.freeze({
  land: ["ne_10m_land.geojson", "ne_50m_land.geojson"],
  lakes: ["ne_10m_lakes.geojson", "ne_50m_lakes.geojson"],
  rivers: ["ne_10m_rivers_lake_centerlines_scale_rank.geojson", "ne_50m_rivers_lake_centerlines.geojson"],
  borders: ["ne_10m_admin_0_boundary_lines_land.geojson", "ne_50m_admin_0_boundary_lines_land.geojson"],
  coastline: ["ne_10m_coastline.geojson", "ne_50m_coastline.geojson"],
  admin1: ["ne_10m_admin_1_states_provinces_lines.geojson", "ne_50m_admin_1_states_provinces_lines.geojson"],
  roads: ["ne_10m_roads.geojson"],
  urban: ["ne_10m_urban_areas.geojson", "ne_50m_urban_areas.geojson"],
  cities: ["ne_10m_populated_places.geojson"],
});
const CORE_GEO_KEYS = ["land", "lakes", "rivers", "borders", "coastline"];
const DETAIL_GEO_KEYS = ["admin1", "roads", "urban", "cities"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asBool = value => value === true || String(value ?? "").toLowerCase() === "true";
function dragPrecisionMultiplier(zoom) {
  const z = Math.max(1, zoom);
  if (z <= DRAG_PRECISION_START) return 1;
  for (let index = 1; index < DRAG_PRECISION_CURVE.length; index += 1) {
    const [fromZoom, fromMultiplier] = DRAG_PRECISION_CURVE[index - 1];
    const [toZoom, toMultiplier] = DRAG_PRECISION_CURVE[index];
    if (z <= toZoom) {
      const t = clamp(Math.log(z / fromZoom) / Math.log(toZoom / fromZoom), 0, 1);
      const eased = t * t * (3 - 2 * t);
      return fromMultiplier + (toMultiplier - fromMultiplier) * eased;
    }
  }
  return .1;
}
function dragSensitivity(zoom) {
  const z = Math.max(1, zoom);
  return .28 / Math.pow(z, .92) * dragPrecisionMultiplier(z);
}

function parseHex(value, fallback = "#a0cddf") {
  const raw = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : fallback;
}
function cssHex(name, fallback) {
  for (const target of [document.documentElement, document.body].filter(Boolean)) {
    const value = getComputedStyle(target).getPropertyValue(name).trim();
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  }
  return fallback;
}
function hexToRgb(hex) {
  const value = parseHex(hex).slice(1);
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
}
function rgbToHex(rgb) {
  return `#${rgb.map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
function mixHex(a, b, amount) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const t = clamp(amount, 0, 1);
  return rgbToHex(left.map((value, index) => value + (right[index] - value) * t));
}
function invertHex(hex) {
  return rgbToHex(hexToRgb(hex).map(value => 255 - value));
}
function rgb01(hex) {
  return hexToRgb(hex).map(value => value / 255);
}

function abyssalPalette() {
  const p00 = cssHex("--cc-p00", "#0a0e10");
  const p02 = cssHex("--cc-p02", "#10181b");
  const p03 = cssHex("--cc-p03", "#162024");
  const p04 = cssHex("--cc-p04", "#1d2a2f");
  const p05 = cssHex("--cc-p05", "#26363e");
  const p06 = cssHex("--cc-p06", "#30464f");
  const p07 = cssHex("--cc-p07", "#3e5965");
  const p08 = cssHex("--cc-p08", "#4e707e");
  const p09 = cssHex("--cc-p09", "#5f899b");
  const p10 = cssHex("--cc-p10", "#7da0b0");
  const p11 = cssHex("--cc-p11", "#a0bac5");
  const p12 = cssHex("--cc-p12", "#c6d6dc");
  const p13 = cssHex("--cc-p13", "#e6edef");
  const accent = cssHex("--cc-accent", "#a0cddf");
  return {
    label: "Abyssal", background: p00, ocean: p02, oceanDeep: p00, land: p03, landLift: p04,
    coast: p09, river: p08, border: p07, admin1: p05, road: p06, urban: p05, city: p10,
    graticule: p04, atmosphere: accent, visited: accent, planned: p11, saved: p07,
    foreground: p12, connection: p09, stipple: p10, stippleAlpha: 0.10, labelBright: p13,
  };
}
function monochromePalette(accent) {
  const base = parseHex(accent);
  return {
    label: "Monochrome", background: mixHex(base, "#000000", 0.94), ocean: mixHex(base, "#000000", 0.82),
    oceanDeep: mixHex(base, "#000000", 0.91), land: mixHex(base, "#000000", 0.69), landLift: mixHex(base, "#ffffff", 0.03),
    coast: mixHex(base, "#ffffff", 0.30), river: mixHex(base, "#000000", 0.43), border: mixHex(base, "#000000", 0.54),
    admin1: mixHex(base, "#000000", 0.66), road: mixHex(base, "#ffffff", 0.10), urban: mixHex(base, "#ffffff", 0.06),
    city: mixHex(base, "#ffffff", 0.22), graticule: mixHex(base, "#000000", 0.69), atmosphere: base,
    visited: mixHex(base, "#ffffff", 0.18), planned: mixHex(base, "#ffffff", 0.38), saved: mixHex(base, "#000000", 0.27),
    foreground: mixHex(base, "#ffffff", 0.78), connection: mixHex(base, "#ffffff", 0.06), stipple: mixHex(base, "#ffffff", 0.20),
    stippleAlpha: 0.11, labelBright: mixHex(base, "#ffffff", 0.72),
  };
}
function revertedPalette() {
  const base = abyssalPalette();
  const next = { ...base, label: "Revert" };
  for (const key of Object.keys(next)) {
    if (["label", "stippleAlpha"].includes(key)) continue;
    next[key] = invertHex(next[key]);
  }
  return next;
}
function colorfulPalette() {
  return {
    label: "Colorful", background: "#061019", ocean: "#1d6f9b", oceanDeep: "#07324a", land: "#55784d",
    landLift: "#829064", coast: "#b6c9b5", river: "#66b5df", border: "#8c987f", admin1: "#78846f",
    road: "#d1b27a", urban: "#a99373", city: "#f2de9a", graticule: "#315d70", atmosphere: "#79d0ef",
    visited: "#f3d669", planned: "#ef9860", saved: "#dbe5d6", foreground: "#eef5f4", connection: "#e6b369",
    stipple: "#aab98d", stippleAlpha: 0.08, labelBright: "#f8fbfa",
  };
}

function parseSize(raw) {
  const match = String(raw ?? "500x500").trim().match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})$/i);
  if (!match) {
    const width = clamp(500, DISPLAY_MIN, DISPLAY_MAX), height = clamp(500, DISPLAY_MIN, DISPLAY_MAX);
    return { width, height, value: `${width}x${height}` };
  }
  const width = clamp(Number(match[1]), DISPLAY_MIN, DISPLAY_MAX);
  const height = clamp(Number(match[2]), DISPLAY_MIN, DISPLAY_MAX);
  return { width, height, value: `${width}x${height}` };
}
function resolveSettings() {
  const page = GLOBE_SETTINGS_PAGE;
  const rawStyle = String(page.globe_style ?? "abyssal").trim().toLowerCase();
  const aliases = { "carbon-cyan": "abyssal", carbon_cyan: "abyssal", dark: "abyssal", "travel-dashboard": "abyssal" };
  const styleKey = aliases[rawStyle] ?? rawStyle;
  const pinKey = String(page.location_pins ?? "line").trim().toLowerCase().replace(/\s+/g, "-");
  return {
    ...parseSize(page.globe_size),
    styleKey: ALLOWED_STYLES.has(styleKey) ? styleKey : "abyssal",
    pinKey: ALLOWED_PINS.has(pinKey) ? pinKey : "line",
    accent: parseHex(page.globe_monochrome_color, "#a0cddf"),
  };
}
function paletteFor(settings) {
  if (settings.styleKey === "monochrome") return monochromePalette(settings.accent);
  if (settings.styleKey === "revert") return revertedPalette();
  if (settings.styleKey === "colorful") return colorfulPalette();
  return abyssalPalette();
}

function wrapLongitude(value) {
  let lon = value % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return lon;
}
function parseCoordinates(raw) {
  if (raw == null) return null;
  let lat, lon;
  if (Array.isArray(raw) && raw.length >= 2) { lat = Number(raw[0]); lon = Number(raw[1]); }
  else if (typeof raw === "object") { lat = Number(raw.lat ?? raw.latitude); lon = Number(raw.lng ?? raw.lon ?? raw.longitude); }
  else {
    const matches = String(raw).match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    lat = Number(matches[0]); lon = Number(matches[1]);
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
function locationLabel(page) {
  const parts = [];
  for (const raw of [page.city, page.region, page.country]) {
    const value = String(raw ?? "").trim();
    if (value && !parts.includes(value)) parts.push(value);
  }
  return parts.join(" · ") || "Saved location";
}
function collectPlaces() {
  const output = new Map();
  for (const folder of SOURCE_FOLDERS) {
    for (const page of dv.pages(`"${folder}"`)) {
      const path = String(page?.file?.path ?? "");
      if (!path || output.has(path)) continue;
      const placeType = String(page.place_type ?? "").trim().toLowerCase();
      if (!ALLOWED_TYPES.has(placeType)) continue;
      const coordinates = parseCoordinates(page.coordinates);
      if (!coordinates) continue;
      const visited = asBool(page.visited);
      output.set(path, {
        path, title: String(page?.file?.name ?? page?.file?.basename ?? "Untitled"), placeType, ...coordinates,
        visited, planned: !visited && asBool(page.want_to_visit), favorite: asBool(page.favorite), location: locationLabel(page),
      });
    }
  }
  return [...output.values()];
}
function sphericalCenter(items) {
  if (!items.length) return { lon: 105, lat: 16 };
  let x = 0, y = 0, z = 0;
  for (const item of items) {
    const lat = Number(item.lat) * DEG;
    const lon = Number(item.lon) * DEG;
    const c = Math.cos(lat);
    x += c * Math.cos(lon); y += Math.sin(lat); z += c * Math.sin(lon);
  }
  return { lon: Math.atan2(z, x) / DEG, lat: Math.atan2(y, Math.hypot(x, z)) / DEG };
}

function injectStyles() {
  for (let version = 1; version <= 14; version += 1) document.getElementById(`abyssal-homepage-globe-style-v${version}`)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .home-dashboard .hd-globe-host{display:flex;justify-content:center;width:100%;font-family:var(--font-monospace)}
    .home-dashboard .hd-globe{position:relative;width:min(100%,var(--globe-pref-width,500px));max-width:var(--globe-pref-width,500px);aspect-ratio:var(--globe-pref-ratio,1);overflow:hidden;border:1px solid var(--hd-border,var(--background-modifier-border));border-radius:var(--hd-radius,6px);background:transparent;box-shadow:none;user-select:none;touch-action:none;isolation:isolate}
    .home-dashboard .hd-globe-stage{position:absolute;left:50%;top:calc(50% - 7px);z-index:1;transform:translate(-50%,-50%);overflow:visible}
    .home-dashboard .hd-globe-webgl,.home-dashboard .hd-globe-overlay{position:absolute;inset:0;display:block;width:100%;height:100%;outline:none}
    .home-dashboard .hd-globe-webgl{z-index:1;pointer-events:none}.home-dashboard .hd-globe-overlay{z-index:2;cursor:grab;touch-action:none}.home-dashboard .hd-globe-overlay.is-dragging{cursor:grabbing}
    .home-dashboard .hd-globe-footer,.home-dashboard .hd-globe-controls{position:absolute;z-index:6}.home-dashboard .hd-globe-tooltip{position:absolute;z-index:5}
    .home-dashboard .hd-globe-footer{left:18px;bottom:10px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;color:var(--text-faint);font-size:.61em;letter-spacing:.045em;pointer-events:none}
    .home-dashboard .hd-globe-legend{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.home-dashboard .hd-globe-swatch{display:inline-block;width:11px;height:1px;background:var(--globe-saved)}
    .home-dashboard .hd-globe-swatch.is-visited{background:var(--globe-visited)}.home-dashboard .hd-globe-swatch.is-planned{background:var(--globe-planned)}
    .home-dashboard .hd-globe[data-pin-style="dots"] .hd-globe-swatch,.home-dashboard .hd-globe[data-pin-style="connected-dots"] .hd-globe-swatch{width:5px;height:5px;border-radius:50%}
    .home-dashboard .hd-globe-controls{right:12px;bottom:8px;display:flex;gap:7px;opacity:0;transform:translateY(4px);pointer-events:none;transition:opacity 140ms ease,transform 140ms ease}.home-dashboard .hd-globe.is-hovered .hd-globe-controls,.home-dashboard .hd-globe.is-interacting .hd-globe-controls,.home-dashboard .hd-globe:focus-within .hd-globe-controls{opacity:1;transform:translateY(0);pointer-events:auto}
    .home-dashboard button.hd-globe-control{min-width:0;height:24px;padding:0 7px;border:1px solid var(--background-modifier-border);border-radius:4px;background:color-mix(in srgb,var(--background-primary) 86%,transparent);color:var(--text-faint);font:600 .60em/1 var(--font-monospace);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:none;backdrop-filter:blur(8px)}.home-dashboard button.hd-globe-control:hover,.home-dashboard button.hd-globe-control.is-active{color:var(--globe-atmosphere);border-color:color-mix(in srgb,var(--globe-atmosphere) 55%,var(--background-modifier-border))}
    .home-dashboard .hd-globe-tooltip{display:none;max-width:min(270px,84%);padding:8px 10px;border:1px solid color-mix(in srgb,var(--globe-atmosphere) 34%,var(--background-modifier-border));border-radius:5px;background:color-mix(in srgb,var(--background-primary) 94%,transparent);color:var(--text-normal);box-shadow:0 10px 24px color-mix(in srgb,#000 25%,transparent);pointer-events:none;backdrop-filter:blur(8px)}
    .home-dashboard .hd-globe-tooltip strong{display:block;overflow:hidden;color:var(--text-normal);font-size:.72em;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.home-dashboard .hd-globe-tooltip span{display:block;margin-top:2px;color:var(--text-faint);font-size:.62em;line-height:1.4}.home-dashboard .hd-globe-tooltip em{display:inline-block;margin-top:5px;color:var(--globe-atmosphere);font-size:.58em;font-style:normal;letter-spacing:.07em;text-transform:uppercase}
    @media(max-width:560px){.home-dashboard .hd-globe-footer{left:14px;bottom:9px;gap:8px}.home-dashboard .hd-globe-controls{right:10px;bottom:7px}.home-dashboard .hd-globe-legend:last-child{display:none}}
  `;
  document.head.appendChild(style);
}

async function loadJsonCandidates(names) {
  const app = dv.app ?? globalThis.app;
  for (const name of names) {
    const local = `${GEO_LOCAL_BASE}${name}`;
    try { if (await app?.vault?.adapter?.exists?.(local)) return JSON.parse(await app.vault.adapter.read(local)); } catch (_) {}
    const remote = `${GEO_BASE}${name}`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(remote, { cache: "force-cache", signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch (error) { console.warn("[homepage-globe] geography unavailable:", remote, error); }
    finally { clearTimeout(timer); }
  }
  return null;
}
function layerCache() { return globalThis[GEO_LAYER_CACHE_KEY] ||= new Map(); }
function loadLayer(key) {
  const cache = layerCache();
  if (!cache.has(key)) cache.set(key, loadJsonCandidates(GEO_SOURCES[key] || []));
  return cache.get(key);
}
async function loadGeography(keys) {
  return Object.fromEntries(await Promise.all(keys.map(async key => [key, await loadLayer(key)])));
}

const lonX = (lon, width) => (Number(lon) + 180) / 360 * width;
const latY = (lat, height) => (90 - Number(lat)) / 180 * height;
function polygonSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}
function lineSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}
function traceCoordinates(ctx, coordinates, width, height, close = false) {
  let started = false, previousLon = null;
  for (const point of coordinates || []) {
    const lon = Number(point?.[0]), lat = Number(point?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const x = lonX(lon, width), y = latY(lat, height);
    if (!started || (previousLon != null && Math.abs(lon - previousLon) > 180)) { ctx.moveTo(x, y); started = true; }
    else ctx.lineTo(x, y);
    previousLon = lon;
  }
  if (close && started) ctx.closePath();
}
function featureRank(feature, fallback = 5) {
  const p = feature?.properties || {};
  const rank = Number(p.scalerank ?? p.scale_rank ?? p.labelrank ?? p.min_zoom ?? fallback);
  return Number.isFinite(rank) ? rank : fallback;
}
function drawPolygons(ctx, collection, width, height, fill, stroke = null, lineWidth = 1, alpha = 1) {
  if (!collection?.features) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.strokeStyle = stroke || fill; ctx.lineWidth = lineWidth; ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const feature of collection.features) for (const polygon of polygonSets(feature.geometry)) {
    ctx.beginPath(); for (const ring of polygon) traceCoordinates(ctx, ring, width, height, true); ctx.fill("evenodd"); if (stroke) ctx.stroke();
  }
  ctx.restore();
}
function drawRankedLines(ctx, collection, width, height, stroke, baseWidth, baseAlpha = 1, maxRank = 12) {
  if (!collection?.features) return;
  ctx.save(); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const feature of collection.features) {
    const rank = featureRank(feature); if (rank > maxRank) continue;
    ctx.globalAlpha = baseAlpha * clamp(1.08 - rank * 0.055, 0.24, 1); ctx.lineWidth = baseWidth * (1 + Math.max(0, 5 - rank) * 0.08);
    for (const line of lineSets(feature.geometry)) { ctx.beginPath(); traceCoordinates(ctx, line, width, height); ctx.stroke(); }
  }
  ctx.restore();
}
function drawGraticule(ctx, width, height, palette) {
  ctx.save(); ctx.strokeStyle = palette.graticule; ctx.lineWidth = 0.52; ctx.globalAlpha = 0.30;
  for (let lon = -180; lon <= 180; lon += 10) { const x = lonX(lon, width); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let lat = -80; lat <= 80; lat += 10) { const y = latY(lat, height); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.restore();
}
function addLandStipple(ctx, width, height, palette) {
  if (!palette.stippleAlpha) return;
  ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = palette.stipple;
  for (let y = 3; y < height; y += 9) for (let x = 3; x < width; x += 9) {
    const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0; if ((hash & 255) < 132) continue;
    ctx.globalAlpha = palette.stippleAlpha * (0.52 + ((hash >>> 8) & 63) / 100); ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
function globeTexture(palette, geography = {}) {
  const canvas = document.createElement("canvas"); canvas.width = TEXTURE_WIDTH; canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext("2d", { alpha: false }), width = canvas.width, height = canvas.height;
  const ocean = ctx.createLinearGradient(0, 0, 0, height); ocean.addColorStop(0, palette.oceanDeep); ocean.addColorStop(0.48, palette.ocean); ocean.addColorStop(1, palette.oceanDeep);
  ctx.fillStyle = ocean; ctx.fillRect(0, 0, width, height); drawGraticule(ctx, width, height, palette);
  if (geography.land) {
    const landCanvas = document.createElement("canvas"); landCanvas.width = width; landCanvas.height = height; const land = landCanvas.getContext("2d");
    drawPolygons(land, geography.land, width, height, palette.land, palette.coast, 1.25);
    land.save(); land.globalCompositeOperation = "source-atop"; land.globalAlpha = 0.30;
    const lift = land.createLinearGradient(0, 0, 0, height); lift.addColorStop(0, palette.landLift); lift.addColorStop(0.28, palette.land); lift.addColorStop(0.55, palette.landLift); lift.addColorStop(0.78, palette.land); lift.addColorStop(1, palette.landLift);
    land.fillStyle = lift; land.fillRect(0, 0, width, height); land.restore(); addLandStipple(land, width, height, palette); ctx.drawImage(landCanvas, 0, 0);
  }
  if (geography.urban) drawPolygons(ctx, geography.urban, width, height, palette.urban, null, 0, 0.24);
  if (geography.lakes) drawPolygons(ctx, geography.lakes, width, height, palette.ocean, palette.river, 0.9, 0.98);
  if (geography.admin1) drawRankedLines(ctx, geography.admin1, width, height, palette.admin1, 0.55, 0.34, 8);
  if (geography.borders) drawRankedLines(ctx, geography.borders, width, height, palette.border, 0.72, 0.68, 12);
  if (geography.rivers) drawRankedLines(ctx, geography.rivers, width, height, palette.river, 0.62, 0.82, 8);
  if (geography.roads) drawRankedLines(ctx, geography.roads, width, height, palette.road, 0.46, 0.24, 5);
  if (geography.coastline) drawRankedLines(ctx, geography.coastline, width, height, palette.coast, 0.9, 0.82, 12);
  return canvas;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader) || "Shader compilation failed"; gl.deleteShader(shader); throw new Error(message); }
  return shader;
}
function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram(), vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource), fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { const message = gl.getProgramInfoLog(program) || "Program link failed"; gl.deleteProgram(program); throw new Error(message); }
  return program;
}
function geometryBBox(feature) {
  if (Array.isArray(feature?.bbox) && feature.bbox.length >= 4) return feature.bbox.slice(0, 4).map(Number);
  if (feature?.__hdBBox !== undefined) return feature.__hdBBox;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const visit = value => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
      const lon = Number(value[0]), lat = Number(value[1]); minLon = Math.min(minLon, lon); minLat = Math.min(minLat, lat); maxLon = Math.max(maxLon, lon); maxLat = Math.max(maxLat, lat);
    } else value.forEach(visit);
  };
  visit(feature?.geometry?.coordinates); feature.__hdBBox = Number.isFinite(minLon) ? [minLon, minLat, maxLon, maxLat] : null; return feature.__hdBBox;
}
function warmBBoxes(collection) { for (const feature of collection?.features || []) geometryBBox(feature); }

function setupGlobe(root, stage, glCanvas, overlayCanvas, tooltip, controls, places, palette, pinStyle) {
  const gl = glCanvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
  const overlay = overlayCanvas.getContext("2d", { alpha: true });
  if (!gl || !overlay) throw new Error("WebGL or Canvas 2D is unavailable.");

  const initial = sphericalCenter(places), reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const state = { size: 500, dpr: 1, centerLon: initial.lon, centerLat: clamp(initial.lat, -75, 75), zoom: DEFAULT_ZOOM, autoRotate: !reducedMotion, dragging: false, pointerId: null, lastX: 0, lastY: 0, moved: false, hoverKey: null, screenTargets: [], geography: {}, detailRequested: false, lastInteraction: performance.now(), lastFrame: performance.now(), disposed: false, suspended: false, inViewport: true, raf: 0, needsRender: true, hoverTimer: 0 };

  const vertexSource = `attribute vec2 a_position; varying vec2 v_ndc; void main(){v_ndc=a_position;gl_Position=vec4(a_position,0.0,1.0);}`;
  const fragmentSource = `
    precision mediump float; uniform sampler2D u_texture; uniform vec3 u_atmosphere; uniform float u_centerLon; uniform float u_centerLat; uniform float u_scale; varying vec2 v_ndc; const float PI=3.141592653589793;
    void main(){vec2 p=v_ndc/u_scale;float r2=dot(p,p);if(r2>1.0) discard;float z=sqrt(max(0.0,1.0-r2));float cc=cos(u_centerLat),sc=sin(u_centerLat);float sl=cc*p.y+sc*z;float z0=-sc*p.y+cc*z;float lat=asin(clamp(sl,-1.0,1.0));float lon=atan(p.x,z0)+u_centerLon;float u=fract((lon+PI)/(2.0*PI));float v=(lat+PI*0.5)/PI;vec3 color=texture2D(u_texture,vec2(u,v)).rgb;float light=clamp(.50+.50*(z*.78+p.y*.14-p.x*.08),0.0,1.0);color*=.76+.24*light;float rim=pow(clamp(1.0-z,0.0,1.0),2.1);color=mix(color,u_atmosphere,rim*.15);gl_FragColor=vec4(color,1.0);}`;
  const program = createProgram(gl, vertexSource, fragmentSource), quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const locations = { position: gl.getAttribLocation(program, "a_position"), centerLon: gl.getUniformLocation(program, "u_centerLon"), centerLat: gl.getUniformLocation(program, "u_centerLat"), scale: gl.getUniformLocation(program, "u_scale"), texture: gl.getUniformLocation(program, "u_texture"), atmosphere: gl.getUniformLocation(program, "u_atmosphere") };
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  function uploadTexture(canvas) { if (state.disposed) return; gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); gl.bindTexture(gl.TEXTURE_2D, null); state.needsRender = true; }
  uploadTexture(globeTexture(palette));
  void loadGeography(CORE_GEO_KEYS).then(core => { if (state.disposed) return; Object.assign(state.geography, core); for (const value of Object.values(core)) warmBBoxes(value); uploadTexture(globeTexture(palette, state.geography)); });

  let idleHandle = null, detailTimer = 0;
  function ensureDetail() {
    if (state.detailRequested || state.disposed) return; state.detailRequested = true;
    void loadGeography(DETAIL_GEO_KEYS).then(detail => { if (state.disposed) return; Object.assign(state.geography, detail); for (const value of Object.values(detail)) warmBBoxes(value); uploadTexture(globeTexture(palette, state.geography)); });
  }
  if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(ensureDetail, { timeout: 2800 }); else detailTimer = window.setTimeout(ensureDetail, 1200);

  const atmosphere = rgb01(palette.atmosphere), resetButton = controls.querySelector('[data-action="reset"]'), autoButton = controls.querySelector('[data-action="auto"]');
  function updateAutoButton() { if (!autoButton) return; autoButton.classList.toggle("is-active", state.autoRotate); autoButton.textContent = state.autoRotate ? "auto:on" : "auto:off"; autoButton.setAttribute("aria-pressed", String(state.autoRotate)); }
  function markInteraction() { state.lastInteraction = performance.now(); root.classList.add("is-interacting"); clearTimeout(state.hoverTimer); state.hoverTimer = window.setTimeout(() => { if (!state.dragging) root.classList.remove("is-interacting"); }, 900); }
  function resize() {
    if (!root.isConnected) return; const rect = root.getBoundingClientRect(); const side = Math.max(1, Math.min(rect.width || 500, rect.height || 500)); state.size = side; stage.style.width = `${side}px`; stage.style.height = `${side}px`;
    const requested = Math.round(side * Math.min(window.devicePixelRatio || 1, 2)), pixelSize = clamp(requested, RENDER_MIN, RENDER_MAX); state.dpr = pixelSize / side;
    if (glCanvas.width !== pixelSize || glCanvas.height !== pixelSize) { glCanvas.width = pixelSize; glCanvas.height = pixelSize; }
    if (overlayCanvas.width !== pixelSize || overlayCanvas.height !== pixelSize) { overlayCanvas.width = pixelSize; overlayCanvas.height = pixelSize; }
    gl.viewport(0, 0, pixelSize, pixelSize); state.needsRender = true;
  }
  function projectLonLat(lon, lat) {
    const latRad = Number(lat) * DEG, dlon = (Number(lon) - state.centerLon) * DEG, center = state.centerLat * DEG, cl = Math.cos(latRad), sl = Math.sin(latRad), cc = Math.cos(center), sc = Math.sin(center);
    const x = cl * Math.sin(dlon), y = cc * sl - sc * cl * Math.cos(dlon), z = sc * sl + cc * cl * Math.cos(dlon), radius = BASE_SCALE * state.zoom * state.size * .5;
    return { x: state.size * .5 + x * radius, y: state.size * .5 - y * radius, z };
  }
  function bboxVisible(feature) {
    const bbox = geometryBBox(feature); if (!bbox) return true; const angular = clamp(105 / Math.max(1, state.zoom), 1.6, 105);
    if (bbox[3] < state.centerLat - angular || bbox[1] > state.centerLat + angular) return false;
    const lonRadius = Math.min(180, angular / Math.max(.22, Math.cos(state.centerLat * DEG))); if (lonRadius >= 179) return true;
    const viewMin = state.centerLon - lonRadius, viewMax = state.centerLon + lonRadius;
    for (const shift of [-360, 0, 360]) if (bbox[2] + shift >= viewMin && bbox[0] + shift <= viewMax) return true;
    return false;
  }
  function drawProjectedCollection(collection, color, width, alpha, maxRank = 12) {
    if (!collection?.features) return; overlay.save(); overlay.strokeStyle = color; overlay.lineJoin = "round"; overlay.lineCap = "round"; overlay.globalAlpha = alpha; overlay.lineWidth = width;
    for (const feature of collection.features) {
      if (featureRank(feature) > maxRank || !bboxVisible(feature)) continue;
      for (const line of lineSets(feature.geometry)) {
        let started = false, previous = null; overlay.beginPath();
        for (const point of line || []) {
          const lon = Number(point?.[0]), lat = Number(point?.[1]); if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue; const p = projectLonLat(lon, lat);
          if (p.z <= .002 || p.x < -state.size || p.x > state.size * 2 || p.y < -state.size || p.y > state.size * 2) { started = false; previous = null; continue; }
          if (!started || (previous && Math.hypot(p.x - previous.x, p.y - previous.y) > state.size * .8)) { overlay.moveTo(p.x, p.y); started = true; } else overlay.lineTo(p.x, p.y); previous = p;
        }
        if (started) overlay.stroke();
      }
    }
    overlay.restore();
  }
  function drawAtmosphere() {
    overlay.setTransform(state.dpr, 0, 0, state.dpr, 0, 0); overlay.clearRect(0, 0, state.size, state.size); const radius = BASE_SCALE * state.zoom * state.size * .5;
    if (radius <= state.size * .72) { overlay.save(); overlay.globalAlpha = .24; overlay.strokeStyle = palette.atmosphere; overlay.lineWidth = 1; overlay.beginPath(); overlay.arc(state.size * .5, state.size * .5, radius + 1, 0, Math.PI * 2); overlay.stroke(); overlay.restore(); }
  }
  function drawVectorDetail() {
    const geo = state.geography; if (state.zoom < 1.7) return; if (state.zoom >= 2.4) ensureDetail(); const detail = clamp(Math.log2(Math.max(2, state.zoom)) / 5, .32, 1);
    drawProjectedCollection(geo.coastline, palette.coast, .68 + detail * .42, .64, 12); drawProjectedCollection(geo.borders, palette.border, .50 + detail * .32, .52, 12); drawProjectedCollection(geo.rivers, palette.river, .44 + detail * .34, .62, state.zoom >= 8 ? 12 : state.zoom >= 4 ? 8 : 5);
    if (state.zoom >= 2.8) drawProjectedCollection(geo.admin1, palette.admin1, .38 + detail * .28, .38, state.zoom >= 7 ? 12 : 8);
    if (state.zoom >= 4.2) drawProjectedCollection(geo.roads, palette.road, .34 + detail * .30, .34, state.zoom >= 12 ? 10 : state.zoom >= 7 ? 7 : 4);
  }
  function cityPoint(feature) {
    const coordinates = feature?.geometry?.type === "Point" ? feature.geometry.coordinates : null; if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const lon = Number(coordinates[0]), lat = Number(coordinates[1]); if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null; const p = feature.properties || {};
    return { lon, lat, name: String(p.name_en ?? p.NAME_EN ?? p.name ?? p.NAME ?? "").trim(), rank: featureRank(feature, 9) };
  }
  function drawCities() {
    const cities = state.geography.cities?.features; if (!cities || state.zoom < 2.8) return;
    const maxRank = state.zoom >= 10 ? 10 : state.zoom >= 6 ? 7 : state.zoom >= 4 ? 4 : 2, showLabels = state.zoom >= 3.8, occupied = [];
    overlay.save(); overlay.fillStyle = palette.city; overlay.strokeStyle = palette.background; overlay.font = `600 ${state.zoom >= 8 ? 9 : 8}px monospace`; overlay.textBaseline = "middle";
    for (const feature of cities) {
      if (featureRank(feature, 9) > maxRank) continue; const city = cityPoint(feature); if (!city || !city.name) continue; const p = projectLonLat(city.lon, city.lat);
      if (p.z <= .02 || p.x < -20 || p.x > state.size + 20 || p.y < -20 || p.y > state.size + 20) continue;
      overlay.globalAlpha = .42 + clamp(p.z, 0, 1) * .38; overlay.beginPath(); overlay.arc(p.x, p.y, state.zoom >= 7 ? 1.45 : 1.05, 0, Math.PI * 2); overlay.fill(); if (!showLabels) continue;
      const metrics = overlay.measureText(city.name), x = p.x + 4.5, y = p.y, box = { x1: x - 1, y1: y - 6, x2: x + metrics.width + 2, y2: y + 6 };
      if (occupied.some(other => !(box.x2 < other.x1 || box.x1 > other.x2 || box.y2 < other.y1 || box.y1 > other.y2))) continue;
      occupied.push(box); overlay.globalAlpha = .58; overlay.fillStyle = palette.labelBright; overlay.fillText(city.name, x, y); overlay.fillStyle = palette.city;
    }
    overlay.restore();
  }

  const placePriority = place => (place.favorite ? 50 : 0) + (place.planned ? 30 : place.visited ? 20 : 10);
  const markerColor = place => place.planned ? palette.planned : place.visited ? palette.visited : palette.saved;
  function clusterMarkers(markers) {
    const radius = clamp(21 / Math.pow(Math.max(.85, state.zoom), .56), 6.5, 21), sorted = [...markers].sort((a, b) => placePriority(b.place) - placePriority(a.place) || b.z - a.z), clusters = [];
    for (const marker of sorted) {
      let best = null, bestDistance = Infinity;
      for (const cluster of clusters) { const d = Math.hypot(marker.x - cluster.x, marker.y - cluster.y); if (d <= radius && d < bestDistance) { best = cluster; bestDistance = d; } }
      if (!best) { clusters.push({ members: [marker], x: marker.x, y: marker.y, z: marker.z }); continue; }
      best.members.push(marker); const weight = best.members.length; best.x += (marker.x - best.x) / weight; best.y += (marker.y - best.y) / weight; best.z = Math.max(best.z, marker.z);
    }
    for (const cluster of clusters) {
      cluster.members.sort((a, b) => placePriority(b.place) - placePriority(a.place) || b.z - a.z); cluster.primary = cluster.members[0].place; const center = sphericalCenter(cluster.members.map(item => item.place)); cluster.lon = center.lon; cluster.lat = center.lat; cluster.key = cluster.members.map(item => item.place.path).sort().join("|");
    }
    return clusters.sort((a, b) => a.z - b.z);
  }
  function radial(target) {
    const center = state.size * .5; let dx = target.x - center, dy = target.y - center, magnitude = Math.hypot(dx, dy);
    if (magnitude < 4) { dx = Math.sin(target.lon * DEG); dy = -Math.cos(target.lon * DEG); magnitude = Math.hypot(dx, dy) || 1; }
    return { nx: dx / magnitude, ny: dy / magnitude };
  }
  function drawLineTarget(target, hovered) {
    const { nx, ny } = radial(target), color = markerColor(target.primary), count = target.members.length; let length = target.primary.planned ? 9 : target.primary.visited ? 7.5 : 6.2;
    if (count > 1) length += Math.min(4.5, Math.log2(count + 1) * 1.7); if (hovered) length += 1.2;
    const startX = target.x + nx * 1.2, startY = target.y + ny * 1.2, endX = target.x + nx * length, endY = target.y + ny * length, tx = -ny, ty = nx; target.hitX = endX; target.hitY = endY;
    overlay.save(); overlay.strokeStyle = color; overlay.fillStyle = color; overlay.globalAlpha = .66 + clamp(target.z, 0, 1) * .30; overlay.lineWidth = hovered ? 1.55 : count > 1 ? 1.35 : 1.0; overlay.setLineDash(target.primary.planned ? [2.5, 1.7] : []); overlay.beginPath(); overlay.moveTo(startX, startY); overlay.lineTo(endX, endY); overlay.stroke(); overlay.setLineDash([]);
    const cap = hovered ? 2.4 : 1.8; overlay.lineWidth = .9; overlay.beginPath(); overlay.moveTo(endX - tx * cap, endY - ty * cap); overlay.lineTo(endX + tx * cap, endY + ty * cap); overlay.stroke(); overlay.beginPath(); overlay.arc(target.x, target.y, hovered ? 1.35 : .9, 0, Math.PI * 2); overlay.fill();
    if (count > 1) { overlay.font = "600 8px monospace"; overlay.textBaseline = "middle"; overlay.globalAlpha = .84; overlay.fillStyle = palette.labelBright; overlay.fillText(`×${count}`, endX + nx * 4 - 2, endY + ny * 4); }
    overlay.restore();
  }
  function drawDotTarget(target, hovered) {
    const count = target.members.length, color = markerColor(target.primary), radius = hovered ? 3.2 : count > 1 ? 3.0 : target.primary.favorite ? 2.6 : 2.15; target.hitX = target.x; target.hitY = target.y;
    overlay.save(); overlay.globalAlpha = .64 + clamp(target.z, 0, 1) * .30; overlay.strokeStyle = color; overlay.fillStyle = color; overlay.lineWidth = hovered ? 1.4 : 1.0; overlay.beginPath(); overlay.arc(target.x, target.y, radius, 0, Math.PI * 2); if (target.primary.planned || count > 1) overlay.stroke(); else overlay.fill();
    if (count > 1) { overlay.font = "600 8px monospace"; overlay.textBaseline = "middle"; overlay.fillStyle = palette.labelBright; overlay.globalAlpha = .86; overlay.fillText(`×${count}`, target.x + radius + 3, target.y); }
    overlay.restore();
  }
  function drawConnections(targets) {
    if (pinStyle !== "connected-dots" || targets.length < 2) return; const used = new Set(); overlay.save(); overlay.strokeStyle = palette.connection; overlay.lineWidth = .7; overlay.globalAlpha = .28;
    for (let i = 0; i < targets.length; i += 1) {
      const a = targets[i]; let best = -1, bestDistance = Infinity;
      for (let j = i + 1; j < targets.length; j += 1) { const b = targets[j], distance = Math.hypot(a.x - b.x, a.y - b.y); if (distance < bestDistance && distance > 18 && distance < state.size * .42) { best = j; bestDistance = distance; } }
      if (best < 0) continue; const key = `${i}:${best}`; if (used.has(key)) continue; used.add(key); const b = targets[best], mx = (a.x + b.x) * .5, my = (a.y + b.y) * .5; let vx = mx - state.size * .5, vy = my - state.size * .5; const mag = Math.hypot(vx, vy) || 1; vx /= mag; vy /= mag; const lift = Math.min(16, 4 + bestDistance * .06);
      overlay.beginPath(); overlay.moveTo(a.x, a.y); overlay.quadraticCurveTo(mx + vx * lift, my + vy * lift, b.x, b.y); overlay.stroke();
    }
    overlay.restore();
  }
  function drawPlaces() {
    const markers = [];
    for (const place of places) { const point = projectLonLat(place.lon, place.lat); if (point.z <= .008) continue; if (point.x < -30 || point.x > state.size + 30 || point.y < -30 || point.y > state.size + 30) continue; markers.push({ place, ...point }); }
    const targets = clusterMarkers(markers); state.screenTargets = targets; drawConnections(targets);
    for (const target of targets) { const hovered = state.hoverKey === target.key; if (pinStyle === "line") drawLineTarget(target, hovered); else drawDotTarget(target, hovered); }
  }

  function render() {
    if (state.disposed || state.suspended || !root.isConnected) return; gl.viewport(0, 0, glCanvas.width, glCanvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(program);
    gl.uniform1f(locations.centerLon, state.centerLon * DEG); gl.uniform1f(locations.centerLat, state.centerLat * DEG); gl.uniform1f(locations.scale, BASE_SCALE * state.zoom); gl.uniform3fv(locations.atmosphere, atmosphere); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(locations.texture, 0); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(locations.position); gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    drawAtmosphere(); drawVectorDetail(); drawCities(); drawPlaces(); state.needsRender = false;
  }
  function targetAt(x, y) {
    let best = null, distance = Infinity;
    for (let i = state.screenTargets.length - 1; i >= 0; i -= 1) { const target = state.screenTargets[i], d = Math.hypot((target.hitX ?? target.x) - x, (target.hitY ?? target.y) - y), threshold = target.members.length > 1 ? 13 : 10; if (d <= threshold && d < distance) { best = target; distance = d; } }
    return best;
  }
  function showTooltip(target, x, y) {
    if (!target) { state.hoverKey = null; tooltip.style.display = "none"; return; }
    state.hoverKey = target.key; tooltip.replaceChildren(); const title = document.createElement("strong"), info = document.createElement("span"), status = document.createElement("em");
    if (target.members.length > 1) { title.textContent = `${target.members.length} locations`; info.textContent = target.members.slice(0, 3).map(item => item.place.title).join(" · ") + (target.members.length > 3 ? " …" : ""); status.textContent = "click to zoom cluster"; }
    else { const place = target.primary; title.textContent = place.title; info.textContent = place.location; status.textContent = place.visited ? "visited · click to open" : place.planned ? "want to visit · click to open" : "saved · click to open"; }
    tooltip.append(title, info, status); tooltip.style.display = "block"; const margin = 10, rect = tooltip.getBoundingClientRect(); let left = x + 14, top = y - rect.height - 10; if (left + rect.width > state.size - margin) left = x - rect.width - 14; if (top < margin) top = y + 14; tooltip.style.left = `${Math.max(margin, left)}px`; tooltip.style.top = `${Math.max(margin, top)}px`;
  }
  function pointerPosition(event) { const rect = overlayCanvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  async function openPlace(place) { const app = dv.app ?? globalThis.app, file = app?.vault?.getAbstractFileByPath?.(place.path); if (file) await app.workspace.getLeaf(false).openFile(file); }
  function focusCluster(target) { state.centerLon = target.lon; state.centerLat = clamp(target.lat, -84, 84); state.zoom = Math.min(MAX_ZOOM, Math.max(2.4, state.zoom * 2.1)); state.hoverKey = null; tooltip.style.display = "none"; markInteraction(); state.needsRender = true; }

  function pointerDown(event) { if (event.button !== 0) return; const pos = pointerPosition(event); Object.assign(state, { dragging: true, pointerId: event.pointerId, lastX: pos.x, lastY: pos.y, moved: false, hoverKey: null }); tooltip.style.display = "none"; overlayCanvas.classList.add("is-dragging"); overlayCanvas.setPointerCapture?.(event.pointerId); markInteraction(); }
  function pointerMove(event) {
    const pos = pointerPosition(event);
    if (state.dragging && event.pointerId === state.pointerId) { const dx = pos.x - state.lastX, dy = pos.y - state.lastY; if (Math.abs(dx) + Math.abs(dy) > 1.5) state.moved = true; const sensitivity = dragSensitivity(state.zoom); state.centerLon = wrapLongitude(state.centerLon - dx * sensitivity); state.centerLat = clamp(state.centerLat + dy * sensitivity, -84, 84); state.lastX = pos.x; state.lastY = pos.y; state.lastInteraction = performance.now(); state.needsRender = true; return; }
    const target = targetAt(pos.x, pos.y); showTooltip(target, pos.x, pos.y); overlayCanvas.style.cursor = target ? "pointer" : "grab"; state.needsRender = true;
  }
  function pointerUp(event) { if (!state.dragging || event.pointerId !== state.pointerId) return; const pos = pointerPosition(event), moved = state.moved; state.dragging = false; state.pointerId = null; overlayCanvas.classList.remove("is-dragging"); overlayCanvas.releasePointerCapture?.(event.pointerId); markInteraction(); const target = targetAt(pos.x, pos.y); showTooltip(target, pos.x, pos.y); overlayCanvas.style.cursor = target ? "pointer" : "grab"; if (!moved && target) { if (target.members.length > 1) focusCluster(target); else void openPlace(target.primary); } }
  function pointerCancel(event) { if (event.pointerId !== state.pointerId) return; state.dragging = false; state.pointerId = null; state.moved = false; overlayCanvas.classList.remove("is-dragging"); overlayCanvas.style.cursor = "grab"; }
  function pointerLeave() { if (state.dragging) return; state.hoverKey = null; tooltip.style.display = "none"; overlayCanvas.style.cursor = "grab"; state.needsRender = true; }
  function wheel(event) { event.preventDefault(); const next = clamp(state.zoom * Math.exp(-event.deltaY * .00105), MIN_ZOOM, MAX_ZOOM); if (Math.abs(next - state.zoom) < .0001) return; state.zoom = next; if (state.zoom >= 2.4) ensureDetail(); markInteraction(); state.needsRender = true; }
  function reset() { const view = sphericalCenter(places); state.centerLon = view.lon; state.centerLat = clamp(view.lat, -75, 75); state.zoom = DEFAULT_ZOOM; state.hoverKey = null; tooltip.style.display = "none"; markInteraction(); state.needsRender = true; }
  function toggleAuto() { state.autoRotate = !state.autoRotate; state.lastInteraction = performance.now() - AUTO_DELAY_MS - 1; updateAutoButton(); state.needsRender = true; }

  const rootEnter = () => root.classList.add("is-hovered"), rootLeave = () => { root.classList.remove("is-hovered"); if (!state.dragging) { state.hoverKey = null; tooltip.style.display = "none"; state.needsRender = true; } };
  function resume() { if (state.disposed || !root.isConnected) return; state.suspended = false; state.lastFrame = performance.now(); resize(); state.needsRender = true; cancelAnimationFrame(state.raf); state.raf = requestAnimationFrame(frame); }
  const visibilityResume = () => { if (!document.hidden) resume(); }, focusResume = () => resume();

  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
  const intersectionObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries => { state.inViewport = entries.some(entry => entry.isIntersecting); if (state.inViewport) resume(); }, { threshold: 0.01 }) : null; intersectionObserver?.observe(root);
  overlayCanvas.addEventListener("pointerdown", pointerDown); overlayCanvas.addEventListener("pointermove", pointerMove); overlayCanvas.addEventListener("pointerup", pointerUp); overlayCanvas.addEventListener("pointercancel", pointerCancel); overlayCanvas.addEventListener("pointerleave", pointerLeave); overlayCanvas.addEventListener("wheel", wheel, { passive: false }); overlayCanvas.addEventListener("dblclick", reset); root.addEventListener("pointerenter", rootEnter); root.addEventListener("pointerleave", rootLeave); resetButton?.addEventListener("click", reset); autoButton?.addEventListener("click", toggleAuto); document.addEventListener("visibilitychange", visibilityResume); window.addEventListener("focus", focusResume); window.addEventListener("pageshow", focusResume);
  const resumeTimer = window.setInterval(() => { if (!state.disposed && root.isConnected && state.suspended) resume(); }, 650);
  updateAutoButton(); resize();

  function frame(now) {
    if (state.disposed) return;
    if (!root.isConnected) { state.suspended = true; state.lastFrame = now; state.raf = requestAnimationFrame(frame); return; }
    if (state.suspended) { state.suspended = false; state.lastFrame = now; resize(); state.needsRender = true; }
    const dt = Math.min(50, Math.max(0, now - state.lastFrame)); state.lastFrame = now;
    if (state.inViewport && state.autoRotate && !state.dragging && !reducedMotion && now - state.lastInteraction > AUTO_DELAY_MS) { state.centerLon = wrapLongitude(state.centerLon + dt * AUTO_DEG_PER_MS / Math.pow(Math.max(1, state.zoom), .72)); state.needsRender = true; }
    if (state.inViewport && state.needsRender) render(); state.raf = requestAnimationFrame(frame);
  }
  state.raf = requestAnimationFrame(frame);

  function cleanup() {
    if (state.disposed) return; state.disposed = true; cancelAnimationFrame(state.raf); clearInterval(resumeTimer); clearTimeout(state.hoverTimer); if (idleHandle != null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle); if (detailTimer) clearTimeout(detailTimer); resizeObserver.disconnect(); intersectionObserver?.disconnect();
    overlayCanvas.removeEventListener("pointerdown", pointerDown); overlayCanvas.removeEventListener("pointermove", pointerMove); overlayCanvas.removeEventListener("pointerup", pointerUp); overlayCanvas.removeEventListener("pointercancel", pointerCancel); overlayCanvas.removeEventListener("pointerleave", pointerLeave); overlayCanvas.removeEventListener("wheel", wheel); overlayCanvas.removeEventListener("dblclick", reset); root.removeEventListener("pointerenter", rootEnter); root.removeEventListener("pointerleave", rootLeave); resetButton?.removeEventListener("click", reset); autoButton?.removeEventListener("click", toggleAuto); document.removeEventListener("visibilitychange", visibilityResume); window.removeEventListener("focus", focusResume); window.removeEventListener("pageshow", focusResume); gl.deleteTexture(texture); gl.deleteBuffer(quad); gl.deleteProgram(program); if (globalThis[GLOBE_REGISTRY_KEY]?.cleanup === cleanup) delete globalThis[GLOBE_REGISTRY_KEY];
  }
  return cleanup;
}

for (let version = 1; version <= 14; version += 1) {
  const key = `__abyssal_homepage_globe_v${version}`, previous = globalThis[key]; if (!previous?.cleanup) continue;
  try { previous.cleanup(); } catch (error) { console.warn("[homepage-globe] previous cleanup failed:", error); }
  try { delete globalThis[key]; } catch (_) {}
}

dv.container.replaceChildren(); injectStyles();
const places = collectPlaces(), settings = resolveSettings(), palette = paletteFor(settings);
const host = document.createElement("div"); host.className = "hd-globe-host";
const root = document.createElement("section"); root.className = "hd-globe"; root.dataset.globeStyle = settings.styleKey; root.dataset.pinStyle = settings.pinKey; root.style.setProperty("--globe-pref-width", `${settings.width}px`); root.style.setProperty("--globe-pref-ratio", `${settings.width} / ${settings.height}`); root.style.setProperty("--globe-atmosphere", palette.atmosphere); root.style.setProperty("--globe-visited", palette.visited); root.style.setProperty("--globe-planned", palette.planned); root.style.setProperty("--globe-saved", palette.saved);
const stage = document.createElement("div"); stage.className = "hd-globe-stage"; const glCanvas = document.createElement("canvas"); glCanvas.className = "hd-globe-webgl"; glCanvas.setAttribute("aria-hidden", "true"); const overlayCanvas = document.createElement("canvas"); overlayCanvas.className = "hd-globe-overlay"; const tooltip = document.createElement("div"); tooltip.className = "hd-globe-tooltip"; stage.append(glCanvas, overlayCanvas, tooltip);
const footer = document.createElement("div"); footer.className = "hd-globe-footer";
for (const [className, label] of [["is-visited", "visited"], ["is-planned", "want to visit"], ["is-saved", "saved"]]) { const item = document.createElement("span"); item.className = "hd-globe-legend"; const swatch = document.createElement("i"); swatch.className = `hd-globe-swatch ${className}`; swatch.setAttribute("aria-hidden", "true"); item.append(swatch, document.createTextNode(label)); footer.appendChild(item); }
const controls = document.createElement("div"); controls.className = "hd-globe-controls"; const resetButton = document.createElement("button"); resetButton.className = "hd-globe-control"; resetButton.type = "button"; resetButton.dataset.action = "reset"; resetButton.textContent = "reset"; const autoButton = document.createElement("button"); autoButton.className = "hd-globe-control"; autoButton.type = "button"; autoButton.dataset.action = "auto"; autoButton.textContent = "auto:on"; controls.append(resetButton, autoButton);
root.append(stage, footer, controls); host.appendChild(root); dv.container.appendChild(host);
let cleanup = () => {};
try { cleanup = setupGlobe(root, stage, glCanvas, overlayCanvas, tooltip, controls, places, palette, settings.pinKey); } catch (error) { console.error("[homepage-globe] renderer failed:", error); }
globalThis[GLOBE_REGISTRY_KEY] = { cleanup };
