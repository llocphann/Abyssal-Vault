const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const js=fs.readFileSync(path.join(__dirname,"../90_System/93_Configuration/Custom_Views/Music/script.js"),"utf8");
class El{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.textContent="";this.hidden=false;this.dataset={};this.events={};this.attrs={};
 this.classList={toggle:(k,v)=>this.attrs["class-"+k]=v};}
 append(...x){this.children.push(...x)}appendChild(x){this.children.push(x)}replaceChildren(...x){this.children=x}
 setAttribute(k,v){this.attrs[k]=v}querySelector(s){return s==="span"?this.children.find(x=>x.tagName==="span"):null}
 addEventListener(k,v){this.events[k]=v}
}
async function run(){
 const names="music-cover music-cover-fallback music-title music-artist music-year music-duration music-track music-tracks music-genres music-description music-source-link music-open-album music-details music-tracklist music-track-count music-favourite music-favourite-label music-feedback music-rating-value music-lyrics-status music-lyrics-text music-lyrics-source music-retry-lyrics music-find-artwork".split(" ");
 const elements=Object.fromEntries(names.map(n=>[n,new El]));
 elements["music-favourite"].append(new El("span"));
 const doc={createElement:tag=>new El(tag)},root=new El;root.dataset.musicKind="song";root.ownerDocument=doc;
 root.querySelector=s=>elements[s.match(/^\[data-role="([^"]+)"\]$/)?.[1]]||null;
 root.querySelectorAll=()=>[];
 const calls=[],patches=[];
 const fetchMock=async url=>{
  calls.push(url);
  if(url.startsWith("https://lrclib.net/api/get?"))return {ok:true,json:async()=>({
   id:76,trackName:"Quiet Night",artistName:"Test Artist",duration:210,plainLyrics:"Fictional lyrics fixture line.",instrumental:false
  })};
  if(url.startsWith("https://itunes.apple.com/search?"))return {ok:true,json:async()=>({
   results:[{trackName:"Quiet Night",artistName:"Test Artist",collectionName:"Blue Hour",
    artworkUrl100:"https://is1-ssl.mzstatic.com/test-cover.jpg",trackViewUrl:"https://music.apple.com/song/123"}]
  })};
  throw Error(url);
 };
 const file={basename:"Quiet Night",path:"20_Personal_Life/28_Music_Tracker/Songs/Quiet Night.md"};
 const tp={container:{querySelector:()=>root},file,activeDocument:doc,
  frontmatter:{Title:"Quiet Night",Artist:"Test Artist",Album:"Blue Hour",Duration:210,Cover:""},
  app:{metadataCache:{getFirstLinkpathDest:()=>null},vault:{getResourcePath:()=>""},
   fileManager:{processFrontMatter:async(_,cb)=>{const patch={};cb(patch);patches.push(patch)}},
   workspace:{openLinkText:()=>{}}}
 };
 new Function("tp","fetch","AbortController","setTimeout","clearTimeout",js)(tp,fetchMock,undefined,undefined,undefined);
 for(let n=0;n<24;n++)await Promise.resolve();
 assert.equal(elements["music-lyrics-status"].textContent,"Retrieved from LRCLIB · Read-only display");
 assert.equal(elements["music-lyrics-text"].textContent,"Fictional lyrics fixture line.");
 assert.equal(elements["music-lyrics-source"].href,"https://lrclib.net/api/get/76");
 assert.equal(elements["music-lyrics-text"].hidden,false);
 assert.ok(patches.some(p=>p.LyricsId==="76"));
 assert.ok(patches.every(p=>!Object.hasOwn(p,"Lyrics")));
 // Artwork backfill now starts automatically when the note opens with no Cover.
 for(let n=0;n<48;n++)await Promise.resolve();
 assert.equal(elements["music-cover"].src,"https://is1-ssl.mzstatic.com/test-cover.jpg");
 assert.equal(elements["music-find-artwork"].hidden,true);
 assert.ok(patches.some(p=>p.Cover==="https://is1-ssl.mzstatic.com/test-cover.jpg"));
 assert.ok(patches.some(p=>p.StoreUrl==="https://music.apple.com/song/123"));
 assert.ok(calls.some(url=>url.startsWith("https://lrclib.net/api/get?")));
 assert.ok(calls.some(url=>url.startsWith("https://itunes.apple.com/search?")));
 // With an allowlisted Obsidian request bridge, no browser fetch is needed.
 const bridgeCalls=[];
 tp.activeWindow={__abyssalMusicRequest:async url=>{
   bridgeCalls.push(url);
   if(url.startsWith("https://lrclib.net/"))return {
     id:76,trackName:"Quiet Night",artistName:"Test Artist",plainLyrics:"Fixture lyric"
   };
   if(url.startsWith("https://itunes.apple.com/"))return {results:[{
     trackName:"Quiet Night",artistName:"Test Artist",collectionName:"Blue Hour",
     artworkUrl100:"https://is1-ssl.mzstatic.com/test-cover.jpg",
     trackViewUrl:"https://music.apple.com/song/123"
   }]};
   throw Error("Unexpected music request "+url);
 }};
 const blockedFetch=async()=>{throw Error("Browser fetch must not run with an Obsidian bridge");};
 new Function("tp","fetch","AbortController","setTimeout","clearTimeout",js)(
   tp,blockedFetch,undefined,undefined,undefined
 );
 for(let n=0;n<60;n++)await Promise.resolve();
 assert.ok(bridgeCalls.some(url=>url.startsWith("https://itunes.apple.com/")));
 assert.ok(bridgeCalls.some(url=>url.startsWith("https://lrclib.net/")));
 console.log("Music Custom View enrichment and CORS bridge passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
