import { tagValue as tag, numberTag, normalizeRotation, parseElementDocument, parseElementIndex, parseMapDocument } from "../js/markdown.js?v=2";
const editor = document.querySelector("#markdown");
const toast = document.querySelector("#toast");
const mapStudio = document.querySelector("#map-studio");
const mapCanvas = document.querySelector("#map-canvas");
const mapInspector = document.querySelector("#map-inspector");
const elementLibrary = document.querySelector("#element-library");
const deleteModal = document.querySelector("#delete-element-modal");
const leaveFileModal = document.querySelector("#leave-file-modal");
const saveIndicator = document.querySelector("#save-indicator");
const pushIndicator = document.querySelector("#push-indicator");
const publishButton = document.querySelector("#publish");
const githubUser = document.querySelector("#github-user");

let current = "";
let modules = {};
let historyStates = [];
let historyIndex = -1;
let historyTimer = null;
let sourceHeader = "";
let elements = [];
let placements = [];
let catalog = {};
let activeElementId = "";
let selectedLibraryId = "";
let activePlacementId = "";
let selectedPartIds = new Set();
let activePartId = "";
let activeTool = "select";
let pendingElementDelete = "";
let loadedSource = "";
let isDirty = false;
let pendingNavigation = null;
let cleanStateLabel = "LOADED FROM GITHUB";
let currentBaseSha = null;
let currentDraftVersion = null;
let remoteConflict = false;
let elementIndexState = null;
let elementFileStates = new Map();

const activityStorageKey = "what-if-writer-activity-v1";
let activity = {};
try { activity = JSON.parse(localStorage.getItem(activityStorageKey) || "{}"); } catch { activity = {}; }

const shapeLabels = { line: "Line", rect: "Rectangle", circle: "Circle", text: "Text", triangle: "Triangle", dot: "Dot", smoke: "Smoke" };
const shapeStyles = {
  line: [["pure", "Pure"], ["muted", "Muted"], ["vertical-muted", "Vertical muted"], ["slanted", "Slanted"]],
  rect: [["pure", "Pure"], ["muted", "Muted"]],
  circle: [["pure", "Pure"], ["muted", "Muted"]],
  text: [["pure", "Pure"]],
  triangle: [["pure", "Pure"]],
  dot: [["pure", "Pure"]],
  smoke: [["pure", "Pure"], ["animated", "Animated"]]
};

function normalizeShape(shape = "rect", style = "") {
  const legacy = {
    hline: ["line", "pure"],
    "hline-muted": ["line", "muted"],
    "vline-muted": ["line", "vertical-muted"],
    "rect-muted": ["rect", "muted"]
  }[shape];
  if (legacy) return { shape: legacy[0], style: style || legacy[1] };
  const canonical = shapeLabels[shape] ? shape : "rect";
  const options = shapeStyles[canonical] || [["pure", "Pure"]];
  const fallback = shape === "smoke" && !style ? "animated" : "pure";
  return { shape: canonical, style: options.some(([value]) => value === style) ? style : fallback };
}

function makeLegend(title, items, note = "") {
  const tools = items.map(([insert, label, help = "", kind = ""]) => `<button type="button" class="tag${kind ? ` ${kind}` : ""}" data-insert="${escapeHtml(insert)}"><code>${escapeHtml(insert)}</code><span class="tag-copy"><b>${escapeHtml(label)}</b>${help ? `<small>${escapeHtml(help)}</small>` : ""}</span></button>`).join("");
  return `<p class="kicker">${escapeHtml(title)}</p><div class="tag-tools">${tools}</div>${note ? `<p class="rules">${escapeHtml(note)}</p>` : ""}`;
}

