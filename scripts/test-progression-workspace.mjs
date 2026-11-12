import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createLabServer } from "./serve-lab.mjs";

const server = createLabServer();
try {
  await once(server.listen(0, "127.0.0.1"), "listening");
  const origin = "http://127.0.0.1:" + server.address().port;

  async function get(path, contentType) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), contentType, path);
    return response.text();
  }

  const page = await get("/progression.html", /^text\/html/);
  assert.equal(await get("/progression", /^text\/html/), page);
  assert.match(page, /(?:src|href)=["'](?:\.\/|\/)?progression-workspace\.mjs["']/);
  assert.match(page, /href=["'](?:\.\/|\/)?progression\.css["']/);
  assert.doesNotMatch(page, /session-evidence\.mjs/);
  await get("/progression.css", /^text\/css/);
  for (const asset of [
    "/progression-workspace.mjs", "/progression-diagram.mjs",
    "/progression-sample-bank.mjs", "/progression-guitar-manifest.mjs", "/progression-electric-manifest.mjs", "/progression-selection.mjs", "/progression-fretboard.mjs", "/progression-tone-label.mjs", "/progression-rhythm.mjs", "/progression-grooves.mjs", "/progression-groove-editor.mjs", "/progression-drum-samples.mjs", "/progression-audio.mjs", "/progression-library.mjs", "/progression-library-view.mjs", "/progression-image.mjs",
    "/progression/caged.js", "/progression/generator.js", "/progression/voicings.js", "/progression/workspace.js", "/engine/index.js",
  ]) {
    assert.ok((await get(asset, /^text\/javascript/)).trim().length, asset);
  }
  assert.equal(await get("/", /^text\/html/), page);
  assert.match(await get("/instrument-desk.html", /^text\/html/), /instrument-desk-app\.js/);
  const outsideBuild = await fetch(origin + "/progression/%2e%2e%2fengine%2findex.js");
  assert.equal(outsideBuild.status, 404, "compiled progression routes stay within their own directory");
} finally {
  const close = once(server, "close");
  server.close();
  await close;
}

const outputRoot = new URL("../.preview-dist/", import.meta.url);
const previewPage = await readFile(new URL("progression.html", outputRoot), "utf8");
const stamp = encodeURIComponent(process.env.GE_REVISION || process.env.GITHUB_SHA || "local");
assert.ok(previewPage.includes('src="./progression-workspace.mjs?ge-revision=' + stamp + '"'));
assert.ok(previewPage.includes('href="./progression.css?ge-revision=' + stamp + '"'));
assert.doesNotMatch(previewPage, /session-evidence\.mjs/);
assert.equal(await readFile(new URL("index.html", outputRoot), "utf8"), previewPage);
const previewEntry = await readFile(new URL("progression-workspace.mjs", outputRoot), "utf8");
assert.match(previewEntry, /\.\/progression-diagram\.mjs\?ge-revision=/);
const generatorFile = new URL("progression/generator.js", outputRoot);
const voicingsFile = new URL("progression/voicings.js", outputRoot);
const { parseNote, formatNote } = await import(new URL("engine/index.js", outputRoot));
const { generateProgression } = await import(generatorFile);
const { getPlayableVoicings, chordDiagramModel } = await import(voicingsFile);
const progression = generateProgression({
  tonic: parseNote("Db"),
  mode: "mixolydian",
  seed: 0,
  lockedSlots: ["Db", "Ab", "Gb", "Db"].map((root, slotIndex) => ({
    slotIndex,
    root: parseNote(root),
    chordId: slotIndex === 1 ? "minor" : "major",
  })),
});
assert.ok(progression.ok);
assert.deepEqual(progression.data.slots.map(({ romanNumeral }) => romanNumeral), ["I", "v", "IV", "I"]);
const { chord } = progression.data.slots[1];
assert.deepEqual(chord.tones.map(({ note }) => formatNote(note)), ["Ab", "Cb", "Eb"]);
const [grip] = getPlayableVoicings(chord);
assert.ok(grip);
assert.equal(chordDiagramModel(grip).strings.length, 6);
const { buildChord } = await import(new URL("engine/index.js", outputRoot));
const { renderChordDiagram } = await import(new URL("progression-diagram.mjs", outputRoot));
const extended = buildChord({ root: parseNote("C"), chordId: "add9" });
const extendedGrip = getPlayableVoicings(extended)[0];
assert.match(renderChordDiagram(chordDiagramModel(extendedGrip), "Cadd9", {
  chord: extended, voicing: extendedGrip, labels: "intervals", highlight: "triad",
}), />9<\/text>/);
console.log("progression workspace routes, static assets and compiled musical output checks passed");
