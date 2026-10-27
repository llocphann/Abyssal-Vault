async function runMusicMetadataTests() {
  const assert = require("node:assert/strict");
  const importer = require("../90_System/92_Scripts/Template_Scripts/music_metadata.js");
  const progressFactory = require("../90_System/92_Scripts/Template_Scripts/import_progress.js");
  const SONGS = "20_Personal_Life/28_Music_Tracker/Songs";
  const ALBUMS = "20_Personal_Life/28_Music_Tracker/Albums";

  function makeTp(options) {
    const opts = options || {};
    const requests = [];
    const created = [];
    const notices = [];
    const progressEvents = [];
    const node = () => ({
      style: {}, empty() {}, setText(value) { this.text = value; },
      setAttribute(key, value) { this[key] = value; },
      createDiv(o = {}) { const child = node(); child.text = o.text || ""; return child; },
      createEl(name) { const child = node(); child.name = name; return child; }
    });
    const folders = new Set([ "20_Personal_Life", "20_Personal_Life/28_Music_Tracker", SONGS, ALBUMS ]);
    const files = [];
    const target = { path: (opts.kind === "album" ? ALBUMS : SONGS) + "/Untitled.md", name: "Untitled.md", stat: { size: 0, ctime: 42 } };
    const tp = {
      config: { target_file: target, run_mode: 0 },
      file: {
        title: "Untitled",
        content: "",
        rename: async name => { tp.file.title = name; target.name = name + ".md"; target.path = target.path.slice(0, target.path.lastIndexOf("/") + 1) + target.name; },
        create_new: async (content, name, openNew, folder) => {
          const file = { path: folder + "/" + name + ".md", name: name + ".md", basename: name, stat: { size: content.length, ctime: 43 } };
          created.push({ file, content });
          files.push(file);
          return file;
        }
      },
      date: { now: format => format === "YYYY-MM-DD" ? "2026-10-20" : "20261020-190000" },
      obsidian: {
        Notice: class {
          constructor(message, duration) {
            this.message = message;
            this.duration = duration;
            this.hidden = false;
            this.noticeEl = node();
            notices.push(this);
          }
          hide() { this.hidden = true; }
          setMessage(message) { this.message = message; }
        },
        requestUrl: async request => {
          requests.push(request.url);
          if (opts.respond) return opts.respond(request.url);
          if (request.url.includes("/recording/?query=")) return { status: 200, json: { recordings: [{
            id: "recording-1", title: "Quiet Night", "artist-credit": [{ name: "Test Artist" }],
            length: 210000, "first-release-date": "2024-05-01",
            releases: [{ id: "release-1", title: "Blue Hour", date: "2024-05-01", "artist-credit": [{ name: "Test Artist" }] }]
          }] } };
          if (request.url.includes("/recording/recording-1?")) return { status: 200, json: {
            id: "recording-1", title: "Quiet Night", "artist-credit": [{ name: "Test Artist" }],
            length: 210000, "first-release-date": "2024-05-01", isrcs: ["USAAA2400001"],
            genres: [{ name: "Dream Pop" }],
            relations: [{type:"performance",work:{language:"eng",languages:["eng"],
              relations:[{type:"composer",artist:{name:"Fixture Composer"}}]}}],
            releases: [{ id: "release-1", title: "Blue Hour", date: "2024-05-01", "artist-credit": [{ name: "Test Artist" }] }]
          } };
          if (request.url.includes("coverartarchive.org/release/release-1")) return { status: 200, json: {
            images: [{ front: true, thumbnails: { "500": "https://coverartarchive.org/test-cover.jpg" } }]
          } };
          if (request.url.includes("/release/?query=")) return { status: 200, json: { releases: [{
            id: "release-1", title: "Blue Hour", "artist-credit": [{ name: "Test Artist" }], date: "2024-05-01"
          }] } };
          if (request.url.includes("/release/release-1?")) return { status: 200, json: {
            id: "release-1", title: "Blue Hour", "artist-credit": [{ name: "Test Artist" }], date: "2024-05-01",
            "release-group": { id: "group-1", "first-release-date": "2024-05-01", "primary-type":"Album" },
            genres: [{ name: "Dream Pop" }],
            media: [{ position: 1, format: "Digital Media", tracks: [
              { position: 1, title: "Quiet Night", length: 210000, recording: { id: "recording-1", title: "Quiet Night", length: 210000, "artist-credit": [{ name: "Test Artist" }] } },
              { position: 2, title: "Silver Rain", length: 185000, recording: { id: "recording-2", title: "Silver Rain", length: 185000, "artist-credit": [{ name: "Test Artist" }] } }
            ] }]
          } };
          throw new Error("Unexpected URL: " + request.url);
        }
      },
      user: opts.noProgress ? {} : {
        import_progress(context, options) {
          progressEvents.push({kind:"open",title:options.title,total:options.totalSteps});
          const ui = progressFactory(context, options);
          return {
            update(step, message) {
              progressEvents.push({kind:"step",step,message});
              ui.update(step,message);
            },
            close() {
              progressEvents.push({kind:"close"});
              ui.close();
            }
          };
        }
      },
      system: {
        prompt: async () => opts.query === "" ? "" : opts.query || "Quiet Night",
        suggester: async (labels, items, throwOnCancel, placeholder) => {
          if (opts.cancelSelection && placeholder !== "How should song notes be created?") return null;
          if (placeholder === "How should song notes be created?") return opts.songChoice || "all";
          return items[0];
        },
        multi_suggester: async (labels, items) => items.slice(0, 1)
      },
      app: {
        vault: {
          getAbstractFileByPath: path => folders.has(path) ? { path: path } : files.find(file => file.path === path) || null,
          getMarkdownFiles: () => files,
          read: async () => "",
          createFolder: async path => { folders.add(path); },
          createBinary: async () => {}
        },
        metadataCache: { getFileCache: () => ({ frontmatter: {} }) },
        fileManager: { trashFile: async () => {} }
      }
    };
    return { tp, requests, created, notices, files, progressEvents };
  }

  function checkProgress(state, title, finalStep = 5) {
    assert.equal(state.progressEvents[0]?.kind,"open");
    assert.equal(state.progressEvents[0]?.title,title);
    assert.equal(state.progressEvents[0]?.total,5);
    assert.equal(state.progressEvents.filter(event => event.kind==="close").length,1);
    const steps = state.progressEvents.filter(event => event.kind==="step").map(event => event.step);
    assert.equal(steps.at(-1),finalStep);
    assert.deepEqual([...new Set(steps)],[...Array(finalStep)].map((_,i)=>i+1));
    const ui = state.notices.filter(n => n.duration === 0);
    assert.equal(ui.length,1);
    assert.equal(ui[0].hidden,true);
  }

  {
    const state = makeTp();
    const note = await importer(state.tp, "song");
    assert.match(note, /categories:\n  - "\[\[Songs\]\]"/);
    assert.match(note, /MusicBrainzId: "recording-1"/);
    assert.match(note, /Cover: "https:\/\/coverartarchive.org\/test-cover.jpg"/);
    assert.ok(!note.includes("## Lyrics"));
    assert.ok(!note.includes("What does this song mean to me?"));
    assert.match(note, /LyricsFile: ""/);
    assert.match(note, /## Personal Reflections/);
    assert.match(note, /Composer:\n  - "Fixture Composer"/);
    assert.match(note, /Language:\n  - "eng"/);
    assert.match(note, /MetadataCheckedAt: "\d{4}-\d{2}-\d{2}T/);
    assert.match(note, /MetadataSources:\n  - "MusicBrainz"/);
    assert.match(note, /What feeling or memory does this song leave with you/);
    assert.ok(!note.includes("actual lyric text"));
    assert.ok(state.requests.some(url => url.includes("musicbrainz.org/ws/2/recording/")));
    checkProgress(state,"Song Import");
    assert.ok(state.progressEvents.some(event => event.message?.includes("lyrics")));
  }

  {
    const state = makeTp({ kind: "album", query: "Blue Hour" });
    const note = await importer(state.tp, "album");
    assert.match(note, /categories:\n  - "\[\[Albums\]\]"/);
    assert.match(note, /ReleaseGroupId: "group-1"/);
    assert.match(note, /ReleaseType: "Album"/);
    assert.match(note, /## Album Impressions/);
    assert.match(note, /What story does this album tell/);
    assert.match(note, /## Tracklist/);
    assert.equal(state.created.length, 2);
    assert.match(state.created[0].content, /Album: "\[\[Blue Hour\]\]"/);
    assert.match(state.created[0].content, /TrackCount: 2/);
    assert.match(state.created[0].content, /Genre:\n  - "Dream Pop"/);
    assert.match(state.created[0].content, /ReleaseType: "Album"/);
    assert.match(state.created[0].content, /Format: "Digital Media"/);
    assert.match(state.created[0].content, /MetadataCheckedAt: "\d{4}-\d{2}-\d{2}T/);
    assert.match(state.created[0].content, /MetadataSources:\n  - "MusicBrainz"/);
    assert.ok(!state.created[0].content.includes("## Lyrics"));
    assert.match(state.created[0].content, /## Personal Reflections/);
    checkProgress(state,"Album Import");
    assert.ok(state.progressEvents.some(event => event.message?.includes("Creating Song notes (1/2)")));
    assert.ok(state.progressEvents.some(event => event.message?.includes("Creating Song notes (2/2)")));
  }

  {
    const state = makeTp({ kind: "album", query: "Blue Hour", songChoice: "select" });
    const note = await importer(state.tp, "album");
    assert.match(note, /## Tracklist/);
    assert.equal(state.created.length, 1);
    assert.match(state.created[0].content, /Title: "Quiet Night"/);
    assert.ok(!state.created.some(item => item.content.includes('Title: "Silver Rain"')));
    checkProgress(state,"Album Import");
    assert.ok(state.progressEvents.some(event => event.message?.includes("Creating Song notes (1/1)")));
  }

  {
    const state = makeTp({ kind: "album", query: "Blue Hour", songChoice: "none" });
    const note = await importer(state.tp, "album");
    assert.equal(state.created.length, 0);
    assert.match(note, /## Album Impressions/);
    assert.match(note, /- Quiet Night/);
    checkProgress(state,"Album Import");
  }

  {
    const state = makeTp({ respond: async url => {
      if (url.includes("/recording/?query=")) return { status: 200, json: { recordings: [] } };
      if (url.includes("itunes.apple.com/search")) return { status: 200, json: { results: [{
        wrapperType: "track", kind: "song", trackId: 99, trackName: "Quiet Night",
        artistName: "Test Artist", collectionName: "Blue Hour", trackTimeMillis: 210000,
        releaseDate: "2024-05-01", primaryGenreName: "Alternative", trackViewUrl: "https://music.apple.com/test"
      }] } };
      throw new Error("Unexpected URL: " + url);
    }});
    const note = await importer(state.tp, "song");
    assert.match(note, /Source: "Apple iTunes Search API"/);
    assert.match(note, /AppleTrackId: "99"/);
    assert.match(note, /StoreUrl: "https:\/\/music.apple.com\/test"/);
    assert.match(note, /Cover: ""/);
    checkProgress(state,"Song Import");
    assert.ok(state.progressEvents.some(event => event.message?.includes("Apple iTunes")));
  }

  {
    const state = makeTp({ kind:"album", cancelSelection:true, query:"Blue Hour" });
    const note = await importer(state.tp,"album");
    assert.match(note,/## Album Impressions/);
    checkProgress(state,"Album Import",2);
  }
  {
    const state = makeTp({respond:async url => {
      if(url.includes("/recording/?query="))return {status:200,json:{recordings:[]}};
      if(url.includes("itunes.apple.com/search?"))return {status:200,json:{results:[]}};
      throw Error("Unexpected no-match URL " + url);
    }});
    const note = await importer(state.tp,"song");
    assert.match(note,/## Personal Reflections/);
    checkProgress(state,"Song Import",1);
  }
  {
    const state = makeTp({noProgress:true});
    const note = await importer(state.tp,"song");
    assert.match(note,/## Personal Reflections/);
    assert.equal(state.progressEvents.length,0);
  }
  {
    const state = makeTp({query:""});
    const note = await importer(state.tp,"song");
    assert.match(note,/## Personal Reflections/);
    assert.equal(state.progressEvents.length,0);
  }
  {
    const state = makeTp({
      query: "Everybody Loves Somebody",
      respond: async url => {
        if (url.includes("/recording/?query=")) return { status: 200, json: { recordings: [{
          id: "rec-live-1", title: "Everybody Loves Somebody",
          "artist-credit": [{ name: "Dean Martin" }],
          length: 218000,
          releases: [{
            id: "rel-live-1", title: "1977-06-10: Sabre Room, Chicago, IL, USA",
            "artist-credit": [{ name: "Frank Sinatra", joinphrase: " & " }, { name: "Dean Martin", joinphrase: "" }]
          }]
        }] } };
        if (url.includes("/recording/rec-live-1?")) return { status: 200, json: {
          id: "rec-live-1", title: "Everybody Loves Somebody",
          "artist-credit": [{
            name: "Dean Martin",
            artist: {
              name: "Dean Martin",
              genres: [
                { name: "christmas music", count: 1 },
                { name: "vocal jazz", count: 1 },
                { name: "pop", count: 6 },
                { name: "big band", count: 2 }
              ]
            }
          }],
          length: 218000,
          genres: [],
          tags: [],
          releases: [{
            id: "rel-live-1", title: "1977-06-10: Sabre Room, Chicago, IL, USA",
            "artist-credit": [{ name: "Frank Sinatra", joinphrase: " & " }, { name: "Dean Martin", joinphrase: "" }]
          }]
        } };
        if (url.includes("/release/rel-live-1?")) return { status: 200, json: {
          id: "rel-live-1", title: "1977-06-10: Sabre Room, Chicago, IL, USA",
          "artist-credit": [{ name: "Frank Sinatra", joinphrase: " & " }, { name: "Dean Martin", joinphrase: "" }],
          genres: [], tags: []
        } };
        if (url.includes("coverartarchive.org") || url.includes("itunes.apple.com") || url.includes("lrclib.net")) {
          return { status: 200, json: { results: [], images: [] } };
        }
        throw new Error("Unexpected URL: " + url);
      }
    });
    const note = await importer(state.tp, "song");
    assert.match(note, /AlbumArtist: "Frank Sinatra & Dean Martin"/);
    assert.match(note, /Genre:\n  - "Pop"\n  - "Big Band"\n  - "Vocal Jazz"/);
    assert.ok(!note.includes("Christmas Music"));
  }

  console.log("Music metadata and import progress tests passed.");
}

runMusicMetadataTests().catch(error => { console.error(error); process.exitCode = 1; });
