dv.container.empty();

const localSettings = dv.page("90_System/93_Configuration/settings.local");
const exampleSettings = dv.page("90_System/93_Configuration/settings.example");
const settings = localSettings || exampleSettings || {};
const usable = value => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase().startsWith("fill in your ")) return null;
  return value;
};
const setting = key => usable(settings?.file?.frontmatter?.[key] ?? settings?.[key]);
const VAULT = dv.app.vault.getName();
const USER = setting("username") || "user";
const F = {
  daily: "00_Capture/01_Journal",
  cornelldir: "00_Capture/02_Cornell",
  quick: "00_Capture/03_Zettelkasten",
  movie_note: "20_Personal_Life/25_Media_Tracker/Movies",
  tvseries_note: "20_Personal_Life/25_Media_Tracker/TV_Series",
  oniondir: "70_Interests_&_Research/78_Onion_Sites",
};

const pad = n => String(n).padStart(2, "0");
const now = new Date();
const fileExists = path => !!dv.app.vault.getAbstractFileByPath(path);
const localDateKey = value => {
  let date = null;
  if (typeof value?.toJSDate === "function") date = value.toJSDate();
  else if (typeof value?.toMillis === "function") date = new Date(value.toMillis());
  else if (value instanceof Date) date = value;
  else if (value !== null && value !== undefined) date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const root = dv.container.createDiv("hd-root");
const actionsRoot = dv.container.createDiv("hd-root");
const files = dv.pages();
const totalNotes = files.length;
const totalTags = files.file.tags.distinct().length;
const totalBooks = dv.pages("#Book").length;
const startDate = setting("start_date");
const apiKey = setting("openweathermap_key");
const city = setting("openweathermap_city");
const units = setting("openweathermap_unit") || "metric";
const WEATHER_CACHE_MS = 10 * 60 * 1000;
window.__hdWeatherCache = window.__hdWeatherCache || null;

async function getWeather() {
  if (!apiKey || !city) return null;
  const cached = window.__hdWeatherCache;
  if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) return cached.data;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Weather data fetch failed");
    const data = await response.json();
    window.__hdWeatherCache = { ts: Date.now(), data };
    return data;
  } catch (error) {
    console.error("Dashboard weather:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function renderWeather() {
  const data = await getWeather();
  let weatherText = apiKey && city ? "Unavailable" : "Configure weather in settings.local.md";
  const temp = data?.main?.temp;
  const humidity = data?.main?.humidity;
  const desc = data?.weather?.[0]?.description;
  if (temp !== undefined && desc) {
    const description = desc.charAt(0).toUpperCase() + desc.slice(1);
    const unit = units === "imperial" ? "°F" : units === "metric" ? "°C" : "K";
    weatherText = `${Math.round(temp)}${unit}, ${description}, ${humidity}% humid`;
  }

  try {
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const h = root.createDiv("hd-header");
    const ff = h.createDiv("hd-ff");
    const NODES = [[50,50,5.5],[30,30,4],[68,28,4.5],[26,68,4],[72,70,4],[48,20,3],[18,48,3],[82,48,3],[50,80,3],[12,22,2],[36,8,2],[88,14,2],[94,36,2],[6,62,2],[16,84,2],[40,92,2],[86,86,2],[94,60,2]];
    const EDGES = [[0,1],[0,2],[0,3],[0,4],[1,5],[5,2],[1,6],[6,3],[2,7],[7,4],[3,8],[8,4],[1,9],[5,10],[2,11],[7,12],[3,13],[3,14],[8,15],[4,16],[7,17]];
    const logo = ff.createDiv("hd-ff-logo");
    const svg = logo.createSvg("svg", { attr: { viewBox: "0 0 100 100" } });
    for (const [a, b] of EDGES) svg.createSvg("line", { attr: { x1: NODES[a][0], y1: NODES[a][1], x2: NODES[b][0], y2: NODES[b][1] } });
    for (const [x, y, r] of NODES) svg.createSvg("circle", { attr: { cx: x, cy: y, r } });

    const info = ff.createDiv("hd-ff-info");
    const frow = (key, value) => {
      const row = info.createDiv("hd-ff-row");
      row.createSpan({ cls: "hd-ff-key", text: key });
      return row.createSpan({ cls: "hd-ff-val", text: value });
    };
    const count = (src, filter) => { try { const pages = dv.pages(src); return (filter ? pages.where(filter) : pages).length; } catch { return 0; } };

    frow("user", `${USER}@${VAULT}`);
    frow("greet", `${greeting}, ${USER}`.toLowerCase()).createSpan({ cls: "hd-cursor" });
    const datetimeSpan = frow("datetime", "");
    const updateClock = () => {
      const current = new Date();
      datetimeSpan.textContent = `${DAYS[current.getDay()]}, ${MONTHS[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}, ${pad(current.getHours())}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`.toLowerCase();
    };
    updateClock();
    dv.component.registerInterval(window.setInterval(updateClock, 1000));

    let ageText = "set start_date in settings.local.md";
    if (startDate) {
      const startTs = typeof startDate?.toMillis === "function" ? startDate.toMillis() : new Date(startDate).getTime();
      if (Number.isFinite(startTs)) {
        const totalDaysVault = Math.max(0, Math.floor((Date.now() - startTs) / 86400000));
        const years = Math.floor(totalDaysVault / 365);
        const remainingDays = totalDaysVault % 365;
        ageText = years > 0
          ? `${years} year${years === 1 ? "" : "s"}${remainingDays ? ` ${remainingDays} day${remainingDays === 1 ? "" : "s"}` : ""}`
          : `${totalDaysVault} day${totalDaysVault === 1 ? "" : "s"}`;
      }
    }

    frow("weather", weatherText);
    frow("v-age", ageText);
    frow("note", `${totalNotes} entries`);
    frow("journal", `${count(`"${F.daily}"`)} entries`);
    frow("book", `${totalBooks}`);
    frow("tag", `${totalTags}`);

    const pal = info.createDiv("hd-ff-palette");
    for (const variable of ["--cc-p04", "--cc-p06", "--cc-p08", "--cc-p10", "--cc-p11", "--cc-p12", "--cc-p13"]) {
      pal.createDiv("hd-ff-swatch").style.background = `var(${variable})`;
    }

    const WEEKS = 17;
    const touched = {};
    for (const page of files) {
      const key = localDateKey(page.file.mtime);
      if (key) touched[key] = (touched[key] || 0) + 1;
    }
    const hm = ff.createDiv("hd-heat");
    const hlab = hm.createDiv("hd-heat-label");
    hlab.createSpan({ cls: "hd-ff-key", text: "activity" });
    hlab.createSpan({ cls: "hd-heat-sub", text: "latest note edits · 17 weeks" });
    const hgrid = hm.createDiv("hd-heat-grid");
    const heatmapToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hstart = new Date(heatmapToday);
    hstart.setDate(heatmapToday.getDate() - WEEKS * 7 + 1);
    const level = n => n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0;
    for (let week = 0; week < WEEKS; week++) {
      const col = hgrid.createDiv("hd-heat-col");
      for (let row = 0; row < 7; row++) {
        const date = new Date(hstart);
        date.setDate(hstart.getDate() + week * 7 + row);
        const cell = col.createDiv("hd-heat-cell");
        const key = localDateKey(date);
        const n = touched[key] || 0;
        if (n) cell.addClass(`l${level(n)}`);
        cell.setAttr("data-date", key);
        cell.setAttr("title", `${key} · ${n} note${n === 1 ? "" : "s"} last modified`);
      }
    }
    const hleg = hm.createDiv("hd-heat-legend");
    hleg.createSpan({ text: "less" });
    for (let i = 0; i <= 4; i++) hleg.createDiv("hd-heat-cell" + (i ? ` l${i}` : ""));
    hleg.createSpan({ text: "more" });
  } catch (error) {
    root.createDiv({ cls: "hd-empty", text: "Header error: " + error.message });
  }
}

void renderWeather();

const zettelkasten = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())} -`;
const rawPath = `${F.daily}/${now.getFullYear()}/${MONTHS[now.getMonth()]}/${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${DAYS[now.getDay()]}.md`;
const cleanPath = rawPath.replace(/\/+/g, "/");

const revealFolder = async folderObj => {
  try {
    const explorer = dv.app.internalPlugins?.getPluginById?.("file-explorer")?.instance;
    if (explorer?.revealInFolder) {
      const leaf = dv.app.workspace.getLeftLeaf(false);
      if (leaf) await leaf.setViewState({ type: "file-explorer" });
      explorer.revealInFolder(folderObj);
      return true;
    }
  } catch (error) {
    console.error("revealFolder failed:", error);
  }
  return false;
};

const btn = (parent, label, path, opts = {}) => {
  const anchor = parent.createEl("a", { cls: `hd-btn${opts.primary ? " hd-btn--primary" : ""}`, text: label });
  const onClick = async event => {
    event.preventDefault();
    if (opts.isFolder) {
      const folderObj = dv.app.vault.getAbstractFileByPath(path.replace(/\/+$/, ""));
      if (folderObj && !(await revealFolder(folderObj))) new Notice(`Cannot open folder: ${path}`);
      else if (!folderObj) new Notice(`Folder does not exist: ${path}`);
      return;
    }
    const fileObj = dv.app.vault.getAbstractFileByPath(path);
    if (fileObj) await dv.app.workspace.getLeaf(false).openFile(fileObj);
    else window.open(`obsidian://new?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(path)}`);
  };
  dv.component.registerDomEvent(anchor, "click", onClick);
  return anchor;
};

try {
  const bar = actionsRoot.createDiv("hd-actions");
  btn(bar, "/journal", cleanPath, { primary: true });
  btn(bar, "/zettelkasten", `${F.quick}/${zettelkasten}.md`);
  btn(bar, "/cornell", `${F.cornelldir}/`, { isFolder: true });
  btn(bar, "/movies", `${F.movie_note}/`, { isFolder: true });
  btn(bar, "/tvseries", `${F.tvseries_note}/`, { isFolder: true });
  btn(bar, "/web-site", `${F.oniondir}/`, { isFolder: true });
} catch (error) {
  actionsRoot.createDiv({ cls: "hd-empty", text: "Actions error: " + error.message });
}
