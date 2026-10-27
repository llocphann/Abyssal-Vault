// Offline Music Base regression: native artwork, right drawer and startup cleanup.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const base=fs.readFileSync(path.join(root,"20_Personal_Life/28_Music_Tracker/Music_Tracker.base"),"utf8");
const css=fs.readFileSync(path.join(root,".obsidian/snippets/02_Components.css"),"utf8");
const sync=fs.readFileSync(path.join(root,"90_System/91_Templates/Sync_Music_Custom_Views.md"),"utf8");
const media=fs.readFileSync(path.join(root,"20_Personal_Life/25_Media_Tracker/Media_Tracker.base"),"utf8");

assert.match(media,/image: note\.cover/);
assert.equal((base.match(/image: note\.Cover/g)||[]).length,3);
assert.equal((base.match(/imageAspectRatio: 1/g)||[]).length,3);
assert.equal((base.match(/- formula\.music_details/g)||[]).length,3);
assert.equal((base.match(/- formula\.music_card/g)||[]).length,3);
assert.ok(!base.includes("formula.music_art"));
assert.equal((base.match(/cardSize:\s*\d+/g)||[]).length,3);
assert.match(css,/\.bases-cards-cover/);
assert.match(css,/data-property="formula.music_details"/);
assert.match(css,/position: absolute !important/);
assert.match(css,/:is\(:hover,:focus-within\)/);
assert.doesNotMatch(css,/data-music-peek-side="left"/);
assert.doesNotMatch(sync,/const chooseSide\s*=/);
assert.match(css,/prefers-reduced-motion/);