const editorTypes = {
  story: {
    legend: makeLegend("PROLOGUE TAGS", [["---", "NEW SCENE"], ["[THOUGHT]", "YOU WRITE", "WHAT IF is automatic.", "thought"], ["[NARRATION]", "LIFE HAPPENS", "Italic and automatic.", "narration"], ["## TEXT", "SCREEN COPY"], ["[ACTION] check phone", "PAUSE HERE"], ["[UNLOCK] scroll", "PERMANENT ACTION", "Must match Actions.", "unlock"]]),
    counts: source => [["SCENES", /^---$/gm], ["ACTIONS", /^\[ACTION\]/gm], ["UNLOCKS", /^\[UNLOCK\]/gm]]
  },
  gauges: {
    legend: makeLegend("PROLOGUE GAUGES", [["[IDEA BASE] 2", "BASE IDEA GAIN"], ["[IDEA MINIMUM GAIN] 9", "MINIMUM IDEA GAIN"], ["---", "NEW GAUGE"], ["[GAUGE] creativity", "GAUGE ID"], ["[LABEL] CREATIVITY", "INTERFACE LABEL"], ["[COLOR] yellow", "THEME TOKEN"], ["[START] 48", "INITIAL VALUE"], ["[DRIFT] -0.025", "CHANGE / SECOND"], ["[TRY MINIMUM] 12", "REQUIRED VALUE"], ["[TRY COST] -12", "COST / DIRECTION"], ["[IDEA SOURCE] +0.14", "DIRECT IDEA SOURCE"], ["[IDEA BOOST] +0.006", "SPEED BOOST"], ["## PURPOSE", "HUMAN DESCRIPTION"]]),
    counts: source => [["GAUGES", /^\[GAUGE\]/gm], ["RULES", /^\[(?:START|DRIFT|TRY MINIMUM|TRY COST|IDEA SOURCE|IDEA BOOST)\]/gm]]
  },
  brief: {
    legend: makeLegend("BRIEF TAGS", [["## VISIBLE ACTIONS", "MODULE ACTION MENU"], ["- cigarette", "VISIBLE ACTION", "Must match Actions."], ["[BRIEF]", "MODULE START"], ["[LABEL] BRIEF", "SMALL LABEL"], ["[PREFIX] WHAT IF...", "THOUGHT PREFIX"], ["[PROMPT] waiting felt useful?", "PLAYER THOUGHT"], ["[ACTION] try a direction", "IDEA BUTTON"], ["[METER] IDEA", "GAUGE NAME"], ["[COMPLETE] there it is.", "COMPLETION COPY"], ["[SEND] send it", "FINAL BUTTON"], ["[TARGET] 100", "OBJECTIVE VALUE"], ["[MISSING creativity] Creativity is missing.", "RESOURCE HINT"], ["[LOG START] Find a direction for the brief.", "EVENT LOG COPY"], ["[MAIL] Hey, / / is it still ok for later?", "INBOX COPY"], ["[AFTER TEXT] one thought survived.", "AFTER-BRIEF COPY"], ["[NEXT] enter the office", "NEXT BUTTON"]]),
    counts: source => [["FIELDS", /^\[(?:LABEL|PREFIX|PROMPT|ACTION|METER|COMPLETE|SEND)\]/gm], ["VISIBLE ACTIONS", /^\s*-\s+.+$/gm]]
  },
  actions: {
    legend: makeLegend("ACTION TAGS", [["---", "NEW ACTION"], ["[ACTION] cigarette", "ERA ACTION", "Unlocks refer to this name.", "unlock"], ["[COOLDOWN] 20", "WAIT TIME"], ["[EFFECT] stress -5", "GAUGE CHANGE"], ["[REVEAL] stress", "DISCOVER GAUGE"], ["[REQUIRES] stress >= 10", "AVAILABILITY RULE"], ["[MOVE] cigarette-1", "PLAYER ANCHOR", "Uses that instance's element anchor."], ["[PROP] coffee", "ACTIVE ELEMENT", "Lasts for the full cooldown."], ["[ANIMATION] smoke", "ACTIVE ANIMATION", "Lasts for the full cooldown."], ["[CHANCE] 0.1", "LUCKY CHANCE"], ["[LUCKY EFFECT] creativity +19", "LUCKY GAUGE CHANGE"], ["## NOTE", "MESSAGE POOL", "One option per dash line.", "narration"], ["## LUCKY NOTE", "LUCKY MESSAGE POOL", "One option per dash line.", "narration"]], "MOVE uses the editable Element anchor after Map rotation. Attached props follow later movements until their own cooldown ends."),
    counts: source => [["ACTIONS", /^\[ACTION\]/gm], ["EFFECTS", /^\[(?:EFFECT|LUCKY EFFECT)\]/gm], ["MESSAGES", /^\s*-\s+.+$/gm]]
  },
  events: {
    legend: makeLegend("EVENT TAGS", [["---", "NEW EVENT"], ["[EVENT] event title", "INTERNAL TITLE"], ["## TEXT", "WHAT HAPPENS", "Automatic narration.", "narration"], ["## CHOICE", "NEW CHOICE"], ["[CHOICE] open the window", "CONTEXT BUTTON"], ["[EFFECT] stress -4", "CONSEQUENCE"], ["[UNLOCK] take a walk", "PERMANENT ACTION", "Must match Actions.", "unlock"], ["## RESULT", "RESULT COPY", "Automatic after choice.", "narration"]]),
    counts: source => [["EVENTS", /^\[EVENT\]/gm], ["CHOICES", /^\[CHOICE\]/gm], ["EFFECTS", /^\[EFFECT\]/gm]]
  },
  elements: {
    legend: makeLegend("ELEMENT TAGS", [["[FILE] elements/prologue/bed.md", "LIBRARY ENTRY", "Managed automatically."], ["[ELEMENT] bed", "ONE ELEMENT FILE"], ["[WIDTH] 118", "CANVAS / PART WIDTH"], ["[HEIGHT] 62", "CANVAS / PART HEIGHT"], ["[ANCHOR X] 0", "MOVE ANCHOR X"], ["[ANCHOR Y] 0", "MOVE ANCHOR Y"], ["[SHOW] coffee", "ACTIVE WITH PROP"], ["[ATTACH] player", "FOLLOW PLAYER", "Keeps Map-relative spacing."], ["[PART] pillow", "NEW LAYER", "Maximum five."], ["[SHAPE] rect", "FIXED GEOMETRY"], ["[STYLE] pure", "VISUAL EFFECT", "Pure is the default."], ["[X] 0", "LAYER X"], ["[Y] 0", "LAYER Y"], ["[TEXT] ○", "TEXT CONTENT"]], "Each library object is stored in its own file. The editor keeps the index in sync."),
    counts: source => [["ELEMENTS", /^\[ELEMENT\]/gm], ["LAYERS", /^\[PART\]/gm], ["ACTION LINKS", /^\[(?:SHOW|ATTACH)\]/gm]]
  },
  map: {
    legend: makeLegend("MAP TAGS", [["[MAP WIDTH] 280", "MAP WIDTH"], ["[MAP HEIGHT] 360", "MAP HEIGHT"], ["[POSITION] window 177 10", "NAMED PLAYER ANCHOR"], ["---", "NEW PLACEMENT"], ["[PLACE] desk", "ELEMENT TO PLACE"], ["[INSTANCE] desk-1", "UNIQUE COPY / ANCHOR", "Actions target it with MOVE."], ["[X] 46", "INSTANCE X"], ["[Y] 44", "INSTANCE Y"], ["[ROTATION] 45", "INSTANCE ROTATION", "Always 0°–359°."]], "Instances are the shared coordinates used by the Map editor and the game."),
    counts: source => [["PLACED", /^\[PLACE\]/gm], ["POSITIONS", /^\[POSITION\]/gm]]
  }
};

function currentEditor() { return modules[current]?.editor || "text"; }

