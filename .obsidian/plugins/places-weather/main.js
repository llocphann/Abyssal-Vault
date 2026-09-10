const { Plugin, Notice, normalizePath, requestUrl, parseYaml } = require("obsidian");

const SETTINGS_PATH = "90_System/93_Configuration/settings.md";
const PLACES_SOURCE = "90_System/93_Configuration/Custom_Views/Places";
const MAPS_PLUGIN_ID = "maps";
const MAPS_REPOSITORY = "obsidianmd/obsidian-maps";
const MAPS_VERSION = "0.2.2";
const MAPS_MANIFEST = {
  id: MAPS_PLUGIN_ID,
  name: "Maps",
  version: MAPS_VERSION,
  minAppVersion: "1.13.1",
  description: "Adds a map layout to bases so you can display notes as an interactive map view.",
  author: "Obsidian",
  authorUrl: "https://obsidian.md",
  isDesktopOnly: false,
};
const DEPRECATED_STORAGE_KEYS = [
  "obsidian.places.openweathermap.apiKey",
  "obsidian.places.openweathermap.cache.v1",
];
const CACHE_TTL_MS = 15 * 60 * 1000;
const CARD_REVEAL_DELAY_MS = 3000;
const CARD_BACK_DURATION_MS = 3000;

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundOne(value) {
  const parsed = finite(value);
  return parsed == null ? null : Math.round(parsed * 10) / 10;
}

function normalizeUnits(value) {
  const units = clean(value).toLowerCase();
  return units === "imperial" || units === "standard" ? units : "metric";
}

function temperatureUnitFor(units) {
  if (units === "imperial") return "°F";
  if (units === "standard") return "K";
  return "°C";
}

function windUnitFor(units) {
  return units === "imperial" ? "mph" : "m/s";
}

function symbolFor(id, icon) {
  const code = Number(id) || 0;
  if (code >= 200 && code < 300) return "⛈";
  if (code >= 300 && code < 400) return "🌦";
  if (code >= 500 && code < 600) return "🌧";
  if (code >= 600 && code < 700) return "❄";
  if (code >= 700 && code < 800) return "🌫";
  if (code === 800) return String(icon || "").endsWith("n") ? "☾" : "☀";
  if (code === 801) return "🌤";
  if (code === 802) return "⛅";
  if (code > 802 && code < 900) return "☁";
  return "◌";
}

