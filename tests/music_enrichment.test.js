// Offline regression coverage for Music artwork, lyrics provenance and safe note refresh.
const assert = require("node:assert/strict");
const importer = require("../90_System/92_Scripts/Template_Scripts/music_metadata.js");
const ROOT="20_Personal_Life/28_Music_Tracker";
const SONGS=ROOT+"/Songs";
const ALBUMS=ROOT+"/Albums";
function fixture({kind="song",mode=kind,provider="musicbrainz",missingRelease=false,fromGroup=false,refresh=false}={}) {
  const existing = refresh;
  const path=(kind==="song"?SONGS:ALBUMS)+"/"+(existing?"Existing":"Untitled")+".md";
  const fm={Title:kind==="song"?"Quiet Night":"Blue Hour",Artist:"Test Artist",
    Album:"Blue Hour",Duration:210,MusicBrainzId:kind==="song"?"recording-1":"release-1",
    ReleaseGroupId:"group-1",Favourite:true,PersonalRating:4,Cover:"",LyricsId:""};
  const changes=[],calls=[],localFiles=new Map(),dirs=new Set([ROOT,SONGS,ALBUMS]);
  const target={path,basename:existing?"Existing":"Untitled",stat:{size:existing?320:0,ctime:42}};
  const requests=[];
  const remote=async url=>{
    requests.push(url);
    if(url.includes("/recording/?query=")) return {recordings:provider==="itunes"?[]:[{
      id:"recording-1",title:"Quiet Night","artist-credit":[{name:"Test Artist"}],
      length:210000,releases:[{id:"release-1",title:"Blue Hour",date:"2024-01-01",
        "artist-credit":[{name:"Test Artist"}],"release-group":{id:"group-1"}}]}]};
    if(url.includes("/recording/recording-1?"))return {
      id:"recording-1",title:"Quiet Night","artist-credit":[{name:"Test Artist"}],
      length:210000,releases:[{id:"release-1",title:"Blue Hour",date:"2024-01-01",
        "artist-credit":[{name:"Test Artist"}],"release-group":{id:"group-1"}}]};
    if(url.includes("/release/?query="))return {releases:[{id:"release-1",title:"Blue Hour",
      "artist-credit":[{name:"Test Artist"}],date:"2024-01-01"}]};
    if(url.includes("/release/release-1?"))return {id:"release-1",title:"Blue Hour",
      "artist-credit":[{name:"Test Artist"}],date:"2024-01-01",
      "release-group":{id:"group-1"},media:[{position:1,tracks:[{
        title:"Quiet Night",position:1,length:210000,
        recording:{id:"recording-1",title:"Quiet Night","artist-credit":[{name:"Test Artist"}]}
      }]}]};
    if(url.includes("coverartarchive.org/release/release-1")) {
      if(missingRelease||provider==="itunes"||fromGroup)throw Error("Not found");
      return {images:[{front:true,thumbnails:{"500":"https://coverartarchive.org/release-cover.jpg"}}]};
    }
    if(url.includes("coverartarchive.org/release-group/group-1")) {
      if(fromGroup)return {images:[{front:true,thumbnails:{"500":"https://coverartarchive.org/group-cover.jpg"}}]};
      throw Error("Not found");
    }
    if(url.includes("lrclib.net/api/get?"))return {id:71,trackName:"Quiet Night",
      artistName:"Test Artist",duration:210,plainLyrics:"Fixture words, not actual song lyrics."};
    if(url.includes("itunes.apple.com/search?")) {
      if(provider!=="itunes"&&!missingRelease)return {results:[]};
      return {results:[{wrapperType:"track",kind:"song",trackId:91,trackName:"Quiet Night",
        artistName:"Test Artist",collectionName:"Blue Hour",releaseDate:"2024-01-01",
        artworkUrl100:"https://is1-ssl.mzstatic.com/artwork.jpg",
        trackViewUrl:"https://music.apple.com/test-song",
        collectionViewUrl:"https://music.apple.com/test-album",
        collectionId:5,trackTimeMillis:210000}]};
    }
    if(url.includes("itunes.apple.com/lookup?"))return {results:[]};
    throw Error("Unmocked "+url);
  };
  const tp={
    config:{target_file:target,run_mode:0},
    file:{title:existing?"Existing":"Untitled",content:existing?"":"",rename:async name=>{tp.file.title=name;target.basename=name;target.path=(kind==="song"?SONGS:ALBUMS)+"/"+name+".md";},create_new:async()=>{}},
    date:{now:fmt=>fmt==="YYYY-MM-DD"?"2026-10-20":"20261020-010000"},
    obsidian:{requestUrl:async({url})=>({status:200,json:await remote(url)}),Notice:class{}},
    system:{prompt:async()=>kind==="song"?"Quiet Night":"Blue Hour",
      suggester:async(labels,items,ignored,prompt)=>prompt==="How should song notes be created?"?"none":items[0]},
    app:{
      workspace:{getActiveFile:()=>target},
      vault:{read:async()=>existing?"---\nTitle: Existing\n---\n\n## Personal Reflections\n- Original thoughts":"" ,
        getAbstractFileByPath:path=>localFiles.has(path)||dirs.has(path)?{path}:null,
        getMarkdownFiles:()=>[],
        createFolder:async path=>{dirs.add(path);},
        create:async(path,body)=>{if(localFiles.has(path))throw Error("Cannot overwrite lyrics");localFiles.set(path,body);return {path};}
      },
      metadataCache:{getFileCache:()=>({frontmatter:fm})},
      fileManager:{processFrontMatter:async(file,fn)=>{const draft={...fm};fn(draft);
        changes.push(draft);Object.assign(fm,draft);}}
    }
  };
  return {tp,calls,changes,requests,fm,remote,mode,localFiles};
}
async function run(){
  {const f=fixture({fromGroup:true});
    const note=await importer(f.tp,"song");
    assert.match(note,/Cover: "https:\/\/coverartarchive.org\/group-cover.jpg"/);
    assert.match(note,/LyricsId: "71"/);
    assert.match(note,/LyricsStatus: "available"/);
    assert.match(note,/LyricsFile: "20_Personal_Life\/28_Music_Tracker\/Lyrics\/LRCLIB-71.txt"/);
    assert.equal(f.localFiles.get(ROOT+"/Lyrics/LRCLIB-71.txt"),"Fixture words, not actual song lyrics.\n");
    assert.ok(!note.includes("Fixture words, not actual song lyrics"));
    assert.ok(!note.includes("## Lyrics"));
  }
  {const f=fixture({provider:"itunes"});
    const note=await importer(f.tp,"song");
    assert.match(note,/Cover: "https:\/\/is1-ssl.mzstatic.com\/artwork.jpg"/);
    assert.match(note,/StoreUrl: "https:\/\/music.apple.com\/test-song"/);
    assert.match(note,/CoverSource: "Apple iTunes Search API"/);
  }
  {const f=fixture({kind:"album",fromGroup:true});
    const note=await importer(f.tp,"album");
    assert.match(note,/Cover: "https:\/\/coverartarchive.org\/group-cover.jpg"/);
    assert.match(note,/CoverSource: "Cover Art Archive"/);
  }
  {const f=fixture({refresh:true,missingRelease:true,kind:"song"});
    const text=await importer(f.tp,"refresh");
    assert.equal(text,"");
    assert.equal(f.changes.length,1);
    assert.equal(f.fm.Favourite,true);
    assert.equal(f.fm.PersonalRating,4);
    assert.equal(f.fm.Cover,"https://is1-ssl.mzstatic.com/artwork.jpg");
    assert.equal(f.fm.LyricsId,"71");
    assert.equal(f.fm.LyricsFile,ROOT+"/Lyrics/LRCLIB-71.txt");
    assert.ok(!Object.hasOwn(f.changes[0],"PersonalReflections"));
  }
  {const f=fixture({refresh:true,kind:"album",fromGroup:true});
    const text=await importer(f.tp,"refresh");
    assert.equal(text,"");
    assert.equal(f.fm.Cover,"https://coverartarchive.org/group-cover.jpg");
    assert.equal(f.fm.PersonalRating,4);
  }
  console.log("Music enrichment passed: 5 cases.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});

// Exercise automatic enrichment with a virtual clock so provider throttling is
// tested without extending the offline suite by minutes.
async function automaticEnrichmentTests() {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("../90_System/92_Scripts/Template_Scripts/music_metadata.js"), "utf8");
  const RealDate = Date;
  let clock = RealDate.now();
  class TestDate extends RealDate { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const context = {module:{exports:{}}, URL, Date:TestDate, WeakMap, setTimeout:(fn,delay)=>{
    if (delay < 15000) { clock += delay; return setTimeout(fn,0); }
    return setTimeout(fn,delay);
  }, clearTimeout};
  vm.runInNewContext(source,context);
  const enrich = context.module.exports;
  const record = () => ({id:"recording-1",title:"Quiet Night",length:210000,
    "artist-credit":[{name:"Test Artist"}],isrcs:["USAAA2400001"],genres:[{name:"Dream Pop"}],
    relations:[{type:"producer",artist:{name:"Test Producer"}}, {type:"performance",work:{language:"eng",languages:["eng"],
      relations:[{type:"composer",artist:{name:"Test Composer"}}, {type:"lyricist",artist:{name:"Test Writer"}}]}}],
    releases:[{id:"release-1",title:"Blue Hour"}]});
  const release = () => ({id:"release-1",title:"Blue Hour",date:"2024-01-01",country:"GB",
    "artist-credit":[{name:"Test Artist"}],genres:[{name:"Dream Pop"}],
    "release-group":{"primary-type":"Album","secondary-types":["Live"]},
    "label-info":[{label:{name:"Test Label"}}],"text-representation":{language:"eng"},
    media:[{position:1,format:"CD","track-count":1,tracks:[{position:1,title:"Quiet Night",length:210000,
      recording:{id:"recording-1",title:"Quiet Night"}}]}]});
  function setup(options={}) {
    const fm = {Title:"Quiet Night",Artist:"Test Artist",Album:"Blue Hour",Duration:0,Year:0,
      MusicBrainzId:"recording-1",Genre:[],Favourite:true,PersonalRating:4, ...options.fm};
    const path = (options.album?ALBUMS:SONGS)+"/Existing.md";
    const target = {path,basename:"Existing",stat:{size:100}};
    const calls=[], writes=[], files=[];
    const tp={config:{target_file:target,music_enrichment_version:2,music_enrichment_signature:draft=>"signature:"+draft.Year+":"+draft.MetadataStatus},
      file:{title:"Existing",content:"---\nTitle: Quiet Night\n---\n\nOriginal personal notes"},
      date:{now:()=>"2026-10-26"},system:{prompt:()=>{throw Error("enrich prompted");},suggester:()=>{throw Error("enrich prompted");}},
      obsidian:{Notice:class {constructor(){throw Error("enrich displayed Notice");}},
        requestUrl:async({url})=>{calls.push({url,at:clock});
          if (options.respond) return {status:200,json:await options.respond(url)};
          if (url.includes("/recording/recording-1?")) return {status:200,json:record()};
          if (url.includes("/release/release-1?")) return {status:200,json:release()};
          if (url.includes("itunes.apple.com")) return {status:200,json:{results:[]}};
          if (url.includes("coverartarchive.org")) return {status:200,json:{images:[]}};
          throw Error("Unexpected automatic enrichment request: "+url);
        }},
      app:{workspace:{getActiveFile:()=>target},metadataCache:{getFileCache:()=>({frontmatter:fm})},
        vault:{read:async()=>tp.file.content,getAbstractFileByPath:()=>null,create:async(...args)=>{files.push(args);}},
        fileManager:{processFrontMatter:async(file,fn)=>{assert.equal(file.path,path);fn(fm);writes.push({...fm});}}}};
    return {tp,fm,calls,writes,files};
  }
  let count=0;
  { const f=setup();
    assert.equal((await enrich(f.tp,"enrich")).status,"updated");
    assert.equal(f.fm.Year,2024); assert.equal(f.fm.Duration,210); assert.equal(f.fm.TrackNumber,1); assert.equal(f.fm.DiscNumber,1);
    assert.equal(f.fm.AlbumArtist,"Test Artist"); assert.equal(f.fm.Label,"Test Label"); assert.equal(f.fm.Format,"CD");
    assert.equal(f.fm.ReleaseType,"Album · Live"); assert.equal(f.fm.ISRC,"USAAA2400001");
    assert.deepEqual(Array.from(f.fm.Composer),["Test Composer"]); assert.deepEqual(Array.from(f.fm.Writer),["Test Writer"]);
    assert.deepEqual(Array.from(f.fm.Producer),["Test Producer"]); assert.deepEqual(Array.from(f.fm.Language),["eng"]);
    assert.equal(f.fm.Favourite,true); assert.equal(f.fm.PersonalRating,4); assert.equal(f.files.length,0);
    assert.ok(f.calls.every(call=>!call.url.includes("lrclib"))); assert.equal(f.fm.MetadataVersion,2);
    assert.equal(f.fm.MetadataSignature,"signature:2024:updated"); assert.ok(Number.isFinite(Date.parse(f.fm.MetadataCheckedAt)));
    assert.deepEqual(Array.from(f.fm.MetadataSources),["MusicBrainz"]);
    const mb=f.calls.filter(call=>call.url.includes("musicbrainz.org"));
    assert.ok(mb.slice(1).every((call,i)=>call.at-mb[i].at>=1100));
    const before=f.calls.length; await enrich(f.tp,"enrich"); assert.equal(f.calls.length,before,"cached provider JSON reused across calls");
    count++;
  }
  { const f=setup({fm:{Year:1999,Duration:210,Genre:["My genre"],Composer:["My composer"],LyricsId:"10",LyricsStatus:"not_found"}});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.Year,1999); assert.deepEqual(f.fm.Genre,["My genre"]);
    assert.deepEqual(f.fm.Composer,["My composer"]); assert.equal(f.fm.LyricsStatus,"not_found"); count++;
  }
  { const f=setup({album:true,fm:{Title:"Blue Hour",MusicBrainzId:"release-1",Album:"",Tracklist:["[[My Song]]"]}});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.TrackCount,1); assert.equal(f.fm.Duration,210); assert.equal(f.fm.Country,"GB");
    assert.equal(f.fm.ReleaseType,"Album · Live"); assert.deepEqual(f.fm.Tracklist,["[[My Song]]"]);
    assert.ok(!f.fm.Language,"printed text language is not recording language"); count++;
  }
  { const f=setup({fm:{MusicBrainzId:"",AppleTrackId:"91",StoreUrl:"https://music.apple.com/us/album/blue-hour/5?i=91"},respond:async url=>{
      assert.ok(url.includes("itunes.apple.com/lookup?id=91"));
      return {results:[{kind:"song",trackId:91,collectionId:5,trackName:"Quiet Night",artistName:"Test Artist",collectionName:"Blue Hour",
        trackTimeMillis:210000,trackNumber:3,discNumber:1,primaryGenreName:"Alternative",releaseDate:"2024-01-01T00:00:00Z"}]};
    }});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.Year,2024); assert.equal(f.fm.TrackNumber,3); assert.equal(f.fm.MusicBrainzId,"");
    assert.ok(f.calls.every(call=>!call.url.includes("/search?"))); count++;
  }
  { const f=setup({fm:{Description:"live",AppleTrackId:"91"},respond:async url=>{
      if(url.includes("/recording/")) return {...record(),disambiguation:"live"};
      if(url.includes("/release/")) return {...release(),date:""};
      if(url.includes("itunes.apple.com/lookup")) return {results:[{kind:"song",trackId:91,collectionId:5,trackName:"Quiet Night",artistName:"Test Artist",
        collectionName:"Studio Collection",trackTimeMillis:210000,releaseDate:"1964-01-01"}]};
      throw Error("Unexpected request "+url);
    }});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.MetadataStatus,"identity_conflict"); assert.equal(f.fm.Year,0);
    assert.equal(f.fm.TrackNumber,1); assert.deepEqual(Array.from(f.fm.Genre),["Dream Pop"]);
    assert.deepEqual(Array.from(f.fm.Composer),["Test Composer"]); assert.deepEqual(Array.from(f.fm.Writer),["Test Writer"]);
    assert.match(f.fm.MetadataWarning,/Apple/); count++;
  }
  { const f=setup({respond:async url=>{assert.ok(url.includes("musicbrainz.org"));return {...record(),title:"Different Song"};}});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.MetadataStatus,"identity_conflict"); assert.equal(f.fm.Year,0); assert.equal(f.calls.length,1); count++;
  }
  { const f=setup({fm:{MusicBrainzId:""},respond:async()=>({results:[]})});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.MetadataStatus,"unavailable"); assert.ok(!f.fm.MetadataWarning); count++;
  }
  { const f=setup({respond:async()=>{throw Error("Network offline");}});
    assert.equal((await enrich(f.tp,"enrich")).status,"failed"); assert.equal(f.writes.length,0); assert.ok(!f.fm.MetadataCheckedAt); count++;
  }
  { const f=setup({respond:async()=>({})});
    assert.equal((await enrich(f.tp,"enrich")).status,"failed"); assert.equal(f.writes.length,0); assert.ok(!f.fm.MetadataWarning); count++;
  }
  { const f=setup({fm:{MusicBrainzId:""},respond:async()=>({results:[
      {kind:"song",trackId:91,collectionId:5,trackName:"Quiet Night",artistName:"Test Artist",collectionName:"Blue Hour",trackTimeMillis:210000},
      {kind:"song",trackId:92,collectionId:6,trackName:"Quiet Night",artistName:"Test Artist",collectionName:"Blue Hour",trackTimeMillis:220000}]})});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.MetadataStatus,"unavailable"); assert.ok(!f.fm.AppleTrackId); count++;
  }
  { const f=setup({fm:{MusicBrainzId:"",AppleTrackId:"91"},respond:async()=>({results:[]})});
    await enrich(f.tp,"enrich"); assert.ok(f.calls.every(call=>!call.url.includes("/search?")),"unresolved saved ID is not swapped by name"); count++;
  }
  { const f=setup(); f.tp.obsidian.parseYaml=()=>({Title:"Quiet Night",Artist:"Test Artist",Album:"Blue Hour",MusicBrainzId:"recording-1",Year:0});
    f.tp.app.metadataCache.getFileCache=()=>({frontmatter:{Title:"Stale Cache",Artist:"Wrong"}});
    await enrich(f.tp,"enrich"); assert.equal(f.fm.Year,2024); assert.ok(!f.fm.MetadataWarning); count++;
  }
  { const f=setup();
    f.tp.app.fileManager.processFrontMatter=async(file,fn)=>{f.fm.Artist="Owner changed artist";fn(f.fm);};
    assert.equal((await enrich(f.tp,"enrich")).status,"failed"); assert.equal(f.fm.Year,0); assert.ok(!f.fm.MetadataCheckedAt); count++;
  }
  console.log("Automatic music enrichment passed: "+count+" cases.");
}
automaticEnrichmentTests().catch(error=>{console.error(error);process.exitCode=1;});