function configureModules(manifest) {
  modules = {};
  (manifest.globals || []).forEach(module => {
    const key = `global:${module.id}`;
    modules[key] = { ...(editorTypes[module.editor] || {}), ...module, era:"global", key };
  });
  manifest.eras.forEach(era => era.modules.forEach(module => {
    const key = `${era.id}:${module.id}`;
    modules[key] = { ...(editorTypes[module.editor] || {}), ...module, era:era.id, key };
  }));
  const activeEra = manifest.eras.find(era=>era.status==="active") || manifest.eras[0];
  const preferred = activeEra?.modules.find(module=>module.id==="story") || activeEra?.modules[0];
  current = preferred ? `${activeEra.id}:${preferred.id}` : Object.keys(modules)[0] || "";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function parseElementCatalog(source) {
  return parseElementDocument(source,{normalizeVisual:normalizeShape,defaultWidth:100,defaultHeight:70});
}

function parseCurrentSource() {
  selectedPartIds.clear();
  activePartId = "";
  if (currentEditor() === "elements") {
    const parsed = parseElementCatalog(editor.value);
    sourceHeader = parsed.header;
    elements = parsed.elements;
    if (!elements.some(item => item.id === activeElementId)) activeElementId = elements[0]?.id || "";
    selectedLibraryId = activeElementId;
    return;
  }
  const parsed = parseMapDocument(editor.value);
  sourceHeader = parsed.header;
  placements = parsed.placements;
  if (!placements.some(item => item.instance === activePlacementId)) activePlacementId = placements[0]?.instance || "";
  if (selectedLibraryId && !catalog[selectedLibraryId]) selectedLibraryId = "";
}

function serializePart(part) {
  return [
    `[PART] ${part.id}`,
    `[SHAPE] ${part.shape}`,
    `[STYLE] ${part.style || "pure"}`,
    `[X] ${Math.round(part.x)}`,
    `[Y] ${Math.round(part.y)}`,
    part.width ? `[WIDTH] ${Math.round(part.width)}` : "",
    part.height ? `[HEIGHT] ${Math.round(part.height)}` : "",
    part.text ? `[TEXT] ${part.text}` : ""
  ].filter(Boolean).join("\n");
}

function serializeElementBlock(item) {
  return [
    `# ELEMENT / ${item.id}`,
    "",
    `[ELEMENT] ${item.id}`,
    `[WIDTH] ${Math.round(item.width)}`,
    `[HEIGHT] ${Math.round(item.height)}`,
    `[ANCHOR X] ${Math.round(item.anchorX || 0)}`,
    `[ANCHOR Y] ${Math.round(item.anchorY || 0)}`,
    item.show ? `[SHOW] ${item.show}` : "",
    item.attach ? `[ATTACH] ${item.attach}` : "",
    ...item.parts.map(serializePart)
  ].filter(value => value !== "").join("\n");
}

function serializeCurrentSource() {
  let blocks;
  if (currentEditor() === "elements") {
    blocks = elements.map(serializeElementBlock);
  } else {
    blocks = placements.map(item => [
      `[PLACE] ${item.id}`,
      `[INSTANCE] ${item.instance}`,
      `[X] ${Math.round(item.x)}`,
      `[Y] ${Math.round(item.y)}`,
      `[ROTATION] ${normalizeRotation(item.rotation)}`
    ].join("\n"));
  }
  editor.value = (currentEditor() === "elements" ? blocks : [sourceHeader, ...blocks])
    .filter(Boolean).join("\n\n---\n").trim() + "\n";
}

function activeElement() {
  return elements.find(item => item.id === activeElementId);
}

function activePlacement() {
  return placements.find(item => item.instance === activePlacementId);
}

function partBounds(part) {
  const width = part.width || (part.shape === "dot" ? 7 : part.shape === "triangle" ? 15 : part.shape === "text" || part.shape === "smoke" ? 18 : 20);
  const height = part.height || (part.shape === "dot" ? 7 : part.shape === "triangle" ? 14 : part.shape === "text" || part.shape === "smoke" ? 20 : 2);
  return { x: part.x, y: part.y, width, height };
}

function handles(part) {
  if (activeTool !== "resize" || activePartId !== part.id || selectedPartIds.size !== 1) return "";
  return ["nw", "ne", "se", "sw"].map(corner => `<i class="resize-handle ${corner}" data-resize="${corner}" title="Resize ${corner.toUpperCase()}"></i>`).join("");
}

function drawPart(part, parent = "") {
  const selected = selectedPartIds.has(part.id);
  const safeText = escapeHtml(part.text);
  return `<span class="studio-element ${escapeHtml(part.shape)} style-${escapeHtml(part.style || "pure")}${selected ? " selected" : ""}" data-part-id="${escapeHtml(part.id)}"${parent ? ` data-map-id="${escapeHtml(parent)}"` : ""} style="left:${part.x}px;top:${part.y}px;${part.width ? `width:${part.width}px;` : ""}${part.height ? `height:${part.height}px;` : ""}">${safeText}${parent ? "" : handles(part)}</span>`;
}

function renderLibrary() {
  if (currentEditor() === "elements") {
    elementLibrary.innerHTML = elements.map(item => `<div class="library-row${item.id === activeElementId ? " active" : ""}"><button type="button" data-library-id="${escapeHtml(item.id)}">${escapeHtml(item.id)}</button><button type="button" class="library-remove" data-remove-element="${escapeHtml(item.id)}" title="Delete ${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.id)}">×</button></div>`).join("");
  } else {
    elementLibrary.innerHTML = Object.values(catalog).map(item => `<div class="library-row"><button type="button" class="library-direct-place" data-place-element="${escapeHtml(item.id)}" title="Place ${escapeHtml(item.id)}"><span>+</span>${escapeHtml(item.id)}</button></div>`).join("");
  }
}

function layerList(item) {
  return `<section class="layers"><div><p class="kicker">LAYERS · ${item.parts.length}/5</p></div>${item.parts.map((part, index) => `<div class="layer-row${selectedPartIds.has(part.id) ? " active" : ""}"><button type="button" data-layer-id="${escapeHtml(part.id)}"><span>${index + 1}</span>${escapeHtml(part.id)}<small>${escapeHtml(part.shape)}</small></button><button type="button" class="layer-remove" data-remove-layer="${escapeHtml(part.id)}" title="Delete ${escapeHtml(part.id)}" aria-label="Delete ${escapeHtml(part.id)}">×</button></div>`).join("") || `<small>NO SHAPES YET</small>`}</section>`;
}

function mapLayerList() {
  return `<section class="map-layers"><p class="kicker">MAP LAYERS · ${placements.length}</p>${placements.map((item, index) => `<button type="button" class="map-layer-row" data-map-layer="${escapeHtml(item.instance)}"><span>${index + 1}</span><b>${escapeHtml(item.id)}</b><small>${escapeHtml(item.instance)}</small></button>`).join("") || `<small>NO ELEMENTS ON MAP</small>`}</section>`;
}

function renderInspector() {
  if (currentEditor() === "map") {
    const item = activePlacement();
    mapInspector.innerHTML = item ? `<p class="kicker">PLACED COPY</p><b>${escapeHtml(item.id)}</b><label>INSTANCE<input name="instance" value="${escapeHtml(item.instance)}"></label><div class="inspector-grid"><label>X<input name="x" type="number" value="${item.x}"></label><label>Y<input name="y" type="number" value="${item.y}"></label></div><label>ROTATION (°)<input name="rotation" type="number" min="0" max="359" step="45" value="${normalizeRotation(item.rotation)}"></label>` : mapLayerList();
    return;
  }
  const item = activeElement();
  if (!item) {
    mapInspector.innerHTML = `<p class="kicker">CREATE AN ELEMENT</p><p class="inspector-help">An element is a reusable object made from up to five shapes.</p>`;
    return;
  }
  const chosen = item.parts.find(part => part.id === activePartId);
  const metadata = `<p class="kicker">ELEMENT</p><label>NAME<input name="id" value="${escapeHtml(item.id)}"></label><div class="inspector-grid"><label>CANVAS WIDTH<input name="element-width" type="number" min="20" value="${item.width}"></label><label>CANVAS HEIGHT<input name="element-height" type="number" min="20" value="${item.height}"></label></div><section class="anchor-fields"><p class="kicker">MOVE ANCHOR</p><div class="inspector-grid"><label>X<input name="anchor-x" type="number" value="${item.anchorX || 0}"></label><label>Y<input name="anchor-y" type="number" value="${item.anchorY || 0}"></label></div><p class="inspector-help">Drag the anchor point in the canvas. Layers stay still.</p></section><label>SHOW WHEN<input name="show" value="${escapeHtml(item.show)}"></label><label>ATTACH TO<input name="attach" value="${escapeHtml(item.attach)}"></label>`;
  let selection = "";
  if (selectedPartIds.size > 1) {
    selection = `<section class="selection-summary"><p class="kicker">SELECTION</p><b>${selectedPartIds.size} LAYERS SELECTED</b><p>Use Move to drag them together, or Delete Selected to remove them.</p></section>`;
  } else if (chosen) {
    const effects = shapeStyles[chosen.shape] || [["pure", "Pure"]];
    const sizeFields = chosen.shape === "circle" ? `<label>DIAMETER<input name="diameter" type="number" min="1" value="${chosen.width || chosen.height || ""}"></label>` : `<div class="inspector-grid"><label>WIDTH<input name="width" type="number" min="1" value="${chosen.width || ""}"></label><label>HEIGHT<input name="height" type="number" min="1" value="${chosen.height || ""}"></label></div>`;
    selection = `<section class="shape-fields"><p class="kicker">SELECTED SHAPE</p><label>NAME<input name="part-id" value="${escapeHtml(chosen.id)}"></label><label>TYPE<span class="fixed-type">${escapeHtml(shapeLabels[chosen.shape] || chosen.shape)}</span></label><label>EFFECT<select name="style"${effects.length === 1 ? " disabled" : ""}>${effects.map(([value, label]) => `<option value="${value}"${value === chosen.style ? " selected" : ""}>${label}</option>`).join("")}</select></label><div class="inspector-grid"><label>X<input name="x" type="number" value="${chosen.x}"></label><label>Y<input name="y" type="number" value="${chosen.y}"></label></div>${sizeFields}<p class="inspector-help">Hold Shift while resizing to keep proportions.</p><label>TEXT<input name="text" value="${escapeHtml(chosen.text)}"></label></section>`;
  }
  mapInspector.innerHTML = metadata + layerList(item) + selection;
}

function renderCanvas() {
  document.querySelectorAll("[data-tool]").forEach(button => button.classList.toggle("active", button.dataset.tool === activeTool));
  document.querySelector("#map-rotate").hidden = currentEditor() !== "map" || !activePlacementId;
  if (currentEditor() === "elements") {
    const item = activeElement();
    mapCanvas.style.width = `${item?.width || 160}px`;
    mapCanvas.style.height = `${item?.height || 120}px`;
    mapCanvas.dataset.tool = activeTool;
    mapCanvas.innerHTML = (item?.parts || []).map(part => drawPart(part)).join("") + (item ? `<button type="button" class="element-anchor" data-element-anchor style="left:${item.anchorX || 0}px;top:${item.anchorY || 0}px" title="MOVE anchor · drag to reposition" aria-label="MOVE anchor"><i></i><small>MOVE</small></button>` : "");
  } else {
    const width = numberTag(sourceHeader, "MAP WIDTH", 280);
    const height = numberTag(sourceHeader, "MAP HEIGHT", 360);
    mapCanvas.style.width = `${width}px`;
    mapCanvas.style.height = `${height}px`;
    mapCanvas.dataset.tool = activeTool;
    mapCanvas.innerHTML = placements.map(item => {
      const definition = catalog[item.id] || { width: 50, height: 40, parts: [] };
      const rotation = normalizeRotation(item.rotation);
      return `<span class="studio-composite${item.instance === activePlacementId ? " selected" : ""}" data-map-id="${escapeHtml(item.instance)}" style="left:${item.x}px;top:${item.y}px;width:${definition.width}px;height:${definition.height}px;--rotation:${rotation}deg;--counter-rotation:${-rotation}deg;transform:rotate(var(--rotation))">${definition.parts.map(part => drawPart(part, item.instance)).join("")}<em>${escapeHtml(item.instance)}</em></span>`;
    }).join("");
  }
  renderLibrary();
  renderInspector();
}

function syncVisual(commitNow = false) {
  serializeCurrentSource();
  renderCanvas();
  check();
  if (commitNow) commitHistory(); else scheduleHistory();
}

function message(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(message.timer);
  message.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function formatActivity(label, timestamp) {
  if (!timestamp) return `${label} · NEVER`;
  const formatted = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
  return `${label} · ${formatted}`;
}

function updateSaveIndicator() {
  const file = modules[current].file;
  saveIndicator.textContent = formatActivity("LAST DEV SAVE", activity[file]?.dev);
  pushIndicator.textContent = formatActivity("LAST GITHUB PUSH", activity[file]?.github);
  updatePublishReminder();
}

function recordActivity(kind) {
  const file = modules[current].file;
  activity[file] = { ...(activity[file] || {}), [kind]: Date.now() };
  localStorage.setItem(activityStorageKey, JSON.stringify(activity));
  updateSaveIndicator();
}

function hasUnpublishedDraft() {
  return Boolean(currentDraftVersion || [...elementFileStates.values()].some(state => state.draftVersion));
}

function updatePublishReminder() {
  if (!modules[current]) return;
  const lastPush = activity[modules[current].file]?.github || 0;
  publishButton.classList.toggle("reminder", hasUnpublishedDraft() && Date.now() - lastPush >= 15 * 60 * 1000);
  publishButton.disabled = !isDirty && !hasUnpublishedDraft();
}

async function saveCurrentToDev() {
  if (currentEditor() === "elements") return saveElementLibraryToDev();
  const file = modules[current].file;
  const response = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: `content/${file}`,
      content: editor.value,
      baseSha: currentBaseSha,
      expectedDraftVersion: currentDraftVersion
    })
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409) {
    remoteConflict = true;
    cleanStateLabel = "DEV DRAFT CHANGED";
    check();
    throw new Error(result.error || "DEV DRAFT CHANGED — RELOAD BEFORE SAVING");
  }
  if (!response.ok) throw new Error(result.error || "DEV SAVE FAILED");
  currentDraftVersion = result.draftVersion || null;
  currentBaseSha = result.sha;
  loadedSource = editor.value;
  remoteConflict = Boolean(result.remoteChanged);
  cleanStateLabel = result.cleared ? "MATCHES GITHUB" : "SAVED TO DEV GAME";
  recordActivity("dev");
  check();
  message(result.cleared ? "DEV DRAFT CLEARED — MATCHES GITHUB" : "SAVED TO DEV GAME");
  return result;
}

