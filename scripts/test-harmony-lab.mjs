import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { createHarmonyPlan, matchesPlannedPosition } from "../lab/harmony-session.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.data;
}
const queries = {
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD, fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex], pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
};
const plan = createHarmonyPlan(queries);
assert.deepEqual(plan.lessons.map(({ entry }) => [engine.formatNote(entry.chord.root), entry.chord.chordId, entry.romanNumeral.label]), [
  ["F", "major", "IV"], ["D", "minor", "ii"], ["C", "major", "IV"], ["G", "dominant7", "V7"],
]);
assert.deepEqual(plan.lessons.map(({ tasks }) => tasks.map(({ plannedLocation }) => engine.formatPitch(plannedLocation.pitch))), [
  ["F3", "A3", "C4"], ["D4", "F4", "A4"], ["C4", "E4", "G4"], ["G3", "B3", "D4", "F4"],
]);
assert.equal(plan.reverse.entry.degree, 6);
assert.equal(plan.reverse.entry.romanNumeral.label, "vi");
assert.equal(engine.formatNote(plan.reverse.entry.chord.root), "A");
assert.deepEqual(createHarmonyPlan(queries), plan);
assert.ok(Object.isFrozen(plan));
for (const lesson of plan.lessons) {
  assert.ok(Object.isFrozen(lesson));
  assert.ok(Object.isFrozen(lesson.tasks));
  const derived = queries.getHarmony({ key: lesson.key, chordSize: lesson.chordSize }).degrees[lesson.entry.degree - 1];
  assert.deepEqual(lesson.entry, derived);
  for (const task of lesson.tasks) {
    assert.ok(Object.isFrozen(task));
    assert.ok(Object.isFrozen(task.plannedLocation.position));
    assert.equal(task.plannedLocation.position.stringIndex, lesson.stringIndex);
    assert.ok(task.plannedLocation.position.fret >= lesson.fretWindow.minFret);
    assert.ok(task.plannedLocation.position.fret <= lesson.fretWindow.maxFret);
    assert.ok(queries.findLocations({ key: lesson.key, chord: lesson.entry.chord, stringIndex: lesson.stringIndex, pitchClass: task.tone.pitchClass })
      .some(({ position }) => matchesPlannedPosition(task, position)));
    const played = unwrap(engine.musicQueries.getInterval({ from: lesson.tasks[0].plannedLocation.pitch, to: task.plannedLocation.pitch }));
    assert.equal(played.semitones, task.tone.interval.semitones);
    assert.equal(matchesPlannedPosition(task, { stringIndex: (lesson.stringIndex + 1) % 6, fret: task.plannedLocation.position.fret }), false);
    assert.equal(matchesPlannedPosition(task, null), false);
  }
}
assert.equal(matchesPlannedPosition(plan.lessons[3].tasks[3], { stringIndex: 2, fret: 3 }), false);
assert.equal(unwrap(engine.musicQueries.getNoteAtFret({ position: { stringIndex: 2, fret: 3 } })).pitchClass, plan.lessons[3].tasks[3].tone.pitchClass);
assert.throws(() => createHarmonyPlan({ ...queries, findLocations: () => [] }), /No complete ascending/);

// A small DOM adapter exercises the actual app callbacks; no browser framework or product state layer.
const html = await readFile(new URL("../lab/harmony.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/harmony-app.js", import.meta.url), "utf8");
let document;
class Element {
  constructor(tagName = "div") {
    this.tagName = tagName; this.children = []; this.parentElement = null;
    this.hidden = false; this.disabled = false; this.value = ""; this.checked = false;
    this.dataset = {}; this.style = {}; this.attributes = {}; this.handlers = new Map(); this._text = "";
  }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
  replaceChildren(...children) {
    if (document?.activeElement && this.children.some((child) => child.contains(document.activeElement))) document.activeElement = null;
    for (const child of this.children) child.parentElement = null;
    this.children = []; this.append(...children);
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]); }
  focus() { document.activeElement = this; }
  dispatch(name) { for (const handler of this.handlers.get(name) ?? []) handler({ target: this }); }
  click() { assert.equal(this.hidden, false, "Cannot click a hidden control"); assert.equal(this.disabled, false, "Cannot click a disabled control"); this.dispatch("click"); }
}
const elements = new Map();
for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
  const id = /\bid="([^"]+)"/.exec(match[2])?.[1];
  if (id) { const element = new Element(match[1]); element.hidden = /\bhidden\b/.test(match[2]); elements.set(id, element); }
}
const radios = [...html.matchAll(/<input\b[^>]*name="reflection"[^>]*value="([^"]+)"[^>]*>/g)]
  .map((match) => Object.assign(new Element("input"), { value: match[1] }));
assert.equal(radios.length, 6);
document = {
  activeElement: null,
  getElementById(id) { assert.ok(elements.has(id), `Unknown DOM id ${id}`); return elements.get(id); },
  createElement(tagName) { return new Element(tagName); },
  querySelector(selector) { assert.equal(selector, 'input[name="reflection"]:checked'); return radios.find(({ checked }) => checked) ?? null; },
  querySelectorAll(selector) { assert.equal(selector, 'input[name="reflection"]'); return radios; },
};
let registeredIntervalQueries = 0;
const context = vm.createContext({
  ...engine, document, createHarmonyPlan, matchesPlannedPosition,
  musicQueries: { ...engine.musicQueries, getInterval(request) { registeredIntervalQueries += 1; return engine.musicQueries.getInterval(request); } },
});
const executable = app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, "");
vm.runInContext(executable, context, { filename: "harmony-app.js" });
const read = (expression) => vm.runInContext(expression, context);
const $ = (id) => document.getElementById(id);
const find = (element, predicate) => predicate(element) ? element : element.children.map((child) => find(child, predicate)).find(Boolean);
const clickFret = (fret) => {
  const button = find($("board"), (element) => element.dataset.fret === String(fret));
  assert.ok(button, `Fret ${fret} is in the displayed window`);
  button.focus(); button.click();
  assert.equal(document.activeElement, button, "Selecting a fret preserves keyboard focus");
  assert.equal(button.getAttribute("aria-pressed"), "true");
};
const chooseReflection = (value) => {
  for (const radio of radios) radio.checked = radio.value === value;
  radios.find((radio) => radio.value === value).dispatch("change");
};

