import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import * as session from "../lab/session-logic.mjs";
import { all, createTestDOM, find, installRenderer } from "./fretboard-test-dom.mjs";
import {
  STANDARD_FRETBOARD,
  musicQueries,
  parseNote,
  parsePitch,
} from "../.lab-dist/engine/index.js";
import {
  createSelection,
  createSessionPlan,
  degreeLabel,
  formulaLabel,
  reconstructionRoles,
  reflectionNextHidden,
  resetSessionState,
  selectAllInFamily,
  selectFamily,
  timerSnapshot,
  toggleChordSelection,
  windowForFret,
} from "../lab/session-logic.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.data;
}

const catalog = unwrap(musicQueries.getChordCatalog({}));
const catalogEntries = catalog.flatMap(({ chords }) => chords);

const state = {
  stageIndex: 12,
  mapRoleIndex: 3,
  savedMap: [{ label: "1" }],
  timerRemaining: 0,
  timerDeadlineMs: 123,
  timerStarted: true,
  timerFinished: true,
  reflection: "shape took over",
  selected: { stringIndex: 3, fret: 5 },
  checked: true,
  hintLevel: 3,
  lastWrong: { note: "D" },
  theoryRevealed: true,
};

resetSessionState(state);
assert.equal(state.stageIndex, 0);
assert.equal(state.reflection, null);
assert.equal(state.timerStarted, false);
assert.equal(state.timerFinished, false);
assert.equal(state.timerRemaining, 35);
assert.deepEqual(state.savedMap, []);
assert.equal(reflectionNextHidden(state.reflection), true);
assert.equal(reflectionNextHidden("no clear breakdown"), false);

const start = 1_000;
const deadline = start + 35_000;
assert.deepEqual(timerSnapshot(deadline, start), { remaining: 35, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, start + 5_000), { remaining: 30, finished: false, phase: "REST" });
assert.deepEqual(timerSnapshot(deadline, start + 10_000), { remaining: 25, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, start + 12_400), { remaining: 23, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, deadline), { remaining: 0, finished: true, phase: "DONE" });
assert.deepEqual(timerSnapshot(deadline, deadline + 9_000), { remaining: 0, finished: true, phase: "DONE" });

const triads = catalog.find(({ id }) => id === "triads");
assert.ok(triads);
let selection = createSelection(triads.id);
assert.deepEqual(selection.chordIds, []);
selection = toggleChordSelection(selection, "major", true);
selection = toggleChordSelection(selection, "minor", true);
selection = toggleChordSelection(selection, "major", false);
assert.deepEqual(selection.chordIds, ["minor"]);
assert.deepEqual(selectAllInFamily(triads).chordIds, triads.chords.map(({ id }) => id));
assert.deepEqual(selectFamily(selection, "seventh"), { familyId: "seventh", chordIds: [] });
assert.deepEqual(windowForFret(0), { minFret: 0, maxFret: 4 });
assert.deepEqual(windowForFret(12), { minFret: 8, maxFret: 12 });
assert.throws(() => windowForFret(13), RangeError);
assert.equal(degreeLabel({ degree: 7, alteration: -2 }), "♭♭7");
assert.equal(formulaLabel([{ degree: 1, alteration: 0 }, { degree: 13, alteration: 0 }]), "1 · 13");

function buildChord(rootName, chordId) {
  return unwrap(musicQueries.getChord({ root: parseNote(rootName), chordId }));
}

function findLocations({ rootName, chordId, tone, stringIndices }) {
  return unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 12 },
    ...(stringIndices ? { stringIndices } : {}),
    pitchClasses: [tone.pitchClass],
    root: parseNote(rootName),
    context: { currentChord: { root: parseNote(rootName), chordId } },
  }));
}

function assertTaskIsEngineDerived(source, task, stringIndices) {
  const valid = findLocations({
    rootName: source.rootName,
    chordId: source.chordId,
    tone: task.tone,
    stringIndices,
  });
  assert.ok(valid.some(({ position }) =>
    position.stringIndex === task.plannedLocation.position.stringIndex
    && position.fret === task.plannedLocation.position.fret));
  assert.equal(task.stringIndex, task.plannedLocation.position.stringIndex);
  assert.ok(task.plannedLocation.position.fret >= task.fretWindow.minFret);
  assert.ok(task.plannedLocation.position.fret <= task.fretWindow.maxFret);
  assert.ok(task.plannedLocation.chordRelation?.matchingTones.some(({ degree, alteration }) =>
    degree === task.tone.degree && alteration === task.tone.alteration));
}

