(() => {
  const editContext = tp;
  const editContainer = editContext.container || this;
  const root = editContainer.querySelector('[data-role="place-root"]');
  if (!root) return;

  const app = editContext.app;
  const file = editContext.file;
  const frontmatter = editContext.frontmatter || {};
  const doc = editContext.activeDocument || root.ownerDocument;
  const q = selector => root.querySelector(selector);
  const text = value => value == null ? "" : String(value).trim();
  const bool = value => value === true || String(value).toLowerCase() === "true";

  const TYPE_INFO = { tourist:{label:"Tourist destination",icon:"⌖"}, restaurant:{label:"Restaurant",icon:"◉"}, cafe:{label:"Café",icon:"◌"}, bar:{label:"Bar",icon:"◆"}, misc:{label:"Saved place",icon:"•"} };
  const LOCATION_FIELDS = [
    {label:"Coordinates",property:"coordinates",placeholder:"latitude, longitude"},{label:"Address",property:"address",placeholder:"Add address"},{label:"City",property:"city",placeholder:"Add city"},{label:"Region",property:"region",placeholder:"Add region"},{label:"Country",property:"country",placeholder:"Add country"}
  ];
  const DETAIL_FIELDS = [
    {label:"Type",property:"place_type",control:"select",options:[["tourist","Tourist destination"],["misc","Saved place"],["restaurant","Restaurant"],["cafe","Café"],["bar","Bar"]]},
    {label:"Cuisine",property:"cuisine",placeholder:"Add cuisine",foodOnly:true},{label:"Price",property:"price_level",placeholder:"Add price level",foodOnly:true},{label:"Hours",property:"opening_hours",placeholder:"Add opening hours"},{label:"Last visit",property:"last_visited",placeholder:"Add date",inputType:"date"},{label:"Phone",property:"phone",placeholder:"Add phone",inputType:"tel"},{label:"Website",property:"website",placeholder:"Add website",inputType:"url"}
  ];

  let frontmatterQueue = Promise.resolve();
  function updateFrontmatter(property,value){if(!app?.fileManager||!file)return Promise.reject(new Error("Place file is unavailable"));const task=frontmatterQueue.then(async()=>{await app.fileManager.processFrontMatter(file,draft=>{draft[property]=value;});frontmatter[property]=value;});frontmatterQueue=task.catch(()=>{});return task;}
  function setState(message,tone=""){const state=q('[data-role="save-state"]');if(!state)return;state.textContent=message;state.dataset.tone=tone;}
  function currentType(){const candidate=text(frontmatter.place_type).toLowerCase();return TYPE_INFO[candidate]?candidate:"misc";}
  function typeInfo(){return TYPE_INFO[currentType()];}
  function setText(role,value){const element=q(`[data-role="${role}"]`);if(element)element.textContent=value;}
  function addChip(host,label,positive=false){if(!host||!label)return;const chip=doc.createElement("span");chip.className=`cv-place-chip${positive?" is-positive":""}`;chip.textContent=label;host.appendChild(chip);}
  function refreshDerivedUi(){const info=typeInfo();root.dataset.placeType=currentType();setText("type-label",info.label);setText("type-icon",info.icon);setText("details-title",currentType()==="tourist"?"Destination profile":info.label);const location=[frontmatter.city,frontmatter.region,frontmatter.country].map(text).filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).join(" · ");setText("location-line",location||"Saved location");setText("location-title",text(frontmatter.city)||text(frontmatter.region)||"Saved coordinates");setText("hero-address",text(frontmatter.address));setText("coordinates",text(frontmatter.coordinates)||"No coordinates");const website=q('[data-role="website-link"]');const websiteUrl=text(frontmatter.website);if(website){website.hidden=!/^https?:\/\//i.test(websiteUrl);if(!website.hidden)website.href=websiteUrl;}const chips=q('[data-role="hero-chips"]');if(chips){chips.replaceChildren();addChip(chips,info.label);if(bool(frontmatter.visited))addChip(chips,"Visited",true);if(bool(frontmatter.want_to_visit))addChip(chips,"Want to visit");if(bool(frontmatter.favorite))addChip(chips,"Favorite",true);const rating=Number(frontmatter.rating);if(Number.isFinite(rating)&&rating>0)addChip(chips,`${rating}/10`);}}
  function displayValue(field){const value=frontmatter[field.property];if(field.property==="place_type")return typeInfo().label;return text(value);}
  function normalizeValue(field,raw){const value=text(raw);if(field.property==="place_type")return TYPE_INFO[value]?value:"misc";if(field.inputType==="date")return value||null;return value;}
  function makeEditor(row,detail,field,button){if(row.classList.contains("is-editing"))return;row.classList.add("is-editing");button.hidden=true;const original=frontmatter[field.property];const editor=field.control==="select"?doc.createElement("select"):doc.createElement("input");editor.className=field.control==="select"?"cv-place-meta-select":"cv-place-meta-input";editor.dataset.property=field.property;if(field.control==="select"){for(const [value,label] of field.options||[]){const option=doc.createElement("option");option.value=value;option.textContent=label;editor.appendChild(option);}editor.value=currentType();}else{editor.type=field.inputType||"text";editor.value=text(original);editor.placeholder=field.placeholder||"";editor.autocomplete="off";editor.spellcheck=false;}detail.appendChild(editor);editor.focus();let finished=false;const finish=async save=>{if(finished)return;finished=true;const next=normalizeValue(field,editor.value);if(!save||String(next??"")===String(original??"")){buildAll();return;}editor.disabled=true;setState("Saving…");try{await updateFrontmatter(field.property,next);refreshDerivedUi();buildAll();setState("Saved","success");}catch(error){console.error("[custom-view:places] Could not save metadata",error);buildAll();setState("Could not save","error");}};editor.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();void finish(false);}else if(event.key==="Enter"&&!(event.shiftKey||event.ctrlKey||event.metaKey)){event.preventDefault();void finish(true);}});editor.addEventListener("blur",()=>void finish(true));if(field.control==="select")editor.addEventListener("change",()=>void finish(true));}
  function makeRow(field,editable=true){const row=doc.createElement("div");row.className="cv-place-meta-row";row.dataset.property=field.property;const term=doc.createElement("dt");term.textContent=field.label;const detail=doc.createElement("dd");row.append(term,detail);const value=displayValue(field);if(!editable){detail.textContent=value||"—";return row;}const button=doc.createElement("button");button.type="button";button.className=`cv-place-meta-edit${value?"":" is-empty"}`;button.dataset.property=field.property;button.textContent=value||field.placeholder||"Add value";button.addEventListener("click",()=>makeEditor(row,detail,field,button));detail.appendChild(button);return row;}
  function rebuildList(role,fields){const list=q(`[data-role="${role}"]`);if(!list)return;list.replaceChildren();const type=currentType();const isFood=type==="restaurant"||type==="cafe"||type==="bar";for(const field of fields){if(field.foodOnly&&!isFood)continue;list.appendChild(makeRow(field,true));}}
  const locationList=q('[data-role="location-meta"]');const detailsList=q('[data-role="details-meta"]');let observer=null;
  function observeLists(){if(!observer){observer=new MutationObserver(()=>{observer.disconnect();refreshDerivedUi();rebuildList("location-meta",LOCATION_FIELDS);rebuildList("details-meta",DETAIL_FIELDS);observeLists();});}if(locationList)observer.observe(locationList,{childList:true});if(detailsList)observer.observe(detailsList,{childList:true});}
  function buildAll(){observer?.disconnect();refreshDerivedUi();rebuildList("location-meta",LOCATION_FIELDS);rebuildList("details-meta",DETAIL_FIELDS);observeLists();}
  buildAll();
})();