function evaluator(name){
 const start=base.indexOf("  "+name+": |-\n");
 const end=name==="music_card"
   ?base.indexOf("  music_details: |-\n",start)
   :base.indexOf("properties:",start);
 assert.ok(start>=0&&end>start);
 const expr=base.slice(start,end).replace("  "+name+": |-\n","")
   .split("\n").map(s=>s.slice(4)).join("\n").replace(/\bif\(/g,"cond(").replace(/\.map\(/g,".map(value => ");
 const mock={cond:(a,b,c)=>a?b:c,link:x=>x,html:x=>x,
   list:value=>Array.isArray(value)?value:(value?[value]:[]),
   escapeHTML:x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
   value:{toString:()=>"Dream Pop"}};
 const optional=["DiscNumber","Source","Label","Country","Format","ISRC","ReleaseType","Language","Composer","Writer","Producer","MetadataSources","MetadataWarning"];
 const fn=new Function(...Object.keys(mock),...optional,"categories","Title","Artist","AlbumArtist",
   "Year","ReleaseDate","Duration","TrackCount","TrackNumber","Description",
   "StoreUrl","SourceUrl","Genre","Favourite","Album","file","return "+expr);
 return (kind,overrides={})=>{
   const data={Title:kind==="Albums"?"In Our Bones":"X's",Artist:"AURORA",AlbumArtist:"",
     Year:2023,ReleaseDate:"2023-01-01",Duration:210,TrackCount:12,TrackNumber:1,
     Description:"An emotional journey",StoreUrl:"https://music.apple.com/example",SourceUrl:"",
     Genre:"Dream Pop",Favourite:true,Album:"In Our Bones",...Object.fromEntries(optional.map(key=>[key,""])),...overrides};
   return fn(...Object.values(mock),...optional.map(key=>data[key]),{containsAny:(...cats)=>cats.includes(kind)},
     ...["Title","Artist","AlbumArtist","Year","ReleaseDate","Duration","TrackCount",
       "TrackNumber","Description","StoreUrl","SourceUrl","Genre","Favourite","Album"].map(key=>data[key]),
     {basename:"Fallback",path:"20_Personal_Life/28_Music_Tracker/"+(kind==="Albums"?"Albums/In Our Bones.md":"Songs/X's.md")});
 };
}
const oldRound=Number.prototype.round, oldFloor=Number.prototype.floor;
Number.prototype.round=function(){return Math.round(this)};
Number.prototype.floor=function(){return Math.floor(this)};
try {
 for(const kind of ["Albums","Songs"]){
   const compact=evaluator("music_card")(kind);
   const detail=evaluator("music_details")(kind);
   assert.match(compact,/music-peek-card/);
   assert.ok(!compact.includes("music-peek-detail"));
   assert.match(detail,/music-peek-detail/);
   assert.ok(!detail.includes("music-peek-card"));
   assert.doesNotMatch(detail,/music-peek-actions/,"Detail panel should not render footer action buttons");
   assert.doesNotMatch(detail,/\bPlay\b|Open Note|View Tracks|music-peek-more/,"Remove Play, Open Note, View Tracks, and more buttons");
   assert.doesNotMatch(compact+detail,/aria-label=|title=/,"Remove hover tooltip attributes (Music details, Favourite, etc.)");
   assert.match(compact,/internal-link music-peek-note-link/);
   assert.match(detail,/internal-link music-peek-note-link/);
   assert.match(detail,/music-peek-meta/);
   assert.match(detail,/An emotional journey/);
   assert.match(compact,/Dream Pop/);
   assert.match(compact,/music-peek-heart/);
   assert.ok(!compact.includes("music-peek-overline"));
   assert.ok(!/\{(?:title|artist|heart|year|duration|track|genres|description|source)\}/.test(compact+detail));
   assert.match(css,/--music-peek-surface:\s*var\(--bases-bg\)/);
   assert.match(css,/--music-peek-panel:\s*var\(--bases-bg-alt\)/);
   assert.match(css,/--music-peek-accent:\s*var\(--bases-accent\)/);
   assert.match(css,/\.theme-light\s+\.bases-view[\s\S]*?--music-peek-text:\s*var\(--bases-heading\)/);
   assert.match(css,/\.theme-light\s+\.bases-view[\s\S]*?--music-peek-muted:\s*var\(--bases-text-soft\)/);
   assert.match(css,/LONG-PLAY RELEASES/);
   assert.match(css,/SINGLES & TRACKS/);
   assert.match(css,/translate\(calc\(100% \+ 22px\),\s*0\)/);
   assert.match(css,/translate\(calc\(100% - 100cqw\),\s*calc\(100% \+ 22px\)\)/);
   assert.match(css,/translate\(calc\(200% \+ 22px - 100cqw\),\s*calc\(100% \+ 22px\)\)/);
   assert.doesNotMatch(css,/padding:\s*8px\s+calc\(var\(--music-peek-panel-width\)\s*\+\s*18px\)/);
   assert.match(css,/& \.bases-group-heading[\s\S]*?inset-inline:\s*12px !important[\s\S]*?width:\s*auto !important/);
 }
}finally {
 if(oldRound)Number.prototype.round=oldRound;else delete Number.prototype.round;
 if(oldFloor)Number.prototype.floor=oldFloor;else delete Number.prototype.floor;
}

async function runStartup() {
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const startScript=sync.replace(/^<%\*\s*/,"").replace(/\s*%>\s*$/,"");
  const run=new AsyncFunction("app","tp","console","setTimeout","clearTimeout",startScript);
  const makeCard=()=>{
    const attrs=new Map([["data-music-peek-side","left"]]);
    const styles=new Map([["--music-peek-drawer-width","185px"],["color","red"]]);
    return {attrs,styles,removeAttribute:name=>attrs.delete(name),
      style:{removeProperty:name=>styles.delete(name)}};
  };
  const currentCard=makeCard(),previousCard=makeCard();
  const makeDocument=card=>{
    const events=new Map();
    return {events,addCount:0,
      addEventListener(name,callback){this.addCount++;events.set(name,callback)},
      removeEventListener(name,callback){if(events.get(name)===callback)events.delete(name)},
      querySelectorAll:selector=>{
        assert.match(selector,/Music Library/);
        assert.match(selector,/Favourite Songs/);
        assert.match(selector,/Favourite Albums/);
        assert.match(selector,/\.bases-cards-item/);
        return [card];
      }};
  };
  const doc=makeDocument(currentCard),oldDoc=makeDocument(previousCard);
  const oldHandler=()=>{};
  oldDoc.events.set("pointerover",oldHandler);
  oldDoc.events.set("focusin",oldHandler);
  const win={__abyssalMusicPeekListeners:{doc:oldDoc,handler:oldHandler}};
  doc.defaultView=win;
  const unrelated={id:"unrelated-view",name:"Owner view"};
  let saves=0,refreshes=0,offrefs=0;
  const plugin={settings:{views:[unrelated]},saveSettings:async()=>{saves++},refreshAllViews:()=>{refreshes++}};
  const files={
    "Song.html": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/Song.html"),"utf8"),
    "Album.html": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/Album.html"),"utf8"),
    "styles.css": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/styles.css"),"utf8"),
    "script.js": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/script.js"),"utf8"),
    "song-view.json": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/song-view.json"),"utf8"),
    "album-view.json": fs.readFileSync(path.join(root,"90_System/93_Configuration/Custom_Views/Music/album-view.json"),"utf8")
  };
  const app={
    plugins:{getPlugin:()=>plugin},
    vault:{adapter:{read:async p=>files[p.split("/").at(-1)]},getAbstractFileByPath:()=>({stat:{mtime:100,size:200}}),
      on:()=>({}),offref:()=>{offrefs++}},
    workspace:{containerEl:{ownerDocument:doc},on:()=>({}),offref:()=>{}}
  };
  const tp={obsidian:{requestUrl:async()=>({status:200,json:{}})}};
  const quiet={warn:()=>{},info:()=>{},error:()=>{}};
  await run(app,tp,quiet,setTimeout,clearTimeout);
  assert.equal(oldDoc.events.size,0,"Remove old pointer/focus listeners from their original document");
  assert.equal(doc.addCount,0,"Right-side CSS drawer needs no replacement hover listeners");
  assert.ok(!Object.hasOwn(win,"__abyssalMusicPeekListeners"));
  for(const card of [currentCard,previousCard]){
    assert.ok(!card.attrs.has("data-music-peek-side"),"Clear stale direction overrides");
    assert.ok(!card.styles.has("--music-peek-drawer-width"),"Clear stale inline widths");
    assert.equal(card.styles.get("color"),"red","Retain unrelated inline styles");
  }
  assert.deepEqual(plugin.settings.views.map(v=>v.id),["music-song-v1","music-album-v1","unrelated-view"]);
  assert.equal(plugin.settings.views[2],unrelated,"Retain existing unrelated views");
  assert.equal(typeof win.__abyssalMusicRequest,"function","Metadata provider bridge remains available");
  await run(app,tp,quiet,setTimeout,clearTimeout);
  assert.equal(doc.addCount,0,"Repeated startup installs no hover/focus listeners");
  assert.equal(saves,1,"Identical repeated source sync does not resave plugin settings");
  assert.equal(refreshes,2,"Repeated source sync still refreshes open views");
  assert.equal(offrefs,2,"Previous source-sync subscriptions are removed before reinstalling");
  assert.deepEqual(plugin.settings.views.map(v=>v.id),["music-song-v1","music-album-v1","unrelated-view"]);
}
runStartup().then(()=>console.log("Music Base formula and startup-cleanup fixture tests passed.")).catch(error=>{
 console.error(error);process.exitCode=1;
});
