const fs = require("fs");
const os = require("os");
const path = require("path");

const SETTINGS_PATH = "90_System/93_Configuration/settings.local.md";

function text(value) {
  return String(value ?? "").trim();
}

function firstText(...values) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return "";
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function readSettings(tp) {
  try {
    const file = tp.app.vault.getAbstractFileByPath(SETTINGS_PATH);
    return file ? (tp.app.metadataCache.getFileCache(file)?.frontmatter || {}) : {};
  } catch {
    return {};
  }
}

async function requestJson(tp, url, headers = {}) {
  const response = await tp.obsidian.requestUrl({ url, method: "GET", headers });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (response.json !== undefined && response.json !== null) return response.json;
  return JSON.parse(response.text || "{}");
}

function steamIdFromValue(value) {
  const raw = text(value);
  if (!raw) return "";
  const url = raw.match(/(?:store\.)?steampowered\.com\/app\/(\d+)/i);
  if (url) return url[1];
  return /^\d{2,10}$/.test(raw) ? raw : "";
}

function inferSteamAppId(frontmatter) {
  return firstText(
    steamIdFromValue(frontmatter.SteamAppId),
    steamIdFromValue(frontmatter.steam_app_id),
    steamIdFromValue(frontmatter.steamAppId),
    steamIdFromValue(frontmatter.StoreUrl),
    steamIdFromValue(frontmatter.store_url),
    steamIdFromValue(frontmatter.SourceUrl),
    steamIdFromValue(frontmatter.source_url),
  );
}

function steamId64FromValue(value) {
  const raw = text(value);
  if (!raw) return "";
  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{15,20})/i);
  const candidate = profileMatch?.[1] || raw;
  if (!/^\d{15,20}$/.test(candidate)) return "";
  try {
    const numeric = BigInt(candidate);
    if (numeric <= 0n || numeric > 18446744073709551615n) return "";
  } catch {
    return "";
  }
  return candidate;
}

function normalizeSteamSettings(settings) {
  return {
    key: text(settings.steam_api_key),
    steamId: steamId64FromValue(settings.steam_id),
    rawSteamId: text(settings.steam_id),
  };
}

async function ensureSteamAppId(tp, frontmatter) {
  const existing = inferSteamAppId(frontmatter);
  if (existing) return existing;
  const entered = text(await tp.system.prompt("Steam App ID or Steam store URL:"));
  return steamIdFromValue(entered);
}

async function fetchSteamStats(tp, frontmatter, settings) {
  const appId = await ensureSteamAppId(tp, frontmatter);
  if (!appId) throw new Error("Steam App ID is missing.");

  const steam = normalizeSteamSettings(settings);
  if (!steam.key) {
    throw new Error(`Steam sync needs steam_api_key in ${SETTINGS_PATH}.`);
  }
  if (!steam.steamId) {
    throw new Error(
      `steam_id in ${SETTINGS_PATH} must be a numeric SteamID64 (or a steamcommunity.com/profiles/<SteamID64> URL), not a vanity name or custom profile URL.`,
    );
  }

  let playtimeHours = null;
  let playtimeError = null;
  try {
    const ownedUrl = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
    ownedUrl.searchParams.set("key", steam.key);
    ownedUrl.searchParams.set("steamid", steam.steamId);
    ownedUrl.searchParams.set("include_appinfo", "false");
    ownedUrl.searchParams.set("include_played_free_games", "true");
    ownedUrl.searchParams.append("appids_filter[0]", appId);
    const owned = await requestJson(tp, ownedUrl.toString());
    const game = owned?.response?.games?.find(item => String(item?.appid) === appId)
      || owned?.response?.games?.[0];
    if (!game) {
      playtimeError = new Error("game is absent from GetOwnedGames (not owned or Game Details are private)");
    } else {
      const minutes = Number(game?.playtime_forever);
      if (Number.isFinite(minutes) && minutes >= 0) {
        playtimeHours = Math.round((minutes / 60) * 10) / 10;
      } else {
        playtimeError = new Error("Steam returned no playtime_forever value");
      }
    }
  } catch (error) {
    playtimeError = error;
    console.warn("[game-platform-stats] Steam playtime unavailable", error);
  }

  let completion = null;
  let achievementUnlocked = null;
  let achievementTotal = null;
  let achievementError = null;
  try {
    const achievementUrl = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/");
    achievementUrl.searchParams.set("key", steam.key);
    achievementUrl.searchParams.set("steamid", steam.steamId);
    achievementUrl.searchParams.set("appid", appId);
    achievementUrl.searchParams.set("l", "english");
    const achievements = await requestJson(tp, achievementUrl.toString());
    const playerStats = achievements?.playerstats || {};
    if (playerStats.success === false) {
      achievementError = new Error(text(playerStats.error) || "Steam refused achievement data");
    } else {
      const list = Array.isArray(playerStats.achievements) ? playerStats.achievements : [];
      achievementTotal = list.length;
      achievementUnlocked = list.filter(item => Number(item?.achieved) === 1).length;
      if (achievementTotal > 0) {
        completion = clampPercent((achievementUnlocked / achievementTotal) * 100);
      }
    }
  } catch (error) {
    achievementError = error;
    console.warn("[game-platform-stats] Steam achievements unavailable", error);
  }

  if (playtimeHours === null && completion === null && achievementTotal === null) {
    const details = [playtimeError?.message, achievementError?.message].filter(Boolean).join("; ");
    throw new Error(
      `Steam returned no usable personal stats${details ? `: ${details}` : "."} Verify SteamID64, game ownership, and Steam Profile > Privacy Settings > Game details.`,
    );
  }

  return {
    source: "Steam",
    identityKey: "SteamAppId",
    identityValue: appId,
    playtimeHours,
    completion,
    completionSource: completion === null ? "" : "Steam:Achievements",
    achievementUnlocked,
    achievementTotal,
    syncedAt: new Date().toISOString(),
  };
}

