const SETTINGS_PATH = "90_System/93_Configuration/settings.local.md";
const RECIPE_MEDIA_ROOT = "90_System/95_Media_Assets/Recipes";
const SPOONACULAR_SEARCH = "https://api.spoonacular.com/recipes/complexSearch";
const SPOONACULAR_RECIPES = "https://api.spoonacular.com/recipes";
const THEMEALDB_API = "https://www.themealdb.com/api/json/v1/1";

function decodeEntities(value) {
  const named = {
    amp: "&", apos: "'", gt: ">", hellip: "…", ldquo: "“", lsquo: "‘",
    lt: "<", mdash: "—", nbsp: " ", ndash: "–", quot: '"', rdquo: "”",
    rsquo: "’",
  };
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) =>
      named[name.toLowerCase()] ?? entity);
}

function plainText(value, preserveBreaks = false) {
  let output = String(value || "");
  if (preserveBreaks) {
    output = output.replace(/<(?:br\s*\/?|\/p|\/li|\/div|\/h[1-6])>/gi, "\n");
  }
  output = decodeEntities(output.replace(/<[^>]*>/g, " "))
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return preserveBreaks ? output : output.replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).filter((value) => {
    const key = String(value || "").trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function positiveInteger(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function safeFileName(value, fallback) {
  return String(value || fallback || "Recipe")
    .replace(/\s*:\s*/g, " - ")
    .replace(/[\\/:*?"<>|]/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim() || fallback || "Recipe";
}

function yamlString(value) {
  return JSON.stringify(String(value ?? "").replace(/\r?\n+/g, " ").trim());
}

function appendList(lines, key, values) {
  const items = unique(
    (Array.isArray(values) ? values : []).map((value) => plainText(value)),
  );
  if (!items.length) {
    lines.push(`${key}: []`);
    return;
  }
  lines.push(`${key}:`);
  for (const item of items) lines.push(`  - ${yamlString(item)}`);
}

function renderRecipe(recipe) {
  const lines = [
    "---",
    "categories:",
    '  - "[[Recipes]]"',
    `recipe_category: ${yamlString(recipe.recipeCategory || "Recipe")}`,
    `cuisine: ${yamlString(recipe.cuisine || "")}`,
    `tagline: ${yamlString(recipe.tagline || "")}`,
    `cover: ${yamlString(recipe.cover || "")}`,
    `recipe_illustration: ${yamlString(recipe.recipeIllustration || "")}`,
    `description: ${yamlString(recipe.description || "")}`,
    `servings: ${positiveInteger(recipe.servings) ?? 2}`,
    positiveInteger(recipe.prepTime) === null
      ? "prep_time:"
      : `prep_time: ${positiveInteger(recipe.prepTime)}`,
    positiveInteger(recipe.cookTime) === null
      ? "cook_time:"
      : `cook_time: ${positiveInteger(recipe.cookTime)}`,
    `difficulty: ${yamlString(recipe.difficulty || "Easy")}`,
    "favorite: false",
    "bookmarked: false",
  ];
  appendList(lines, "ingredients", recipe.ingredients);
  appendList(lines, "instructions", recipe.instructions);
  appendList(lines, "tips", recipe.tips);
  appendList(lines, "pairs_well_with", recipe.pairsWellWith);
  lines.push(
    `recipe_provider: ${yamlString(recipe.recipeProvider || "")}`,
    `provider_recipe_id: ${yamlString(recipe.providerRecipeId || "")}`,
    recipe.spoonacularId
      ? `spoonacular_id: ${Number(recipe.spoonacularId)}`
      : "spoonacular_id:",
    recipe.themealdbId
      ? `themealdb_id: ${Number(recipe.themealdbId)}`
      : "themealdb_id:",
    `source_name: ${yamlString(recipe.sourceName || "")}`,
    `source_url: ${yamlString(recipe.sourceUrl || "")}`,
    `created: ${recipe.today}`,
    `last: ${recipe.today}`,
    `via: ${yamlString(recipe.via || "")}`,
    "custom-width: 100",
  );
  if (recipe.alias && recipe.alias !== recipe.title) {
    lines.push("aliases:", `  - ${yamlString(recipe.alias)}`);
  }
  lines.push("---", "", "## Personal Notes", "");
  return lines.join("\n");
}

function skeleton(tp, title) {
  return {
    title, alias: "", recipeCategory: "Recipe", cuisine: "", tagline: "",
    cover: "", recipeIllustration: "", description: "", servings: 2,
    prepTime: null, cookTime: null, difficulty: "Easy", ingredients: [],
    instructions: [], tips: [], pairsWellWith: [], recipeProvider: "",
    providerRecipeId: "", spoonacularId: null, themealdbId: null,
    sourceName: "", sourceUrl: "", via: "",
    today: tp.date.now("YYYY-MM-DD"),
  };
}

function unquoteSetting(value) {
  return String(value ?? "")
    .trim()
    .replace(/^(?:["'])(.*)(?:["'])$/, "$1")
    .trim();
}

function settingFromText(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text || "").match(
    new RegExp(`^${escaped}:\\s*(.*?)\\s*$`, "m"),
  );
  return match ? unquoteSetting(match[1]) : "";
}

function normalizeProviderPreference(value) {
  const preference = String(value || "auto").trim().toLocaleLowerCase();
  if (["spoonacular", "spoon"].includes(preference)) return "spoonacular";
  if (["themealdb", "mealdb", "the meal db"].includes(preference)) {
    return "themealdb";
  }
  return "auto";
}

async function readImporterSettings(tp) {
  const settingsFile = tp.app.vault.getAbstractFileByPath(SETTINGS_PATH);
  if (!settingsFile) {
    return { spoonacularKey: "", providerPreference: "auto" };
  }
  const frontmatter = tp.app.metadataCache.getFileCache(settingsFile)
    ?.frontmatter || {};
  let spoonacularKey = unquoteSetting(frontmatter.spoonacular_key);
  let providerPreference = unquoteSetting(frontmatter.recipe_provider);
  if (!spoonacularKey || !providerPreference) {
    // Never log or render private provider settings.
    const settingsText = await tp.app.vault.read(settingsFile);
    spoonacularKey ||= settingFromText(settingsText, "spoonacular_key");
    providerPreference ||= settingFromText(settingsText, "recipe_provider");
  }
  return {
    spoonacularKey,
    providerPreference: normalizeProviderPreference(providerPreference),
  };
}

async function requestJson(tp, url, providerLabel, headers = {}) {
  if (typeof tp?.obsidian?.requestUrl !== "function") {
    throw new Error("Obsidian requestUrl is unavailable");
  }
  const response = await tp.obsidian.requestUrl({
    url,
    method: "GET",
    headers: { Accept: "application/json", ...headers },
    throw: false,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${providerLabel} returned HTTP ${response.status}`);
  }
  if (response.json && typeof response.json === "object") return response.json;
  try {
    return JSON.parse(response.text || "{}");
  } catch (error) {
    throw new Error(`${providerLabel} returned invalid JSON`);
  }
}

async function requestBinary(tp, url) {
  if (typeof tp?.obsidian?.requestUrl !== "function") {
    throw new Error("Obsidian requestUrl is unavailable");
  }
  const response = await tp.obsidian.requestUrl({
    url,
    method: "GET",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
    throw: false,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Image download returned HTTP ${response.status}`);
  }
  let binary = response.arrayBuffer ?? response.buffer;
  if (ArrayBuffer.isView(binary)) {
    binary = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
  }
  if (!(binary instanceof ArrayBuffer)) {
    throw new Error("Image download returned no binary data");
  }
  return { binary, headers: response.headers || {} };
}

function recipeInstructions(details) {
  const groups = Array.isArray(details?.analyzedInstructions)
    ? details.analyzedInstructions
    : [];
  const steps = [];
  for (const group of groups) {
    const section = plainText(group?.name);
    const groupSteps = Array.isArray(group?.steps) ? group.steps : [];
    groupSteps.forEach((step, index) => {
      const instruction = plainText(step?.step);
      if (!instruction) return;
      steps.push(
        section && index === 0 ? `${section} — ${instruction}` : instruction,
      );
    });
  }
  if (steps.length) return unique(steps);
  const fallback = plainText(details?.instructions, true);
  return unique(fallback.split("\n").map((line) =>
    line.replace(/^\s*\d+[.)-]?\s*/, "").trim()));
}

function splitMealDbInstructions(value) {
  const text = plainText(value, true);
  if (!text) return [];
  let steps = text
    .split(/\n+/)
    .map((step) => step.replace(/^\s*(?:step\s*)?\d+[.)-]?\s*/i, "").trim())
    .filter(Boolean);
  if (steps.length === 1 && steps[0].length > 180) {
    steps = steps[0]
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((step) => step.trim())
      .filter(Boolean);
  }
  return unique(steps);
}

function deriveTimes(details) {
  const ready = positiveInteger(details?.readyInMinutes);
  let prep = positiveInteger(details?.preparationMinutes);
  let cook = positiveInteger(details?.cookingMinutes);
  if (prep === null && cook !== null && ready !== null && ready >= cook) {
    prep = ready - cook;
  }
  if (cook === null && prep !== null && ready !== null && ready >= prep) {
    cook = ready - prep;
  }
  if (prep === null && cook === null && ready !== null) cook = ready;
  return { prep, cook, ready };
}

function deriveDifficulty(ready, ingredientCount, instructionCount) {
  if ((ready ?? 0) > 75 || ingredientCount > 18 || instructionCount > 12) {
    return "Hard";
  }
  if ((ready ?? 0) <= 30 && ingredientCount <= 10 && instructionCount <= 6) {
    return "Easy";
  }
  return "Medium";
}

function selectRecipeCategory(dishTypes, cuisine) {
  const referenceCategories = [
    "breakfast", "brunch", "soup", "salad", "dessert", "beverage", "drink",
  ];
  return dishTypes.find((type) => referenceCategories.some((category) =>
    type.toLocaleLowerCase().includes(category))) ||
    cuisine ||
    dishTypes.find((type) => type.toLocaleLowerCase() !== "main course") ||
    dishTypes[0] || "Recipe";
}

function chooseRecipeIllustration(...values) {
  const haystack = values.flat(Infinity)
    .map((value) => plainText(value).toLocaleLowerCase())
    .filter(Boolean)
    .join(" ");
  const rules = [
    [/burger|sandwich|slider/, "burger"],
    [/soup|stew|broth|chowder/, "soup"],
    [/fish|seafood|salmon|tuna|shrimp|prawn/, "fish"],
    [/salad|vegetable|veggie|greens/, "salad"],
    [/dessert|cake|cookie|brownie|sweet|pastry|pudding/, "dessert"],
    [/breakfast|brunch|pancake|waffle|egg/, "breakfast"],
    [/pasta|spaghetti|noodle|lasagna/, "pasta"],
    [/asian|stir[ -]?fry|wok|beef|teriyaki|curry/, "wok"],
  ];
  const match = rules.find(([pattern]) => pattern.test(haystack));
  return match?.[1] || "herbs";
}

function makeSpoonacularProvider(apiKey) {
  const authHeaders = { "x-api-key": apiKey };
  return {
    id: "spoonacular",
    label: "Spoonacular",
    assetPrefix: "spoonacular",
    async search(tp, query) {
      const url = `${SPOONACULAR_SEARCH}?query=${encodeURIComponent(query)}` +
        "&number=12&instructionsRequired=true";
      const payload = await requestJson(tp, url, this.label, authHeaders);
      return (Array.isArray(payload?.results) ? payload.results : [])
        .filter((item) => item?.id)
        .map((item) => ({
          providerId: this.id,
          id: String(item.id),
          title: plainText(item.title) || "Untitled recipe",
          imageUrl: String(item.image || "").trim(),
          raw: item,
        }));
    },
    async fetch(tp, selection, query, fallbackTitle, today) {
      const url = `${SPOONACULAR_RECIPES}/${Number(selection.id)}` +
        "/information?includeNutrition=false";
      const details = await requestJson(tp, url, this.label, authHeaders);
      const rawTitle = plainText(details?.title || selection.title || query) ||
        fallbackTitle;
      const title = safeFileName(rawTitle, fallbackTitle);
      const ingredients = unique(
        (Array.isArray(details?.extendedIngredients)
          ? details.extendedIngredients
          : []).map((item) =>
          item?.originalClean || item?.original || item?.name),
      );
      const instructions = recipeInstructions(details);
      const times = deriveTimes(details);
      const cuisines = unique(
        (Array.isArray(details?.cuisines) ? details.cuisines : []).map(titleCase),
      );
      const dishTypes = unique(
        (Array.isArray(details?.dishTypes) ? details.dishTypes : []).map(titleCase),
      );
      const diets = unique(
        (Array.isArray(details?.diets) ? details.diets : []).map(titleCase),
      );
      const cuisine = cuisines[0] || "";
      const recipeCategory = selectRecipeCategory(dishTypes, cuisine);
      const tagline = diets.length
        ? diets.slice(0, 2).join(" · ")
        : [cuisine, recipeCategory].filter(Boolean).join(" · ");
      return {
        title,
        alias: title === rawTitle ? "" : rawTitle,
        recipeCategory,
        cuisine,
        tagline,
        coverUrl: String(details?.image || selection.imageUrl || "").trim(),
        recipeIllustration: chooseRecipeIllustration(
          title, recipeCategory, cuisine, dishTypes, ingredients,
        ),
        description: plainText(details?.summary),
        servings: positiveInteger(details?.servings) ?? 2,
        prepTime: times.prep,
        cookTime: times.cook,
        difficulty: deriveDifficulty(
          times.ready, ingredients.length, instructions.length,
        ),
        ingredients,
        instructions,
        tips: [],
        pairsWellWith: unique(details?.winePairing?.pairedWines || []),
        recipeProvider: this.label,
        providerRecipeId: String(details?.id || selection.id),
        spoonacularId: Number(details?.id || selection.id),
        themealdbId: null,
        sourceName: plainText(
          details?.sourceName || details?.creditsText || this.label,
        ),
        sourceUrl: plainText(
          details?.sourceUrl || details?.spoonacularSourceUrl,
        ),
        via: "Spoonacular API",
        today,
      };
    },
  };
}

function mealDbImageUrl(value) {
  const url = String(value || "").trim().replace(/\/(?:small|medium|large)$/i, "");
  return url ? `${url}/medium` : "";
}

function mealDbIngredients(meal) {
  const ingredients = [];
  for (let index = 1; index <= 20; index += 1) {
    const ingredient = plainText(meal?.[`strIngredient${index}`]);
    if (!ingredient) continue;
    const measure = plainText(meal?.[`strMeasure${index}`]);
    ingredients.push([measure, ingredient].filter(Boolean).join(" "));
  }
  return unique(ingredients);
}

function conciseDescription(instructions, category, cuisine) {
  const firstSteps = instructions.slice(0, 2).join(" ");
  if (!firstSteps) return [cuisine, category, "recipe"].filter(Boolean).join(" ");
  if (firstSteps.length <= 280) return firstSteps;
  const shortened = firstSteps.slice(0, 277).replace(/\s+\S*$/, "").trim();
  return `${shortened}…`;
}

function makeTheMealDbProvider() {
  return {
    id: "themealdb",
    label: "TheMealDB",
    assetPrefix: "themealdb",
    async search(tp, query) {
      const url = `${THEMEALDB_API}/search.php?s=${encodeURIComponent(query)}`;
      const payload = await requestJson(tp, url, this.label);
      return (Array.isArray(payload?.meals) ? payload.meals : [])
        .filter((meal) => meal?.idMeal)
        .slice(0, 12)
        .map((meal) => ({
          providerId: this.id,
          id: String(meal.idMeal),
          title: plainText(meal.strMeal) || "Untitled recipe",
          imageUrl: mealDbImageUrl(meal.strMealThumb),
          raw: meal,
        }));
    },
    async fetch(tp, selection, query, fallbackTitle, today) {
      const url = `${THEMEALDB_API}/lookup.php?i=${encodeURIComponent(selection.id)}`;
      const payload = await requestJson(tp, url, this.label);
      const details = (Array.isArray(payload?.meals) ? payload.meals[0] : null) ||
        selection.raw || {};
      const rawTitle = plainText(details.strMeal || selection.title || query) ||
        fallbackTitle;
      const title = safeFileName(rawTitle, fallbackTitle);
      const ingredients = mealDbIngredients(details);
      const instructions = splitMealDbInstructions(details.strInstructions);
      const cuisine = titleCase(details.strArea);
      const recipeCategory = titleCase(details.strCategory) || cuisine || "Recipe";
      const tags = unique(String(details.strTags || "").split(",").map(titleCase));
      const tagline = tags.length
        ? tags.slice(0, 2).join(" · ")
        : [cuisine, recipeCategory].filter(Boolean).join(" · ");
      const providerId = String(details.idMeal || selection.id);
      return {
        title,
        alias: title === rawTitle ? "" : rawTitle,
        recipeCategory,
        cuisine,
        tagline,
        coverUrl: mealDbImageUrl(details.strMealThumb || selection.imageUrl),
        recipeIllustration: chooseRecipeIllustration(
          title, recipeCategory, cuisine, tags, ingredients,
        ),
        description: conciseDescription(instructions, recipeCategory, cuisine),
        servings: 2,
        prepTime: null,
        cookTime: null,
        difficulty: deriveDifficulty(
          null, ingredients.length, instructions.length,
        ),
        ingredients,
        instructions,
        tips: [],
        pairsWellWith: [],
        recipeProvider: this.label,
        providerRecipeId: providerId,
        spoonacularId: null,
        themealdbId: Number(providerId),
        sourceName: this.label,
        sourceUrl: plainText(details.strSource),
        via: "TheMealDB API",
        today,
      };
    },
  };
}

function normalizeVaultPath(tp, path) {
  if (typeof tp?.obsidian?.normalizePath === "function") {
    return tp.obsidian.normalizePath(path);
  }
  return String(path || "").replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

async function ensureFolder(tp, folderPath) {
  const vault = tp.app.vault;
  const parts = normalizeVaultPath(tp, folderPath).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (vault.getAbstractFileByPath(current)) continue;
    try {
      await vault.createFolder(current);
    } catch (error) {
      if (!vault.getAbstractFileByPath(current)) throw error;
    }
  }
}

function imageExtension(url, headers) {
  const pathMatch = String(url || "")
    .split(/[?#]/, 1)[0]
    .match(/\.(jpe?g|png|webp)(?=\/|$)/i);
  if (pathMatch) return pathMatch[1].toLocaleLowerCase().replace("jpeg", "jpg");
  const contentType = String(
    headers?.["content-type"] || headers?.["Content-Type"] || "",
  ).toLocaleLowerCase();
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function saveLocalCover(tp, provider, recipe) {
  if (!recipe.coverUrl) return "";
  await ensureFolder(tp, RECIPE_MEDIA_ROOT);
  const providerId = String(recipe.providerRecipeId || "recipe")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "recipe";
  const preliminaryExtension = imageExtension(recipe.coverUrl, {});
  const baseName = `${provider.assetPrefix}-${providerId}-cover`;
  let fileName = `${baseName}.${preliminaryExtension}`;
  let targetPath = normalizeVaultPath(tp, `${RECIPE_MEDIA_ROOT}/${fileName}`);
  if (tp.app.vault.getAbstractFileByPath(targetPath)) return `[[${fileName}]]`;
  const response = await requestBinary(tp, recipe.coverUrl);
  const detectedExtension = imageExtension(recipe.coverUrl, response.headers);
  if (detectedExtension !== preliminaryExtension) {
    fileName = `${baseName}.${detectedExtension}`;
    targetPath = normalizeVaultPath(tp, `${RECIPE_MEDIA_ROOT}/${fileName}`);
  }
  if (!tp.app.vault.getAbstractFileByPath(targetPath)) {
    await tp.app.vault.createBinary(targetPath, response.binary);
  }
  return `[[${fileName}]]`;
}

function activeProviders(settings) {
  const spoonacular = settings.spoonacularKey
    ? makeSpoonacularProvider(settings.spoonacularKey)
    : null;
  const themealdb = makeTheMealDbProvider();
  if (settings.providerPreference === "spoonacular") {
    return spoonacular ? [spoonacular] : [];
  }
  if (settings.providerPreference === "themealdb") return [themealdb];
  return [spoonacular, themealdb].filter(Boolean);
}

module.exports = async function spoonacularRecipe(tp) {
  const Notice = tp?.obsidian?.Notice;
  const notify = (message) => {
    if (typeof Notice === "function") new Notice(message, 9000);
  };
  const currentTitle = String(tp.file.title || "").trim();
  const untitled = !currentTitle || /^Untitled(?: \d+)?$/i.test(currentTitle);
  const fallbackTitle = untitled
    ? `Recipe ${tp.date.now("YYYYMMDD-HHmmss")}`
    : currentTitle;
  const fallback = skeleton(tp, fallbackTitle);
  const renderBlank = async () => {
    if (untitled && fallbackTitle !== currentTitle) {
      try {
        await tp.file.rename(fallbackTitle);
      } catch (error) {}
    }
    return renderRecipe(fallback);
  };

  let settings;
  try {
    settings = await readImporterSettings(tp);
  } catch (error) {
    notify("Could not read recipe configuration. A safe blank template was created.");
    return renderBlank();
  }
  const providers = activeProviders(settings);
  if (!providers.length) {
    notify(
      `recipe_provider is set to Spoonacular but spoonacular_key is missing from ${SETTINGS_PATH}. A blank template was created.`,
    );
    return renderBlank();
  }

  let prompted;
  try {
    const names = providers.map((provider) => provider.label).join(" + ");
    prompted = await tp.system.prompt(
      `Search recipes (${names}; Esc to create a blank template)`,
      untitled ? "" : currentTitle,
    );
  } catch (error) {
    notify("Could not open the recipe search input. A safe blank template was created.");
    return renderBlank();
  }
  if (prompted === null) return renderBlank();
  const query = String(prompted || "").trim() || (untitled ? "" : currentTitle);
  if (!query) return renderBlank();

  const results = [];
  for (const provider of providers) {
    try {
      const providerResults = await provider.search(tp, query);
      results.push(...providerResults.map((result) => ({ ...result, provider })));
    } catch (error) {
      // Provider failures and credentials stay private.
    }
  }
  if (!results.length) {
    notify(`No recipes found for “${query}”. A blank template was created.`);
    return renderBlank();
  }

  const labels = results.map((item) =>
    `[${item.provider.label}] ${item.title} · #${item.id}`);
  let chosen;
  try {
    chosen = await tp.system.suggester(
      labels, results, false, "Choose a recipe and data source",
    );
  } catch (error) {
    notify("Could not open the recipe list. A safe blank template was created.");
    return renderBlank();
  }
  if (!chosen) return renderBlank();

  try {
    const recipe = await chosen.provider.fetch(
      tp, chosen, query, fallbackTitle, tp.date.now("YYYY-MM-DD"),
    );
    try {
      recipe.cover = await saveLocalCover(tp, chosen.provider, recipe);
    } catch (error) {
      recipe.cover = "";
      notify(
        "Recipe data was imported, but the local cover could not be downloaded. You can add a cover later.",
      );
    }
    if (recipe.title !== currentTitle) {
      try {
        await tp.file.rename(recipe.title);
      } catch (error) {
        notify("Recipe metadata was imported, but the note could not be renamed automatically.");
      }
    }
    return renderRecipe(recipe);
  } catch (error) {
    notify(
      `${chosen.provider.label} is unavailable or its rate limit was exceeded. A safe blank template was created.`,
    );
    return renderBlank();
  }
};