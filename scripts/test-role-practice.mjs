import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { composeIntervalSession } from "../lab/practice-material.mjs";
import * as interval from "../lab/practice-plan.mjs";
import { composeRoleSession, roleMaterials } from "../lab/role-material.mjs";
import * as roles from "../lab/role-plan.mjs";
import { prepareRolePerformance, roleCue } from "../lab/role-performance.mjs";
import { renderRoleTask } from "../lab/role-view.mjs";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import { sampleAttacks } from "../lab/sampled-guitar.mjs";
import { createTestDOM, accessibleText, installRenderer } from "./fretboard-test-dom.mjs";

const compose = (seed = 0) => composeRoleSession({ seed, queries: engine.musicQueries, formatNote: engine.formatNote });
const materials = roleMaterials({ queries: engine.musicQueries, formatNote: engine.formatNote });
assert.deepEqual(materials.map((m) => m.anchor.name), ["C4", "G3", "D3"]);
const main = compose().rounds[0].material;
assert.deepEqual(main.contexts.map((c) => [c.symbol, c.relation.interval.label, c.relation.isChordTone]), [
  ["G", "P4", false], ["C", "P1", true], ["D7", "m7", true],
]);
for (let seed = 0; seed < 12; seed += 1) {
  const p = compose(seed);
  assert.deepEqual(p, compose(seed), "deterministic role replay");
  assert.equal(p.version, 1);
  const [a, b] = p.rounds.map((round) => round.material);
  assert.notEqual(a.anchor.pitchClass, b.anchor.pitchClass);
  assert.notDeepEqual(a.contexts.map((c) => c.id), b.contexts.map((c) => c.id));
  assert.notDeepEqual(a.contexts.map((c) => c.relation.interval.label), b.contexts.map((c) => c.relation.interval.label));
  for (const m of [a, b]) {
    assert.equal(m.locations.length, 1);
    assert.ok(m.choices.every((note) => [2, 3, 4].includes(note.position.stringIndex) && note.position.fret <= 2));
    assert.equal(m.contexts.filter((c) => c.relation.isChordTone).length, 2);
    const performance = prepareRolePerformance(m, { queries: engine.musicQueries, availablePositions: STEEL_SAMPLES });
    for (const mode of ["context", "comparisons", "anchor", "backing"]) sampleAttacks(roleCue(m, performance, mode));
    const comparison = roleCue(m, performance, "comparisons");
    assert.deepEqual(comparison.filter((e) => e.gesture === "pluck").map((e) => e.pitches[0]), [m.anchor.pitch, m.anchor.pitch, m.anchor.pitch]);
    const backing = roleCue(m, performance, "backing");
    assert.equal(backing.length, 6);
    assert.ok(backing.every((event) => event.gesture === "strum"), "physical use supplies harmony, not an extra anchor performance");
    assert.deepEqual(backing.map((e) => e.at), [0, 2, 4, 6, 8, 10]);
    assert.deepEqual(performance.contexts.map((c) => c.positions.length).sort(), [4, 5, 6]);
  }
}
assert.throws(() => compose(-1), /seed/);
assert.throws(() => prepareRolePerformance(main, { queries: engine.musicQueries, availablePositions: STEEL_SAMPLES.filter((s) => s.note !== "F#4") }), /coverage is missing/);
assert.deepEqual(compose(), compose(), "rendering failure cannot alter the musical material or select another answer");

// All subjective responses take exactly the same ungraded path to the same facts.
for (const value of roles.LISTENING_IMPRESSIONS) {
  let s = roles.beginRoleSession(compose());
  assert.equal(roles.advanceRoleSession(s, { type: "commit-impression" }), s);
  for (let i = 0; i < 3; i += 1) {
    s = roles.advanceRoleSession(s, { type: "impression", value });
    assert.equal(roles.advanceRoleSession(s, { type: "commit-impression" }), s, "a selection alone is not an audition");
    s = roles.advanceRoleSession(s, { type: "audition" });
    s = roles.advanceRoleSession(s, { type: "commit-impression" });
  }
  assert.equal(s.stage, "reveal");
  assert.deepEqual(s.impressions, [value, value, value]);
  assert.deepEqual(s.plan, compose());
}

