import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import * as practice from "../lab/practice-session.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.data;
}
const queries = {
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(engine.musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD, fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex], pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
};
const plan = practice.createPracticePlan(queries);
function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value), "Every session-plan object and collection is frozen");
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}
assertDeepFrozen(plan);
assert.deepEqual(practice.createPracticePlan(queries), plan, "The curated exemplar does not reroll");
assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan);
assert.equal(engine.formatNote(plan.context.key.tonic), "G");
assert.equal(engine.formatNote(plan.transfer.key.tonic), "A");
assert.equal(plan.warmups.length, 3, "Retrieval stays a small dose inside the same context");
assert.deepEqual(plan.warmups.map(({ chord, tone }) => [
  engine.formatNote(chord.entry.chord.root), chord.entry.chord.chordId,
  tone.degree, tone.alteration, engine.formatNote(tone.note),
]), [["G", "major", 1, 0, "G"], ["G", "major", 3, 0, "B"], ["C", "major", 3, 0, "E"]]);
for (const warmup of plan.warmups) {
  assert.deepEqual(warmup.key, plan.context.key);
  const chord = warmup.chord.entry.chord;
  assert.ok(chord.tones.some(({ degree, alteration, note }) =>
    degree === warmup.tone.degree && alteration === warmup.tone.alteration
    && engine.formatNote(note) === engine.formatNote(warmup.tone.note)));
  const valid = queries.findLocations({ key: warmup.key, chord, stringIndex: warmup.stringIndex, pitchClass: warmup.tone.pitchClass });
  assert.ok(valid.some(({ position }) => position.stringIndex === warmup.plannedLocation.position.stringIndex
    && position.fret === warmup.plannedLocation.position.fret));
  assert.ok(warmup.plannedLocation.position.fret >= warmup.fretWindow.minFret);
  assert.ok(warmup.plannedLocation.position.fret <= warmup.fretWindow.maxFret);
}
const contextChords = (context) => ["home", "departure", "pressure", "alternative"].map((role) => context.chords[role]);
for (const context of [plan.context, plan.transfer]) {
  assert.equal(context.key.mode, "major");
  assert.deepEqual(contextChords(context).map(({ entry }) => entry.degree), [1, 4, 5, 6]);
  assert.deepEqual(contextChords(context).map(({ entry }) => entry.chord.chordId), ["major", "major", "dominant7", "minor"]);
  assert.deepEqual(contextChords(context).map(({ entry }) => entry.romanNumeral.label), ["I", "IV", "V7", "vi"]);
  for (const { entry } of contextChords(context)) {
    const source = queries.getHarmony({ key: context.key, chordSize: entry.chord.tones.length === 4 ? "seventh" : "triad" });
    assert.deepEqual(entry, source.degrees[entry.degree - 1]);
  }
  const pressure = context.chords.pressure.entry.chord;
  const home = context.chords.home.entry.chord;
  assert.ok(pressure.tones.some(({ note, degree, alteration }) =>
    engine.formatNote(note) === engine.formatNote(context.motion.from.tone.note) && degree === 3 && alteration === 0));
  assert.equal(context.motion.to.tone.degree, 1);
  assert.equal(context.motion.to.tone.pitchClass, home.tones[0].pitchClass);
  const played = queries.getInterval({ from: context.motion.from.plannedLocation.pitch, to: context.motion.to.plannedLocation.pitch });
  assert.deepEqual(played, context.motion.playedInterval);
  assert.equal(played.semitones, 1, "The explanatory motion uses an actual ascending semitone");
}
assert.deepEqual(contextChords(plan.context).map(({ symbol }) => symbol), ["G", "C", "D7", "Em"]);
assert.deepEqual(contextChords(plan.transfer).map(({ symbol }) => symbol), ["A", "D", "E7", "F#m"]);
assert.equal(engine.formatNote(plan.context.motion.from.tone.note), "F#");
assert.equal(engine.formatNote(plan.context.motion.to.tone.note), "G");
assert.equal(engine.formatNote(plan.transfer.motion.from.tone.note), "G#");
assert.equal(engine.formatNote(plan.transfer.motion.to.tone.note), "A");
assert.deepEqual(plan.connection.from, plan.context.motion.from);
assert.deepEqual(plan.connection.to, plan.context.motion.to);
assert.deepEqual(plan.musicalize.palette, [plan.context.motion.from, plan.context.motion.to]);
assert.deepEqual(plan.gravitySteps.map(({ id }) => id), ["home", "contrast", "prediction", "violation", "fixed-note", "melodic-compare", "theory-reveal"]);
assert.deepEqual(plan.transfer.steps.map(({ id }) => id), ["transfer-compare", "transfer-predict", "transfer-reveal"]);
assert.match(JSON.stringify(plan.gravitySteps.find(({ id }) => id === "violation")), /D7.*Em/);
assert.match(JSON.stringify(plan.gravitySteps.find(({ id }) => id === "prediction").afterCommit), /D7.*G/);
assert.throws(() => practice.createPracticePlan({ ...queries, findLocations: () => [] }), /location|fret|anchor|motion|target|available/i);

