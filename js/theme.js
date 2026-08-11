const root = document.documentElement;
const button = document.querySelector("[data-theme-toggle]");
const saved = localStorage.getItem("what-if-theme");
const preferred = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function apply(theme) {
  root.dataset.theme = theme;
  if (button) button.textContent = theme === "dark" ? "[ LIGHT MODE ]" : "[ DARK MODE ]";
}

apply(saved || preferred);
button?.addEventListener("click", () => {
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("what-if-theme", theme);
  apply(theme);
});
