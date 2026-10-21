import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createTestDOM, installRenderer, all, accessibleText } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import { createPhraseMaterial, chordRole, pathConnections } from "../lab/phrase-material.mjs";
import { createMelodyPlan } from "../lab/melody-session.mjs";
import { createMotifPlan } from "../lab/motif-session.mjs";

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
const material = createPhraseMaterial(queries);
const melody = createMelodyPlan(material);
const motif = createMotifPlan(material);
const name = (location) => engine.formatNote(location.pitch.note);
assert.deepEqual(material.g.chords.map(({ symbol }) => symbol), ["Am7", "D7", "Gmaj7"]);
assert.deepEqual(material.a.chords.map(({ symbol }) => symbol), ["Bm7", "E7", "Amaj7"]);
assert.deepEqual(material.g.chords.map(({ entry }) => entry.romanNumeral.label), ["ii7", "V7", "Imaj7"]);
assert.deepEqual(material.g.chords.map(({ chord }) => chord.tones.map(({ note }) => engine.formatNote(note))),
  [["A", "C", "E", "G"], ["D", "F#", "A", "C"], ["G", "B", "D", "F#"]]);
assert.equal(name(material.g.target), "F#"); assert.equal(material.g.target.position.fret, 2);
assert.equal(name(material.g.arrival), "G"); assert.equal(material.g.arrival.position.fret, 3);
assert.equal(material.g.targetMotion.semitones, 1);
assert.equal(chordRole(material.g.at(1, 5, 2)), "3rd");
assert.match(chordRole({ chordRelation: { matchingTones: [{ degree: 3 }], spellingMatches: false } }), /written spelling differs/);
assert.equal(material.g.at(1, 5, 2).keyRelation.degree, 7);
assert.deepEqual(material.g.sameRoles.map(chordRole), ["♭7", "outside the chord", "root"]);
assert.deepEqual(material.g.sameRoles.map((item) => item.keyRelation.degree), [1, 1, 1]);
assert.equal(name(material.g.approach), "E"); assert.equal(chordRole(material.g.at(1, 5, material.g.approach.position.fret)), "outside the chord");
assert.deepEqual(material.g.phrase.map(name), ["D", "E", "F#", "G"]);
assert.equal(pathConnections(material.g.phrase).length, 3);
assert.equal(name(material.a.target), "G#"); assert.equal(material.a.target.position.fret, 4);
assert.equal(name(material.a.arrival), "A"); assert.equal(material.a.arrival.position.fret, 5);
assert.equal(melody.evaluate(melody.stages[1], 1).correct, false);
assert.equal(melody.evaluate(melody.stages[1], 2).correct, true);
assert.equal(melody.evaluate(melody.stages[7], 2).correct, false, "Transfer must not accept the old fret");
assert.equal(melody.evaluate(melody.stages[7], 4).correct, true);
assert.match(melody.explanation(melody.stages[2]).join(" "), /G over Am7.*♭7.*G over D7.*outside.*G over Gmaj7.*root/);
assert.match(melody.explanation(melody.stages[4]).join(" "), /approach to F#/);

assert.deepEqual(motif.examples.g.source.map(name), ["A", "C", "A"]);
assert.deepEqual(motif.examples.g.dominant.map(name), ["D", "F#", "D"]);
assert.deepEqual(motif.examples.g.arrival.map(name), ["G", "B", "G"]);
assert.equal(motif.sourceInterval.label, motif.sequenceInterval.label);
assert.deepEqual(motif.sequence.map(name), ["B", "D", "B"]);
assert.equal(pathConnections(motif.examples.g.source).length, 2);
for (const [index, notes] of Object.entries(motif.examples.g)) {
  const chordIndex = { source: 0, dominant: 1, arrival: 2 }[index];
  assert.ok(notes.every((note) => material.g.at(chordIndex, note.position.stringIndex, note.position.fret).chordRelation?.isChordTone));
}
const adapt = motif.stages.find(({ id }) => id === "adapt");
assert.equal(motif.evaluateAdaptation(adapt, motif.examples.g.dominant.map(({ position }) => position)).correct, true);
assert.equal(motif.evaluateAdaptation(adapt, motif.examples.g.source.map(({ position }) => position)).correct, false);
assert.equal(motif.evaluateAdaptation(adapt, [motif.examples.g.dominant[0].position, motif.examples.g.dominant[0].position, motif.examples.g.dominant[0].position]).correct, false);
const sequenceStage = motif.stages.find(({ id }) => id === "sequence");
assert.equal(motif.evaluateSingle(sequenceStage, motif.sequence[1].position).correct, true);
assert.equal(motif.evaluateSingle(sequenceStage, motif.examples.g.source[1].position).correct, false);
const ending = motif.stages.find(({ id }) => id === "variation-ending");
assert.equal(motif.evaluateSingle(ending, motif.examples.g.source[2].position).correct, false);
assert.equal(motif.evaluateSingle(ending, material.g.locate(material.g.tone(0, 5), 5, 0).position).correct, true);
const repeatedMiddle = motif.stages.find(({ id }) => id === "variation-repeat");
assert.equal(motif.evaluateSingle(repeatedMiddle, motif.examples.g.source[1].position).correct, false);
assert.equal(motif.evaluateSingle(repeatedMiddle, material.g.locate(material.g.tone(0, 5), 5, 0).position).correct, true);
const contourVariation = motif.stages.find(({ id }) => id === "variation-contour");
assert.equal(motif.evaluateAdaptation(contourVariation, motif.examples.g.arrival.map(({ position }) => position)).correct, true);
assert.equal(motif.evaluateAdaptation(contourVariation, motif.examples.g.source.map(({ position }) => position)).correct, false);
assert.deepEqual(motif.examples.g.source.slice(1).map(name), ["C", "A"], "Fragmentation retains only the final cell");
const response = motif.stages.find(({ id }) => id === "response");
assert.equal(motif.evaluateSingle(response, motif.examples.g.arrival[0].position).correct, true);
assert.equal(motif.evaluateTransfer([material.a.target.position, material.a.arrival.position]).correct, true);
assert.equal(motif.evaluateTransfer([material.g.target.position, material.g.arrival.position]).correct, false);
const transferAdapt = motif.stages.find(({ id }) => id === "transfer-adapt");
assert.equal(motif.evaluateAdaptation(transferAdapt, motif.examples.a.dominant.map(({ position }) => position)).correct, true);
assert.equal(motif.evaluateAdaptation(transferAdapt, motif.examples.g.dominant.map(({ position }) => position)).correct, false);
assert.equal(motif.stages.find(({ id }) => id === "identity").kind, "reflect");

const app = await readFile(new URL("../lab/phrase-app.js", import.meta.url), "utf8");
function createPage(which) {
  const html = awaitHtml[which];
  const { document, root } = createTestDOM(html);
  document.body = root.querySelector("body");
  const context = vm.createContext({ ...engine, createPhraseMaterial, createMelodyPlan, createMotifPlan,
    chordRole, pathConnections, document, console });
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
const awaitHtml = {
  melody: await readFile(new URL("../lab/melody.html", import.meta.url), "utf8"),
  motif: await readFile(new URL("../lab/motif.html", import.meta.url), "utf8"),
};
const m = createPage("melody");
m.$("act").click();
assert.equal(m.read("current().id"), "harmony"); m.$("next").click();
assert.equal(m.read("current().id"), "target");
assert.doesNotMatch(m.root.textContent, /F# is 3rd|fret 2 · F#/);
assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
assert.equal(all(m.$("board"), (item) => item.classList.contains("fb-connection")).length, 0);
m.$("hint").click(); assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
m.button(5, 1).click(); m.$("check").click(); assert.match(m.$("feedback").textContent, /try again/);
assert.equal(m.$("explanation").hidden, true);
m.$("replay").click(); assert.doesNotMatch(m.accessible(), /F#.*3rd of D7/);
const fret = m.button(5, 2); fret.focus(); fret.key("Enter");
assert.equal(m.read("state.selections[0].fret"), 2, "Native Enter selects a fret");
m.$("check").click(); assert.match(m.$("feedback").textContent, /F# is 3rd/);
assert.equal(m.read("state.evidence.target.correct"), true);
assert.equal(m.read("state.evidence.target.selectedPositions[0].fret"), 2);
assert.equal(m.$("explanation").hidden, false); m.$("next").click();
assert.equal(m.read("current().id"), "reinterpret");
assert.doesNotMatch(m.accessible(), /outside the chord/);
m.$("reflection").value = "unclear"; m.$("act").click(); assert.match(m.accessible(), /G over D7.*outside the chord/);
assert.equal(m.read("state.evidence.reinterpret.reflection"), "unclear");
m.$("next").click(); assert.equal(m.read("current().id"), "trajectory");
assert.doesNotMatch(m.accessible(), /Played target movement:/); m.button(5, 3).click(); m.$("check").click();
assert.equal(all(m.$("board"), (item) => item.classList.contains("fb-connection")).length, 1);
m.$("next").click(); m.button(5, 0).click(); m.$("check").click(); assert.match(m.accessible(), /approach to F#/);
m.$("next").click(); assert.doesNotMatch(m.accessible(), /4 G|3 F#/);
m.$("act").click(); assert.equal(all(m.$("board"), (item) => item.classList.contains("fb-connection")).length, 3);
m.$("back").click(); assert.equal(m.read("current().id"), "approach"); assert.doesNotMatch(m.accessible(), /approach to F#/);
m.$("restart").click(); assert.equal(m.read("current().id"), "harmony"); assert.equal(m.read("Object.keys(state.evidence).length"), 0);

const t = createPage("motif");
assert.equal(all(t.$("board"), (item) => item.classList.contains("fb-connection")).length, 2,
  "The repeated return has a second arrow even though it shares the first position");
assert.deepEqual(all(t.$("board"), (item) => item.classList.contains("fb-primary-label") && item.textContent).map((item) => item.textContent).sort(), ["A", "C"]);
t.$("act").click(); t.$("next").click();
assert.equal(t.read("current().id"), "identity"); t.$("reflection").value = "unclear"; t.$("act").click();
assert.equal(t.read("state.reflection"), "unclear"); t.$("next").click();
assert.equal(t.read("state.evidence.identity.reflection"), "unclear");
assert.equal(t.read("current().id"), "adapt"); assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
const firstMotifFret = t.button(4, 3); firstMotifFret.focus(); firstMotifFret.key("Enter");
assert.equal(t.read("state.selections[0].fret"), 3, "Motif selection uses the native button keyboard action");
assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/, "ARIA still withholds the upcoming 3rd after provisional selection");
t.$("replay").click();
for (const note of motif.examples.g.source) t.button(note.position.stringIndex, note.position.fret).click();
t.$("check").click(); assert.equal(t.read("state.revealed"), false);
t.$("replay").click(); assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
for (const note of motif.examples.g.dominant) t.button(note.position.stringIndex, note.position.fret).click();
t.$("check").click(); assert.equal(t.read("state.revealed"), true);
assert.match(t.accessible(), /F#.*3rd/); assert.equal(all(t.$("board"), (item) => item.classList.contains("fb-connection")).length, 2);
t.$("next").click(); assert.equal(t.read("current().id"), "variation-ending");
assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/); t.$("back").click();
assert.equal(t.read("current().id"), "adapt"); assert.doesNotMatch(t.accessible(), /F#.*3rd of D7/);
t.$("restart").click(); assert.equal(t.read("current().id"), "source"); assert.equal(t.read("Object.keys(state.evidence).length"), 0);

const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(server, /melody\.html/); assert.match(server, /motif\.html/);
console.log("Melody and motif Lab checks passed: engine-derived material, role/degree facts, variations, sequence, transfer, reveal boundaries, keyboard selection and resets.");
