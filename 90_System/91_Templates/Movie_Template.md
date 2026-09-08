<%*
/**
 * TMDB Movie → Frontmatter (Obsidian Templater)
 */
const expectedFolder = "20_Personal_Life/25_Media_Tracker/Movies";
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
  const noticeText = `Movie note creation failed: ${detail}`;
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
      new tp.obsidian.Notice("Failed Movie note moved to Trash.", 6000);
    } catch (cleanupError) {
      new tp.obsidian.Notice(
        `Could not move the failed Movie note to Trash: ${cleanupError.message || cleanupError}`,
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

let query = await tp.system.prompt("Enter movie name (leave empty for file name):");
if (!query || !query.trim()) query = fileTitle;
query = query.trim();

const searchUrl =
  "https://api.themoviedb.org/3/search/movie" +
  `?api_key=${api_key}` +
  `&query=${encodeURIComponent(query)}` +
  "&include_adult=false&language=en-US&page=1";
let searchResponse;
try {
  searchResponse = await tp.web.request(searchUrl);
} catch (e) {
  failGeneratedNote(`TMDB search error: ${e.message || e}`);
  return;
}
const results = searchResponse?.results || [];
if (!results.length) {
  failGeneratedNote(`No results for "${query}".`);
  return;
}
const limited = results.slice(0, 15);
const display = limited.map(r => {
  const title = r.title || r.original_title || "Unknown";
  const year = (r.release_date || "").slice(0, 4) || "????";
  const lang = (r.original_language || "").toUpperCase();
  return `${title} (${year}) [${lang}]`;
});
//---------------------------------------------------------------------
// 3) Pick movie
//---------------------------------------------------------------------
const chosenMovie = await tp.system.suggester(display, limited, true, "Pick a movie");
if (!chosenMovie) {
  failGeneratedNote("Selection cancelled.");
  return;
}
const movieId = chosenMovie.id;
//---------------------------------------------------------------------
// 4) Fetch one compact details payload; binary media is handled locally below
//---------------------------------------------------------------------
const detailsUrl =
  `https://api.themoviedb.org/3/movie/${movieId}` +
  `?api_key=${api_key}&language=en-US&append_to_response=credits,external_ids`;
let details, credits, externalIds;
try {
  details = await tp.web.request(detailsUrl);
  credits = details?.credits || {};
  externalIds = details?.external_ids || {};
} catch (e) {
  failGeneratedNote(`TMDB details error: ${e.message || e}`);
  return;
}
//---------------------------------------------------------------------
// 5) Extract fields
//---------------------------------------------------------------------
const movieTitle = (details.title || details.original_title || chosenMovie.title || query || fileTitle).trim();
const yearStr = (details.release_date || "").slice(0, 4);
const year = yearStr || "";
const genres = (details.genres || []).map(g => g.name).filter(Boolean);
const yamlEscape = value => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/"/g, '\\"')
  .replace(/\r?\n+/g, " ")
  .trim();
const plot = yamlEscape(details.overview || "");
const tagline = yamlEscape(details.tagline || "");
const runtime = details.runtime || "";
const published = details.release_date || "";
const imdbId = details.imdb_id || (externalIds && externalIds.imdb_id) || "";
const tmdbId = movieId;
//---------------------------------------------------------------------
// 5E) Local Code 128 barcode — IMDb numeric ID + TMDB ID
//---------------------------------------------------------------------
const BARCODE_FOLDER = "90_System/95_Media_Assets/Movies";
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function code128Svg(value) {
  const text = String(value || "");
  if (!text) return "";

  const dataCodes = [];
  for (const char of text) {
    const codePoint = char.charCodeAt(0);
    if (codePoint < 32 || codePoint > 126) {
      throw new Error(`Code 128-B cannot encode character: ${char}`);
    }
    dataCodes.push(codePoint - 32);
  }

  let checksum = 104;
  dataCodes.forEach((code, index) => {
    checksum += code * (index + 1);
  });
  checksum %= 103;

  const symbols = [104, ...dataCodes, checksum, 106];
  const quietZone = 10;
  let x = quietZone;
  const path = [];

  for (const symbol of symbols) {
    const pattern = CODE128_PATTERNS[symbol];
    let bar = true;
    for (const moduleWidth of pattern) {
      const width = Number(moduleWidth);
      if (bar) path.push(`M${x} 0h${width}v48h-${width}z`);
      x += width;
      bar = !bar;
    }
  }

  const totalWidth = x + quietZone;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 48" ` +
    `preserveAspectRatio="none" shape-rendering="crispEdges">` +
    `<path fill="#000" d="${path.join("")}"/></svg>\n`
  );
}

async function ensureBarcodeFolder(folderPath) {
  const normalizePath = tp.obsidian.normalizePath;
  const parts = normalizePath(folderPath).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!tp.app.vault.getAbstractFileByPath(current)) {
      await tp.app.vault.createFolder(current);
    }
  }
}

