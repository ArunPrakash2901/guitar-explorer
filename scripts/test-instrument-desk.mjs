import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const [desk, deskCss, deskApp, chordLab, sourceIndex, buildPreview, server, theme] = await Promise.all([
  read("lab/instrument-desk.html"), read("lab/instrument-desk.css"), read("lab/instrument-desk-app.js"),
  read("lab/chord-lab.html"), read("lab/index.html"), read("scripts/build-preview.mjs"),
  read("scripts/serve-lab.mjs"), read("lab/product-theme.js"),
]);
assert.match(desk, /Guitar Explorer · Practice/);
for (const id of ["theme-light", "theme-dark", "desk-board", "home-view", "runtime-view", "complete-view", "start-practice", "continue-practice"]) {
  assert.ok(desk.includes('id="' + id + '"'), id);
}
for (const route of ["/chord-lab.html", "/product-spine.html", "/role-lens.html", "/melody.html", "/voice-leading.html", "/accompaniment.html"]) {
  assert.equal(desk.includes('href="' + route + '"'), false, "legacy tools are not primary navigation");
}
// #71 explicitly replaces Home navigation, preserving accepted legacy experiences.
assert.match(chordLab, /Guitar Explorer · Chord Theory Lab/);
assert.equal(sourceIndex, chordLab);
assert.doesNotMatch(chordLab, /instrument-desk-app\.js/);
assert.match(deskApp, /musicQueries/);
assert.match(deskApp, /createFretboard/);
assert.match(deskApp, /intervalBoard/);
assert.match(deskApp, /composeIntervalSession/);
assert.match(theme, /guitar-explorer-theme/);
assert.doesNotMatch(desk, /My music|intent-disabled|Practice Ready slice|Chord Theory Lab/);
assert.doesNotMatch(deskApp, /src\/research|tests\/fixtures\/style|jf-cand/i);
assert.match(deskCss, /--ge-canvas: #f7f3ea/);
assert.match(deskCss, /--ge-accent: #25482f/);
assert.match(deskCss, /:root\[data-theme="dark"\]/);
assert.match(deskCss, /--ge-canvas: #211f1b/);
assert.match(deskCss, /--ge-accent: #c8d5a6/);
assert.match(deskCss, /--ge-wood-1/);
for (const required of ["instrument-desk.html", "instrument-desk.css", "instrument-desk-app.js", "chord-lab.html", "product-theme.js", "practice-material.mjs", "practice-plan.mjs", "sampled-guitar.mjs"]) {
  assert.ok(buildPreview.includes('"' + required + '"'), "preview output requirement: " + required);
}
assert.match(buildPreview, /deploymentChannel === "preview" \? "progression\.html" : "instrument-desk\.html"/);
assert.match(server, /return resolve\(labRoot, "instrument-desk\.html"\)/);
assert.match(server, /"\/chord-lab\.html"/);
assert.doesNotMatch(desk + deskCss, /figma\.com\/api\/mcp\/asset/);
console.log("Home/Practice entry and retained legacy route boundary checks passed.");