function elementPath(id) {
  const slug = String(id).toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("ELEMENT NAME NEEDS LETTERS OR NUMBERS");
  return `elements/${modules[current].era}/${slug}.md`;
}

function buildElementIndex(paths) {
  const header = (elementIndexState?.content || "# ELEMENT LIBRARY\n\n## FILES").split(/^\[FILE\]/m)[0].trimEnd();
  return `${header}\n\n${paths.map(path => `[FILE] ${path}`).join("\n")}\n`;
}

async function saveDraftFile(path, content, state = {}, operation = "upsert") {
  const response = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: `content/${path}`,
      content,
      operation,
      baseSha: state.sha || "",
      expectedDraftVersion: state.draftVersion || null
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `COULD NOT SAVE ${path}`);
  return { path, content, operation, sha: result.sha || "", draftVersion: result.draftVersion || null };
}

async function saveElementLibraryToDev() {
  const parsed = parseElementCatalog(editor.value);
  if (!parsed.elements.length) throw new Error("AN ELEMENT LIBRARY CANNOT BE EMPTY");
  const previousById = new Map([...elementFileStates.values()].map(state => [state.id, state]));
  const desired = parsed.elements.map(item => {
    const previous = previousById.get(item.id);
    return { item, path: previous?.path || elementPath(item.id), previous };
  });
  if (new Set(desired.map(entry => entry.path)).size !== desired.length) throw new Error("ELEMENT NAMES MUST BE UNIQUE");
  const nextStates = new Map();
  for (const entry of desired) {
    const content = `${serializeElementBlock(entry.item)}\n`;
    const saved = await saveDraftFile(entry.path, content, entry.previous || {});
    nextStates.set(entry.path, { ...saved, id: entry.item.id });
  }
  for (const state of elementFileStates.values()) {
    if (nextStates.has(state.path)) continue;
    const deleted = await saveDraftFile(state.path, "", state, "delete");
    nextStates.set(state.path, { ...deleted, id: state.id });
  }
  const livePaths = desired.map(entry => entry.path);
  const indexContent = buildElementIndex(livePaths);
  elementIndexState = await saveDraftFile(modules[current].file, indexContent, elementIndexState || {});
  currentBaseSha = elementIndexState.sha;
  currentDraftVersion = elementIndexState.draftVersion;
  elementIndexState.content = indexContent;
  elementFileStates = nextStates;
  loadedSource = editor.value;
  cleanStateLabel = "LIBRARY SAVED TO DEV GAME";
  recordActivity("dev");
  check();
  message("ELEMENT LIBRARY SAVED TO DEV GAME");
}