const imdbNumeric = String(imdbId || "").replace(/^tt/i, "").replace(/[^0-9]/g, "");
const tmdbNumeric = String(tmdbId || "").replace(/[^0-9]/g, "");
const barcodeValue = imdbNumeric
  ? imdbNumeric + (tmdbNumeric ? `-${tmdbNumeric}` : "")
  : tmdbNumeric;
let barcodeLink = "";

if (barcodeValue) {
  const normalizePath = tp.obsidian.normalizePath;
  const barcodeFileName = `${tmdbNumeric || imdbNumeric}-barcode.svg`;
  const barcodePath = normalizePath(`${BARCODE_FOLDER}/${barcodeFileName}`);
  await ensureBarcodeFolder(BARCODE_FOLDER);

  const collision = tp.app.vault.getFiles().find(
    file => file.name === barcodeFileName && normalizePath(file.path) !== barcodePath
  );
  if (collision) {
    throw new Error(`Barcode basename ${barcodeFileName} is already used by ${collision.path}.`);
  }

  const svg = code128Svg(barcodeValue);
  const existing = tp.app.vault.getAbstractFileByPath(barcodePath);
  if (existing) {
    if (existing.extension !== "svg") {
      throw new Error(`Barcode path exists but is not SVG: ${barcodePath}`);
    }
    await tp.app.vault.modify(existing, svg);
  } else {
    await tp.app.vault.create(barcodePath, svg);
  }
  barcodeLink = `[[${barcodeFileName}]]`;
}

