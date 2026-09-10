(() => {
  const ctx = tp;
  const app = ctx?.app;
  const activeDocument = ctx?.activeDocument || ctx?.container?.ownerDocument || document;
  const activeWindow = ctx?.activeWindow || activeDocument?.defaultView || window;
  if (!app || !activeDocument || !activeWindow) return;

  const SETTINGS_PATH = "90_System/93_Configuration/settings.md";
  const CACHE_TTL_MS = 15 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 8000;
  const CARD_REVEAL_DELAY_MS = 3000;
  const CARD_BACK_DURATION_MS = 3000;
  const RUNTIME_KEY = "__obsidianVaultPlacesWeatherRuntimeV2";

  const clean = value => value == null ? "" : String(value).trim();
  const finite = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const roundOne = value => {
    const parsed = finite(value);
    return parsed == null ? null : Math.round(parsed * 10) / 10;
  };
  const normalizeUnits = value => {
    const units = clean(value).toLowerCase();
    return units === "imperial" || units === "standard" ? units : "metric";
  };
  const temperatureUnitFor = units => units === "imperial" ? "°F" : units === "standard" ? "K" : "°C";
  const windUnitFor = units => units === "imperial" ? "mph" : "m/s";

  function parseCoordinates(value) {
    if (Array.isArray(value) && value.length >= 2) {
      const lat = Number(value[0]);
      const lon = Number(value[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
    }
    const raw = clean(value);
    const match = raw.match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon };
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

  function createRuntime() {
    const memoryCache = new Map();
    const pending = new Map();
    const observedDocuments = new WeakMap();
    let settingsMtime = null;

    function clearCache() {
      memoryCache.clear();
      pending.clear();
    }

    function readSettings() {
      const file = app.vault.getFileByPath?.(SETTINGS_PATH)
        ?? app.vault.getAbstractFileByPath?.(SETTINGS_PATH)
        ?? null;
      const frontmatter = file
        ? app.metadataCache.getFileCache?.(file)?.frontmatter
        : app.metadataCache.getCache?.(SETTINGS_PATH)?.frontmatter;
      const mtime = Number(file?.stat?.mtime) || 0;

      if (settingsMtime !== mtime) {
        settingsMtime = mtime;
        clearCache();
      }

      const settings = frontmatter && typeof frontmatter === "object" ? frontmatter : {};
      return {
        apiKey: clean(settings.openweathermap_apikey || settings.openweathermap_key),
        units: normalizeUnits(settings.openweathermap_unit),
      };
    }

    function cacheKey(lat, lon, units) {
      return `${units}:${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
    }

    function normalize(payload, units) {
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

    async function getWeather(lat, lon, options = {}) {
      const coordinates = parseCoordinates([lat, lon]);
      if (!coordinates) throw new Error("Invalid coordinates");

      const settings = readSettings();
      if (!settings.apiKey) {
        const error = new Error("Weather API key is not configured in Vault Settings");
        error.code = "NO_API_KEY";
        throw error;
      }

      const key = cacheKey(coordinates.lat, coordinates.lon, settings.units);
      const force = options.force === true;
      const cached = memoryCache.get(key);
      if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
      if (pending.has(key)) return pending.get(key);

      const task = (async () => {
        const params = new URLSearchParams({
          lat: String(coordinates.lat),
          lon: String(coordinates.lon),
          appid: settings.apiKey,
          units: settings.units,
          lang: "en",
        });
        const fetchImpl = activeWindow.fetch?.bind(activeWindow);
        if (!fetchImpl) throw new Error("Fetch is unavailable in the current Obsidian window");

        const AbortControllerImpl = activeWindow.AbortController;
        const controller = AbortControllerImpl ? new AbortControllerImpl() : null;
        const timeout = controller
          ? activeWindow.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
          : null;

        try {
          const response = await fetchImpl(
            `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
            controller ? { signal: controller.signal } : undefined,
          );
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || Number(payload.cod) >= 400) {
            const message = clean(payload?.message) || `Weather request failed (${response.status})`;
            const error = new Error(message);
            error.code = `WEATHER_HTTP_${response.status}`;
            throw error;
          }

          const data = normalize(payload, settings.units);
          memoryCache.set(key, { timestamp: Date.now(), data });
          return data;
        } finally {
          if (timeout != null) activeWindow.clearTimeout(timeout);
        }
      })();

      pending.set(key, task);
      try {
        return await task;
      } finally {
        if (pending.get(key) === task) pending.delete(key);
      }
    }

    function setBackText(back, role, value) {
      const element = back.querySelector(`[data-weather-role="${role}"]`);
      if (element) element.textContent = value;
    }

    function renderBack(back, data) {
      setBackText(back, "symbol", data.symbol || "◌");
      setBackText(back, "temp", data.temp == null ? "—" : String(data.temp));
      setBackText(back, "temp-unit", data.tempUnit || "");
      setBackText(back, "condition", data.description || data.condition || "Current conditions");
      setBackText(back, "humidity", data.humidity == null ? "—" : `${Math.round(data.humidity)}%`);
      setBackText(back, "wind", data.windSpeed == null ? "—" : `${data.windSpeed} ${data.windUnit || "m/s"}`);
      setBackText(back, "clouds", data.clouds == null ? "—" : `${Math.round(data.clouds)}%`);
      setBackText(back, "pressure", data.pressure == null ? "—" : `${Math.round(data.pressure)} hPa`);
      back.dataset.weatherReady = "true";
      delete back.dataset.weatherError;
    }

    function renderBackError(back, message, code = "") {
      setBackText(back, "symbol", "◌");
      setBackText(back, "temp", "—");
      setBackText(back, "temp-unit", "");
      setBackText(back, "condition", message || "Weather unavailable");
      setBackText(back, "humidity", "—");
      setBackText(back, "wind", "—");
      setBackText(back, "clouds", "—");
      setBackText(back, "pressure", "—");
      back.dataset.weatherError = code || "error";
      delete back.dataset.weatherReady;
    }

    function bindBackCycle(back) {
      const card = back?.closest?.(".bases-map-popup");
      const shell = back?.closest?.(".maplibregl-popup-content");
      if (!card || !shell || !card.querySelector(".bases-map-popup-property-value img")) return;
      if (card.dataset.placeCycleBound === "true") return;
      card.dataset.placeCycleBound = "true";

      let showTimer = null;
      let hideTimer = null;
      const clearTimers = () => {
        if (showTimer != null) activeWindow.clearTimeout(showTimer);
        if (hideTimer != null) activeWindow.clearTimeout(hideTimer);
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
        showTimer = activeWindow.setTimeout(() => {
          showTimer = null;
          if (!card.isConnected) return;
          card.classList.add("map-place-cycle-show-back");
          hideTimer = activeWindow.setTimeout(() => {
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

    async function hydrateBack(back, force = false) {
      if (!back || back.dataset.weatherLoading === "true") return;
      bindBackCycle(back);
      if (!force && back.dataset.weatherReady === "true") return;

      const coordinates = parseCoordinates(back.dataset.weatherCoordinates);
      if (!coordinates) {
        renderBackError(back, "No coordinates", "NO_COORDINATES");
        return;
      }

      back.dataset.weatherLoading = "true";
      setBackText(back, "condition", "Loading current conditions…");
      try {
        const data = await getWeather(coordinates.lat, coordinates.lon, { force });
        if (back.isConnected) renderBack(back, data);
      } catch (error) {
        console.warn("[Places weather]", error);
        if (back.isConnected) renderBackError(back, clean(error?.message), error?.code || "");
      } finally {
        delete back.dataset.weatherLoading;
      }
    }

    function hydrateDocument(doc, force = false) {
      doc?.querySelectorAll?.(".map-place-back[data-weather-coordinates]").forEach(element => void hydrateBack(element, force));
    }

    function observeDocument(doc) {
      if (!doc?.body || observedDocuments.has(doc)) return;
      const ElementCtor = doc.defaultView?.Element || activeWindow.Element;
      const MutationObserverCtor = doc.defaultView?.MutationObserver || activeWindow.MutationObserver;
      if (!ElementCtor || !MutationObserverCtor) return;

      const observer = new MutationObserverCtor(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof ElementCtor)) continue;
            if (node.matches?.(".map-place-back[data-weather-coordinates]")) void hydrateBack(node);
            node.querySelectorAll?.(".map-place-back[data-weather-coordinates]").forEach(element => void hydrateBack(element));
          }
        }
      });
      observer.observe(doc.body, { childList: true, subtree: true });
      observedDocuments.set(doc, observer);
      hydrateDocument(doc);
    }

    return { getWeather, clearCache, observeDocument, hydrateDocument };
  }

  const runtime = activeWindow[RUNTIME_KEY] || (activeWindow[RUNTIME_KEY] = createRuntime());
  runtime.observeDocument(activeDocument);

  const container = ctx.container || this;
  const root = container?.querySelector?.('[data-role="place-root"]');
  if (!root) return;
  const frontmatter = ctx.frontmatter || {};
  const q = selector => root.querySelector(selector);
  const card = q('[data-role="weather-card"]');
  if (!card) return;

  function setText(role, value) {
    const element = q(`[data-role="${role}"]`);
    if (element) element.textContent = value;
  }

  function showState(message, tone = "") {
    const state = q('[data-role="weather-state"]');
    if (!state) return;
    state.hidden = !message;
    state.textContent = message || "";
    state.dataset.tone = tone;
  }

  function render(data) {
    setText("weather-temp", data?.temp == null ? "—" : String(data.temp));
    setText("weather-temp-unit", data?.tempUnit || "");
    setText("weather-condition", data?.condition || "Current weather");
    setText("weather-description", data?.description ? data.description.charAt(0).toUpperCase() + data.description.slice(1) : "Current conditions");
    setText("weather-humidity", data?.humidity == null ? "—" : `${Math.round(data.humidity)}%`);
    setText("weather-wind", data?.windSpeed == null ? "—" : `${data.windSpeed} ${data?.windUnit || "m/s"}`);
    setText("weather-clouds", data?.clouds == null ? "—" : `${Math.round(data.clouds)}%`);
    setText("weather-pressure", data?.pressure == null ? "—" : `${Math.round(data.pressure)} hPa`);
    setText("weather-updated", "Live · cached up to 15m");

    const icon = q('[data-role="weather-icon"]');
    const symbol = q('[data-role="weather-symbol"]');
    if (icon) {
      icon.hidden = !data?.icon;
      if (data?.icon) {
        icon.src = `https://openweathermap.org/img/wn/${encodeURIComponent(data.icon)}@2x.png`;
        icon.alt = data?.condition ? `${data.condition} weather icon` : "Weather icon";
      }
    }
    if (symbol) {
      symbol.hidden = Boolean(data?.icon);
      symbol.textContent = data?.symbol || "◌";
    }
    card.classList.remove("is-stale");
  }

  function renderEmpty(message) {
    setText("weather-temp", "—");
    setText("weather-temp-unit", "");
    setText("weather-condition", "Weather unavailable");
    setText("weather-description", message || "Current conditions are unavailable");
    setText("weather-humidity", "—");
    setText("weather-wind", "—");
    setText("weather-clouds", "—");
    setText("weather-pressure", "—");
    setText("weather-updated", "Not loaded");
    const icon = q('[data-role="weather-icon"]');
    const symbol = q('[data-role="weather-symbol"]');
    if (icon) icon.hidden = true;
    if (symbol) {
      symbol.hidden = false;
      symbol.textContent = "◌";
    }
  }

  async function refresh(force = false) {
    const coordinates = parseCoordinates(frontmatter.coordinates);
    if (!coordinates) {
      renderEmpty("Add coordinates to this Place note first.");
      showState("Weather needs latitude and longitude.");
      return;
    }

    const refreshButton = q('[data-action="weather-refresh"]');
    if (refreshButton) refreshButton.disabled = true;
    card.classList.add("is-loading");
    showState(force ? "Refreshing current weather…" : "Loading current weather…");
    try {
      const data = await runtime.getWeather(coordinates.lat, coordinates.lon, { force });
      render(data);
      showState("");
    } catch (error) {
      console.warn("[Places weather view]", error);
      const noKey = error?.code === "NO_API_KEY";
      renderEmpty(noKey ? "Weather API key is not configured in Vault Settings." : clean(error?.message));
      showState(noKey ? `Set openweathermap_key in ${SETTINGS_PATH}.` : `Could not load weather: ${clean(error?.message) || "Unknown error"}`, noKey ? "" : "error");
    } finally {
      card.classList.remove("is-loading");
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  q('[data-action="weather-refresh"]')?.addEventListener("click", () => void refresh(true));
  void refresh(false);
})();