async function publishDraftFile(state) {
  if (!state?.draftVersion) return state;
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: `content/${state.path}`,
      content: state.content || "",
      expectedSha: state.sha || "",
      expectedDraftVersion: state.draftVersion,
      message: `Update ${state.path} from Writer's Room`
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `COULD NOT PUBLISH ${state.path}`);
  return { ...state, sha: result.sha || "", draftVersion: null };
}

async function publishElementLibrary() {
  if (isDirty) await saveElementLibraryToDev();
  if (!hasUnpublishedDraft()) return message("NOTHING NEW TO PUSH");
  const live = [...elementFileStates.values()].filter(state => state.operation !== "delete");
  const deleted = [...elementFileStates.values()].filter(state => state.operation === "delete");
  for (const state of live) elementFileStates.set(state.path, await publishDraftFile(state));
  elementIndexState = await publishDraftFile(elementIndexState);
  currentBaseSha = elementIndexState.sha;
  currentDraftVersion = null;
  for (const state of deleted) await publishDraftFile(state);
  elementFileStates = new Map([...elementFileStates].filter(([, state]) => state.operation !== "delete"));
  cleanStateLabel = "LIBRARY PUBLISHED TO GITHUB";
  recordActivity("github");
  check();
  message("ELEMENT LIBRARY PUSHED TO GITHUB");
}

async function publishCurrent() {
  if (currentEditor() === "elements") return publishElementLibrary();
  if (isDirty) await saveCurrentToDev();
  if (!hasUnpublishedDraft()) return message("NOTHING NEW TO PUSH");
  const file = modules[current].file;
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: `content/${file}`,
      content: editor.value,
      expectedSha: currentBaseSha,
      expectedDraftVersion: currentDraftVersion,
      message: `Update ${file} from Writer's Room`
    })
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409) {
    remoteConflict = true;
    cleanStateLabel = "REMOTE FILE CHANGED";
    check();
    throw new Error("REMOTE FILE CHANGED — RELOAD BEFORE PUSHING");
  }
  if (!response.ok) throw new Error(result.error || "GITHUB PUSH FAILED");
  currentBaseSha = result.sha;
  currentDraftVersion = null;
  remoteConflict = false;
  cleanStateLabel = "PUBLISHED TO GITHUB";
  recordActivity("github");
  check();
  message("PUSHED TO GITHUB");
}

function requestNavigation(action, destination) {
  if (!isDirty) {
    action();
    return;
  }
  pendingNavigation = action;
  document.querySelector("#leave-file-copy").textContent = `${modules[current].file} has changes that only exist in this tab. ${destination} will discard them.`;
  leaveFileModal.showModal();
}

function check() {
  const module = modules[current];
  const source = editor.value;
  document.querySelector("#detected").innerHTML = `<span>LIVE CHECK</span>` + module.counts(source).map(([name, expression]) => `<b>${(source.match(expression) || []).length}</b><small>${name}</small>`).join("");
  isDirty = source !== loadedSource;
  document.querySelector("#state").textContent = isDirty ? "UNSAVED EDITS" : remoteConflict ? "GITHUB CHANGED" : cleanStateLabel;
  updatePublishReminder();
}

function setVisualMode(enabled) {
  const panel = document.querySelector(".editor");
  mapStudio.dataset.mode = currentEditor();
  panel.classList.toggle("map-mode", enabled);
  panel.classList.remove("map-raw-open");
  mapStudio.hidden = !enabled;
  document.querySelector("#element-add").hidden = currentEditor() !== "elements";
  document.querySelector("#library-title").textContent = currentEditor() === "elements" ? "ELEMENTS" : "ELEMENT LIBRARY";
  document.querySelector("#map-place").hidden = true;
  document.querySelector("#map-duplicate").hidden = currentEditor() !== "map";
  document.querySelector("#map-delete").hidden = currentEditor() !== "map";
  document.querySelectorAll("[data-add-shape]").forEach(button => button.hidden = currentEditor() !== "elements");
  document.querySelector('[data-tool="anchor"]').hidden = currentEditor() !== "elements";
  if (currentEditor() !== "elements" && activeTool === "anchor") activeTool = "select";
  document.querySelector("#map-raw").textContent = "[ RAW MARKDOWN ]";
  document.querySelector("#visual-return").hidden = true;
  if (enabled) {
    parseCurrentSource();
    renderCanvas();
  }
}