const langCode = (details.original_language || "").toLowerCase();
//---------------------------------------------------------------------
// Language tag
//---------------------------------------------------------------------
const languageMap = {
  hi: "hindi", bn: "bengali", ta: "tamil", te: "telugu", kn: "kannada",
  ml: "malayalam", mr: "marathi", gu: "gujarati", pa: "punjabi", or: "odia",
  bho: "bhojpuri", sa: "sanskrit", ks: "kashmiri", as: "assamese", ur: "urdu",
  en: "english", ja: "japanese", ko: "korean", es: "spanish", fr: "french",
  de: "german", it: "italian", ru: "russian", zh: "chinese",
  tr: "turkish", th: "thai", id: "indonesian", fa: "persian", ar: "arabic",
  pt: "portuguese", vi: "vietnamese", he: "hebrew",
};
const languageTag = languageMap[langCode] || (langCode || "");
//---------------------------------------------------------------------
// Helper: check if a note exists
//---------------------------------------------------------------------
const PERSON_FOLDERS = ["References", ""];
async function noteExists(name) {
  const fileName = `${name}.md`;
  for (const folder of PERSON_FOLDERS) {
    const path = folder ? `${folder}/${fileName}` : fileName;
    try {
      const exists = await tp.file.exists(path);
      if (exists) return true;
    } catch (e) {}
  }
  return false;
}
//---------------------------------------------------------------------
// 5A) Directors
//---------------------------------------------------------------------
let directorNames = [];
const crew = credits?.crew || [];
for (const member of crew) {
  if (!member || !member.name) continue;
  if ((member.job || "").toLowerCase() === "director") directorNames.push(member.name);
}
{ const seen = new Set(); directorNames = directorNames.filter(n => !seen.has(n) && seen.add(n)); }
let directorsProcessed = [];
for (let i = 0; i < directorNames.length; i++) {
  const name = directorNames[i];
  if (i < 3) { directorsProcessed.push(`[[${name}]]`); }
  else { const exists = await noteExists(name); directorsProcessed.push(exists ? `[[${name}]]` : name); }
}
//---------------------------------------------------------------------
// 5B) Writers
//---------------------------------------------------------------------
let writerNames = [];
for (const member of crew) {
  if (!member || !member.name) continue;
  const dept = (member.department || "").toLowerCase();
  const job = (member.job || "").toLowerCase();
  if (dept === "writing" || job.includes("writer") || job.includes("screenplay") || job.includes("story") || job.includes("teleplay")) {
    writerNames.push(member.name);
  }
}
{ const seenW = new Set(); writerNames = writerNames.filter(n => !seenW.has(n) && seenW.add(n)); }
let writersProcessed = [];
for (let i = 0; i < writerNames.length; i++) {
  const name = writerNames[i];
  if (i < 3) { writersProcessed.push(`[[${name}]]`); }
  else { const exists = await noteExists(name); writersProcessed.push(exists ? `[[${name}]]` : name); }
}
//---------------------------------------------------------------------
// 5C) Cast
//---------------------------------------------------------------------
const rawCast = (credits?.cast || []).slice(0, 8).map(c => c.name).filter(Boolean);
let castProcessed = [];
for (let i = 0; i < rawCast.length; i++) {
  const actor = rawCast[i];
  if (i < 3) { castProcessed.push(`[[${actor}]]`); }
  else { const exists = await noteExists(actor); castProcessed.push(exists ? `[[${actor}]]` : actor); }
}
//---------------------------------------------------------------------
// 5D) Local cover + backdrop (90_System/95_Media_Assets; basename wikilinks)
//---------------------------------------------------------------------
let localMedia = { cover: "", backdrop: "" };
try {
  if (typeof tp.user.tmdb_media !== "function") {
    throw new Error("Templater user script tmdb_media.js is not loaded. Reload Obsidian once.");
  }
  localMedia = await tp.user.tmdb_media(tp, {
    mediaType: "movie",
    tmdbId,
    posterPath: details.poster_path || "",
    backdropPath: details.backdrop_path || "",
  });
} catch (error) {
  new tp.obsidian.Notice(`Movie media was not saved locally: ${error.message || error}`, 10000);
}
const localMediaLink = value => {
  const fileName = String(value || "").replace(/\\/g, "/").split("/").pop();
  return fileName ? `[[${fileName}]]` : "";
};
const coverLink = localMediaLink(localMedia.cover);
const backdropLink = localMediaLink(localMedia.backdrop);
//---------------------------------------------------------------------
// 6) Rating (1–10 to match the ten-point rating view)
//---------------------------------------------------------------------
const ratingChoices = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
let rating = await tp.system.suggester(ratingChoices, ratingChoices, false, "Pick your rating (1–10)");
if (!rating) rating = "";
//---------------------------------------------------------------------
// 6.5) Last watched date — use Natural Language Dates when available;
// otherwise fall back to Templater's built-in date handling.
//---------------------------------------------------------------------
const nldatesPlugin = tp.app.plugins.getPlugin("nldates-obsidian");
const presets = ["Today", "Yesterday", "Tomorrow"];
const dayOffset = { Today: 0, Yesterday: -1, Tomorrow: 1 };
const picked = await tp.system.suggester(presets, presets, false, "Last watched date (Esc = type)");

