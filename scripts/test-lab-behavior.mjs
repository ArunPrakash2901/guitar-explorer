import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

console.log(`Chord Lab focused behavior checks passed across ${catalogEntries.length} catalogue entries.`);
