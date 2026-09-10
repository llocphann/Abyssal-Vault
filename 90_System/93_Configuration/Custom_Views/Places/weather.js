(() => {
  const ctx = tp;
  const container = ctx.container || this;
  const root = container.querySelector('[data-role="place-root"]');
  if (!root) return;

  const app = ctx.app;
  const frontmatter = ctx.frontmatter || {};
  const q = selector => root.querySelector(selector);
  const card = q('[data-role="weather-card"]');
  if (!card) return;

  const SETTINGS_PATH = "90_System/93_Configuration/settings.md";
  const text = value => value == null ? "" : String(value).trim();

  function parseCoordinates(value) {
    if (Array.isArray(value) && value.length >= 2) {
      const lat = Number(value[0]);
      const lon = Number(value[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
    }
    const raw = text(value);
    const match = raw.match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon };
  }

  function plugin() {
    return app?.plugins?.getPlugin?.("places-weather") ?? app?.plugins?.plugins?.["places-weather"] ?? null;
  }

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

    const weather = plugin();
    if (!weather?.getWeather) {
      renderEmpty("Places Weather plugin is not active.");
      showState("Reload Obsidian so the Places Weather runtime can start.", "error");
      return;
    }

    const refreshButton = q('[data-action="weather-refresh"]');
    if (refreshButton) refreshButton.disabled = true;
    card.classList.add("is-loading");
    showState(force ? "Refreshing current weather…" : "Loading current weather…");
    try {
      const data = await weather.getWeather(coordinates.lat, coordinates.lon, { force });
      render(data);
      showState("");
    } catch (error) {
      console.warn("[Places weather view]", error);
      const noKey = error?.code === "NO_API_KEY";
      renderEmpty(noKey ? "Weather API key is not configured in Vault Settings." : text(error?.message));
      showState(noKey ? `Set openweathermap_key in ${SETTINGS_PATH}.` : `Could not load weather: ${text(error?.message) || "Unknown error"}`, noKey ? "" : "error");
    } finally {
      card.classList.remove("is-loading");
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  q('[data-action="weather-refresh"]')?.addEventListener("click", () => void refresh(true));

  void refresh(false);
})();
