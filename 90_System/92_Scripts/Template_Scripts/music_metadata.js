// Keep provider requests bounded across template runs in one Obsidian session.
// JSON only: this cache never downloads artwork, previews, or audio.
const musicSessions = new WeakMap();
module.exports = async function musicMetadata(tp, mode) {
  const enriching = mode === "enrich";
  const refreshing = mode === "refresh" || enriching;
  const refreshPath = tp?.config?.target_file?.path || tp?.app?.workspace?.getActiveFile?.()?.path || "";
  const kind = mode === "album" || (refreshing && /\/Albums\//.test(refreshPath)) ? "album" : "song";
  const MUSIC_ROOT = "20_Personal_Life/28_Music_Tracker";
  const SONG_FOLDER = MUSIC_ROOT + "/Songs";
  const ALBUM_FOLDER = MUSIC_ROOT + "/Albums";
  const LYRICS_FOLDER = MUSIC_ROOT + "/Lyrics";
  const MUSICBRAINZ = "https://musicbrainz.org/ws/2";
  const COVER_ART = "https://coverartarchive.org";
  const ITUNES = "https://itunes.apple.com";
  const USER_AGENT = "Abyssal-Vault/1.0 (https://github.com/llocphann/Abyssal-Vault)";
  const target = tp.config && tp.config.target_file;
  const originalTitle = String(tp.file && tp.file.title || "").trim();
  let existingContent = typeof tp.file.content === "string" ? tp.file.content : "";

  if (!existingContent && target && Number(target.stat && target.stat.size || 0) > 0) {
    try { existingContent = await tp.app.vault.read(target); } catch (_) {}
  }
  // Album-generated Song notes already contain metadata. Preserve them if the
  // folder template is triggered by create_new().
  if (existingContent.trim() && !refreshing) return existingContent;

  const untitled = !originalTitle || /^Untitled(?: \d+)?$/i.test(originalTitle);
  const today = tp.date.now("YYYY-MM-DD");
  const fallbackTitle = untitled
    ? (kind === "album" ? "Album " : "Song ") + tp.date.now("YYYYMMDD-HHmmss")
    : originalTitle;
  const notify = message => {
    if (enriching) return;
    try { if (tp.obsidian && tp.obsidian.Notice) new tp.obsidian.Notice(message, 8000); } catch (_) {}
  };
  const txt = value => String(value == null ? "" : value).trim();
  const unique = values => Array.from(new Set((Array.isArray(values) ? values : []).map(txt).filter(Boolean)));
  const yaml = value => JSON.stringify(txt(value).replace(/\r?\n/g, " ").replace(/\u0000/g, ""));
  const yearOf = value => /^\d{4}/.test(txt(value)) ? Number(txt(value).slice(0, 4)) : 0;
  const sanitizeName = value => txt(value)
    .replace(/\s*:\s*/g, " - ")
    .replace(/[\\\/#%&{}<>*?$!'"@+|=]/g, "")
    .replace(/\s+/g, " ")
    .trim() || (kind === "album" ? "Untitled Album" : "Untitled Song");
  const creditName = credit => (Array.isArray(credit) ? credit : []).map(item => {
    if (typeof item === "string") return item;
    const name = txt(item && (item.name || (item.artist && item.artist.name)));
    const join = String(item && item.joinphrase != null ? item.joinphrase : "").replace(/\r?\n/g, " ").replace(/^\s*&\s*$/, " & ");
    return name + join;
  }).join("").replace(/\s*&\s*/g, " & ").replace(/\s{2,}/g, " ").trim();
  const formatGenre = value => {
    const raw = txt(value);
    if (!raw) return "";
    if (raw !== raw.toLowerCase()) return raw;
    if (raw === "r&b" || raw === "r & b") return "R&B";
    return raw.replace(/\b([a-z])/g, char => char.toUpperCase());
  };
  const extractGenreList = (source, titleText) => {
    if (!source || typeof source !== "object") return [];
    const seasonal = /christmas|noel|xmas|holiday|winter|santa|jingle|silent night/i.test(txt(titleText));
    const list = type => (Array.isArray(source[type]) ? source[type] : [])
      .filter(item => typeof item === "string" || (item && item.name && (item.count == null || Number(item.count) > 0)))
      .slice()
      .sort((a, b) => (typeof b === "object" ? Number(b.count ?? 1) : 1) - (typeof a === "object" ? Number(a.count ?? 1) : 1))
      .map(item => typeof item === "string" ? item : item.name)
      .filter(name => seasonal || !/^christmas\b/i.test(txt(name)))
      .map(formatGenre);
    return unique([...list("genres"), ...list("tags")]);
  };
  const genreNames = record => {
    if (!record || typeof record !== "object") return [];
    const titleText = txt(record.title);
    const direct = extractGenreList(record, titleText);
    if (direct.length) return direct.slice(0, 8);
    const related = unique([
      ...extractGenreList(record["release-group"], titleText),
      ...(Array.isArray(record.releases) ? record.releases : []).flatMap(rel => [
        ...extractGenreList(rel, titleText),
        ...extractGenreList(rel && rel["release-group"], titleText)
      ]),
      ...(Array.isArray(record.relations) ? record.relations : []).flatMap(rel => [
        ...extractGenreList(rel && rel.work, titleText),
        ...extractGenreList(rel && rel.release, titleText)
      ]),
      ...(Array.isArray(record.media) ? record.media : []).flatMap(medium =>
        (Array.isArray(medium && medium.tracks) ? medium.tracks : []).flatMap(track =>
          extractGenreList(track && track.recording, titleText)))
    ]);
    if (related.length) return related.slice(0, 8);
    const artistGenres = unique([
      ...(Array.isArray(record["artist-credit"]) ? record["artist-credit"] : []).flatMap(credit =>
        extractGenreList(credit && credit.artist, titleText)),
      ...(Array.isArray(record.releases) ? record.releases : []).flatMap(rel =>
        (Array.isArray(rel && rel["artist-credit"]) ? rel["artist-credit"] : []).flatMap(credit =>
          extractGenreList(credit && credit.artist, titleText)))
    ]);
    return artistGenres.slice(0, 8);
  };
  const formatDuration = milliseconds => {
    const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
    return seconds ? Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0") : "";
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let session = musicSessions.get(tp.app);
  if (!session) {
    session = { cache: new Map(), queues: {}, last: {} };
    musicSessions.set(tp.app, session);
  }
  async function withTimeout(operation, seconds) {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Music metadata request timed out")), (seconds || 15) * 1000);
        })
      ]);
    } finally {
      if (timer != null) clearTimeout(timer);
    }
  }
  async function requestJson(url, extraHeaders) {
    if (!tp.obsidian || typeof tp.obsidian.requestUrl !== "function") throw new Error("Obsidian requestUrl is unavailable.");
    const cached = session.cache.get(url);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const provider = url.startsWith(MUSICBRAINZ + "/") ? "musicbrainz" : url.startsWith(ITUNES + "/") ? "apple" : "other";
    const gap = provider === "musicbrainz" ? 1100 : provider === "apple" ? 3100 : 0;
    const operation = async () => {
      const wait = gap - (Date.now() - (session.last[provider] || 0));
      if (wait > 0) await sleep(wait);
      session.last[provider] = Date.now();
      const headers = Object.assign({ Accept: "application/json" }, extraHeaders || {});
      const response = await withTimeout(() => tp.obsidian.requestUrl({ url, method: "GET", headers }), 15);
      if (response.status != null && (response.status < 200 || response.status >= 300)) throw new Error("HTTP " + response.status);
      return response.json != null ? response.json : JSON.parse(response.text || "{}");
    };
    const promise = gap ? (session.queues[provider] || Promise.resolve()).catch(() => {}).then(operation) : operation();
    if (gap) session.queues[provider] = promise;
    const entry = { promise, expires: Date.now() + 3600000 };
    session.cache.set(url, entry);
    promise.catch(() => { entry.expires = Date.now() + 60000; });
    if (session.cache.size > 128) session.cache.delete(session.cache.keys().next().value);
    return promise;
  }

  async function musicBrainzJson(url) {
    return requestJson(url, { "User-Agent": USER_AGENT });
  }
  const validImage = value => /^https:\/\/[a-z0-9.-]+\//i.test(txt(value)) ? txt(value).replace(/\/100x100(bb\.[a-z0-9]+)$/i, "/600x600$1") : "";
  const normName = value => txt(value).normalize("NFKC").toLowerCase()
    .replace(/\([^)]*(?:feat|ft|remaster|version)[^)]*\)/gi,"")
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff]+/gi," ").trim();
  const matches = (a,b) => {
    const x=normName(a),y=normName(b);
    return !!x&&!!y&&(x===y||(x.length>7&&y.length>7&&(x.startsWith(y+" ")||y.startsWith(x+" "))));
  };
  // Enrichment requires the same edition. Prefix matches and stripped version
  // suffixes are useful for search, but unsafe for merging provider records.
  const exactName = value => txt(value).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const sameName = (a, b) => Boolean(exactName(a)) && exactName(a) === exactName(b);
  const empty = value => value == null || (Array.isArray(value) ? !value.length : typeof value === "number" ? !Number.isFinite(value) || value <= 0 : typeof value === "string" ? !value.trim() || value.trim() === "0" : false);
  const editionWords = value => unique((txt(value).toLowerCase().match(/\b(live|remix|acoustic|instrumental|demo|karaoke|mono|stereo)\b/g) || [])).sort().join(" ");
  const compatibleRecord = (item, expected, entity, songCount) => {
    if (!sameName(entity === "album" ? item.collectionName : item.trackName, expected.title) || !sameName(item.artistName, expected.artist)) return false;
    if (entity === "song" && expected.album && !sameName(item.collectionName, expected.album)) return false;
    const edition = editionWords([expected.title, expected.album, expected.description].join(" "));
    if (edition !== editionWords([item.trackName, item.collectionName, item.description].join(" "))) return false;
    if (entity === "album" && Number(expected.trackCount) > 0 && Number(item.trackCount) > 0 &&
        Number(expected.trackCount) !== Number(item.trackCount) &&
        (!Number(songCount) || Number(expected.trackCount) !== Number(songCount))) return false;
    const duration = Number(expected.durationMs || 0), actual = Number(item.trackTimeMillis || 0);
    return entity !== "song" || !duration || !actual || Math.abs(duration - actual) <= Math.max(5000, duration * 0.02);
  };
  function appleIdentity(storeUrl, entity) {
    try {
      const url = new URL(storeUrl);
      if (!/^(music\.apple\.com|itunes\.apple\.com)$/.test(url.hostname)) return {};
      const pathId = (url.pathname.match(/\/(?:id)?(\d+)\/?$/) || [])[1] || "";
      return { id: entity === "song" ? url.searchParams.get("i") || (/\/song\//.test(url.pathname) ? pathId : "") : pathId || url.searchParams.get("id") || "",
        country: (url.pathname.match(/^\/([a-z]{2})\//i) || [])[1] || "US" };
    } catch (_) { return {}; }
  }
  async function appleMetadata(expected, entity) {
    if (!expected.title || !expected.artist) return { item: null };
    const store = appleIdentity(expected.storeUrl, entity);
    const id = txt(entity === "album" ? expected.appleCollectionId : expected.appleTrackId) || store.id;
    const countries = unique([store.country || "US", "VN", "US"]);
    let checked = false, failed = false;
    if (/^\d+$/.test(id)) {
      for (const country of countries.slice(0, 2)) {
        try {
          const data = await requestJson(ITUNES + "/lookup?id=" + encodeURIComponent(id) + "&country=" + country + (entity === "album" ? "&entity=song&limit=200" : ""));
          checked = true;
          const item = (data.results || []).find(value => String(entity === "album" ? value.collectionId : value.trackId) === id &&
            (entity === "album" ? value.wrapperType === "collection" : value.kind === "song"));
          if (!item) continue;
          if (!txt(entity === "album" ? item.collectionName : item.trackName) || !txt(item.artistName)) { failed = true; continue; }
          const songCount = entity === "album" ? (data.results || []).filter(value => value.kind === "song" && String(value.collectionId) === id).length : 0;
          if (!compatibleRecord(item, expected, entity, songCount)) return { item: null, conflict: "Apple record differs in title, artist, album, version, or duration. Existing metadata was preserved." };
          return { item, results: data.results || [], checked: true };
        } catch (_) { failed = true; }
      }
    }
    // A stored ID that cannot be resolved must not be silently replaced by a
    // different edition from a name search.
    if (/^\d+$/.test(id)) return { item: null, checked, failed };
    for (const country of countries.slice(0, 2)) {
      try {
        const data = await requestJson(ITUNES + "/search?term=" + encodeURIComponent(expected.title + " " + expected.artist) + "&entity=" + entity + "&limit=30&country=" + country);
        checked = true;
        const items = (data.results || []).filter(item => compatibleRecord(item, expected, entity));
        // Without an album or stable ID, several distinct releases are ambiguous.
        const identities = unique(items.map(item => entity === "album" ? item.collectionId : item.collectionId + ":" + item.trackTimeMillis));
        if (items.length && identities.length === 1) return { item: items[0], checked: true };
      } catch (_) { failed = true; }
    }
    return { item: null, checked, failed };
  }
  const fieldValue = (object, key) => object?.[key] ?? object?.[key.toLowerCase()] ?? "";
  const plainAlbum = value => txt(value).replace(/^\[\[(.*?)\]\]$/, "$1").split("|")[0].split("/").pop();
  const durationMatches = (a, b) => !Number(a) || !Number(b) || Math.abs(Number(a) - Number(b)) <= Math.max(5000, Number(a) * 0.02);
  function mbIdentity(value, entity) {
    const match = txt(value).match(/^https:\/\/musicbrainz\.org\/(recording|release)\/([a-z0-9-]+)(?:[/?#]|$)/i);
    return match && match[1] === (entity === "album" ? "release" : "recording") ? match[2] : "";
  }
  function relationshipMetadata(record) {
    // Work languages describe the performed composition. Release text language
    // only describes its printed metadata and is deliberately not used here.
    const relations = Array.isArray(record?.relations) ? record.relations : [];
    const works = relations.filter(relation => relation.type === "performance" && relation.work).map(relation => relation.work);
    const credits = [...relations, ...works.flatMap(work => work.relations || [])];
    const names = types => unique(credits.filter(relation => types.includes(relation.type) && relation.artist)
      .map(relation => relation["target-credit"] || relation.artist.name));
    return { Composer: names(["composer"]), Writer: names(["writer", "lyricist"]), Producer: names(["producer"]),
      Language: unique(works.flatMap(work => [...(work.languages || []), work.language]).filter(value => value && value !== "zxx" && value !== "mul")) };
  }
  function releaseMetadata(release) {
    const group = release?.["release-group"] || {};
    const media = Array.isArray(release?.media) ? release.media : [];
    const tracks = media.flatMap(medium => (medium.tracks || []).map(track => ({ ...track, medium })));
    const date = txt(release?.date);
    return { AlbumArtist: creditName(release?.["artist-credit"]), ReleaseDate: date, Year: yearOf(date),
      Genre: genreNames(release).length ? genreNames(release) : genreNames(group),
      TrackCount: media.reduce((total, medium) => total + Number(medium["track-count"] || medium.tracks?.length || 0), 0),
      Duration: tracks.length && tracks.every(track => Number(track.length || track.recording?.length) > 0)
        ? Math.round(tracks.reduce((sum, track) => sum + Number(track.length || track.recording?.length || 0), 0) / 1000) : 0,
      Label: unique((release?.["label-info"] || []).map(entry => entry.label?.name)).join(", "),
      Country: txt(release?.country), Format: unique(media.map(medium => medium.format)).join(", "),
      ReleaseType: unique([group["primary-type"], ...(group["secondary-types"] || [])]).join(" · "),
      Description: txt(release?.disambiguation || group.disambiguation),
      Tracklist: tracks.map(track => txt(track.title || track.recording?.title)).filter(Boolean),
      ...relationshipMetadata(release) };
  }
  async function enrichFrontmatter(frontmatter, entity) {
    const field = key => fieldValue(frontmatter, key);
    const expected = { title: txt(field("Title")), artist: txt(field("Artist") || field("AlbumArtist")),
      album: plainAlbum(field("Album")), durationMs: Number(field("Duration") || 0) * 1000,
      description: txt(field("Description")), trackCount: Number(field("TrackCount") || 0), storeUrl: txt(field("StoreUrl")),
      appleTrackId: txt(field("AppleTrackId")), appleCollectionId: txt(field("AppleCollectionId")) };
    const patch = {}, sources = [], warnings = [];
    let checked = false, failed = false, recording = null, release = null, matchedAppleTracks = [];
    const add = values => { for (const [key, value] of Object.entries(values)) if (empty(field(key)) && !empty(value) && empty(patch[key])) patch[key] = value; };
    const mbid = txt(field("MusicBrainzId")) || mbIdentity(field("SourceUrl"), entity);
    const endpoint = entity === "album" ? "release" : "recording";
    const mbUrl = id => MUSICBRAINZ + "/" + endpoint + "/" + encodeURIComponent(id) +
      (entity === "album" ? "?inc=artists+recordings+release-groups+labels+tags+genres+artist-rels&fmt=json"
        : "?inc=artists+releases+isrcs+tags+genres+artist-rels+work-rels+work-level-rels&fmt=json");
    if (/^[a-z0-9-]{3,64}$/i.test(mbid)) {
      try {
        const record = await musicBrainzJson(mbUrl(mbid));
        checked = true;
        if (!record.id || !txt(record.title) || !creditName(record["artist-credit"])) {
          failed = true;
        } else if (record.id !== mbid || !sameName(record.title, expected.title) || !sameName(creditName(record["artist-credit"]), expected.artist) ||
          (entity === "song" && !durationMatches(expected.durationMs, record.length))) {
          warnings.push("The saved MusicBrainz ID differs in title, artist, or duration. Existing metadata was preserved.");
        } else {
          sources.push("MusicBrainz");
          if (entity === "album") release = record;
          else {
            recording = record;
            const releases = (record.releases || []).filter(value => value.id);
            const matches = expected.album ? releases.filter(value => sameName(value.title, expected.album)) : releases;
            if (expected.album && releases.length && !matches.length) {
              warnings.push("The saved MusicBrainz recording belongs to a different album or edition. Existing metadata was preserved.");
            } else {
              const identities = unique(matches.map(value => value.id));
              const chosen = matches.find(value => txt(value.id) === txt(field("MusicBrainzReleaseId"))) || (identities.length === 1 ? matches[0] : null);
              if (chosen) {
                release = chosen;
                try {
                  const details = await musicBrainzJson(MUSICBRAINZ + "/release/" + encodeURIComponent(chosen.id) + "?inc=artists+recordings+release-groups+labels+tags+genres+artist-rels&fmt=json");
                  if (!details.id || !txt(details.title)) failed = true;
                  else if (details.id !== chosen.id || !sameName(details.title, chosen.title))
                    warnings.push("The MusicBrainz release lookup returned a different album or edition. Existing metadata was preserved.");
                  else release = details;
                }
                catch (_) { failed = true; }
              }
            }
          }
        }
      } catch (_) { failed = true; }
    }
    if (recording && !warnings.length) {
      const releaseValues = release ? releaseMetadata(release) : {};
      const tracks = (release?.media || []).flatMap(medium => (medium.tracks || []).map(track => ({ ...track, medium })));
      const track = tracks.find(value => value.recording?.id === recording.id && sameName(value.title || value.recording.title, expected.title));
      add({ Genre: genreNames(recording), Duration: Math.round(Number(recording.length || 0) / 1000), ISRC: unique(recording.isrcs || [])[0] || "",
        Album: txt(release?.title), AlbumArtist: releaseValues.AlbumArtist,
        ReleaseDate: releaseValues.ReleaseDate, Year: releaseValues.Year,
        TrackNumber: Number(track?.position || track?.number || 0), DiscNumber: Number(track?.medium?.position || 0),
        TrackCount: releaseValues.TrackCount, ReleaseType: releaseValues.ReleaseType, Label: releaseValues.Label, Country: releaseValues.Country, Format: releaseValues.Format,
        Description: txt(recording.disambiguation), ...relationshipMetadata(recording) });
      add({ Genre: releaseValues.Genre });
      if (!expected.album && patch.Album) expected.album = patch.Album;
      if (!expected.durationMs && patch.Duration) expected.durationMs = patch.Duration * 1000;
      if (!expected.description && patch.Description) expected.description = patch.Description;
    }
    if (entity === "album" && release && !warnings.length) {
      add(releaseMetadata(release));
      if (!expected.trackCount && patch.TrackCount) expected.trackCount = patch.TrackCount;
    }
    // An unresolved primary identity must be retried rather than borrowing a
    // similarly named secondary-provider record while its edition is unknown.
    if (mbid && failed && !sources.length && !warnings.length)
      return {patch:{},sources,warnings,status:"unavailable",failed:true,releaseIds:[],groupIds:[]};
    // Cross-provider matching must agree with the current edition, including
    // album and duration. A stored Apple ID is looked up before any search.
    if (!warnings.length && expected.title && expected.artist) {
      const apple = await appleMetadata(expected, entity);
      checked = checked || Boolean(apple.checked || apple.item || apple.conflict);
      failed = failed || Boolean(apple.failed);
      if (apple.conflict) warnings.push(apple.conflict);
      if (apple.item) {
        const item = apple.item;
        sources.push("Apple iTunes Search API");
        let appleTracks = apple.results || [];
        if (entity === "album" && !apple.results && item.collectionId) {
          try {
            const lookup = await requestJson(ITUNES + "/lookup?id=" + encodeURIComponent(item.collectionId) + "&entity=song&limit=200");
            appleTracks = (lookup.results || []).filter(value => String(value.collectionId) === String(item.collectionId));
          } catch (_) { failed = true; }
        }
        appleTracks = appleTracks.filter(value => value.kind === "song" && String(value.collectionId) === String(item.collectionId));
        matchedAppleTracks = appleTracks;
        const date = txt(item.releaseDate).slice(0, 10);
        add({ Genre: unique([formatGenre(item.primaryGenreName)]), Year: yearOf(date), ReleaseDate: date,
          Album: entity === "song" ? txt(item.collectionName) : "", AlbumArtist: txt(item.collectionArtistName || item.artistName),
          Duration: entity === "song" ? Math.round(Number(item.trackTimeMillis || 0) / 1000)
            : appleTracks.length && appleTracks.every(value => Number(value.trackTimeMillis) > 0) ? Math.round(appleTracks.reduce((sum, value) => sum + Number(value.trackTimeMillis), 0) / 1000) : 0,
          TrackNumber: entity === "song" ? Number(item.trackNumber || 0) : 0,
          DiscNumber: entity === "song" ? Number(item.discNumber || 0) : 0,
          TrackCount: Number(item.trackCount || 0),
          Tracklist: entity === "album" ? appleTracks.map(value => value.trackName).filter(Boolean) : [],
          ISRC: txt(item.isrc),
          AppleTrackId: entity === "song" ? txt(item.trackId) : "", AppleCollectionId: txt(item.collectionId),
          StoreUrl: txt(entity === "album" ? item.collectionViewUrl : item.trackViewUrl),
          Cover: validImage(item.artworkUrl100), CoverSource: !field("Cover") ? "Apple iTunes Search API" : "" });
      }
    }
    // A rejected secondary provider cannot erase independently verified
    // MusicBrainz facts. Its own values were never added to the patch.
    const required = entity === "album" ? ["Year", "ReleaseDate", "Duration", "Genre", "TrackCount", "Label", "Country", "Format", "ReleaseType"]
      : ["Year", "ReleaseDate", "Duration", "Genre", "Album", "AlbumArtist", "TrackNumber", "DiscNumber", "ISRC"];
    const complete = required.every(key => !empty(patch[key] ?? field(key)));
    const status = warnings.length ? "identity_conflict" : sources.length ? (complete ? "updated" : "partial") : "unavailable";
    return { patch, sources, warnings, status, failed: failed && !sources.length && !warnings.length,
      appleTracks: matchedAppleTracks,
      releaseIds: release?.id ? [release.id] : entity === "album" && mbid && sources.includes("MusicBrainz") ? [mbid] : [],
      groupIds: release?.["release-group"]?.id ? [release["release-group"].id] : [] };
  }
  function enrichmentStamp(result, draft) {
    draft.MetadataCheckedAt = new Date().toISOString();
    draft.MetadataSources = unique([...(Array.isArray(fieldValue(draft, "MetadataSources")) ? fieldValue(draft, "MetadataSources") : []), ...result.sources]);
    draft.MetadataStatus = result.status;
    if (result.warnings.length) draft.MetadataWarning = result.warnings.join(" ");
    else if (result.sources.length) { delete draft.MetadataWarning; delete draft.metadatawarning; }
    draft.MetadataVersion = Number(tp.config?.music_enrichment_version || 2);
    if (typeof tp.config?.music_enrichment_signature === "function") draft.MetadataSignature = tp.config.music_enrichment_signature(draft);
  }
  const dataFields = { Title:"title", Artist:"artist", Album:"album", AlbumArtist:"albumArtist", Year:"year", ReleaseDate:"releaseDate", Genre:"genres",
    Duration:"durationMs", TrackNumber:"trackNumber", DiscNumber:"discNumber", TrackCount:"trackCount", Label:"label", Country:"country", Format:"format",
    ISRC:"isrc", ReleaseType:"releaseType", Language:"languages", Composer:"composers", Writer:"writers", Producer:"producers", Description:"description",
    MusicBrainzId:"musicBrainzId", AppleTrackId:"appleTrackId", AppleCollectionId:"appleCollectionId", StoreUrl:"storeUrl", SourceUrl:"sourceUrl", Cover:"cover", CoverSource:"coverSource" };
  async function enrichData(data, entity) {
    const frontmatter = Object.fromEntries(Object.entries(dataFields).map(([field, name]) => [field, field === "Duration" ? Number(data[name] || 0) / 1000 : data[name]]));
    const result = await enrichFrontmatter(frontmatter, entity);
    for (const [field, value] of Object.entries(result.patch)) if (dataFields[field]) data[dataFields[field]] = field === "Duration" ? Number(value) * 1000 : value;
    if (entity === "album" && Array.isArray(data.tracks) && Array.isArray(result.appleTracks) && result.appleTracks.length) {
      data.tracks.forEach(track => {
        const match = result.appleTracks.find(item =>
          Number(track.trackNumber) > 0 && Number(item.trackNumber) === Number(track.trackNumber) &&
          (!Number(track.discNumber) || !Number(item.discNumber) || Number(item.discNumber) === Number(track.discNumber)) &&
          sameName(item.trackName, track.title)
        ) || result.appleTracks.find(item => sameName(item.trackName, track.title));
        if (!match) return;
        if (empty(track.appleTrackId) && match.trackId) track.appleTrackId = String(match.trackId);
        if (empty(track.appleCollectionId) && match.collectionId) track.appleCollectionId = String(match.collectionId);
        if (empty(track.storeUrl) && match.trackViewUrl) track.storeUrl = txt(match.trackViewUrl);
        if (empty(track.isrc) && match.isrc) track.isrc = txt(match.isrc);
        if (empty(track.genres) && match.primaryGenreName) track.genres = unique([formatGenre(match.primaryGenreName)]);
        if (empty(track.durationMs) && match.trackTimeMillis) track.durationMs = Number(match.trackTimeMillis);
      });
    }
    enrichmentStamp(result, frontmatter);
    data.enrichment = frontmatter;
    return data;
  }
  function pushEnrichment(lines, data) {
    ["ReleaseType"].forEach(key => lines.push(key + ": " + yaml(data[dataFields[key]])));
    ["Language", "Composer", "Writer", "Producer"].forEach(key => pushList(lines, key, data[dataFields[key]]));
    if (!data.enrichment) return;
    lines.push("MetadataCheckedAt: " + yaml(data.enrichment.MetadataCheckedAt), "MetadataStatus: " + yaml(data.enrichment.MetadataStatus));
    pushList(lines, "MetadataSources", data.enrichment.MetadataSources);
    if (data.enrichment.MetadataWarning) lines.push("MetadataWarning: " + yaml(data.enrichment.MetadataWarning));
    lines.push("MetadataVersion: " + Number(data.enrichment.MetadataVersion || 2));
  }

  async function archiveCover(type, id) {
    if(!/^[a-z0-9-]{3,64}$/i.test(txt(id))) return "";
    try {
      const data=await requestJson(COVER_ART+"/"+type+"/"+encodeURIComponent(id),{"User-Agent":USER_AGENT});
      const images=Array.isArray(data.images)?data.images:[];
      const image=images.find(item=>item?.front)||images[0]||{};
      const thumbs=image.thumbnails||{};
      return validImage(thumbs["500"]||thumbs.large||thumbs["1200"]||image.image);
    } catch (_) {return "";}
  }
  async function appleArtwork(title,artist,entity,albumName) {
    if(!txt(title)||!txt(artist))return null;
    for(const country of ["VN","US"]) {
      try {
        const data=await requestJson(ITUNES+"/search?term="+encodeURIComponent(title+" "+artist)+
          "&entity="+(entity==="album"?"album":"song")+"&limit=30&country="+country);
        const items=(data.results||[]).filter(item=>compatibleRecord(item,{title,artist,album:albumName},entity));
        const item=items[0];
        const image=validImage(item?.artworkUrl100);
        const store=txt(entity==="album"?item?.collectionViewUrl:item?.trackViewUrl);
        if(image&&/^https:\/\//i.test(store))return {cover:image,coverSource:"Apple iTunes Search API",storeUrl:store,genre:formatGenre(item?.primaryGenreName)};
      } catch (_) {}
    }
    return null;
  }
  async function resolveArtwork({releaseIds=[],groupIds=[],title,artist,albumName,entity,allowApple=true}) {
    for(const id of unique(releaseIds).slice(0,4)) {
      const cover=await archiveCover("release",id);
      if(cover)return {cover,coverSource:"Cover Art Archive",storeUrl:""};
    }
    for(const id of unique(groupIds).slice(0,3)) {
      const cover=await archiveCover("release-group",id);
      if(cover)return {cover,coverSource:"Cover Art Archive",storeUrl:""};
    }
    return (allowApple ? await appleArtwork(title,artist,entity,albumName) : null)||{cover:"",coverSource:"",storeUrl:""};
  }
  async function lookupLyrics(song) {
    const title=txt(song?.title),artist=txt(song?.artist);
    if(!title||!artist)return {id:"",url:"",status:"unavailable"};
    const seconds=Math.round(Number(song.durationMs||0)/1000);
    const query="track_name="+encodeURIComponent(title)+"&artist_name="+encodeURIComponent(artist)+
      (song.album?"&album_name="+encodeURIComponent(txt(song.album).replace(/^\[\[|\]\]$/g,"")):"");
    const normalize=record=>{
      if(!record||!matches(record.trackName||record.name,title)||!matches(record.artistName,artist))return null;
      const id=Number(record.id);
      if(!Number.isSafeInteger(id)||id<=0)return null;
      return {id:String(id),url:"https://lrclib.net/api/get/"+id,
        text:plainLyricText(record),
        status:record.instrumental?"instrumental":(record.plainLyrics||record.syncedLyrics?"available":"unavailable")};
    };
    try {
      const data=await requestJson("https://lrclib.net/api/get?"+query+
        (seconds>=1&&seconds<=3600?"&duration="+seconds:""));
      const record=normalize(data);
      if(record)return record;
    } catch (_) {}
    try {
      const data=await requestJson("https://lrclib.net/api/search?"+query);
      const found=(Array.isArray(data)?data:[]).map(normalize).find(Boolean);
      if(found)return found;
    } catch (_) {}
    return {id:"",url:"",status:"not_found"};
  }

  function pushList(lines, key, values) {
    const items = unique(values);
    if (!items.length) {
      lines.push(key + ": []");
      return;
    }
    lines.push(key + ":");
    items.forEach(value => lines.push("  - " + yaml(value)));
  }
  function pushTracklist(lines, values) {
    if (!values.length) {
      lines.push("Tracklist: []");
      return;
    }
    lines.push("Tracklist:");
    values.forEach(value => lines.push("  - " + yaml(value)));
  }
  function commonSongBody() {
    // Lyrics are saved as local text files, outside the personal Markdown journal.
    // One editable question belongs in Markdown, not in a separate Prompts card.
    return ["", "## Personal Reflections", "", "> *What feeling or memory does this song leave with you? Which moment stands out most?*", "", "## Notes", ""].join("\n");
  }
  function plainLyricText(record) {
    if (!record || record.instrumental) return "";
    return txt(record.plainLyrics || txt(record.syncedLyrics).replace(/^\[[\d:.]+\]\s*/gm, ""));
  }
  async function persistLyrics(lyrics) {
    if (!lyrics?.id || !lyrics.text || typeof tp.app.vault?.create !== "function") return "";
    const id = Number(lyrics.id);
    if (!Number.isSafeInteger(id) || id < 1) return "";
    const path = LYRICS_FOLDER + "/LRCLIB-" + id + ".txt";
    // Do not overwrite user-modified local lyrics. Existing files are canonical.
    if (tp.app.vault.getAbstractFileByPath(path)) return path;
    try {
      await ensureFolder(LYRICS_FOLDER);
      await tp.app.vault.create(path, lyrics.text.replace(/\r\n/g, "\n") + "\n");
      return path;
    } catch (error) {
      if (tp.app.vault.getAbstractFileByPath(path)) return path;
      notify("Song lyrics could not be saved locally; they remain available in the view.");
      return "";
    }
  }
  function renderSong(data, albumNoteName) {
    const title = txt(data.title) || fallbackTitle;
    const albumValue = albumNoteName
      ? "[[" + albumNoteName + "]]"
      : txt(data.album);
    const lines = [
      "---",
      "categories:",
      '  - "[[Songs]]"',
      "Title: " + yaml(title),
      "Artist: " + yaml(data.artist),
      "Album: " + yaml(albumValue),
      "AlbumArtist: " + yaml(data.albumArtist),
      "Year: " + (yearOf(data.releaseDate) || Number(data.year || 0)),
      "ReleaseDate: " + yaml(data.releaseDate),
      "Duration: " + Math.max(0, Math.round(Number(data.durationMs || 0) / 1000)),
      "TrackNumber: " + Math.max(0, Number(data.trackNumber || 0)),
      "DiscNumber: " + Math.max(0, Number(data.discNumber || 0)),
      "TrackCount: " + Math.max(0, Number(data.trackCount || 0))
    ];
    pushList(lines, "Genre", data.genres);
    pushEnrichment(lines, data);
    lines.push(
      "Cover: " + yaml(data.cover),
      "CoverSource: " + yaml(data.coverSource),
      "LyricsId: " + yaml(data.lyricsId),
      "LyricsUrl: " + yaml(data.lyricsUrl),
      "LyricsFile: " + yaml(data.lyricsFile),
      "LyricsStatus: " + yaml(data.lyricsStatus || "pending"),
      "Favourite: false",
      "PersonalRating: 0",
      "MusicBrainzId: " + yaml(data.musicBrainzId),
      "ISRC: " + yaml(data.isrc),
      "Label: " + yaml(data.label),
      "Country: " + yaml(data.country),
      "Format: " + yaml(data.format),
      "AppleTrackId: " + yaml(data.appleTrackId),
      "AppleCollectionId: " + yaml(data.appleCollectionId),
      "Description: " + yaml(data.description),
      "Source: " + yaml(data.source),
      "SourceUrl: " + yaml(data.sourceUrl),
      "StoreUrl: " + yaml(data.storeUrl),
      "Created: " + today,
      "---"
    );
    return lines.join("\n") + commonSongBody();
  }
  async function renderBlank() {
    const title = fallbackTitle;
    if (untitled) {
      try { await tp.file.rename(title); } catch (_) {}
    }
    if (kind === "album") {
      return [
        "---",
        "categories:",
        '  - "[[Albums]]"',
        "Title: " + yaml(title),
        'Artist: ""',
        'AlbumArtist: ""',
        "Year: 0",
        'ReleaseDate: ""',
        "Genre: []",
        "TrackCount: 0",
        "Duration: 0",
        'Cover: ""',
        'CoverSource: ""',
        "Tracklist: []",
        "Favourite: false",
        "PersonalRating: 0",
        'MusicBrainzId: ""',
        'ReleaseGroupId: ""',
        'AppleCollectionId: ""',
        'Label: ""',
        'Country: ""',
        'Format: ""',
        'Description: ""',
        'Source: ""',
        'SourceUrl: ""',
        'StoreUrl: ""',
        "Created: " + today,
        "---",
        "",
        "## Album Impressions",
        "",
        "> *What story does this album tell? Which track stays with you, and why?*",
        "",
        "## Tracklist",
        "",
        "## Notes",
        ""
      ].join("\n");
    }
    return [
      "---",
      "categories:",
      '  - "[[Songs]]"',
      "Title: " + yaml(title),
      'Artist: ""',
      'Album: ""',
      'AlbumArtist: ""',
      "Year: 0",
      'ReleaseDate: ""',
      "Duration: 0",
      "TrackNumber: 0",
      "DiscNumber: 0",
      "Genre: []",
      'Cover: ""',
      'CoverSource: ""',
      'LyricsId: ""',
      'LyricsUrl: ""',
      'LyricsFile: ""',
      'LyricsStatus: "pending"',
      "Favourite: false",
      "PersonalRating: 0",
      'MusicBrainzId: ""',
      'ISRC: ""',
      'AppleTrackId: ""',
      'AppleCollectionId: ""',
      'Description: ""',
      'Source: ""',
      'SourceUrl: ""',
      'StoreUrl: ""',
      "Created: " + today,
      "---"
    ].join("\n") + commonSongBody();
  }

  function queueTrashBlankTarget(folder) {
    if (!target || Number(tp.config && tp.config.run_mode) !== 2 ||
        Number(target.stat && target.stat.size || 0) !== 0 ||
        !String(target.path || "").startsWith(folder + "/") ||
        typeof tp.hooks?.on_all_templates_executed !== "function") return false;
    const path = target.path;
    const ctime = Number(target.stat && target.stat.ctime || 0);
    tp.hooks.on_all_templates_executed(async () => {
      const live = tp.app.vault.getAbstractFileByPath(path);
      if (live && Number(live.stat && live.stat.ctime || 0) === ctime &&
          Number(live.stat && live.stat.size || 0) === 0) {
        try { await tp.app.fileManager.trashFile(live); }
        catch (_) { notify("Could not move the empty duplicate placeholder to Trash."); }
      }
    });
    return true;
  }
  function duplicateLinkNote(existing, category) {
    const name = txt(existing && existing.basename) || txt(existing && existing.name).replace(/\.md$/i, "");
    return [
      "---",
      "categories:",
      '  - "[[' + category + ']]"',
      "Title: " + yaml(name),
      "---",
      "",
      "An existing note was found for this music record: [[" + name + "]].",
      "The importer did not create duplicate metadata."
    ].join("\n");
  }
  function pathExists(folder, filename) {
    const path = folder + "/" + filename + ".md";
    const found = tp.app.vault.getAbstractFileByPath(path);
    return Boolean(found && (!target || found.path !== target.path));
  }
  function availableName(title, folder, artist, album) {
    const base = sanitizeName(title);
    if (!pathExists(folder, base)) return base;
    const withArtist = sanitizeName(title + " (" + (artist || "Unknown Artist") + ")");
    if (!pathExists(folder, withArtist)) return withArtist;
    const withAlbum = sanitizeName(title + " (" + (album || "Alternate Version") + ")");
    if (!pathExists(folder, withAlbum)) return withAlbum;
    let index = 2;
    while (pathExists(folder, withAlbum + " " + index)) index += 1;
    return withAlbum + " " + index;
  }
  function findByIdentity(folder, key, value) {
    if (!value || typeof tp.app.vault.getMarkdownFiles !== "function") return null;
    for (const file of tp.app.vault.getMarkdownFiles()) {
      if (!String(file.path || "").startsWith(folder + "/")) continue;
      const frontmatter = tp.app.metadataCache?.getFileCache(file)?.frontmatter || {};
      if (txt(frontmatter[key]) === txt(value)) return file;
    }
    return null;
  }
  function findAlbumNote(albumTitle) {
    if (!albumTitle || typeof tp.app.vault.getMarkdownFiles !== "function") return null;
    const targetName = sanitizeName(albumTitle).toLowerCase();
    for (const file of tp.app.vault.getMarkdownFiles()) {
      if (!String(file.path || "").startsWith(ALBUM_FOLDER + "/")) continue;
      const frontmatter = tp.app.metadataCache?.getFileCache(file)?.frontmatter || {};
      if (String(file.basename || "").toLowerCase() === targetName ||
          txt(frontmatter.Title).toLowerCase() === txt(albumTitle).toLowerCase()) return file;
    }
    return null;
  }
  async function ensureFolder(path) {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? current + "/" + part : part;
      if (!tp.app.vault.getAbstractFileByPath(current)) {
        try { await tp.app.vault.createFolder(current); } catch (_) {}
      }
    }
  }

  async function searchCandidates(query, progress) {
    let candidates = [];
    let musicBrainzFailed = false;
    try {
      const endpoint = kind === "album" ? "release" : "recording";
      const data = await musicBrainzJson(MUSICBRAINZ + "/" + endpoint + "/?query=" +
        encodeURIComponent(query) + "&fmt=json&limit=15");
      const results = kind === "album" ? (data.releases || []) : (data.recordings || []);
      candidates = results.map(item => {
        if (kind === "album") {
          const count = (item.media || []).reduce((sum, medium) => sum + Number(medium["track-count"] || 0), 0);
          return {
            source: "musicbrainz",
            id: txt(item.id),
            title: txt(item.title),
            artist: creditName(item["artist-credit"]),
            date: txt(item.date || item["release-group"]?.["first-release-date"]),
            trackCount: count,
            country: txt(item.country),
            item: item
          };
        }
        return {
          source: "musicbrainz",
          id: txt(item.id),
          title: txt(item.title),
          artist: creditName(item["artist-credit"]),
          date: txt(item["first-release-date"]),
          length: Number(item.length || 0),
          releases: item.releases || [],
          item: item
        };
      }).filter(item => item.id && item.title);
    } catch (_) {
      musicBrainzFailed = true;
    }
    if (candidates.length) return candidates;

    progress?.update(1, "MusicBrainz returned no match. Searching Apple iTunes...");
    notify(musicBrainzFailed
      ? "MusicBrainz is unavailable. Trying Apple iTunes metadata..."
      : "No MusicBrainz match found. Trying Apple iTunes metadata...");
    const entity = kind === "album" ? "album" : "song";
    try {
      const data = await requestJson(ITUNES + "/search?term=" + encodeURIComponent(query) +
        "&entity=" + entity + "&limit=15&country=us");
      return (data.results || []).map(item => {
        if (kind === "album") {
          return {
            source: "itunes",
            id: String(item.collectionId || ""),
            title: txt(item.collectionName),
            artist: txt(item.artistName),
            date: txt(item.releaseDate),
            trackCount: Number(item.trackCount || 0),
            genre: txt(item.primaryGenreName),
            storeUrl: txt(item.collectionViewUrl),
            item: item
          };
        }
        return {
          source: "itunes",
          id: String(item.trackId || ""),
          title: txt(item.trackName),
          artist: txt(item.artistName),
          album: txt(item.collectionName),
          albumArtist: txt(item.collectionArtistName || item.artistName),
          date: txt(item.releaseDate),
          length: Number(item.trackTimeMillis || 0),
          trackNumber: Number(item.trackNumber || 0),
          discNumber: Number(item.discNumber || 0),
          genre: txt(item.primaryGenreName),
          storeUrl: txt(item.trackViewUrl),
          collectionId: String(item.collectionId || ""),
          item: item
        };
      }).filter(item => item.id && item.title);
    } catch (_) {
      return [];
    }
  }

  async function albumFromMusicBrainz(candidate, progress) {
    let release = candidate.item || {};
    try {
      release = await musicBrainzJson(MUSICBRAINZ + "/release/" + encodeURIComponent(candidate.id) +
        "?inc=artists+recordings+release-groups+labels+tags+genres+artist-rels&fmt=json");
    } catch (_) {
      notify("MusicBrainz release details were unavailable; using the search result metadata.");
    }
    const tracks = [];
    (release.media || []).forEach((medium, discIndex) => {
      (medium.tracks || []).forEach(track => {
        const recording = track.recording || {};
        const recordingId = txt(recording.id);
        const recordingTitle = txt(recording.title || track.title);
        const relMeta = relationshipMetadata(recording);
        tracks.push({
          title: recordingTitle,
          artist: creditName(recording["artist-credit"]) || creditName(release["artist-credit"]),
          trackNumber: Number(track.position || track.number || tracks.length + 1),
          discNumber: Number(medium.position || discIndex + 1),
          durationMs: Number(track.length || recording.length || 0),
          musicBrainzId: recordingId,
          isrc: (recording.isrcs || [])[0] || "",
          genres: genreNames(recording).length ? genreNames(recording) : genreNames(release),
          description: txt(recording.disambiguation),
          composers: relMeta.Composer,
          writers: relMeta.Writer,
          producers: relMeta.Producer,
          languages: relMeta.Language,
          source: "MusicBrainz",
          sourceUrl: recordingId ? "https://musicbrainz.org/recording/" + recordingId : "",
          storeUrl: "",
          appleTrackId: "",
          appleCollectionId: ""
        });
      });
    });
    const releaseId = txt(release.id || candidate.id);
    const group = release["release-group"] || {};
    const labelInfo = (release["label-info"] || []).map(entry => entry && entry.label && entry.label.name).filter(Boolean);
    const date = txt(release.date || candidate.date || group["first-release-date"]);
    const genres = genreNames(release).length ? genreNames(release) : genreNames(group);
    progress?.update(4, "Looking up album artwork...");
    const artwork=await resolveArtwork({
      releaseIds:[releaseId],groupIds:[group.id],title:txt(release.title||candidate.title),
      artist:creditName(release["artist-credit"])||candidate.artist,entity:"album"
    });
    const finalGenres = genres.length ? genres : unique([artwork.genre]);
    return {
      title: txt(release.title || candidate.title),
      artist: creditName(release["artist-credit"]) || candidate.artist,
      albumArtist: creditName(release["artist-credit"]) || candidate.artist,
      releaseDate: date,
      year: yearOf(date),
      genres: finalGenres,
      trackCount: tracks.length || Number(candidate.trackCount || 0),
      durationMs: tracks.reduce((sum, track) => sum + Number(track.durationMs || 0), 0),
      cover: artwork.cover,
      coverSource: artwork.coverSource,
      description: txt(release.disambiguation || group.disambiguation),
      musicBrainzId: releaseId,
      releaseGroupId: txt(group.id),
      label: unique(labelInfo).join(", "),
      country: txt(release.country || candidate.country),
      format: unique((release.media || []).map(medium => medium && medium.format)).join(", "),
      source: "MusicBrainz",
      sourceUrl: releaseId ? "https://musicbrainz.org/release/" + releaseId : "",
      storeUrl: artwork.storeUrl,
      appleCollectionId: "",
      tracks: tracks
    };
  }

  async function albumFromITunes(candidate) {
    let album = candidate.item || {};
    let results = [album];
    try {
      const lookup = await requestJson(ITUNES + "/lookup?id=" + encodeURIComponent(candidate.id) + "&entity=song&limit=200");
      results = lookup.results || results;
      album = results.find(item => item.wrapperType === "collection") || album;
    } catch (_) {
      notify("Apple iTunes tracklist lookup failed; album metadata is still available.");
    }
    const tracks = results.filter(item => item.wrapperType === "track" && item.kind === "song").map(item => ({
      title: txt(item.trackName),
      artist: txt(item.artistName),
      trackNumber: Number(item.trackNumber || 0),
      discNumber: Number(item.discNumber || 0),
      durationMs: Number(item.trackTimeMillis || 0),
      musicBrainzId: "",
      isrc: txt(item.isrc),
      genres: unique([formatGenre(item.primaryGenreName)]),
      source: "Apple iTunes Search API",
      sourceUrl: txt(item.trackViewUrl),
      storeUrl: txt(item.trackViewUrl),
      appleTrackId: String(item.trackId || ""),
      appleCollectionId: String(item.collectionId || candidate.id || "")
    }));
    const date = txt(album.releaseDate || candidate.date);
    return {
      title: txt(album.collectionName || candidate.title),
      artist: txt(album.artistName || candidate.artist),
      albumArtist: txt(album.artistName || candidate.artist),
      releaseDate: date,
      year: yearOf(date),
      genres: unique([formatGenre(album.primaryGenreName || candidate.genre)]),
      trackCount: tracks.length || Number(album.trackCount || candidate.trackCount || 0),
      durationMs: tracks.reduce((sum, track) => sum + Number(track.durationMs || 0), 0),
      cover: validImage(album.artworkUrl100||candidate.item?.artworkUrl100),
      coverSource: "Apple iTunes Search API",
      description: "",
      musicBrainzId: "",
      releaseGroupId: "",
      label: "",
      country: "", // iTunes country identifies the storefront, not the release territory.
      format: "",
      source: "Apple iTunes Search API",
      sourceUrl: txt(album.collectionViewUrl || candidate.storeUrl),
      storeUrl: txt(album.collectionViewUrl || candidate.storeUrl),
      appleCollectionId: String(album.collectionId || candidate.id || ""),
      tracks: tracks
    };
  }

  async function songFromMusicBrainz(candidate, progress) {
    let recording = candidate.item || {};
    try {
      recording = await musicBrainzJson(MUSICBRAINZ + "/recording/" + encodeURIComponent(candidate.id) +
        "?inc=artists+releases+isrcs+tags+genres+artist-rels+work-rels+work-level-rels&fmt=json");
    } catch (_) {
      notify("MusicBrainz recording details were unavailable; using the search result metadata.");
    }
    const releases = recording.releases || candidate.releases || [];
    const release = releases.find(item => item && item.id) || {};
    const albumTitle=txt(release.title);
    const artist=creditName(recording["artist-credit"])||candidate.artist;
    progress?.update(4, "Looking up song artwork...");
    const artwork=await resolveArtwork({
      releaseIds:releases.map(item=>item?.id),groupIds:releases.map(item=>item?.["release-group"]?.id),
      title:txt(recording.title||candidate.title),artist,albumName:albumTitle,entity:"song"
    });
    const date = txt(release.date || recording["first-release-date"] || candidate.date);
    const recordingId = txt(recording.id || candidate.id);
    const recGenres = genreNames(recording);
    return {
      title: txt(recording.title || candidate.title),
      artist: creditName(recording["artist-credit"]) || candidate.artist,
      album: txt(release.title),
      albumArtist: creditName(release["artist-credit"]) || creditName(recording["artist-credit"]) || candidate.artist,
      releaseDate: date,
      year: yearOf(date),
      durationMs: Number(recording.length || candidate.length || 0),
      trackNumber: 0,
      discNumber: 0,
      genres: recGenres.length ? recGenres : unique([artwork.genre]),
      cover: artwork.cover,
      coverSource: artwork.coverSource,
      musicBrainzId: recordingId,
      isrc: unique(recording.isrcs || [])[0] || "",
      appleTrackId: "",
      appleCollectionId: "",
      description: txt(recording.disambiguation),
      source: "MusicBrainz",
      sourceUrl: recordingId ? "https://musicbrainz.org/recording/" + recordingId : "",
      storeUrl: artwork.storeUrl
    };
  }

  function songFromITunes(candidate) {
    const item = candidate.item || {};
    const date = txt(item.releaseDate || candidate.date);
    return {
      title: txt(item.trackName || candidate.title),
      artist: txt(item.artistName || candidate.artist),
      album: txt(item.collectionName || candidate.album),
      albumArtist: txt(item.collectionArtistName || item.artistName || candidate.albumArtist || candidate.artist),
      releaseDate: date,
      year: yearOf(date),
      durationMs: Number(item.trackTimeMillis || candidate.length || 0),
      trackNumber: Number(item.trackNumber || candidate.trackNumber || 0),
      discNumber: Number(item.discNumber || candidate.discNumber || 0),
      genres: unique([formatGenre(item.primaryGenreName || candidate.genre)]),
      cover: validImage(item.artworkUrl100||candidate.item?.artworkUrl100),
      coverSource: "Apple iTunes Search API",
      musicBrainzId: "",
      isrc: txt(item.isrc),
      appleTrackId: String(item.trackId || candidate.id || ""),
      appleCollectionId: String(item.collectionId || candidate.collectionId || ""),
      description: "",
      source: "Apple iTunes Search API",
      sourceUrl: txt(item.trackViewUrl || candidate.storeUrl),
      storeUrl: txt(item.trackViewUrl || candidate.storeUrl)
    };
  }

  function candidateLabel(candidate) {
    const provider = candidate.source === "musicbrainz" ? "MusicBrainz" : "Apple iTunes";
    const date = candidate.date ? " · " + candidate.date.slice(0, 4) : "";
    const tracks = kind === "album" && candidate.trackCount ? " · " + candidate.trackCount + " tracks" : "";
    return "[" + provider + "] " + candidate.title + " · " + (candidate.artist || "Unknown artist") + date + tracks;
  }

  async function createSongNotes(album, progress) {
    const links = new Map();
    const tracks = album.tracks || [];
    if (!tracks.length) {
      notify("No tracklist was available from the selected source. The Album note will still be created.");
      return links;
    }
    const options = [
      { value: "all", label: "Create all song notes automatically" },
      { value: "select", label: "Choose songs manually" },
      { value: "none", label: "Create the Album note only" }
    ];
    progress?.update(5, "Choose which album tracks to create...");
    let modeChoice = "none";
    try {
      const picked = await tp.system.suggester(options.map(option => option.label),
        options.map(option => option.value), false, "How should song notes be created?");
      if (picked) modeChoice = picked;
    } catch (_) {}
    if (modeChoice === "none") return links;

    let selectedTracks = tracks;
    if (modeChoice === "select") {
      const labels = tracks.map(track =>
        String(track.trackNumber || "?") + ". " + track.title + " · " +
        (track.artist || album.artist || "Unknown artist") + " · " + formatDuration(track.durationMs));
      try {
        if (typeof tp.system.multi_suggester === "function") {
          selectedTracks = await tp.system.multi_suggester(labels, tracks, false, "Select tracks to create");
        } else {
          const answer = await tp.system.prompt("Enter track numbers separated by commas (example: 1, 3, 5)");
          const indexes = new Set(txt(answer).split(",").map(value => Number(value.trim())).filter(Number.isFinite));
          selectedTracks = tracks.filter((track, index) => indexes.has(Number(track.trackNumber || index + 1)));
        }
      } catch (_) {
        selectedTracks = [];
      }
      if (!Array.isArray(selectedTracks)) selectedTracks = [];
    }

    progress?.update(5, "Preparing " + selectedTracks.length + " Song note(s)...");
    await ensureFolder(SONG_FOLDER);
    let createdCount = 0;
    let reusedCount = 0;
    let processedCount = 0;
    for (const track of selectedTracks) {
      processedCount += 1;
      progress?.update(5, "Creating Song notes (" + processedCount + "/" +
        selectedTracks.length + "): " + txt(track.title));
      const identity = txt(track.musicBrainzId || track.appleTrackId);
      const identityKey = track.musicBrainzId ? "MusicBrainzId" : "AppleTrackId";
      const existing = identity ? findByIdentity(SONG_FOLDER, identityKey, identity) : null;
      const key = identity || (txt(track.title).toLowerCase() + "|" + txt(track.artist || album.artist).toLowerCase());
      if (existing) {
        links.set(key, existing.basename || existing.name.replace(/\.md$/i, ""));
        reusedCount += 1;
        continue;
      }
      const filename = availableName(track.title, SONG_FOLDER, track.artist || album.artist, album.title);
      const trackGenres = unique((track.genres && track.genres.length ? track.genres : album.genres || []).map(formatGenre));
      const songData = {
        title: track.title,
        artist: track.artist || album.artist,
        album: album.title,
        albumArtist: album.albumArtist || album.artist,
        releaseDate: album.releaseDate,
        year: album.year,
        durationMs: track.durationMs,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        trackCount: Number(album.trackCount || (album.tracks || []).length || 0),
        genres: trackGenres,
        cover: album.cover,
        coverSource: album.coverSource,
        lyricsId: "",
        lyricsUrl: "",
        lyricsFile: "",
        lyricsStatus: "pending",
        musicBrainzId: track.musicBrainzId,
        isrc: track.isrc,
        appleTrackId: track.appleTrackId,
        appleCollectionId: track.appleCollectionId || album.appleCollectionId,
        description: txt(track.description),
        releaseType: album.releaseType, label: album.label, country: album.country, format: album.format,
        composers: track.composers && track.composers.length ? track.composers : (album.composers || []),
        writers: track.writers && track.writers.length ? track.writers : (album.writers || []),
        producers: track.producers && track.producers.length ? track.producers : (album.producers || []),
        languages: track.languages && track.languages.length ? track.languages : (album.languages || []),
        source: track.source || album.source,
        sourceUrl: track.sourceUrl,
        storeUrl: track.storeUrl || album.storeUrl,
        enrichment: album.enrichment ? {
          MetadataCheckedAt: album.enrichment.MetadataCheckedAt,
          MetadataStatus: album.enrichment.MetadataStatus,
          MetadataSources: album.enrichment.MetadataSources,
          MetadataWarning: album.enrichment.MetadataWarning,
          MetadataVersion: album.enrichment.MetadataVersion
        } : null
      };
      try {
        const created = await tp.file.create_new(renderSong(songData, album.noteName), filename, false, SONG_FOLDER);
        const noteName = created && created.basename ? created.basename : filename;
        links.set(key, noteName);
        createdCount += 1;
      } catch (_) {
        notify("Could not create the Song note for: " + track.title);
      }
    }
    if (createdCount || reusedCount) {
      notify("Music import: created " + createdCount + " Song note(s), reused " + reusedCount + " existing note(s).");
    }
    return links;
  }

  function renderAlbum(album, links) {
    const lines = [
      "---",
      "categories:",
      '  - "[[Albums]]"',
      "Title: " + yaml(album.title),
      "Artist: " + yaml(album.artist),
      "AlbumArtist: " + yaml(album.albumArtist),
      "Year: " + (Number(album.year || 0)),
      "ReleaseDate: " + yaml(album.releaseDate),
      "TrackCount: " + Number(album.trackCount || (album.tracks || []).length || 0),
      "Duration: " + Math.max(0, Math.round(Number(album.durationMs || 0) / 1000))
    ];
    pushList(lines, "Genre", album.genres);
    pushEnrichment(lines, album);
    const tracklist = (album.tracks || []).map((track, index) => {
      const identity = txt(track.musicBrainzId || track.appleTrackId);
      const key = identity || (txt(track.title).toLowerCase() + "|" + txt(track.artist || album.artist).toLowerCase());
      const linked = links.get(key);
      return linked ? "[[" + linked + "]]" : txt(track.title);
    });
    pushTracklist(lines, tracklist);
    lines.push(
      "Cover: " + yaml(album.cover),
      "CoverSource: " + yaml(album.coverSource),
      "Favourite: false",
      "PersonalRating: 0",
      "MusicBrainzId: " + yaml(album.musicBrainzId),
      "ReleaseGroupId: " + yaml(album.releaseGroupId),
      "AppleCollectionId: " + yaml(album.appleCollectionId),
      "Label: " + yaml(album.label),
      "Country: " + yaml(album.country),
      "Format: " + yaml(album.format),
      "Description: " + yaml(album.description),
      "Source: " + yaml(album.source),
      "SourceUrl: " + yaml(album.sourceUrl),
      "StoreUrl: " + yaml(album.storeUrl),
      "Created: " + today,
      "---",
      "",
      "## Album Impressions",
      "",
      "> *What story does this album tell? Which track stays with you, and why?*",
      "",
      "## Tracklist",
      ""
    );
    (album.tracks || []).forEach((track, index) => {
      const identity = txt(track.musicBrainzId || track.appleTrackId);
      const key = identity || (txt(track.title).toLowerCase() + "|" + txt(track.artist || album.artist).toLowerCase());
      const linked = links.get(key);
      const number = track.trackNumber || index + 1;
      const duration = formatDuration(track.durationMs);
      lines.push("- " + (linked ? "[[" + linked + "]]" : txt(track.title)) +
        (duration ? " — " + duration : "") + (track.discNumber > 1 ? " (Disc " + track.discNumber + ")" : ""));
    });
    lines.push("", "## Notes", "");
    return lines.join("\n");
  }

  // Automatic enrichment never invokes prompts or fetches/saves lyrics. All
  // existing personal values remain canonical, including non-empty arrays.
  if (refreshing) {
    const file = (target && String(target.path || "").startsWith(MUSIC_ROOT + "/") ? target : null) || tp.app.workspace?.getActiveFile?.();
    if (!file || !/^20_Personal_Life\/28_Music_Tracker\/(Songs|Albums)\/[^/\\\x00-\x1f]+\.md$/.test(file.path) || file.path.split("/").includes("..")) {
      notify("Open an existing Song or Album note before refreshing."); return "";
    }
    if (typeof tp.app.fileManager?.processFrontMatter !== "function") { notify("Frontmatter editing unavailable."); return ""; }
    let fm = tp.app.metadataCache?.getFileCache?.(file)?.frontmatter || {};
    const raw = existingContent.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (raw && typeof tp.obsidian?.parseYaml === "function") {
      try { fm = tp.obsidian.parseYaml(raw[1]) || {}; } catch (_) { return {status:"failed"}; }
    }
    const field = key => fieldValue(fm, key);
    const title = txt(field("Title") || file.basename), artist = txt(field("Artist") || field("AlbumArtist"));
    const albumName = plainAlbum(field("Album"));
    if (!title || !artist) return {status:"unidentified"};
    const identityKeys = ["Title","Artist","Album","AlbumArtist","MusicBrainzId","ReleaseGroupId","AppleTrackId","AppleCollectionId","SourceUrl","StoreUrl"];
    const identitySignature = value => JSON.stringify(identityKeys.map(key => fieldValue(value,key)));
    const initialIdentity = identitySignature(fm);
    const result = await enrichFrontmatter({...fm, Title:title, Artist:artist}, kind);
    if (result.failed) return {status:"failed"};
    const patch = result.patch;
    if (empty(field("Cover")) && !patch.Cover && !result.warnings.length) {
      const art = await resolveArtwork({releaseIds:result.releaseIds, groupIds:result.groupIds, title, artist, albumName, entity:kind, allowApple:false});
      if (art.cover) {
        patch.Cover = art.cover; patch.CoverSource = art.coverSource;
        if (art.storeUrl && empty(field("StoreUrl"))) patch.StoreUrl = art.storeUrl;
      }
    }
    if (!enriching && kind === "song" && empty(field("LyricsId")) && !result.warnings.length) {
      const lyrics = await lookupLyrics({title,artist,album:albumName,durationMs:Number(field("Duration") || patch.Duration || 0)*1000});
      if (lyrics.id) {
        patch.LyricsId = lyrics.id; patch.LyricsUrl = lyrics.url;
        if (empty(field("LyricsFile"))) patch.LyricsFile = await persistLyrics(lyrics);
      }
      patch.LyricsStatus = lyrics.status;
    }
    let superseded = false;
    await tp.app.fileManager.processFrontMatter(file, draft => {
      if (identitySignature(draft) !== initialIdentity) { superseded = true; return; }
      for (const [key,value] of Object.entries(patch)) if (empty(fieldValue(draft,key))) draft[key] = value;
      enrichmentStamp(result, draft);
    });
    if (superseded) return {status:"failed"};
    notify(result.warnings.length ? result.warnings.join(" ") : "Music metadata refreshed: " + (Object.keys(patch).join(", ") || "no additional fields found"));
    return enriching ? {status:result.status} : "";
  }

  if (target && target.path && !String(target.path).startsWith((kind === "album" ? ALBUM_FOLDER : SONG_FOLDER) + "/")) {
    notify("Run the " + (kind === "album" ? "Album" : "Song") + " template inside " +
      (kind === "album" ? ALBUM_FOLDER : SONG_FOLDER) + ".");
    return renderBlank();
  }
  if (typeof tp.obsidian?.requestUrl !== "function") return renderBlank();

  let query = "";
  try {
    query = txt(await tp.system.prompt(
      kind === "album" ? "Search for an album by title or artist (Esc: blank note)" : "Search for a song by title or artist (Esc: blank note)",
      untitled ? "" : originalTitle
    ));
  } catch (_) {
    return renderBlank();
  }
  if (!query) return renderBlank();

  // Use the same non-blocking five-step Notice as Games and Recipes.
  // It tracks workflow milestones, not individual bytes transferred.
  const progress = typeof tp.user?.import_progress === "function"
    ? tp.user.import_progress(tp, {
        title: kind === "album" ? "Album Import" : "Song Import",
        totalSteps: 5
      })
    : { update: () => {}, close: () => {} };
  try {
  progress.update(1, "Searching MusicBrainz...");
  let candidates = [];
  try { candidates = await searchCandidates(query, progress); } catch (_) { candidates = []; }
  if (!candidates.length) {
    notify("No matching music metadata was found. Creating a blank " + (kind === "album" ? "Album" : "Song") + " note.");
    return renderBlank();
  }

  progress.update(2, "Waiting for " + (kind === "album" ? "album" : "song") + " selection...");
  let chosen = null;
  try {
    chosen = await tp.system.suggester(candidates.map(candidateLabel), candidates, false,
      kind === "album" ? "Choose an album" : "Choose a song");
  } catch (_) {}
  if (!chosen) return renderBlank();

  progress.update(3, "Fetching " + (kind === "album" ? "album and tracklist" : "song") +
    " metadata from " + (chosen.source === "musicbrainz" ? "MusicBrainz" : "Apple iTunes") + "...");
  if (kind === "song") {
    let song;
    try {
      song = chosen.source === "musicbrainz"
        ? await songFromMusicBrainz(chosen, progress)
        : songFromITunes(chosen);
    } catch (_) {
      song = chosen.source === "musicbrainz" ? {
        title: chosen.title, artist: chosen.artist, album: txt(chosen.releases && chosen.releases[0]?.title),
        albumArtist: chosen.artist, releaseDate: chosen.date, durationMs: chosen.length,
        genres: [], cover: "", coverSource: "", musicBrainzId: chosen.id, source: "MusicBrainz",
        sourceUrl: "https://musicbrainz.org/recording/" + chosen.id, storeUrl: ""
      } : songFromITunes(chosen);
      notify("Some Song metadata was unavailable; the available fields were kept.");
    }
    await enrichData(song, "song");
    progress.update(4, "Checking artwork and searching LRCLIB lyrics...");
    const identity = txt(song.musicBrainzId || song.appleTrackId);
    const identityKey = song.musicBrainzId ? "MusicBrainzId" : "AppleTrackId";
    const existing = identity ? findByIdentity(SONG_FOLDER, identityKey, identity) : null;
    if (existing) {
      notify("Song already exists: " + existing.path + ". No duplicate metadata created.");
      if (queueTrashBlankTarget(SONG_FOLDER)) return "";
      return duplicateLinkNote(existing, "Songs");
    }
    const albumNote = findAlbumNote(song.album);
    const filename = availableName(song.title, SONG_FOLDER, song.artist, song.album);
    if (filename !== originalTitle) {
      try { await tp.file.rename(filename); } catch (_) { notify("Metadata imported, but the Song filename could not be renamed."); }
    }
    try {
      const lyrics=await lookupLyrics(song);
      song.lyricsId=lyrics.id; song.lyricsUrl=lyrics.url; song.lyricsStatus=lyrics.status;
      song.lyricsFile=await persistLyrics(lyrics);
    } catch (_) {song.lyricsStatus="unavailable";}
    progress.update(5, "Writing Song note...");
    return renderSong(song, albumNote ? albumNote.basename : "");
  }

  let album;
  try {
    album = chosen.source === "musicbrainz"
      ? await albumFromMusicBrainz(chosen, progress)
      : await albumFromITunes(chosen);
  } catch (_) {
    notify("Album details were unavailable. Creating a blank Album note.");
    return renderBlank();
  }
  await enrichData(album, "album");
  progress.update(4, "Checking album artwork and tracklist...");
  const existingAlbum = album.musicBrainzId
    ? findByIdentity(ALBUM_FOLDER, "MusicBrainzId", album.musicBrainzId)
    : (album.appleCollectionId ? findByIdentity(ALBUM_FOLDER, "AppleCollectionId", album.appleCollectionId) : null);
  if (existingAlbum) {
    notify("Album already exists: " + existingAlbum.path + ". No duplicate metadata created.");
    if (queueTrashBlankTarget(ALBUM_FOLDER)) return "";
    return duplicateLinkNote(existingAlbum, "Albums");
  }

  const filename = availableName(album.title, ALBUM_FOLDER, album.artist, "");
  album.noteName = filename;
  if (filename !== originalTitle) {
    try { await tp.file.rename(filename); } catch (_) { notify("Metadata imported, but the Album filename could not be renamed."); }
  }
  progress.update(5, "Preparing Album note and Song notes...");
  const links = await createSongNotes(album, progress);
  progress.update(5, "Writing Album note...");
  return renderAlbum(album, links);
  } finally {
    progress.close();
  }
};
