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
  const changes=[],calls=[];
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
        getAbstractFileByPath:()=>null,getMarkdownFiles:()=>[]},
      metadataCache:{getFileCache:()=>({frontmatter:fm})},
      fileManager:{processFrontMatter:async(file,fn)=>{const draft={...fm};fn(draft);
        changes.push(draft);Object.assign(fm,draft);}}
    }
  };
  return {tp,calls,changes,requests,fm,remote,mode};
}
async function run(){
  {const f=fixture({fromGroup:true});
    const note=await importer(f.tp,"song");
    assert.match(note,/Cover: "https:\/\/coverartarchive.org\/group-cover.jpg"/);
    assert.match(note,/LyricsId: "71"/);
    assert.match(note,/LyricsStatus: "available"/);
    assert.ok(!note.includes("Fixture words, not actual song lyrics"));
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
