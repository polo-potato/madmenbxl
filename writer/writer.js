const editRoot = "https://github.com/polo-potato/madmenbxl/edit/main/";
document.querySelectorAll("[data-edit]").forEach(link => {
  link.href = editRoot + link.dataset.edit;
  link.target = "_blank";
  link.rel = "noopener";
});
document.querySelector("#reload").addEventListener("click", () => {
  const frame = document.querySelector("iframe");
  frame.src = `../?preview=${Date.now()}`;
});