// The actual page callbacks run against a small DOM adapter, not a new product framework.
const app = await readFile(new URL("../lab/practice-app.js", import.meta.url), "utf8");
const practiceHtml = await readFile(new URL("../lab/practice.html", import.meta.url), "utf8");
const harmonyHtml = practiceHtml;
for (const html of [practiceHtml, harmonyHtml]) {
  assert.match(html, /src="\/practice-app\.js"/);
  assert.doesNotMatch(html, /<iframe|F A C|D F A|\bV7\b|\bIV\b/);
}
assert.match(app, /from "\/practice-session\.mjs"/);
assert.doesNotMatch(app, /localStorage|indexedDB|AudioContext|setInterval|fetch\(/);

function createPage(pathname) {
  let document;
  class Element {
    constructor(tagName = "div") {
      this.tagName = tagName; this.children = []; this.parentElement = null;
      this.hidden = false; this.disabled = false; this.value = ""; this.checked = false;
      this.dataset = {}; this.style = {}; this.attributes = {}; this.handlers = new Map(); this._text = "";
    }
    get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
    set textContent(value) { this._text = String(value); this.replaceChildren(); }
    append(...children) {
      for (const child of children) {
        if (typeof child === "string") { const text = new Element("#text"); text._text = child; this.append(text); continue; }
        child.parentElement = this; this.children.push(child);
      }
    }
    contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
    replaceChildren(...children) {
      if (document?.activeElement && this.children.some((child) => child.contains(document.activeElement))) document.activeElement = null;
      for (const child of this.children) child.parentElement = null;
      this.children = []; this.append(...children);
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
      if (name === "hidden") this.hidden = true;
      if (name === "disabled") this.disabled = true;
    }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; if (name === "hidden") this.hidden = false; if (name === "disabled") this.disabled = false; }
    addEventListener(name, handler) { this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]); }
    focus() { document.activeElement = this; }
    visible() { return !this.hidden && (!this.parentElement || this.parentElement.visible()); }
    dispatch(name) { for (const handler of this.handlers.get(name) ?? []) handler({ target: this, currentTarget: this, preventDefault() {} }); }
    click() { assert.ok(this.visible(), "Cannot click a hidden control"); assert.equal(this.disabled, false, "Cannot click a disabled control"); this.dispatch("click"); }
  }
  const elements = new Map();
  const root = new Element("#document");
  const stack = [root];
  const html = pathname.startsWith("/harmony") ? harmonyHtml : practiceHtml;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g)) {
    const text = token[0];
    if (text.startsWith("<!--")) continue;
    const close = /^<\/([\w-]+)/.exec(text);
    if (close) { if (stack.at(-1).tagName === close[1].toLowerCase()) stack.pop(); continue; }
    const open = /^<([\w-]+)\b([^>]*)>/.exec(text);
    if (!open) { const node = new Element("#text"); node._text = text; stack.at(-1).append(node); continue; }
    const element = new Element(open[1].toLowerCase());
    for (const match of open[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(match[1], match[2] ?? "");
    element.hidden = Object.hasOwn(element.attributes, "hidden");
    element.disabled = Object.hasOwn(element.attributes, "disabled");
    element.value = element.attributes.value ?? "";
    if (element.attributes.id) elements.set(element.attributes.id, element);
    stack.at(-1).append(element);
    if (!voidTags.has(element.tagName) && !text.endsWith("/>")) stack.push(element);
  }
  document = {
    activeElement: null,
    getElementById(id) { assert.ok(elements.has(id), `Unknown DOM id ${id}`); return elements.get(id); },
    createElement(tagName) { return new Element(tagName); },
  };
  let planCreations = 0;
  const context = vm.createContext({
    ...engine, ...practice, document, location: { pathname }, console,
    createPracticePlan(...args) { planCreations += 1; return practice.createPracticePlan(...args); },
  });
  const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
  vm.runInContext(executable, context, { filename: "practice-app.js" });
  const read = (expression) => vm.runInContext(expression, context);
  const $ = (id) => document.getElementById(id);
  const find = (element, predicate) => predicate(element) ? element : element.children.map((child) => find(child, predicate)).find(Boolean);
  const choose = (value) => {
    const button = find($("choices"), (element) => element.dataset.value === value);
    assert.ok(button, `Choice ${value} is available`); button.click();
  };
  const accessibleText = () => {
    function visit(element) {
      if (element.hidden || ["head", "style", "script"].includes(element.tagName)) return "";
      return `${element._text} ${element.attributes["aria-label"] ?? ""} ${element.attributes.title ?? ""} ${element.children.map(visit).join(" ")}`;
    }
    return visit(root);
  };
  return { read, $, find, choose, accessibleText, planCreations: () => planCreations };
}

// App-specific sequence assertions follow the same fixed lesson, including a second run.
function clickWarmupFret(page, fret) {
  const button = page.find(page.$("board"), (element) => element.dataset.fret === String(fret));
  assert.ok(button, `Fret ${fret} is in the current retrieval window`);
  button.focus(); button.click();
  assert.equal(button.getAttribute("aria-pressed"), "true");
}

function finishWarmup(page, { assisted = false } = {}) {
  const task = plan.warmups[page.read("state.warmupIndex")];
  if (assisted) page.$("reveal-warmup").click();
  else {
    clickWarmupFret(page, task.plannedLocation.position.fret);
    page.$("check-warmup").click();
  }
  assert.equal(page.read("state.warmupRevealed"), true);
  assert.equal(page.$("theory-panel").hidden, false);
  assert.ok(page.accessibleText().includes(engine.formatNote(task.tone.note)));
  assert.equal(page.$("next").hidden, false);
  assert.equal(page.$("next").disabled, false);
}

function chooseAndAdvance(page, choice) {
  page.choose(choice);
  assert.equal(page.$("next").disabled, false);
  page.$("next").click();
}

function commitPredictionAndAdvance(page, choice) {
  page.choose(choice);
  assert.equal(page.$("commit-prediction").disabled, false);
  page.$("commit-prediction").click();
  assert.equal(page.read("state.prediction"), choice);
  assert.equal(page.$("choices-panel").hidden, true);
  assert.equal(page.$("next").hidden, true);
  page.$("confirm-listened").click();
  assert.equal(page.read("state.predictionResolved"), true);
  assert.equal(page.$("next").hidden, false);
  page.$("next").click();
}

const full = createPage("/practice.html");
assert.equal(full.planCreations(), 1, "The page creates one frozen plan");
assert.equal(full.read("focused"), false);
assert.equal(full.read("state.block"), 0);
assert.equal(full.$("back").disabled, true);
assert.equal(full.$("stage-title"), full.$("stage-title"));
assert.doesNotMatch(full.accessibleText(), /\bV7\b|\bIV\b|dominant pressure/i);

const firstWarmup = plan.warmups[0];
const wrongFret = firstWarmup.fretWindow.minFret === firstWarmup.plannedLocation.position.fret
  ? firstWarmup.fretWindow.maxFret : firstWarmup.fretWindow.minFret;
clickWarmupFret(full, wrongFret);
full.$("check-warmup").click();
assert.equal(full.read("state.warmupRevealed"), false);
assert.match(full.$("feedback").textContent, /screen commitment was/i);
assert.doesNotMatch(full.$("feedback").textContent, new RegExp(`fret ${firstWarmup.plannedLocation.position.fret}\\b`));
finishWarmup(full);
full.$("replay").click();
assert.equal(full.read("state.warmupRevealed"), false, "Replay hides a revealed retrieval answer");
assert.equal(full.$("theory-panel").hidden, true);
finishWarmup(full, { assisted: true });
assert.match(full.$("feedback").textContent, /Assisted reveal/);
assert.equal(full.find(full.$("board"), (element) => element.getAttribute("aria-pressed") === "true"), undefined,
  "An assisted reveal clears the learner's stale wrong-fret commitment");
full.$("next").click();
finishWarmup(full); full.$("next").click();
finishWarmup(full); full.$("next").click();

assert.equal(full.read("state.block"), 1);
assert.equal(full.read("state.gravityIndex"), 0);
assert.doesNotMatch(full.accessibleText(), /\bV7\b|\bIV\b|dominant pressure/i);
full.choose("settled");
assert.equal(full.$("next").disabled, false);
full.$("replay").click();
assert.equal(full.read("state.responses.home"), undefined, "Replay clears the current subjective response");
assert.equal(full.$("next").disabled, true);
chooseAndAdvance(full, "settled");
chooseAndAdvance(full, "unfinished");

assert.equal(full.read("currentGravity().id"), "prediction");
full.choose("return");
assert.doesNotMatch(full.accessibleText(), /Now play D7 → G|dominant pressure|\bV7\b|\bIV\b/i);
full.$("commit-prediction").click();
assert.match(full.accessibleText(), /Now play D7 → G/);
assert.doesNotMatch(full.accessibleText(), /dominant pressure|\bV7\b|\bIV\b/i);
full.$("confirm-listened").click();
full.$("next").click();
chooseAndAdvance(full, "redirected");
chooseAndAdvance(full, "changed");
chooseAndAdvance(full, "second");

assert.equal(full.read("currentGravity().id"), "theory-reveal");
assert.equal(full.$("theory-panel").hidden, false);
assert.match(full.accessibleText(), /V7|dominant pressure|F# is the third of D7/);
full.$("next").click();
assert.equal(full.read("state.block"), 2);
assert.match(full.accessibleText(), /F#4 → G4 · m2/);
full.$("next").click();
assert.equal(full.read("state.block"), 3);
assert.match(full.accessibleText(), /tiny phrase/i);
full.$("next").click();

assert.equal(full.read("state.block"), 4);
assert.equal(full.read("currentTransfer().id"), "transfer-compare");
chooseAndAdvance(full, "analogous");
assert.equal(full.read("currentTransfer().id"), "transfer-predict");
commitPredictionAndAdvance(full, "return");
assert.equal(full.read("currentTransfer().id"), "transfer-reveal");
assert.equal(full.$("theory-panel").hidden, true);
assert.equal(full.$("next").hidden, true);
assert.doesNotMatch(full.accessibleText(), /Same relationship, new key|\bV7\b|\bIV\b/);
full.$("show-transfer-theory").click();
assert.equal(full.$("theory-panel").hidden, false);
assert.match(full.accessibleText(), /Same relationship, new key|G# is E7's third/);
full.$("next").click();

assert.equal(full.read("state.block"), 5);
full.$("record-reflection").click();
assert.equal(full.read("state.reflection"), null);
assert.match(full.$("feedback").textContent, /Choose one observation/);
full.$("reflection-choice").value = "fingering";
full.$("immediacy").value = "calculated";
full.$("reflection-choice").dispatch("change");
full.$("record-reflection").click();
assert.equal(full.read("state.reflection.friction"), "fingering");
assert.equal(full.read("state.reflection.immediacy"), "calculated");
assert.equal(full.$("next").hidden, false);
full.$("next").click();
assert.equal(full.read("state.block"), 6);
assert.match(full.accessibleText(), /end of this curated session/i);

full.$("restart").click();
assert.equal(full.read("state.block"), 0);
assert.equal(full.read("state.reflection"), null);
assert.equal(full.read("Object.keys(state.responses).length"), 0);
assert.equal(full.$("theory-panel").hidden, true);

const focusedPage = createPage("/harmony.html");
assert.equal(focusedPage.planCreations(), 1);
assert.equal(focusedPage.read("focused"), true);
assert.equal(focusedPage.read("state.block"), 1);
assert.equal(focusedPage.read("state.gravityIndex"), 0);
assert.equal(focusedPage.$("back").disabled, true);
assert.match(focusedPage.$("page-title").textContent, /Harmonic Gravity/);
assert.doesNotMatch(focusedPage.accessibleText(), /Find the session's reference note|\bV7\b|\bIV\b|dominant pressure/i);
focusedPage.choose("settled");
focusedPage.$("next").click();
focusedPage.$("back").click();
assert.equal(focusedPage.read("state.gravityIndex"), 0);
assert.equal(focusedPage.read("state.responses.home"), undefined, "Back requires a fresh listening response");
focusedPage.$("restart").click();
assert.equal(focusedPage.read("state.block"), 1);
assert.equal(focusedPage.read("state.gravityIndex"), 0);

const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(server, /\["\/practice\.html", "\/practice", "\/harmony\.html", "\/harmony"\]/);
assert.doesNotMatch(server, /harmony-app|harmony-session/);
console.log("Practice Session and focused Harmony route checks passed through retrieval, listening, theory, transfer, reflection, replay, back and restart.");
