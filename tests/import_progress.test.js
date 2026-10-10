// Node integration checks for the shared Templater import progress UI.
// All API responses and Obsidian calls are mocked; no vault modifications.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const progressFactory = require("../90_System/92_Scripts/Template_Scripts/import_progress.js");
const gameMetadata = require("../90_System/92_Scripts/Template_Scripts/game_metadata.js");
const recipeMetadata = require("../90_System/92_Scripts/Template_Scripts/spoonacular_recipe.js");

function fakeUI() {
  const notices = [];
  const node = () => ({
    style:{}, empty(){}, setText(value){this.text=value;},
    setAttribute(key,value){this[key]=value;},
    createDiv(options = {}) {
      const child = node(); child.text = options.text || ""; return child;
    },
    createEl(name){const child=node();child.name=name;return child;}
  });
  class Notice {
    constructor(message, duration) {
      this.message=message; this.duration=duration;this.noticeEl=node();
      this.hidden=false; notices.push(this);
    }
    setMessage(message){this.message=message;}
    hide(){this.hidden=true;}
  }
  return {Notice,notices};
}

function recorder(tp) {
  const events=[];
  tp.user = {...tp.user,import_progress:(context,opts)=>{
    const real=progressFactory(context,opts);
    events.push({type:"start",title:opts.title});
    return {
      update(step,message){events.push({type:"step",step,message});real.update(step,message);},
      close(){events.push({type:"close"});real.close();}
    };
  }};
  return events;
}