let lastDate;
if (picked) {
  lastDate = tp.date.now("YYYY-MM-DD", dayOffset[picked]);
} else {
  const typed = await tp.system.prompt("Enter last watched date (natural language or YYYY-MM-DD)", "today");
  if (typed && nldatesPlugin) {
    const parsed = nldatesPlugin.parseDate(typed)?.moment;
    lastDate = parsed && parsed.isValid() ? parsed.format("YYYY-MM-DD") : tp.date.now("YYYY-MM-DD");
  } else if (typed && typed.trim()) {
    // Without Natural Language Dates, preserve the value as entered; YYYY-MM-DD is recommended.
    lastDate = typed.trim();
  } else {
    lastDate = tp.date.now("YYYY-MM-DD");
  }
}
//---------------------------------------------------------------------
// 7) File rename + aliases
//---------------------------------------------------------------------
const colonFixed = movieTitle.replace(/\s*:\s*/g, " - ");
const illegalRe = /[\\\/#%&{}<>*?$!'"@+`|=]/g;
let sanitizedTitle = colonFixed.replace(illegalRe, "").trim();
if (!sanitizedTitle) sanitizedTitle = fileTitle;
const requiresAlias = sanitizedTitle !== movieTitle;
if (sanitizedTitle !== fileTitle) await tp.file.rename(sanitizedTitle);
//---------------------------------------------------------------------
// 8) Build YAML
//---------------------------------------------------------------------
const today = tp.date.now("YYYY-MM-DD");
let lines = [];
lines.push("---");
lines.push("categories:");
lines.push('  - "[[Movies]]"');
// Genres
if (genres.length) {
  lines.push("genres:");
  for (const g of genres) lines.push(`  - "${yamlEscape(`[[${g}]]`)}"`);
} else {
  lines.push("genres: []");
}
// Directors
if (directorsProcessed.length) {
  lines.push("directors:");
  for (const d of directorsProcessed) lines.push(`  - "${yamlEscape(d)}"`);
} else {
  lines.push("directors: []");
}
// Writers
if (writersProcessed.length) {
  lines.push("writers:");
  for (const w of writersProcessed) lines.push(`  - "${yamlEscape(w)}"`);
} else {
  lines.push("writers: []");
}
// Cast
if (castProcessed.length) {
  lines.push("cast:");
  for (const c of castProcessed) lines.push(`  - "${yamlEscape(c)}"`);
} else {
  lines.push("cast: []");
}
// Cover
lines.push(coverLink ? `cover: "${yamlEscape(coverLink)}"` : "cover: []");
// Backdrop
if (backdropLink) {
  lines.push("backdrop:");
  lines.push(`  - "${yamlEscape(backdropLink)}"`);
} else {
  lines.push("backdrop: []");
}
// Description
lines.push(`description: "${plot}"`);
lines.push(`tagline: "${tagline}"`);
lines.push(`year: ${year}`);
lines.push(`rating: ${rating}`);
lines.push(`status: ""`); // The Media view can update Queue / Watching / Finished.
lines.push(`runtime: ${runtime}`);
lines.push(`published: ${published}`);
lines.push(`language: "${yamlEscape(languageTag)}"`);
lines.push(`created: ${today}`);
lines.push(`last: ${lastDate}`);
lines.push(`imdbId: ${imdbId}`);
lines.push(`tmdbId: ${tmdbId}`);
lines.push(barcodeLink ? `barcode: "${yamlEscape(barcodeLink)}"` : 'barcode: ""');
lines.push("via:");
// Aliases
if (requiresAlias) {
  lines.push("aliases:");
  lines.push(`  - "${yamlEscape(movieTitle)}"`);
}
lines.push("---");
tR += lines.join("\n");
} catch (error) {
  failGeneratedNote(error);
  return;
}
%>