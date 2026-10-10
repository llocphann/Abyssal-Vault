// Pure mocks: no network calls or changes to Obsidian vault.
async function runBookMetadataTests() {
  const assert = require("node:assert/strict");
  const importer = require("../90_System/92_Scripts/Template_Scripts/book_metadata.js");
  const BOOKS = "20_Personal_Life/24_Book_Tracker/Books";
  const coverBytes = new Uint8Array(256);
  coverBytes.set([255, 216, 255]);
  const json = value => ({status:200,json:value});
  function makeTp({query="Sample Book", choose=()=>0, responder=()=>{throw Error("Unexpected request");},
    existing=null, size=0, cancel=false}={}) {
    const target = {path:`${BOOKS}/Untitled.md`,name:"Untitled.md",stat:{size,ctime:42}};
    const old = existing ? {path:`${BOOKS}/Existing.md`,name:"Existing.md",
      stat:{size:512,ctime:12},frontmatter:existing} : null;
    const files = [target,...(old?[old]:[])], covers=[], notices=[], hooks=[], urls=[];
    const folders = new Set([BOOKS, "90_System", "90_System/95_Media_Assets"]);
    let trashed = false;
    const get = p => files.find(f=>f.path===p) || covers.find(f=>f.path===p) ||
      (folders.has(p)?{path:p}:null);
    const tp = {
      config:{target_file:target,run_mode:2},
      file:{title:"Untitled",rename:async name=>{
        target.name=`${name}.md`; target.path=`${BOOKS}/${name}.md`;}},
      date:{now:()=> "20261010-130000"},
      hooks:{on_all_templates_executed:fn=>hooks.push(fn)},
      system:{prompt:async()=>cancel?null:query,
        suggester:async(labels,values)=>values[choose(labels,values)]??null},
      obsidian:{Notice:class{constructor(msg){notices.push(msg);}},
        requestUrl:async({url})=>{urls.push(url);return responder(url);}},
      app:{
        fileManager:{trashFile:async file=>{assert.equal(file,target);trashed=true;}},
        metadataCache:{getFileCache:file=>({frontmatter:file.frontmatter||{}})},
        vault:{getAbstractFileByPath:get,getFiles:()=>[...files,...covers],
          getMarkdownFiles:()=>files,read:async()=>"",
          createFolder:async p=>folders.add(p),
          createBinary:async(p,binary)=>{assert.ok(binary.byteLength>0);
            covers.push({path:p,name:p.split("/").pop()});}}
      }
    };
    return {tp,urls,covers,hooks,notices,get trashed(){return trashed;}};
  }
  const google={id:"vol-A",volumeInfo:{title:"Sample Book",authors:["A. Author"],
    pageCount:300,categories:["Fantasy"],description:"<b>Read me</b> &amp; enjoy",
    industryIdentifiers:[{type:"ISBN_13",identifier:"9780140328721"}],
    imageLinks:{thumbnail:"http://books.google.com/books/content?id=vol-A"}}};
  function googleResponse(url, fakeCover) {
    if(url.includes("openlibrary.org/search.json"))return json({docs:[]});
    if(url.includes("googleapis.com/books"))return json({items:[
      fakeCover?{...google,volumeInfo:{...google.volumeInfo,imageLinks:{thumbnail:"https://unsafe.example/a.jpg"}}}:google
    ]});
    if(url.includes("books.google.com/books/content"))return {status:200,arrayBuffer:coverBytes.buffer};
    throw Error(`Unexpected URL ${url}`);
  }
  {
    const s=makeTp({responder:googleResponse,choose:labels=>labels.findIndex(x=>x.includes("Google Books"))});
    const note=await importer(s.tp);
    assert.match(note,/Title: "Sample Book"/);
    assert.match(note,/TotalPages: 300/);
    assert.match(note,/Genre:\n  - "Fantasy"/);
    assert.match(note,/Read me & enjoy/);
    assert.match(note,/\[\[googlebooks-vol-A-cover.jpg\]\]/);
    assert.equal(s.covers.length,1);
  }
  const edition={key:"/books/OL7353617M",title:"Fantastic Mr. Fox",
    works:[{key:"/works/OL45804W"}],authors:[{key:"/authors/OL123A"}],
    isbn_13:["9780140328721"],number_of_pages:96,
    covers:[1234],publish_date:"1988",publishers:["Puffin"],
    languages:[{key:"/languages/eng"}]};
  function openResponse(url) {
    if(url.includes("/isbn/9780140328721.json"))return json(edition);
    if(url.includes("/search.json?"))return json({docs:[{key:"/works/OL45804W",
      title:"Fantastic Mr. Fox",author_name:["Roald Dahl"],
      edition_key:["OL7353617M"]}]});
    if(url.includes("/editions.json"))return json({entries:[edition,
      {...edition,key:"/books/OL999M",number_of_pages:120,isbn_13:[],covers:[]}]});
    if(url.includes("/books/OL7353617M.json"))return json(edition);
    if(url.includes("/books/OL999M.json"))return json({...edition,key:"/books/OL999M",
      number_of_pages:120,isbn_13:[],covers:[]});
    if(url.includes("/works/OL45804W.json"))return json({description:{value:"Fantastic adventure"},
      subjects:["Children's fiction"]});
    if(url.includes("/authors/OL123A.json"))return json({name:"Roald Dahl"});
    if(url.includes("googleapis.com"))return json({items:[]});
    if(url.includes("covers.openlibrary.org"))return {status:200,arrayBuffer:coverBytes.buffer};
    throw Error(`Unexpected URL ${url}`);
  }
  {
    const s=makeTp({query:"9780140328721",responder:openResponse});
    const note=await importer(s.tp);
    assert.match(note,/Author: "Roald Dahl"/);
    assert.match(note,/TotalPages: 96/);
    assert.match(note,/openlibrary_edition_id: "OL7353617M"/);
    assert.match(note,/isbn13: "9780140328721"/);
    assert.match(note,/\[\[openlibrary-OL7353617M-cover.jpg\]\]/);
  }
  {
    const s=makeTp({query:"Fantastic Mr. Fox",responder:openResponse,
      choose:(_labels,items)=>items[0]?.source?0:1});
    const note=await importer(s.tp);
    assert.match(note,/TotalPages: 120/);
    assert.match(note,/openlibrary_edition_id: "OL999M"/);
  }
  {
    const s=makeTp({responder:googleResponse,choose:labels=>labels.findIndex(x=>x.includes("Google Books")),
      existing:{isbn13:"9780140328721"}});
    const note=await importer(s.tp);
    assert.equal(note,"");
    assert.equal(s.hooks.length,1);
    await s.hooks[0]();
    assert.equal(s.trashed,true);
  }
  {
    const s=makeTp({cancel:true});
    assert.match(await importer(s.tp),/Status: "Haven't started"/);
    assert.equal(s.urls.length,0);
  }
  {
    const s=makeTp({size:500});
    assert.equal(await importer(s.tp),"");
    assert.equal(s.urls.length,0);
  }
  {
    const s=makeTp({query:"9780140328722"});
    assert.match(await importer(s.tp),/TotalPages: 0/);
    assert.ok(s.notices.some(x=>x.includes("Invalid ISBN")));
  }
  {
    const s=makeTp({responder:()=>{throw Error("Simulated network failure");}});
    assert.match(await importer(s.tp),/TotalPages: 0/);
  }
  {
    const s=makeTp({responder:url=>googleResponse(url,true),
      choose:labels=>labels.findIndex(x=>x.includes("Google Books"))});
    const note=await importer(s.tp);
    assert.match(note,/Cover: ""/);
    assert.equal(s.covers.length,0);
  }
  console.log("9 Book importer tests passed (Google, Open Library, editions, duplicates, safety and failures).");
}
runBookMetadataTests().catch(error => { console.error(error); process.exitCode = 1; });
