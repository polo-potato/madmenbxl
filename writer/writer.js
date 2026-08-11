const editRoot = "https://github.com/polo-potato/madmenbxl/edit/main/";
const $ = selector => document.querySelector(selector);
let beats = [];
let active = 0;
let settings = {};

const metadata = source => Object.fromEntries(source.split("\n").map(line => {
  const colon = line.indexOf(":");
  return colon < 0 ? null : [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}).filter(Boolean));

function parse(source) {
  const parts = source.split(/^---$/m);
  settings = metadata(parts[0]);
  beats = parts.slice(1).map(part => part.trim()).filter(Boolean).map(part => {
    const [head, body = ""] = part.split("## TEXT");
    const data = metadata(head);
    return { id: data.id || "new-scene", kind: data.kind || "thought", gate: data.gate || "", action: data.action || "", text: body.trim() };
  });
}

function sceneLabel(beat, index) {
  const first = beat.text.split("\n").find(Boolean) || "empty scene";
  return `<button data-beat="${index}" class="${index === active ? "active" : ""}"><span>${String(index + 1).padStart(2, "0")} · ${beat.kind === "thought" ? "YOU" : "LIFE"}</span><b>${first.slice(0, 34)}</b></button>`;
}

function renderList() { $("#beats").innerHTML = beats.map(sceneLabel).join(""); }

function loadBeat(index) {
  active = index;
  const beat = beats[active];
  $("#kind").value = beat.kind;
  $("#gate").value = beat.gate;
  $("#action").value = beat.action;
  $("#copy").value = beat.text;
  $("#scene-id").value = beat.id;
  $("#scene-number").textContent = `SCENE ${String(active + 1).padStart(2, "0")} / ${String(beats.length).padStart(2, "0")}`;
  renderList();
  renderPreview();
}

function sync() {
  const beat = beats[active];
  beat.kind = $("#kind").value;
  beat.gate = $("#gate").value.trim();
  beat.action = $("#action").value.trim();
  beat.text = $("#copy").value;
  beat.id = $("#scene-id").value.trim() || `scene-${active + 1}`;
  $("#save-state").textContent = "UNSAVED CHANGES";
  renderList();
  renderPreview();
}

function renderPreview() {
  const beat = beats[active];
  const prefix = settings["thought-prefix"] || "WHAT IF...";
  const before = beat.gate ? `<button>[ ${beat.gate} ]</button>` : "";
  const after = beat.action ? `<button>[ ${beat.action} ]</button>` : "";
  const words = beat.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\n", "<br>");
  $("#preview-mode").textContent = beat.kind === "thought" ? "YOU WRITE" : "LIFE HAPPENS";
  $("#preview-copy").className = beat.kind;
  $("#preview-copy").innerHTML = `${before}${beat.kind === "thought" ? `<span class="auto-prefix">${prefix}</span><br><br>` : ""}<span>${words}</span>${beat.kind === "thought" ? '<i class="cursor">|</i>' : ""}`;
  $("#preview-action").innerHTML = after;
}

function markdown() {
  const intro = `# WHAT IF / PROLOGUE\n\n## LEGEND — READ THIS FIRST\n\n- \`kind: thought\` = **YOU WRITE** — normal text, advanced by typing.\n- \`kind: narration\` = **LIFE HAPPENS** — italic text, written automatically.\n- \`gate:\` = a button appears **before** the text.\n- \`action:\` = a button appears **after** the text.\n- \`---\` = a new screen / beat.\n\n## GLOBAL SETTINGS\n\nthought-prefix: ${settings["thought-prefix"] || "WHAT IF..."}\nthought-prefix-mode: automatic\nthought-input: keyboard\nnarration-style: italic\nnarration-mode: automatic\n\nThe game automatically adds \`WHAT IF...\` above every \`kind: thought\` screen. Do not type it again inside \`## TEXT\`.\n`;
  return intro + beats.map(beat => `\n---\nid: ${beat.id}\nkind: ${beat.kind}${beat.gate ? `\ngate: ${beat.gate}` : ""}${beat.action ? `\naction: ${beat.action}` : ""}\n## TEXT\n${beat.text.trim()}\n`).join("");
}

document.querySelectorAll("[data-edit]").forEach(link => { link.href = editRoot + link.dataset.edit; link.target = "_blank"; link.rel = "noopener"; });
$("#beats").addEventListener("click", event => { const button = event.target.closest("[data-beat]"); if (button) loadBeat(Number(button.dataset.beat)); });
["#kind", "#gate", "#action", "#copy", "#scene-id"].forEach(selector => $(selector).addEventListener("input", sync));
$("#add-beat").addEventListener("click", () => { beats.push({ id: `scene-${beats.length + 1}`, kind: "thought", gate: "", action: "", text: "a new thought." }); loadBeat(beats.length - 1); sync(); });
$("#publish").addEventListener("click", async () => {
  await navigator.clipboard.writeText(markdown());
  $("#toast").textContent = "MARKDOWN COPIED — PASTE IT IN GITHUB";
  $("#toast").classList.add("show");
  window.open(editRoot + "content/prologue.md", "_blank", "noopener");
  setTimeout(() => $("#toast").classList.remove("show"), 4500);
});

fetch("../content/prologue.md").then(response => response.text()).then(source => { parse(source); loadBeat(0); }).catch(() => { $("#beats").innerHTML = "Could not load prologue.md"; });