for (const family of catalog) {
  for (const entry of family.chords) {
    const selected = { familyId: family.id, chordIds: [entry.id] };
    const plan = createSessionPlan({
      catalog,
      selection: selected,
      buildChord,
      findLocations,
      rng: () => 0,
    });

    assert.equal(plan.primary.chordId, entry.id);
    assert.equal(plan.transfer.chordId, entry.id);
    assert.notEqual(plan.primary.rootName, plan.transfer.rootName);
    assert.ok(Object.isFrozen(plan));
    assert.ok(Object.isFrozen(plan.primary.focusTask));
    assertTaskIsEngineDerived(plan.primary, plan.primary.rootTask);
    assertTaskIsEngineDerived(plan.primary, plan.primary.focusTask);
    if (plan.primary.secondaryTask) assertTaskIsEngineDerived(plan.primary, plan.primary.secondaryTask);
    for (const task of plan.primary.reconstruction) {
      assertTaskIsEngineDerived(plan.primary, task, [plan.primary.mapStringIndex]);
    }
    assertTaskIsEngineDerived(plan.transfer, plan.transfer.rootTask);
    assertTaskIsEngineDerived(plan.transfer, plan.transfer.focusTask);
    assert.deepEqual(
      { degree: plan.transfer.focusTask.tone.degree, alteration: plan.transfer.focusTask.tone.alteration },
      { degree: plan.primary.focusTask.tone.degree, alteration: plan.primary.focusTask.tone.alteration },
    );

    if (plan.primary.chord.tones.length <= 4) {
      assert.equal(plan.primary.reconstruction.length, plan.primary.chord.tones.length);
    } else {
      assert.ok(plan.primary.reconstruction.length <= 4);
    }
    if (["ninth", "eleventh", "thirteenth"].includes(family.id)) {
      assert.ok(plan.primary.reconstruction.some(({ tone }) => tone.degree > 7));
    }

    const variation = createSessionPlan({
      catalog,
      selection: selected,
      buildChord,
      findLocations,
      rng: () => 0,
      previousPlan: plan,
    });
    assert.notEqual(variation.primary.rootName, plan.primary.rootName);
    assert.notDeepEqual(variation, plan);
  }
}

assert.throws(() => createSessionPlan({
  catalog,
  selection: { familyId: "triads", chordIds: [] },
  buildChord,
  findLocations,
  rng: () => 0,
}), /Select at least one chord quality/);
assert.throws(() => createSessionPlan({
  catalog,
  selection: { familyId: "triads", chordIds: ["major7"] },
  buildChord,
  findLocations,
  rng: () => 0,
}), /selected family/);
assert.throws(() => createSessionPlan({
  catalog,
  selection: { familyId: "triads", chordIds: ["major"] },
  buildChord,
  findLocations,
  rng: () => 1,
}), /Random source/);

const dominantThirteen = buildChord("C", "dominant13");
const thirteen = dominantThirteen.tones.find(({ degree }) => degree === 13);
assert.equal(thirteen.interval.label, "M13");
assert.equal(unwrap(musicQueries.getInterval({ from: parsePitch("C3"), to: parsePitch("A3") })).label, "M6");
assert.ok(reconstructionRoles(dominantThirteen, thirteen).some(({ degree }) => degree === 13));