function expandHome(value) {
  const raw = text(value);
  if (!raw) return "";
  if (raw === "~") return os.homedir();
  if (raw.startsWith("~/")) return path.join(os.homedir(), raw.slice(2));
  return raw;
}

function loadHeroicGogAuth(settings) {
  const candidate = expandHome(settings.gog_heroic_auth_path);
  if (!candidate) return null;
  try {
    if (!fs.existsSync(candidate)) return null;
    const payload = JSON.parse(fs.readFileSync(candidate, "utf8"));
    const token = payload?.token && typeof payload.token === "object" ? payload.token : {};
    const accessToken = firstText(payload.access_token, payload.accessToken, token.access_token, token.accessToken);
    const userId = firstText(payload.user_id, payload.userId, token.user_id, token.userId);
    return accessToken ? { accessToken, userId, authPath: candidate } : null;
  } catch (error) {
    console.warn(`[game-platform-stats] Could not read configured GOG auth file`, error);
    return null;
  }
}

function gogProductIdFromFrontmatter(frontmatter) {
  return firstText(
    frontmatter.GogProductId,
    frontmatter.GOGProductId,
    frontmatter.gog_product_id,
    frontmatter.gogProductId,
  );
}

async function ensureGogProductId(tp, frontmatter) {
  const existing = gogProductIdFromFrontmatter(frontmatter);
  if (existing) return existing;
  const entered = text(await tp.system.prompt("GOG product ID:"));
  return /^\d+$/.test(entered) ? entered : "";
}

async function fetchGogStats(tp, frontmatter, settings) {
  const productId = await ensureGogProductId(tp, frontmatter);
  if (!productId) throw new Error("GOG product ID is missing.");

  if (!text(settings.gog_heroic_auth_path)) {
    throw new Error(`GOG sync needs gog_heroic_auth_path in ${SETTINGS_PATH}.`);
  }
  const auth = loadHeroicGogAuth(settings);
  if (!auth?.accessToken) {
    throw new Error("GOG sync could not read a valid Heroic GOG login from gog_heroic_auth_path.");
  }
  if (!auth.userId) {
    throw new Error("Heroic GOG auth is missing user_id. Refresh the GOG login in Heroic and try again.");
  }

  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: "application/json",
  };

  let playtimeHours = null;
  try {
    const sessions = await requestJson(
      tp,
      `https://gameplay.gog.com/games/${encodeURIComponent(productId)}/users/${encodeURIComponent(auth.userId)}/sessions`,
      headers,
    );
    const minutes = Number(sessions?.time_sum);
    if (Number.isFinite(minutes) && minutes >= 0) {
      playtimeHours = Math.round((minutes / 60) * 10) / 10;
    }
  } catch (error) {
    console.warn("[game-platform-stats] GOG playtime unavailable", error);
  }

  let completion = null;
  let achievementUnlocked = null;
  let achievementTotal = null;
  try {
    const achievements = await requestJson(
      tp,
      `https://gameplay.gog.com/clients/${encodeURIComponent(productId)}/users/${encodeURIComponent(auth.userId)}/achievements`,
      {
        ...headers,
        "X-Gog-Lc": text(settings.gog_locale) || "en-US",
      },
    );
    const items = Array.isArray(achievements?.items) ? achievements.items : [];
    if (items.length) {
      achievementTotal = items.length;
      achievementUnlocked = items.filter(item => Boolean(item?.date_unlocked)).length;
      completion = clampPercent((achievementUnlocked / achievementTotal) * 100);
    }
  } catch (error) {
    console.warn("[game-platform-stats] GOG achievements unavailable", error);
  }

  if (playtimeHours === null && completion === null) {
    throw new Error("GOG returned neither playtime nor achievement data. Refresh the GOG login in Heroic and verify the product ID.");
  }

  return {
    source: "GOG",
    identityKey: "GogProductId",
    identityValue: productId,
    playtimeHours,
    completion,
    completionSource: completion === null ? "" : "GOG:Achievements",
    achievementUnlocked,
    achievementTotal,
    syncedAt: new Date().toISOString(),
  };
}

