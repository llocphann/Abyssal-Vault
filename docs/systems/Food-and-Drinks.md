# Food & Drinks

`20_Personal_Life/26_Food_&_Drinks` combines a recipe database with Restaurants, Cafes, and Bars that also participate in the wider Places system.

## Recipe records

Current recipe records include examples such as `Asian Beef.md`, `Beef pho.md`, `Chicken Ranch Burgers.md`, `Chipotle Chicken Soup.md`, `Lamb Moussaka.md`, `Lemon Baked Fish.md`, and `Vietnamese Banh Mi.md`.

### Functions of a Recipe note

- **`category`** — classifies the recipe.
- **`cuisine`** — stores cuisine origin.
- **`tagline`** — provides a short subtitle.
- **`cover`** — points to a local food image.
- **`recipe_illustration`** — selects a decorative visual motif.
- **`description`** — stores a short recipe description.
- **`servings`** — stores serving count.
- **`prep_time`** — stores preparation time.
- **`cook_time`** — stores cooking time.
- **`difficulty`** — stores or derives Easy, Medium, or Hard.
- **`favorite`** — marks favorite recipes.
- **`bookmarked`** — marks recipes for later use.
- **`ingredients`** — stores structured ingredients.
- **`instructions`** — stores cooking steps.
- **`tips`** — stores additional advice.
- **`pairs_well_with`** — stores recommended pairings.
- **Provider metadata** — records recipe provider and provider IDs.
- **Source metadata** — preserves source name and URL.
- **Personal Notes** — stores user-specific changes and observations.

## `Recipe_Template.md`

The template is intentionally lightweight and delegates record generation to `tp.user.spoonacular_recipe(tp)`.

## `spoonacular_recipe.js`

- **Provider abstraction** — supports Auto, Spoonacular, and TheMealDB.
- **Schema normalization** — converts provider-specific responses into one common Recipe schema.
- **HTML cleanup** — removes unwanted markup and entities.
- **Time derivation** — imports or derives preparation/cooking time.
- **Difficulty derivation** — estimates complexity from time, ingredient count, and instruction structure.
- **Category derivation** — derives a useful recipe category when needed.
- **Illustration selection** — chooses a semantic recipe illustration key.
- **Local media** — downloads recipe images into `90_System/95_Media_Assets/Recipes`.

## `FoodnDrinks.base`

### Functions

- **Recipe discovery** — filters records categorized as Recipes.
- **Total time** — calculates `prep_time + cook_time`.
- **Recipe front card** — displays category, favorite state, time, title, tagline, servings, difficulty, and bookmark state.
- **Recipe back card** — displays ingredients in a scrollable area.
- **Recipes view** — provides the card collection.
- **Edit Data** — provides an editable metadata table.

## Food & Drinks `Places.base`

The place-oriented Base covers Restaurants, Cafes, and Bars.

- **All** — displays all supported venues.
- **Restaurants** — filters restaurant records.
- **Cafes** — filters cafe records.
- **Bars** — filters bar records.
- **Cuisine** — exposes cuisine metadata.
- **Visited / Want to visit / Favorite** — exposes personal place state.
- **Rating / Price level** — exposes evaluation and cost.
- **Google Maps** — generates map links from coordinates.

These venue records also feed the global Places Map and Homepage Globe.