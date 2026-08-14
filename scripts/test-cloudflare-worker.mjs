import assert from "node:assert/strict";
import { decodeBase64, encodeBase64, isAllowedContentPath } from "../worker/index.js";

assert.equal(isAllowedContentPath("content/prologue.md"), true);
assert.equal(isAllowedContentPath("content/manifest.json"), true);
assert.equal(isAllowedContentPath("content/nested/file.md"), false);
assert.equal(isAllowedContentPath("../worker/index.js"), false);
assert.equal(isAllowedContentPath("content/file.html"), false);

const unicode = "What if… Bruxelles ☕";
assert.equal(decodeBase64(encodeBase64(unicode)), unicode);

console.log("Cloudflare Worker helpers look good.");
