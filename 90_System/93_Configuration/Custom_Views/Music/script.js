const musicContext = tp;
const musicContainer = musicContext.container || this;
const musicRoot = musicContainer.querySelector(".cv-music");
if (musicRoot) {
  const musicApp = musicContext.app;
  const musicFile = musicContext.file;
  const musicDocument = musicContext.activeDocument || musicRoot.ownerDocument;
  const musicFrontmatter = { ...(musicContext.frontmatter || {}) };
  const musicKind = musicRoot.dataset.musicKind === "album" ? "album" : "song";
  const musicQ = selector => musicRoot.querySelector(selector);
  const musicText = value => String(value == null ? "" : value).trim();
  const musicList = value => Array.isArray(value) ? value : (value ? [value] : []);
  const musicUnique = items => Array.from(new Set(items.map(musicText).filter(Boolean)));
  const musicCleanWiki = value => {
    const raw = musicText(value);
    const matched = raw.match(/^!?\[\[([^\]]+)\]\]$/);
    return matched ? (matched[1].split("|").slice(-1)[0] || raw) : raw;
  };
  const musicGet = key => musicFrontmatter[key] ?? musicFrontmatter[key.toLowerCase()] ?? "";
  const musicSet = (selector, value) => {
    const el = musicQ(selector);
    if (el) el.textContent = musicText(value);
    return el;
  };
  const musicDetails = musicQ('[data-role="music-details"]');

  function musicSourceImage(value) {
    const raw = musicText(Array.isArray(value) ? value[0] : value);
    if (/^https:\/\//i.test(raw)) return raw;
    if (/^http:\/\//i.test(raw)) return "";
    const matched = raw.match(/^!?\[\[([^\]]+)\]\]$/);
    const candidate = matched ? matched[1].split("|")[0] : raw;
    if (!candidate || !musicApp?.metadataCache || !musicFile) return "";
    const file = musicApp.metadataCache.getFirstLinkpathDest(candidate, musicFile.path);
    return file ? musicApp.vault.getResourcePath(file) : "";
  }
  function musicSetCover() {
    const image = musicQ('[data-role="music-cover"]');
    const fallback = musicQ('[data-role="music-cover-fallback"]');
    if (!image || !fallback) return;
    const url = musicSourceImage(musicGet("Cover"));
    if (!url) { image.hidden = true; fallback.hidden = false; return; }
    image.onload = () => { image.hidden = false; fallback.hidden = true; };
    image.onerror = () => { image.hidden = true; fallback.hidden = false; };
    image.src = url;
    image.hidden = false;
    fallback.hidden = true;
  }
  function musicDuration(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "";
    const secs = Math.round(n);
    const mins = Math.floor(secs / 60);
    return (mins >= 60 ? Math.floor(mins / 60) + " hr " + mins % 60 + " min" : mins + " min " + secs % 60 + " sec");
  }
  function musicDetail(label, value) {
    const textValue = musicText(value);
    if (!musicDetails || !textValue || textValue === "0") return;
    const row = musicDocument.createElement("div");
    const dt = musicDocument.createElement("dt");
    dt.textContent = label;
    const dd = musicDocument.createElement("dd");
    dd.textContent = textValue;
    row.append(dt, dd);
    musicDetails.appendChild(row);
  }
  function musicRenderMetadata() {
    musicSet('[data-role="music-title"]', musicGet("Title") || musicFile?.basename || "Untitled");
    musicSet('[data-role="music-artist"]', musicGet("Artist") || musicGet("AlbumArtist") || "Unknown artist");
    const year = Number(musicGet("Year") || 0);
    musicSet('[data-role="music-year"]', year > 0 ? String(year) : musicText(musicGet("ReleaseDate")).slice(0, 4) || "Undated");
    const length = musicDuration(musicGet("Duration"));
    musicSet('[data-role="music-duration"]', length || "Duration unknown");
    const trackCount = Number(musicGet("TrackCount") || 0);
    if (musicKind === "album") {
      musicSet('[data-role="music-tracks"]', trackCount ? trackCount + " tracks" : "Tracklist pending");
    } else {
      const disc = Number(musicGet("DiscNumber") || 0);
      const track = Number(musicGet("TrackNumber") || 0);
      musicSet('[data-role="music-track"]', track ? (disc > 1 ? "Disc " + disc + " · " : "") + "Track " + track : "Single / recording");
    }
    const genres = musicQ('[data-role="music-genres"]');
    if (genres) {
      genres.replaceChildren();
      for (const value of musicUnique(musicList(musicGet("Genre")).map(musicCleanWiki)).slice(0, 8)) {
        const span = musicDocument.createElement("span");
        span.textContent = value;
        genres.appendChild(span);
      }
    }
    musicSet('[data-role="music-description"]', musicGet("Description"));
    const source = musicQ('[data-role="music-source-link"]');
    const url = musicText(musicGet("StoreUrl") || musicGet("SourceUrl"));
    if (source) {
      if (/^https:\/\//i.test(url)) {
        source.href = url;
        source.hidden = false;
      } else source.hidden = true;
    }
    if (musicDetails) musicDetails.replaceChildren();
    if (musicKind === "album") {
      musicDetail("Album artist", musicGet("AlbumArtist"));
      musicDetail("Release", musicGet("ReleaseDate"));
      musicDetail("Label", musicGet("Label"));
      musicDetail("Country", musicGet("Country"));
      musicDetail("Format", musicGet("Format"));
      musicDetail("MusicBrainz", musicGet("MusicBrainzId"));
      musicDetail("Source", musicGet("Source"));
    } else {
      musicDetail("Album", musicCleanWiki(musicGet("Album")));
      musicDetail("Album artist", musicGet("AlbumArtist"));
      musicDetail("Released", musicGet("ReleaseDate"));
      musicDetail("Track", musicGet("TrackNumber"));
      musicDetail("Disc", musicGet("DiscNumber"));
      musicDetail("ISRC", musicGet("ISRC"));
      musicDetail("MusicBrainz", musicGet("MusicBrainzId"));
      musicDetail("Source", musicGet("Source"));
    }
    if (musicKind === "song") {
      const albumButton = musicQ('[data-role="music-open-album"]');
      const album = musicText(musicGet("Album"));
      const matched = album.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
      if (albumButton && matched) {
        albumButton.hidden = false;
        albumButton.onclick = () => { void musicApp.workspace.openLinkText(matched[1], musicFile.path); };
      }
    }
  }
  function musicRenderTracklist() {
    if (musicKind !== "album") return;
    const list = musicQ('[data-role="music-tracklist"]');
    if (!list) return;
    list.replaceChildren();
    const tracks = musicList(musicGet("Tracklist"));
    musicSet('[data-role="music-track-count"]', tracks.length ? tracks.length + " tracks" : "No tracks");
    for (let i = 0; i < tracks.length; i++) {
      const value = musicText(tracks[i]);
      const matched = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
      const item = musicDocument.createElement("li");
      const number = musicDocument.createElement("span");
      number.className = "cv-music-track-index";
      number.textContent = String(i + 1).padStart(2, "0");
      item.appendChild(number);
      if (matched) {
        const button = musicDocument.createElement("button");
        button.type = "button";
        button.textContent = matched[2] || matched[1];
        button.addEventListener("click", () => {
          if (musicApp?.workspace && musicFile) void musicApp.workspace.openLinkText(matched[1], musicFile.path);
        });
        item.appendChild(button);
      } else {
        const label = musicDocument.createElement("span");
        label.className = "cv-music-track-name";
        label.textContent = value || "Untitled track";
        item.appendChild(label);
      }
      list.appendChild(item);
    }
    if (!tracks.length) {
      const item = musicDocument.createElement("li");
      const span = musicDocument.createElement("span");
      span.className = "cv-music-track-name";
      span.textContent = "Tracklist not available. Add tracks using the Album note properties.";
      item.appendChild(span);
      list.appendChild(item);
    }
  }
  let musicWriteQueue = Promise.resolve();
  function musicUpdate(property, value) {
    if (!musicApp?.fileManager?.processFrontMatter || !musicFile) return Promise.reject(new Error("Music note is unavailable"));
    const operation = musicWriteQueue.then(() => musicApp.fileManager.processFrontMatter(musicFile, frontmatter => {
      frontmatter[property] = value;
    }));
    musicWriteQueue = operation.catch(() => {});
    return operation;
  }
  function musicFeedback(message) { musicSet('[data-role="music-feedback"]', message); }
  function musicRenderFavourite() {
    const button = musicQ('[data-role="music-favourite"]');
    if (!button) return;
    const active = musicGet("Favourite") === true || musicGet("Favourite") === "true";
    button.setAttribute("aria-pressed", String(active));
    const icon = button.querySelector("span");
    if (icon) icon.textContent = active ? "♥" : "♡";
    musicSet('[data-role="music-favourite-label"]', active ? "Favourite" : "Add favourite");
  }
  const musicFavButton = musicQ('[data-role="music-favourite"]');
  if (musicFavButton) {
    musicFavButton.addEventListener("click", async () => {
      const previous = musicGet("Favourite") === true || musicGet("Favourite") === "true";
      musicFrontmatter.Favourite = !previous;
      musicRenderFavourite();
      musicFavButton.disabled = true;
      try { await musicUpdate("Favourite", !previous); musicFeedback("Favourite saved"); }
      catch (_) { musicFrontmatter.Favourite = previous; musicRenderFavourite(); musicFeedback("Could not save favourite"); }
      finally { musicFavButton.disabled = false; }
    });
  }
  function musicRenderRating() {
    const rating = Math.min(5, Math.max(0, Number(musicGet("PersonalRating") || 0)));
    for (const button of musicRoot.querySelectorAll("[data-music-rate]")) {
      const value = Number(button.dataset.musicRate);
      button.classList.toggle("is-active", value <= rating);
      button.setAttribute("aria-pressed", String(value === rating));
    }
    musicSet('[data-role="music-rating-value"]', rating ? rating + " / 5" : "Unrated");
  }
  for (const button of musicRoot.querySelectorAll("[data-music-rate]")) {
    button.addEventListener("click", async () => {
      const next = Number(button.dataset.musicRate);
      const previous = Number(musicGet("PersonalRating") || 0);
      musicFrontmatter.PersonalRating = next;
      musicRenderRating();
      try { await musicUpdate("PersonalRating", next); musicFeedback("Rating saved"); }
      catch (_) { musicFrontmatter.PersonalRating = previous; musicRenderRating(); musicFeedback("Could not save rating"); }
    });
  }
  musicRenderMetadata();
  musicSetCover();
  musicRenderTracklist();
  musicRenderFavourite();
  musicRenderRating();
}
