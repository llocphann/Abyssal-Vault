# Places

The Places subsystem stores travel locations and food/drink venues as Markdown records that can be reused by Bases, the Places Custom View, the Homepage Globe, the vector-map overlay, and the weather runtime.

## Place record schema

Place records are created with `Place_Template.md` and can represent `tourist`, `misc`, `restaurant`, `cafe`, or `bar` locations.

### Functions

- **`place_type`** — determines semantic type, icon, and visual treatment.
- **`coordinates`** — provides latitude and longitude to map, Globe, and weather systems.
- **`address`** — stores a human-readable address.
- **`city`** — stores city-level location.
- **`region`** — stores state/province/region.
- **`country`** — stores country.
- **`visited`** — tracks whether the place has been visited.
- **`want_to_visit`** — tracks wishlist state.
- **`favorite`** — marks important locations.
- **`rating`** — stores a personal rating.
- **`last_visited`** — stores the most recent visit date.
- **`cover`** — supplies imagery for cards and media views.
- **`website`** — stores the official website.
- **`phone`** — stores a contact number.
- **`opening_hours`** — stores opening-hour information.
- **`cuisine`** — stores cuisine for food-related places.
- **`price_level`** — stores a price category.
- **`created`** — stores record creation date.
- **Why remember** — records why the location matters.
- **Notes** — stores free-form observations.

## Folder-based type detection

`Place_Template.md` infers type from the destination folder:

- `20_Personal_Life/23_Places/Tourist` → `tourist`
- `20_Personal_Life/23_Places/Misc` → `misc`
- `20_Personal_Life/26_Food_&_Drinks/Restaurants` → `restaurant`
- `20_Personal_Life/26_Food_&_Drinks/Cafes` → `cafe`
- `20_Personal_Life/26_Food_&_Drinks/Bars` → `bar`

## Sample record

`20_Personal_Life/23_Places/Tourist/Sample - Bãi Bàng - Hòn Sơn.md` demonstrates the expected schema for a tourist record.

## `Map.base`

### Functions

- **Unified scope** — combines travel places and food/drink venues.
- **Type filtering** — accepts only the supported place types.
- **Dynamic marker icon** — selects icons by place type.
- **Dynamic marker color** — selects colors by place type.
- **Cover rendering** — exposes local/linked images in card-style views.
- **Weather placeholders** — provides fields used by the weather runtime.
- **Visit-state display** — distinguishes Visited, Wishlisted, and Saved records.
- **Google Maps link** — creates a map link from coordinates.
- **Abyssal Map** — uses the Abyssal map style.
- **Standard Map** — uses OpenFreeMap Liberty as an alternative style.
- **All Places** — lists all valid place records.
- **Want to visit** — filters wishlist records.
- **Visited** — filters visited records.

## Food & Drinks `Places.base`

The separate Base under `26_Food_&_Drinks` focuses specifically on Restaurants, Cafes, and Bars.

- **All** — displays every food/drink place.
- **Restaurants** — filters restaurants.
- **Cafes** — filters cafes.
- **Bars** — filters bars.
- **Cuisine** — exposes cuisine metadata.
- **Visit metadata** — exposes visited, wishlist, favorite, and rating state.
- **Price level** — exposes pricing.
- **Google Maps** — generates location links.

## Reuse model

```text
Place note
   ├── Map.base
   ├── Food & Drinks Places.base
   ├── Places Custom View
   ├── Homepage Globe
   ├── Vector Map Overlay
   └── Weather runtime
```

The Place note is the canonical record. Every map or visual layer is derived from it.