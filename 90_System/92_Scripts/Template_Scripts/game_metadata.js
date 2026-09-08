const GAME_FOLDER = "20_Personal_Life/27_Game_Tracker/Games";
const GAME_ASSET_FOLDER = "90_System/95_Media_Assets/Games";
const SETTINGS_PATH = "90_System/93_Configuration/settings.local.md";

function text(value) {
  return String(value ?? "").trim();
}

function cleanHtml(value) {
  return text(value)
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set((values || []).map(text).filter(Boolean))];
}

function portableFileName(value) {
  return text(value)
    .replace(/[\\/:*?"<>|]+/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 180) || "Untitled Game";
}

function yamlEscape(value) {
  return text(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n+/g, " ");
}

function yamlString(value) {
  return `"${yamlEscape(value)}"`;
}

function yamlList(lines, key, values) {
  const items = unique(values);
  if (!items.length) {
    lines.push(`${key}: []`);
    return;
  }
  lines.push(`${key}:`);
  items.forEach(item => lines.push(`  - ${yamlString(item)}`));
}

function normalizeDate(value) {
  const raw = text(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function extensionFromUrl(url, fallback = "jpg") {
  const match = text(url).split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  const ext = match?.[1]?.toLowerCase();
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext.replace("jpeg", "jpg") : fallback;
}

async function ensureFolder(vault, normalizePath, folderPath) {
  const parts = normalizePath(folderPath).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!vault.getAbstractFileByPath(current)) await vault.createFolder(current);
  }
}

async function jsonRequest(requestUrl, url) {
  const response = await requestUrl({ url, method: "GET" });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (response.json !== undefined && response.json !== null) return response.json;
  return JSON.parse(response.text || "{}");
}

async function downloadFirst(tp, identity, role, urls) {
  const vault = tp.app.vault;
  const requestUrl = tp.obsidian.requestUrl;
  const normalizePath = tp.obsidian.normalizePath;
  await ensureFolder(vault, normalizePath, GAME_ASSET_FOLDER);

  for (const candidate of unique(urls)) {
    try {
      const response = await requestUrl({ url: candidate, method: "GET" });
      if (response.status < 200 || response.status >= 300 || !response.arrayBuffer?.byteLength) continue;
      const extension = extensionFromUrl(candidate);
      const fileName = `${identity}-${role}.${extension}`;
      const targetPath = normalizePath(`${GAME_ASSET_FOLDER}/${fileName}`);
      const collision = vault.getFiles?.().find(
        file => file.name === fileName && normalizePath(file.path) !== targetPath,
      );
      if (collision) throw new Error(`Asset basename ${fileName} is already used by ${collision.path}.`);

      const existing = vault.getAbstractFileByPath(targetPath);
      if (!existing) await vault.createBinary(targetPath, response.arrayBuffer);
      return fileName;
    } catch (error) {
      console.warn(`[game-metadata] ${role} candidate failed`, error);
    }
  }
  return "";
}

function readOptionalRawgKey(tp) {
  try {
    const settingsFile = tp.app.vault.getAbstractFileByPath(SETTINGS_PATH);
    const frontmatter = settingsFile
      ? tp.app.metadataCache.getFileCache(settingsFile)?.frontmatter || {}
      : {};
    return text(frontmatter.rawg_key || frontmatter.rawg_api_key || "");
  } catch {
    return "";
  }
}

function steamIdFromInput(input) {
  const raw = text(input);
  const urlMatch = raw.match(/store\.steampowered\.com\/app\/(\d+)/i);
  if (urlMatch) return urlMatch[1];
  return /^\d{2,10}$/.test(raw) ? raw : "";
}

function steamPlatforms(platforms = {}) {
  const result = [];
  if (platforms.windows) result.push("Windows");
  if (platforms.mac) result.push("macOS");
  if (platforms.linux) result.push("Linux");
  return result;
}

async function fetchSteamDetails(tp, appId) {
  const requestUrl = tp.obsidian.requestUrl;
  const endpoint = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=english&cc=US`;
  const payload = await jsonRequest(requestUrl, endpoint);
  const entry = payload?.[String(appId)];
  if (!entry?.success || !entry.data) throw new Error("Steam returned no app details.");
  const data = entry.data;
  const id = String(data.steam_appid || appId);
  const storeUrl = `https://store.steampowered.com/app/${id}/`;
  const portraitUrl = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900.jpg`;
  const cover = await downloadFirst(tp, id, "cover", [portraitUrl, data.header_image, data.capsule_image]);
  const backdrop = await downloadFirst(tp, id, "backdrop", [
    data.screenshots?.[0]?.path_full,
    data.header_image,
  ]);

  return {
    title: text(data.name),
    cover,
    backdrop,
    platforms: steamPlatforms(data.platforms),
    developer: text(data.developers?.[0]),
    publisher: text(data.publishers?.[0]),
    genres: unique((data.genres || []).map(item => item?.description)),
    releaseDate: normalizeDate(data.release_date?.date),
    metacritic: Number(data.metacritic?.score || 0) || "",
    website: text(data.website),
    store: "Steam",
    storeUrl,
    source: "Steam",
    sourceUrl: storeUrl,
    steamAppId: id,
    rawgId: "",
    description: cleanHtml(data.short_description || data.about_the_game || data.detailed_description),
  };
}

async function searchSteam(tp, query) {
  const requestUrl = tp.obsidian.requestUrl;
  const endpoint = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
  const payload = await jsonRequest(requestUrl, endpoint);
  return (payload?.items || []).slice(0, 12).filter(item => item?.id && item?.name);
}

async function pickSteam(tp, query) {
  const directId = steamIdFromInput(query);
  if (directId) return fetchSteamDetails(tp, directId);

  let items = [];
  try {
    items = await searchSteam(tp, query);
  } catch (error) {
    console.warn("[game-metadata] Steam search failed", error);
  }
  if (!items.length) return null;

  const labels = items.map(item => {
    const platforms = steamPlatforms(item.platforms).join("/");
    return `${item.name}${platforms ? ` · ${platforms}` : ""}`;
  });
  const selected = await tp.system.suggester(labels, items, false, "Pick a Steam game (Esc = try fallback)");
  if (!selected) return null;
  return fetchSteamDetails(tp, selected.id);
}

async function searchRawg(tp, query, key) {
  const requestUrl = tp.obsidian.requestUrl;
  const endpoint = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&search_precise=true&page_size=10`;
  const payload = await jsonRequest(requestUrl, endpoint);
  return (payload?.results || []).slice(0, 10).filter(item => item?.id && item?.name);
}

async function fetchRawgDetails(tp, game, key) {
  const requestUrl = tp.obsidian.requestUrl;
  const data = await jsonRequest(
    requestUrl,
    `https://api.rawg.io/api/games/${encodeURIComponent(game.id)}?key=${encodeURIComponent(key)}`,
  );
  const identity = `rawg-${data.id}`;
  const cover = await downloadFirst(tp, identity, "cover", [data.background_image]);
  const backdrop = await downloadFirst(tp, identity, "backdrop", [
    data.background_image_additional,
    data.background_image,
  ]);
  const sourceUrl = data.slug ? `https://rawg.io/games/${data.slug}` : "https://rawg.io/";

  return {
    title: text(data.name),
    cover,
    backdrop,
    platforms: unique((data.platforms || []).map(item => item?.platform?.name)),
    developer: text(data.developers?.[0]?.name),
    publisher: text(data.publishers?.[0]?.name),
    genres: unique((data.genres || []).map(item => item?.name)),
    releaseDate: normalizeDate(data.released),
    metacritic: Number(data.metacritic || 0) || "",
    website: text(data.website),
    store: "",
    storeUrl: "",
    source: "RAWG",
    sourceUrl,
    steamAppId: "",
    rawgId: String(data.id),
    description: cleanHtml(data.description_raw || data.description),
  };
}

async function pickRawg(tp, query) {
  const key = readOptionalRawgKey(tp);
  if (!key) return null;
  let items = [];
  try {
    items = await searchRawg(tp, query, key);
  } catch (error) {
    console.warn("[game-metadata] RAWG search failed", error);
    return null;
  }
  if (!items.length) return null;

  const labels = items.map(item => {
    const year = text(item.released).slice(0, 4);
    return `${item.name}${year ? ` (${year})` : ""}`;
  });
  const selected = await tp.system.suggester(labels, items, false, "Pick a RAWG game (Esc = manual note)");
  if (!selected) return null;
  return fetchRawgDetails(tp, selected, key);
}

function manualMetadata(title) {
  return {
    title: text(title) || "Untitled Game",
    cover: "",
    backdrop: "",
    platforms: [],
    developer: "",
    publisher: "",
    genres: [],
    releaseDate: "",
    metacritic: "",
    website: "",
    store: "",
    storeUrl: "",
    source: "Manual",
    sourceUrl: "",
    steamAppId: "",
    rawgId: "",
    description: "",
  };
}

async function enrichSteamStats(tp, metadata) {
  if (!metadata?.steamAppId || text(metadata.store).toLowerCase() !== "steam") return metadata;
  const syncStats = tp.user?.game_platform_stats;
  if (typeof syncStats !== "function") {
    console.warn("[game-metadata] game_platform_stats user script is unavailable");
    return metadata;
  }

  const frontmatter = {
    SteamAppId: metadata.steamAppId,
    Store: metadata.store,
    StoreUrl: metadata.storeUrl,
    Source: metadata.source,
    SourceUrl: metadata.sourceUrl,
  };

  try {
    const stats = await syncStats(tp, {
      provider: "Steam",
      frontmatter,
      write: false,
      silent: true,
      returnStats: true,
      throwOnError: true,
    });
    return stats ? { ...metadata, stats } : metadata;
  } catch (error) {
    console.warn("[game-metadata] Steam personal stats unavailable", error);
    new tp.obsidian.Notice(
      `Steam metadata loaded, but personal stats were not synced: ${error.message || error}`,
      9000,
    );
    return metadata;
  }
}

function renderNote(metadata) {
  const lines = ["---"];
  const stats = metadata.stats || {};
  const hasPlaytime = stats.playtimeHours !== null && stats.playtimeHours !== undefined;
  const hasCompletion = stats.completion !== null && stats.completion !== undefined;
  const hasUnlocked = stats.achievementUnlocked !== null && stats.achievementUnlocked !== undefined;
  const hasTotal = stats.achievementTotal !== null && stats.achievementTotal !== undefined;

  lines.push(`Title: ${yamlString(metadata.title)}`);
  lines.push(`Cover: ${yamlString(metadata.cover ? `[[${metadata.cover}]]` : "")}`);
  lines.push(`Backdrop: ${yamlString(metadata.backdrop ? `[[${metadata.backdrop}]]` : "")}`);
  yamlList(lines, "Platform", metadata.platforms);
  lines.push(`Developer: ${yamlString(metadata.developer)}`);
  lines.push(`Publisher: ${yamlString(metadata.publisher)}`);
  yamlList(lines, "Genre", metadata.genres);
  lines.push("Status: Backlog");
  lines.push("Rating: 0");
  lines.push(`PlaytimeHours: ${hasPlaytime ? stats.playtimeHours : 0}`);
  if (hasPlaytime) lines.push(`PlaytimeSource: ${yamlString(stats.source)}`);
  lines.push(`Completion: ${hasCompletion ? stats.completion : 0}`);
  if (hasCompletion) lines.push(`CompletionSource: ${yamlString(stats.completionSource)}`);
  if (hasUnlocked) lines.push(`AchievementsUnlocked: ${stats.achievementUnlocked}`);
  if (hasTotal) lines.push(`AchievementsTotal: ${stats.achievementTotal}`);
  if (stats.source) lines.push(`StatsSource: ${yamlString(stats.source)}`);
  if (stats.syncedAt) lines.push(`LastStatsSync: ${yamlString(stats.syncedAt)}`);
  lines.push(`ReleaseDate: ${yamlString(metadata.releaseDate)}`);
  lines.push("DateStarted: \"\"");
  lines.push("DateFinished: \"\"");
  lines.push(`Metacritic: ${metadata.metacritic === "" ? '""' : metadata.metacritic}`);
  lines.push(`Store: ${yamlString(metadata.store)}`);
  lines.push(`StoreUrl: ${yamlString(metadata.storeUrl)}`);
  lines.push(`Website: ${yamlString(metadata.website)}`);
  lines.push(`Source: ${yamlString(metadata.source)}`);
  lines.push(`SourceUrl: ${yamlString(metadata.sourceUrl)}`);
  lines.push(`SteamAppId: ${yamlString(metadata.steamAppId)}`);
  lines.push(`RawgId: ${yamlString(metadata.rawgId)}`);
  lines.push(`Description: ${yamlString(metadata.description)}`);
  lines.push("favorite: false");
  lines.push("bookmarked: false");
  lines.push("categories:");
  lines.push('  - "[[Games]]"');
  lines.push("tags:");
  lines.push("  - Game");
  lines.push("---");
  lines.push("");
  lines.push("## Personal Log");
  lines.push("");
  lines.push("## Mechanics");
  lines.push("");
  lines.push("## Story & World");
  lines.push("");
  lines.push("## Memorable Moments");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

module.exports = async function gameMetadata(tp) {
  const currentTitle = text(tp.file.title);
  const requested = text(await tp.system.prompt("Game name, Steam URL or Steam App ID (blank = file name):")) || currentTitle;
  let metadata = null;
  let steamError = null;

  try {
    metadata = await pickSteam(tp, requested);
  } catch (error) {
    steamError = error;
    console.warn("[game-metadata] Steam details failed", error);
  }

  if (!metadata) {
    try {
      metadata = await pickRawg(tp, requested);
    } catch (error) {
      console.warn("[game-metadata] RAWG fallback failed", error);
    }
  }

  if (!metadata) {
    metadata = manualMetadata(requested);
    const detail = steamError?.message ? ` Steam: ${steamError.message}` : "";
    new tp.obsidian.Notice(`Game metadata unavailable; created a manual skeleton.${detail}`, 8000);
  }

  metadata = await enrichSteamStats(tp, metadata);

  const targetName = portableFileName(metadata.title || requested || currentTitle);
  const currentPath = tp.config?.target_file?.path || tp.file.path(true);
  const currentFolder = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  if (targetName && targetName !== currentTitle && currentFolder === GAME_FOLDER) {
    const desiredPath = tp.obsidian.normalizePath(`${GAME_FOLDER}/${targetName}.md`);
    const collision = tp.app.vault.getAbstractFileByPath(desiredPath);
    if (!collision) {
      try {
        await tp.file.rename(targetName);
      } catch (error) {
        console.warn("[game-metadata] Could not rename generated note", error);
      }
    }
  }

  return renderNote(metadata);
};