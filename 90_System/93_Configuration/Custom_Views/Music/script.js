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
  let musicArtworkRecoveryAttempted=false;
  function musicSetCover() {
    const image = musicQ('[data-role="music-cover"]');
    const fallback = musicQ('[data-role="music-cover-fallback"]');
    if (!image || !fallback) return;
    const url = musicSourceImage(musicGet("Cover"));
    if (!url) { image.hidden = true; fallback.hidden = false; return; }
    image.onload = () => { image.hidden = false; fallback.hidden = true; };
    image.onerror = () => {
      image.hidden=true; fallback.hidden=false;
      const repairButton=musicQ('[data-role="music-find-artwork"]');
      if(repairButton)repairButton.hidden=false;
      musicFeedback("Cover did not load. Looking for an alternative…");
      if(!musicArtworkRecoveryAttempted && /^https:\/\//i.test(url)) {
        musicArtworkRecoveryAttempted=true;
        void musicFindArtwork();
      }
    };
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

  /* Lyrics are loaded into the view, never inserted into Markdown. LRCLIB
     grants public API access but does not grant us rights to redistribute
     arbitrary copyrighted lyrics as files or committed vault content. */
  const musicRemoteName = value => musicText(value).normalize("NFKC").toLowerCase()
    .replace(/\([^)]*(?:feat|ft|remaster|version)[^)]*\)/gi,"")
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff]+/gi," ").trim();
  const musicRemoteMatches=(left,right)=>{
    const a=musicRemoteName(left),b=musicRemoteName(right);
    return !!a&&!!b&&(a===b||(a.length>7&&b.length>7&&(a.startsWith(b+" ")||b.startsWith(a+" "))));
  };
  async function musicFetchJSON(url,timeout=12500) {
    // Browser fetch may be blocked by CORS inside the Obsidian app:// origin.
    // Prefer requestUrl (Obsidian API) when exposed into this trusted view.
    let requestUrlFn=musicContext?.obsidian?.requestUrl || musicContext?.requestUrl;
    if(typeof requestUrlFn!=="function") {
      try {
        if(typeof require==="function") requestUrlFn=require("obsidian")?.requestUrl;
      } catch(_) { /* CommonJS may not be available in Custom Views runtime. */ }
    }
    if(typeof requestUrlFn==="function") {
      const response=await requestUrlFn({url,method:"GET",headers:{Accept:"application/json"}});
      if(response.status>=400)throw Error("HTTP "+response.status);
      if(response.json!=null)return response.json;
      return JSON.parse(response.text||"{}");
    }
    const fetchImpl=musicContext?.activeWindow?.fetch?.bind(musicContext.activeWindow) ||
      (typeof fetch==="function"?fetch:null);
    if(!fetchImpl)throw Error("HTTP unavailable; run Templater Music_Refresh_Metadata.");
    const controller=typeof AbortController!=="undefined"?new AbortController():null;
    const timer=controller&&typeof setTimeout==="function"?setTimeout(()=>controller.abort(),timeout):null;
    try {
      const response=await fetchImpl(url,{method:"GET",headers:{Accept:"application/json"},
        ...(controller?{signal:controller.signal}:{})});
      if(!response.ok)throw Error("HTTP "+response.status);
      return await response.json();
    } finally {if(timer!=null&&typeof clearTimeout==="function")clearTimeout(timer);}
  }
  async function musicLoadLyrics() {
    if(musicKind!=="song")return;
    const status=musicQ('[data-role="music-lyrics-status"]');
    const display=musicQ('[data-role="music-lyrics-text"]');
    const source=musicQ('[data-role="music-lyrics-source"]');
    if(!status||!display)return;
    status.textContent="Searching LRCLIB…";
    display.hidden=true;
    display.textContent="";
    const title=musicText(musicGet("Title")||musicFile?.basename);
    const artist=musicText(musicGet("Artist"));
    const album=musicCleanWiki(musicGet("Album"));
    const duration=Number(musicGet("Duration")||0);
    if(!title||!artist){status.textContent="Add a Song title and artist to search lyrics.";return;}
    const query="track_name="+encodeURIComponent(title)+"&artist_name="+encodeURIComponent(artist)+
      (album?"&album_name="+encodeURIComponent(album):"")+
      (duration>0&&duration<=3600?"&duration="+Math.round(duration):"");
    let record=null;
    try {
      const id=Number(musicGet("LyricsId")||0);
      if(Number.isSafeInteger(id)&&id>0) {
        try{record=await musicFetchJSON("https://lrclib.net/api/get/"+id);}catch(_){}
      }
      if(!record) {
        try{record=await musicFetchJSON("https://lrclib.net/api/get?"+query);}catch(_){}
      }
      const valid=item=>musicRemoteMatches(item?.trackName||item?.name,title)&&musicRemoteMatches(item?.artistName,artist);
      if(!valid(record)) {
        record=null;
        const search=await musicFetchJSON("https://lrclib.net/api/search?track_name="+
          encodeURIComponent(title)+"&artist_name="+encodeURIComponent(artist));
        record=(Array.isArray(search)?search:[]).find(valid)||null;
      }
      if(!record) {status.textContent="No matching lyrics found on LRCLIB. Your personal Lyrics section remains editable.";return;}
      if(source&&Number.isSafeInteger(Number(record.id))) {
        source.href="https://lrclib.net/api/get/"+Number(record.id);
      }
      if(record.instrumental) {status.textContent="Instrumental — no lyrics.";return;}
      const plain=musicText(record.plainLyrics);
      const synced=musicText(record.syncedLyrics).replace(/^\[[\d:.]+\]\s*/gm,"");
      const text=plain||synced;
      if(!text){status.textContent="LRCLIB returned no lyric text for this recording.";return;}
      // Untrusted API response stays plain text. Never use innerHTML.
      display.textContent=text.slice(0,60000);
      display.hidden=false;
      status.textContent="Retrieved from LRCLIB · Read-only display";
      if(record.id&&!musicGet("LyricsId")) {
        // Preserve existing notes and personal lyrics. Only provenance fields.
        const id=String(record.id);
        try {
          await musicUpdate("LyricsId",id);
          await musicUpdate("LyricsUrl","https://lrclib.net/api/get/"+id);
          musicFrontmatter.LyricsId=id;
          musicFrontmatter.LyricsUrl="https://lrclib.net/api/get/"+id;
        } catch(_) { /* Lyrics are still visible in this session. */ }
      }
    } catch(error) {
      status.textContent="Lyrics lookup unavailable. Check your connection or use Refresh.";
    }
  }
  const musicRetry=musicQ('[data-role="music-retry-lyrics"]');
  if(musicRetry)musicRetry.addEventListener("click",()=>{void musicLoadLyrics();});
  // Only attempt network access for the opened Song view.
  if(musicKind==="song")void musicLoadLyrics();

  async function musicFindArtwork() {
    const button=musicQ('[data-role="music-find-artwork"]');
    if(!button)return;
    button.disabled=true;
    musicFeedback("Searching music artwork…");
    const title=musicText(musicGet("Title")||musicFile?.basename);
    const artist=musicText(musicGet("Artist")||musicGet("AlbumArtist"));
    const album=musicCleanWiki(musicGet("Album"));
    try {
      let cover="",source="",storeUrl="";
      const key=musicText(musicGet("ReleaseGroupId"));
      const release=musicKind==="album"?musicText(musicGet("MusicBrainzId")):"";
      for(const url of [
        ...(release?["https://coverartarchive.org/release/"+encodeURIComponent(release)]:[]),
        ...(key?["https://coverartarchive.org/release-group/"+encodeURIComponent(key)]:[])
      ]) {
        try {
          const data=await musicFetchJSON(url);
          const images=Array.isArray(data.images)?data.images:[];
          const image=images.find(x=>x?.front)||images[0];
          const candidate=image?.thumbnails?.["500"]||image?.thumbnails?.large||image?.image;
          if(/^https:\/\//i.test(musicText(candidate))) {
            cover=candidate;source="Cover Art Archive";break;
          }
        }catch(_){}
      }
      if(!cover&&title&&artist) {
        for(const country of ["VN","US"]){
          const q=encodeURIComponent(title+" "+artist);
          let data;
          try{data=await musicFetchJSON("https://itunes.apple.com/search?term="+q+
            "&entity="+(musicKind==="album"?"album":"song")+"&limit=30&country="+country);}catch(_){continue;}
          const candidates=(data.results||[]).filter(item=>
            musicRemoteMatches(musicKind==="album"?item.collectionName:item.trackName,title)&&
            musicRemoteMatches(item.artistName,artist));
          const selected=(musicKind==="song"&&album?
            candidates.find(item=>musicRemoteMatches(item.collectionName,album)):null)||candidates[0];
          const art=musicText(selected?.artworkUrl100);
          const store=musicText(musicKind==="album"?selected?.collectionViewUrl:selected?.trackViewUrl);
          if(/^https:\/\//i.test(art)&&/^https:\/\//i.test(store)){
            cover=art;source="Apple iTunes Search API";storeUrl=store;break;
          }
        }
      }
      if(!cover){musicFeedback("No matched artwork found. Try Templater: Music_Refresh_Metadata.");return;}
      await musicUpdate("Cover",cover);
      await musicUpdate("CoverSource",source);
      if(storeUrl&&!musicGet("StoreUrl")) await musicUpdate("StoreUrl",storeUrl);
      musicFrontmatter.Cover=cover;
      musicFrontmatter.CoverSource=source;
      if(storeUrl)musicFrontmatter.StoreUrl=storeUrl;
      musicSetCover();
      musicRenderMetadata();
      musicFeedback("Cover updated from "+source+".");
      button.hidden=true;
    }catch(_){musicFeedback("Cover lookup blocked or unavailable. Try Templater: Music_Refresh_Metadata.");}
    finally{button.disabled=false;}
  }
  const musicArtworkButton=musicQ('[data-role="music-find-artwork"]');
  if(musicArtworkButton){
    musicArtworkButton.hidden=!!musicGet("Cover");
    musicArtworkButton.addEventListener("click",()=>{void musicFindArtwork();});
    if(!musicGet("Cover") && musicGet("Artist") && (musicGet("Title") || musicFile?.basename)) {
      musicArtworkRecoveryAttempted=true;
      void musicFindArtwork();
    }
  }

}
