import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { all, createTestDOM, installRenderer } from "./fretboard-test-dom.mjs";
import * as engine from "../.lab-dist/engine/index.js";
import { createVoiceLeadingPlan } from "../lab/voice-leading-session.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.data;
}
const queries = {
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: (request) => unwrap(engine.musicQueries.getChordCatalog(request)),
  findLocations: ({ key, chord, stringIndices, fretRange, pitchClasses }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD, stringIndices, fretRange, pitchClasses,
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getNoteAtFret: ({ key, chord, stringIndex, fret }) => unwrap(engine.musicQueries.getNoteAtFret({
    board: engine.STANDARD_FRETBOARD, position: { stringIndex, fret },
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
};
const plan = createVoiceLeadingPlan(queries);

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value); assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}
assertDeepFrozen(plan.activeStrings);
assertDeepFrozen(plan.contexts);
assert.deepEqual(plan.activeStrings, [2, 3, 4, 5]);
assert.deepEqual(plan.contexts.g.start.frets, [5, 4, 3, 3]);
assert.deepEqual(plan.contexts.g.start.notes.map(({ name }) => name), ["G3", "B3", "D4", "G4"]);
assert.deepEqual(plan.contexts.a.start.frets, [11, 9, 10, 9]);
assert.deepEqual(plan.contexts.a.start.notes.map(({ name }) => name), ["C#4", "E4", "A4", "C#5"]);
assert.deepEqual([plan.contexts.g.home.symbol, plan.contexts.g.departure.symbol, plan.contexts.g.dominant.symbol], ["G", "C", "D7"]);
assert.deepEqual([plan.contexts.a.home.symbol, plan.contexts.a.departure.symbol, plan.contexts.a.dominant.symbol], ["A", "D", "E7"]);
assert.deepEqual(plan.contexts.g.transitions.map(({ fromChord, toChord }) => `${fromChord.entry.romanNumeral.label}-${toChord.entry.romanNumeral.label}`), ["I-IV", "IV-V7", "V7-I"]);

function required(chord) { return new Set(chord.tones.map(({ pitchClass }) => pitchClass)); }
for (const context of Object.values(plan.contexts)) {
  let previous = context.start;
  for (const transition of context.transitions) {
    const ranked = plan.rankCandidates(context, previous, transition.fromChord, transition.toChord);
    assert.ok(ranked.length > 0);
    assert.deepEqual(plan.rankCandidates(context, previous, transition.fromChord, transition.toChord), ranked, "Candidate ranking is deterministic");
    for (const candidate of ranked) {
      const needed = required(transition.toChord.chord);
      const present = new Set(candidate.notes.map(({ pitchClass }) => pitchClass));
      assert.ok(candidate.notes.every(({ pitchClass }) => needed.has(pitchClass)), "No generated voicing has a non-chord tone");
      assert.ok([...needed].every((pitchClass) => present.has(pitchClass)), "Every generated voicing contains all structural tones");
    }
    previous = ranked[0];
  }
}

let previous = plan.contexts.g.start;
const gPath = [previous];
for (let index = 0; index < 3; index += 1) {
  const transition = plan.contexts.g.transitions[index];
  const next = plan.rankCandidates(plan.contexts.g, previous, transition.fromChord, transition.toChord)[0];
  gPath.push(next); previous = next;
}
assert.deepEqual(gPath.map(({ frets }) => frets), [[5, 4, 3, 3], [5, 5, 5, 3], [4, 5, 3, 5], [5, 4, 3, 3]]);
assert.deepEqual(gPath[1].movements.map(({ motionKind }) => motionKind), ["common tone", "semitone", "whole step", "common tone"]);
assert.deepEqual(gPath[2].movements.map(({ motionKind }) => motionKind), ["semitone", "common tone", "whole step", "whole step"]);
assert.deepEqual(gPath[3].movements.map(({ motionKind }) => motionKind), ["semitone", "semitone", "common tone", "whole step"]);
assert.deepEqual(gPath[3].movements.map(({ from, to }) => `${engine.formatNote(from.pitch.note)}-${engine.formatNote(to.pitch.note)}`), ["F#-G", "C-B", "D-D", "A-G"]);
const resolutions = gPath[3].movements;
assert.deepEqual(resolutions.slice(0, 2).map(({ fromScaleDegree, toScaleDegree, fromRole, toRole }) => [fromScaleDegree, toScaleDegree, fromRole, toRole]), [[7, 1, "3rd", "root"], [4, 3, "♭7", "3rd"]]);

const invalid = plan.evaluate("g", 0, gPath[0], gPath[0].frets);
assert.equal(invalid.kind, "invalid-chord");
assert.equal(invalid.harmonyCorrect, false);
assert.ok(invalid.missingTones.some(({ note }) => engine.formatNote(note) === "C"));
const cRanking = plan.rankCandidates(plan.contexts.g, gPath[0], plan.contexts.g.home, plan.contexts.g.departure);
const distantChoice = cRanking.find(({ totalMovement }) => totalMovement > cRanking[0].totalMovement);
assert.ok(distantChoice);
const distant = plan.evaluate("g", 0, gPath[0], distantChoice.frets);
assert.equal(distant.kind, "valid-distant"); assert.equal(distant.harmonyCorrect, true); assert.equal(distant.efficient, false);
const nearest = plan.evaluate("g", 0, gPath[0], gPath[1].frets);
assert.equal(nearest.kind, "valid-nearest"); assert.equal(nearest.efficient, true);

const hints = plan.hints("g", 0, gPath[0]);
assert.match(hints[0].text, /Common chord tone.*G/);
assert.doesNotMatch(hints.slice(0, 3).map(({ text }) => text).join(" "), /fret \d/i);
assert.match(hints[1].text, /Stationary strings?: 4, 1/);
assert.match(hints[2].text, /string 4 stay.*string 3 up.*string 2 up.*string 1 stay/);
assert.match(hints[3].text, /fret 5/);

previous = plan.contexts.a.start;
const aPath = [previous];
for (let index = 0; index < 3; index += 1) {
  const transition = plan.contexts.a.transitions[index];
  const next = plan.rankCandidates(plan.contexts.a, previous, transition.fromChord, transition.toChord)[0];
  aPath.push(next); previous = next;
}
assert.deepEqual(aPath.map(({ frets }) => frets), [[11, 9, 10, 9], [12, 11, 10, 10], [12, 13, 12, 12], [11, 14, 10, 12]]);
const aLeading = aPath[3].movements.find(({ from, to }) => engine.formatNote(from.pitch.note) === "G#" && engine.formatNote(to.pitch.note) === "A");
assert.ok(aLeading); assert.equal(aLeading.motionKind, "semitone"); assert.equal(aLeading.fromScaleDegree, 7); assert.equal(aLeading.toScaleDegree, 1);
assert.equal(plan.leadingTones.a.interval.semitones, 1);
assert.equal(engine.formatNote(plan.leadingTones.a.from.note), "G#");

function everyMinimumPath(context) {
  let paths = [[context.start]];
  for (let index = 0; index < context.transitions.length; index += 1) {
    const transition = context.transitions[index];
    paths = paths.flatMap((path) => {
      const ranking = plan.rankCandidates(context, path.at(-1), transition.fromChord, transition.toChord);
      return ranking.filter(({ totalMovement }) => totalMovement === ranking[0].totalMovement)
        .map((candidate) => [...path, candidate]);
    });
  }
  return paths;
}
for (const path of everyMinimumPath(plan.contexts.g)) {
  assert.ok(path[3].movements.some(({ fromScaleDegree, toScaleDegree, fromRole, toRole }) =>
    fromScaleDegree === 7 && toScaleDegree === 1 && fromRole === "3rd" && toRole === "root"));
  assert.ok(path[3].movements.some(({ fromScaleDegree, toScaleDegree, fromRole, toRole }) =>
    fromScaleDegree === 4 && toScaleDegree === 3 && fromRole === "♭7" && toRole === "3rd"));
}
for (const path of everyMinimumPath(plan.contexts.a)) {
  assert.ok(path[3].movements.some(({ from, to, fromScaleDegree, toScaleDegree }) =>
    engine.formatNote(from.pitch.note) === "G#" && engine.formatNote(to.pitch.note) === "A"
      && fromScaleDegree === 7 && toScaleDegree === 1));
}

const app = await readFile(new URL("../lab/voice-leading-app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../lab/voice-leading.html", import.meta.url), "utf8");
assert.match(html, /src="\/voice-leading-app\.js"/);
assert.doesNotMatch(app, /localStorage|indexedDB|AudioContext|fetch\(|setInterval/);
assert.doesNotMatch(app, /musicQueries\.(?:getChord|getScale)\([^)]*(?:G|C|D|A|E)/);

function createPage() {
  const { document, root } = createTestDOM(html);
  const context = vm.createContext({ ...engine, createVoiceLeadingPlan, document, console });
  installRenderer(context);
  const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
  vm.runInContext(executable, context, { filename: "voice-leading-app.js" });
  const read = (expression) => vm.runInContext(expression, context); const $ = (id) => document.getElementById(id);
  const find = (element, predicate) => predicate(element) ? element : element.children.map((child) => find(child, predicate)).find(Boolean);
  const accessibleText = () => { function visit(element) { if (element.hidden || ["head", "style", "script"].includes(element.tagName)) return ""; return `${element._text} ${element.attributes["aria-label"] ?? ""} ${element.children.map(visit).join(" ")}`; } return visit(root); };
  return { $, read, find, accessibleText, domText: () => root.textContent, document };
}
function chooseVoicing(page, frets) {
  frets.forEach((fret, index) => {
    const stringIndex = plan.activeStrings[index];
    const button = page.find(page.$("board"), (item) => item.dataset.stringIndex === String(stringIndex) && item.dataset.fret === String(fret));
    assert.ok(button); assert.equal(button.tagName, "button"); assert.match(button.getAttribute("aria-label"), /String \d.*fret \d/); button.focus(); button.click();
  });
}
function solveCurrent(page, expected) { chooseVoicing(page, expected.frets); page.$("check").click(); assert.equal(page.read("state.solved"), true); }
function boardItems(page, className) { return all(page.$("board"), (item) => item.classList.contains(className)); }
function assertHiddenSolution(page) {
  assert.equal(boardItems(page, "fb-connection").length, 0, "An uncommitted stage has no future movement path in its DOM");
  assert.equal(boardItems(page, "is-destination").length, 0);
  assert.equal(boardItems(page, "is-correct").length, 0);
  assert.equal(boardItems(page, "is-incorrect").length, 0);
  assert.equal(boardItems(page, "is-common").length, 0);
}

const page = createPage();
assert.equal(page.read("state.stageIndex"), 0); assert.equal(page.$("back").disabled, true);
assert.doesNotMatch(page.domText(), /F♯ → G/, "A future reflection answer must not be present even in hidden DOM content");
assert.match(page.accessibleText(), /G3|root \(1\)|duplicated/);
assert.equal(boardItems(page, "fb-string").length, 6);
assert.deepEqual(boardItems(page, "fb-string").map((item) => Number(item.dataset.stringIndex)), [5, 4, 3, 2, 1, 0]);
page.$("start-played").click();
assertHiddenSolution(page);
assert.equal(boardItems(page, "fb-position").filter((item) => !item.disabled).length,
  plan.activeStrings.length * (plan.contexts.g.fretRange.maxFret - plan.contexts.g.fretRange.minFret + 1));
chooseVoicing(page, gPath[0].frets); page.$("check").click();
assert.equal(page.read("state.result.kind"), "invalid-chord"); assert.match(page.$("harmony-status").textContent, /incorrect/); assert.match(page.$("efficiency-status").textContent, /not assessed/);
assert.ok(boardItems(page, "is-incorrect").length > 0, "Only actual non-chord notes receive incorrect-note styling");
assert.equal(boardItems(page, "fb-connection").length, 0);
page.$("replay").click(); assert.equal(page.read("Object.keys(state.selections).length"), 0); assert.equal(page.$("status-panel").hidden, true);
assertHiddenSolution(page);
chooseVoicing(page, distantChoice.frets); page.$("check").click();
assert.equal(page.read("state.result.kind"), "valid-distant"); assert.match(page.$("harmony-status").textContent, /correct/); assert.match(page.$("efficiency-status").textContent, /not yet satisfied/);
assert.equal(boardItems(page, "is-incorrect").length, 0, "A harmonically valid but distant voicing must never look like wrong notes");
assert.equal(boardItems(page, "is-correct").length, 4);
assert.equal(boardItems(page, "fb-connection").length, 0, "Distant feedback does not reveal the nearest solution path");
page.$("hint").click(); assert.match(page.accessibleText(), /Common chord tone/); assert.doesNotMatch(page.accessibleText(), /Nearby voicing/);
assert.equal(boardItems(page, "fb-connection").length, 0);
page.$("hint").click(); page.$("hint").click(); assert.doesNotMatch(page.accessibleText(), /Nearby voicing/);
assert.equal(boardItems(page, "fb-connection").length, 0, "Direction hints do not draw the unrevealed destination");
page.$("hint").click(); assert.equal(page.read("state.solved"), true); assert.match(page.accessibleText(), /Assisted reveal|Nearby voicing/);
assert.equal(boardItems(page, "fb-connection").length, 4);
assert.equal(boardItems(page, "fb-stationary").length, 2, "Both common tones are distinguished from directional voice movement");
assert.equal(page.find(page.$("board"), (item) => item.getAttribute("aria-pressed") === "true"), undefined, "Assistance clears stale selected state");
assert.equal(page.read("state.evidence.g[0].assistance"), 1); page.$("continue").click();
assertHiddenSolution(page);

solveCurrent(page, gPath[2]); page.$("continue").click(); solveCurrent(page, gPath[3]);
assert.equal(boardItems(page, "fb-connection").length, 4, "Each D7 to G voice has a separate relationship");
assert.equal(boardItems(page, "fb-stationary").length, 1);
assert.deepEqual(boardItems(page, "fb-connection").map((item) => item.dataset.kind).sort(), ["down", "down", "stationary", "up"]);
assert.match(page.accessibleText(), /F#, scale degree 7.*3rd of D7.*C, scale degree 4.*♭7/s);
assert.match(page.accessibleText(), /F# → G|F♯.*G/); assert.match(page.accessibleText(), /C → B/); page.$("continue").click();
assert.match(page.$("voice-one-label").textContent, /G → G → F# → G/); assert.match(page.$("voice-two-label").textContent, /B → C → C → B/);
assert.equal(page.$("continue").disabled, true); page.$("voice-one-played").checked = true; page.$("voice-one-played").dispatch("change"); assert.equal(page.$("continue").disabled, true);
page.$("voice-two-played").checked = true; page.$("voice-two-played").dispatch("change"); assert.equal(page.$("continue").disabled, false); page.$("continue").click(); page.$("full-played").click();

assert.match(page.accessibleText(), /first-inversion A-major/); assert.match(page.accessibleText(), /fret 11/); page.$("start-played").click();
solveCurrent(page, aPath[1]); page.$("continue").click(); solveCurrent(page, aPath[2]); page.$("continue").click();
assert.doesNotMatch(page.accessibleText(), /G♯ → A|G# → A/); solveCurrent(page, aPath[3]); assert.match(page.accessibleText(), /G# → A/); page.$("continue").click();
page.$("connection").value = "More connected"; page.$("strategy").value = "Looking for common tones"; page.$("degree-answer").value = "7-1"; page.$("role-answer").value = "3rd"; page.$("save-reflection").click();
assert.equal(page.read("state.reflection.degreeCorrect"), true); assert.equal(page.read("state.reflection.roleCorrect"), true); page.$("continue").click(); assert.match(page.accessibleText(), /no mastery claim/i);
page.$("restart").click(); assert.equal(page.read("state.stageIndex"), 0); assert.equal(page.read("state.reflection"), null); assert.equal(page.read("state.evidence.g[0].attempts"), 0); assert.equal(page.read("state.paths.g.length"), 1);
assert.doesNotMatch(page.domText(), /F♯ → G/, "Restart must scrub the earlier reflection question from hidden DOM content");
assertHiddenSolution(page);
assert.doesNotMatch(page.$("movements").textContent, /G#|F#|C → B/);

const replayPage = createPage(); replayPage.$("start-played").click(); solveCurrent(replayPage, gPath[1]); assert.match(replayPage.accessibleText(), /Your chord contains small melodic lines/);
replayPage.$("replay").click(); assert.equal(replayPage.read("state.solved"), false); assert.equal(replayPage.read("state.paths.g.length"), 1); assert.doesNotMatch(replayPage.accessibleText(), /Total movement:/);
assertHiddenSolution(replayPage);
solveCurrent(replayPage, gPath[1]); replayPage.$("continue").click(); replayPage.$("back").click(); assert.equal(replayPage.read("state.stageIndex"), 1); assert.equal(replayPage.read("state.paths.g.length"), 1); assert.doesNotMatch(replayPage.accessibleText(), /Total movement:/);
assertHiddenSolution(replayPage);

const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(server, /\["\/voice-leading\.html", "\/voice-leading"\]/);
assert.match(server, /voice-leading-app\.js/); assert.match(server, /voice-leading-session\.mjs/);
console.log("Parsimonious Path checks passed for engine-derived voicings, scoring, feedback, hints, transfer, deconstruction, reflection, accessibility state, navigation and restart.");
