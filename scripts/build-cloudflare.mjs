import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, ".cloudflare-dist");
const rootFiles = ["index.html", "styles.css", ".nojekyll"];
const directories = ["content", "js", "writer"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  ...rootFiles.map(file => cp(resolve(root, file), resolve(output, file))),
  ...directories.map(directory => cp(resolve(root, directory), resolve(output, directory), { recursive: true }))
]);

console.log("Cloudflare assets built.");
