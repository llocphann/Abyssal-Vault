<%*
/**
 * TMDB TV Series → Frontmatter (Obsidian Templater)
 * Schema mirrors Movie_Template.md and adds series-only fields.
 */
const expectedFolder = "20_Personal_Life/25_Media_Tracker/TV_Series";
const templateTarget = tp.config?.target_file;
const templateRunMode = Number(tp.config?.run_mode);
const targetWasBlank = Number(templateTarget?.stat?.size || 0) === 0;
const targetCreatedAt = Number(templateTarget?.stat?.ctime || 0);
const canTrashFailedTarget = Boolean(
  templateTarget && (
    templateRunMode === 0 ||
    (
      templateRunMode === 2 &&
      targetWasBlank &&
      templateTarget.path.startsWith(`${expectedFolder}/`)
    )
  )
);
let failedTargetCleanupQueued = false;

function failGeneratedNote(reason) {
  const detail = String(reason?.message || reason || "Unknown error");
  const noticeText = `TV Series note creation failed: ${detail}`;
  tR = "";
  new tp.obsidian.Notice(noticeText, 10000);

  // Never delete an existing note when this template is inserted or rerun.
  if (!canTrashFailedTarget) {
    tR += noticeText;
    return;
  }
  if (failedTargetCleanupQueued) return;
  failedTargetCleanupQueued = true;

  // Templater writes its rendered output before firing this hook. Waiting for
  // the hook prevents a blank render from recreating the failed target.
  tp.hooks.on_all_templates_executed(async () => {
    try {
      const liveTarget = tp.app.vault.getAbstractFileByPath(templateTarget.path);
      const isSameTarget =
        liveTarget instanceof tp.obsidian.TFile &&
        Number(liveTarget.stat?.ctime || 0) === targetCreatedAt;
      if (!isSameTarget) return;
      await tp.app.fileManager.trashFile(liveTarget);
      new tp.obsidian.Notice("Failed TV Series note moved to Trash.", 6000);
    } catch (cleanupError) {
      new tp.obsidian.Notice(
        `Could not move the failed TV Series note to Trash: ${cleanupError.message || cleanupError}`,
        10000,
      );
    }
  });
}

