const editRoot = "https://github.com/polo-potato/madmenbxl/edit/main/";
const editor = document.querySelector("#markdown");
const toast = document.querySelector("#toast");
const mapStudio = document.querySelector("#map-studio");
const mapCanvas = document.querySelector("#map-canvas");
const mapInspector = document.querySelector("#map-inspector");
const elementLibrary = document.querySelector("#element-library");
const deleteModal = document.querySelector("#delete-element-modal");
const leaveFileModal = document.querySelector("#leave-file-modal");
const saveIndicator = document.querySelector("#save-indicator");

let current = "story";
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

const saveClickStorageKey = "what-if-writer-save-clicks";
let saveClicks = {};
try { saveClicks = JSON.parse(localStorage.getItem(saveClickStorageKey) || "{}"); } catch { saveClicks = {}; }

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

const modules = {
  story: {
    file: "prologue.md",
    legend: `<p class="kicker">PROLOGUE TAGS</p><section class="tag"><code>---</code><b>NEW SCENE</b></section><section class="tag"><code>## TEXT</code><b>SCREEN COPY</b></section><section class="tag thought"><code>[THOUGHT]</code><b>YOU WRITE</b><p>Player types. WHAT IF is automatic.</p></section><section class="tag narration"><code>[NARRATION]</code><b>LIFE HAPPENS</b><p>Italic and automatic.</p></section><section class="tag"><code>[ACTION] check phone</code><b>PAUSE HERE</b></section><section class="tag unlock"><code>[UNLOCK] scroll</code><b>PERMANENT ACTION</b></section>`,
    counts: source => [["SCENES", /^---$/gm], ["ACTIONS", /^\[ACTION\]/gm], ["UNLOCKS", /^\[UNLOCK\]/gm]]
  },
  gauges: {
    file: "prologue-gauges.md",
    legend: `<p class="kicker">PROLOGUE GAUGES</p><section class="tag"><code>---</code><b>NEW GAUGE</b></section><section class="tag"><code>[GAUGE] creativity</code><b>GAUGE ID</b></section><section class="tag"><code>[START] 48</code><b>INITIAL VALUE</b></section><section class="tag"><code>[DRIFT] -0.025</code><b>CHANGE PER SECOND</b></section><section class="tag"><code>[TRY COST] -12</code><b>COST PER DIRECTION</b></section><section class="tag"><code>[IDEA SOURCE] +0.14</code><b>DIRECT IDEA SOURCE</b></section><section class="tag"><code>[IDEA BOOST] +0.006</code><b>SPEED BOOST</b></section>`,
    counts: source => [["GAUGES", /^\[GAUGE\]/gm], ["RULES", /^\[(?:START|DRIFT|TRY MINIMUM|TRY COST|IDEA SOURCE|IDEA BOOST)\]/gm]]
  },
  brief: {
    file: "brief.md",
    legend: `<p class="kicker">BRIEF TAGS</p><section class="tag"><code>## VISIBLE ACTIONS</code><b>MODULE ACTION MENU</b></section><section class="tag"><code>[LABEL] BRIEF</code><b>SMALL LABEL</b></section><section class="tag"><code>[PREFIX] WHAT IF...</code><b>THOUGHT PREFIX</b></section><section class="tag"><code>[PROMPT] waiting felt useful?</code><b>PLAYER THOUGHT</b></section><section class="tag"><code>[ACTION] try a direction</code><b>IDEA BUTTON</b></section><section class="tag"><code>[METER] IDEA</code><b>GAUGE NAME</b></section>`,
    counts: source => [["FIELDS", /^\[(?:LABEL|PREFIX|PROMPT|ACTION|METER|COMPLETE|SEND)\]/gm], ["VISIBLE ACTIONS", /^\s*-\s+.+$/gm]]
  },
  actions: {
    file: "actions.md",
    legend: `<p class="kicker">ACTION TAGS</p><section class="tag"><code>---</code><b>NEW ACTION</b></section><section class="tag unlock"><code>[ACTION] cigarette</code><b>GLOBAL ACTION</b></section><section class="tag"><code>[EFFECT] stress -5</code><b>GAUGE CHANGE</b></section><section class="tag"><code>[COOLDOWN] 20</code><b>WAIT TIME</b></section><section class="tag"><code>[MOVE] window</code><b>PLAYER POSITION</b></section><section class="tag"><code>[PROP] coffee</code><b>MAP OBJECT</b></section><section class="tag"><code>[ANIMATION] smoke</code><b>MAP ANIMATION</b></section><section class="tag"><code>[CHANCE] 0.1</code><b>LUCKY CHANCE</b></section><section class="tag narration"><code>## NOTE</code><b>MESSAGE POOL</b></section><section class="tag narration"><code>## LUCKY NOTE</code><b>LUCKY MESSAGE POOL</b></section>`,
    counts: source => [["ACTIONS", /^\[ACTION\]/gm], ["EFFECTS", /^\[(?:EFFECT|LUCKY EFFECT)\]/gm], ["MESSAGES", /^\s*-\s+.+$/gm]]
  },
  events: {
    file: "events.md",
    legend: `<p class="kicker">EVENT TAGS</p><section class="tag"><code>---</code><b>NEW EVENT</b></section><section class="tag"><code>[EVENT] event title</code><b>INTERNAL TITLE</b></section><section class="tag narration"><code>## TEXT</code><b>WHAT HAPPENS</b></section><section class="tag"><code>[CHOICE] open the window</code><b>CONTEXT BUTTON</b></section><section class="tag"><code>[EFFECT] stress -4</code><b>CONSEQUENCE</b></section><section class="tag unlock"><code>[UNLOCK] take a walk</code><b>OPTIONAL PERMANENT ACTION</b></section>`,
    counts: source => [["EVENTS", /^\[EVENT\]/gm], ["CHOICES", /^\[CHOICE\]/gm], ["EFFECTS", /^\[EFFECT\]/gm]]
  },
  elements: {
    file: "prologue-elements.md",
    legend: `<p class="kicker">ELEMENT LIBRARY</p><section class="tag"><code>[ELEMENT] bed</code><b>REUSABLE ELEMENT</b></section><section class="tag"><code>[PART] pillow</code><b>ONE LAYER</b><p>Maximum five layers per element.</p></section><section class="tag"><code>[SHAPE] rect</code><b>FIXED GEOMETRY</b><p>A layer cannot change shape after creation.</p></section><section class="tag"><code>[STYLE] pure</code><b>COMPATIBLE EFFECT</b><p>Pure is the default. Effects never change geometry.</p></section><section class="tag"><code>[X] 0 / [Y] 0</code><b>LAYER POSITION</b></section><section class="tag"><code>[WIDTH] 118</code><b>SIZE</b></section><section class="tag"><code>[SHOW] coffee</code><b>ACTION PROP</b></section><section class="tag"><code>[ATTACH] player</code><b>FOLLOW PLAYER</b></section><p class="rules">Design each reusable element here. The Map only places copies.</p>`,
    counts: source => [["ELEMENTS", /^\[ELEMENT\]/gm], ["LAYERS", /^\[PART\]/gm], ["ACTION LINKS", /^\[(?:SHOW|ATTACH)\]/gm]]
  },
  map: {
    file: "prologue-map.md",
    legend: `<p class="kicker">MAP PLACEMENT</p><section class="tag"><code>[PLACE] desk</code><b>PLACE AN ELEMENT</b></section><section class="tag"><code>[INSTANCE] desk-1</code><b>UNIQUE COPY NAME</b></section><section class="tag"><code>[X] 46 / [Y] 44</code><b>POSITION</b></section><section class="tag"><code>[POSITION] window 177 10</code><b>PLAYER DESTINATION</b></section><p class="rules">Create elements in Elements, then place as many copies as needed here.</p>`,
    counts: source => [["PLACED", /^\[PLACE\]/gm], ["POSITIONS", /^\[POSITION\]/gm]]
  }
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function tag(block, name) {
  return block.match(new RegExp(`^\\[${name}\\]\\s+(.+)$`, "m"))?.[1]?.trim() || "";
}

function numberTag(block, name, fallback = 0) {
  const value = Number(tag(block, name));
  return Number.isFinite(value) ? value : fallback;
}

function splitSource(source) {
  const blocks = source.split(/^---$/m);
  return { header: blocks.shift()?.trim() || "", blocks };
}

function parseElementCatalog(source) {
  const parsed = splitSource(source);
  const result = parsed.blocks.map(block => {
    const id = tag(block, "ELEMENT");
    if (!id) return null;
    const firstPart = block.search(/^\[PART\]/m);
    const head = firstPart < 0 ? block : block.slice(0, firstPart);
    const parts = [...block.matchAll(/^\[PART\]\s+(.+?)\n([\s\S]*?)(?=^\[PART\]|(?![\s\S]))/gm)].map(match => {
      const visual = normalizeShape(tag(match[2], "SHAPE") || "rect", tag(match[2], "STYLE"));
      const width = numberTag(match[2], "WIDTH");
      const height = visual.shape === "circle" ? width || numberTag(match[2], "HEIGHT") : numberTag(match[2], "HEIGHT");
      return { id: match[1].trim(), ...visual, x: numberTag(match[2], "X"), y: numberTag(match[2], "Y"), width, height, text: tag(match[2], "TEXT") };
    });
    return {
      id,
      width: numberTag(head, "WIDTH", 100),
      height: numberTag(head, "HEIGHT", 70),
      show: tag(head, "SHOW"),
      attach: tag(head, "ATTACH"),
      parts
    };
  }).filter(Boolean);
  return { header: parsed.header, elements: result };
}

function parseCurrentSource() {
  selectedPartIds.clear();
  activePartId = "";
  if (current === "elements") {
    const parsed = parseElementCatalog(editor.value);
    sourceHeader = parsed.header;
    elements = parsed.elements;
    if (!elements.some(item => item.id === activeElementId)) activeElementId = elements[0]?.id || "";
    selectedLibraryId = activeElementId;
    return;
  }
  const parsed = splitSource(editor.value);
  sourceHeader = parsed.header;
  placements = parsed.blocks.map((block, index) => {
    const id = tag(block, "PLACE");
    if (!id) return null;
    return {
      id,
      instance: tag(block, "INSTANCE") || `${id}-${index + 1}`,
      x: numberTag(block, "X"),
      y: numberTag(block, "Y")
    };
  }).filter(Boolean);
  if (!placements.some(item => item.instance === activePlacementId)) activePlacementId = placements[0]?.instance || "";
  if (!catalog[selectedLibraryId]) selectedLibraryId = Object.keys(catalog)[0] || "";
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

function serializeCurrentSource() {
  let blocks;
  if (current === "elements") {
    blocks = elements.map(item => [
      `[ELEMENT] ${item.id}`,
      `[WIDTH] ${Math.round(item.width)}`,
      `[HEIGHT] ${Math.round(item.height)}`,
      item.show ? `[SHOW] ${item.show}` : "",
      item.attach ? `[ATTACH] ${item.attach}` : "",
      ...item.parts.map(serializePart)
    ].filter(Boolean).join("\n"));
  } else {
    blocks = placements.map(item => [
      `[PLACE] ${item.id}`,
      `[INSTANCE] ${item.instance}`,
      `[X] ${Math.round(item.x)}`,
      `[Y] ${Math.round(item.y)}`
    ].join("\n"));
  }
  editor.value = [sourceHeader, ...blocks].filter(Boolean).join("\n\n---\n").trim() + "\n";
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
  if (current === "elements") {
    elementLibrary.innerHTML = elements.map(item => `<div class="library-row${item.id === activeElementId ? " active" : ""}"><button type="button" data-library-id="${escapeHtml(item.id)}">${escapeHtml(item.id)}</button><button type="button" class="library-remove" data-remove-element="${escapeHtml(item.id)}" title="Delete ${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.id)}">×</button></div>`).join("");
  } else {
    elementLibrary.innerHTML = Object.values(catalog).map(item => `<div class="library-row${item.id === selectedLibraryId ? " active" : ""}"><button type="button" data-library-id="${escapeHtml(item.id)}">${escapeHtml(item.id)}</button><button type="button" class="library-place" data-place-element="${escapeHtml(item.id)}" title="Place ${escapeHtml(item.id)}" aria-label="Place ${escapeHtml(item.id)}">+</button></div>`).join("");
  }
}

function layerList(item) {
  return `<section class="layers"><div><p class="kicker">LAYERS · ${item.parts.length}/5</p></div>${item.parts.map((part, index) => `<div class="layer-row${selectedPartIds.has(part.id) ? " active" : ""}"><button type="button" data-layer-id="${escapeHtml(part.id)}"><span>${index + 1}</span>${escapeHtml(part.id)}<small>${escapeHtml(part.shape)}</small></button><button type="button" class="layer-remove" data-remove-layer="${escapeHtml(part.id)}" title="Delete ${escapeHtml(part.id)}" aria-label="Delete ${escapeHtml(part.id)}">×</button></div>`).join("") || `<small>NO SHAPES YET</small>`}</section>`;
}

function renderInspector() {
  if (current === "map") {
    const item = activePlacement();
    mapInspector.innerHTML = item ? `<p class="kicker">PLACED COPY</p><b>${escapeHtml(item.id)}</b><label>INSTANCE<input name="instance" value="${escapeHtml(item.instance)}"></label><div class="inspector-grid"><label>X<input name="x" type="number" value="${item.x}"></label><label>Y<input name="y" type="number" value="${item.y}"></label></div>` : `<p class="kicker">PLACE AN ELEMENT</p><p class="inspector-help">Choose an element in the library, then use + or PLACE SELECTED.</p>`;
    return;
  }
  const item = activeElement();
  if (!item) {
    mapInspector.innerHTML = `<p class="kicker">CREATE AN ELEMENT</p><p class="inspector-help">An element is a reusable object made from up to five shapes.</p>`;
    return;
  }
  const chosen = item.parts.find(part => part.id === activePartId);
  const metadata = `<p class="kicker">ELEMENT</p><label>NAME<input name="id" value="${escapeHtml(item.id)}"></label><div class="inspector-grid"><label>CANVAS WIDTH<input name="element-width" type="number" min="20" value="${item.width}"></label><label>CANVAS HEIGHT<input name="element-height" type="number" min="20" value="${item.height}"></label></div><label>SHOW WHEN<input name="show" value="${escapeHtml(item.show)}"></label><label>ATTACH TO<input name="attach" value="${escapeHtml(item.attach)}"></label>`;
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
  if (current === "elements") {
    const item = activeElement();
    mapCanvas.style.width = `${item?.width || 160}px`;
    mapCanvas.style.height = `${item?.height || 120}px`;
    mapCanvas.dataset.tool = activeTool;
    mapCanvas.innerHTML = (item?.parts || []).map(part => drawPart(part)).join("");
  } else {
    const width = numberTag(sourceHeader, "MAP WIDTH", 280);
    const height = numberTag(sourceHeader, "MAP HEIGHT", 360);
    mapCanvas.style.width = `${width}px`;
    mapCanvas.style.height = `${height}px`;
    mapCanvas.dataset.tool = activeTool;
    mapCanvas.innerHTML = placements.map(item => {
      const definition = catalog[item.id] || { width: 50, height: 40, parts: [] };
      return `<span class="studio-composite${item.instance === activePlacementId ? " selected" : ""}" data-map-id="${escapeHtml(item.instance)}" style="left:${item.x}px;top:${item.y}px;width:${definition.width}px;height:${definition.height}px">${definition.parts.map(part => drawPart(part, item.instance)).join("")}<em>${escapeHtml(item.instance)}</em></span>`;
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

function formatSaveClick(timestamp) {
  if (!timestamp) return "LAST SAVE CLICK · NEVER";
  const formatted = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
  return `LAST SAVE CLICK · ${formatted}`;
}

function updateSaveIndicator() {
  saveIndicator.textContent = formatSaveClick(saveClicks[modules[current].file]);
}

function recordSaveClick() {
  saveClicks[modules[current].file] = Date.now();
  localStorage.setItem(saveClickStorageKey, JSON.stringify(saveClicks));
  updateSaveIndicator();
}

async function publishCurrent() {
  await navigator.clipboard.writeText(editor.value);
  loadedSource = editor.value;
  cleanStateLabel = "SAVED + COPIED";
  recordSaveClick();
  check();
  message("MODULE COPIED — FINISH THE COMMIT IN GITHUB");
  window.open(editRoot + "content/" + modules[current].file, "_blank", "noopener");
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
  document.querySelector("#state").textContent = isDirty ? "UNSAVED CHANGES" : cleanStateLabel;
}

function setVisualMode(enabled) {
  const panel = document.querySelector(".editor");
  mapStudio.dataset.mode = current;
  panel.classList.toggle("map-mode", enabled);
  panel.classList.remove("map-raw-open");
  mapStudio.hidden = !enabled;
  document.querySelector("#element-add").hidden = current !== "elements";
  document.querySelector("#library-title").textContent = current === "elements" ? "ELEMENTS" : "ELEMENT LIBRARY";
  document.querySelector("#map-place").hidden = current !== "map";
  document.querySelector("#map-duplicate").hidden = current !== "map";
  document.querySelector("#map-delete").hidden = current !== "map";
  document.querySelectorAll("[data-add-shape]").forEach(button => button.hidden = current !== "elements");
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
  editor.value = await fetch(`../content/${module.file}?v=${Date.now()}`).then(response => response.text());
  loadedSource = editor.value;
  cleanStateLabel = "LOADED FROM GITHUB";
  if (current === "map") {
    const catalogSource = await fetch(`../content/prologue-elements.md?v=${Date.now()}`).then(response => response.text());
    catalog = Object.fromEntries(parseElementCatalog(catalogSource).elements.map(item => [item.id, item]));
  }
  setVisualMode(current === "map" || current === "elements");
  resetHistory();
  check();
  updateSaveIndicator();
}

function renderNavigation(manifest) {
  const globals = `<p class="nav-label">GLOBAL</p>${manifest.globals.map(item => `<button data-module="${item.id}">${item.label}</button>`).join("")}`;
  const eras = `<p class="nav-label">ERAS</p>${manifest.eras.map(era => `<div class="era ${era.status}"><div class="era-title"><b>${era.label}</b><small>${era.status}</small></div>${era.modules.map(item => `<button data-module="${item.id}">↳ ${item.label}</button>`).join("")}</div>`).join("")}`;
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
  if (current === "map" || current === "elements") {
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
  placements.push({ id, instance, x: Math.max(0, Math.round((mapWidth - definition.width) / 2)), y: Math.max(0, Math.round((mapHeight - definition.height) / 2)) });
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
  if (current === "map") {
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
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    commitHistory();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
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
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    commitHistory();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
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
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    renderCanvas();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
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
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    commitHistory();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

document.querySelector("#guide").addEventListener("mousedown", event => {
  if (event.target.closest(".tag code")) event.preventDefault();
});

document.querySelector("#guide").addEventListener("click", event => {
  const code = event.target.closest(".tag code");
  if (!code) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const insert = code.textContent.trim();
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
document.querySelector("#publish").addEventListener("click", () => publishCurrent().catch(() => message("COULD NOT COPY MODULE")));
document.querySelector("#leave-save").addEventListener("click", () => {
  publishCurrent().then(() => leaveFileModal.close("copied")).catch(() => message("COULD NOT COPY MODULE"));
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
  activeTool = button.dataset.tool;
  renderCanvas();
}));

document.querySelector("#element-add").addEventListener("click", () => {
  const id = uniqueName("element", elements.map(item => item.id));
  elements.push({ id, width: 100, height: 70, show: "", attach: "", parts: [] });
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
  if (current === "elements") {
    activeElementId = button.dataset.libraryId;
    selectedLibraryId = activeElementId;
    selectedPartIds.clear();
    activePartId = "";
  } else selectedLibraryId = button.dataset.libraryId;
  renderCanvas();
});

mapInspector.addEventListener("submit", event => event.preventDefault());
mapInspector.addEventListener("click", event => {
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

mapInspector.addEventListener("input", event => {
  const name = event.target.name;
  if (!name) return;
  const numeric = ["x", "y", "width", "height", "diameter", "element-width", "element-height"].includes(name);
  const value = numeric ? Number(event.target.value || 0) : event.target.value.trim();
  if (current === "map") {
    const item = activePlacement();
    if (!item) return;
    if (name === "instance") {
      const old = item.instance;
      item.instance = value || old;
      activePlacementId = item.instance;
    } else if (["x", "y"].includes(name)) item[name] = value;
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
  if (current === "map") {
    const composite = event.target.closest("[data-map-id]");
    if (!composite) { activePlacementId = ""; renderCanvas(); return; }
    activePlacementId = composite.dataset.mapId;
    const item = activePlacement();
    renderCanvas();
    if (activeTool === "move" && item) beginPlacementMove(event, item);
    return;
  }
  const item = activeElement();
  if (!item) return;
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
  if (current === "map") activePlacementId = "";
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
  if ((current === "map" || current === "elements") && ["Backspace", "Delete"].includes(event.key)) {
    event.preventDefault();
    deleteSelected();
    return;
  }
  const tool = { v: "move", s: "select", r: "resize" }[event.key.toLowerCase()];
  if (tool && (current === "map" || current === "elements")) {
    activeTool = tool;
    renderCanvas();
  }
});

fetch(`../content/manifest.json?v=${Date.now()}`)
  .then(response => response.json())
  .then(manifest => { renderNavigation(manifest); return load(); })
  .catch(() => message("COULD NOT LOAD CONTENT STRUCTURE"));