async function load() {
  const module = modules[current];
  document.querySelector("#guide").innerHTML = module.legend;
  document.querySelector("#path").textContent = `content/${module.file}`;
  document.querySelectorAll("[data-module]").forEach(button => button.classList.toggle("active", button.dataset.module === current));
  const remote = await loadEditableFile(module.file);
  currentBaseSha = remote.sha;
  currentDraftVersion = remote.draftVersion || null;
  elementIndexState = null;
  elementFileStates = new Map();
  if (currentEditor() === "elements") {
    const paths = parseElementIndex(remote.content);
    const files = await Promise.all(paths.map(async path => ({ path, remote: await loadEditableFile(path) })));
    elementIndexState = { path: module.file, content: remote.content, sha: remote.sha || "", draftVersion: remote.draftVersion || null };
    files.forEach(({ path, remote: file }) => {
      const id = parseElementCatalog(file.content).elements[0]?.id;
      if (id) elementFileStates.set(path, { path, id, content: file.content, sha: file.sha || "", draftVersion: file.draftVersion || null, operation: "upsert" });
    });
    const draftResponse = await fetch(`/api/drafts?prefix=${encodeURIComponent(`content/elements/${module.era}/`)}`, { cache: "no-store" });
    if (draftResponse.ok) {
      const { drafts = [] } = await draftResponse.json();
      drafts.filter(draft => draft.operation === "delete").forEach(draft => {
        const path = draft.path.replace(/^content\//, "");
        elementFileStates.set(path, { path, id: path.split("/").pop().replace(/\.md$/, ""), content: "", sha: draft.base_sha || "", draftVersion: draft.version, operation: "delete" });
      });
    }
    editor.value = files.map(({ remote: file }) => file.content.trim()).join("\n\n---\n\n") + "\n";
  } else {
    editor.value = remote.content;
  }
  remoteConflict = Boolean(remote.remoteChanged);
  cleanStateLabel = remote.source === "dev"
    ? `${remoteConflict ? "DEV DRAFT · GITHUB CHANGED" : "DEV DRAFT"}${remote.savedBy ? ` · @${remote.savedBy}` : ""}`
    : remote.source === "github" ? "LOADED FROM GITHUB" : "LOADED FROM DEPLOYMENT";
  loadedSource = editor.value;
  if (currentEditor() === "map") {
    const elementsModule = modules[`${module.era}:${module.elementsModule || "elements"}`];
    if (!elementsModule) throw new Error(`Map module ${module.id} has no Elements module`);
    const catalogIndex = await loadEditableFile(elementsModule.file);
    const catalogFiles = await Promise.all(parseElementIndex(catalogIndex.content).map(loadEditableFile));
    const catalogSource = catalogFiles.map(file => file.content).join("\n\n---\n\n");
    catalog = Object.fromEntries(parseElementCatalog(catalogSource).elements.map(item => [item.id, item]));
  }
  setVisualMode(currentEditor() === "map" || currentEditor() === "elements");
  resetHistory();
  check();
  updateSaveIndicator();
}

async function loadEditableFile(file) {
  try {
    const response = await fetch(`/api/content?path=${encodeURIComponent(`content/${file}`)}`, { cache: "no-store" });
    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch {}
  const response = await fetch(`../content/${file}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load content/${file}`);
  return { content: await response.text(), sha: null, source: "deployment" };
}

function renderNavigation(manifest) {
  const globals = manifest.globals?.length ? `<p class="nav-label">GLOBAL</p>${manifest.globals.map(item => `<button data-module="global:${item.id}">${item.label}</button>`).join("")}` : "";
  const eras = `<p class="nav-label">ERAS</p>${manifest.eras.map(era => `<div class="era ${era.status}"><div class="era-title"><b>${era.label}</b><small>${era.status}</small></div>${era.modules.map(item => `<button data-module="${era.id}:${item.id}">↳ ${item.label}</button>`).join("")}</div>`).join("")}`;
  document.querySelector(".modules").innerHTML = globals + eras;
}

function resetHistory() {
  clearTimeout(historyTimer);
  historyStates = [editor.value];
  historyIndex = 0;
}

function commitHistory() {
  clearTimeout(historyTimer);
  if (historyStates[historyIndex] === editor.value) return;
  historyStates = historyStates.slice(0, historyIndex + 1);
  historyStates.push(editor.value);
  historyIndex += 1;
}

function scheduleHistory() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(commitHistory, 350);
}

function history(command) {
  commitHistory();
  const target = command === "undo" ? historyIndex - 1 : historyIndex + 1;
  if (target < 0 || target >= historyStates.length) return;
  historyIndex = target;
  editor.value = historyStates[historyIndex];
  if (currentEditor() === "map" || currentEditor() === "elements") {
    parseCurrentSource();
    renderCanvas();
  } else {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
  check();
}

function uniqueName(base, used) {
  let name = base;
  let number = 1;
  while (used.includes(name)) name = `${base}-${++number}`;
  return name;
}

function uniqueInstance(id) {
  let number = 1;
  while (placements.some(item => item.instance === `${id}-${number}`)) number += 1;
  return `${id}-${number}`;
}

function selectPart(id, additive = false) {
  if (!additive) selectedPartIds.clear();
  if (additive && selectedPartIds.has(id)) selectedPartIds.delete(id);
  else selectedPartIds.add(id);
  activePartId = selectedPartIds.has(id) ? id : [...selectedPartIds].at(-1) || "";
}

function placeElement(id) {
  const definition = catalog[id];
  if (!definition) return;
  const instance = uniqueInstance(id);
  const mapWidth = numberTag(sourceHeader, "MAP WIDTH", 280);
  const mapHeight = numberTag(sourceHeader, "MAP HEIGHT", 360);
  placements.push({ id, instance, x: Math.max(0, Math.round((mapWidth - definition.width) / 2)), y: Math.max(0, Math.round((mapHeight - definition.height) / 2)), rotation: 0 });
  activePlacementId = instance;
  selectedLibraryId = id;
  syncVisual(true);
}

function openElementDelete(id) {
  pendingElementDelete = id;
  document.querySelector("#delete-element-copy").textContent = `Delete “${id}” and all of its shapes? Existing Map placements will become missing references.`;
  deleteModal.showModal();
}

function deleteSelected() {
  if (currentEditor() === "map") {
    if (!activePlacementId) return message("SELECT A PLACED COPY FIRST");
    placements = placements.filter(item => item.instance !== activePlacementId);
    activePlacementId = placements[0]?.instance || "";
    syncVisual(true);
    return;
  }
  const item = activeElement();
  if (!item || !selectedPartIds.size) return message("SELECT ONE OR MORE SHAPES FIRST");
  item.parts = item.parts.filter(part => !selectedPartIds.has(part.id));
  selectedPartIds.clear();
  activePartId = "";
  syncVisual(true);
}

function canvasPoint(event) {
  const bounds = mapCanvas.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function trackPointer(move, finish = commitHistory) {
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    finish();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function beginPartMove(event, item) {
  const start = canvasPoint(event);
  const moving = item.parts.filter(part => selectedPartIds.has(part.id));
  const origins = new Map(moving.map(part => [part.id, { x: part.x, y: part.y }]));
  const move = next => {
    const point = canvasPoint(next);
    const dx = Math.round(point.x - start.x);
    const dy = Math.round(point.y - start.y);
    moving.forEach(part => {
      const origin = origins.get(part.id);
      part.x = origin.x + dx;
      part.y = origin.y + dy;
    });
    serializeCurrentSource();
    renderCanvas();
    check();
  };
  trackPointer(move);
}

function beginAnchorMove(event, item) {
  const move = next => {
    const point = canvasPoint(next);
    item.anchorX = Math.round(point.x);
    item.anchorY = Math.round(point.y);
    serializeCurrentSource();
    renderCanvas();
    check();
  };
  trackPointer(move);
}

function beginResize(event, item, part, corner) {
  event.stopPropagation();
  const start = canvasPoint(event);
  const bounds = partBounds(part);
  const origin = { ...bounds };
  const move = next => {
    const point = canvasPoint(next);
    const dx = Math.round(point.x - start.x);
    const dy = Math.round(point.y - start.y);
    let x = origin.x;
    let y = origin.y;
    let width = origin.width;
    let height = origin.height;
    if (corner.includes("e")) width = Math.max(4, origin.width + dx);
    if (corner.includes("s")) height = Math.max(4, origin.height + dy);
    if (corner.includes("w")) width = Math.max(4, origin.width - dx);
    if (corner.includes("n")) height = Math.max(4, origin.height - dy);
    if (part.shape === "circle" || next.shiftKey) {
      const ratio = part.shape === "circle" ? 1 : Math.max(.01, origin.width / Math.max(1, origin.height));
      const widthChange = Math.abs(width - origin.width) / Math.max(1, origin.width);
      const heightChange = Math.abs(height - origin.height) / Math.max(1, origin.height);
      if (widthChange >= heightChange) height = Math.max(4, Math.round(width / ratio));
      else width = Math.max(4, Math.round(height * ratio));
    }
    if (corner.includes("w")) x = origin.x + origin.width - width;
    if (corner.includes("n")) y = origin.y + origin.height - height;
    Object.assign(part, { x, y, width, height });
    serializeCurrentSource();
    renderCanvas();
    check();
  };
  trackPointer(move);
}

function beginMarquee(event, item) {
  const start = canvasPoint(event);
  const existing = event.shiftKey ? new Set(selectedPartIds) : new Set();
  selectedPartIds = new Set(existing);
  activePartId = [...selectedPartIds].at(-1) || "";
  mapCanvas.querySelectorAll("[data-part-id]").forEach(node => node.classList.toggle("selected", selectedPartIds.has(node.dataset.partId)));
  const marquee = document.createElement("span");
  marquee.className = "selection-marquee";
  mapCanvas.append(marquee);
  const move = next => {
    const point = canvasPoint(next);
    const rectangle = {
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y)
    };
    Object.assign(marquee.style, { left: `${rectangle.x}px`, top: `${rectangle.y}px`, width: `${rectangle.width}px`, height: `${rectangle.height}px` });
    selectedPartIds = new Set(existing);
    item.parts.forEach(part => {
      const bounds = partBounds(part);
      const intersects = bounds.x < rectangle.x + rectangle.width && bounds.x + bounds.width > rectangle.x && bounds.y < rectangle.y + rectangle.height && bounds.y + bounds.height > rectangle.y;
      if (intersects) selectedPartIds.add(part.id);
    });
    activePartId = [...selectedPartIds].at(-1) || "";
    mapCanvas.querySelectorAll("[data-part-id]").forEach(node => node.classList.toggle("selected", selectedPartIds.has(node.dataset.partId)));
  };
  trackPointer(move, renderCanvas);
}

function beginPlacementMove(event, item) {
  const start = canvasPoint(event);
  const origin = { x: item.x, y: item.y };
  const move = next => {
    const point = canvasPoint(next);
    item.x = Math.round(origin.x + point.x - start.x);
    item.y = Math.round(origin.y + point.y - start.y);
    serializeCurrentSource();
    renderCanvas();
    check();
  };
  trackPointer(move);
}

document.querySelector("#guide").addEventListener("mousedown", event => {
  if (event.target.closest(".tag")) event.preventDefault();
});

document.querySelector("#guide").addEventListener("click", event => {
  const tool = event.target.closest(".tag");
  if (!tool) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const insert = tool.dataset.insert;
  const before = editor.value.slice(0, start);
  const after = editor.value.slice(end);
  editor.focus();
  editor.setRangeText(`${before && !before.endsWith("\n") ? "\n" : ""}${insert}${after && !after.startsWith("\n") ? "\n" : ""}`, start, end, "end");
  commitHistory();
  check();
  message(`${insert} INSERTED`);
});

document.querySelector("#undo").addEventListener("mousedown", event => event.preventDefault());
document.querySelector("#redo").addEventListener("mousedown", event => event.preventDefault());
document.querySelector("#undo").addEventListener("click", () => history("undo"));
document.querySelector("#redo").addEventListener("click", () => history("redo"));

editor.addEventListener("keydown", event => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
  event.preventDefault();
  history(event.shiftKey ? "redo" : "undo");
});

editor.addEventListener("input", () => { check(); scheduleHistory(); });
document.querySelector(".modules").addEventListener("click", event => {
  const button = event.target.closest("[data-module]");
  if (!button) return;
  const nextModule = button.dataset.module;
  if (nextModule === current) return;
  requestNavigation(() => {
    current = nextModule;
    load().catch(() => message("COULD NOT LOAD MODULE"));
  }, `Opening ${modules[nextModule].file}`);
});
document.querySelector("#reload").addEventListener("click", () => requestNavigation(
  () => load().catch(() => message("COULD NOT RELOAD FILE")),
  "Reloading from GitHub"
));
document.querySelector("#save-dev").addEventListener("click", () => saveCurrentToDev().catch(error => message(error.message || "DEV SAVE FAILED")));
document.querySelector("#publish").addEventListener("click", () => publishCurrent().catch(error => message(error.message || "GITHUB PUSH FAILED")));
document.querySelector("#logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.replace("/writer/login");
});
document.querySelector("#leave-save").addEventListener("click", async () => {
  try {
    await saveCurrentToDev();
    leaveFileModal.close("saved");
    const action = pendingNavigation;
    pendingNavigation = null;
    if (action) action();
  } catch (error) {
    message(error.message || "DEV SAVE FAILED");
  }
});
document.querySelector("#leave-discard").addEventListener("click", () => {
  const action = pendingNavigation;
  pendingNavigation = null;
  if (action) action();
});
leaveFileModal.addEventListener("close", () => {
  if (leaveFileModal.returnValue !== "discard") pendingNavigation = null;
});
window.addEventListener("beforeunload", event => {
  if (!isDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => {
  activeTool = button.dataset.tool === "anchor" && activeTool === "anchor" ? "select" : button.dataset.tool;
  renderCanvas();
}));

document.querySelector("#element-add").addEventListener("click", () => {
  const id = uniqueName("element", elements.map(item => item.id));
  elements.push({ id, width: 100, height: 70, anchorX: 0, anchorY: 0, show: "", attach: "", parts: [] });
  activeElementId = id;
  selectedLibraryId = id;
  selectedPartIds.clear();
  activePartId = "";
  syncVisual(true);
});

document.querySelectorAll("[data-add-shape]").forEach(button => button.addEventListener("click", () => {
  const item = activeElement();
  if (!item) return message("CREATE OR SELECT AN ELEMENT FIRST");
  if (item.parts.length >= 5) return message("MAXIMUM 5 LAYERS PER ELEMENT");
  const shape = button.dataset.addShape;
  const id = uniqueName(shape, item.parts.map(part => part.id));
  const dimensions = shape === "line" ? { width: 50, height: 1 } : shape === "circle" ? { width: 36, height: 36 } : { width: 50, height: 30 };
  item.parts.push({ id, shape, style: "pure", x: 10, y: 10, ...dimensions, text: "" });
  selectPart(id);
  syncVisual(true);
}));

document.querySelector("#map-place").addEventListener("click", () => placeElement(selectedLibraryId));
document.querySelector("#map-rotate").addEventListener("click", () => {
  const item = activePlacement();
  if (!item) return;
  item.rotation = normalizeRotation(item.rotation + 45);
  syncVisual(true);
});
document.querySelector("#map-duplicate").addEventListener("click", () => {
  const item = activePlacement();
  if (!item) return message("SELECT A PLACED COPY FIRST");
  const copy = structuredClone(item);
  copy.instance = uniqueInstance(item.id);
  copy.x += 12;
  copy.y += 12;
  placements.push(copy);
  activePlacementId = copy.instance;
  syncVisual(true);
});
document.querySelector("#map-delete").addEventListener("click", deleteSelected);

function toggleRawEditor(opening) {
  const panel = document.querySelector(".editor");
  panel.classList.toggle("map-raw-open", opening);
  document.querySelector("#visual-return").hidden = !opening;
  if (opening) editor.focus();
  else { parseCurrentSource(); renderCanvas(); }
}

document.querySelector("#map-raw").addEventListener("click", () => {
  toggleRawEditor(true);
});
document.querySelector("#visual-return").addEventListener("click", () => toggleRawEditor(false));

elementLibrary.addEventListener("click", event => {
  const remove = event.target.closest("[data-remove-element]");
  if (remove) return openElementDelete(remove.dataset.removeElement);
  const place = event.target.closest("[data-place-element]");
  if (place) return placeElement(place.dataset.placeElement);
  const button = event.target.closest("[data-library-id]");
  if (!button) return;
  if (currentEditor() === "elements") {
    activeElementId = button.dataset.libraryId;
    selectedLibraryId = activeElementId;
    selectedPartIds.clear();
    activePartId = "";
  } else selectedLibraryId = selectedLibraryId === button.dataset.libraryId ? "" : button.dataset.libraryId;
  renderCanvas();
});

mapInspector.addEventListener("submit", event => event.preventDefault());
mapInspector.addEventListener("click", event => {
  const mapLayer = event.target.closest("[data-map-layer]");
  if (mapLayer) {
    activePlacementId = mapLayer.dataset.mapLayer;
    renderCanvas();
    return;
  }
  const remove = event.target.closest("[data-remove-layer]");
  if (remove) {
    const item = activeElement();
    if (!item) return;
    const id = remove.dataset.removeLayer;
    item.parts = item.parts.filter(part => part.id !== id);
    selectedPartIds.delete(id);
    if (activePartId === id) activePartId = [...selectedPartIds].at(-1) || "";
    syncVisual(true);
    return;
  }
  const layer = event.target.closest("[data-layer-id]");
  if (!layer) return;
  selectPart(layer.dataset.layerId, event.shiftKey || event.metaKey || event.ctrlKey);
  renderCanvas();
});

mapInspector.addEventListener("pointerover", event => {
  const mapLayer = event.target.closest("[data-map-layer]");
  if (!mapLayer) return;
  mapCanvas.querySelector(`[data-map-id="${CSS.escape(mapLayer.dataset.mapLayer)}"]`)?.classList.add("layer-hover");
});

mapInspector.addEventListener("pointerout", event => {
  const mapLayer = event.target.closest("[data-map-layer]");
  if (!mapLayer || mapLayer.contains(event.relatedTarget)) return;
  mapCanvas.querySelector(`[data-map-id="${CSS.escape(mapLayer.dataset.mapLayer)}"]`)?.classList.remove("layer-hover");
});

mapInspector.addEventListener("input", event => {
  const name = event.target.name;
  if (!name) return;
  const numeric = ["x", "y", "rotation", "width", "height", "diameter", "element-width", "element-height", "anchor-x", "anchor-y"].includes(name);
  const value = numeric ? Number(event.target.value || 0) : event.target.value.trim();
  if (currentEditor() === "map") {
    const item = activePlacement();
    if (!item) return;
    if (name === "instance") {
      const old = item.instance;
      item.instance = value || old;
      activePlacementId = item.instance;
    } else if (["x", "y"].includes(name)) item[name] = value;
    else if (name === "rotation") item.rotation = normalizeRotation(value);
    syncVisual();
    return;
  }
  const item = activeElement();
  if (!item) return;
  const part = item.parts.find(entry => entry.id === activePartId);
  if (name === "id") {
    const old = item.id;
    item.id = value || old;
    activeElementId = item.id;
    selectedLibraryId = item.id;
  } else if (name === "element-width") item.width = Math.max(20, value);
  else if (name === "element-height") item.height = Math.max(20, value);
  else if (name === "anchor-x") item.anchorX = value;
  else if (name === "anchor-y") item.anchorY = value;
  else if (["show", "attach"].includes(name)) item[name] = value;
  else if (part) {
    if (name === "part-id") {
      const old = part.id;
      part.id = value || old;
      selectedPartIds.delete(old);
      selectedPartIds.add(part.id);
      activePartId = part.id;
    } else if (name === "diameter" && part.shape === "circle") part.width = part.height = Math.max(1, value);
    else if (["style", "x", "y", "width", "height", "text"].includes(name)) {
      part[name] = value;
      if (part.shape === "circle" && (name === "width" || name === "height")) part.width = part.height = Math.max(1, value);
    }
  }
  syncVisual();
});

mapCanvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  event.preventDefault();
  if (currentEditor() === "map") {
    const composite = event.target.closest("[data-map-id]");
    if (!composite) { activePlacementId = ""; selectedLibraryId = ""; renderCanvas(); return; }
    activePlacementId = composite.dataset.mapId;
    const item = activePlacement();
    renderCanvas();
    if (activeTool === "move" && item) beginPlacementMove(event, item);
    return;
  }
  const item = activeElement();
  if (!item) return;
  if (activeTool === "anchor") {
    const point = canvasPoint(event);
    item.anchorX = Math.round(point.x);
    item.anchorY = Math.round(point.y);
    serializeCurrentSource();
    renderCanvas();
    check();
    beginAnchorMove(event, item);
    return;
  }
  const partNode = event.target.closest("[data-part-id]");
  const handle = event.target.closest("[data-resize]");
  if (handle && partNode) {
    const part = item.parts.find(entry => entry.id === partNode.dataset.partId);
    if (part) beginResize(event, item, part, handle.dataset.resize);
    return;
  }
  if (partNode) {
    const id = partNode.dataset.partId;
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    if (!selectedPartIds.has(id) || additive) selectPart(id, additive);
    else activePartId = id;
    renderCanvas();
    if (activeTool === "move") beginPartMove(event, item);
    return;
  }
  if (activeTool === "select") beginMarquee(event, item);
  else {
    selectedPartIds.clear();
    activePartId = "";
    renderCanvas();
  }
});

