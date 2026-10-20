// Offline tests for Music Base compact card + hover peek on dev.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const base = fs.readFileSync(path.join(root, "20_Personal_Life/28_Music_Tracker/Music_Tracker.base"),"utf8");
const css = fs.readFileSync(path.join(root, ".obsidian/snippets/02_Components.css"),"utf8");
const sync = fs.readFileSync(path.join(root, "90_System/91_Templates/Sync_Music_Custom_Views.md"),"utf8");

assert.match(base,/image\(Cover\)/);
assert.match(base,/icon\("disc-3"\)/);
assert.equal((base.match(/cardSize: 250/g)||[]).length,3);
assert.ok(!base.includes("music-song-card")&&!base.includes("music-album-card"));
assert.ok(base.includes("music-peek-card music-peek-album"));
assert.ok(base.includes("music-peek-card music-peek-song"));
assert.ok(base.includes(".replace(/\\{title\\}/g,"));
assert.ok(base.includes(".replace(/\\{artist\\}/g,"));
assert.ok(base.includes(".replace(/\\{heart\\}/g,"));
assert.ok(!base.includes("Add your personal reflections in the note."));
assert.match(css,/\.music-peek-detail\s*\{\s*position: absolute !important/);
assert.match(css,/data-music-peek-side="left"/);
assert.match(css,/pointer-events: none/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/\(hover: none\)/);
assert.match(css,/z-index: 80 !important/);

const expression = base.slice(base.indexOf("  music_card: |-"),base.indexOf("properties:"))
  .replace(/^  music_card: \|-\n/,"")
  .split("\n").map(line=>line.slice(4)).join("\n").replace(/\bif\(/g,"cond(");
const fake = {
  cond: (check,yes,no)=>check?yes:no,
  link: x=>x,
  html: x=>x,
  list:()=>({slice:()=>({map:rendered=>({join:()=>rendered})})}),
  escapeHTML: x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),
  value: {toString:()=>"Dream Pop"}
};
const evalFormula=new Function(...Object.keys(fake),
  "categories","Title","Artist","AlbumArtist","Year","ReleaseDate","Duration","TrackCount","TrackNumber",
  "Description","StoreUrl","SourceUrl","Genre","Favourite","Album","file","return "+expression);
const originalRound=Number.prototype.round, originalFloor=Number.prototype.floor;
Number.prototype.round=function(){return Math.round(this)};
Number.prototype.floor=function(){return Math.floor(this)};
try {
  for(const kind of ["Albums","Songs"]){
    const name=kind==="Albums"?"In Our Bones":"X's";
    const output=evalFormula(...Object.values(fake),
      {containsAny:(...values)=>values.includes(kind)},
      name,"AURORA","",2023,"2023-01-01",210,12,1,"Test description",
      "https://music.apple.com/test","","Dream Pop",true,"In Our Bones",{basename:"fallback"});
    assert.match(output,/music-peek-detail/);
    assert.match(output,/music-peek-compact/);
    assert.match(output,/class='music-peek-heart'/);
    assert.ok(output.includes(name));
    assert.match(output,/Dream Pop/);
    assert.match(output,/Listen ↗/);
    assert.ok(!/\{(?:title|artist|compactGenres|compactYear|year|heart|tracks|duration|genres|source|album|track|description)\}/.test(output));
    assert.ok(!output.includes('href="javascript:'));
  }
}finally {
 if(originalRound)Number.prototype.round=originalRound;else delete Number.prototype.round;
 if(originalFloor)Number.prototype.floor=originalFloor;else delete Number.prototype.floor;
}

async function runStartup() {
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const startScript=sync.replace(/^<%\*\s*/,"").replace(/\s*%>\s*$/,"");
  const run=new AsyncFunction("app","tp","console","setTimeout","clearTimeout",startScript);
  const events=new Map();
  const doc={
    documentElement:{clientWidth:1200},
    addEventListener:(name,callback)=>events.set(name,callback),
    removeEventListener:(name,callback)=>{
      if(events.get(name)===callback)events.delete(name);
    }
  };
  const win={innerWidth:1200,matchMedia:()=>({matches:false})};
  const plugin={settings:{views:[]},saveSettings:async()=>{},refreshAllViews:()=>{}};
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
      on:()=>({}),offref:()=>{}},
    workspace:{containerEl:{ownerDocument:{...doc,defaultView:win}},
      on:()=>({}),offref:()=>{}}
  };
  await run(app,{obsidian:{requestUrl:async()=>({status:200,json:{}})}},
    {warn:()=>{},info:()=>{},error:()=>{}},setTimeout,clearTimeout);
  assert.ok(events.has("pointerover"));
  assert.ok(events.has("focusin"));
  assert.deepEqual(plugin.settings.views.slice(0,2).map(v=>v.id),["music-song-v1","music-album-v1"]);
  const item={
    dataset:{},
    closest:(s)=>s===".bases-view"?{getAttribute:()=> "Favourite Songs"}:null,
    getBoundingClientRect:()=>({left:925,right:1175})
  };
  events.get("pointerover")({target:{closest:()=>item}});
  assert.equal(item.dataset.musicPeekSide,"left");
  item.getBoundingClientRect=()=>({left:32,right:282});
  events.get("focusin")({target:{closest:()=>item}});
  assert.equal(item.dataset.musicPeekSide,"right");
  await run(app,{obsidian:{requestUrl:async()=>({status:200,json:{}})}},
    {warn:()=>{},info:()=>{},error:()=>{}},setTimeout,clearTimeout);
  assert.equal(events.size,2,"Listeners deduplicate after repeated startup");
}
runStartup().then(()=>console.log("Music Base hover/peek tests passed.")).catch(error=>{
 console.error(error);process.exitCode=1;
});