const app = await readFile(new URL("../lab/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../lab/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(app, /aria-pressed/);
assert.match(app, /Chord role/);
assert.match(app, /Canonical formula interval/);
assert.match(app, /Played interval from anchor/);
assert.match(app, /Chord membership/);
assert.match(app, /matchingTones/);
assert.match(app, /outside.*chordSymbol/s);
assert.match(app, /from "\/session-logic\.mjs"/);
assert.match(app, /New variation/);
assert.match(html, /No clear breakdown/);
assert.match(html, /Change material/);
assert.match(html, /id="family-grid"/);
assert.match(html, /id="quality-list"/);
assert.match(html, /id="select-all"/);
assert.match(html, /id="clear-all"/);
assert.match(html, /id="start-session"/);
assert.doesNotMatch(html, /C versus C#/);
assert.doesNotMatch(html, /C can be ♭3/);
assert.match(server, /\["\.mjs", "text\/javascript; charset=utf-8"\]/);
assert.match(server, /pathname === "\/session-logic\.mjs"/);

// Execute the real Chord Lab callbacks with the shared renderer, rather than
// checking only source strings or mirroring the renderer implementation.
const dom = createTestDOM(html);
const intervals = new Map(); let now = 1000; let timerId = 0;
const context = vm.createContext({
  ...engine, ...session, document: dom.document, console,
  performance: { now: () => now },
  setInterval(callback) { intervals.set(++timerId, callback); return timerId; },
  clearInterval(id) { intervals.delete(id); },
  createSessionPlan(options) { return session.createSessionPlan({ ...options, rng: () => 0 }); },
});
installRenderer(context);
vm.runInContext(app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, ""), context, { filename: "app.js" });
const read = (expression) => vm.runInContext(expression, context);
const $ = dom.$;
const boardItems = (className) => all($("string-board"), (item) => item.classList.contains(className));
function chooseTaskFret(fret) {
  const task = read("currentTask()");
  const button = find($("string-board"), (item) => item.tagName === "button"
    && item.dataset.stringIndex === String(task.stringIndex) && item.dataset.fret === String(fret));
  assert.ok(button); button.focus(); button.click();
  assert.equal(dom.document.activeElement, button, "A Chord Lab selection preserves keyboard focus");
  assert.equal(button.getAttribute("aria-pressed"), "true");
}
function solveTask() {
  chooseTaskFret(read("currentTask().plannedLocation.position.fret"));
  $("check-button").click();
}
const major = find($("quality-list"), (item) => item.tagName === "input" && item.value === "major");
major.checked = true; major.dispatch("change");
assert.equal($("start-session").disabled, false);
$("start-session").click(); $("done-button").click();
assert.equal(read("currentStage().kind"), "target");
assert.equal(boardItems("fb-string").length, 6);
assert.deepEqual(boardItems("fb-string").map((item) => Number(item.dataset.stringIndex)), [5, 4, 3, 2, 1, 0]);
assert.ok(boardItems("fb-primary-label").every((item) => item.textContent === ""), "The hidden target has no note labels even in its DOM");
assert.ok(boardItems("fb-position").every((item) => !item.getAttribute("aria-label").includes(", role")));
const firstTask = read("currentTask()");
const wrong = firstTask.plannedLocation.position.fret === firstTask.fretWindow.minFret
  ? firstTask.fretWindow.maxFret : firstTask.fretWindow.minFret;
chooseTaskFret(wrong); $("check-button").click();
assert.equal(read("state.checked"), false);
assert.equal(boardItems("is-incorrect").length, 1);
assert.equal($("theory-panel").hidden, true);
$("hint-button").click(); assert.equal(read("state.hintLevel"), 1);
assert.match($("feedback").textContent, /canonical formula interval/);
$("hint-button").click(); assert.match($("feedback").textContent, /chord spelling/);
solveTask();
assert.equal(read("state.checked"), true);
assert.equal(boardItems("is-correct").length, 1);
assert.equal($("theory-panel").hidden, false);
$("next-button").click();
assert.equal(read("state.checked"), false);
assert.equal(read("state.hintLevel"), 0);
assert.equal(boardItems("is-incorrect").length, 0);
assert.equal(boardItems("is-correct").length, 0);
while (read("currentStage().kind") === "target" && read("currentStage().source") === "primary") {
  solveTask(); $("next-button").click();
}
assert.equal(read("currentStage().kind"), "map");
const mapCount = read("state.plan.primary.reconstruction.length");
for (let index = 0; index < mapCount; index += 1) solveTask();
assert.equal(read("state.savedMap.length"), mapCount);
$("next-button").click();
assert.equal(read("currentStage().source"), "transfer");
assert.equal(read("state.checked"), false);
assert.equal($("theory-panel").hidden, true);
assert.equal(boardItems("is-correct").length, 0);
assert.equal(boardItems("is-incorrect").length, 0);
assert.equal(boardItems("fb-connection").length, 0);
assert.ok(boardItems("fb-primary-label").every((item) => item.textContent === ""), "A fresh hidden transfer cannot retain mapped role labels from the previous chord");
solveTask(); $("next-button").click();
if (read("currentStage().kind") === "contrast") { $("reveal-button").click(); $("next-button").click(); }
assert.equal(read("currentStage().kind"), "musicalize");
assert.equal($("string-board").children.length, 0, "A non-fret stage removes revealed fret labels from hidden DOM");
$("timer-start").click();
now += 35400; for (const callback of [...intervals.values()]) callback();
assert.equal(read("state.timerFinished"), true, "A delayed callback still finishes by elapsed time");
$("timer-next").click();
assert.equal($("reflection-next").hidden, true);
const reflection = dom.document.querySelectorAll('input[name="breakdown"]').find((item) => item.value === "none");
reflection.checked = true; $("reflection-submit").click(); $("reflection-next").click();
assert.equal(read("currentStage().kind"), "complete");
$("restart-button").click();
assert.equal(read("state.stageIndex"), 0);
assert.equal(read("state.reflection"), null);
assert.equal(read("state.savedMap.length"), 0);
$("done-button").click();
assert.ok(boardItems("fb-primary-label").every((item) => item.textContent === ""), "A new variation removes revealed labels");
assert.equal(boardItems("is-selected").length, 0);
assert.equal(boardItems("is-incorrect").length, 0);

console.log(`Chord Lab focused behavior checks passed across ${catalogEntries.length} catalogue entries.`);
