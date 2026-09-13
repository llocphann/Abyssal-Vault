const c = tp.container || this;
const root = c.querySelector('[data-role="settings-root"]');

if (root) {
  const app = tp.app;
  const file = tp.file;
  const doc = tp.activeDocument || root.ownerDocument;
  const win = tp.activeWindow || doc.defaultView;
  const fm = { ...(tp.frontmatter || {}) };
  const META = "_settings_custom_meta";
  const LAYOUT = "_settings_layout_v1";
  const hidden = new Set(["type", "cssclasses", "aliases", "tags", META, LAYOUT]);
  const q = selector => root.querySelector(selector);
  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
  const copyObject = value => isObject(value) ? { ...value } : {};
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const el = (tag, cls, text) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  const BASE_CATEGORIES = [
    { id: "general", label: "General", eyebrow: "Vault", description: "Identity and dates shared across the vault." },
    { id: "daily", label: "Homepage & Daily", eyebrow: "Daily context", description: "Schedule, exercise, cardio and weather settings used by daily surfaces." },
    { id: "services", label: "Services", eyebrow: "Integrations", description: "External metadata, recipe and recovery services." },
    { id: "games", label: "Games", eyebrow: "Game services", description: "Game metadata and platform integrations for RAWG, Steam and GOG." },
    { id: "finance", label: "Finance & Locale", eyebrow: "Finance", description: "Book defaults, currency formatting, budgets and calendar conventions." },
    { id: "advanced", label: "Advanced", eyebrow: "Technical", description: "Low-frequency technical values and custom vault-wide properties." },
  ];

  const BASE_SECTIONS = [
    { id: "identity", category: "general", label: "Vault identity", note: "Shared identity" },
    { id: "daily-context", category: "daily", label: "Daily context", note: "Sources & headings" },
    { id: "weather", category: "daily", label: "Weather", note: "OpenWeatherMap" },
    { id: "media", category: "services", label: "Media & recipes", note: "Metadata providers" },
    { id: "recovery", category: "services", label: "Recovery", note: "Vault service" },
    { id: "game-metadata", category: "games", label: "Game metadata", note: "RAWG" },
    { id: "steam", category: "games", label: "Steam", note: "Account integration" },
    { id: "gog", category: "games", label: "GOG & Heroic", note: "Local auth & locale" },
    { id: "finance-book", category: "finance", label: "Book defaults", note: "Storage & budgets" },
    { id: "finance-format", category: "finance", label: "Formatting & calendar", note: "Locale & fiscal rules" },
    { id: "technical", category: "advanced", label: "Technical settings", note: "Use with care" },
    { id: "globe", category: "advanced", label: "Homepage globe", note: "Render, zoom & data sources" },
    { id: "custom", category: "advanced", label: "Custom properties", note: "Vault-wide storage" },
  ];

  const options = pairs => pairs.map(([value, label]) => ({ value, label }));
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    .map((label, index) => ({ value: index + 1, label: `${label} · ${index + 1}` }));

  const S = {
    vault_name: { category: "general", section: "identity", label: "Vault name", control: "text", description: "Display name used by vault-wide views." },
    username: { category: "general", section: "identity", label: "Username", control: "text", description: "" },
    start_date: { category: "general", section: "identity", label: "Vault start date", control: "date", description: "Reference date used to calculate vault age." },

    callout_path: { category: "daily", section: "daily-context", label: "Daily schedule folder", control: "text", description: "Folder containing weekday schedule notes." },
    schedule_heading: { category: "daily", section: "daily-context", label: "Schedule heading", control: "text", description: "Heading parsed as the daily schedule table." },
    exercise_heading: { category: "daily", section: "daily-context", label: "Exercise heading", control: "text", description: "Heading parsed as the exercise table." },
    cardio_heading: { category: "daily", section: "daily-context", label: "Cardio heading", control: "text", description: "Heading parsed as the cardio table." },
    openweathermap_city: { category: "daily", section: "weather", label: "Location", control: "text", description: "City query sent to OpenWeatherMap." },
    openweathermap_unit: { category: "daily", section: "weather", label: "Units", control: "select", description: "Temperature unit system.", options: options([["metric", "Metric · °C"], ["imperial", "Imperial · °F"], ["standard", "Standard · K"]]) },
    openweathermap_key: { category: "daily", section: "weather", label: "API key", control: "secret", description: "Credential used to fetch current weather." },

    tmdb_key: { category: "services", section: "media", label: "TMDB API key", control: "secret", description: "Credential used by movie and TV metadata import." },
    spoonacular_key: { category: "services", section: "media", label: "Spoonacular API key", control: "secret", description: "Credential used by the recipe importer." },
    recipe_provider: { category: "services", section: "media", label: "Recipe provider", control: "select", description: "Preferred recipe source.", options: options([["auto", "Auto"], ["spoonacular", "Spoonacular"], ["themealdb", "TheMealDB"]]) },
    mega_recovery_key: { category: "services", section: "recovery", label: "MEGA recovery key", control: "secret", description: "Recovery value retained by the vault." },

    rawg_api_key: { category: "games", section: "game-metadata", label: "RAWG API key", control: "secret", description: "Fallback credential for game metadata import." },
    steam_api_key: { category: "games", section: "steam", label: "API key", control: "secret", description: "Credential used for Steam sync." },
    steam_id: { category: "games", section: "steam", label: "Steam ID", control: "text", description: "Account identifier paired with the Steam API key." },
    gog_heroic_auth_path: { category: "games", section: "gog", label: "Heroic auth path", control: "text", description: "Local path to Heroic’s GOG authentication file." },
    gog_locale: { category: "games", section: "gog", label: "Locale", control: "text", description: "Locale requested for GOG achievement data." },

    FinanceBook: { category: "finance", section: "finance-book", label: "Finance book", control: "text", description: "Default finance book used by reports and records." },
    BookCurrency: { category: "finance", section: "finance-book", label: "Book currency", control: "currency", description: "Three-letter ISO 4217 code such as VND, USD or EUR." },
    Budgets: { category: "finance", section: "finance-book", label: "Budgets", control: "json", description: "JSON object mapping budget categories to amounts." },
    DisplayLocale: { category: "finance", section: "finance-format", label: "Display locale", control: "text", description: "Locale used for finance formatting. “auto” follows the device." },
    CurrencyDisplay: { category: "finance", section: "finance-format", label: "Currency display", control: "select", description: "How currency identifiers appear.", options: options([["symbol", "Symbol"], ["narrowSymbol", "Narrow symbol"], ["code", "Code"], ["name", "Name"]]) },
    NegativeFormat: { category: "finance", section: "finance-format", label: "Negative format", control: "select", description: "Minus sign or accounting parentheses.", options: options([["standard", "Standard · -100"], ["accounting", "Accounting · (100)"]]) },
    WeekStartsOn: { category: "finance", section: "finance-format", label: "Week starts on", control: "select", description: "First day used for weekly ranges.", options: options([["monday", "Monday"], ["sunday", "Sunday"], ["saturday", "Saturday"]]) },
    FiscalYearStartMonth: { category: "finance", section: "finance-format", label: "Fiscal year starts", control: "select", description: "Beginning month of the fiscal year.", options: months },

    FinanceSchema: { category: "advanced", section: "technical", label: "Finance schema version", control: "number", description: "Technical schema version used by Finance." },

    globe_size: { category: "advanced", section: "globe", label: "Globe size", control: "size", description: "Viewport size as WIDTHxHEIGHT, 250–2000 px per side." },
    globe_style: { category: "advanced", section: "globe", label: "Globe style", control: "select", description: "Visual palette used by the Homepage globe.", options: options([["abyssal", "Abyssal"], ["monochrome", "Monochrome"], ["revert", "Revert"], ["colorful", "Colorful"]]) },
    globe_monochrome_color: { category: "advanced", section: "globe", label: "Monochrome color", control: "color", description: "Base color used by the Monochrome style." },
    location_pins: { category: "advanced", section: "globe", label: "Location pins", control: "select", description: "Marker geometry used for saved Places.", options: options([["line", "Line"], ["connected-dots", "Connected dots"], ["dots", "Dots"]]) },
    globe_source_folders: { category: "advanced", section: "globe", label: "Source folders", control: "json", description: "Folders scanned for location notes." },
    globe_display_min: { category: "advanced", section: "globe", label: "Display minimum", control: "number", description: "Minimum displayed globe size in pixels." },
    globe_display_max: { category: "advanced", section: "globe", label: "Display maximum", control: "number", description: "Maximum displayed globe size in pixels." },
    globe_render_min: { category: "advanced", section: "globe", label: "Render minimum", control: "number", description: "Minimum internal render size in pixels." },
    globe_render_max: { category: "advanced", section: "globe", label: "Render maximum", control: "number", description: "Maximum internal render size in pixels." },
    globe_min_zoom: { category: "advanced", section: "globe", label: "Minimum zoom", control: "number", description: "Lowest allowed globe zoom." },
    globe_max_zoom: { category: "advanced", section: "globe", label: "Maximum zoom", control: "number", description: "Highest allowed globe zoom." },
    globe_default_zoom: { category: "advanced", section: "globe", label: "Default zoom", control: "number", description: "Initial zoom when the globe loads." },
    globe_base_scale: { category: "advanced", section: "globe", label: "Base scale", control: "number", description: "Base globe scale before zoom is applied." },
    globe_texture_width: { category: "advanced", section: "globe", label: "Texture width", control: "number", description: "Generated globe texture width." },
    globe_texture_height: { category: "advanced", section: "globe", label: "Texture height", control: "number", description: "Generated globe texture height." },
  };

  const ICONS = {
    eye: ["M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"],
    copy: ["M8 8h12v12H8z", "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"],
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"],
    trash: ["M4 7h16", "M9 7V4h6v3", "M7 7l1 13h8l1-13", "M10 11v5", "M14 11v5"],
    grip: ["M8 6h.01", "M8 12h.01", "M8 18h.01", "M16 6h.01", "M16 12h.01", "M16 18h.01"],
  };

  const icon = name => {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    (ICONS[name] || []).forEach(pathData => {
      const path = doc.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", pathData);
      svg.appendChild(path);
    });
    return svg;
  };

  const iconButton = (name, label) => {
    const button = el("button", "cv-settings-icon-button");
    button.type = "button";
    if (!String(label).startsWith("Edit heading ")) button.title = label;
    button.setAttribute("aria-label", label);
    button.append(icon(name));
    return button;
  };

  const blankLayout = () => ({
    version: 1,
    tabs: {},
    tabOrder: [],
    headings: {},
    headingTabs: {},
    headingOrder: {},
    settingPlacement: {},
    settingOrder: {},
  });

  const normalizeStringArray = value => Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];
  const normalizeLayout = value => {
    const source = isObject(value) ? value : {};
    const next = blankLayout();
    next.tabs = copyObject(source.tabs);
    next.tabOrder = normalizeStringArray(source.tabOrder);
    next.headings = copyObject(source.headings);
    next.headingTabs = copyObject(source.headingTabs);
    next.headingOrder = Object.fromEntries(Object.entries(copyObject(source.headingOrder)).map(([key, list]) => [key, normalizeStringArray(list)]));
    next.settingPlacement = copyObject(source.settingPlacement);
    next.settingOrder = Object.fromEntries(Object.entries(copyObject(source.settingOrder)).map(([key, list]) => [key, normalizeStringArray(list)]));
    return next;
  };

  const layoutState = () => normalizeLayout(fm[LAYOUT]);
  const baseCategoryIds = new Set(BASE_CATEGORIES.map(item => item.id));
  const baseSectionIds = new Set(BASE_SECTIONS.map(item => item.id));

  const categories = (layout = layoutState()) => {
    const base = BASE_CATEGORIES
      .filter(item => !copyObject(layout.tabs[item.id]).hidden)
      .map(item => {
        const override = copyObject(layout.tabs[item.id]);
        return {
          ...item,
          ...override,
          id: item.id,
          custom: false,
          system: true,
        };
      });
    const customIds = [...layout.tabOrder, ...Object.keys(layout.tabs)]
      .filter((id, index, all) => id && all.indexOf(id) === index && !baseCategoryIds.has(id));
    const custom = customIds
      .map(id => ({ id, ...copyObject(layout.tabs[id]) }))
      .filter(data => !data.hidden)
      .map(data => ({
        id: data.id,
        label: String(data.label || data.id),
        eyebrow: String(data.eyebrow || "Custom"),
        description: String(data.description || ""),
        custom: true,
        system: false,
      }));
    const all = [...base, ...custom];
    const visibleIds = new Set(all.map(item => item.id));
    const requested = normalizeStringArray(layout.tabOrder).filter(id => visibleIds.has(id));
    const hasFullOrder = requested.some(id => baseCategoryIds.has(id));
    const defaultOrder = [
      ...base.map(item => item.id),
      ...requested.filter(id => !baseCategoryIds.has(id)),
      ...custom.map(item => item.id).filter(id => !requested.includes(id)),
    ];
    const order = hasFullOrder
      ? [...requested, ...all.map(item => item.id).filter(id => !requested.includes(id))]
      : defaultOrder;
    const byId = new Map(all.map(item => [item.id, item]));
    return order.map(id => byId.get(id)).filter(Boolean);
  };

  const sections = (layout = layoutState()) => {
    const tabs = categories(layout);
    const validTabs = new Set(tabs.map(item => item.id));
    const fallbackCategory = tabs[0]?.id || "advanced";
    const base = BASE_SECTIONS
      .filter(item => !copyObject(layout.headings[item.id]).hidden)
      .map(item => {
        const override = copyObject(layout.headings[item.id]);
        return {
          ...item,
          ...override,
          id: item.id,
          category: validTabs.has(layout.headingTabs[item.id])
            ? layout.headingTabs[item.id]
            : (validTabs.has(item.category) ? item.category : fallbackCategory),
          custom: false,
          system: true,
        };
      });
    const customIds = Object.keys(layout.headings).filter(id => !baseSectionIds.has(id));
    const custom = customIds
      .map(id => ({ id, ...copyObject(layout.headings[id]) }))
      .filter(data => !data.hidden)
      .map(data => {
        const category = validTabs.has(layout.headingTabs[data.id]) ? layout.headingTabs[data.id] : fallbackCategory;
        return {
          id: data.id,
          category,
          label: String(data.label || data.id),
          note: String(data.note || ""),
          custom: true,
          system: false,
        };
      });
    return [...base, ...custom];
  };

  const sectionFor = (id, layout = layoutState()) => sections(layout).find(item => item.id === id) || null;
  const orderedSections = (categoryId, layout = layoutState()) => {
    const all = sections(layout).filter(item => item.category === categoryId);
    const order = normalizeStringArray(layout.headingOrder[categoryId]);
    const rank = new Map(order.map((id, index) => [id, index]));
    return all.sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      const ad = BASE_SECTIONS.findIndex(item => item.id === a.id);
      const bd = BASE_SECTIONS.findIndex(item => item.id === b.id);
      return ai - bi || (ad < 0 ? Number.MAX_SAFE_INTEGER : ad) - (bd < 0 ? Number.MAX_SAFE_INTEGER : bd) || a.label.localeCompare(b.label);
    });
  };

  const stateStore = win ? (win.__cvVaultSettingsState ||= {}) : {};
  const stateKey = file?.path || "vault-settings";
  const previousState = stateStore[stateKey];
  let active = typeof previousState === "string" ? previousState : previousState?.active || "general";
  let showKeys = typeof previousState === "object" ? !!previousState.showKeys : false;
  let searchTerm = "";
  let queue = Promise.resolve();
  let layoutRevision = 0;
  let dragState = null;
  let dragSource = null;

  const persistState = () => { stateStore[stateKey] = { active, showKeys }; };

  const humanize = key => String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\b(api|id|url|gog|tmdb|rawg)\b/gi, match => match.toUpperCase())
    .replace(/^./, match => match.toUpperCase());

  const slugify = value => String(value || "item").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
  const uniqueId = (prefix, label, used) => {
    const base = `${prefix}-${slugify(label)}`;
    if (!used.has(base)) return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  };

  const isSecretKey = key => {
    const normalized = String(key).toLowerCase();
    if (/(?:_path|_file|_folder)$/.test(normalized)) return false;
    return /(?:api[_-]?key|token|secret|password|credential|recovery[_-]?key|client[_-]?secret|(?:^|[_-])key(?:$|[_-]))/i.test(key);
  };

  const inferredType = value => {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (Array.isArray(value) || isObject(value)) return "json";
    return "text";
  };

  const customDefs = () => copyObject(fm[META]);

  const baseMetaFor = (key, value) => {
    if (S[key]) return { key, ...S[key], secret: S[key].control === "secret", custom: false };
    const custom = copyObject(customDefs()[key]);
    const type = ["text", "number", "boolean", "json", "secret"].includes(custom.type)
      ? custom.type
      : (isSecretKey(key) ? "secret" : inferredType(value));
    return {
      key,
      category: "advanced",
      section: "custom",
      label: custom.label || humanize(key),
      control: type,
      description: custom.description || "Custom vault-wide property.",
      secret: type === "secret" || !!custom.secret || isSecretKey(key),
      custom: true,
    };
  };

  const metaFor = (key, value) => {
    const base = baseMetaFor(key, value);
    const layout = layoutState();
    const tabs = categories(layout);
    const validTabs = new Set(tabs.map(item => item.id));
    const fallbackTab = tabs[0]?.id || "advanced";
    const placement = copyObject(layout.settingPlacement[key]);
    const placedSection = placement.heading ? sectionFor(String(placement.heading), layout) : null;
    if (placedSection) return { ...base, category: placedSection.category, section: placedSection.id };
    if (placement.heading == null && placement.tab && validTabs.has(String(placement.tab))) {
      return { ...base, category: String(placement.tab), section: null };
    }
    const defaultSection = base.section ? sectionFor(base.section, layout) : null;
    if (defaultSection) return { ...base, category: defaultSection.category, section: defaultSection.id };
    return { ...base, category: validTabs.has(base.category) ? base.category : fallbackTab, section: null };
  };

  const setStatus = (text, mode = "saved") => {
    const node = q('[data-role="settings-save-state"]');
    const wrap = node?.closest(".cv-settings-save-state");
    if (!node || !wrap) return;
    node.textContent = text;
    wrap.classList.toggle("is-saving", mode === "saving");
    wrap.classList.toggle("is-error", mode === "error");
  };

  const mutate = async (mutator, sync) => {
    if (!app?.fileManager || !file) throw Error("Settings file is unavailable.");
    const job = queue.then(async () => {
      await app.fileManager.processFrontMatter(file, mutator);
      sync?.();
    });
    queue = job.catch(() => {});
    return job;
  };

  const saveSetting = (key, value) => mutate(
    draft => { draft[key] = value; },
    () => { fm[key] = value; },
  );

  const saveLayout = next => {
    const normalized = normalizeLayout(next);
    const previous = normalizeLayout(fm[LAYOUT]);
    const revision = ++layoutRevision;
    fm[LAYOUT] = clone(normalized);
    return mutate(draft => { draft[LAYOUT] = clone(normalized); }).catch(error => {
      if (layoutRevision === revision) fm[LAYOUT] = clone(previous);
      throw error;
    });
  };

  const copyToClipboard = async value => {
    const text = String(value ?? "");
    if (!text) throw Error("Nothing to copy.");
    if (win?.navigator?.clipboard?.writeText) return win.navigator.clipboard.writeText(text);
    const textarea = el("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    doc.body.append(textarea);
    textarea.select();
    const ok = doc.execCommand?.("copy");
    textarea.remove();
    if (!ok) throw Error("Clipboard is unavailable.");
  };

  const displayValue = (value, meta) => {
    if (value === "" || value == null) return "Not set";
    if (meta.control === "select") return meta.options?.find(option => String(option.value) === String(value))?.label || String(value);
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch { return "{}"; }
    }
    return String(value);
  };

  const maskedValue = value => value == null || value === "" ? "Not set" : "•".repeat(Math.min(18, Math.max(10, String(value).length)));
  const rawValue = value => typeof value === "object" && value != null ? JSON.stringify(value, null, 2) : String(value ?? "");

  const parseValue = (text, current, meta) => {
    if (meta.control === "number") {
      const number = Number(text);
      if (!Number.isFinite(number)) throw Error("Enter a valid number.");
      return number;
    }
    if (meta.control === "currency") {
      const value = String(text).trim().toUpperCase();
      if (value && !/^[A-Z]{3}$/.test(value)) throw Error("Use a three-letter currency code such as VND, USD or EUR.");
      return value;
    }
    if (meta.control === "size") {
      const match = String(text).trim().match(/^(\d{2,4})\s*[x×]\s*(\d{2,4})$/i);
      if (!match) throw Error("Use WIDTHxHEIGHT, for example 500x250.");
      const width = Number(match[1]);
      const height = Number(match[2]);
      if (width < 250 || width > 2000 || height < 250 || height > 2000) throw Error("Each globe dimension must be between 250 and 2000 px.");
      return `${width}x${height}`;
    }
    if (meta.control === "color") {
      const value = String(text).trim().toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(value)) throw Error("Use a six-digit hex color such as #a0cddf.");
      return value;
    }
    if (meta.control === "json") {
      try { return JSON.parse(text || "{}"); }
      catch { throw Error("Enter valid JSON. Your edit has been kept so you can fix it."); }
    }
    if (meta.control === "select") {
      const option = meta.options?.find(item => String(item.value) === String(text));
      if (option) return option.value;
      if (String(current) === String(text)) return current;
      throw Error("Choose one of the available values.");
    }
    return text;
  };

  function labelFor(meta) {
    const label = el("div", "cv-settings-label");
    const line = el("div", "cv-settings-label-main");
    line.append(el("strong", null, meta.label));
    label.append(line);
    if (meta.description) label.append(el("p", "cv-settings-description", meta.description));
    label.append(el("span", "cv-settings-key", meta.key));
    return label;
  }

  function booleanControl(meta, value) {
    const box = el("div", "cv-settings-control");
    const wrap = el("div", "cv-settings-switch-wrap");
    const button = el("button", "cv-settings-switch");
    const state = el("span", "cv-settings-switch-state");
    button.type = "button";
    button.setAttribute("role", "switch");
    let current = !!value;
    const paint = () => {
      button.setAttribute("aria-checked", String(current));
      state.textContent = current ? "On" : "Off";
    };
    paint();
    button.onclick = async () => {
      const old = current;
      current = !current;
      paint();
      button.disabled = true;
      setStatus(`Saving ${meta.label}…`, "saving");
      try {
        await saveSetting(meta.key, current);
        setStatus("Saved");
      } catch {
        current = old;
        paint();
        setStatus(`${meta.label} was not saved`, "error");
      } finally {
        button.disabled = false;
      }
    };
    wrap.append(button, state);
    box.append(wrap);
    return box;
  }

  function editableControl(meta, value) {
    const box = el("div", "cv-settings-control");
    const button = el("button", `cv-settings-value${meta.secret ? " is-secret" : ""}`);
    button.type = "button";
    let current = value;
    let reveal = false;
    let editor = null;
    let secretState = null;
    let eye = null;
    let copy = null;

    const paint = () => {
      const text = meta.secret && !reveal ? maskedValue(current) : displayValue(current, meta);
      button.textContent = text;
      button.classList.toggle("is-empty", text === "Not set");
      if (secretState) {
        const configured = current != null && String(current) !== "";
        secretState.textContent = configured ? "Configured" : "Not configured";
        secretState.classList.toggle("is-configured", configured);
      }
      if (copy) copy.disabled = !String(current ?? "");
    };

    const closeEditor = () => {
      if (!editor) return;
      editor.remove();
      editor = null;
      button.hidden = false;
      paint();
    };

    const commit = async () => {
      if (!editor || editor.disabled) return;
      let next;
      try {
        next = parseValue(editor.value, current, meta);
      } catch (error) {
        editor.classList.add("is-invalid");
        setStatus(error.message, "error");
        editor.focus();
        return;
      }
      editor.disabled = true;
      setStatus(`Saving ${meta.label}…`, "saving");
      try {
        await saveSetting(meta.key, next);
        current = next;
        closeEditor();
        setStatus("Saved");
      } catch {
        editor.disabled = false;
        setStatus(`${meta.label} was not saved`, "error");
      }
    };

    button.onclick = () => {
      if (editor) return;
      button.hidden = true;
      if (meta.control === "json") editor = el("textarea", "cv-settings-editor");
      else if (meta.control === "select") {
        editor = el("select", "cv-settings-editor");
        const known = (meta.options || []).some(option => String(option.value) === String(current));
        if (!known && current != null && current !== "") {
          const preserved = el("option", null, `${current} · current`);
          preserved.value = String(current);
          editor.append(preserved);
        }
        (meta.options || []).forEach(option => {
          const node = el("option", null, option.label);
          node.value = String(option.value);
          editor.append(node);
        });
      } else {
        editor = el("input", "cv-settings-editor");
        editor.type = meta.control === "number" ? "number" : meta.control === "date" ? "date" : meta.control === "color" ? "color" : meta.secret && !reveal ? "password" : "text";
      }
      editor.value = rawValue(current);
      box.insertBefore(editor, button);
      editor.focus();
      editor.select?.();
      editor.onkeydown = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeEditor();
          setStatus("Saved");
        } else if (event.key === "Enter" && editor.tagName !== "TEXTAREA") {
          event.preventDefault();
          commit();
        } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          commit();
        }
      };
      if (editor.tagName === "SELECT") editor.onchange = commit;
      editor.onblur = event => { if (!box.contains(event.relatedTarget)) commit(); };
    };

    if (meta.secret) {
      secretState = el("span", "cv-settings-secret-state");
      eye = iconButton("eye", `Show or hide ${meta.label}`);
      copy = iconButton("copy", `Copy ${meta.label}`);
      eye.onclick = event => {
        event.stopPropagation();
        reveal = !reveal;
        eye.dataset.active = String(reveal);
        if (editor?.tagName === "INPUT") editor.type = reveal ? "text" : "password";
        paint();
      };
      copy.onclick = async event => {
        event.stopPropagation();
        try {
          await copyToClipboard(current);
          setStatus(`${meta.label} copied`);
        } catch {
          setStatus(`${meta.label} could not be copied`, "error");
        }
      };
      box.append(secretState);
    }
    box.append(button);
    if (meta.secret) box.append(eye, copy);
    paint();
    return box;
  }

  const validCustomKey = (key, oldKey = null) => {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) return "Use letters, numbers, _, . or -. The key cannot start with a number.";
    if (hidden.has(key) || S[key]) return "This key is reserved by the Settings schema.";
    if (key !== oldKey && Object.prototype.hasOwnProperty.call(fm, key)) return "A setting with this key already exists.";
    return "";
  };

  const parseCustomValue = (text, type, booleanValue) => {
    if (type === "boolean") return !!booleanValue;
    if (type === "number") {
      const number = Number(text);
      if (!Number.isFinite(number)) throw Error("Enter a valid number.");
      return number;
    }
    if (type === "json") {
      try { return JSON.parse(text || "{}"); }
      catch { throw Error("Enter valid JSON before saving."); }
    }
    return String(text ?? "");
  };

  const renameLayoutKey = (layout, oldKey, newKey) => {
    if (!oldKey || oldKey === newKey) return layout;
    if (layout.settingPlacement[oldKey] != null) {
      layout.settingPlacement[newKey] = layout.settingPlacement[oldKey];
      delete layout.settingPlacement[oldKey];
    }
    Object.keys(layout.settingOrder).forEach(container => {
      layout.settingOrder[container] = layout.settingOrder[container].map(key => key === oldKey ? newKey : key);
    });
    return layout;
  };

  const removeLayoutKey = (layout, key) => {
    delete layout.settingPlacement[key];
    Object.keys(layout.settingOrder).forEach(container => {
      layout.settingOrder[container] = layout.settingOrder[container].filter(item => item !== key);
    });
    return layout;
  };

  const writeCustom = (oldKey, definition, value, targetTab = null) => mutate(
    draft => {
      if (definition.key !== oldKey && Object.prototype.hasOwnProperty.call(draft, definition.key)) throw Error("A setting with this key already exists.");
      const metadata = copyObject(draft[META]);
      const layout = normalizeLayout(draft[LAYOUT]);
      if (oldKey && oldKey !== definition.key) {
        delete draft[oldKey];
        delete metadata[oldKey];
        renameLayoutKey(layout, oldKey, definition.key);
      }
      draft[definition.key] = value;
      metadata[definition.key] = {
        type: definition.type,
        ...(definition.label ? { label: definition.label } : {}),
        ...(definition.description ? { description: definition.description } : {}),
      };
      if (!oldKey && targetTab && categories(layout).some(item => item.id === targetTab)) {
        layout.settingPlacement[definition.key] = { tab: targetTab, heading: null };
      }
      draft[META] = metadata;
      draft[LAYOUT] = layout;
    },
    () => {
      const metadata = customDefs();
      const layout = layoutState();
      if (oldKey && oldKey !== definition.key) {
        delete fm[oldKey];
        delete metadata[oldKey];
        renameLayoutKey(layout, oldKey, definition.key);
      }
      fm[definition.key] = value;
      metadata[definition.key] = {
        type: definition.type,
        ...(definition.label ? { label: definition.label } : {}),
        ...(definition.description ? { description: definition.description } : {}),
      };
      if (!oldKey && targetTab && categories(layout).some(item => item.id === targetTab)) {
        layout.settingPlacement[definition.key] = { tab: targetTab, heading: null };
      }
      fm[META] = metadata;
      fm[LAYOUT] = layout;
    },
  );

  const removeCustom = key => mutate(
    draft => {
      delete draft[key];
      const metadata = copyObject(draft[META]);
      const layout = removeLayoutKey(normalizeLayout(draft[LAYOUT]), key);
      delete metadata[key];
      if (Object.keys(metadata).length) draft[META] = metadata;
      else delete draft[META];
      draft[LAYOUT] = layout;
    },
    () => {
      delete fm[key];
      const metadata = customDefs();
      const layout = removeLayoutKey(layoutState(), key);
      delete metadata[key];
      if (Object.keys(metadata).length) fm[META] = metadata;
      else delete fm[META];
      fm[LAYOUT] = layout;
    },
  );

  function customForm(entry = null, targetTab = null) {
    const oldKey = entry?.key || null;
    const oldValue = entry?.value;
    const existing = oldKey ? copyObject(customDefs()[oldKey]) : {};
    const initialType = existing.type || entry?.meta?.control || inferredType(oldValue);
    const form = el("form", "cv-settings-custom-form");
    const head = el("div", "cv-settings-custom-form-head");
    const headCopy = el("div");
    headCopy.append(el("span", null, oldKey ? "Edit custom setting" : "New custom setting"), el("strong", null, oldKey ? humanize(oldKey) : "Add vault-wide storage"));
    head.append(headCopy);
    const grid = el("div", "cv-settings-custom-grid");
    const field = (name, node) => {
      const label = el("label", "cv-settings-custom-field");
      label.append(el("span", null, name), node);
      return label;
    };
    const keyInput = el("input", "cv-settings-custom-input");
    const labelInput = el("input", "cv-settings-custom-input");
    const descriptionInput = el("input", "cv-settings-custom-input");
    const typeInput = el("select", "cv-settings-custom-input");
    keyInput.value = oldKey || "";
    keyInput.placeholder = "example_key";
    labelInput.value = existing.label || "";
    labelInput.placeholder = "Optional display name";
    descriptionInput.value = existing.description || "";
    descriptionInput.placeholder = "Optional explanation";
    [["text", "Text"], ["number", "Number"], ["boolean", "Boolean"], ["secret", "Protected / secret"], ["json", "JSON object or array"]].forEach(([value, label]) => {
      const option = el("option", null, label);
      option.value = value;
      typeInput.append(option);
    });
    typeInput.value = ["text", "number", "boolean", "secret", "json"].includes(initialType) ? initialType : "text";
    grid.append(field("Property key", keyInput), field("Display name", labelInput), field("Description", descriptionInput), field("Data type", typeInput));

    const valueField = el("div", "cv-settings-custom-value-field");
    let valueControl = null;
    let booleanValue = typeof oldValue === "boolean" ? oldValue : false;
    const renderValue = () => {
      valueField.replaceChildren();
      if (typeInput.value === "boolean") {
        const wrap = el("div", "cv-settings-switch-wrap");
        const button = el("button", "cv-settings-switch");
        const state = el("span", "cv-settings-switch-state");
        button.type = "button";
        button.setAttribute("role", "switch");
        const paint = () => {
          button.setAttribute("aria-checked", String(booleanValue));
          state.textContent = booleanValue ? "On" : "Off";
        };
        paint();
        button.onclick = () => { booleanValue = !booleanValue; paint(); };
        wrap.append(button, state);
        valueControl = button;
        const valueLabel = field("Value", wrap);
        valueLabel.classList.add("is-wide");
        valueField.append(valueLabel);
        return;
      }
      valueControl = typeInput.value === "json" ? el("textarea", "cv-settings-custom-input") : el("input", "cv-settings-custom-input");
      if (valueControl.tagName === "INPUT") valueControl.type = typeInput.value === "number" ? "number" : typeInput.value === "secret" ? "password" : "text";
      valueControl.value = oldKey ? rawValue(oldValue) : (typeInput.value === "json" ? "{}" : "");
      const valueLabel = field("Value", valueControl);
      valueLabel.classList.add("is-wide");
      if (typeInput.value === "secret") {
        const shell = el("div", "cv-settings-custom-secret-shell");
        const actions = el("div", "cv-settings-custom-secret-actions");
        const eye = iconButton("eye", "Show or hide protected value");
        const copy = iconButton("copy", "Copy protected value");
        let reveal = false;
        eye.onclick = () => {
          reveal = !reveal;
          valueControl.type = reveal ? "text" : "password";
          eye.dataset.active = String(reveal);
        };
        copy.onclick = async () => {
          try { await copyToClipboard(valueControl.value); setStatus("Protected value copied"); }
          catch { setStatus("Protected value could not be copied", "error"); }
        };
        actions.append(eye, copy);
        shell.append(valueControl, actions);
        valueLabel.replaceChildren(valueLabel.firstChild, shell);
      }
      valueField.append(valueLabel);
    };
    renderValue();
    typeInput.onchange = renderValue;

    const error = el("p", "cv-settings-custom-error");
    const actions = el("div", "cv-settings-custom-actions");
    const cancel = el("button", "cv-settings-secondary-button", "Cancel");
    const saveButton = el("button", "cv-settings-primary-button", oldKey ? "Save changes" : "Add setting");
    cancel.type = "button";
    saveButton.type = "submit";
    cancel.onclick = () => { render(); setStatus("Saved"); };
    actions.append(cancel, saveButton);
    if (oldKey) {
      const remove = el("button", "cv-settings-danger-button");
      remove.type = "button";
      remove.append(icon("trash"), doc.createTextNode("Delete"));
      remove.onclick = async () => {
        if (!win?.confirm?.(`Delete custom setting “${oldKey}”?`)) return;
        setStatus(`Deleting ${oldKey}…`, "saving");
        try { await removeCustom(oldKey); setStatus("Saved"); render(); }
        catch { setStatus(`Could not delete ${oldKey}`, "error"); }
      };
      actions.prepend(remove);
    }

    form.append(head, grid, valueField, error, actions);
    form.onsubmit = async event => {
      event.preventDefault();
      const key = keyInput.value.trim();
      const keyError = validCustomKey(key, oldKey);
      if (keyError) { error.textContent = keyError; keyInput.focus(); return; }
      let value;
      try { value = parseCustomValue(valueControl?.value || "", typeInput.value, booleanValue); }
      catch (parseError) { error.textContent = parseError.message; valueControl?.focus?.(); return; }
      saveButton.disabled = true;
      cancel.disabled = true;
      setStatus(`Saving ${key}…`, "saving");
      try {
        await writeCustom(oldKey, {
          key,
          label: labelInput.value.trim(),
          description: descriptionInput.value.trim(),
          type: typeInput.value,
        }, value, oldKey ? null : targetTab);
        active = oldKey ? (entry?.meta?.category || active) : (targetTab || sectionFor("custom")?.category || "advanced");
        persistState();
        setStatus("Saved");
        render();
      } catch (saveError) {
        saveButton.disabled = false;
        cancel.disabled = false;
        error.textContent = saveError.message || "Could not save this setting.";
        setStatus(`${key} was not saved`, "error");
      }
    };
    return form;
  }

  const schemaOrder = new Map(Object.keys(S).map((key, index) => [key, index]));
  const entries = () => Object.entries(fm)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => ({ key, value, meta: metaFor(key, value) }))
    .sort((a, b) => {
      const ai = schemaOrder.has(a.key) ? schemaOrder.get(a.key) : Number.MAX_SAFE_INTEGER;
      const bi = schemaOrder.has(b.key) ? schemaOrder.get(b.key) : Number.MAX_SAFE_INTEGER;
      return ai - bi || a.meta.label.localeCompare(b.meta.label);
    });

  const containerKey = (categoryId, sectionId) => sectionId ? `heading:${sectionId}` : `tab:${categoryId}:root`;
  const containerEntries = (allEntries, categoryId, sectionId, layout = layoutState()) => {
    const sourceRank = new Map(allEntries.map((entry, index) => [entry.key, index]));
    const filtered = allEntries.filter(entry => entry.meta.category === categoryId && (entry.meta.section || null) === (sectionId || null));
    const order = normalizeStringArray(layout.settingOrder[containerKey(categoryId, sectionId)]);
    const rank = new Map(order.map((key, index) => [key, index]));
    return filtered.sort((a, b) => {
      const ai = rank.has(a.key) ? rank.get(a.key) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(b.key) ? rank.get(b.key) : Number.MAX_SAFE_INTEGER;
      return ai - bi || (sourceRank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (sourceRank.get(b.key) ?? Number.MAX_SAFE_INTEGER);
    });
  };

  const removeFromSettingOrders = (layout, key) => {
    Object.keys(layout.settingOrder).forEach(container => {
      layout.settingOrder[container] = layout.settingOrder[container].filter(item => item !== key);
    });
  };

  const moveSetting = async (key, targetCategory, targetSection = null, targetIndex = Number.MAX_SAFE_INTEGER) => {
    const layout = layoutState();
    const tab = categories(layout).find(item => item.id === targetCategory);
    if (!tab) throw Error("Target tab no longer exists.");
    let categoryId = targetCategory;
    let sectionId = targetSection;
    if (sectionId) {
      const section = sectionFor(sectionId, layout);
      if (!section) throw Error("Target heading no longer exists.");
      categoryId = section.category;
    }
    const allEntries = entries();
    const targetKeys = containerEntries(allEntries, categoryId, sectionId, layout).map(entry => entry.key).filter(item => item !== key);
    const index = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : targetKeys.length, targetKeys.length));
    targetKeys.splice(index, 0, key);
    removeFromSettingOrders(layout, key);
    layout.settingPlacement[key] = sectionId ? { heading: sectionId } : { tab: categoryId, heading: null };
    layout.settingOrder[containerKey(categoryId, sectionId)] = targetKeys;
    await saveLayout(layout);
  };

  const moveSettingNear = (sourceKey, targetEntry, before) => {
    const layout = layoutState();
    const target = containerEntries(entries(), targetEntry.meta.category, targetEntry.meta.section, layout).map(entry => entry.key).filter(key => key !== sourceKey);
    let index = target.indexOf(targetEntry.key);
    if (index < 0) index = target.length;
    if (!before) index += 1;
    return moveSetting(sourceKey, targetEntry.meta.category, targetEntry.meta.section, index);
  };

  const removeFromHeadingOrders = (layout, headingId) => {
    Object.keys(layout.headingOrder).forEach(tabId => {
      layout.headingOrder[tabId] = layout.headingOrder[tabId].filter(id => id !== headingId);
    });
  };

  const moveHeading = async (headingId, targetTab, targetIndex = Number.MAX_SAFE_INTEGER) => {
    const layout = layoutState();
    if (!categories(layout).some(item => item.id === targetTab)) throw Error("Target tab no longer exists.");
    if (!sectionFor(headingId, layout)) throw Error("Heading no longer exists.");
    const targetIds = orderedSections(targetTab, layout).map(item => item.id).filter(id => id !== headingId);
    const index = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : targetIds.length, targetIds.length));
    targetIds.splice(index, 0, headingId);
    removeFromHeadingOrders(layout, headingId);
    layout.headingTabs[headingId] = targetTab;
    layout.headingOrder[targetTab] = targetIds;
    await saveLayout(layout);
  };

  const moveHeadingNear = (sourceId, targetSection, before) => {
    const layout = layoutState();
    const targetIds = orderedSections(targetSection.category, layout).map(item => item.id).filter(id => id !== sourceId);
    let index = targetIds.indexOf(targetSection.id);
    if (index < 0) index = targetIds.length;
    if (!before) index += 1;
    return moveHeading(sourceId, targetSection.category, index);
  };

  const moveTabNear = async (sourceId, targetId, before) => {
    const layout = layoutState();
    const ids = categories(layout).map(item => item.id).filter(id => id !== sourceId);
    let index = ids.indexOf(targetId);
    if (index < 0) index = ids.length;
    if (!before) index += 1;
    ids.splice(Math.max(0, Math.min(index, ids.length)), 0, sourceId);
    layout.tabOrder = ids;
    await saveLayout(layout);
  };

  const updateHeading = async (headingId, label, note) => {
    const layout = layoutState();
    const section = sectionFor(headingId, layout);
    if (!section) throw Error("Heading no longer exists.");
    layout.headings[headingId] = {
      ...copyObject(layout.headings[headingId]),
      label,
      note,
      hidden: false,
    };
    await saveLayout(layout);
  };

  const deleteHeading = async headingId => {
    const layout = layoutState();
    const section = sectionFor(headingId, layout);
    if (!section) throw Error("Heading no longer exists.");
    const categoryId = section.category;
    const allEntries = entries();
    const headingKeys = containerEntries(allEntries, categoryId, headingId, layout).map(entry => entry.key);
    const rootKeys = containerEntries(allEntries, categoryId, null, layout).map(entry => entry.key).filter(key => !headingKeys.includes(key));

    headingKeys.forEach(key => {
      removeFromSettingOrders(layout, key);
      layout.settingPlacement[key] = { tab: categoryId, heading: null };
    });
    layout.settingOrder[containerKey(categoryId, null)] = [...rootKeys, ...headingKeys];
    delete layout.settingOrder[containerKey(categoryId, headingId)];
    if (baseSectionIds.has(headingId)) {
      layout.headings[headingId] = { ...copyObject(layout.headings[headingId]), hidden: true };
    } else {
      delete layout.headings[headingId];
    }
    delete layout.headingTabs[headingId];
    removeFromHeadingOrders(layout, headingId);
    await saveLayout(layout);
  };

  const updateTab = async (tabId, label, description) => {
    const layout = layoutState();
    const tab = categories(layout).find(item => item.id === tabId);
    if (!tab) throw Error("Tab no longer exists.");
    layout.tabs[tabId] = {
      ...copyObject(layout.tabs[tabId]),
      label,
      description,
      hidden: false,
    };
    await saveLayout(layout);
  };

  const deleteTab = async tabId => {
    const layout = layoutState();
    const visibleTabs = categories(layout);
    const tab = visibleTabs.find(item => item.id === tabId);
    if (!tab) throw Error("Tab no longer exists.");
    const remainingTabs = visibleTabs.filter(item => item.id !== tabId);
    if (!remainingTabs.length) throw Error("At least one settings tab must remain.");
    const fallback = remainingTabs.find(item => item.id === "advanced") || remainingTabs[0];
    const fallbackTab = fallback.id;
    const allEntries = entries();
    const movedRootKeys = containerEntries(allEntries, tabId, null, layout).map(entry => entry.key);
    const fallbackRootKeys = containerEntries(allEntries, fallbackTab, null, layout)
      .map(entry => entry.key)
      .filter(key => !movedRootKeys.includes(key));

    movedRootKeys.forEach(key => {
      removeFromSettingOrders(layout, key);
      layout.settingPlacement[key] = { tab: fallbackTab, heading: null };
    });
    layout.settingOrder[containerKey(fallbackTab, null)] = [...fallbackRootKeys, ...movedRootKeys];
    delete layout.settingOrder[containerKey(tabId, null)];

    const movedHeadingIds = orderedSections(tabId, layout).map(section => section.id);
    const fallbackHeadingIds = orderedSections(fallbackTab, layout)
      .map(section => section.id)
      .filter(id => !movedHeadingIds.includes(id));
    movedHeadingIds.forEach(id => { layout.headingTabs[id] = fallbackTab; });
    layout.headingOrder[fallbackTab] = [...fallbackHeadingIds, ...movedHeadingIds];
    delete layout.headingOrder[tabId];

    if (baseCategoryIds.has(tabId)) {
      layout.tabs[tabId] = { ...copyObject(layout.tabs[tabId]), hidden: true };
    } else {
      delete layout.tabs[tabId];
    }
    layout.tabOrder = remainingTabs.map(item => item.id);
    await saveLayout(layout);
    return fallbackTab;
  };

  const clearDropHints = () => root.querySelectorAll(".is-drop-before,.is-drop-after,.is-drop-inside,.is-drop-tab").forEach(node => node.classList.remove("is-drop-before", "is-drop-after", "is-drop-inside", "is-drop-tab"));
  const finishDrag = () => {
    clearDropHints();
    dragSource?.classList.remove("is-drag-source");
    dragSource = null;
    dragState = null;
    root.classList.remove("is-layout-dragging");
  };

  const beginDrag = (event, payload, sourceNode) => {
    if (searchTerm) {
      event.preventDefault();
      return;
    }
    dragState = payload;
    dragSource = sourceNode;
    sourceNode?.classList.add("is-drag-source");
    root.classList.add("is-layout-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({ cvSettingsLayout: true, ...payload }));
    }
  };

  const dragHandle = (label, payload, sourceNode) => {
    const handle = el("span", "cv-settings-drag-handle");
    handle.title = label;
    handle.setAttribute("aria-label", label);
    handle.append(icon("grip"));

    if (payload.kind === "heading") {
      handle.draggable = false;
      handle.style.touchAction = "none";
      let pointer = null;

      const resolveHeadingTarget = event => {
        clearDropHints();
        const node = doc.elementFromPoint?.(event.clientX, event.clientY);
        if (!node || !root.contains(node)) return null;

        const nav = node.closest?.(".cv-settings-nav-button[data-category]");
        if (nav?.dataset.category) {
          nav.classList.add("is-drop-tab");
          return { kind: "tab", category: nav.dataset.category };
        }

        const block = node.closest?.(".cv-settings-section[data-heading-id]");
        if (!block?.dataset.headingId || block.dataset.headingId === payload.id) return null;
        const section = sectionFor(block.dataset.headingId);
        if (!section) return null;
        const head = block.querySelector(".cv-settings-section-head");
        const rect = (head || block).getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        block.classList.add(before ? "is-drop-before" : "is-drop-after");
        return { kind: "section", section, before };
      };

      const releasePointer = state => {
        try {
          if (state && handle.hasPointerCapture?.(state.id)) handle.releasePointerCapture(state.id);
        } catch {}
      };

      handle.onpointerdown = event => {
        if (searchTerm || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        event.stopPropagation();
        pointer = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          active: false,
          target: null,
        };
        try { handle.setPointerCapture?.(event.pointerId); } catch {}
      };

      handle.onpointermove = event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        event.preventDefault();
        event.stopPropagation();
        if (!pointer.active) {
          const distance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
          if (distance < 5) return;
          pointer.active = true;
          dragState = { ...payload };
          dragSource = sourceNode;
          sourceNode?.classList.add("is-drag-source");
          root.classList.add("is-layout-dragging");
        }
        pointer.target = resolveHeadingTarget(event);
      };

      handle.onpointerup = event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        event.preventDefault();
        event.stopPropagation();
        if (pointer.active) pointer.target = resolveHeadingTarget(event);
        const state = pointer;
        pointer = null;
        releasePointer(state);
        if (!state.active) {
          finishDrag();
          return;
        }
        const target = state.target;
        finishDrag();
        if (!target) return;
        if (target.kind === "section") {
          runLayoutDrop("Saving heading order…", () => moveHeadingNear(payload.id, target.section, target.before), target.section.category);
        } else if (target.kind === "tab") {
          runLayoutDrop("Moving heading…", () => moveHeading(payload.id, target.category), target.category);
        }
      };

      handle.onpointercancel = event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        const state = pointer;
        pointer = null;
        releasePointer(state);
        finishDrag();
      };
      return handle;
    }

    if (payload.kind !== "setting") {
      handle.draggable = !searchTerm;
      handle.ondragstart = event => beginDrag(event, payload, sourceNode);
      handle.ondragend = finishDrag;
      return handle;
    }

    handle.draggable = false;
    handle.style.touchAction = "none";
    let pointer = null;

    const resolvePointerTarget = event => {
      clearDropHints();
      const node = doc.elementFromPoint?.(event.clientX, event.clientY);
      if (!node || !root.contains(node)) return null;

      const nav = node.closest?.(".cv-settings-nav-button[data-category]");
      if (nav?.dataset.category) {
        nav.classList.add("is-drop-tab");
        return { kind: "tab", category: nav.dataset.category };
      }

      const row = node.closest?.(".cv-settings-row[data-setting-key]");
      if (row) {
        if (row.dataset.settingKey === payload.key) return null;
        const rect = row.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        row.classList.add(before ? "is-drop-before" : "is-drop-after");
        return { kind: "row", key: row.dataset.settingKey, before };
      }

      const rootZone = node.closest?.(".cv-settings-root-zone");
      if (rootZone) {
        rootZone.classList.add("is-drop-inside");
        return { kind: "root", category: active };
      }

      const block = node.closest?.(".cv-settings-section[data-heading-id]");
      if (block?.dataset.headingId) {
        const section = sectionFor(block.dataset.headingId);
        if (section) {
          block.classList.add("is-drop-inside");
          return { kind: "section", category: section.category, sectionId: section.id };
        }
      }
      return null;
    };

    const releasePointer = state => {
      try {
        if (state && handle.hasPointerCapture?.(state.id)) handle.releasePointerCapture(state.id);
      } catch {}
    };

    handle.onpointerdown = event => {
      if (searchTerm || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      pointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        target: null,
      };
      try { handle.setPointerCapture?.(event.pointerId); } catch {}
    };

    handle.onpointermove = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      event.preventDefault();
      event.stopPropagation();
      if (!pointer.active) {
        const distance = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY);
        if (distance < 5) return;
        pointer.active = true;
        dragState = { ...payload };
        dragSource = sourceNode;
        sourceNode?.classList.add("is-drag-source");
        root.classList.add("is-layout-dragging");
      }
      pointer.target = resolvePointerTarget(event);
    };

    handle.onpointerup = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      event.preventDefault();
      event.stopPropagation();
      if (pointer.active) pointer.target = resolvePointerTarget(event);
      const state = pointer;
      pointer = null;
      releasePointer(state);
      if (!state.active) {
        finishDrag();
        return;
      }

      const target = state.target;
      finishDrag();
      if (!target) return;

      if (target.kind === "row") {
        const targetEntry = entries().find(entry => entry.key === target.key);
        if (!targetEntry) return;
        runLayoutDrop("Saving layout…", () => moveSettingNear(payload.key, targetEntry, target.before), targetEntry.meta.category);
      } else if (target.kind === "section") {
        runLayoutDrop("Saving layout…", () => moveSetting(payload.key, target.category, target.sectionId), target.category);
      } else if (target.kind === "root") {
        runLayoutDrop("Saving layout…", () => moveSetting(payload.key, target.category, null), target.category);
      } else if (target.kind === "tab") {
        runLayoutDrop("Moving setting…", () => moveSetting(payload.key, target.category, null), target.category);
      }
    };

    handle.onpointercancel = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const state = pointer;
      pointer = null;
      releasePointer(state);
      finishDrag();
    };

    return handle;
  };

  const deferRender = () => {
    const schedule = win?.setTimeout ? win.setTimeout.bind(win) : setTimeout;
    schedule(() => {
      finishDrag();
      render();
    }, 0);
  };

  const runLayoutDrop = (message, action, nextActive = null) => {
    setStatus(message, "saving");
    let job;
    try {
      job = action();
      if (nextActive) active = nextActive;
      persistState();
      deferRender();
    } catch (error) {
      finishDrag();
      setStatus(error?.message || "Layout was not saved", "error");
      render();
      return;
    }
    Promise.resolve(job).then(() => {
      setStatus("Saved");
    }).catch(error => {
      setStatus(error?.message || "Layout was not saved", "error");
      deferRender();
    });
  };

  function wireRowDrop(row, entry) {
    if (searchTerm) return;
    row.ondragover = event => {
      if (dragState?.kind !== "setting" || dragState.key === entry.key) return;
      event.preventDefault();
      event.stopPropagation();
      clearDropHints();
      const rect = row.getBoundingClientRect();
      row.classList.add(event.clientY < rect.top + rect.height / 2 ? "is-drop-before" : "is-drop-after");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    };
    row.ondrop = event => {
      if (dragState?.kind !== "setting" || dragState.key === entry.key) return;
      event.preventDefault();
      event.stopPropagation();
      const payload = { ...dragState };
      const rect = row.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      runLayoutDrop("Saving layout…", () => moveSettingNear(payload.key, entry, before), entry.meta.category);
    };
  }

  function settingRow(entry) {
    const row = el("div", "cv-settings-row");
    row.dataset.settingKey = entry.key;
    if (!searchTerm) row.append(dragHandle(`Move ${entry.meta.label}`, { kind: "setting", key: entry.key }, row));
    row.append(labelFor(entry.meta));
    const control = entry.meta.control === "boolean" ? booleanControl(entry.meta, entry.value) : editableControl(entry.meta, entry.value);
    if (entry.meta.custom) {
      const manage = iconButton("edit", `Manage ${entry.meta.label}`);
      manage.onclick = () => {
        row.classList.add("is-custom-editor");
        row.replaceChildren(customForm(entry));
      };
      control.append(manage);
    }
    row.append(control);
    wireRowDrop(row, entry);
    return row;
  }

  function wireSectionDrop(block, section) {
    if (searchTerm) return;
    block.ondragover = event => {
      if (!dragState) return;
      if (event.target.closest?.(".cv-settings-row")) return;
      if (dragState.kind === "heading" && dragState.id === section.id) return;
      if (!["setting", "heading"].includes(dragState.kind)) return;
      event.preventDefault();
      event.stopPropagation();
      clearDropHints();
      if (dragState.kind === "setting") block.classList.add("is-drop-inside");
      else {
        const rect = block.getBoundingClientRect();
        block.classList.add(event.clientY < rect.top + rect.height / 2 ? "is-drop-before" : "is-drop-after");
      }
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    };
    block.ondrop = event => {
      if (!dragState || event.target.closest?.(".cv-settings-row")) return;
      if (dragState.kind === "heading" && dragState.id === section.id) return;
      event.preventDefault();
      event.stopPropagation();
      const payload = { ...dragState };
      if (payload.kind === "setting") {
        runLayoutDrop("Saving layout…", () => moveSetting(payload.key, section.category, section.id), section.category);
      } else if (payload.kind === "heading") {
        const rect = block.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        runLayoutDrop("Saving layout…", () => moveHeadingNear(payload.id, section, before), section.category);
      }
    };
  }

  function openHeadingEditor(block, section) {
    if (!section || searchTerm) return;
    finishDrag();
    const currentHead = block.querySelector(".cv-settings-section-head");
    if (!currentHead) return;

    const form = el("form", "cv-settings-layout-form is-heading-edit");
    const name = el("input", "cv-settings-layout-input");
    const description = el("input", "cv-settings-layout-input");
    const error = el("p", "cv-settings-custom-error");
    const actions = el("div", "cv-settings-layout-actions");
    const remove = el("button", "cv-settings-danger-button");
    const cancel = el("button", "cv-settings-secondary-button", "Cancel");
    const save = el("button", "cv-settings-primary-button", "Save changes");
    name.value = section.label;
    description.value = section.note || "";
    name.placeholder = "Heading title";
    description.placeholder = "Description, e.g. Use with care";
    remove.type = "button";
    cancel.type = "button";
    save.type = "submit";
    remove.append(icon("trash"), doc.createTextNode("Delete heading"));
    cancel.onclick = () => render();
    remove.onclick = async () => {
      remove.disabled = true;
      cancel.disabled = true;
      save.disabled = true;
      setStatus(`Deleting ${section.label}…`, "saving");
      try {
        await deleteHeading(section.id);
        setStatus("Saved");
        render();
      } catch (deleteError) {
        remove.disabled = false;
        cancel.disabled = false;
        save.disabled = false;
        error.textContent = deleteError?.message || "Could not delete this heading.";
        setStatus("Heading was not deleted", "error");
      }
    };
    actions.append(remove, cancel, save);
    form.append(name, description, error, actions);
    form.onsubmit = async event => {
      event.preventDefault();
      const label = name.value.trim();
      if (!label) { error.textContent = "Enter a heading title."; name.focus(); return; }
      remove.disabled = true;
      cancel.disabled = true;
      save.disabled = true;
      setStatus(`Saving ${label}…`, "saving");
      try {
        await updateHeading(section.id, label, description.value.trim());
        setStatus("Saved");
        render();
      } catch (saveError) {
        remove.disabled = false;
        cancel.disabled = false;
        save.disabled = false;
        error.textContent = saveError?.message || "Could not save this heading.";
        setStatus("Heading was not saved", "error");
      }
    };
    currentHead.replaceWith(form);
    name.focus();
    name.select();
  }

  function appendSection(host, section, sectionEntries, showCategory = false, force = false) {
    if (!sectionEntries.length && !force) return;
    if (showCategory) {
      const category = categories().find(item => item.id === section.category);
      if (category && !host.querySelector(`[data-search-category="${category.id}"]`)) {
        const categoryLabel = el("div", "cv-settings-search-category", category.label);
        categoryLabel.dataset.searchCategory = category.id;
        host.append(categoryLabel);
      }
    }
    const block = el("section", "cv-settings-section");
    block.dataset.headingId = section.id;
    const head = el("header", "cv-settings-section-head");
    const title = el("div", "cv-settings-section-title");
    if (!searchTerm) title.append(dragHandle(`Move heading ${section.label}`, { kind: "heading", id: section.id }, block));
    title.append(el("span", "cv-settings-section-kicker", section.label));
    const tools = el("div", "cv-settings-control");
    tools.append(el("p", null, section.note));
    if (!searchTerm) {
      const editHeading = iconButton("edit", `Edit heading ${section.label}`);
      editHeading.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openHeadingEditor(block, section);
      };
      tools.append(editHeading);
    }
    head.append(title, tools);
    block.append(head);
    const list = el("div", "cv-settings-section-list");
    sectionEntries.forEach(entry => list.append(settingRow(entry)));
    block.append(list);
    wireSectionDrop(block, section);
    host.append(block);
  }

  function appendRootContainer(host, categoryId, rootEntries, showCategory = false, force = false) {
    if (!rootEntries.length && !force) return;
    if (showCategory) {
      const category = categories().find(item => item.id === categoryId);
      if (category && !host.querySelector(`[data-search-category="${category.id}"]`)) {
        const categoryLabel = el("div", "cv-settings-search-category", category.label);
        categoryLabel.dataset.searchCategory = category.id;
        host.append(categoryLabel);
      }
    }
    const zone = el("section", `cv-settings-root-zone${rootEntries.length ? " has-items" : ""}`);
    const hint = el("div", "cv-settings-root-hint", rootEntries.length ? "Unsectioned" : "Drop a setting here to keep it outside a heading");
    zone.append(hint);
    const list = el("div", "cv-settings-section-list");
    rootEntries.forEach(entry => list.append(settingRow(entry)));
    zone.append(list);
    if (!searchTerm) {
      zone.ondragover = event => {
        if (dragState?.kind !== "setting") return;
        event.preventDefault();
        event.stopPropagation();
        clearDropHints();
        zone.classList.add("is-drop-inside");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      };
      zone.ondrop = event => {
        if (dragState?.kind !== "setting") return;
        event.preventDefault();
        event.stopPropagation();
        const payload = { ...dragState };
        runLayoutDrop("Saving layout…", () => moveSetting(payload.key, categoryId, null), categoryId);
      };
    }
    host.append(zone);
  }

  const categoryCount = (allEntries, categoryId) => allEntries.filter(entry => entry.meta.category === categoryId).length;

  const tabDragHandle = (category, button) => {
    const handle = el("span", "cv-settings-drag-handle cv-settings-tab-drag-handle");
    handle.title = `Move tab ${category.label}`;
    handle.setAttribute("aria-label", `Move tab ${category.label}`);
    handle.append(icon("grip"));
    handle.style.position = "absolute";
    handle.style.left = "7px";
    handle.style.top = "50%";
    handle.style.transform = "translateY(-50%)";
    handle.style.touchAction = "none";
    button.style.paddingLeft = "36px";
    let pointer = null;

    const resolveTarget = event => {
      clearDropHints();
      const node = doc.elementFromPoint?.(event.clientX, event.clientY);
      const target = node?.closest?.(".cv-settings-nav-button[data-category]");
      if (!target || !root.contains(target) || target.dataset.category === category.id) return null;
      const rect = target.getBoundingClientRect();
      const nav = target.parentElement;
      const horizontal = win?.getComputedStyle?.(nav)?.display === "flex";
      const before = horizontal
        ? event.clientX < rect.left + rect.width / 2
        : event.clientY < rect.top + rect.height / 2;
      target.classList.add("is-drop-tab");
      return { id: target.dataset.category, before };
    };

    const release = state => {
      try {
        if (state && handle.hasPointerCapture?.(state.id)) handle.releasePointerCapture(state.id);
      } catch {}
    };

    handle.onpointerdown = event => {
      if (searchTerm || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      pointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        target: null,
      };
      try { handle.setPointerCapture?.(event.pointerId); } catch {}
    };

    handle.onpointermove = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      event.preventDefault();
      event.stopPropagation();
      if (!pointer.active) {
        if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 5) return;
        pointer.active = true;
        dragState = { kind: "tab", id: category.id };
        dragSource = button;
        button.classList.add("is-drag-source");
        root.classList.add("is-layout-dragging");
      }
      pointer.target = resolveTarget(event);
    };

    handle.onpointerup = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      event.preventDefault();
      event.stopPropagation();
      if (pointer.active) pointer.target = resolveTarget(event);
      const state = pointer;
      pointer = null;
      release(state);
      if (!state.active) {
        finishDrag();
        return;
      }
      button.__cvSuppressClick = true;
      const schedule = win?.setTimeout ? win.setTimeout.bind(win) : setTimeout;
      schedule(() => { button.__cvSuppressClick = false; }, 0);
      const target = state.target;
      finishDrag();
      if (!target) return;
      runLayoutDrop("Saving tab order…", () => moveTabNear(category.id, target.id, target.before));
    };

    handle.onpointercancel = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const state = pointer;
      pointer = null;
      release(state);
      finishDrag();
    };
    return handle;
  };

  function renderNav(allEntries) {
    const nav = q('[data-role="settings-nav"]');
    nav.replaceChildren();
    const tabs = categories();
    if (!tabs.some(category => category.id === active)) active = tabs[0]?.id || "general";
    tabs.forEach(category => {
      const button = el("button", "cv-settings-nav-button");
      const label = el("span", "cv-settings-nav-label", category.label);
      const count = el("span", "cv-settings-nav-count", String(categoryCount(allEntries, category.id)));
      button.type = "button";
      button.dataset.category = category.id;
      button.setAttribute("aria-current", !searchTerm && category.id === active ? "page" : "false");
      if (!searchTerm) button.append(tabDragHandle(category, button));
      button.append(label, count);
      button.onclick = event => {
        if (button.__cvSuppressClick) {
          event.preventDefault();
          return;
        }
        if (dragState) return;
        active = category.id;
        searchTerm = "";
        const search = q('[data-role="settings-search"]');
        if (search) search.value = "";
        persistState();
        render();
      };
      if (!searchTerm) {
        button.ondragover = event => {
          if (!dragState || !["setting", "heading"].includes(dragState.kind)) return;
          if (dragState.kind === "heading" && sectionFor(dragState.id)?.category === category.id) return;
          event.preventDefault();
          clearDropHints();
          button.classList.add("is-drop-tab");
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        };
        button.ondrop = event => {
          if (!dragState || !["setting", "heading"].includes(dragState.kind)) return;
          event.preventDefault();
          event.stopPropagation();
          const payload = { ...dragState };
          if (payload.kind === "setting") runLayoutDrop("Moving setting…", () => moveSetting(payload.key, category.id, null), category.id);
          else runLayoutDrop("Moving heading…", () => moveHeading(payload.id, category.id), category.id);
        };
      }
      nav.append(button);
    });
  }

  function layoutForm(kind, onSubmit, options = {}) {
    const form = el("form", `cv-settings-layout-form is-${kind}`);
    const name = el("input", "cv-settings-layout-input");
    const description = el("input", "cv-settings-layout-input");
    const actions = el("div", "cv-settings-layout-actions");
    const cancel = el("button", "cv-settings-secondary-button", "Cancel");
    const save = el("button", "cv-settings-primary-button", options.saveLabel || (kind === "tab" ? "Add tab" : "Add heading"));
    const error = el("p", "cv-settings-custom-error");
    name.type = "text";
    description.type = "text";
    name.autocomplete = "off";
    description.autocomplete = "off";
    name.spellcheck = false;
    description.spellcheck = false;
    name.value = options.label || "";
    description.value = options.description || "";
    name.placeholder = kind === "tab" ? "Tab name" : "Heading title";
    description.placeholder = kind === "tab" ? "Optional tab description" : "Description, e.g. Use with care";
    cancel.type = "button";
    save.type = "submit";
    form.onpointerdown = event => event.stopPropagation();
    cancel.onclick = () => {
      if (typeof options.onCancel === "function") options.onCancel();
      else render();
    };
    actions.append(cancel, save);
    form.append(name, description, error, actions);
    form.onsubmit = async event => {
      event.preventDefault();
      const label = name.value.trim();
      if (!label) { error.textContent = kind === "tab" ? "Enter a tab name." : "Enter a heading title."; name.focus(); return; }
      save.disabled = true;
      cancel.disabled = true;
      try { await onSubmit(label, description.value.trim()); }
      catch (saveError) {
        save.disabled = false;
        cancel.disabled = false;
        error.textContent = saveError?.message || "Could not save layout.";
      }
    };
    return { form, name, description, actions, cancel, save, error };
  }

  async function openTabForm(category = null) {
    finishDrag();
    try { await queue; } catch {}
    const editing = category || null;
    searchTerm = "";
    const search = q('[data-role="settings-search"]');
    if (search) search.value = "";
    render();
    const host = q('[data-role="settings-groups"]');
    if (!host) return;

    const { form, name, actions, cancel, save, error } = layoutForm("tab", async (label, description) => {
      if (editing) {
        setStatus(`Saving ${label}…`, "saving");
        await updateTab(editing.id, label, description);
        active = editing.id;
      } else {
        const layout = layoutState();
        const used = new Set([
          ...baseCategoryIds,
          ...Object.keys(layout.tabs),
          ...categories(layout).map(item => item.id),
        ]);
        const id = uniqueId("tab", label, used);
        const currentOrder = categories(layout).map(item => item.id);
        layout.tabs[id] = { label, eyebrow: "Custom", description };
        layout.tabOrder = [...currentOrder, id];
        setStatus("Adding tab…", "saving");
        await saveLayout(layout);
        active = id;
      }
      persistState();
      setStatus("Saved");
      render();
    }, {
      label: editing?.label || "",
      description: editing?.description || "",
      saveLabel: editing ? "Save changes" : "Add tab",
    });

    if (editing) {
      const remove = el("button", "cv-settings-danger-button");
      remove.type = "button";
      remove.append(icon("trash"), doc.createTextNode("Delete tab"));
      remove.onclick = async () => {
        remove.disabled = true;
        cancel.disabled = true;
        save.disabled = true;
        setStatus(`Deleting ${editing.label}…`, "saving");
        try {
          active = await deleteTab(editing.id);
          persistState();
          setStatus("Saved");
          render();
        } catch (deleteError) {
          remove.disabled = false;
          cancel.disabled = false;
          save.disabled = false;
          error.textContent = deleteError?.message || "Could not delete this tab.";
          setStatus("Tab was not deleted", "error");
        }
      };
      actions.prepend(remove);
    }

    const holder = el("section", "cv-settings-section cv-settings-layout-form-holder");
    holder.append(form);
    host.prepend(holder);
    name.focus();
    name.select();
  }

  function openHeadingForm() {
    if (searchTerm) return;
    const tabs = categories();
    if (!tabs.some(item => item.id === active)) active = tabs[0]?.id || "general";
    render();
    const host = q('[data-role="settings-groups"]');
    const { form, name } = layoutForm("heading", async (label, description) => {
      const layout = layoutState();
      const used = new Set([
        ...baseSectionIds,
        ...Object.keys(layout.headings),
        ...sections(layout).map(item => item.id),
      ]);
      const id = uniqueId("heading", label, used);
      layout.headings[id] = { label, note: description };
      layout.headingTabs[id] = active;
      const current = orderedSections(active, layout).map(item => item.id).filter(item => item !== id);
      current.push(id);
      layout.headingOrder[active] = current;
      setStatus("Adding heading…", "saving");
      await saveLayout(layout);
      setStatus("Saved");
      render();
    });
    const holder = el("section", "cv-settings-section cv-settings-layout-form-holder");
    holder.append(form);
    host.prepend(holder);
    name.focus();
  }

  function renderCategory(allEntries) {
    const host = q('[data-role="settings-groups"]');
    const empty = q('[data-role="settings-empty"]');
    host.replaceChildren();
    empty.hidden = true;
    const layout = layoutState();
    const tabs = categories(layout);
    const editTab = q('[data-role="settings-edit-tab"]');
    const addHeading = q('[data-role="settings-add-heading"]');
    const addSetting = q('[data-role="settings-add-setting"]');

    if (searchTerm) {
      if (editTab) editTab.hidden = true;
      if (addHeading) addHeading.hidden = true;
      if (addSetting) addSetting.hidden = true;
      const allSections = sections(layout);
      const matches = allEntries.filter(entry => {
        const category = tabs.find(item => item.id === entry.meta.category);
        const section = allSections.find(item => item.id === entry.meta.section);
        const haystack = [entry.key, entry.meta.label, entry.meta.description, category?.label, section?.label, section?.note].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(searchTerm);
      });
      q('[data-role="settings-panel-eyebrow"]').textContent = "Search";
      q('[data-role="settings-panel-title"]').textContent = "Search results";
      q('[data-role="settings-panel-description"]').textContent = `Matching “${q('[data-role="settings-search"]')?.value.trim() || searchTerm}” across labels, property keys, tabs and headings.`;
      q('[data-role="settings-panel-count"]').textContent = `${matches.length} ${matches.length === 1 ? "result" : "results"}`;
      if (!matches.length) { empty.textContent = "No matching settings."; empty.hidden = false; return; }
      tabs.forEach(category => {
        const rootMatches = containerEntries(matches, category.id, null, layout);
        appendRootContainer(host, category.id, rootMatches, true, false);
        orderedSections(category.id, layout).forEach(section => {
          const sectionEntries = containerEntries(matches, category.id, section.id, layout);
          appendSection(host, section, sectionEntries, true, false);
        });
      });
      return;
    }

    if (addHeading) addHeading.hidden = false;
    if (addSetting) addSetting.hidden = false;
    const category = tabs.find(item => item.id === active) || tabs[0];
    active = category?.id || "general";
    if (editTab) editTab.hidden = !category;
    const current = allEntries.filter(entry => entry.meta.category === active);
    q('[data-role="settings-panel-eyebrow"]').textContent = category?.eyebrow || "Custom";
    q('[data-role="settings-panel-title"]').textContent = category?.label || "Settings";
    q('[data-role="settings-panel-description"]').textContent = category?.description || "";
    q('[data-role="settings-panel-count"]').textContent = `${current.length} ${current.length === 1 ? "setting" : "settings"}`;

    appendRootContainer(host, active, containerEntries(allEntries, active, null, layout), false, true);
    const headings = orderedSections(active, layout);
    headings.forEach(section => appendSection(host, section, containerEntries(allEntries, active, section.id, layout), false, true));

    if (!current.length && !headings.length) {
      empty.textContent = "No settings in this tab. Add a heading or drag settings here.";
      empty.hidden = false;
    }
  }

  function openCustomForm() {
    const tabs = categories();
    const targetTab = tabs.some(item => item.id === active) ? active : (tabs[0]?.id || "advanced");
    searchTerm = "";
    persistState();
    const search = q('[data-role="settings-search"]');
    if (search) search.value = "";
    render();
    const host = q('[data-role="settings-groups"]');
    const holder = el("section", "cv-settings-section");
    holder.append(customForm(null, targetTab));
    host.prepend(holder);
    holder.querySelector("input")?.focus();
  }

  function render() {
    const allEntries = entries();
    root.classList.toggle("is-showing-keys", showKeys);
    q('[data-role="settings-count"]').textContent = String(allEntries.length);
    q('[data-role="settings-secret-count"]').textContent = String(allEntries.filter(entry => entry.meta.secret).length);
    const keyToggle = q('[data-role="settings-keys-toggle"]');
    keyToggle.setAttribute("aria-pressed", String(showKeys));
    keyToggle.textContent = showKeys ? "Hide property keys" : "Show property keys";
    renderNav(allEntries);
    renderCategory(allEntries);
  }

  const search = q('[data-role="settings-search"]');
  search.oninput = () => {
    searchTerm = search.value.trim().toLowerCase();
    render();
  };

  q('[data-role="settings-keys-toggle"]').onclick = () => {
    showKeys = !showKeys;
    persistState();
    render();
  };

  q('[data-role="settings-add-tab"]').onclick = () => openTabForm();
  q('[data-role="settings-edit-tab"]').onclick = () => {
    const category = categories().find(item => item.id === active);
    if (category) openTabForm(category);
  };
  q('[data-role="settings-add-heading"]').onclick = openHeadingForm;
  q('[data-role="settings-add-setting"]').onclick = openCustomForm;

  if (root.__cvSettingsKeyHandler) doc.removeEventListener("keydown", root.__cvSettingsKeyHandler);
  root.__cvSettingsKeyHandler = event => {
    const target = event.target;
    const typing = target?.matches?.("input, textarea, select, [contenteditable=true], [contenteditable=plaintext-only]");
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search.focus();
      search.select();
    } else if (event.key === "Escape" && doc.activeElement === search && search.value) {
      search.value = "";
      searchTerm = "";
      render();
    }
  };
  doc.addEventListener("keydown", root.__cvSettingsKeyHandler);

  persistState();
  render();
}