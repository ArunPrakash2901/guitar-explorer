import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createTestDOM, installRenderer, all, accessibleText } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import { chordRole, pathConnections } from "../lab/phrase-material.mjs";
import { getMelodyScenarios, getMotifScenarios, getScenarioById } from "../lab/scenario-catalogue.mjs";
import { resolveScenario, ScenarioError } from "../lab/scenario-resolver.mjs";
import { createMelodyPlan } from "../lab/melody-session.mjs";
import { createMotifPlan } from "../lab/motif-session.mjs";
import { prepareMelodyExperience, prepareDistinctMelodyExperience, createPhraseQueries } from "../lab/melody-experience.mjs";

function unwrap(result) { assert.equal(result.ok, true, result.ok ? undefined : result.error.message); return result.data; }
const queries = {
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getScale: (request) => unwrap(engine.musicQueries.getScale(request)),
  getCatalog: (request) => unwrap(engine.musicQueries.getChordCatalog(request)),
  findLocations: ({ key, chord, stringIndices, fretRange, pitchClasses }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD, stringIndices, fretRange, pitchClasses,
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getNoteAtFret: ({ key, chord, stringIndex, fret }) => unwrap(engine.musicQueries.getNoteAtFret({
    board: engine.STANDARD_FRETBOARD, position: { stringIndex, fret },
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)), formatNote: engine.formatNote,
};
const name = (location) => engine.formatNote(location.pitch.note);
const melodies = getMelodyScenarios(); const motifs = getMotifScenarios();
assert.equal(melodies.length, 3); assert.equal(motifs.length, 3);
assert.equal(getScenarioById(melodies[0].id), melodies[0]);
assert.equal(getScenarioById("nonexistent"), undefined);
const ids = [...melodies, ...motifs].map(({ id }) => id);
assert.equal(new Set(ids).size, 6);
for (const spec of [...melodies, ...motifs]) assert.deepEqual(JSON.parse(JSON.stringify(spec)), spec);

function invalid(change, path) {
  const spec = structuredClone(melodies[0]); change(spec);
  assert.throws(() => resolveScenario(spec, queries), (error) => error instanceof ScenarioError && error.path.startsWith(path), path);
}
invalid((s) => { s.version = 2; }, "scenario.version");
invalid((s) => { delete s.context; }, "scenario.context");
invalid((s) => { s.unexpected = true; }, "scenario.unexpected");
invalid((s) => { s.type = "rhythm"; }, "scenario.type");
invalid((s) => { s.context.key.tonic.letter = "H"; }, "scenario.context.key");
invalid((s) => { s.context.degrees[0] = 8; }, "scenario.context.degrees");
invalid((s) => { s.targets.target.degree = 9; }, "scenario.targets");
invalid((s) => { s.fretboard.main.maxFret = 1; }, "scenario.fretboard");
invalid((s) => { s.melody.phraseLead[0].scaleDegree = 9; }, "scenario.melody.phraseLead");
invalid((s) => { s.melody.approachScaleDegree = 5; }, "scenario.melody.approachScaleDegree");
const brokenMotif = structuredClone(motifs[0]); brokenMotif.motif.sequence.upperScaleDegree = 6;
assert.throws(() => resolveScenario(brokenMotif, queries), (error) => error instanceof ScenarioError && error.path === "scenario.motif.sequence");

const resolved = new Map([...melodies, ...motifs].map((spec) => [spec.id, resolveScenario(spec, queries)]));
for (const spec of [...melodies, ...motifs]) {
  const material = resolved.get(spec.id);
  const repeat = resolveScenario(spec, queries);
  assert.equal(JSON.stringify(material), JSON.stringify(repeat), `${spec.id}: deterministic JSON facts`);
  assert.ok(Object.isFrozen(material.main.chords));
  assert.equal(material.main.chords.length, spec.context.degrees.length);
  for (const ctx of [material.main, material.transfer]) {
    for (const [kind, role] of Object.entries(spec.targets)) {
      const location = ctx[kind]; const analysis = ctx.at(role.chordIndex, location.position.stringIndex, location.position.fret);
      assert.equal(location.pitch.note.letter, ctx.tone(role.chordIndex, role.degree).note.letter);
      assert.equal(location.pitch.note.accidental, ctx.tone(role.chordIndex, role.degree).note.accidental);
      assert.equal(analysis.chordRelation.spellingMatches, true);
      assert.ok(analysis.chordRelation.matchingTones.some(({ degree }) => degree === role.degree));
      assert.ok(ctx.boardRange.strings.includes(location.position.stringIndex));
      assert.ok(location.position.fret >= ctx.boardRange.minFret && location.position.fret <= ctx.boardRange.maxFret);
    }
  }
  assert.equal(material.main.targetMotion.diatonicSteps, material.transfer.targetMotion.diatonicSteps);
  assert.equal(material.main.targetMotion.semitones, material.transfer.targetMotion.semitones);
}

const regression = resolved.get("melody-g-ii-v-i"); const melody = createMelodyPlan(regression);
assert.deepEqual(regression.main.chords.map(({ symbol }) => symbol), ["Am7", "D7", "Gmaj7"]);
assert.deepEqual(regression.transfer.chords.map(({ symbol }) => symbol), ["Bm7", "E7", "Amaj7"]);
assert.deepEqual(regression.main.chords.map(({ entry }) => entry.romanNumeral.label), ["ii7", "V7", "Imaj7"]);
assert.deepEqual(regression.main.chords.map(({ chord }) => chord.tones.map(({ note }) => engine.formatNote(note))),
  [["A", "C", "E", "G"], ["D", "F#", "A", "C"], ["G", "B", "D", "F#"]]);
assert.equal(name(regression.main.target), "F#"); assert.equal(regression.main.target.position.fret, 2);
assert.equal(name(regression.main.arrival), "G"); assert.equal(regression.main.arrival.position.fret, 3);
assert.equal(regression.main.targetMotion.semitones, 1);
assert.equal(chordRole(regression.main.at(1, 5, 2)), "3rd");
assert.match(chordRole({ chordRelation: { matchingTones: [{ degree: 3 }], spellingMatches: false } }), /written spelling differs/);
assert.equal(regression.main.at(1, 5, 2).keyRelation.degree, 7);
assert.deepEqual(regression.main.sameRoles.map(chordRole), ["♭7", "outside the chord", "root"]);
assert.deepEqual(regression.main.sameRoles.map((item) => item.keyRelation.degree), [1, 1, 1]);
assert.equal(name(regression.main.approach), "E");
assert.deepEqual(regression.main.phrase.map(name), ["D", "E", "F#", "G"]);
assert.equal(pathConnections(regression.main.phrase).length, 3);
assert.equal(name(regression.transfer.target), "G#"); assert.equal(regression.transfer.target.position.fret, 4);
assert.equal(name(regression.transfer.arrival), "A"); assert.equal(regression.transfer.arrival.position.fret, 5);
assert.equal(melody.evaluate(melody.stages[1], 1).correct, false);
assert.equal(melody.evaluate(melody.stages[1], 2).correct, true);
assert.equal(melody.evaluate(melody.stages[7], 2).correct, false);
assert.equal(melody.evaluate(melody.stages[7], 4).correct, true);
assert.match(melody.explanation(melody.stages[2]).join(" "), /G over Am7.*♭7.*G over D7.*outside.*G over Gmaj7.*root/);
assert.match(melody.explanation(melody.stages[4]).join(" "), /approach to F#/);
for (const spec of melodies) {
  const material = resolved.get(spec.id); const plan = createMelodyPlan(material);
  assert.equal(plan.stages.length, 10);
  for (const stage of plan.stages) {
    assert.ok(stage.prompt && stage.instruction);
    assert.ok(Array.isArray(plan.explanation(stage)));
    if (stage.kind === "select") {
      assert.equal(plan.evaluate(stage, stage.answer.position.fret).correct, true, `${spec.id}:${stage.id}`);
      assert.equal(plan.evaluate(stage, -1).correct, false);
    }
  }
  assert.equal(plan.phraseConnections.length, 3);
  assert.equal(plan.targetConnections(material.main).length, 1);
}
assert.deepEqual(resolved.get("melody-c-ii-v-i").main.chords.map(({ symbol }) => symbol), ["Dm7", "G7", "Cmaj7"]);
assert.deepEqual(resolved.get("melody-g-i-v-vi-iv").main.chords.map(({ symbol }) => symbol), ["G", "D", "Em", "C"]);

const motifRegression = resolved.get("motif-a-c-a"); const motif = createMotifPlan(motifRegression);
assert.deepEqual(motif.examples.main.source.map(name), ["A", "C", "A"]);
assert.deepEqual(motif.examples.main.adaptation.map(name), ["D", "F#", "D"]);
assert.deepEqual(motif.examples.main.arrival.map(name), ["G", "B", "G"]);
assert.deepEqual(motif.sequence.map(name), ["B", "D", "B"]);
assert.equal(motif.sourceInterval.label, motif.sequenceInterval.label);
assert.equal(motif.stages.find(({ id }) => id === "identity").kind, "reflect");
for (const spec of motifs) {
  const material = resolved.get(spec.id); const plan = createMotifPlan(material);
  assert.equal(plan.stages.length, 13);
  assert.equal(plan.sourceInterval.diatonicSteps, plan.sequenceInterval.diatonicSteps);
  assert.equal(plan.sourceInterval.semitones, plan.sequenceInterval.semitones);
  for (const [which, ctx] of [["main", material.main], ["transfer", material.transfer]]) {
    for (const [name, notes] of Object.entries(plan.examples[which])) {
      const chordIndex = spec.motif[name].chordIndex;
      assert.equal(notes.length, 3); assert.equal(notes[0].semitone, notes[2].semitone);
      assert.ok(notes[1].semitone > notes[0].semitone);
      assert.ok(notes.every((note) => ctx.at(chordIndex, note.position.stringIndex, note.position.fret).chordRelation.isChordTone));
    }
  }
  for (const stage of plan.stages) {
    assert.ok(stage.prompt && stage.instruction, `${spec.id}:${stage.id}`);
    if (stage.kind === "adapt") {
      const notes = stage.context === material.transfer ? plan.examples.transfer.adaptation :
        stage.id === "variation-contour" ? plan.examples.main.arrival : plan.examples.main.adaptation;
      assert.equal(plan.evaluateAdaptation(stage, notes.map(({ position }) => position)).correct, true, `${spec.id}:${stage.id}`);
      assert.equal(plan.evaluateAdaptation(stage, [notes[0].position, notes[0].position, notes[0].position]).correct, false);
    }
    if (stage.kind === "sequence") assert.equal(plan.evaluateSingle(stage, plan.sequence[1].position).correct, true);
    if (stage.kind === "response") assert.equal(plan.evaluateSingle(stage, plan.examples.main.arrival[0].position).correct, true);
  }
  assert.equal(plan.evaluateTransfer([material.transfer.target.position, material.transfer.arrival.position]).correct, true);
  assert.equal(plan.evaluateTransfer([material.main.target.position, material.main.arrival.position]).correct, false);
  assert.deepEqual(plan.examples.main.source.slice(1).map(name), plan.examples.main.source.slice(1).map(name));
}
assert.deepEqual(resolved.get("motif-third-fifth").examples.main.source.map(name), ["C", "E", "C"]);
assert.deepEqual(resolved.get("motif-upper-region").main.chords.map(({ symbol }) => symbol), ["Fmaj7", "G7", "Cmaj7"]);

const app = await readFile(new URL("../lab/phrase-app.js", import.meta.url), "utf8");
const pages = {
  melody: await readFile(new URL("../lab/melody.html", import.meta.url), "utf8"),
  motif: await readFile(new URL("../lab/motif.html", import.meta.url), "utf8"),
};
function createPage(which) {
  const { document, root } = createTestDOM(pages[which]); document.body = root.querySelector("body");
  const random = Object.create(Math); random.random = () => 0;
  const context = vm.createContext({ ...engine, getMelodyScenarios, getMotifScenarios, resolveScenario,
    createMelodyPlan, createMotifPlan, chordRole, pathConnections, document, console, Math: random, prepareMelodyExperience, prepareDistinctMelodyExperience, createPhraseQueries });
  installRenderer(context);
  vm.runInContext(app.replace(/^import .*;\s*/gm, ""), context, { filename: "phrase-app.js" });
  const $ = (id) => document.getElementById(id);
  const read = (expression) => vm.runInContext(expression, context);
  const button = (stringIndex, fret) => {
    const found = all($("board"), (item) => item.tagName === "button" && item.dataset.stringIndex === String(stringIndex) && item.dataset.fret === String(fret))[0];
    assert.ok(found, `Missing string ${stringIndex}, fret ${fret}`); return found;
  };
  return { $, root, read, button, accessible: () => accessibleText(root) };
}
const m = createPage("melody");
assert.equal(m.$("scenario-select").children.length, 3);
m.$("act").click(); m.$("next").click();
assert.equal(m.read("current().id"), "target");
assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
m.$("hint").click(); assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
m.button(5, 1).click(); m.$("check").click(); assert.equal(m.read("state.revealed"), false);
m.$("replay").click(); assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
const fret = m.button(5, 2); fret.focus(); fret.key("Enter");
assert.equal(m.read("state.selections[0].fret"), 2); m.$("check").click();
assert.equal(m.read("state.evidence.target.correct"), true);
assert.match(m.accessible(), /F#.*3rd of D7/);
m.$("scenario-select").value = melodies[1].id; m.$("start-scenario").click();
assert.equal(m.read("selectedScenario.id"), melodies[1].id);
assert.equal(m.read("current().id"), "harmony"); assert.equal(m.read("Object.keys(state.evidence).length"), 0);
assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
m.$("act").click(); m.$("next").click(); assert.doesNotMatch(m.accessible(), /B.*3rd of G7/);
const cTarget = m.read("material.main.target.position.fret"); m.button(5, cTarget).click(); m.$("check").click();
assert.equal(m.read("state.revealed"), true); m.$("restart").click();
assert.equal(m.read("selectedScenario.id"), melodies[1].id); assert.equal(m.read("Object.keys(state.evidence).length"), 0);
m.$("surprise-scenario").click(); assert.equal(m.read("selectedScenario.id"), melodies[0].id);
m.$("scenario-select").value = melodies[2].id; m.$("start-scenario").click();
assert.match(m.$("context").textContent, /G → D → Em → C/);

const t = createPage("motif");
assert.equal(all(t.$("board"), (item) => item.classList.contains("fb-connection")).length, 2);
assert.deepEqual(all(t.$("board"), (item) => item.classList.contains("fb-primary-label") && item.textContent).map((item) => item.textContent).sort(), ["A", "C"]);
t.$("act").click(); t.$("next").click(); t.$("reflection").value = "unclear"; t.$("act").click(); t.$("next").click();
assert.equal(t.read("current().id"), "adapt"); assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
const first = t.button(4, 3); first.focus(); first.key("Enter"); assert.equal(t.read("state.selections[0].fret"), 3);
assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
t.$("replay").click();
for (const note of motif.examples.main.source) t.button(note.position.stringIndex, note.position.fret).click();
t.$("check").click(); assert.equal(t.read("state.revealed"), false);
t.$("replay").click();
for (const note of motif.examples.main.adaptation) t.button(note.position.stringIndex, note.position.fret).click();
t.$("check").click(); assert.equal(t.read("state.revealed"), true);
assert.match(t.accessible(), /F#.*3rd/);
t.$("scenario-select").value = motifs[1].id; t.$("start-scenario").click();
assert.equal(t.read("selectedScenario.id"), motifs[1].id);
assert.equal(t.read("Object.keys(state.evidence).length"), 0);
assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
t.$("surprise-scenario").click(); assert.equal(t.read("selectedScenario.id"), motifs[0].id);
t.$("scenario-select").value = motifs[2].id; t.$("start-scenario").click();
assert.match(t.$("context").textContent, /Fmaj7 → G7 → Cmaj7/);
t.$("restart").click(); assert.equal(t.read("selectedScenario.id"), motifs[2].id);

const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(server, /scenario-resolver\.mjs/);
console.log("ScenarioV1 checks passed: six catalogue scenarios, engine resolution, validation, planner seams, regression facts, UI switching, surprise, answer withholding, keyboard and restart.");
