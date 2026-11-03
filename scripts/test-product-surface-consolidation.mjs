import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const [desk, practice, role, accompaniment, productCss, accompanimentCss, theme] = await Promise.all([
  read("lab/instrument-desk.html"),
  read("lab/product-spine.html"),
  read("lab/role-lens.html"),
  read("lab/accompaniment.html"),
  read("lab/product-spine.css"),
  read("lab/accompaniment.css"),
  read("lab/product-theme.js"),
]);

for (const page of [practice, role, accompaniment]) {
  assert.match(page, /instrument-desk\.css/);
  assert.match(page, /product-spine\.css/);
  assert.match(page, /product-theme\.js/);
  assert.match(page, /id="theme-light"/);
  assert.match(page, /id="theme-dark"/);
  assert.match(page, /href="\/"/);
  assert.match(page, /href="\/accompaniment\.html"|aria-pressed="true">◇ Apply/);
  assert.doesNotMatch(page, /intent-tab is-disabled[^>]*>Apply/);
}

assert.match(desk, /href="\/accompaniment\.html"[^>]*>[\s\S]*Apply/);
assert.match(practice, /id="desk-panel"/);
assert.match(practice, /id="focus-panel"/);
assert.match(practice, /PLAY[^<]*<\/span>[\s\S]*NOTICE[\s\S]*UNDERSTAND[\s\S]*TRANSFER/);
assert.match(role, /HEAR[\s\S]*ROLE[\s\S]*USE[\s\S]*TRANSFER[\s\S]*REFLECT/);

assert.match(accompaniment, /Apply · Accompaniment/);
assert.match(accompaniment, /id="progression-controls"/);
assert.match(accompaniment, /id="pattern-grid"/);
assert.match(accompaniment, /id="accompaniment-play"/);
assert.match(accompaniment, /Record one pass, then improvise over yourself/);
assert.match(accompaniment, /Planned · precise PCM looper/);
assert.match(accompaniment, /AudioWorklet fixed-frame PCM capture → AudioBuffer looping/);
assert.match(accompaniment, /disabled aria-disabled="true">Record one pass · not implemented yet/);
assert.doesNotMatch(accompaniment, /MediaRecorder|looper-app\.js|looper-runtime\.mjs/);

assert.match(productCss, /--ge-accent|var\(--ge-accent\)/);
assert.match(productCss, /var\(--ge-canvas\)/);
assert.match(productCss, /var\(--ge-panel\)/);
assert.match(productCss, /var\(--ge-wood-1\)/);
assert.doesNotMatch(productCss, /#101216|#9ebcf0/);
assert.match(accompanimentCss, /record-loop-card/);
assert.match(accompanimentCss, /var\(--ge-selected\)/);

assert.match(theme, /guitar-explorer-theme/);
assert.match(theme, /root\.dataset\.theme/);
assert.doesNotMatch(theme, /location\.reload|sessionStorage|indexedDB/);

console.log("Product Surface Consolidation checks passed: warm Practice/Role Lens, real Apply accompaniment, planned precise looper only.");
