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
  });
  if(opened)state.refs.push(opened);
  syncWindow[key]=state;
}

/* Music Base hover cards may sit at the gallery's right edge. Choose which
 * direction their floating drawer should open at pointer/focus time. Native
 * Base cards keep their layout slot fixed, so siblings never reflow. */
if(syncWindow){
  const doc=app.workspace?.containerEl?.ownerDocument;
  const key="__abyssalMusicPeekListeners";
  const previous=syncWindow[key];
  if(previous?.doc&&previous?.handler){
    previous.doc.removeEventListener("pointerover",previous.handler,true);
    previous.doc.removeEventListener("focusin",previous.handler,true);
  }
  if(doc?.addEventListener){
    const names=new Set(["Music Library","Favourite Songs","Favourite Albums"]);
    const chooseSide=event=>{
      const item=event.target?.closest?.(".bases-cards-item:has(.music-peek-card)");
      if(!item)return;
      const view=item.closest(".bases-view");
      if(!names.has(view?.getAttribute("data-view-name")))return;
      if(syncWindow.matchMedia?.("(hover: none), (max-width: 700px)")?.matches)return;
      const rect=item.getBoundingClientRect();
      const pane=item.closest(".workspace-leaf-content") ||
        item.closest(".workspace-leaf");
      const bounds=pane?.getBoundingClientRect?.();
      const viewportWidth=doc.documentElement?.clientWidth||syncWindow.innerWidth;
      const edgeLeft=Math.max(0,bounds?.left??0);
      const edgeRight=Math.min(viewportWidth,bounds?.right??viewportWidth);
      const availableRight=Math.max(0,edgeRight-rect.right);
      const availableLeft=Math.max(0,rect.left-edgeLeft);
      const side=availableRight>=availableLeft?"right":"left";
      item.dataset.musicPeekSide=side;
      const room=side==="right"?availableRight:availableLeft;
      // The drawer is kept within the Bases workspace pane (not just
      // browser viewport, which may include Calendar or DevTools panes).
      const size=Math.max(185,Math.min(325,room-10));
      item.style?.setProperty?.("--music-peek-drawer-width",size+"px");
    };
    doc.addEventListener("pointerover",chooseSide,true);
    doc.addEventListener("focusin",chooseSide,true);
    syncWindow[key]={doc,handler:chooseSide};
  }
}

if(!synced)console.warn("[Music] Music views remain unsynced; run the Sync_Music_Custom_Views template after plugins load.");
%>