document.querySelector(".map-stage").addEventListener("pointerdown", event => {
  if (event.target !== event.currentTarget) return;
  if (currentEditor() === "map") { activePlacementId = ""; selectedLibraryId = ""; }
  else {
    selectedPartIds.clear();
    activePartId = "";
  }
  renderCanvas();
});

document.querySelector("#delete-element-confirm").addEventListener("click", () => {
  if (!pendingElementDelete) return;
  elements = elements.filter(item => item.id !== pendingElementDelete);
  if (activeElementId === pendingElementDelete) activeElementId = elements[0]?.id || "";
  selectedLibraryId = activeElementId;
  selectedPartIds.clear();
  activePartId = "";
  pendingElementDelete = "";
  syncVisual(true);
});
deleteModal.addEventListener("close", () => { pendingElementDelete = ""; });

window.addEventListener("keydown", event => {
  const typing = event.target.matches("input, textarea, select, [contenteditable]");
  if (typing) return;
  if ((currentEditor() === "map" || currentEditor() === "elements") && ["Backspace", "Delete"].includes(event.key)) {
    event.preventDefault();
    deleteSelected();
    return;
  }
  const tool = { v: "move", s: "select", r: "resize", a: "anchor" }[event.key.toLowerCase()];
  if (tool && (currentEditor() === "map" || currentEditor() === "elements")) {
    activeTool = tool;
    renderCanvas();
  }
});

fetch(`../content/manifest.json?v=${Date.now()}`)
  .then(response => response.json())
  .then(manifest => { configureModules(manifest); renderNavigation(manifest); return load(); })
  .catch(() => message("COULD NOT LOAD CONTENT STRUCTURE"));

setInterval(updatePublishReminder, 60 * 1000);

fetch("/api/session", { cache: "no-store" })
  .then(response => response.ok ? response.json() : null)
  .then(session => {
    githubUser.textContent = session?.authenticated ? `@${session.user.login}` : "";
  })
  .catch(() => {});
