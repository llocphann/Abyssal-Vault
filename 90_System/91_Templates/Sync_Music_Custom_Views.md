<%*
/* Startup sync from authoritative Music Custom Views source files.
   The plugin data snapshot is also committed so the views are available immediately. */
const root = "90_System/93_Configuration/Custom_Views/Music";

/* Same-origin-free HTTP bridge for Music Custom Views. Registered at Templater
 * startup; restrict outbound calls to publicly accessible Music metadata
 * providers. No credentials, headers from notes, or arbitrary hosts. */
try {
  const win = app.workspace?.containerEl?.ownerDocument?.defaultView;
  const request = tp.obsidian?.requestUrl;
  if (win && typeof request === "function") {
    win.__abyssalMusicRequest = async url => {
      const parsed = new URL(String(url));
      const allowed = new Set([
        "coverartarchive.org", "itunes.apple.com", "lrclib.net",
        "musicbrainz.org"
      ]);
      if (parsed.protocol !== "https:" || !allowed.has(parsed.hostname)) {
        throw new Error("Music request rejected: provider not allowlisted");
      }
      const result = await request({
        url: parsed.toString(), method: "GET",
        headers: { Accept: "application/json" }
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error("Music metadata HTTP " + result.status);
      }
      return result.json != null ? result.json : JSON.parse(result.text || "{}");
    };
  }
} catch (error) {
  console.warn("[Music] Could not initialize Obsidian request bridge:", error);
}

async function waitForCustomViews() {
  for(let attempt=0;attempt<40;attempt++){
    const plugin=app.plugins.getPlugin?.("custom-views") ??
      app.plugins.plugins?.["custom-views"];
    if(plugin?.settings?.views)return plugin;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  return null;
}
const sourceFiles=["Song.html","Album.html","styles.css","script.js","song-view.json","album-view.json"];
let lastSourceVersion="";
function musicSourceVersion() {
  return sourceFiles.map(file=>{
    const info=app.vault.getAbstractFileByPath(root+"/"+file)?.stat;
    return (info?.mtime||0)+":"+(info?.size||0);
  }).join("|");
}
let running=null;
async function synchronizeMusicViews() {
  if(running)return running;
  running=(async()=>{
    const plugin=await waitForCustomViews();
    if(!plugin){
      console.warn("[Music] Custom Views plugin is not ready. Music sync skipped.");
      return false;
    }
    const read=file=>app.vault.adapter.read(root+"/"+file);
    const [songHtml,albumHtml,css,js,songJSON,albumJSON]=await Promise.all(sourceFiles.map(read));
    new Function("tp",js);
    const entries=[
      {...JSON.parse(songJSON),template:songHtml.trimEnd(),css:css.trimEnd(),js:js.trimEnd()},
      {...JSON.parse(albumJSON),template:albumHtml.trimEnd(),css:css.trimEnd(),js:js.trimEnd()}
    ];
    const own=new Set(entries.map(entry=>entry.id));
    const retained=plugin.settings.views.filter(view=>!own.has(view?.id));
    // Folder-specific Music views must precede broad/default matchers.
    const next=[...entries,...retained];
    const changed=JSON.stringify(next)!==JSON.stringify(plugin.settings.views);
    if(changed){
      plugin.settings.views=next;
      await plugin.saveSettings();
      console.info("[Music] Song/Album Custom Views updated from source.");
    }
    // Re-render even when values are identical, to clear an in-memory view
    // instance that was created before the source files were pulled.
    plugin.refreshAllViews?.();
    lastSourceVersion=musicSourceVersion();
    return true;
  })();
  try{return await running;}
  catch(error){
    console.error("[Music] Source sync failed:",error);
    return false;
  }finally{running=null;}
}
const synced=await synchronizeMusicViews();
// Live source sync while Obsidian remains open. A manual Templater run also
// forces re-render; listeners are de-duplicated between invocations.
const syncWindow=app.workspace?.containerEl?.ownerDocument?.defaultView;
/* Enrich only an opened, identified Music note. The importer owns provider
 * matching and missing-only frontmatter edits; the startup note is never its
 * target. Keep a signature/cooldown across source-sync reruns, and let the
 * importer persist the same signature after its own metadata changes. */
if(syncWindow){
  const stateKey="__abyssalMusicEnrichmentState";
  const state=syncWindow[stateKey] || {inflight:new Map(),attempts:new Map()};
  syncWindow[stateKey]=state;
  const metadataVersion=2;
  const cooldown=24*60*60*1000;
  const failureCooldown=60*1000;
  const importerPath="90_System/92_Scripts/Template_Scripts/music_metadata.js";
  const signatureFields=[
    "Title","Artist","Album","AlbumArtist","MusicBrainzId","ReleaseGroupId",
    "AppleTrackId","AppleCollectionId","SourceUrl","StoreUrl","Year",
    "ReleaseDate","Duration","Genre","Description","TrackNumber","DiscNumber",
    "TrackCount","Tracklist","Label","Country","Format","ISRC",
    "ReleaseType","Language","Composer","Writer","Producer"
  ];
  const field=(frontmatter,key)=>frontmatter[key]??frontmatter[key.toLowerCase()]??"";
  const filled=value=>Array.isArray(value)?value.length>0:
    (typeof value==="number"?Number.isFinite(value)&&value>0:String(value??"").trim()!==""&&String(value)!=="0");
  const supported=path=>typeof path==="string" &&
    /^20_Personal_Life\/28_Music_Tracker\/(Songs|Albums)\/[^/\\\u0000-\u001f]+\.md$/.test(path) &&
    !path.split("/").includes("..");
  const signature=frontmatter=>{
    const source=app.vault.getAbstractFileByPath(importerPath)?.stat;
    return JSON.stringify([metadataVersion,source?.mtime||0,source?.size||0,
      ...signatureFields.map(key=>field(frontmatter,key))]);
  };
  const readFrontmatter=(file,content)=>{
    if(typeof tp.obsidian?.parseYaml==="function"){
      const match=String(content).match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if(match){
        try{
          const parsed=tp.obsidian.parseYaml(match[1])||{};
          return typeof parsed==="object"&&!Array.isArray(parsed)?parsed:null;
        }catch(_){return null;}
      }
    }
    return app.metadataCache?.getFileCache?.(file)?.frontmatter||{};
  };
  syncWindow.__abyssalMusicEnrich=async (path,options={})=>{
    if(!supported(path))return {status:"ignored"};
    if(state.inflight.has(path))return state.inflight.get(path);
    if(typeof tp.user?.music_metadata!=="function" || typeof app.vault.read!=="function")
      return {status:"unavailable"};
    const operation=(async()=>{
      let attemptSignature="";
      try{
        const file=app.vault.getAbstractFileByPath(path);
        if(!file||file.path!==path)return {status:"ignored"};
        const content=await app.vault.read(file);
        const frontmatter=readFrontmatter(file,content);
        if(!frontmatter)return {status:"invalid"};
        if(!filled(field(frontmatter,"Artist"))&&!filled(field(frontmatter,"AlbumArtist")))
          return {status:"unidentified"};
        const keys=path.includes("/Albums/")
          ?["Year","ReleaseDate","Duration","Genre","Description","TrackCount","Tracklist","Label","Country","Format","ReleaseType","Language","Composer","Writer","Producer"]
          :["Year","ReleaseDate","Duration","Genre","Description","Album","AlbumArtist","TrackNumber","DiscNumber","ISRC","Composer","Writer","Producer"];
        if(!options.force&&keys.every(key=>filled(field(frontmatter,key))))return {status:"complete"};
        attemptSignature=signature(frontmatter);
        const now=Date.now();
        const previous=state.attempts.get(path);
        const checkedAt=Date.parse(String(field(frontmatter,"MetadataCheckedAt")));
        if(!options.force&&((previous?.signature===attemptSignature&&previous.until>now)||
          (Number(field(frontmatter,"MetadataVersion"))===metadataVersion&&
           field(frontmatter,"MetadataSignature")===attemptSignature&&
           Number.isFinite(checkedAt)&&checkedAt<=now&&now-checkedAt<cooldown)))
          return {status:"cached"};
        let completedSignature="";
        const context={...tp,app,
          config:{...tp.config,target_file:file,active_file:file,run_mode:0,
            music_enrichment_version:metadataVersion,
            music_enrichment_signature:draft=>(completedSignature=signature(draft))},
          file:{title:file.basename||path.split("/").at(-1).replace(/\.md$/i,""),content}
        };
        const result=await tp.user.music_metadata(context,"enrich");
        if(result?.status==="failed"){
          state.attempts.set(path,{signature:attemptSignature,until:Date.now()+failureCooldown});
          return {status:"failed",path};
        }
        state.attempts.set(path,{signature:completedSignature||attemptSignature,until:Date.now()+cooldown});
        return {status:"checked",path};
      }catch(error){
        if(attemptSignature)state.attempts.set(path,{signature:attemptSignature,until:Date.now()+failureCooldown});
        console.warn("[Music] Automatic metadata enrichment unavailable:",error);
        return {status:"failed",path};
      }
    })();
    state.inflight.set(path,operation);
    try{return await operation;}finally{state.inflight.delete(path);}
  };
}
if(syncWindow){
  const key="__abyssalMusicSyncSubscriptions";
  const previous=syncWindow[key];
  if(previous){
    for(const ref of previous.refs||[]){
      try{app.vault.offref(ref);}catch(_){}
      try{app.workspace.offref(ref);}catch(_){}
    }
    if(previous.timer)clearTimeout(previous.timer);
  }
  const state={refs:[],timer:null};
  const schedule=()=>{
    if(state.timer)clearTimeout(state.timer);
    state.timer=setTimeout(()=>{
      state.timer=null;
      void synchronizeMusicViews();
    },350);
  };
  const changedFile=app.vault.on("modify",file=>{
    if(sourceFiles.some(name=>file?.path===root+"/"+name))schedule();
  });
  if(changedFile)state.refs.push(changedFile);
  const opened=app.workspace.on("file-open",file=>{
    if(!file?.path?.startsWith("20_Personal_Life/28_Music_Tracker/"))return;
    if(musicSourceVersion()!==lastSourceVersion)schedule();
    void syncWindow.__abyssalMusicEnrich?.(file.path);
  });
  if(opened)state.refs.push(opened);
  syncWindow[key]=state;
  const activeFile=app.workspace.getActiveFile?.();
  if(activeFile?.path)void syncWindow.__abyssalMusicEnrich?.(activeFile.path);
}

/* The Music Base drawer now expands to the right through CSS. Remove the
 * previous side-selection handlers and their per-card overrides when this
 * startup template is rerun in an already open Obsidian window. */
if(syncWindow){
  const key="__abyssalMusicPeekListeners";
  const previous=syncWindow[key];
  if(previous?.doc&&previous?.handler){
    previous.doc.removeEventListener?.("pointerover",previous.handler,true);
    previous.doc.removeEventListener?.("focusin",previous.handler,true);
  }
  delete syncWindow[key];
  const musicCards='.bases-view:is([data-view-name="Music Library"],[data-view-name="Favourite Songs"],[data-view-name="Favourite Albums"]) .bases-cards-item';
  const documents=new Set([previous?.doc,app.workspace?.containerEl?.ownerDocument]);
  for(const doc of documents){
    doc?.querySelectorAll?.(musicCards)?.forEach(item=>{
      item.removeAttribute?.("data-music-peek-side");
      item.style?.removeProperty?.("--music-peek-drawer-width");
    });
  }
}

if(!synced)console.warn("[Music] Music views remain unsynced; run the Sync_Music_Custom_Views template after plugins load.");
%>