function vault() {
  const created=[];
  const settings={path:"90_System/93_Configuration/settings.local.md"};
  return {
    created,settings,
    getAbstractFileByPath(path){return path===settings.path?settings:null;},
    getFiles(){return [];},
    async createFolder(path){created.push({folder:path});},
    async create(path,data){created.push({path,data});},
    async modify(path,data){created.push({path,data});},
    async createBinary(path,data){created.push({path,bytes:data?.byteLength});},
    async read(){return "";}
  };
}
function tpBase({kind="game",settings={},request=()=>({status:200,json:{}}),
  prompt="Sample",suggester=(_labels,values)=>values[0]}={}) {
  const ui=fakeUI(),v=vault(),prompts=[],renamed=[];
  const dirs={game:"20_Personal_Life/27_Game_Tracker/Games",
    movie:"20_Personal_Life/25_Media_Tracker/Movies",
    tv:"20_Personal_Life/25_Media_Tracker/TV_Series",
    recipe:"20_Personal_Life/26_Food_&_Drinks/Recipes"};
  const targetPath=dirs[kind]+"/Untitled.md";
  const tp={
    config:{target_file:{path:targetPath,stat:{size:0,ctime:9}},run_mode:2},
    obsidian:{Notice:ui.Notice,normalizePath:x=>x,TFile:class TFile{} ,requestUrl:request},
    file:{title:"Untitled",path:()=>targetPath,exists:async()=>false,
      rename:async name=>renamed.push(name)},
    date:{now:()=> "2026-10-10"},
    system:{prompt:async(...args)=>{prompts.push(args);return prompt;},
      suggester:async(...args)=>suggester(...args)},
    app:{vault:v,metadataCache:{getFileCache:()=>({frontmatter:settings})},
      plugins:{getPlugin:()=>null},fileManager:{trashFile:async()=>{}}},
    hooks:{on_all_templates_executed:()=>{}},
    user:{tmdb_media:async()=>({cover:"",backdrop:""})},
    web:{request:async()=>({})}
  };
  return {tp,ui,v,renamed,prompts,events:recorder(tp)};
}
function steps(events) {
  return events.filter(e=>e.type==="step").map(e=>e.step);
}
function closed(events) {
  assert.equal(events.filter(e=>e.type==="close").length,1);
}
function runMedia(templatePath, tp) {
  const text=fs.readFileSync(templatePath,"utf8");
  assert.match(text,/^<%\*/);
  const body=text.replace(/^<%\*/,"").replace(/%>\s*$/,"");
  const fn=new Function("tp","tR","return (async()=>{"+body+"\nreturn tR;})()");
  return fn(tp,"");
}
async function main() {
  let count=0;
  // Shared UI: nonblocking Notice, proper progress bar, elapsed time and cleanup.
  {
    const ui=fakeUI();
    const p=progressFactory({obsidian:{Notice:ui.Notice}},{title:"Media Import"});
    assert.equal(ui.notices[0].duration,0);
    p.update(1,"Searching...");
    p.update(5,"Creating note...");
    p.close();p.close();
    assert.equal(ui.notices[0].hidden,true);
    count++;
  }
  // Shared progress never crashes if Obsidian Notice DOM is unavailable.
  {
    const p=progressFactory({obsidian:{Notice:class {constructor(){}hide(){}}}},
      {title:"Fallback"});
    p.update(3,"Fetching details");p.close();count++;
  }
  const mediaDefs=[
    ["movie","Movie_Template.md","Movie Import","movie","title"],
    ["tv","TV_Show_Template.md","TV Series Import","tv","name"]
  ];
  for(const [kind,file,title,endpoint,nameKey] of mediaDefs){
    const fixture=tpBase({kind,settings:{tmdb_key:"test-key"},prompt:"Example"});
    fixture.tp.web.request=async url=>url.includes("/search/")
      ? {results:[{id:101,[nameKey]:"Example",original_language:"en"}]}
      : {id:101,[nameKey]:"Example",original_language:"en",credits:{crew:[],cast:[]},
        genres:[],external_ids:{},poster_path:"",backdrop_path:"",
        release_date:"2020-01-01",first_air_date:"2020-01-01",
        overview:"Example description",runtime:90};
    const result=await runMedia(
      "90_System/91_Templates/"+file,fixture.tp);
    assert.match(result,/^---/);
    assert.match(result,/tmdbId: 101/);
    assert.equal(fixture.events[0].title,title);
    assert.deepEqual([...new Set(steps(fixture.events))],[1,2,3,4,5]);
    closed(fixture.events);
    count++;
  }
  // TMDB error closes the Notice instead of leaving a permanent spinner.
  for(const [kind,file] of [["movie","Movie_Template.md"],["tv","TV_Show_Template.md"]]){
    const fixture=tpBase({kind,settings:{tmdb_key:"test-key"}});
    fixture.tp.web.request=async()=>{throw Error("Simulated TMDB outage");};
    await runMedia("90_System/91_Templates/"+file,fixture.tp);
    assert.ok(fixture.ui.notices.some(n=>/creation failed/i.test(n.message)));
    closed(fixture.events);
    count++;
  }
  // Steam-success path: search, choose, fetch details, images and create note.
  {
    const fixture=tpBase({request:async({url})=>{
      if(url.includes("storesearch"))return {status:200,json:{items:[{id:42,name:"Test Game",platforms:{windows:true}}]}};
      if(url.includes("appdetails"))return {status:200,json:{"42":{success:true,
        data:{steam_appid:42,name:"Test Game",platforms:{windows:true},
          screenshots:[],genres:[],developers:[],publishers:[]}}}};
      return {status:404,arrayBuffer:new Uint8Array(0).buffer};
    }});
    const result=await gameMetadata(fixture.tp);
    assert.match(result,/Title: "Test Game"/);
    assert.equal(fixture.events[0].title,"Game Import");
    assert.deepEqual([...new Set(steps(fixture.events))],[1,2,3,4,5]);
    closed(fixture.events);count++;
  }
  // Steam and RAWG absent: safe manual note with progress always closed.
  {
    const fixture=tpBase({request:async()=>({status:200,json:{items:[]}})});
    const result=await gameMetadata(fixture.tp);
    assert.match(result,/Source: "Manual"/);
    assert.ok(fixture.events.some(e=>e.message?.includes("RAWG")));
    assert.equal(steps(fixture.events).at(-1),5);
    closed(fixture.events);count++;
  }
  const meal={idMeal:"54321",strMeal:"Test Soup",strInstructions:"Boil water.",
    strArea:"British",strCategory:"Soup",strIngredient1:"Water",strMeasure1:"1 cup",strMealThumb:""};
  const mealResponse=async({url})=>{
    if(url.includes("themealdb.com"))return {status:200,json:{meals:[meal]}};
    throw Error("Unexpected endpoint "+url);
  };
  // TheMealDB-only recipe import.
  {
    const fixture=tpBase({kind:"recipe",request:mealResponse,prompt:"Soup"});
    const result=await recipeMetadata(fixture.tp);
    assert.ok(fixture.renamed.includes("Test Soup"));
    assert.match(result,/recipe_provider: "TheMealDB"/);
    assert.equal(fixture.events[0].title,"Recipe Import");
    assert.deepEqual([...new Set(steps(fixture.events))],[1,3,4,5]);
    closed(fixture.events);count++;
  }
  // Spoonacular failing switches to TheMealDB and reports the secondary phase.
  {
    const fixture=tpBase({kind:"recipe",prompt:"Soup",settings:{
      spoonacular_key:"test-key",recipe_provider:"auto"
    },request:async({url})=>url.includes("spoonacular.com")
      ? {status:429,json:{}} : mealResponse({url})});
    const result=await recipeMetadata(fixture.tp);
    assert.ok(fixture.renamed.includes("Test Soup"));
    assert.match(result,/recipe_provider: "TheMealDB"/);
    assert.ok(steps(fixture.events).includes(2));
    assert.ok(fixture.events.some(e=>e.message?.includes("TheMealDB")));
    closed(fixture.events);count++;
  }
  // Recipe no results: render blank skeleton, close notice.
  {
    const fixture=tpBase({kind:"recipe",prompt:"Not found",
      request:async()=>({status:200,json:{meals:[]}})});
    const result=await recipeMetadata(fixture.tp);
    assert.match(result,/^---/);
    assert.equal(steps(fixture.events).at(-1),1);
    closed(fixture.events);count++;
  }
  console.log(count+" import progress integration tests passed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
