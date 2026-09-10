<%*
/*
 * Restore the official Maps plugin runtime when a fresh clone contains the
 * enabled-plugin entry but not the vendored Community Plugin files.
 *
 * Assets are pinned to Maps 0.2.2 and verified with SHA-256 before anything
 * is written to .obsidian/plugins/maps.
 */
const { requestUrl, Notice } = require("obsidian");
const crypto = require("crypto");

const PLUGIN_ID = "maps";
const PLUGIN_DIR = `.obsidian/plugins/${PLUGIN_ID}`;
const VERSION = "0.2.2";
const RELEASE_BASE = `https://github.com/obsidianmd/obsidian-maps/releases/download/${VERSION}`;

const ASSETS = [
  {
    name: "main.js",
    sha256: "ebe69bada2dfe5d1230ea5bf5406a0f35ccd6a6e62bb9b235ee623920545f05f",
  },
  {
    name: "manifest.json",
    sha256: "6ad71e2fe4f6b425cfd9fddecbe1321894a0130e3c06c4e59f02889b3b7eed96",
  },
  {
    name: "styles.css",
    sha256: "63f71db74e8f3ae39350d4265d03aaf8839ad3a098bcbe1e33f254258a8258f6",
  },
];

const adapter = app.vault.adapter;
const mainPath = `${PLUGIN_DIR}/main.js`;

// Nothing to do when the plugin runtime is already present.
if (!(await adapter.exists(mainPath))) {
  try {
    const downloaded = [];

    for (const asset of ASSETS) {
      const response = await requestUrl({
        url: `${RELEASE_BASE}/${asset.name}`,
        method: "GET",
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`${asset.name}: HTTP ${response.status}`);
      }

      const content = response.text;
      const actual = crypto.createHash("sha256").update(content, "utf8").digest("hex");
      if (actual !== asset.sha256) {
        throw new Error(`${asset.name}: SHA-256 mismatch (expected ${asset.sha256}, got ${actual})`);
      }

      downloaded.push({ ...asset, content });
    }

    if (!(await adapter.exists(PLUGIN_DIR))) {
      await adapter.mkdir(PLUGIN_DIR);
    }

    for (const asset of downloaded) {
      await adapter.write(`${PLUGIN_DIR}/${asset.name}`, asset.content);
    }

    new Notice(`Abyssal-Vault: installed official Maps ${VERSION}. Reload Obsidian once to activate Map.base.`, 12000);
    console.info(`[Abyssal] Installed official Maps ${VERSION} from pinned, verified release assets.`);
  } catch (error) {
    console.error("[Abyssal] Could not bootstrap Maps plugin:", error);
    new Notice(`Abyssal-Vault: Maps ${VERSION} could not be restored automatically. ${error?.message || error}`, 15000);
  }
}
%>
