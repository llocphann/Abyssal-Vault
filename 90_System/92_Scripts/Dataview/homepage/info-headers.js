dv.container.empty();

// ===== Vars for all =====
const settings = dv.page("90_System/93_Configuration/settings") || dv.page("settings");
const VAULT = settings?.file?.frontmatter?.["vault_name"] ?? settings?.vault_name;
const USER  = settings?.file?.frontmatter?.["username"] ?? settings?.username;
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
const fileExists = (path) => !!dv.app.vault.getAbstractFileByPath(path);
const localDateKey = (value) => {
  let date = null;
  if (typeof value?.toJSDate === "function") date = value.toJSDate();
  else if (typeof value?.toMillis === "function") {
    date = new Date(value.toMillis());
  } else if (value instanceof Date) date = value;
  else if (value !== null && value !== undefined) date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${
    pad(date.getDate())
  }`;
};
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const root = dv.container.createDiv("hd-root");
const actionsRoot = dv.container.createDiv("hd-root");

// ========================================================
// ===== Part 1: HEADER / WEATHER / HEATMAP =====
// ========================================================
const files = dv.pages();
const totalNotes = files.length;
const totalTags = files.file.tags.distinct().length;
const totalBooks = dv.pages("#Book").length;
const startDate = settings?.file?.frontmatter?.["start_date"] ?? settings?.start_date;
const apiKey = settings?.file?.frontmatter?.["openweathermap_key"] ?? settings?.openweathermap_key;
const city = settings?.file?.frontmatter?.["openweathermap_city"] ?? settings?.openweathermap_city;
const units = settings?.file?.frontmatter?.["openweathermap_unit"] ?? settings?.openweathermap_unit;
const WEATHER_CACHE_MS = 10 * 60 * 1000;
window.__hdWeatherCache = window.__hdWeatherCache || null;

async function getWeather() {
    if (!apiKey) {
        console.warn("Fill your key in 90_System/93_Configuration/settings");
        return null;
    }
    const cached = window.__hdWeatherCache;
    if (cached && Date.now() - cached.ts < WEATHER_CACHE_MS) return cached.data;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Weather data fetch failed');
        const data = await response.json();
        window.__hdWeatherCache = { ts: Date.now(), data };
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}
async function renderWeather() {
    const data = await getWeather();
    let weatherText = apiKey ? "Unavailable" : "API Key not found";
    const temp = data?.main?.temp;
    const humidity = data?.main?.humidity;
    const desc = data?.weather?.[0]?.description;
    if (temp !== undefined && desc) {
        const description = desc.charAt(0).toUpperCase() + desc.slice(1);
        weatherText = `${Math.round(temp)}°C, ${description}, ${humidity}% humid`;
    }

    try {
      const hour = now.getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const days = DAYS;
      const months = MONTHS;

      const h = root.createDiv("hd-header");
      const ff = h.createDiv("hd-ff");

      // Logo SVG
      const NODES = [[50,50,5.5],[30,30,4],[68,28,4.5],[26,68,4],[72,70,4],[48,20,3],[18,48,3],[82,48,3],[50,80,3],[12,22,2],[36,8,2],[88,14,2],[94,36,2],[6,62,2],[16,84,2],[40,92,2],[86,86,2],[94,60,2]];
      const EDGES = [[0,1],[0,2],[0,3],[0,4],[1,5],[5,2],[1,6],[6,3],[2,7],[7,4],[3,8],[8,4],[1,9],[5,10],[2,11],[7,12],[3,13],[3,14],[8,15],[4,16],[7,17]];
      const logo = ff.createDiv("hd-ff-logo");
      const svg = logo.createSvg("svg", { attr: { viewBox: "0 0 100 100" } });
      for (const [a, b] of EDGES) svg.createSvg("line", { attr: { x1: NODES[a][0], y1: NODES[a][1], x2: NODES[b][0], y2: NODES[b][1] } });
      for (const [x, y, r] of NODES) svg.createSvg("circle", { attr: { cx: x, cy: y, r } });

      const info = ff.createDiv("hd-ff-info");
      const frow = (k, v) => {
        const r = info.createDiv("hd-ff-row");
        r.createSpan({ cls: "hd-ff-key", text: k });
        return r.createSpan({ cls: "hd-ff-val", text: v });
      };
      const count = (src, f) => { try { const p = dv.pages(src); return (f ? p.where(f) : p).length; } catch { return 0; } };

      frow("user", `${USER}@vault`);
      frow("greet", `${greeting}, ${USER}`.toLowerCase()).createSpan({ cls: "hd-cursor" });

      const datetimeSpan = frow("datetime", "");
      const updateClock = () => {
        const tNow = new Date();
        const tH = pad(tNow.getHours());
        const tM = pad(tNow.getMinutes());
        const tS = pad(tNow.getSeconds());
        const timeStr = `${days[tNow.getDay()]}, ${months[tNow.getMonth()]} ${tNow.getDate()}, ${tNow.getFullYear()}, ${tH}:${tM}:${tS}`.toLowerCase();
        datetimeSpan.textContent = timeStr;
      };
      updateClock();
      dv.component.registerInterval(window.setInterval(updateClock, 1000));

      let startTs = Date.now();
      if (startDate) {
        if (typeof startDate.toMillis === "function") {
            startTs = startDate.toMillis();
        } else if (typeof startDate.getTime === "function") {
            startTs = startDate.getTime();
        } else {
            startTs = new Date(startDate).getTime();
        }
      }
      const totalDaysVault = Math.floor((Date.now() - startTs) / (1000 * 60 * 60 * 24));
      const years = Math.floor(totalDaysVault / 365);
      const remainingDays = totalDaysVault % 365;
      let displayString = "";
      if (years > 0) {
        displayString = `${years} year${years > 1 ? "s" : ""}`;
        if (remainingDays > 0) {
          displayString += ` ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
        }
      } else {
        displayString = `${totalDaysVault} day${totalDaysVault > 1 ? "s" : ""}`;
      }

      frow("weather", weatherText);
      frow("v-age", `${displayString}`);
      frow("note", `${totalNotes} entries`);
      frow("journal", `${count(`"${F.daily}"`)} entries`);
      frow("book", `${totalBooks}`);
      frow("tag", `${totalTags}`);

      const pal = info.createDiv("hd-ff-palette");
      const paletteVars = ["--cc-p04", "--cc-p06", "--cc-p08", "--cc-p10", "--cc-p11", "--cc-p12", "--cc-p13"];
      for (const variable of paletteVars) {
        pal.createDiv("hd-ff-swatch").style.background = `var(${variable})`;
      }

      // Heatmap
      const WEEKS = 17;
      const touched = {};

      for (const p of files) {
        const key = localDateKey(p.file.mtime);
        if (!key) continue;
        touched[key] = (touched[key] || 0) + 1;
      }

      const hm = ff.createDiv("hd-heat");
      const hlab = hm.createDiv("hd-heat-label");
      hlab.createSpan({ cls: "hd-ff-key", text: "activity" });
      hlab.createSpan({ cls: "hd-heat-sub", text: "latest note edits · 17 weeks" });

      const hgrid = hm.createDiv("hd-heat-grid");

      const heatmapToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const hstart = new Date(heatmapToday);
      hstart.setDate(heatmapToday.getDate() - WEEKS * 7 + 1);

      const level = (n) =>
        n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0;

      for (let w = 0; w < WEEKS; w++) {
        const col = hgrid.createDiv("hd-heat-col");
        for (let r = 0; r < 7; r++) {
          const d = new Date(hstart);
          d.setDate(hstart.getDate() + w * 7 + r);
          const cell = col.createDiv("hd-heat-cell");

          const key = localDateKey(d);
          const n = touched[key] || 0;

          if (n) cell.addClass(`l${level(n)}`);
          cell.setAttr("data-date", key);
          cell.setAttr(
            "title",
            `${key} · ${n} note${n === 1 ? "" : "s"} last modified`,
          );
        }
      }

      const hleg = hm.createDiv("hd-heat-legend");
      hleg.createSpan({ text: "less" });
      for (let i = 0; i <= 4; i++) hleg.createDiv("hd-heat-cell" + (i ? ` l${i}` : ""));
      hleg.createSpan({ text: "more" });

    } catch (e) {
      root.createDiv({ cls: "hd-empty", text: "Header error: " + e.message });
    }
}

