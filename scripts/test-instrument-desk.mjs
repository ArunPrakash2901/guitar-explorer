import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");

const [desk, deskCss, deskApp, chordLab, buildPreview] = await Promise.all([
  read("lab/index.html"),
  read("lab/instrument-desk.css"),
  read("lab/instrument-desk-app.js"),
  read("lab/chord-lab.html"),
  read("scripts/build-preview.mjs"),
]);

assert.match(desk, /Guitar Explorer · Instrument Desk/);
assert.match(desk, /What do you want to look at\?/);
assert.match(desk, /id="theme-light"/);
assert.match(desk, /id="theme-dark"/);
assert.match(desk, /id="desk-board"/);
assert.match(desk, /id="my-music"/);

for (const route of [
  "/chord-lab.html",
  "/product-spine.html",
  "/role-lens.html",
  "/melody.html",
  "/voice-leading.html",
  "/accompaniment.html",
]) {
  assert.ok(desk.includes(`href="${route}"`), `Instrument Desk must retain a real link to ${route}`);
}

assert.match(chordLab, /Guitar Explorer · Chord Theory Lab/);
assert.doesNotMatch(chordLab, /instrument-desk-app\.js/);

assert.match(deskApp, /STANDARD_FRETBOARD/);
assert.match(deskApp, /createFretboard/);
assert.match(deskApp, /positions: \[\]/);
assert.match(deskApp, /connections: \[\]/);
assert.match(deskApp, /guitar-explorer-theme/);
assert.match(deskApp, /does not pretend song import is available yet/);
assert.doesNotMatch(deskApp, /src\/research|tests\/fixtures\/style|jf-cand/i);

assert.match(deskCss, /--ge-canvas: #f7f3ea/);
assert.match(deskCss, /--ge-accent: #25482f/);
assert.match(deskCss, /:root\[data-theme="dark"\]/);
assert.match(deskCss, /--ge-canvas: #211f1b/);
assert.match(deskCss, /--ge-accent: #c8d5a6/);
assert.match(deskCss, /--ge-wood-1/);

for (const required of ["instrument-desk.css", "instrument-desk-app.js", "chord-lab.html"]) {
  assert.ok(buildPreview.includes(`"${required}"`), `Preview build must require ${required}`);
}

assert.doesNotMatch(desk, /figma\.com\/api\/mcp\/asset/);
assert.doesNotMatch(deskCss, /figma\.com\/api\/mcp\/asset/);

console.log("Instrument Desk Practice Ready boundary checks passed.");