function providerHints(frontmatter) {
  const hints = [];
  const store = `${firstText(frontmatter.Store, frontmatter.store)} ${firstText(frontmatter.Source, frontmatter.source)}`.toLowerCase();
  const urls = `${firstText(frontmatter.StoreUrl, frontmatter.store_url)} ${firstText(frontmatter.SourceUrl, frontmatter.source_url)}`.toLowerCase();
  if (inferSteamAppId(frontmatter) || /\bsteam\b/.test(store) || urls.includes("steampowered.com")) hints.push("Steam");
  if (gogProductIdFromFrontmatter(frontmatter) || /\bgog\b/.test(store) || urls.includes("gog.com")) hints.push("GOG");
  return [...new Set(hints)];
}

async function chooseProvider(tp, frontmatter) {
  const hints = providerHints(frontmatter);
  if (hints.length === 1) return hints[0];
  const options = hints.length > 1 ? hints : ["Steam", "GOG"];
  return tp.system.suggester(options, options, false, "Sync game stats from");
}

async function writeStats(tp, stats) {
  const file = tp.config?.target_file || tp.file.find_tfile(tp.file.path(true));
  if (!file) throw new Error("Game note is unavailable.");

  await tp.app.fileManager.processFrontMatter(file, draft => {
    if (stats.identityKey && stats.identityValue) draft[stats.identityKey] = stats.identityValue;
    if (stats.playtimeHours !== null) {
      draft.PlaytimeHours = stats.playtimeHours;
      draft.PlaytimeSource = stats.source;
    }
    if (stats.completion !== null) {
      draft.Completion = stats.completion;
      draft.CompletionSource = stats.completionSource;
    }
    if (stats.achievementUnlocked !== null) draft.AchievementsUnlocked = stats.achievementUnlocked;
    if (stats.achievementTotal !== null) draft.AchievementsTotal = stats.achievementTotal;
    draft.StatsSource = stats.source;
    draft.LastStatsSync = stats.syncedAt || new Date().toISOString();
  });
}

module.exports = async function gamePlatformStats(tp, options = {}) {
  const suppliedFrontmatter = options.frontmatter && typeof options.frontmatter === "object"
    ? options.frontmatter
    : null;
  const file = suppliedFrontmatter
    ? null
    : (tp.config?.target_file || tp.file.find_tfile(tp.file.path(true)));
  if (!suppliedFrontmatter && !file) throw new Error("Game note is unavailable.");

  const frontmatter = suppliedFrontmatter
    || tp.app.metadataCache.getFileCache(file)?.frontmatter
    || {};
  const settings = options.settings && typeof options.settings === "object"
    ? options.settings
    : readSettings(tp);

  const provider = text(options.provider) || await chooseProvider(tp, frontmatter);
  if (!provider) return options.returnStats ? null : "";

  let stats;
  try {
    stats = provider === "GOG"
      ? await fetchGogStats(tp, frontmatter, settings)
      : await fetchSteamStats(tp, frontmatter, settings);
  } catch (error) {
    console.error(`[game-platform-stats] ${provider} sync failed`, error);
    if (options.throwOnError) throw error;
    if (!options.silent) {
      new tp.obsidian.Notice(`${provider} stats sync failed: ${error.message || error}`, 9000);
    }
    return options.returnStats ? null : "";
  }

  if (options.write !== false) await writeStats(tp, stats);

  if (!options.silent) {
    const pieces = [];
    if (stats.playtimeHours !== null) pieces.push(`${stats.playtimeHours}h`);
    if (stats.completion !== null) pieces.push(`${stats.completion}% achievements`);
    new tp.obsidian.Notice(
      `${provider} stats synced${pieces.length ? ` · ${pieces.join(" · ")}` : ""}.`,
      6500,
    );
  }

  return options.returnStats ? stats : "";
};