// Pure mocks: no network calls or changes to Obsidian vault.
async function runBookMetadataTests() {
  const assert = require("node:assert/strict");
  const importer = require("../90_System/92_Scripts/Template_Scripts/book_metadata.js");
  const BOOKS = "20_Personal_Life/24_Book_Tracker/Books";
  const coverBytes = new Uint8Array(256);
  coverBytes.set([255, 216, 255]);
  const json = value => ({status:200,json:value});
  function makeTp({query="Sample Book", choose=()=>0, responder=()=>{throw Error("Unexpected request");},
    existing=null, size=0, cancel=false, settingsLanguage=""}={}) {
    const target = {path:`${BOOKS}/Untitled.md`,name:"Untitled.md",stat:{size,ctime:42}};
    const old = existing ? {path:`${BOOKS}/Existing.md`,name:"Existing.md",
      stat:{size:512,ctime:12},frontmatter:existing} : null;
    const settingsFile = settingsLanguage ? {
      path:"90_System/93_Configuration/settings.md",
      name:"settings.md",frontmatter:{book_language:settingsLanguage}
    } : null;
    const files = [target,...(old?[old]:[]),...(settingsFile?[settingsFile]:[])],
      covers=[], notices=[], hooks=[], urls=[], dialogs=[];
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
        suggester:async(labels,values,_throw,title)=>{
          dialogs.push({title,labels});
          return values[choose(labels,values)]??null;
        }},
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
    return {tp,urls,covers,hooks,notices,dialogs,get trashed(){return trashed;}};
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

  // Auto (default): no API language limit, UTF-8 search and filenames survive.
  {
    const viVolume={...google,id:"vol-VI",volumeInfo:{...google.volumeInfo,
      title:"Nhà giả kim",language:"vi",authors:["Paulo Coelho"]}};
    const s=makeTp({query:"Nhà giả kim",
      choose:(_labels,items)=>typeof items[0]==="string" ? 0 :
        items.findIndex(x=>x.source==="googlebooks"),
      responder:url=>url.includes("openlibrary.org/search.json")
        ? json({docs:[]}) : url.includes("googleapis.com/books")
        ? json({items:[viVolume]}) : url.includes("books.google.com/books/content")
        ? {status:200,arrayBuffer:coverBytes.buffer} : (()=>{throw Error(url)})()});
    const note=await importer(s.tp);
    assert.match(note,/Title: "Nhà giả kim"/);
    assert.match(note,/language: "vi"/);
    assert.ok(s.urls.some(url=>url.includes(encodeURIComponent("Nhà giả kim"))));
    assert.ok(!s.urls.some(url=>/[?&](lang|langRestrict)=/.test(url)));
  }
  // Open Library 'lang=vi' is a preference, and the Vietnamese edition is
  // offered ahead of the English edition (without dropping the latter).
  {
    const viEdition={...edition,key:"/books/OL999M",title:"Cáo tinh quái",
      languages:[{key:"/languages/vie"}],number_of_pages:120,isbn_13:[]};
    const enEdition={...edition,languages:[{key:"/languages/eng"}]};
    const s=makeTp({query:"Fantastic Mr. Fox",
      choose:(_labels,items)=>typeof items[0]==="string" ? 1 : 0,
      responder:url=>url.includes("/search.json?")
        ? json({docs:[{key:"/works/OL45804W",title:"Fantastic Mr. Fox",
            edition_key:["OL7353617M"],author_name:["Roald Dahl"]}]})
        : url.includes("/editions.json")?json({entries:[enEdition,viEdition]})
        : url.includes("/books/OL999M.json")?json(viEdition)
        : url.includes("/books/OL7353617M.json")?json(enEdition)
        : url.includes("/works/OL45804W.json")?json({description:"A fox story"})
        : url.includes("/authors/OL123A.json")?json({name:"Roald Dahl"})
        : url.includes("googleapis.com")?json({items:[]})
        : url.includes("covers.openlibrary.org")?{status:200,arrayBuffer:coverBytes.buffer}
        : (()=>{throw Error(url)})()});
    const note=await importer(s.tp);
    assert.ok(s.urls.some(url=>url.includes("&lang=vi")));
    assert.match(note,/openlibrary_edition_id: "OL999M"/);
    assert.match(note,/language: "vi"/);
  }
  // English preference restricts Google Books only for this search.
  {
    const s=makeTp({query:"Sample Book",
      choose:(_labels,items)=>typeof items[0]==="string" ? 2 :
        items.findIndex(x=>x.source==="googlebooks"),
      responder:url=>url.includes("openlibrary.org/search.json")?json({docs:[]})
        : url.includes("googleapis.com")?json({items:[google]})
        : url.includes("books.google.com/books/content")?
          {status:200,arrayBuffer:coverBytes.buffer}: (()=>{throw Error(url)})()});
    assert.match(await importer(s.tp),/Title: "Sample Book"/);
    assert.ok(s.urls.some(url=>url.includes("langRestrict=en")));
    assert.equal(s.urls.filter(url=>url.includes("googleapis.com")).length,1);
  }
  // A missing preferred translation does not make the book disappear.
  {
    const s=makeTp({query:"Sample Book",
      choose:(_labels,items)=>typeof items[0]==="string" ? 1 :
        items.findIndex(x=>x.source==="googlebooks"),
      responder:url=>url.includes("openlibrary.org/search.json")?json({docs:[]})
        : url.includes("langRestrict=vi")?json({items:[]})
        : url.includes("googleapis.com")?json({items:[google]})
        : url.includes("books.google.com/books/content")?
          {status:200,arrayBuffer:coverBytes.buffer}: (()=>{throw Error(url)})()});
    assert.match(await importer(s.tp),/Title: "Sample Book"/);
    assert.equal(s.urls.filter(url=>url.includes("googleapis.com")).length,2);
  }
  // Exact ISBN is never forced into an incompatible language filter.
  {
    const s=makeTp({query:"9780140328721",responder:openResponse,
      choose:(_labels,items)=>typeof items[0]==="string" ? 1 : 0});
    assert.match(await importer(s.tp),/isbn13: "9780140328721"/);
    assert.ok(!s.urls.some(url=>/[?&](lang|langRestrict)=/.test(url)));
  }
  // Settings can change the default; Escape keeps that preference.
  {
    const s=makeTp({query:"Sample Book",settingsLanguage:"vi",
      choose:(_labels,items)=>typeof items[0]==="string" ? -1 :
        items.findIndex(x=>x.source==="googlebooks"),
      responder:url=>url.includes("openlibrary.org/search.json")?json({docs:[]})
        : url.includes("langRestrict=vi")?json({items:[google]})
        : url.includes("books.google.com/books/content")?
          {status:200,arrayBuffer:coverBytes.buffer}: (()=>{throw Error(url)})()});
    assert.match(await importer(s.tp),/Title: "Sample Book"/);
    assert.ok(s.urls.some(url=>url.includes("langRestrict=vi")));
  }
  // Original-language mode consults explicit work metadata (best effort).
  {
    const japanese={...edition,key:"/books/OL123456M",title:"ノルウェイの森",
      languages:[{key:"/languages/jpn"}],number_of_pages:400,covers:[],isbn_13:[]};
    const s=makeTp({query:"ノルウェイの森",
      choose:(_labels,items)=>typeof items[0]==="string" ? 3 : 0,
      responder:url=>url.includes("/search.json?")
        ? json({docs:[{key:"/works/OL45804W",title:"ノルウェイの森",
          edition_key:["OL7353617M"],author_name:["村上春樹"]}]})
        : url.includes("/editions.json")?json({entries:[edition,japanese]})
        : url.includes("/works/OL45804W.json")
        ? json({original_languages:[{key:"/languages/jpn"}],description:"A novel"})
        : url.includes("/books/OL123456M.json")?json(japanese)
        : url.includes("/books/OL7353617M.json")?json(edition)
        : url.includes("/authors/OL123A.json")?json({name:"村上春樹"})
        : url.includes("googleapis.com")?json({items:[]})
        : url.includes("covers.openlibrary.org")?{status:200,arrayBuffer:coverBytes.buffer}
        : (()=>{throw Error(url)})()});
    const note=await importer(s.tp);
    assert.match(note,/openlibrary_edition_id: "OL123456M"/);
    assert.match(note,/language: "ja"/);
    assert.match(note,/Title: "ノルウェイの森"/);
  }
  // The reusable Vault template must display English-only UI copy. Input
  // and book metadata can still contain arbitrary Unicode languages.
  {
    const s=makeTp({responder:googleResponse,
      choose:(_labels,items)=>typeof items[0]==="string" ? 0 :
        items.findIndex(x=>x.source==="googlebooks")});
    assert.match(await importer(s.tp),/Title: "Sample Book"/);
    const popup=s.dialogs[0];
    assert.equal(popup.title,"Preferred Book Language (Esc = Default)");
    assert.equal(popup.labels.join("|"),[
      "Auto — All Languages (default)",
      "Vietnamese — Prefer Vietnamese Editions",
      "English — Prefer English Editions",
      "Original Language — When Available"
    ].join("|"));
  }
  console.log("17 Book importer tests passed (including English UI labels, language preferences and Unicode).");
}
runBookMetadataTests().catch(error => { console.error(error); process.exitCode = 1; });
