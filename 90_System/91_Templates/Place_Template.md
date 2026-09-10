<%*
const placeFolder = tp.file.folder(true);
const placeTypeRules = [
  ["20_Personal_Life/23_Places/Tourist", "tourist"],
  ["20_Personal_Life/23_Places/Misc", "misc"],
  ["20_Personal_Life/26_Food_&_Drinks/Restaurants", "restaurant"],
  ["20_Personal_Life/26_Food_&_Drinks/Cafes", "cafe"],
  ["20_Personal_Life/26_Food_&_Drinks/Bars", "bar"],
];
const placeType = placeTypeRules.find(([path]) => placeFolder === path || placeFolder.startsWith(`${path}/`))?.[1] ?? "";
-%>
---
place_type: "<% placeType %>"
coordinates: ""
address: ""
city: ""
region: ""
country: ""
visited: false
want_to_visit: true
favorite: false
rating:
last_visited:
cover: ""
website: ""
phone: ""
opening_hours: ""
cuisine: ""
price_level: ""
created: <% tp.date.now("YYYY-MM-DD") %>
---

<!-- Coordinates use "latitude, longitude". In Map view, right-click a location and choose Copy coordinates. -->

## Why remember

## Notes
