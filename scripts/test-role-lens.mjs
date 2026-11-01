import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { accessibleText, createTestDOM, find, installRenderer } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import * as roleLensMaterial from "../lab/role-lens-material.mjs";

const html = await readFile(new URL("../lab/role-lens.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/role-lens-app.js", import.meta.url), "utf8");

assert.match(html, /Role Lens v0/);
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
assert.deepEqual(material.context.anchor.locations.map(({ position }) => [position.stringIndex, position.fret]), [[3, 5], [4, 1]]);
assert.deepEqual(material.transfer.anchor.locations.map(({ position }) => [position.stringIndex, position.fret]), [[3, 7], [4, 3]]);
assert.ok(material.context.endings.every(({ locations }) => locations.length > 0));
assert.ok(material.transfer.endings.every(({ locations }) => locations.length > 0));

function createPage() {
  const { document, root } = createTestDOM(html);
  document.body = find(root, (element) => element.tagName === "body");
  const context = vm.createContext({ ...engine, ...roleLensMaterial, document, console });
  installRenderer(context);
  const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
  vm.runInContext(executable, context, { filename: "role-lens-app.js" });
  const read = (expression) => vm.runInContext(expression, context);
  const $ = (id) => document.getElementById(id);
  const clickByData = (containerId, data) => {
    const button = find($(containerId), (element) => Object.entries(data).every(([key, value]) => element.dataset[key] === String(value)));
    assert.ok(button, `button exists in ${containerId}: ${JSON.stringify(data)}`);
    button.click();
  };
  return { document, root, read, $, clickByData, text: () => accessibleText(root) };
}

const page = createPage();
assert.equal(page.read("state.stage"), "hear");
assert.match(page.text(), /Keep one pitch fixed while the chords move/);
assert.match(page.text(), /Am7[\s\S]*D7[\s\S]*Gmaj7/);
assert.doesNotMatch(page.text(), /m3 · chord tone|m7 · chord tone|P4 · non-chord tone/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "predict");
assert.equal(page.$("primary-action").disabled, true);
page.clickByData("role-predictions", { chordIndex: 0, value: "tone" });
page.clickByData("role-predictions", { chordIndex: 1, value: "tone" });
page.clickByData("role-predictions", { chordIndex: 2, value: "outside" });
assert.equal(page.$("primary-action").disabled, false);
assert.doesNotMatch(page.text(), /m3 · chord tone|m7 · chord tone|P4 · non-chord tone/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "reveal");
assert.match(page.text(), /m3 · chord tone/);
assert.match(page.text(), /m7 · chord tone/);
assert.match(page.text(), /P4 · non-chord tone/);
assert.match(page.text(), /C4/);
assert.match(page.text(), /2 string, fret 1/);
assert.match(page.text(), /3 string, fret 5/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "use");
assert.equal(page.$("primary-action").disabled, true);
page.clickByData("ending-options", { value: "B3" });
assert.equal(page.read("state.mainEnding"), "B3");
assert.equal(page.$("primary-action").disabled, false);
assert.match(page.text(), /B3 is M3 of Gmaj7/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "variation");
assert.match(page.text(), /Change the phrase without losing the decision/);
page.$("primary-action").click();

assert.equal(page.read("state.stage"), "transfer-hear");
assert.match(page.text(), /Bm7[\s\S]*E7[\s\S]*Amaj7/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-predict");
const transferContent = "transfer-content";
page.clickByData(transferContent, { chordIndex: 0, value: "tone" });
page.clickByData(transferContent, { chordIndex: 1, value: "tone" });
page.clickByData(transferContent, { chordIndex: 2, value: "outside" });
assert.equal(page.$("primary-action").disabled, false);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-reveal");
assert.match(page.text(), /D4/);
assert.match(page.text(), /m3 · chord tone/);
assert.match(page.text(), /m7 · chord tone/);
assert.match(page.text(), /P4 · non-chord tone/);
assert.match(page.text(), /2 string, fret 3/);
assert.match(page.text(), /3 string, fret 7/);

page.$("primary-action").click();
assert.equal(page.read("state.stage"), "transfer-create");
page.clickByData("transfer-content", { value: "C#4" });
assert.equal(page.read("state.transferEnding"), "C#4");
assert.match(page.text(), /C#4 is M3 of Amaj7/);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "reflect");
page.clickByData("reflection-options", { value: "created" });
assert.equal(page.$("primary-action").disabled, false);
page.$("primary-action").click();
assert.equal(page.read("state.stage"), "complete");
assert.match(page.text(), /mastery is not claimed/i);
assert.match(page.text(), /genuinely different useful learner actions/i);

console.log("Role Lens v0 checks passed through hear, role reveal, deliberate use, variation, transfer and reflection.");
