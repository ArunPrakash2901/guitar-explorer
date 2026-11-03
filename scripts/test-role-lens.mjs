import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { accessibleText, createTestDOM, find, installRenderer } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import * as roleLensMaterial from "../lab/role-lens-material.mjs";

const html = await readFile(new URL("../lab/role-lens.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/role-lens-app.js", import.meta.url), "utf8");

assert.match(html, /Guitar Explorer · Role Lens/);
assert.match(html, /HEAR[\s\S]*ROLE[\s\S]*USE[\s\S]*TRANSFER[\s\S]*REFLECT/);
assert.match(html, /href="\/product-spine\.html"/);
assert.doesNotMatch(html, /m3[^<]*chord tone|m7[^<]*chord tone|P4[^<]*non-chord/);
assert.doesNotMatch(app, /AudioContext|localStorage|indexedDB|fetch\(|setInterval/);
assert.doesNotMatch(app, /ExerciseRecipe|ContextLayer|LearningEngine/);

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.data;
}

const material = roleLensMaterial.createRoleLensMaterial({
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(engine.musicQueries.getChordCatalog({})),
  analyseNotes: (request) => unwrap(engine.musicQueries.analyseNotes(request)),
  findLocations: ({ key, chord, pitch }) => {
    const [analysis] = unwrap(engine.musicQueries.analyseNotes({ notes: [pitch], context: { key } }));
    return unwrap(engine.musicQueries.getFretboardLocations({
      board: engine.STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 12 },
      pitchClasses: [analysis.pitchClass],
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    }));
  },
  formatNote: engine.formatNote,
});

assert.deepEqual(material.context.chords.map(({ symbol }) => symbol), ["Am7", "D7", "Gmaj7"]);
assert.deepEqual(material.context.anchor.analyses.map(({ chordRelation }) => [chordRelation.interval.label, chordRelation.isChordTone]), [
  ["m3", true],
  ["m7", true],
  ["P4", false],
]);
assert.deepEqual(material.transfer.chords.map(({ symbol }) => symbol), ["Bm7", "E7", "Amaj7"]);
assert.deepEqual(material.transfer.anchor.analyses.map(({ chordRelation }) => [chordRelation.interval.label, chordRelation.isChordTone]), [
  ["m3", true],
  ["m7", true],
  ["P4", false],
]);
assert.equal(material.context.anchor.pitch.letter, "C");
assert.equal(material.transfer.anchor.pitch.letter, "D");

function createPage() {
  const { document, root } = createTestDOM(html);
  document.body = find(root, (element) => element.tagName === "body");
  const context = vm.createContext({ ...engine, ...roleLensMaterial, document, console });
  installRenderer(context);
  const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
  vm.runInContext(executable, context, { filename: "role-lens-app.js" });
  const read = (expression) => vm.runInContext(expression, context);
  const $ = (id) => document.getElementById(id);
  return { document, root, read, $, text: () => accessibleText(root) };
}

const page = createPage();
assert.equal(page.read("state.stage"), "hear");
assert.match(page.text(), /Am7[\s\S]*D7[\s\S]*Gmaj7/);
assert.doesNotMatch(page.text(), /m3 · chord tone|m7 · chord tone|P4 · non-chord tone/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "predict");
assert.equal(page.$("primary-action").disabled, true);
for (const [index, value] of [[0, "chord"], [1, "chord"], [2, "non"]]) {
  const row = page.$("role-predictions").children[index];
  const button = find(row, (element) => element.dataset.value === value);
  assert.ok(button, `${value} choice exists for role row ${index}`);
  button.click();
}
assert.equal(page.$("primary-action").disabled, false);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "reveal");
assert.match(page.text(), /m3 · chord tone/);
assert.match(page.text(), /m7 · chord tone/);
assert.match(page.text(), /P4 · non-chord tone/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "use");
assert.equal(page.$("primary-action").disabled, true);
const ending = find(page.$("ending-options"), (element) => element.dataset.value === "anchor");
assert.ok(ending);
ending.click();
assert.equal(page.$("primary-action").disabled, false);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "variation");
assert.match(page.text(), /Keep the ending/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer");
assert.match(page.text(), /A major/);
assert.match(page.text(), /D4/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "reflect");
assert.equal(page.$("primary-action").disabled, true);
const reflection = find(page.$("reflection-options"), (element) => element.dataset.value === "clearer");
assert.ok(reflection);
reflection.click();
assert.equal(page.$("primary-action").disabled, false);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "complete");
assert.match(page.text(), /no mastery claim/i);

console.log("Role Lens checks passed through HEAR, ROLE, USE, variation, TRANSFER and reflection with deterministic role facts hidden until commitment.");
