import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INTERESTING_MATERIALS,
  cantStopPractice,
  evidenceBoundary,
  loadInterestingMaterials,
} from "../lab/interesting-material.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const readJson = async (path) => JSON.parse(await read(path));

const fixturePaths = Object.freeze({
  "jf-cand-004.json": "tests/fixtures/style/jf-cand-004.json",
  "jf-cand-011.json": "tests/fixtures/style/jf-cand-011.json",
  "jf-cand-012.json": "tests/fixtures/style/jf-cand-012.json",
});

const fixtures = Object.fromEntries(await Promise.all(Object.entries(fixturePaths).map(async ([name, path]) => [name, await readJson(path)])));

assert.deepEqual(
  INTERESTING_MATERIALS.map((item) => item.id),
  ["JF-CAND-012", "JF-CAND-004", "JF-CAND-011"],
  "The learner view should stay bounded to the three merged diagnostic fixtures",
);

const loaded = await loadInterestingMaterials({
  fetchImpl: async (url) => {
    const value = fixtures[basename(new URL(url).pathname)];
    return value
      ? { ok: true, json: async () => structuredClone(value) }
      : { ok: false, json: async () => null };
  },
});
assert.equal(loaded.length, 3);
assert.deepEqual(loaded.map((item) => item.fragment.id), ["JF-CAND-012", "JF-CAND-004", "JF-CAND-011"]);

const cantStop = fixtures["jf-cand-012.json"];
const boundary = evidenceBoundary(cantStop);
assert.ok(boundary.unknown.some((item) => item.id === "cs-studio-unknown"));
assert.ok(boundary.contested.some((item) => item.id === "cs-a5"));
assert.ok(!boundary.supported.some((item) => item.id === "cs-a5"), "Contested A-string candidate must not be presented as supported evidence");
assert.ok(boundary.alternatives.some((item) => item.id === "cs-d-position" && item.status === "unresolved"));

const practice = cantStopPractice(cantStop);
assert.equal(practice.studioPitch.value.pitch, "D3");
assert.equal(practice.studioPosition.status, "unknown");
assert.deepEqual(practice.studioPosition.value, { stringIndex: null, fret: null });
assert.deepEqual(
  practice.candidates.map((item) => ({ id: item.id, stringIndex: item.value.stringIndex, fret: item.value.fret, status: item.status })),
  [
    { id: "cs-open-d", stringIndex: 2, fret: 0, status: "reported" },
    { id: "cs-a5", stringIndex: 1, fret: 5, status: "contested" },
  ],
);
assert.deepEqual(practice.mutedStroke.value.pitched, [{ stringIndex: 3, fret: 7 }]);
assert.deepEqual(practice.mutedStroke.value.mutedStringIndices, [0, 1, 2, 4, 5]);
assert.ok(!practice.mutedStroke.value.mutedStringIndices.includes(practice.mutedStroke.value.pitched[0].stringIndex));
assert.equal(practice.alternative.status, "unresolved");

const [html, app, adapter, instrumentDeskApp, buildPreview, server, packageJson] = await Promise.all([
  read("lab/my-music.html"),
  read("lab/my-music-app.js"),
  read("lab/interesting-material.mjs"),
  read("lab/instrument-desk-app.js"),
  read("scripts/build-preview.mjs"),
  read("scripts/serve-lab.mjs"),
  read("package.json"),
]);

assert.match(html, /What caught your ear\?/);
assert.match(html, /selective research fragments, not complete transcriptions/);
assert.match(html, /What the sources support/);
assert.match(html, /Still uncertain/);
assert.match(html, /neutral synthesized pitch reference only/);
assert.match(html, /your practice choice/);
assert.match(html, /id="material-practice"/);

assert.match(app, /states: \["common"\]/, "Both D3 positions should use the same candidate visual state");
assert.match(app, /Neither position is marked correct/);
assert.match(app, /muted strings are intentionally not assigned pitches/);
assert.match(app, /parsePitch\("D3"\)/);
assert.doesNotMatch(app, /correct.*cs-open-d|incorrect.*cs-a5|correct.*cs-a5|incorrect.*cs-open-d/i);
assert.doesNotMatch(app, /derivePosition|keyDegree|chordRole/, "The first learner task should not surface assumption-dependent harmonic analysis as truth");

assert.match(adapter, /\.\/research\/style\/\$\{filename\}/);
assert.doesNotMatch(adapter, /const\s+cantStop\s*=|"observations"\s*:/, "The product adapter must load, not duplicate, research fixtures");
assert.match(instrumentDeskApp, /new URL\("\.\/my-music\.html", import\.meta\.url\)/);
assert.doesNotMatch(instrumentDeskApp, /research contract is under review/);

for (const expected of [
  "my-music.html",
  "my-music.css",
  "my-music-app.js",
  "interesting-material.mjs",
  "research/style/jf-cand-004.json",
  "research/style/jf-cand-011.json",
  "research/style/jf-cand-012.json",
]) {
  assert.ok(buildPreview.includes(expected), `Preview build must publish ${expected}`);
}
assert.match(buildPreview, /tests["']\s*,\s*["']fixtures["']\s*,\s*["']style/);
assert.match(server, /\/research\/style\//);
assert.match(server, /my-music\.html/);
assert.match(server, /application\/json/);
assert.match(packageJson, /test-interesting-material\.mjs/);

console.log("Interesting Material v0 provenance and learner boundary checks passed.");
