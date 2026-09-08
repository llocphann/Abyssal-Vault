const MEDIA_ROOT = "90_System/95_Media_Assets";
const TMDB_IMAGE_ROOT = "https://image.tmdb.org/t/p";

function imageExtension(filePath) {
  const match = String(filePath || "").match(/\.(jpe?g|png|webp)$/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function mediaFolder(mediaType) {
  return String(mediaType || "").toLowerCase() === "tv"
    ? "TV_Series"
    : "Movies";
}

async function ensureFolder(vault, normalizePath, folderPath) {
  const parts = normalizePath(folderPath).split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!vault.getAbstractFileByPath(current)) {
      await vault.createFolder(current);
    }
  }
}

module.exports = async function downloadTmdbMedia(tp, options = {}) {
  const vault = tp?.app?.vault;
  const requestUrl = tp?.obsidian?.requestUrl;
  const normalizePath = tp?.obsidian?.normalizePath;
  const Notice = tp?.obsidian?.Notice;
  const tmdbId = String(options.tmdbId || "").replace(/[^0-9]/g, "");

  if (!vault || typeof requestUrl !== "function" || typeof normalizePath !== "function") {
    throw new Error("Templater could not access the Obsidian binary download APIs.");
  }
  if (!tmdbId) throw new Error("A numeric TMDB id is required for local media files.");

  const folder = normalizePath(`${MEDIA_ROOT}/${mediaFolder(options.mediaType)}`);
  await ensureFolder(vault, normalizePath, folder);

  async function download(role, filePath, size) {
    if (!filePath) return "";

    const extension = imageExtension(filePath);
    const fileName = `${tmdbId}-${role}.${extension}`;
    const targetPath = normalizePath(`${folder}/${fileName}`);
    const collision = typeof vault.getFiles === "function"
      ? vault.getFiles().find(file => file.name === fileName && normalizePath(file.path) !== targetPath)
      : null;
    if (collision) {
      throw new Error(`Basename ${fileName} is already used by ${collision.path}.`);
    }
    if (vault.getAbstractFileByPath(targetPath)) return fileName;

    const sourcePath = String(filePath).startsWith("/") ? filePath : `/${filePath}`;
    const response = await requestUrl({
      url: `${TMDB_IMAGE_ROOT}/${size}${sourcePath}`,
      method: "GET",
    });

    if (response.status < 200 || response.status >= 300 || !response.arrayBuffer?.byteLength) {
      throw new Error(`TMDB ${role} download returned status ${response.status}.`);
    }

    await vault.createBinary(targetPath, response.arrayBuffer);
    return fileName;
  }

  const jobs = {
    cover: download("cover", options.posterPath, "w500"),
    backdrop: download("backdrop", options.backdropPath, "w1280"),
  };
  const entries = Object.entries(jobs);
  const settled = await Promise.allSettled(entries.map(([, job]) => job));
  const result = { cover: "", backdrop: "", failures: [] };

  settled.forEach((outcome, index) => {
    const role = entries[index][0];
    if (outcome.status === "fulfilled") {
      result[role] = outcome.value;
    } else {
      result.failures.push(`${role}: ${outcome.reason?.message || outcome.reason}`);
    }
  });

  if (result.failures.length && typeof Notice === "function") {
    new Notice(`TMDB local media warning: ${result.failures.join(" | ")}`, 10000);
  }

  return result;
};