renderWeather();

// ========================================================
// ===== Part 2: ACTIONS BAR =====
// ========================================================
const zettelkasten = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())} -`;
const YYYY = now.getFullYear();
const MMMM = MONTHS[now.getMonth()];
const DD = pad(now.getDate());
const MM = pad(now.getMonth() + 1);
const dddd = DAYS[now.getDay()];
const customFormat = `${YYYY}/${MMMM}/${DD}-${MM}-${YYYY}-${dddd}`;
const rawPath = `${F.daily}/${customFormat}.md`;
const cleanPath = rawPath.replace(/\/+/g, '/');

const revealFolder = async (folderObj) => {
  try {
    const explorer = dv.app.internalPlugins?.getPluginById?.("file-explorer")?.instance;
    if (explorer?.revealInFolder) {
      const leaf = dv.app.workspace.getLeftLeaf(false);
      if (leaf) await leaf.setViewState({ type: "file-explorer" });
      explorer.revealInFolder(folderObj);
      return true;
    }
  } catch (e) {
    console.error("revealFolder failed:", e);
  }
  return false;
};

const btn = (parent, label, path, opts = {}) => {
  const a = parent.createEl("a", {
    cls: `hd-btn${opts.primary ? " hd-btn--primary" : ""}`,
    text: label
  });

  const onClick = async (e) => {
    e.preventDefault();

    if (opts.isFolder) {
      const folderObj = dv.app.vault.getAbstractFileByPath(path.replace(/\/+$/, ""));
      if (folderObj && !(await revealFolder(folderObj))) {
        new Notice(`Cannot open folder: ${path}`);
      } else if (!folderObj) {
        new Notice(`Folder does not exist: ${path}`);
      }
      return;
    }

    const fileObj = dv.app.vault.getAbstractFileByPath(path);
    if (fileObj) {
      await dv.app.workspace.getLeaf(false).openFile(fileObj);
    } else {
      const action = opts.openIfExists && fileExists(path) ? "open" : "new";
      const uri = `obsidian://${action}?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(path)}`;
      window.open(uri);
    }
  };
  dv.component.registerDomEvent(a, "click", onClick);
  return a;
};

try {
  const bar = actionsRoot.createDiv("hd-actions");
  btn(bar, "/journal", cleanPath, {primary: true, openIfExists: true });
  btn(bar, "/zettelkasten", `${F.quick}/${zettelkasten}.md`);
  btn(bar, "/cornell", `${F.cornelldir}/`);
  btn(bar, "/movies", `${F.movie_note}/`);
  btn(bar, "/tvseries", `${F.tvseries_note}/`);
  btn(bar, "/web-site", `${F.oniondir}/`);
} catch (e) {
  actionsRoot.createDiv({ cls: "hd-empty", text: "Actions error: " + e.message });
}
