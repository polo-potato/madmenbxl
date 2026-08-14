const editorOrigin = "https://madmenbxl-editor.madmenbxl.workers.dev";

if (location.hostname.endsWith(".github.io")) {
  location.replace(`${editorOrigin}/writer/${location.search}${location.hash}`);
}