const html = await readFile(new URL("../lab/instrument-desk.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/instrument-desk-app.js", import.meta.url), "utf8");
function page() {
  const { document, root, $ } = createTestDOM(html);
  $("practice-focus").value = "role";
  const pending = [];
  let stops = 0;
  const context = vm.createContext({
    ...engine, ...interval, ...roles, composeIntervalSession, composeRoleSession, prepareRolePerformance, roleCue,
    renderRoleTask, STEEL_SAMPLES, document, console, addEventListener() {},
    createSampledGuitar: () => ({
      stop() { stops += 1; },
      play(events) { return new Promise((resolve, reject) => pending.push({ events, resolve, reject })); },
    }),
  });
  installRenderer(context);
  vm.runInContext(app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, ""), context);
  return { $, root, read: (s) => vm.runInContext(s, context), pending, stopped: () => stops, text: () => accessibleText(root) };
}
const p = page();
p.$("start-practice").click();
assert.equal(p.read("session.plan.family"), "role-ear");
assert.equal(p.$("board-panel").hidden, true, "listen before fretboard answers");
assert.equal(p.$("role-next").disabled, true);
const firstPlan = p.read("session.plan");
for (let round = 0; round < 2; round += 1) {
  for (let context = 0; context < 3; context += 1) {
    assert.equal(p.read("session.stage"), "hear");
    assert.equal(p.read("session.contextIndex"), context);
    assert.equal(p.$("role-facts").children.length, 0);
    assert.doesNotMatch(p.text(), /Perfect 4th|Perfect 1st|Minor 7th|chord tone|non-chord tone/);
    if (round === 0 && context === 0) {
      p.$("hear-root").click();
      const cancelled = p.pending.shift();
      p.$("pause-practice").click();
      const paused = p.read("session");
      cancelled.resolve({ cancelled: true }); await new Promise(setImmediate);
      assert.equal(p.read("session.auditioned"), false);
      p.$("continue-practice").click();
      assert.equal(p.read("session"), paused);
      p.$("hear-root").click();
      p.pending.shift().reject(new Error("offline")); await new Promise(setImmediate);
      assert.match(p.$("audio-status").textContent, /could not load/);
      assert.equal(p.read("session.auditioned"), false);
    }
    p.$("hear-root").click();
    const cue = p.pending.shift();
    assert.equal(cue.events.length, 2);
    cue.resolve({ durationSeconds: 3 }); await new Promise(setImmediate);
    assert.equal(p.read("session.auditioned"), true);
    p.$("role-tense").dispatch("change");
    assert.equal(p.$("role-next").disabled, false);
    p.$("role-next").click();
  }
  assert.equal(p.read("session.stage"), "reveal");
  assert.equal(p.$("role-facts").children.length, 3);
  assert.match(p.text(), /Your impression: tense/);
  assert.match(p.text(), /chord tone/);
  assert.doesNotMatch(p.text(), /wrong impression|correct impression|score:/i);
  p.$("role-next").click();
  assert.equal(p.read("session.stage"), "find");
  const m = p.read("session.plan.rounds[session.roundIndex].material");
  const cells = p.$("desk-board").querySelectorAll("button").filter((cell) => !cell.disabled);
  assert.equal(cells.length, 9);
  assert.ok(cells.every((cell) => !cell.getAttribute("aria-label").includes(m.anchor.name)), "location withheld even after pitch/role reveal");
  const answer = cells.find((cell) => Number(cell.dataset.stringIndex) === m.anchor.position.stringIndex && Number(cell.dataset.fret) === m.anchor.position.fret);
  if (round === 0) {
    cells.find((cell) => cell !== answer).click(); p.$("check-position").click();
    assert.equal(p.read("session.stage"), "find");
    assert.equal(p.$("help-reveal").hidden, false);
    p.$("help-reveal").click();
    assert.equal(p.read("session.assisted"), true);
  } else {
    answer.key("Enter"); p.$("check-position").click();
  }
  assert.equal(p.read("session.stage"), "use");
  p.$("role-played").checked = true; p.$("role-played").dispatch("change");
  assert.equal(p.$("role-next").disabled, true, "physical-use acknowledgement alone cannot skip supplied harmony");
  p.$("hear-pair").click();
  p.pending.shift().resolve({ durationSeconds: 2 }); await new Promise(setImmediate);
  assert.equal(p.read("session.backingAuditioned"), false, "hearing anchor alone is not changing harmony");
  p.$("hear-root").click();
  const backing = p.pending.shift();
  assert.equal(backing.events.length, 6);
  assert.ok(backing.events.every((event) => event.gesture === "strum"));
  backing.resolve({ durationSeconds: 12 }); await new Promise(setImmediate);
  assert.equal(p.read("session.backingAuditioned"), true);
  assert.equal(p.$("role-next").disabled, false);
  p.$("role-next").click();
}
assert.equal(p.read("view"), "complete");
assert.match(p.text(), /Session complete/);
assert.equal(p.$("complete-rounds").children.length, 2);
p.$("another-session").click();
assert.equal(p.read("session.stage"), "hear");
assert.equal(p.read("session.plan.seed"), 1);
assert.notEqual(p.read("session.plan.rounds[0].material.anchor.name"), firstPlan.rounds[0].material.anchor.name);
p.$("pause-practice").click();
p.$("practice-focus").value = "major"; p.$("practice-focus").dispatch("change");
assert.equal(p.$("continue-practice").textContent, "Continue ear practice", "focus choice must not mislabel the paused session");
p.$("start-practice").click();
assert.equal(p.read("session.plan.family"), "interval-hunt");
assert.equal(p.$("role-controls").hidden, true);
assert.equal(p.$("role-facts").children.length, 0);
assert.match(p.$("task-title").textContent, /major third/);
p.$("pause-practice").click();
p.$("practice-focus").value = "role"; p.$("practice-focus").dispatch("change");
assert.equal(p.$("continue-practice").textContent, "Continue major thirds");
p.$("continue-practice").click();
assert.equal(p.read("session.plan.family"), "interval-hunt", "Continue resumes the named session; Start fresh uses the chosen focus");
assert.ok(p.stopped() >= 14);
const source = await readFile(new URL("../lab/role-material.mjs", import.meta.url), "utf8");
assert.doesNotMatch(source, /STEEL_SAMPLES|availablePositions|sampled-guitar|AudioContext/);
console.log("Role Practice: engine facts first, deterministic transfer, ungraded commitments, disclosure, fixed-note backing, cancellation/retry and shared-runtime path passed.");
