const placeContext = tp;
const placeContainer = placeContext.container || this;
const placeRoot = placeContainer.querySelector('[data-role="place-root"]');

if (placeRoot) {
  const placeApp = placeContext.app;
  const placeFile = placeContext.file;
  const placeFrontmatter = placeContext.frontmatter || {};
  const placeDocument = placeContext.activeDocument || placeRoot.ownerDocument;
  const placeWindow = placeDocument.defaultView;
  const bodyContent = String(placeContext.bodyContent || "");
  const q = selector => placeRoot.querySelector(selector);

  const TYPE_INFO = {
    tourist: { label: "Tourist destination", icon: "⌖" },
    restaurant: { label: "Restaurant", icon: "◉" },
    cafe: { label: "Café", icon: "◌" },
    bar: { label: "Bar", icon: "◆" },
    misc: { label: "Saved place", icon: "•" },
  };

  const text = value => value == null ? "" : String(value).trim();
  const bool = value => value === true || String(value).toLowerCase() === "true";
  const type = text(placeFrontmatter.place_type).toLowerCase() || "misc";
  const typeInfo = TYPE_INFO[type] || { label: type.replace(/[_-]+/g, " ") || "Place", icon: "⌖" };
  placeRoot.dataset.placeType = type;

  function setText(role, value) { const element = q(`[data-role="${role}"]`); if (element) element.textContent = value; }
  function resolveImage(value) {
    const raw = text(value); if (!raw) return ""; if (/^https?:\/\//i.test(raw)) return raw;
    const wiki = raw.match(/^!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/); const candidate = text(wiki ? wiki[1] : raw);
    if (!candidate || !placeApp?.metadataCache || !placeFile) return "";
    const target = placeApp.metadataCache.getFirstLinkpathDest(candidate, placeFile.path); if (target) return placeApp.vault.getResourcePath(target);
    const direct = placeApp.vault.getFileByPath?.(candidate); return direct ? placeApp.vault.getResourcePath(direct) : "";
  }
  function formatLocation() { return [placeFrontmatter.city, placeFrontmatter.region, placeFrontmatter.country].map(text).filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).join(" · "); }
  function addChip(label, positive=false) { const list=q('[data-role="hero-chips"]'); if(!list||!label)return; const chip=placeDocument.createElement("span"); chip.className=`cv-place-chip${positive?" is-positive":""}`; chip.textContent=label; list.appendChild(chip); }
  function addMeta(list,label,value){const clean=text(value);if(!list||!clean)return;const row=placeDocument.createElement("div");row.className="cv-place-meta-row";const dt=placeDocument.createElement("dt");const dd=placeDocument.createElement("dd");dt.textContent=label;dd.textContent=clean;row.append(dt,dd);list.appendChild(row);}
  function renderMeta(){
    const locationList=q('[data-role="location-meta"]'); const detailList=q('[data-role="details-meta"]'); locationList?.replaceChildren(); detailList?.replaceChildren();
    addMeta(locationList,"Address",placeFrontmatter.address); addMeta(locationList,"City",placeFrontmatter.city); addMeta(locationList,"Region",placeFrontmatter.region); addMeta(locationList,"Country",placeFrontmatter.country);
    addMeta(detailList,"Type",typeInfo.label); if(type==="restaurant"||type==="cafe"||type==="bar"){addMeta(detailList,"Cuisine",placeFrontmatter.cuisine);addMeta(detailList,"Price",placeFrontmatter.price_level);} addMeta(detailList,"Hours",placeFrontmatter.opening_hours);addMeta(detailList,"Last visit",placeFrontmatter.last_visited);addMeta(detailList,"Phone",placeFrontmatter.phone);addMeta(detailList,"Website",placeFrontmatter.website);
    if(detailList&&!detailList.children.length){const empty=placeDocument.createElement("div");empty.className="cv-place-meta-empty";empty.textContent="No extra details yet.";detailList.appendChild(empty);}
  }
  function paintControls(){
    placeRoot.querySelectorAll("[data-toggle-property]").forEach(button=>{const property=button.dataset.toggleProperty;const active=bool(placeFrontmatter[property]);button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",active?"true":"false");});
  }
  function renderSummary(){
    setText("type-label",typeInfo.label);setText("type-icon",typeInfo.icon);setText("location-line",formatLocation()||"Saved location");setText("hero-address",text(placeFrontmatter.address));setText("coordinates",text(placeFrontmatter.coordinates)||"No coordinates");setText("location-title",text(placeFrontmatter.city)||text(placeFrontmatter.region)||"Saved coordinates");setText("details-title",type==="tourist"?"Destination profile":typeInfo.label);
    const cover=q('[data-role="place-cover"]');const coverSrc=resolveImage(placeFrontmatter.cover);if(cover){cover.hidden=!coverSrc;if(coverSrc){cover.src=coverSrc;cover.alt=`Cover for ${placeFile?.basename||"place"}`;}}
    const chips=q('[data-role="hero-chips"]');chips?.replaceChildren();addChip(typeInfo.label);if(bool(placeFrontmatter.visited))addChip("Visited",true);if(bool(placeFrontmatter.want_to_visit))addChip("Want to visit");if(bool(placeFrontmatter.favorite))addChip("Favorite",true);const rating=Number(placeFrontmatter.rating);if(Number.isFinite(rating)&&rating>0)addChip(`${rating}/10`);
    const website=q('[data-role="website-link"]');const websiteUrl=text(placeFrontmatter.website);if(website){website.hidden=!/^https?:\/\//i.test(websiteUrl);if(!website.hidden)website.href=websiteUrl;}
    const noteRender=q('[data-role="note-render"]');if(noteRender)noteRender.classList.toggle("is-empty",!bodyContent.replace(/[#>*_`\-\s]/g,""));renderMeta();paintControls();
  }
  function setSaveState(message,tone=""){const state=q('[data-role="save-state"]');if(!state)return;state.textContent=message;state.dataset.tone=tone;}
  let frontmatterQueue=Promise.resolve();
  function updateFrontmatter(property,value){if(!placeApp?.fileManager||!placeFile)return Promise.reject(new Error("Place file is unavailable"));const task=frontmatterQueue.then(async()=>{await placeApp.fileManager.processFrontMatter(placeFile,draft=>{draft[property]=value;});placeFrontmatter[property]=value;});frontmatterQueue=task.catch(()=>{});return task;}
  placeRoot.querySelectorAll("[data-toggle-property]").forEach(button=>{button.addEventListener("click",async()=>{const property=button.dataset.toggleProperty;const next=!bool(placeFrontmatter[property]);button.disabled=true;setSaveState("Saving…");try{await updateFrontmatter(property,next);renderSummary();setSaveState("Saved","success");}catch(error){console.error(error);setSaveState("Could not save","error");}finally{button.disabled=false;}});});
  async function openMap(){try{await placeApp.workspace.openLinkText("20_Personal_Life/23_Places/Map.base",placeFile?.path||"",false);}catch(error){console.error(error);setSaveState("Could not open Map Base","error");}}
  placeRoot.querySelectorAll('[data-action="open-map"]').forEach(button=>button.addEventListener("click",()=>void openMap()));
  q('[data-action="directions"]')?.addEventListener("click",()=>{const destination=text(placeFrontmatter.coordinates)||text(placeFrontmatter.address)||formatLocation();if(!destination){setSaveState("Add coordinates or an address first","error");return;}const url=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;placeWindow?.open?.(url,"_blank","noopener,noreferrer");});
  q('[data-action="copy-coordinates"]')?.addEventListener("click",async()=>{const coordinates=text(placeFrontmatter.coordinates);if(!coordinates){setSaveState("No coordinates to copy","error");return;}const clipboard=placeWindow?.navigator?.clipboard;if(!clipboard?.writeText){setSaveState("Clipboard is unavailable","error");return;}try{await clipboard.writeText(coordinates);setSaveState("Coordinates copied","success");}catch(error){console.error(error);setSaveState("Could not copy coordinates","error");}});
  renderSummary();
}
