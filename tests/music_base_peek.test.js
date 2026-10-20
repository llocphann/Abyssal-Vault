// Music Base Media-parity regression: native cover and separate hover property.
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
assert.equal((base.match(/cardSize: 250/g)||[]).length,3);
assert.match(css,/\.bases-cards-cover/);
assert.match(css,/data-property="formula.music_details"/);
assert.match(css,/position: absolute !important/);
assert.match(css,/:is\(:hover,:focus-within\)/);
assert.match(css,/data-music-peek-side="left"/);
assert.match(css,/prefers-reduced-motion/);

function evaluator(name){
 const start=base.indexOf("  "+name+": |-\n");
 const end=name==="music_card"
   ?base.indexOf("  music_details: |-\n",start)
   :base.indexOf("properties:",start);
 assert.ok(start>=0&&end>start);
 const expr=base.slice(start,end).replace("  "+name+": |-\n","")
   .split("\n").map(s=>s.slice(4)).join("\n").replace(/\bif\(/g,"cond(");
 const mock={cond:(a,b,c)=>a?b:c,link:x=>x,html:x=>x,
   list:()=>({slice:()=>({map:value=>({join:()=>value})})}),
   escapeHTML:x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
   value:{toString:()=>"Dream Pop"}};
 const fn=new Function(...Object.keys(mock),"categories","Title","Artist","AlbumArtist",
   "Year","ReleaseDate","Duration","TrackCount","TrackNumber","Description",
   "StoreUrl","SourceUrl","Genre","Favourite","Album","file","return "+expr);
 return kind=>fn(...Object.values(mock),{containsAny:(...cats)=>cats.includes(kind)},
   kind==="Albums"?"In Our Bones":"X's","AURORA","",2023,"2023-01-01",
   210,12,1,"An emotional journey","https://music.apple.com/example","",
   "Dream Pop",true,"In Our Bones",{basename:"Fallback"});
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
   assert.match(detail,/Listen ↗/);
   assert.match(detail,/An emotional journey/);
   assert.match(compact,/Dream Pop/);
   assert.match(compact,/music-peek-heart/);
   assert.ok(!/\{(?:title|artist|heart|year|duration|track|genres|description|source)\}/.test(compact+detail));
 }
}finally {
 if(oldRound)Number.prototype.round=oldRound;else delete Number.prototype.round;
 if(oldFloor)Number.prototype.floor=oldFloor;else delete Number.prototype.floor;
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
