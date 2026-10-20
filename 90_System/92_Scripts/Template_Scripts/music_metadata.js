module.exports = async function musicMetadata(tp, mode) {
  const refreshing = mode === "refresh";
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
    return txt(item && (item.name || (item.artist && item.artist.name))) + txt(item && item.joinphrase);
  }).join("").trim();
  const genreNames = record => unique([
    ...(Array.isArray(record && record.genres) ? record.genres : []).map(item => typeof item === "string" ? item : item && item.name),
    ...(Array.isArray(record && record.tags) ? record.tags : []).map(item => typeof item === "string" ? item : item && item.name)
  ]).slice(0, 8);
  const formatDuration = milliseconds => {
    const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
    return seconds ? Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0") : "";
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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
    const headers = Object.assign({ Accept: "application/json" }, extraHeaders || {});
    const response = await withTimeout(() => tp.obsidian.requestUrl({ url: url, method: "GET", headers: headers }), 15);
    if (response.status != null && (response.status < 200 || response.status >= 300)) {
      throw new Error("HTTP " + response.status);
    }
    if (response.json != null) return response.json;
    return JSON.parse(response.text || "{}");
  }

  let lastMusicBrainzRequest = 0;
  async function musicBrainzJson(url) {
    const wait = 1100 - (Date.now() - lastMusicBrainzRequest);
    if (wait > 0) await sleep(wait);
    lastMusicBrainzRequest = Date.now();
    return requestJson(url, { "User-Agent": USER_AGENT });
  }
  const validImage = value => /^https:\/\/[a-z0-9.-]+\//i.test(txt(value)) ? txt(value) : "";
  const normName = value => txt(value).normalize("NFKC").toLowerCase()
    .replace(/\([^)]*(?:feat|ft|remaster|version)[^)]*\)/gi,"")
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff]+/gi," ").trim();
  const matches = (a,b) => {
    const x=normName(a),y=normName(b);
    return !!x&&!!y&&(x===y||(x.length>7&&y.length>7&&(x.startsWith(y+" ")||y.startsWith(x+" "))));
  };
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
        const items=(data.results||[]).filter(item=>matches(entity==="album"?item.collectionName:item.trackName,title)&&
          matches(item.artistName,artist));
        // Preserve an exact album match when possible. For standalone songs,
        // a verified artist/track match on another edition is preferable to no art.
        const item=(entity==="song"&&albumName?
          items.find(candidate=>matches(candidate.collectionName,albumName)):null)||items[0];
        const image=validImage(item?.artworkUrl100);
        const store=txt(entity==="album"?item?.collectionViewUrl:item?.trackViewUrl);
        if(image&&/^https:\/\//i.test(store))return {cover:image,coverSource:"Apple iTunes Search API",storeUrl:store};
      } catch (_) {}
    }
    return null;
  }
  async function resolveArtwork({releaseIds=[],groupIds=[],title,artist,albumName,entity}) {
    for(const id of unique(releaseIds).slice(0,4)) {
      const cover=await archiveCover("release",id);
      if(cover)return {cover,coverSource:"Cover Art Archive",storeUrl:""};
    }
    for(const id of unique(groupIds).slice(0,3)) {
      const cover=await archiveCover("release-group",id);
      if(cover)return {cover,coverSource:"Cover Art Archive",storeUrl:""};
    }
    return await appleArtwork(title,artist,entity,albumName)||{cover:"",coverSource:"",storeUrl:""};
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
      "DiscNumber: " + Math.max(0, Number(data.discNumber || 0))
    ];
    pushList(lines, "Genre", data.genres);
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

  async function searchCandidates(query) {
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

  async function albumFromMusicBrainz(candidate) {
    let release = candidate.item || {};
    try {
      release = await musicBrainzJson(MUSICBRAINZ + "/release/" + encodeURIComponent(candidate.id) +
        "?inc=artists+recordings+release-groups+labels+tags+genres&fmt=json");
    } catch (_) {
      notify("MusicBrainz release details were unavailable; using the search result metadata.");
    }
    const tracks = [];
    (release.media || []).forEach((medium, discIndex) => {
      (medium.tracks || []).forEach(track => {
        const recording = track.recording || {};
        const recordingId = txt(recording.id);
        const recordingTitle = txt(recording.title || track.title);
        tracks.push({
          title: recordingTitle,
          artist: creditName(recording["artist-credit"]) || creditName(release["artist-credit"]),
          trackNumber: Number(track.position || track.number || tracks.length + 1),
          discNumber: Number(medium.position || discIndex + 1),
          durationMs: Number(track.length || recording.length || 0),
          musicBrainzId: recordingId,
          isrc: (recording.isrcs || [])[0] || "",
          genres: genreNames(recording).length ? genreNames(recording) : genreNames(release),
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
    const artwork=await resolveArtwork({
      releaseIds:[releaseId],groupIds:[group.id],title:txt(release.title||candidate.title),
      artist:creditName(release["artist-credit"])||candidate.artist,entity:"album"
    });
    return {
      title: txt(release.title || candidate.title),
      artist: creditName(release["artist-credit"]) || candidate.artist,
      albumArtist: creditName(release["artist-credit"]) || candidate.artist,
      releaseDate: date,
      year: yearOf(date),
      genres: genres,
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
      genres: unique([item.primaryGenreName]),
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
      genres: unique([album.primaryGenreName || candidate.genre]),
      trackCount: tracks.length || Number(album.trackCount || candidate.trackCount || 0),
      durationMs: tracks.reduce((sum, track) => sum + Number(track.durationMs || 0), 0),
      cover: validImage(album.artworkUrl100||candidate.item?.artworkUrl100),
      coverSource: "Apple iTunes Search API",
      description: "",
      musicBrainzId: "",
      releaseGroupId: "",
      label: "",
      country: txt(album.country),
      format: "",
      source: "Apple iTunes Search API",
      sourceUrl: txt(album.collectionViewUrl || candidate.storeUrl),
      storeUrl: txt(album.collectionViewUrl || candidate.storeUrl),
      appleCollectionId: String(album.collectionId || candidate.id || ""),
      tracks: tracks
    };
  }

  async function songFromMusicBrainz(candidate) {
    let recording = candidate.item || {};
    try {
      recording = await musicBrainzJson(MUSICBRAINZ + "/recording/" + encodeURIComponent(candidate.id) +
        "?inc=artists+releases+isrcs+tags+genres&fmt=json");
    } catch (_) {
      notify("MusicBrainz recording details were unavailable; using the search result metadata.");
    }
    const releases = recording.releases || candidate.releases || [];
    const release = releases.find(item => item && item.id) || {};
    const albumTitle=txt(release.title);
    const artist=creditName(recording["artist-credit"])||candidate.artist;
    const artwork=await resolveArtwork({
      releaseIds:releases.map(item=>item?.id),groupIds:releases.map(item=>item?.["release-group"]?.id),
      title:txt(recording.title||candidate.title),artist,albumName:albumTitle,entity:"song"
    });
    const date = txt(release.date || recording["first-release-date"] || candidate.date);
    const recordingId = txt(recording.id || candidate.id);
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
      genres: genreNames(recording),
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
      genres: unique([item.primaryGenreName || candidate.genre]),
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

  async function createSongNotes(album) {
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

    await ensureFolder(SONG_FOLDER);
    let createdCount = 0;
    let reusedCount = 0;
    for (const track of selectedTracks) {
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
        genres: track.genres && track.genres.length ? track.genres : album.genres,
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
        description: "",
        source: track.source || album.source,
        sourceUrl: track.sourceUrl,
        storeUrl: track.storeUrl || album.storeUrl
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

  // Explicitly refresh an existing note without replacing personal content.
  if(refreshing) {
    const file=(target&&String(target.path||"").startsWith(MUSIC_ROOT+"/")?target:null)||tp.app.workspace?.getActiveFile?.();
    if(!file||!file.path.startsWith(MUSIC_ROOT+"/")||!/\/(Songs|Albums)\/[^/]+\.md$/i.test(file.path)) {
      notify("Open an existing Song or Album note before refreshing.");return "";
    }
    if(typeof tp.app.fileManager?.processFrontMatter!=="function") {notify("Frontmatter editing unavailable.");return "";}
    const fm=tp.app.metadataCache?.getFileCache?.(file)?.frontmatter||{};
    const field=key=>fm[key]??fm[key.toLowerCase()]??"";
    const title=txt(field("Title")||file.basename),artist=txt(field("Artist")||field("AlbumArtist"));
    const albumName=txt(field("Album")).replace(/^\[\[|\]\]$/g,"");
    const patch={};
    if(!txt(field("Cover"))&&title&&artist) {
      let releaseIds=[],groupIds=[];
      if(kind==="album") {
        releaseIds=[txt(field("MusicBrainzId"))];groupIds=[txt(field("ReleaseGroupId"))];
      } else if(field("MusicBrainzId")) {
        try {
          const record=await musicBrainzJson(MUSICBRAINZ+"/recording/"+encodeURIComponent(txt(field("MusicBrainzId")))+"?inc=releases&fmt=json");
          releaseIds=(record.releases||[]).map(item=>item.id);
          groupIds=(record.releases||[]).map(item=>item["release-group"]?.id);
        } catch (_) {}
      }
      const art=await resolveArtwork({releaseIds,groupIds,title,artist,albumName,entity:kind});
      if(art.cover) {
        patch.Cover=art.cover;patch.CoverSource=art.coverSource;
        if(art.storeUrl&&!field("StoreUrl"))patch.StoreUrl=art.storeUrl;
      }
    }
    if(kind==="song"&&!txt(field("LyricsId"))) {
      const lyrics=await lookupLyrics({title,artist,album:albumName,durationMs:Number(field("Duration")||0)*1000});
      if(lyrics.id){
        patch.LyricsId=lyrics.id;patch.LyricsUrl=lyrics.url;
        if(!field("LyricsFile")) patch.LyricsFile=await persistLyrics(lyrics);
      }
      patch.LyricsStatus=lyrics.status;
    }
    if(Object.keys(patch).length) {
      await tp.app.fileManager.processFrontMatter(file,draft=>{
        for(const [key,value] of Object.entries(patch))if(!draft[key]&&!draft[key.toLowerCase()])draft[key]=value;
      });
      notify("Music metadata refreshed: "+Object.keys(patch).join(", "));
    } else notify("Music refresh completed. No additional artwork or lyrics record found.");
    return "";
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

  let candidates = [];
  try { candidates = await searchCandidates(query); } catch (_) { candidates = []; }
  if (!candidates.length) {
    notify("No matching music metadata was found. Creating a blank " + (kind === "album" ? "Album" : "Song") + " note.");
    return renderBlank();
  }

  let chosen = null;
  try {
    chosen = await tp.system.suggester(candidates.map(candidateLabel), candidates, false,
      kind === "album" ? "Choose an album" : "Choose a song");
  } catch (_) {}
  if (!chosen) return renderBlank();

  if (kind === "song") {
    let song;
    try {
      song = chosen.source === "musicbrainz"
        ? await songFromMusicBrainz(chosen)
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
    return renderSong(song, albumNote ? albumNote.basename : "");
  }

  let album;
  try {
    album = chosen.source === "musicbrainz"
      ? await albumFromMusicBrainz(chosen)
      : await albumFromITunes(chosen);
  } catch (_) {
    notify("Album details were unavailable. Creating a blank Album note.");
    return renderBlank();
  }
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
  const links = await createSongNotes(album);
  return renderAlbum(album, links);
};