function parseCoordinates(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const lat = Number(value[0]);
    const lon = Number(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  const raw = clean(value);
  if (!raw) return null;
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

class PlacesWeatherPlugin extends Plugin {
  async onload() {
    this.memoryCache = new Map();
    this.pending = new Map();
    this.observers = [];
    this.mapsEnsurePromise = null;
    this.placesSyncPromise = null;
    this.clearDeprecatedStorage();

    const prepare = () => void this.preparePlacesRuntime();
    if (this.app.workspace?.layoutReady) prepare();
    else this.app.workspace.onLayoutReady(prepare);

    this.observeDocument(document);
    this.registerEvent(this.app.workspace.on("layout-change", () => this.hydrateDocument(document)));
    this.registerEvent(this.app.metadataCache.on("changed", file => {
      if (file?.path !== SETTINGS_PATH) return;
      this.clearCache();
      this.hydrateDocument(document, true);
    }));
    this.register(() => {
      for (const observer of this.observers) observer.disconnect();
      this.observers = [];
    });
  }

  async preparePlacesRuntime() {
    await this.ensureMapsPlugin();
    await this.syncPlacesCustomView();
  }

  async refreshPluginManifests(manager) {
    if (typeof manager?.loadManifests === "function") {
      try {
        await manager.loadManifests();
      } catch (error) {
        console.debug("[Places Weather] loadManifests failed:", error);
      }
    }

    if (typeof manager?.loadAvailablePlugins === "function") {
      try {
        await manager.loadAvailablePlugins();
      } catch (error) {
        console.debug("[Places Weather] loadAvailablePlugins failed:", error);
      }
    }
  }

  async loadMapsManifest(manager) {
    if (manager?.manifests?.[MAPS_PLUGIN_ID] || typeof manager?.loadManifest !== "function") return;

    const folderPath = normalizePath(`${this.app.vault.configDir}/plugins/${MAPS_PLUGIN_ID}`);
    try {
      await manager.loadManifest(folderPath);
      return;
    } catch (error) {
      console.debug(`[Places Weather] loadManifest(${folderPath}) failed:`, error);
    }

    try {
      await manager.loadManifest(MAPS_PLUGIN_ID);
    } catch (error) {
      console.debug(`[Places Weather] loadManifest(${MAPS_PLUGIN_ID}) failed:`, error);
    }
  }

  async ensureMapsPlugin() {
    if (this.mapsEnsurePromise) return this.mapsEnsurePromise;

    this.mapsEnsurePromise = (async () => {
      const manager = this.app.plugins;
      if (!manager) throw new Error("Obsidian plugin manager is unavailable");

      let changed = false;

      if (!manager.manifests?.[MAPS_PLUGIN_ID]) {
        await this.refreshPluginManifests(manager);
        await this.loadMapsManifest(manager);
      }

      if (!manager.manifests?.[MAPS_PLUGIN_ID]) {
        if (typeof manager.installPlugin !== "function") {
          throw new Error("This Obsidian build does not expose the community-plugin installer");
        }

        try {
          await manager.installPlugin(MAPS_REPOSITORY, MAPS_VERSION, MAPS_MANIFEST);
        } catch (firstError) {
          console.debug(`[Places Weather] installPlugin(${MAPS_VERSION}) failed; retrying v${MAPS_VERSION}:`, firstError);
          await manager.installPlugin(MAPS_REPOSITORY, `v${MAPS_VERSION}`, MAPS_MANIFEST);
        }

        changed = true;
        await this.refreshPluginManifests(manager);
        await this.loadMapsManifest(manager);
      }

      if (!manager.manifests?.[MAPS_PLUGIN_ID]) {
        throw new Error("Maps was installed on disk but its manifest was not registered");
      }

      if (!manager.plugins?.[MAPS_PLUGIN_ID]) {
        if (typeof manager.enablePluginAndSave === "function") {
          await manager.enablePluginAndSave(MAPS_PLUGIN_ID);
        } else if (typeof manager.enablePlugin === "function") {
          await manager.enablePlugin(MAPS_PLUGIN_ID);
        } else {
          throw new Error("This Obsidian build cannot enable community plugins programmatically");
        }
        changed = true;
      }

      if (!manager.plugins?.[MAPS_PLUGIN_ID] && typeof manager.loadPlugin === "function") {
        await manager.loadPlugin(MAPS_PLUGIN_ID);
      }

      if (!manager.plugins?.[MAPS_PLUGIN_ID]) {
        throw new Error("Maps is installed but did not enter the loaded-plugin registry");
      }

      if (changed) {
        console.info(`[Places Weather] Maps ${MAPS_VERSION} is installed, registered, enabled and loaded.`);
        new Notice("Abyssal-Vault: Maps is ready. Reopen Map.base if it was already open.", 7000);
        this.app.workspace?.trigger?.("layout-change");
      }

      return true;
    })().catch(error => {
      console.error("[Places Weather] Could not prepare Maps:", error);
      new Notice(
        `Abyssal-Vault: Maps could not be installed/loaded automatically. Open Settings → Community plugins, install/enable Maps, then reopen Map.base. ${error?.message || error}`,
        15000
      );
      return false;
    });

    return this.mapsEnsurePromise;
  }

  async waitForCustomViews() {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const plugin = this.app.plugins.getPlugin?.("custom-views")
        ?? this.app.plugins.plugins?.["custom-views"];
      if (plugin?.settings?.views) return plugin;
      await new Promise(resolve => window.setTimeout(resolve, 250));
    }
    return null;
  }

  async syncPlacesCustomView() {
    if (this.placesSyncPromise) return this.placesSyncPromise;

    this.placesSyncPromise = (async () => {
      const customViews = await this.waitForCustomViews();
      if (!customViews) {
        console.warn("[Places Weather] Custom Views was not ready; Places view source was not synchronized.");
        return false;
      }

      const read = path => this.app.vault.adapter.read(path);
      const view = JSON.parse(await read(`${PLACES_SOURCE}/view.json`));
      view.template = await read(`${PLACES_SOURCE}/template.html`);
      view.css = [
        await read(`${PLACES_SOURCE}/styles.css`),
        await read(`${PLACES_SOURCE}/local-map.css`),
        await read(`${PLACES_SOURCE}/interactive.css`),
        await read(`${PLACES_SOURCE}/media-parity.css`),
        await read(`${PLACES_SOURCE}/map-controls.css`),
        await read(`${PLACES_SOURCE}/weather.css`),
      ].map(value => value.trimEnd()).join("\n\n") + "\n";
      view.js = [
        await read(`${PLACES_SOURCE}/script.js`),
        await read(`${PLACES_SOURCE}/inline-edit.js`),
        await read(`${PLACES_SOURCE}/media-parity.js`),
        await read(`${PLACES_SOURCE}/map-controls.js`),
        await read(`${PLACES_SOURCE}/weather.js`),
      ].map(value => value.trimEnd()).join("\n\n") + "\n";

      const existing = customViews.settings.views.find(item => item?.id === view.id);
      const alreadyFirst = customViews.settings.views[0]?.id === view.id;
      const unchanged = existing && JSON.stringify(existing) === JSON.stringify(view);

      if (!unchanged || !alreadyFirst) {
        customViews.settings.views = [
          view,
          ...customViews.settings.views.filter(item => item?.id !== view.id),
        ];
        await customViews.saveSettings();
        customViews.refreshAllViews?.();
        console.info("[Places Weather] Synced places-v1 Custom View from modular source.");
      }

      return true;
    })().catch(error => {
      console.error("[Places Weather] Failed to sync places-v1 Custom View:", error);
      return false;
    });

    return this.placesSyncPromise;
  }

  clearDeprecatedStorage() {
    try {
      for (const key of DEPRECATED_STORAGE_KEYS) window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("[Places Weather] Could not clear deprecated local storage:", error);
    }
  }

  clearCache() {
    this.memoryCache.clear();
    this.pending.clear();
  }

  async readSettingsFrontmatter() {
    const file = this.app.vault.getFileByPath?.(SETTINGS_PATH)
      ?? this.app.vault.getAbstractFileByPath?.(SETTINGS_PATH)
      ?? null;
    const cached = file
      ? this.app.metadataCache.getFileCache?.(file)?.frontmatter
      : this.app.metadataCache.getCache?.(SETTINGS_PATH)?.frontmatter;
    if (cached && typeof cached === "object") return cached;
    if (!file || typeof this.app.vault.cachedRead !== "function") return {};

    try {
      const content = await this.app.vault.cachedRead(file);
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      return match ? (parseYaml(match[1]) || {}) : {};
    } catch (error) {
      console.warn(`[Places Weather] Could not read ${SETTINGS_PATH}:`, error);
      return {};
    }
  }

  async getWeatherSettings() {
    const settings = await this.readSettingsFrontmatter();
    return {
      apiKey: clean(settings.openweathermap_key),
      units: normalizeUnits(settings.openweathermap_unit),
    };
  }

  cacheKey(lat, lon, units) {
    return `${units}:${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  }

  normalize(payload, units) {
    const current = payload?.weather?.[0] || {};
    return {
      condition: clean(current.main),
      description: clean(current.description),
      icon: clean(current.icon),
      symbol: symbolFor(current.id, current.icon),
      temp: roundOne(payload?.main?.temp),
      feelsLike: roundOne(payload?.main?.feels_like),
      humidity: finite(payload?.main?.humidity),
      pressure: finite(payload?.main?.pressure),
      windSpeed: roundOne(payload?.wind?.speed),
      clouds: finite(payload?.clouds?.all),
      observedAt: finite(payload?.dt),
      updatedAt: Date.now(),
      units,
      tempUnit: temperatureUnitFor(units),
      windUnit: windUnitFor(units),
    };
  }

  async getWeather(lat, lon, options = {}) {
    const coordinates = parseCoordinates([lat, lon]);
    if (!coordinates) throw new Error("Invalid coordinates");

    const settings = await this.getWeatherSettings();
    if (!settings.apiKey) {
      const error = new Error("Weather API key is not configured in Vault Settings");
      error.code = "NO_API_KEY";
      throw error;
    }

    const key = this.cacheKey(coordinates.lat, coordinates.lon, settings.units);
    const cached = this.memoryCache.get(key);
    const force = options.force === true;
    if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

    if (!force && this.pending.has(key)) return this.pending.get(key);

    const task = (async () => {
      const params = new URLSearchParams({
        lat: String(coordinates.lat),
        lon: String(coordinates.lon),
        appid: settings.apiKey,
        units: settings.units,
        lang: "en",
      });
      const response = await requestUrl({
        url: `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
        method: "GET",
      });
      const payload = response.json;
      if (response.status < 200 || response.status >= 300 || !payload || Number(payload.cod) >= 400) {
        throw new Error(clean(payload?.message) || `Weather request failed (${response.status})`);
      }

      const data = this.normalize(payload, settings.units);
      this.memoryCache.set(key, { timestamp: Date.now(), data });
      return data;
    })();

    this.pending.set(key, task);
    try {
      return await task;
    } finally {
      this.pending.delete(key);
    }
  }

  observeDocument(doc) {
    if (!doc?.body) return;
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(".map-place-back[data-weather-coordinates]")) this.hydrateBack(node);
          node.querySelectorAll?.(".map-place-back[data-weather-coordinates]").forEach(element => this.hydrateBack(element));
        }
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    this.observers.push(observer);
    this.hydrateDocument(doc);
  }

  hydrateDocument(doc, force = false) {
    doc?.querySelectorAll?.(".map-place-back[data-weather-coordinates]").forEach(element => this.hydrateBack(element, force));
  }

  setBackText(back, role, value) {
    const element = back.querySelector(`[data-weather-role="${role}"]`);
    if (element) element.textContent = value;
  }

  renderBack(back, data) {
    this.setBackText(back, "symbol", data.symbol || "◌");
    this.setBackText(back, "temp", data.temp == null ? "—" : String(data.temp));
    this.setBackText(back, "temp-unit", data.tempUnit || "");
    this.setBackText(back, "condition", data.description || data.condition || "Current conditions");
    this.setBackText(back, "humidity", data.humidity == null ? "—" : `${Math.round(data.humidity)}%`);
    this.setBackText(back, "wind", data.windSpeed == null ? "—" : `${data.windSpeed} ${data.windUnit || "m/s"}`);
    this.setBackText(back, "clouds", data.clouds == null ? "—" : `${Math.round(data.clouds)}%`);
    this.setBackText(back, "pressure", data.pressure == null ? "—" : `${Math.round(data.pressure)} hPa`);
    back.dataset.weatherReady = "true";
    delete back.dataset.weatherError;
  }

  renderBackError(back, message, code = "") {
    this.setBackText(back, "symbol", "◌");
    this.setBackText(back, "temp", "—");
    this.setBackText(back, "temp-unit", "");
    this.setBackText(back, "condition", message || "Weather unavailable");
    this.setBackText(back, "humidity", "—");
    this.setBackText(back, "wind", "—");
    this.setBackText(back, "clouds", "—");
    this.setBackText(back, "pressure", "—");
    back.dataset.weatherError = code || "error";
    delete back.dataset.weatherReady;
  }

  bindBackCycle(back) {
    const card = back?.closest?.(".bases-map-popup");
    const shell = back?.closest?.(".maplibregl-popup-content");
    if (!card || !shell || !card.querySelector(".bases-map-popup-property-value img")) return;
    if (card.dataset.placeCycleBound === "true") return;
    card.dataset.placeCycleBound = "true";

    let showTimer = null;
    let hideTimer = null;

    const clearTimers = () => {
      if (showTimer != null) window.clearTimeout(showTimer);
      if (hideTimer != null) window.clearTimeout(hideTimer);
      showTimer = null;
      hideTimer = null;
    };

    const reset = () => {
      clearTimers();
      card.classList.remove("map-place-cycle-show-back");
    };

    const start = () => {
      clearTimers();
      card.classList.remove("map-place-cycle-show-back");
      showTimer = window.setTimeout(() => {
        showTimer = null;
        if (!card.isConnected) return;
        card.classList.add("map-place-cycle-show-back");
        hideTimer = window.setTimeout(() => {
          hideTimer = null;
          if (card.isConnected) card.classList.remove("map-place-cycle-show-back");
        }, CARD_BACK_DURATION_MS);
      }, CARD_REVEAL_DELAY_MS);
    };

    shell.addEventListener("mouseenter", start);
    shell.addEventListener("mouseleave", reset);
    shell.addEventListener("focusin", start);
    shell.addEventListener("focusout", event => {
      if (!shell.contains(event.relatedTarget)) reset();
    });
  }

  async hydrateBack(back, force = false) {
    if (!back || back.dataset.weatherLoading === "true") return;
    this.bindBackCycle(back);
    if (!force && back.dataset.weatherReady === "true") return;

    const coordinates = parseCoordinates(back.dataset.weatherCoordinates);
    if (!coordinates) {
      this.renderBackError(back, "No coordinates", "NO_COORDINATES");
      return;
    }

    back.dataset.weatherLoading = "true";
    this.setBackText(back, "condition", "Loading current conditions…");
    try {
      const data = await this.getWeather(coordinates.lat, coordinates.lon, { force });
      if (back.isConnected) this.renderBack(back, data);
    } catch (error) {
      console.warn("[Places Weather]", error);
      if (back.isConnected) this.renderBackError(back, clean(error?.message), error?.code || "");
    } finally {
      delete back.dataset.weatherLoading;
    }
  }
}

module.exports = PlacesWeatherPlugin;
