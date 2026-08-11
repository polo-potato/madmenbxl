const editRoot = "https://github.com/polo-potato/madmenbxl/edit/main/";
const editor = document.querySelector("#markdown");
const toast = document.querySelector("#toast");

document.querySelectorAll("[data-edit]").forEach(link => {
  link.href = editRoot + link.dataset.edit;
  link.target = "_blank";
  link.rel = "noopener";
});

function check() {
  const source = editor.value;
  document.querySelector("#scene-count").textContent = (source.match(/^---$/gm) || []).length;
  document.querySelector("#action-count").textContent = (source.match(/^\[ACTION\]/gm) || []).length;
  document.querySelector("#unlock-count").textContent = (source.match(/^\[UNLOCK\]/gm) || []).length;
  document.querySelector("#state").textContent = "UNSAVED CHANGES";
}

function message(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

async function load() {
  const response = await fetch(`../content/prologue.md?v=${Date.now()}`);
  editor.value = await response.text();
  check();
  document.querySelector("#state").textContent = "LOADED FROM GITHUB";
}

editor.addEventListener("input", check);
document.querySelector("#reload").addEventListener("click", load);
document.querySelector("#publish").addEventListener("click", async () => {
  await navigator.clipboard.writeText(editor.value);
  message("FULL MARKDOWN COPIED — PASTE IT IN GITHUB");
  window.open(editRoot + "content/prologue.md", "_blank", "noopener");
});

load().catch(() => message("COULD NOT LOAD PROLOGUE.MD"));