try {
const settingsPath = "90_System/93_Configuration/settings.local.md";
const settingsFile = tp.app.vault.getAbstractFileByPath(settingsPath);
const api_key = String(
  settingsFile
    ? tp.app.metadataCache.getFileCache(settingsFile)?.frontmatter?.tmdb_key || ""
    : ""
).trim();
if (!api_key) {
  failGeneratedNote(`Missing tmdb_key in ${settingsPath}.`);
  return;
}
const fileTitle = tp.file.title;

let query = await tp.system.prompt("Enter TV series name (leave empty for file name):");
if (!query || !query.trim()) query = fileTitle;
query = query.trim();

const searchUrl =
  "https://api.themoviedb.org/3/search/tv" +
  `?api_key=${api_key}` +
  `&query=${encodeURIComponent(query)}` +
  "&include_adult=false&language=en-US&page=1";

let searchResponse;
try {
  searchResponse = await tp.web.request(searchUrl);
} catch (error) {
  failGeneratedNote(`TMDB search error: ${error.message || error}`);
  return;
}

const results = searchResponse?.results || [];
if (!results.length) {
  failGeneratedNote(`No results for "${query}".`);
  return;
}

const limited = results.slice(0, 15);
const display = limited.map(result => {
  const title = result.name || result.original_name || "Unknown";
  const year = (result.first_air_date || "").slice(0, 4) || "????";
  const language = (result.original_language || "").toUpperCase();
  return `${title} (${year}) [${language}]`;
});

const chosenSeries = await tp.system.suggester(display, limited, true, "Pick a TV series");
if (!chosenSeries) {
  failGeneratedNote("Selection cancelled.");
  return;
}

const seriesId = chosenSeries.id;
const detailsUrl =
  `https://api.themoviedb.org/3/tv/${seriesId}` +
  `?api_key=${api_key}&language=en-US&append_to_response=credits,external_ids`;

let details, credits, externalIds;
try {
  details = await tp.web.request(detailsUrl);
  credits = details?.credits || {};
  externalIds = details?.external_ids || {};
} catch (error) {
  failGeneratedNote(`TMDB details error: ${error.message || error}`);
  return;
}

const seriesTitle = (
  details.name || details.original_name || chosenSeries.name || query || fileTitle
).trim();
const published = details.first_air_date || "";
const ended = details.last_air_date || "";
const year = published.slice(0, 4);
const genres = (details.genres || []).map(item => item.name).filter(Boolean);
const networks = (details.networks || []).map(item => item.name).filter(Boolean);
const seasons = details.number_of_seasons || "";
const episodes = details.number_of_episodes || "";
const runtime =
  (details.episode_run_time || []).find(value => Number(value) > 0) ||
  details.last_episode_to_air?.runtime ||
  "";
const airingStatus = details.status || "";
const imdbId = externalIds?.imdb_id || "";
const tmdbId = seriesId;

const yamlEscape = value => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/"/g, '\\"')
  .replace(/\r?\n+/g, " ")
  .trim();
const description = yamlEscape(details.overview || "");
const tagline = yamlEscape(details.tagline || "");

const languageMap = {
  hi: "hindi", bn: "bengali", ta: "tamil", te: "telugu", kn: "kannada",
  ml: "malayalam", mr: "marathi", gu: "gujarati", pa: "punjabi", or: "odia",
  bho: "bhojpuri", sa: "sanskrit", ks: "kashmiri", as: "assamese", ur: "urdu",
  en: "english", ja: "japanese", ko: "korean", es: "spanish", fr: "french",
  de: "german", it: "italian", ru: "russian", zh: "chinese", tr: "turkish",
  th: "thai", id: "indonesian", fa: "persian", ar: "arabic", pt: "portuguese",
  vi: "vietnamese", he: "hebrew",
};
const languageCode = (details.original_language || "").toLowerCase();
const language = languageMap[languageCode] || languageCode;

const PERSON_FOLDERS = ["References", ""];
async function noteExists(name) {
  const fileName = `${name}.md`;
  for (const folder of PERSON_FOLDERS) {
    const path = folder ? `${folder}/${fileName}` : fileName;
    try {
      if (await tp.file.exists(path)) return true;
    } catch (error) {}
  }
  return false;
}

function uniqueNames(names) {
  const seen = new Set();
  return names.filter(name => {
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

async function linkPeople(names) {
  const linked = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (index < 3 || await noteExists(name)) linked.push(`[[${name}]]`);
    else linked.push(name);
  }
  return linked;
}

const crew = credits?.crew || [];
const creatorNames = uniqueNames((details.created_by || []).map(person => person?.name));
const directorNames = uniqueNames(crew
  .filter(member => ["director", "series director"].includes((member?.job || "").toLowerCase()))
  .map(member => member.name));
const writerNames = uniqueNames(crew
  .filter(member => {
    const department = (member?.department || "").toLowerCase();
    const job = (member?.job || "").toLowerCase();
    return department === "writing" ||
      job.includes("writer") ||
      job.includes("screenplay") ||
      job.includes("story") ||
      job.includes("teleplay");
  })
  .map(member => member.name));
const castNames = uniqueNames((credits?.cast || []).slice(0, 8).map(member => member?.name));

const creatorsProcessed = await linkPeople(creatorNames);
const directorsProcessed = await linkPeople(directorNames);
const writersProcessed = await linkPeople(writerNames);
const castProcessed = await linkPeople(castNames);

// Store binaries under 90_System/95_Media_Assets; YAML keeps basename-only wikilinks.
let localMedia = { cover: "", backdrop: "" };
try {
  if (typeof tp.user.tmdb_media !== "function") {
    throw new Error("Templater user script tmdb_media.js is not loaded. Reload Obsidian once.");
  }
  localMedia = await tp.user.tmdb_media(tp, {
    mediaType: "tv",
    tmdbId,
    posterPath: details.poster_path || "",
    backdropPath: details.backdrop_path || "",
  });
} catch (error) {
  new tp.obsidian.Notice(`TV media was not saved locally: ${error.message || error}`, 10000);
}
const localMediaLink = value => {
  const fileName = String(value || "").replace(/\\/g, "/").split("/").pop();
  return fileName ? `[[${fileName}]]` : "";
};
const coverLink = localMediaLink(localMedia.cover);
const backdropLink = localMediaLink(localMedia.backdrop);

const ratingChoices = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
let rating = await tp.system.suggester(
  ratingChoices,
  ratingChoices,
  false,
  "Pick your rating (1–10)"
);
if (!rating) rating = "";

const nldatesPlugin = tp.app.plugins.getPlugin("nldates-obsidian");
const datePresets = ["Today", "Yesterday", "Tomorrow"];
const dayOffset = { Today: 0, Yesterday: -1, Tomorrow: 1 };
const pickedDate = await tp.system.suggester(
  datePresets,
  datePresets,
  false,
  "Last watched date (Esc = type)"
);

let lastDate;
if (pickedDate) {
  lastDate = tp.date.now("YYYY-MM-DD", dayOffset[pickedDate]);
} else {
  const typedDate = await tp.system.prompt(
    "Enter last watched date (natural language or YYYY-MM-DD)",
    "today"
  );
  if (typedDate && nldatesPlugin) {
    const parsed = nldatesPlugin.parseDate(typedDate)?.moment;
    lastDate = parsed?.isValid() ? parsed.format("YYYY-MM-DD") : tp.date.now("YYYY-MM-DD");
  } else if (typedDate?.trim()) {
    lastDate = typedDate.trim();
  } else {
    lastDate = tp.date.now("YYYY-MM-DD");
  }
}

const colonFixed = seriesTitle.replace(/\s*:\s*/g, " - ");
const illegalCharacters = /[\\\/#%&{}<>*?$!'"@+`|=]/g;
let sanitizedTitle = colonFixed.replace(illegalCharacters, "").trim();
if (!sanitizedTitle) sanitizedTitle = fileTitle;
const requiresAlias = sanitizedTitle !== seriesTitle;
if (sanitizedTitle !== fileTitle) await tp.file.rename(sanitizedTitle);

function pushList(lines, key, values) {
  if (!values.length) {
    lines.push(`${key}: []`);
    return;
  }
  lines.push(`${key}:`);
  for (const value of values) lines.push(`  - "${yamlEscape(value)}"`);
}

const today = tp.date.now("YYYY-MM-DD");
const lines = ["---"];
lines.push("categories:");
lines.push('  - "[[TV Series]]"');
pushList(lines, "genres", genres.map(genre => `[[${genre}]]`));
pushList(lines, "creators", creatorsProcessed);
pushList(lines, "directors", directorsProcessed);
pushList(lines, "writers", writersProcessed);
pushList(lines, "cast", castProcessed);
pushList(lines, "networks", networks);
lines.push(coverLink ? `cover: "${yamlEscape(coverLink)}"` : "cover: []");
if (backdropLink) {
  lines.push("backdrop:");
  lines.push(`  - "${yamlEscape(backdropLink)}"`);
} else {
  lines.push("backdrop: []");
}
lines.push(`description: "${description}"`);
lines.push(`tagline: "${tagline}"`);
lines.push(`year: ${year}`);
lines.push(`rating: ${rating}`);
lines.push('status: ""');
lines.push(`airing_status: "${yamlEscape(airingStatus)}"`);
lines.push(`runtime: ${runtime}`);
lines.push(`seasons: ${seasons}`);
lines.push(`episodes: ${episodes}`);
lines.push(`published: ${published}`);
lines.push(`ended: ${ended}`);
lines.push(`language: "${yamlEscape(language)}"`);
lines.push(`created: ${today}`);
lines.push(`last: ${lastDate}`);
lines.push(`imdbId: ${imdbId}`);
lines.push(`tmdbId: ${tmdbId}`);
lines.push("via:");
if (requiresAlias) {
  lines.push("aliases:");
  lines.push(`  - "${yamlEscape(seriesTitle)}"`);
}
lines.push("---");
tR += lines.join("\n");
} catch (error) {
  failGeneratedNote(error);
  return;
}
%>
