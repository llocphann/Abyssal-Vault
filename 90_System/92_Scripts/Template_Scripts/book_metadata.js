module.exports = async function bookMetadata(tp) {
  const BOOK_FOLDER = "20_Personal_Life/24_Book_Tracker/Books";
  const MEDIA_FOLDER = "90_System/95_Media_Assets/Books";
  const PUBLIC_SETTINGS = "90_System/93_Configuration/settings.md";
  const LOCAL_SETTINGS = "90_System/93_Configuration/settings.local.md";
  const OL = "https://openlibrary.org";
  const GOOGLE = "https://www.googleapis.com/books/v1/volumes";
  const txt = x => String(x ?? "").trim();
  const unique = arr => [...new Set((Array.isArray(arr) ? arr : []).map(txt).filter(Boolean))];
  const first = arr => Array.isArray(arr) ? arr[0] : arr;
  const y = x => JSON.stringify(txt(x).replace(/\r?\n/g, " "));
  const identifier = (s, suffix) => {
    const m = txt(s).match(new RegExp("(?:^|/)(OL\\d+" + suffix + ")$", "i"));
    return m ? m[1].toUpperCase() : "";
  };
  // Normalize common provider-specific ISO 639-3 codes to ISO 639-1.
  const langCode = x => {
    const raw = txt(typeof x === "object" && x ? (x.key || x.code || "") : x)
      .toLowerCase().replace(/^\/languages\//, "");
    return ({eng:"en",vie:"vi",jpn:"ja",zho:"zh",chi:"zh",kor:"ko",
      fra:"fr",fre:"fr",deu:"de",ger:"de",rus:"ru",spa:"es"})[raw] ||
      (/^[a-z]{2}$/.test(raw) ? raw : "");
  };
  const langs = [
    {code:"auto",name:"Tự động — mọi ngôn ngữ"},
    {code:"vi",name:"Tiếng Việt — ưu tiên bản tiếng Việt"},
    {code:"en",name:"Tiếng Anh — ưu tiên bản tiếng Anh"},
    {code:"original",name:"Ngôn ngữ gốc — khi xác định được"}
  ];
  const normalizePreference = x => {
    const v = txt(x).toLowerCase().replace(/[\s_-]/g,"");
    return ["auto","vi","en","original"].includes(v) ? v : "auto";
  };
  const editionLangs = x => (Array.isArray(x?.languages) ? x.languages : [])
    .map(langCode).filter(Boolean);
  const cleanIsbn = x => txt(x).replace(/[\s-]/g, "").toUpperCase();
  function validIsbn(x) {
    const s = cleanIsbn(x);
    if (/^\d{9}[\dX]$/.test(s)) return [...s].reduce((a, v, i) => a + (v === "X" ? 10 : +v) * (10 - i), 0) % 11 === 0;
    if (/^97[89]\d{10}$/.test(s)) return [...s].reduce((a, v, i) => a + +v * (i % 2 ? 3 : 1), 0) % 10 === 0;
    return false;
  }
  function htmlText(x) {
    let s = typeof x === "object" && x ? txt(x.value) : txt(x);
    return s.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " ")
      .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, match =>
        ({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" "})[match.toLowerCase()] || match)
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/\s+/g, " ").trim();
  }
  function safeFileName(x) {
    return txt(x).replace(/\s*:\s*/g, " - ").replace(/[\\/:*?"<>|#%^\[\]]/g, " ")
      .replace(/\s+/g, " ").replace(/[. ]+$/g, "").slice(0, 160).trim() || "Untitled Book";
  }
  const blank = title => ({ title, author:"", cover:"", genres:[], pages:0, isbn10:"", isbn13:"",
    workId:"", editionId:"", googleId:"", provider:"", providerId:"",
    publisher:"", published:"", language:"", sourceUrl:"", description:"", alias:"" });
  function render(b) {
    const lines = ["---", `Title: ${y(b.title)}`, `Author: ${y(b.author)}`, `Cover: ${y(b.cover)}`,
      "Status: \"Haven't started\"", "CurrentPage: 0",
      `TotalPages: ${Number.isInteger(b.pages) && b.pages > 0 ? b.pages : 0}`,
      "DateStarted:", "DateFinished:", 'Rating: ""', "tags:", "  - Book"];
    const genres = unique(b.genres).slice(0, 8);
    if (genres.length) lines.push("Genre:", ...genres.map(x => `  - ${y(x)}`));
    else lines.push("Genre: []");
    for (const [key, value] of Object.entries({
      isbn10:b.isbn10, isbn13:b.isbn13, openlibrary_work_id:b.workId,
      openlibrary_edition_id:b.editionId, google_books_id:b.googleId,
      book_provider:b.provider, provider_book_id:b.providerId, publisher:b.publisher,
      published_date:b.published, language:b.language, source_url:b.sourceUrl
    })) lines.push(`${key}: ${y(value)}`);
    if (b.alias && b.alias !== b.title) lines.push("aliases:", `  - ${y(b.alias)}`);
    lines.push("---", "", "## Synopsis", "", htmlText(b.description).slice(0, 4000), "",
      "## Notes & Takeaways", "", "## Highlights", "",
      "<!-- Keep a page or location reference with each quotation when available. -->",
      "", "## Review & Thoughts", "", "## Connections", "",
      "- **Related books:**", "- **Related topics:**", "- **Applications / projects:**", "");
    return lines.join("\n");
  }
  const notify = msg => { if (tp.obsidian?.Notice) new tp.obsidian.Notice(msg, 8000); };
  const target = tp.config?.target_file;
  if (target && Number(target.stat?.size || 0) > 0) {
    notify("Existing Book note preserved; import only runs on a new blank note.");
    return "";
  }
  const originalTitle = txt(tp.file.title);
  const untitled = !originalTitle || /^Untitled(?: \d+)?$/i.test(originalTitle);
  const fallbackTitle = untitled ? `Book ${tp.date.now("YYYYMMDD-HHmmss")}` : originalTitle;
  async function renderBlank() {
    if (untitled) { try { await tp.file.rename(fallbackTitle); } catch (_) {} }
    return render(blank(fallbackTitle));
  }
  function rejectDuplicate() {
    if (target && Number(tp.config?.run_mode) === 2 && Number(target.stat?.size || 0) === 0 &&
        target.path.startsWith(BOOK_FOLDER + "/") && typeof tp.hooks?.on_all_templates_executed === "function") {
      const path = target.path, ctime = Number(target.stat?.ctime || 0);
      tp.hooks.on_all_templates_executed(async () => {
        const live = tp.app.vault.getAbstractFileByPath(path);
        if (live && Number(live.stat?.ctime || 0) === ctime && Number(live.stat?.size || 0) === 0) {
          try { await tp.app.fileManager.trashFile(live); }
          catch (_) { notify("Could not move the empty duplicate placeholder to Trash."); }
        }
      });
    }
    return "";
  }
  async function settings() {
    let provider = "auto", googleKey = "", language = "auto";
    for (const path of [PUBLIC_SETTINGS, LOCAL_SETTINGS]) {
      const file = tp.app.vault.getAbstractFileByPath(path);
      if (!file) continue;
      const front = tp.app.metadataCache.getFileCache(file)?.frontmatter || {};
      let p = txt(front.book_provider), k = txt(front.google_books_key), l = txt(front.book_language);
      if (!p || !k || !l) {
        const s = await tp.app.vault.read(file);
        const read = name => txt(s.match(new RegExp("^" + name + ":\\s*(.*?)\\s*$", "m"))?.[1]).replace(/^['"]|['"]$/g, "");
        p ||= read("book_provider"); k ||= read("google_books_key"); l ||= read("book_language");
      }
      provider = p || provider; googleKey = k || googleKey; language = l || language;
    }
    const mode = provider.toLowerCase().replace(/[\s_-]/g, "");
    return { mode: ["openlibrary", "googlebooks"].includes(mode) ? mode : "auto",
      googleKey: /^fill in/i.test(googleKey) ? "" : googleKey, language:normalizePreference(language) };
  }
  async function getJson(url) {
    const resp = await tp.obsidian.requestUrl({url, method:"GET", headers:{Accept:"application/json"}});
    if (resp.status < 200 || resp.status >= 300) throw Error(`HTTP ${resp.status}`);
    return resp.json != null ? resp.json : JSON.parse(resp.text || "{}");
  }
  async function openSearch(q, isbn, preference) {
    if (isbn) {
      try {
        const e = await getJson(`${OL}/isbn/${encodeURIComponent(isbn)}.json`);
        const id = identifier(e.key, "M");
        if (id && e.title) return [{source:"openlibrary", id, editionId:id,
          workId:identifier(first(e.works)?.key, "W"), title:txt(e.title), author:"",
          year:txt(e.publish_date), coverId:first(e.covers) || 0, direct:e}];
      } catch (_) { /* A search result may still be available. */ }
    }
    const qpart = isbn ? `isbn=${encodeURIComponent(isbn)}` : `q=${encodeURIComponent(q)}`;
    const fields = "key,title,author_name,first_publish_year,edition_key,cover_i,isbn";
    const lang = !isbn && ["vi","en"].includes(preference) ? `&lang=${preference}` : "";
    const data = await getJson(`${OL}/search.json?${qpart}&fields=${fields}&limit=12${lang}`);
    return (data.docs || []).map(x => {
      const workId = identifier(x.key, "W"), editionId = identifier(first(x.edition_key), "M");
      const id = editionId || workId;
      return id && x.title ? {source:"openlibrary", id, editionId, workId,
        title:txt(x.title), author:unique(x.author_name).join(", "), year:txt(x.first_publish_year),
        coverId:x.cover_i || 0} : null;
    }).filter(Boolean);
  }
  async function googleSearch(q, isbn, key, preference) {
    const query = isbn ? `isbn:${isbn}` : q;
    const url = `${GOOGLE}?q=${encodeURIComponent(query)}&maxResults=12&printType=books` +
      (key ? `&key=${encodeURIComponent(key)}` : "");
    const lang = !isbn && ["vi","en"].includes(preference) ? preference : "";
    const preferred = lang ? await getJson(`${url}&langRestrict=${lang}`) : null;
    const data = preferred?.items?.length ? preferred : await getJson(url);
    return (data.items || []).map(item => {
      const v = item.volumeInfo || {}, id = txt(item.id);
      return id && v.title ? {source:"googlebooks", id, title:txt(v.title),
        author:unique(v.authors).join(", "), year:txt(v.publishedDate).slice(0,4),
        language:langCode(v.language), item} : null;
    }).filter(Boolean).filter(x => !isbn ||
      (x.item.volumeInfo.industryIdentifiers || []).some(i => cleanIsbn(i.identifier) === isbn));
  }
  const olNames = xs => unique((xs || []).map(x => typeof x === "string" ? x : x?.name));
  async function openDetail(c, preference) {
    let choice = c;
    let originalLang = "";
    if (preference === "original" && c.workId && !c.direct) {
      try {
        const work = await getJson(`${OL}/works/${c.workId}.json`);
        originalLang = langCode(first(work.original_languages) || work.original_language);
      } catch (_) { /* Unknown: retain every available edition. */ }
    }
    if (!c.direct && c.workId) {
      const editions = [];
      if (c.editionId) editions.push({key:`/books/${c.editionId}`, title:c.title, suggested:true});
      try {
        const data = await getJson(`${OL}/works/${c.workId}/editions.json?limit=40`);
        for (const e of data.entries || []) {
          const id = identifier(e.key, "M");
          if (id && !editions.some(x => identifier(x.key, "M") === id)) editions.push(e);
        }
      } catch (_) { /* Suggested edition is still usable. */ }
      const wanted = preference === "original" ? originalLang : preference;
      const ordered = wanted === "vi" || wanted === "en" ||
        (preference === "original" && wanted)
        ? editions.map((item,index)=>({item,index})).sort((a,b)=>
            Number(editionLangs(b.item).includes(wanted)) -
            Number(editionLangs(a.item).includes(wanted)) || a.index-b.index
          ).map(x=>x.item) : editions;
      if (editions.length === 1) choice = {...c, editionId:identifier(editions[0].key, "M")};
      else if (editions.length > 1) {
        const visible = ordered.slice(0, 40);
        const display = visible.map(e => {
          const publish = txt(e.publish_date);
          return `${e.suggested ? "[Suggested] " : ""}${editionLangs(e).join(", ") || "unknown language"} · ${txt(e.title || c.title)} · ${olNames(e.publishers)[0] || "Publisher unknown"} · ${publish || "Date unknown"} · ${first(e.isbn_13) || first(e.isbn_10) || "No ISBN"}`.slice(0, 190);
        });
        let selected;
        try { selected = await tp.system.suggester(display, visible, false,
          "Choose an edition (Esc to cancel)"); } catch (_) { selected = null; }
        if (!selected) return null;
        choice = {...c, editionId:identifier(selected.key, "M")};
      }
    }
    const edition = choice.direct || (choice.editionId ?
      await getJson(`${OL}/books/${choice.editionId}.json`) : {});
    const workId = identifier(first(edition.works)?.key, "W") || choice.workId;
    let work = {};
    if (workId) try { work = await getJson(`${OL}/works/${workId}.json`); } catch (_) {}
    let author = choice.author;
    const a = [];
    for (const x of (edition.authors || []).slice(0,3)) {
      const id = identifier(x?.author?.key || x?.key, "A");
      if (id) try {
        const profile = await getJson(`${OL}/authors/${id}.json`);
        if (profile.name) a.push(profile.name);
      } catch (_) {}
    }
    author = unique(a).join(", ") || author;
    const isbn10 = unique(edition.isbn_10).find(validIsbn) || "";
    const isbn13 = unique(edition.isbn_13).find(validIsbn) || "";
    const n = Number(edition.number_of_pages);
    const coverId = Number(first(edition.covers) || choice.coverId || first(work.covers) || 0);
    const recordId = choice.editionId || workId;
    const rawLang = txt(first(edition.languages)?.key || first(edition.languages)).replace(/^\/languages\//,"");
    const lang = langCode(rawLang) || rawLang;
    return {...blank(choice.title), title:txt(edition.title || work.title || choice.title), author,
      isbn10, isbn13, pages:Number.isInteger(n) && n > 0 ? n : 0,
      genres:unique((edition.subjects || work.subjects || []).filter(x => typeof x === "string")).slice(0,8),
      workId, editionId:choice.editionId, provider:"Open Library", providerId:recordId,
      publisher:olNames(edition.publishers).join(", "),
      published:txt(edition.publish_date || work.first_publish_date), language:lang,
      sourceUrl:recordId ? `${OL}/${choice.editionId ? "books" : "works"}/${recordId}` : "",
      description:htmlText(edition.description || work.description),
      coverUrl:coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false` : "",
      coverId:recordId ? `openlibrary-${recordId}` : ""};
  }
  function googleDetail(c) {
    const v = c.item.volumeInfo || {}, ids = v.industryIdentifiers || [];
    const ten = txt(ids.find(x => x.type === "ISBN_10")?.identifier);
    const thirteen = txt(ids.find(x => x.type === "ISBN_13")?.identifier);
    const n = Number(v.pageCount);
    const image = txt(v.imageLinks?.extraLarge || v.imageLinks?.large || v.imageLinks?.medium ||
      v.imageLinks?.small || v.imageLinks?.thumbnail).replace(/^http:\/\//i, "https://");
    return {...blank(c.title), title:txt(v.title), author:unique(v.authors).join(", "),
      pages:Number.isInteger(n) && n > 0 ? n : 0,
      genres:unique(v.categories), isbn10:validIsbn(ten) ? ten : "",
      isbn13:validIsbn(thirteen) ? thirteen : "", googleId:c.id,
      provider:"Google Books", providerId:c.id, publisher:txt(v.publisher),
      published:txt(v.publishedDate), language:langCode(v.language) || txt(v.language),
      sourceUrl:txt(v.canonicalVolumeLink || v.infoLink) ||
        `https://books.google.com/books?id=${encodeURIComponent(c.id)}`,
      description:htmlText(v.description), coverUrl:image, coverId:`googlebooks-${c.id}`};
  }
  async function saveCover(b) {
    if (!b.coverUrl || !b.coverId) return "";
    const id = b.coverId.replace(/[^a-z0-9-]/gi, "-").slice(0,100);
    const existing = tp.app.vault.getFiles().find(f => f.path.startsWith(`${MEDIA_FOLDER}/${id}-cover.`) &&
      /\.(jpg|png|webp)$/i.test(f.name));
    if (existing) return `[[${existing.name}]]`;
    const match = b.coverUrl.match(/^https:\/\/([^/?#]+)/i);
    const host = txt(match?.[1]).toLowerCase();
    const trusted = host === "covers.openlibrary.org" || host === "books.google.com" ||
      host === "books.googleusercontent.com" || host.endsWith(".googleusercontent.com");
    if (!trusted) return "";
    const response = await tp.obsidian.requestUrl({url:b.coverUrl, method:"GET"});
    if (response.status < 200 || response.status >= 300 || !response.arrayBuffer) return "";
    const bytes = new Uint8Array(response.arrayBuffer);
    if (bytes.byteLength < 128) return "";
    let ext = "";
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ext = "jpg";
    else if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) ext = "png";
    else if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8,12)) === "WEBP") ext = "webp";
    if (!ext) return "";
    const filename = `${id}-cover.${ext}`;
    const path = `${MEDIA_FOLDER}/${filename}`;
    if (tp.app.vault.getFiles().some(f => f.name === filename && f.path !== path))
      throw Error("Ambiguous cover filename");
    if (!tp.app.vault.getAbstractFileByPath(path)) {
      const parts = MEDIA_FOLDER.split("/"); let folder = "";
      for (const p of parts) {
        folder = folder ? `${folder}/${p}` : p;
        if (!tp.app.vault.getAbstractFileByPath(folder)) await tp.app.vault.createFolder(folder);
      }
      await tp.app.vault.createBinary(path, response.arrayBuffer);
    }
    return `[[${filename}]]`;
  }
  function duplicate(b) {
    for (const f of tp.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(BOOK_FOLDER + "/") || f.path === target?.path) continue;
      const m = tp.app.metadataCache.getFileCache(f)?.frontmatter || {};
      if (b.isbn13 && cleanIsbn(m.isbn13) === cleanIsbn(b.isbn13)) return f;
      if (b.isbn10 && cleanIsbn(m.isbn10) === cleanIsbn(b.isbn10)) return f;
      if (b.editionId && txt(m.openlibrary_edition_id) === b.editionId) return f;
      if (b.googleId && txt(m.google_books_id) === b.googleId) return f;
      if (b.providerId && txt(m.provider_book_id) === b.providerId &&
          txt(m.book_provider).toLowerCase() === b.provider.toLowerCase()) return f;
    }
    return null;
  }
  function availableName(b) {
    const taken = name => {
      const file = tp.app.vault.getAbstractFileByPath(`${BOOK_FOLDER}/${name}.md`);
      return file && file.path !== target?.path;
    };
    const simple = safeFileName(b.title);
    if (!taken(simple)) return simple;
    const id = b.isbn13 || b.isbn10 || b.editionId || b.googleId || b.providerId || "edition";
    for (let i = 0; i < 100; i++) {
      const result = safeFileName(`${simple} (${id}${i ? `-${i+1}` : ""})`);
      if (!taken(result)) return result;
    }
    throw Error("No available filename");
  }
  if (typeof tp.obsidian?.requestUrl !== "function") return renderBlank();
  let conf;
  try { conf = await settings(); } catch (_) { conf = {mode:"auto", googleKey:"",language:"auto"}; }
  let answer;
  try { answer = await tp.system.prompt("Search by title, author, or ISBN (Esc: blank note)",
    untitled ? "" : originalTitle); } catch (_) { return renderBlank(); }
  if (answer === null) return renderBlank();
  const query = txt(answer) || (untitled ? "" : originalTitle);
  if (!query) return renderBlank();
  const candidateIsbn = cleanIsbn(query.replace(/^isbn(?:-1[03])?\s*:?\s*/i, ""));
  const isbn = /^(?:\d{9}[\dX]|\d{13})$/.test(candidateIsbn) ? candidateIsbn : "";
  if (isbn && !validIsbn(isbn)) { notify("Invalid ISBN checksum; created blank Book template."); return renderBlank(); }
  // Per-book preference. Esc keeps the setting (Auto: all languages by default).
  const options = [...langs.filter(x=>x.code===conf.language),
    ...langs.filter(x=>x.code!==conf.language)];
  let preference = conf.language;
  try {
    const selected = await tp.system.suggester(
      options.map(x=>x.name+(x.code===conf.language ? " (default)" : "")),
      options.map(x=>x.code), false, "Ngôn ngữ ưu tiên (Esc = mặc định)");
    if (selected) preference = selected;
  } catch (_) { /* Keep configured preference when UI is unavailable. */ }
  const sources = conf.mode === "auto" ? ["openlibrary", "googlebooks"] : [conf.mode];
  const matches = [];
  for (const source of sources) {
    try {
      const items = source === "openlibrary" ? await openSearch(query, isbn, preference) :
        await googleSearch(query, isbn, conf.googleKey, preference);
      matches.push(...items);
    } catch (_) { notify(`${source} search unavailable; continuing with other providers.`); }
  }
  if (!matches.length) { notify("No matching books; created blank Book template."); return renderBlank(); }
  const labels = matches.map(m =>
    `[${m.source === "openlibrary" ? "Open Library" : "Google Books"}] ${m.title} · ${m.author || "Unknown author"} · ${m.year || "n.d."} · ${m.id}`.slice(0,200));
  let chosen;
  try { chosen = await tp.system.suggester(labels, matches, false, "Choose a book"); }
  catch (_) { return renderBlank(); }
  if (!chosen) return renderBlank();
  try {
    const b = chosen.source === "openlibrary" ? await openDetail(chosen, preference) : googleDetail(chosen);
    if (!b) return renderBlank();
    const prior = duplicate(b);
    if (prior) { notify(`Book already exists: ${prior.path}. No duplicate metadata created.`); return rejectDuplicate(); }
    try { b.cover = await saveCover(b); }
    catch (_) { notify("Metadata imported; cover download failed."); }
    const name = availableName(b);
    if (name !== originalTitle) {
      try { await tp.file.rename(name); }
      catch (_) { notify("Metadata imported; filename could not be renamed."); }
    }
    if (name !== b.title) b.alias = b.title;
    return render(b);
  } catch (_) { notify("Book details unavailable; created blank Book template."); return renderBlank(); }
};