assert.equal(read("stage().kind"), "orient");
$("continue").click();
assert.equal(read("stage().kind"), "root");
assert.doesNotMatch($("prompt").textContent + $("instruction").textContent, /\bF\b|\bIV\b/);
assert.equal($("theory").hidden, true);
assert.equal($("theory-rows").textContent, "");
$("check").click(); assert.equal(read("state.solved"), false);
clickFret(6); $("check").click();
assert.equal(read("state.solved"), false); assert.match($("feedback").textContent, /Committed/);
assert.equal($("theory").hidden, true);
$("hint").click(); assert.match($("feedback").textContent, /Assisted note-name reveal: F/);
assert.doesNotMatch($("feedback").textContent, /fret 8|\bIV\b/);
clickFret(8); $("check").click();
assert.equal(read("state.solved"), true); assert.equal($("hint").hidden, true);
assert.equal($("theory").hidden, true);
$("continue").click();
assert.equal(read("stage().kind"), "stack");
assert.match($("prompt").textContent, /moving upward in pitch/);
clickFret(8); $("check").click(); assert.equal(read("state.roleIndex"), 1);
clickFret(12); $("check").click(); assert.equal(read("state.roleIndex"), 2);
clickFret(15); $("check").click(); assert.equal(read("state.solved"), true);
const savedCount = read("state.earned.length");
read("check()"); assert.equal(read("state.earned.length"), savedCount);
$("continue").click();
$("quality").value = "minor"; $("check").click();
assert.equal($("theory").hidden, true); assert.equal(read("state.solved"), false);
$("quality").value = "major"; $("check").click();
assert.equal($("theory").hidden, false);
assert.match($("theory-rows").textContent, /IV/);
assert.match($("theory-rows").textContent, /F3.*P1.*A3.*M3.*C4.*P5/);
assert.equal(registeredIntervalQueries, 3);

function finishUntilReflection() {
  for (let guard = 0; guard < 60; guard += 1) {
    const current = read("stage()");
    if (current.kind === "reflect") return;
    if (current.kind === "orient") { $("continue").click(); continue; }
    if (read("state.solved")) { $("continue").click(); continue; }
    if (current.kind === "root" || current.kind === "stack") {
      if (current.kind === "root" && current.lessonIndex === 2) assert.doesNotMatch($("prompt").textContent + $("instruction").textContent, /\bC\b|\bIV\b/);
      const item = plan.lessons[current.lessonIndex];
      const roleIndex = current.kind === "root" ? 0 : read("state.roleIndex");
      if (current.lessonIndex === 3 && roleIndex === 3) {
        clickFret(3); $("check").click(); assert.equal(read("state.solved"), false); assert.equal(read("state.roleIndex"), 3);
      }
      clickFret(item.tasks[roleIndex].plannedLocation.position.fret); $("check").click();
    } else if (current.kind === "quality") {
      $("quality").value = plan.lessons[current.lessonIndex].entry.chord.chordId; $("check").click();
    } else if (current.kind === "reverse") {
      assert.equal($("theory").hidden, true);
      $("reverse-degree").value = "5"; $("reverse-roman").value = "V"; $("check").click();
      assert.equal(read("state.solved"), false);
      $("reverse-degree").value = "6"; $("reverse-roman").value = "vi"; $("check").click();
      assert.equal(read("state.solved"), true); assert.match($("theory-rows").textContent, /vi/);
    } else assert.fail(`Unexpected stage ${current.kind}`);
  }
  assert.fail("The bounded session did not reach reflection");
}
finishUntilReflection();
assert.equal($("continue").hidden, true);
$("check").click(); assert.equal(read("state.solved"), false);
chooseReflection("none"); $("check").click();
assert.equal(read("state.reflection"), "none"); assert.equal($("continue").hidden, false);
chooseReflection("quality"); assert.equal($("continue").hidden, true); assert.equal(read("state.reflection"), null);
$("check").click(); $("continue").click();
assert.equal(read("stage().kind"), "complete");
$("restart").click();
assert.equal(read("stage().kind"), "orient");
assert.equal(read("state.reflection"), null); assert.equal(read("state.earned.length"), 0);
assert.equal(radios.some(({ checked }) => checked), false);
finishUntilReflection();
assert.equal($("continue").hidden, true, "A restarted session cannot reuse the previous reflection");
assert.equal(radios.some(({ checked }) => checked), false);
assert.doesNotMatch(html, /\bIV\b|\bvi\b|F A C|D F A/);
assert.doesNotMatch(app, /localStorage|indexedDB|AudioContext|setInterval|fetch\(/);
assert.match(app, /from "\/harmony-session\.mjs"/);
assert.match(html, /software checks committed notes/);
console.log("Harmony Lab focused plan and actual-app behavior checks passed, including replay and keyboard focus.");
