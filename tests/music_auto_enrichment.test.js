// Offline startup integration: opened-file targeting, persistence and bounded retries.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const source = fs.readFileSync(path.join(__dirname,
  "../90_System/91_Templates/Sync_Music_Custom_Views.md"), "utf8")
  .replace(/^<%\*\s*/, "").replace(/\s*%>\s*$/, "");
const runTemplate = new AsyncFunction("app", "tp", "console", "setTimeout", "clearTimeout", "Date", source);
const ROOT = "20_Personal_Life/28_Music_Tracker";
const SONG = ROOT + "/Songs/Quiet Night.md";
const ALBUM = ROOT + "/Albums/Blue Hour.md";
const STARTUP = "90_System/91_Templates/Sync_Music_Custom_Views.md";
const IMPORTER = "90_System/92_Scripts/Template_Scripts/music_metadata.js";
const SOURCES = "90_System/93_Configuration/Custom_Views/Music/";
const DAY = 24 * 60 * 60 * 1000;

function fixture({ active = STARTUP } = {}) {
  let now = Date.parse("2026-10-26T00:00:00Z");
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const notes = new Map();
  const makeNote = (notePath, fields = {}) => {
    const file = { path: notePath, basename: notePath.split("/").at(-1).replace(/\.md$/, ""), stat: { mtime: now, size: 200 } };
    const note = { file, fm: { Title: file.basename, Artist: "Test Artist", ...fields }, body: "## Personal Reflections\n\nOwner prose.\n" };
    notes.set(notePath, note);
    return note;
  };
  makeNote(STARTUP);
  makeNote(SONG);
  makeNote(ALBUM, { Title: "Blue Hour" });
  const sourceTexts = {
    "Song.html": "<article>Song source</article>",
    "Album.html": "<article>Album source</article>",
    "styles.css": ".music-card { color: var(--text-normal); }",
    "script.js": "/* Valid Custom View script */",
    "song-view.json": JSON.stringify({ id: "music-song-v1", name: "Song" }),
    "album-view.json": JSON.stringify({ id: "music-album-v1", name: "Album" })
  };
  const importerFile = { path: IMPORTER, stat: { mtime: 100, size: 1000 } };
  const sources = new Map(Object.entries(sourceTexts).map(([name, text]) => [SOURCES + name,
    { path: SOURCES + name, stat: { mtime: 100, size: text.length } }]));
  const unrelated = { id: "owner-view", name: "Owner's broader matcher", template: "owner content", css: "owner css", js: "owner script" };
  const plugin = { settings: { views: [unrelated] }, saves: 0, refreshes: 0,
    async saveSettings() { this.saves++; }, refreshAllViews() { this.refreshes++; } };
  const win = {};
  const doc = { defaultView: win, querySelectorAll: () => [] };
  const handlers = new Map();
  const timers = new Map();
  let nextTimer = 0, removed = 0;
  const on = domain => (event, callback) => {
    const ref = { domain, event, callback };
    handlers.set(domain + ":" + event, ref);
    return ref;
  };
  const off = domain => ref => {
    if (ref.domain === domain && handlers.get(domain + ":" + ref.event) === ref) {
      handlers.delete(domain + ":" + ref.event); removed++;
    }
  };
  const app = {
    plugins: { getPlugin: () => plugin },
    vault: {
      adapter: { read: async sourcePath => {
        assert.ok(sourcePath.startsWith(SOURCES));
        return sourceTexts[sourcePath.slice(SOURCES.length)];
      } },
      getAbstractFileByPath: notePath => notes.get(notePath)?.file || sources.get(notePath) || (notePath === IMPORTER ? importerFile : null),
      read: async file => {
        const note = notes.get(file.path);
        assert.ok(note, "Only a managed note may be read for enrichment");
        return "---\n" + JSON.stringify(note.fm) + "\n---\n\n" + note.body;
      },
      on: on("vault"), offref: off("vault")
    },
    metadataCache: { getFileCache: file => ({ frontmatter: notes.get(file.path)?.fm }) },
    workspace: { containerEl: { ownerDocument: doc }, getActiveFile: () => notes.get(active)?.file,
      on: on("workspace"), offref: off("workspace") }
  };
  const calls = [], warnings = [];
  const tp = {
    config: { target_file: notes.get(STARTUP).file, active_file: notes.get(STARTUP).file, run_mode: 2 },
    file: { title: "Sync_Music_Custom_Views", content: "Startup template text", rename: () => { throw Error("Startup rename must not be inherited"); } },
    obsidian: { parseYaml: JSON.parse, requestUrl: async () => ({ status: 200, json: { ok: true } }) },
    user: { music_metadata: async (context, mode) => {
      calls.push({ context, mode });
      return handler(context, mode);
    } }
  };
  let handler = async context => {
    const note = notes.get(context.config.target_file.path);
    // Model the importer's missing-only merge plus markers, including a final
    // signature after a metadata change. Many optional fields remain absent.
    if (!note.fm.Year) note.fm.Year = 2024;
    note.fm.MetadataVersion = context.config.music_enrichment_version;
    note.fm.MetadataSignature = context.config.music_enrichment_signature(note.fm);
    note.fm.MetadataCheckedAt = new Clock().toISOString();
    return { status: "checked" };
  };
  const quiet = { info() {}, error(...args) { warnings.push(args); }, warn(...args) { warnings.push(args); } };
  const startup = async () => {
    await runTemplate(app, tp, quiet,
      (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
      id => timers.delete(id), Clock);
    for (let n = 0; n < 30; n++) await Promise.resolve();
  };
  return { app, tp, win, notes, calls, plugin, unrelated, sources, importerFile, handlers, timers, warnings,
    startup, enrich: (...args) => win.__abyssalMusicEnrich(...args),
    open: filePath => handlers.get("workspace:file-open").callback(notes.get(filePath)?.file || { path: filePath }),
    setHandler: value => { handler = value; }, advance: ms => { now += ms; }, removed: () => removed,
    makeNote, newSession: () => { delete win.__abyssalMusicEnrichmentState; } };
}

async function run() {
  let cases = 0;
  {
    const f = fixture(); await f.startup();
    assert.equal(f.calls.length, 0, "The startup template is never an enrichment target");
    f.open(SONG);
    for (let n = 0; n < 30; n++) await Promise.resolve();
    assert.equal(f.calls.length, 1);
    const { context, mode } = f.calls[0];
    assert.equal(mode, "enrich");
    assert.equal(context.config.target_file, f.notes.get(SONG).file);
    assert.equal(context.config.active_file, f.notes.get(SONG).file);
    assert.equal(context.config.run_mode, 0);
    assert.equal(context.file.title, "Quiet Night");
    assert.match(context.file.content, /Owner prose/);
    assert.equal(context.file.rename, undefined, "No startup template file mutation helpers are inherited");
    assert.equal(f.tp.config.target_file.path, STARTUP, "The actual Templater context remains untouched");
    cases++;
  }
  {
    const f = fixture({ active: ALBUM }); await f.startup();
    assert.equal(f.calls.length, 1, "An already-open album is enriched at startup");
    assert.equal(f.calls[0].context.config.target_file.path, ALBUM);
    assert.equal(f.notes.get(ALBUM).body, "## Personal Reflections\n\nOwner prose.\n");
    cases++;
  }
  {
    const f = fixture(); await f.startup();
    const rejected = [STARTUP, ROOT + "/Songs/Nested/No.md", ROOT + "/Songs/../Other.md",
      ROOT + "/Songs\\Bad.md", ROOT + "/songs/Quiet Night.md", ROOT + "/Songs/Quiet Night.MD",
      "Other/" + SONG, ROOT + "/Lyrics/LRCLIB-1.md", ROOT + "/Albums/Test\u0000.md"];
    for (const filePath of rejected) assert.equal((await f.enrich(filePath)).status, "ignored", filePath);
    const malformed = f.makeNote(ROOT + "/Songs/Invalid.md");
    const actualRead = f.app.vault.read;
    f.app.vault.read = async file => file === malformed.file ? "---\n[1,2]\n---\n" : actualRead(file);
    assert.equal((await f.enrich(malformed.file.path)).status, "invalid");
    const unidentified = f.makeNote(ROOT + "/Songs/Untitled.md", { Artist: "", AlbumArtist: "" });
    assert.equal((await f.enrich(unidentified.file.path)).status, "unidentified");
    assert.equal(f.calls.length, 0);
    cases++;
  }
  {
    const f = fixture(); await f.startup();
    let release;
    f.setHandler(() => new Promise(resolve => { release = resolve; }));
    const first = f.enrich(SONG), second = f.enrich(SONG);
    for (let n = 0; n < 10; n++) await Promise.resolve();
    assert.equal(f.calls.length, 1, "Concurrent requests share one importer operation");
    release({ status: "checked" });
    assert.deepEqual(await first, await second);
    assert.equal(f.win.__abyssalMusicEnrichmentState.inflight.size, 0);
    assert.equal((await f.enrich(SONG)).status, "cached");
    cases++;
  }
  {
    const f = fixture(); await f.startup();
    assert.equal((await f.enrich(SONG)).status, "checked");
    const note = f.notes.get(SONG);
    assert.equal(note.fm.MetadataVersion, 2);
    assert.ok(note.fm.MetadataSignature.includes("Quiet Night"));
    assert.equal((await f.enrich(SONG)).status, "cached", "Final signature prevents immediate repeat after enrichment modifies Year");
    await f.startup();
    assert.equal((await f.enrich(SONG)).status, "cached", "Source-sync reruns retain the cooldown");
    f.newSession(); await f.startup();
    assert.equal((await f.enrich(SONG)).status, "cached", "Persisted markers prevent a request after reopening Obsidian");
    assert.equal(f.calls.length, 1);
    f.advance(DAY + 1);
    assert.equal((await f.enrich(SONG)).status, "checked");
    assert.equal(f.calls.length, 2);
    cases++;
  }
  {
    const f = fixture(); await f.startup(); await f.enrich(SONG);
    f.notes.get(SONG).fm.Album = "Owner corrected edition";
    assert.equal((await f.enrich(SONG)).status, "checked", "An identity or metadata correction invalidates the cached signature");
    f.importerFile.stat.mtime++;
    assert.equal((await f.enrich(SONG)).status, "checked", "A changed importer is allowed to fill its new metadata fields");
    f.notes.get(SONG).fm.MetadataVersion = 1;
    f.newSession(); await f.startup();
    assert.equal((await f.enrich(SONG)).status, "checked", "An obsolete persisted version is retried");
    assert.equal(f.calls.length, 4);
    cases++;
  }
  {
    for (const failure of [() => { throw Error("Offline"); }, () => ({ status: "failed" })]) {
      const f = fixture(); await f.startup(); f.setHandler(failure);
      assert.equal((await f.enrich(SONG)).status, "failed");
      for (let n = 0; n < 5; n++) assert.equal((await f.enrich(SONG)).status, "cached");
      assert.equal(f.calls.length, 1, "Repeated opens cannot trigger an unbounded failed request loop");
      f.advance(60001);
      assert.equal((await f.enrich(SONG)).status, "failed", "Failures can retry after one minute on a later open");
      assert.equal(f.calls.length, 2);
      assert.equal(f.timers.size, 0, "There is no background network retry timer");
    }
    cases++;
  }
  {
    const f = fixture(); await f.startup(); await f.enrich(SONG);
    assert.equal((await f.enrich(SONG, { force: true })).status, "checked");
    assert.equal(f.calls.length, 2, "An explicit refresh can bypass the cooldown");
    f.tp.user.music_metadata = null;
    assert.equal((await f.enrich(ALBUM)).status, "unavailable");
    cases++;
  }
  {
    const f = fixture(); await f.startup();
    const own = f.plugin.settings.views;
    assert.deepEqual(own.map(view => view.id), ["music-song-v1", "music-album-v1", "owner-view"]);
    assert.equal(own[2], f.unrelated, "Owner views retain their full source and identity");
    await f.startup();
    assert.equal(f.plugin.saves, 1, "Unchanged source does not repeatedly save plugin settings");
    assert.equal(f.plugin.refreshes, 2);
    assert.equal(f.removed(), 2, "Repeated startup replaces its two subscriptions");
    assert.equal(f.handlers.size, 2);
    assert.equal(f.plugin.settings.views[2], f.unrelated);
    cases++;
  }
  console.log("Music automatic enrichment passed: " + cases + " integration cases.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
