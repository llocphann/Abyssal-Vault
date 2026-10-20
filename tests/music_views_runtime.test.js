// Run with: node tests/music_views_runtime.test.js
// This is an offline mock of Custom Views v0.5.0 runtime, not an Obsidian UI test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runtime = fs.readFileSync(path.join(__dirname, "../90_System/93_Configuration/Custom_Views/Music/script.js"), "utf8");

class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.textContent = "";
    this.dataset = {};
    this.attributes = {};
    this.events = {};
    this.hidden = false;
    this.classList = { toggle: (name, active) => { this.attributes["class-" + name] = active; } };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelector(selector) { return selector === "span" ? this.children.find(el => el.tagName === "span") : null; }
  addEventListener(name, callback) { this.events[name] = callback; }
}

async function run(kind) {
  const document = { createElement: tag => new Element(tag) };
  const root = new Element();
  root.dataset.musicKind = kind;
  root.ownerDocument = document;
  const roles = [
    "music-cover", "music-cover-fallback", "music-title", "music-artist",
    "music-year", "music-duration", "music-track", "music-tracks",
    "music-genres", "music-description", "music-source-link",
    "music-open-album", "music-details", "music-tracklist", "music-track-count",
    "music-favourite", "music-favourite-label", "music-feedback", "music-rating-value",
    "music-writing-guide"
  ];
  const elements = Object.fromEntries(roles.map(role => [role, new Element()]));
  elements["music-favourite"].append(new Element("span"), new Element("span"));
  const ratings = [1, 2, 3, 4, 5].map(number => {
    const button = new Element("button");
    button.dataset.musicRate = String(number);
    return button;
  });
  root.querySelector = selector => {
    const match = selector.match(/^\[data-role="([^"]+)"\]$/);
    return match ? elements[match[1]] || null : null;
  };
  root.querySelectorAll = selector => selector === "[data-music-rate]" ? ratings : [];
  const written = [];
  const opened = [];
  const app = {
    metadataCache: { getFirstLinkpathDest: () => null },
    vault: { getResourcePath: () => "" },
    fileManager: { processFrontMatter: async (file, fn) => {
      const patch = {};
      fn(patch);
      written.push(patch);
    }},
    workspace: { openLinkText: (target, from) => opened.push({target, from}) }
  };
  const file = {
    basename: kind === "album" ? "Test Album" : "Test Song",
    path: "20_Personal_Life/28_Music_Tracker/" + (kind === "album" ? "Albums/Test Album.md" : "Songs/Test Song.md")
  };
  const frontmatter = {
    Title: file.basename,
    Artist: "Test Artist",
    Year: 2024,
    ReleaseDate: "2024-10-20",
    Genre: ["Dream Pop"],
    Cover: "https://coverartarchive.org/test-cover.jpg",
    Duration: 420,
    Favourite: false,
    PersonalRating: 0,
    Album: "[[Test Album]]",
    TrackNumber: 1,
    TrackCount: 2,
    Tracklist: ["[[Test Song]]", "Unlinked Song"]
  };
  const context = {
    container: { querySelector: () => root },
    app, file, frontmatter, activeDocument: document,
    bodyContent: kind === "album"
      ? "## Album Impressions\n\n## Tracklist\n\n- Test Song\n"
      : "## Personal Reflections\n\n## Notes\n"
  };
  new Function("tp", runtime)(context);
  assert.equal(elements["music-writing-guide"].hidden, false,
    "Blank reflection sections should show inline writing questions");

  assert.equal(elements["music-title"].textContent, file.basename);
  assert.equal(elements["music-artist"].textContent, "Test Artist");
  assert.equal(elements["music-cover"].src, "https://coverartarchive.org/test-cover.jpg");
  assert.equal(elements["music-genres"].children[0].textContent, "Dream Pop");
  await elements["music-favourite"].events.click();
  await ratings[3].events.click();
  assert.deepEqual(written, [{ Favourite: true }, { PersonalRating: 4 }]);
  assert.equal(elements["music-favourite"].attributes["aria-pressed"], "true");
  assert.equal(ratings[3].attributes["class-is-active"], true);

  if (kind === "album") {
    assert.equal(elements["music-tracklist"].children.length, 2);
    const linked = elements["music-tracklist"].children[0].children[1];
    const unlinked = elements["music-tracklist"].children[1].children[1];
    assert.equal(linked.tagName, "button");
    assert.equal(unlinked.tagName, "span");
    linked.events.click();
    assert.deepEqual(opened, [{target:"Test Song", from:file.path}]);
  } else {
    assert.equal(elements["music-open-album"].hidden, false);
    elements["music-open-album"].onclick();
    assert.deepEqual(opened, [{target:"Test Album", from:file.path}]);
  }
  context.bodyContent = kind === "album"
    ? "## Album Impressions\n\nThe final song changes everything.\n\n## Tracklist\n"
    : "## Personal Reflections\n\nI remember listening on the train.\n\n## Notes\n";
  new Function("tp", runtime)(context);
  assert.equal(elements["music-writing-guide"].hidden, true,
    "Writing questions should disappear for an authored reflection");
}
(async () => {
  await run("album");
  await run("song");
  console.log("2 Music Custom Views runtime tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
