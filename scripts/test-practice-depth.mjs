import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { composeIntervalSession } from "../lab/practice-material.mjs";
import * as foundation from "../lab/practice-plan.mjs";
import { composeRoleSession } from "../lab/role-material.mjs";
import * as role from "../lab/role-plan.mjs";
import { prepareRolePerformance, roleCue } from "../lab/role-performance.mjs";
import { renderRoleTask } from "../lab/role-view.mjs";
import * as materials from "../lab/practice-depth-material.mjs";
import * as depth from "../lab/practice-depth-plan.mjs";
import * as sound from "../lab/practice-depth-audio.mjs";
import * as view from "../lab/practice-depth-view.mjs";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import { sampleAttacks } from "../lab/sampled-guitar.mjs";
import { createTestDOM, accessibleText, installRenderer } from "./fretboard-test-dom.mjs";

const queries = engine.musicQueries, formatNote = engine.formatNote;
const compose = (focus, seed = 0) => focus === "role" ? materials.composeRoleDepth({ seed, queries, formatNote })
  : materials.composeIntervalDepth({ quality: focus, seed, queries, formatNote });
const k = materials.depthPositionKey;
const axes = { fretted: new Set(), count: new Set(), degrees: new Set(), contexts: new Set(), named: new Set(), physical: new Set() };
for (let seed = 0; seed < 24; seed += 1) for (const focus of ["major", "minor", "role"]) {
  const p = compose(focus, seed);
  assert.deepEqual(p, compose(focus, seed), "deterministic task replay");
  assert.equal(p.challenge, "stretch"); assert.equal(p.rounds.length, 3);
  const performances = sound.prepareDepthPerformance(p, { queries, availablePositions: STEEL_SAMPLES });
  for (const [index, { material: m }] of p.rounds.entries()) {
    for (const g of m.groups) {
      assert.ok(g.locations.length >= g.required);
      for (const note of g.locations) {
        assert.equal(queries.getNoteAtFret({ position: note.position }).data.semitone, note.semitone);
        if (m.kind === "routes") assert.equal(queries.getInterval({ from: m.root.pitch, to: note.pitch }).data.label, focus === "major" ? "M3" : "m3");
        if (m.kind === "chord-role") assert.ok(queries.analyseNotes({ notes: [note.pitch], context: { currentChord: m.context.spec } }).data[0].chordRelation.matchingTones.some((tone) => tone.degree === m.role));
        if (m.kind === "reverse") assert.equal(queries.getInterval({ from: note.pitch, to: m.source.pitch }).data.label, focus === "major" ? "M3" : "m3");
      }
    }
    let s = { ...depth.beginDepthSession(p), roundIndex: index, stage: "use", selectedPositions: depth.depthAnswers(m).map((n) => n.position) };
    assert.equal(depth.depthSelectionValid(m, s.selectedPositions), true);
    for (const pair of [false, true]) {
      const cue = sound.depthCue(s, performances[index], pair); sampleAttacks(cue);
      if (focus === "role" && pair) assert.deepEqual(cue.map((e) => e.positions[0]), s.selectedPositions, "isolated references follow the learner's retrieved physical strings");
    }
    if (focus === "role") {
      assert.ok(sound.depthCue(s, performances[index]).every((event) => event.gesture === "strum"), "physical use never supplies the learner's melody");
      if (m.kind === "predict") {
        assert.ok(m.comparisons.some((c) => c.relation.isChordTone) && m.comparisons.some((c) => !c.relation.isChordTone));
        assert.equal(new Set(m.comparisons.map((c) => c.anchor.semitone)).size, 1);
      }
    }
  }
  if (focus === "role") {
    const [prediction, comparison, transfer] = p.rounds.map((r) => r.material);
    axes.contexts.add(prediction.comparisons.length); axes.named.add(comparison.named); axes.physical.add(k(prediction.anchors[0].position));
    assert.deepEqual(comparison.anchors.map((n) => n.semitone), transfer.anchors.map((n) => n.semitone));
    assert.notEqual(comparison.comparisons[0].context.id, transfer.comparisons[0].context.id);
    assert.notDeepEqual(comparison.comparisons.map((c) => c.relation.isChordTone), transfer.comparisons.map((c) => c.relation.isChordTone), "changed harmony changes a real fact, not only its order");
  } else {
    const [routes, roleTask, reverse] = p.rounds.map((r) => r.material);
    axes.fretted.add(routes.frettedOnly); axes.count.add(routes.groups[0].required); axes.degrees.add(roleTask.role);
    assert.notEqual(routes.root.pitchClass, reverse.root.pitchClass, "reverse search transfers to a fresh root");
    if (routes.frettedOnly) assert.ok(routes.groups[0].locations.every((n) => n.position.fret > 0));
    else assert.equal(new Set(depth.depthAnswers(routes).map((n) => n.position.stringIndex)).size, 2);
  }
}
assert.deepEqual([...axes.fretted].sort(), [false, true]);
assert.deepEqual([...axes.count].sort(), [1, 2]); assert.deepEqual([...axes.degrees].sort(), [5, 7]);
assert.deepEqual([...axes.contexts].sort(), [2, 3]); assert.deepEqual([...axes.named].sort(), [false, true]); assert.ok(axes.physical.size >= 5);
const major = compose("major"), minor = compose("minor");
assert.deepEqual(major.rounds.map(({ material: m }) => [m.kind, m.root.name, m.target.name]), [["routes", "G3", "B3"], ["chord-role", "D3", "A3"], ["reverse", "C4", "E4"]]);
assert.equal(minor.rounds[1].material.context.symbol, "Am7");
assert.throws(() => compose("major", -1), /seed/);
assert.throws(() => sound.prepareDepthPerformance(major, { queries, availablePositions: STEEL_SAMPLES.slice(0, 12) }), /recording missing/);
assert.deepEqual(compose("major"), major, "rendering failure cannot select a different musical answer");
{
  let s = depth.beginDepthSession(major);
  const m = major.rounds[0].material;
  assert.equal(depth.advanceDepthSession(s, { type: "help" }), s, "help follows a retrieval attempt");
  assert.throws(() => depth.advanceDepthSession(s, { type: "select", position: { stringIndex: 0, fret: 15 } }), /outside/);
  const wrong = m.choices.find((n) => k(n.position) !== k(m.source.position) && !m.groups[0].locations.some((answer) => k(answer.position) === k(n.position)));
  s = depth.advanceDepthSession(s, { type: "select", position: wrong.position });
  s = depth.advanceDepthSession(s, { type: "commit-position" });
  assert.equal(s.stage, "find"); assert.equal(s.attempts, 1);
  s = depth.advanceDepthSession(s, { type: "help" });
  assert.equal(s.stage, "use"); assert.equal(s.assisted, true); assert.equal(depth.depthSelectionValid(m, s.selectedPositions), true);
  assert.equal(depth.advanceDepthSession(s, { type: "next" }), s, "help is not physical use/reflection");
  const fretted = compose("major", 2), f = depth.beginDepthSession(fretted);
  assert.throws(() => depth.advanceDepthSession(f, { type: "select", position: { stringIndex: 4, fret: 0 } }), /outside/);
}
for (let seed = 0; seed < 40; seed += 1) for (const quality of ["major", "minor"]) {
  const common = { quality, seed, queries };
  assert.deepEqual(composeIntervalSession({ ...common, availablePositions: STEEL_SAMPLES }), composeIntervalSession({ ...common, availablePositions: STEEL_SAMPLES.slice(0, 12) }), "alternate-string recordings must not alter Foundation replay");
}

// All feelings/preferences take identical paths; only declared physical facts are checked.
for (const response of depth.DEPTH_IMPRESSIONS) {
  let s = depth.beginDepthSession(compose("role"));
  assert.equal(depth.advanceDepthSession(s, { type: "audition" }), s, "prediction cannot be skipped by audition");
  s = depth.advanceDepthSession(s, { type: "response", value: response });
  s = depth.advanceDepthSession(s, { type: "commit-response" });
  assert.equal(s.stage, "hear"); assert.equal(s.predictions[0], response);
  s = depth.advanceDepthSession(s, { type: "response", value: response });
  assert.equal(depth.advanceDepthSession(s, { type: "commit-response" }), s);
  s = depth.advanceDepthSession(s, { type: "audition" });
  s = depth.advanceDepthSession(s, { type: "commit-response" });
  assert.equal(s.impressions[0], response); assert.equal(s.stage, "predict");
}
for (const response of depth.DEPTH_COMPARISONS) {
  const s = { ...depth.beginDepthSession(compose("role")), roundIndex: 1, stage: "hear", auditioned: true };
  const next = depth.advanceDepthSession(depth.advanceDepthSession(s, { type: "response", value: response }), { type: "commit-response" });
  assert.equal(next.stage, "reveal"); assert.deepEqual(next.plan, s.plan); assert.equal(next.impressions[0], response);
}

const html = await readFile(new URL("../lab/instrument-desk.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/instrument-desk-app.js", import.meta.url), "utf8");
function page(focus, seed = 0) {
  const { document, root, $ } = createTestDOM(html);
  $("practice-focus").value = focus; $("practice-challenge").value = "stretch";
  const pending = [];
  const context = vm.createContext({ ...engine, ...foundation, ...role, ...materials, ...depth, ...sound, ...view,
    composeIntervalSession, composeRoleSession, prepareRolePerformance, roleCue, renderRoleTask, STEEL_SAMPLES, document, console, addEventListener() {},
    createSampledGuitar: () => ({ stop() {}, play(events) { return new Promise((resolve, reject) => pending.push({ events, resolve, reject })); } }),
  });
  installRenderer(context);
  vm.runInContext(app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, ""), context);
  vm.runInContext("nextSeed = " + seed, context);
  return { $, pending, read: (expr) => vm.runInContext(expr, context), text: () => accessibleText(root) };
}
const flush = () => new Promise(setImmediate);
async function audition(p, id = "hear-root") {
  p.$(id).click(); const request = p.pending.shift(); assert.ok(request);
  sampleAttacks(request.events); request.resolve({ durationSeconds: 12 }); await flush(); return request.events;
}
function selectAnswers(p) {
  const m = p.read("session.plan.rounds[session.roundIndex].material");
  const buttons = p.$("desk-board").querySelectorAll("button");
  for (const note of depth.depthAnswers(m)) buttons.find((b) => Number(b.dataset.stringIndex) === note.position.stringIndex && Number(b.dataset.fret) === note.position.fret).click();
  p.$("check-position").click(); assert.equal(p.read("session.stage"), "use");
}
function reflect(p) {
  p.$("depth-played").checked = true; p.$("depth-played").dispatch("change");
  p.$("depth-reflect-exploring").dispatch("change");
}
for (const quality of ["major", "minor"]) {
  const p = page(quality); p.$("start-practice").click();
  for (let round = 0; round < 3; round += 1) {
    assert.equal(p.read("session.stage"), "find"); assert.equal(p.$("depth-facts").children.length, 0);
    const m = p.read("session.plan.rounds[session.roundIndex].material");
    assert.doesNotMatch(p.$("task-title").textContent, new RegExp(round === 2 ? m.root.name : m.target.name));
    if (round === 0) {
      const first = depth.depthAnswers(m)[0];
      p.$("desk-board").querySelectorAll("button").find((b) => Number(b.dataset.stringIndex) === first.position.stringIndex && Number(b.dataset.fret) === first.position.fret).click();
      p.$("check-position").click(); assert.equal(p.read("session.stage"), "find", "one route cannot satisfy two positions");
      p.$("desk-board").querySelectorAll("button").find((b) => b.getAttribute("aria-pressed") === "true").click();
    }
    selectAnswers(p); assert.ok(p.$("depth-facts").textContent.includes(m.interval.name));
    await audition(p, "hear-pair"); reflect(p); p.$("depth-next").click();
  }
  assert.equal(p.read("view"), "complete"); assert.equal(p.$("complete-rounds").children.length, 3);
  p.$("another-session").click(); assert.equal(p.read("session.plan.seed"), 1);
  p.$("pause-practice").click(); p.$("practice-challenge").value = "foundation"; p.$("practice-challenge").dispatch("change");
  p.$("start-practice").click(); assert.equal(p.read("isStretch()"), false); assert.equal(p.$("depth-controls").hidden, true);
  assert.equal(p.$("hear-root").disabled, false); assert.equal(p.$("depth-facts").children.length, 0);
}
for (const seed of [0, 3]) {
  const p = page("role", seed); p.$("start-practice").click();
  const count = p.read("session.plan.rounds[0].material.comparisons.length");
  for (let i = 0; i < count; i += 1) {
    assert.equal(p.read("session.stage"), "predict"); assert.equal(p.$("hear-root").disabled, true);
    assert.doesNotMatch(p.text(), /chord tone|non-chord tone|Perfect 4th|Minor 7th/);
    p.$("depth-tense").dispatch("change"); p.$("depth-next").click();
    if (i === 0 && seed === 0) {
      p.$("hear-root").click(); const cancelled = p.pending.shift(); p.$("pause-practice").click();
      cancelled.resolve({ cancelled: true }); await flush(); p.$("continue-practice").click();
      assert.equal(p.read("session.auditioned"), false);
      p.$("hear-root").click(); p.pending.shift().reject(new Error("offline")); await flush();
      assert.match(p.$("audio-status").textContent, /could not load/);
      p.$("depth-settled").dispatch("change"); assert.equal(p.$("depth-next").disabled, true);
    }
    await audition(p); p.$("depth-settled").dispatch("change"); p.$("depth-next").click();
  }
  assert.equal(p.read("session.stage"), "reveal");
  assert.match(p.$("depth-facts").textContent, /prediction: tense; your hearing: settled/);
  assert.doesNotMatch(p.text(), /wrong prediction|correct feeling|score:/i);
  p.$("depth-next").click(); selectAnswers(p);
  reflect(p); assert.equal(p.$("depth-next").disabled, true);
  await audition(p, "hear-pair"); assert.equal(p.read("session.backingAuditioned"), false);
  await audition(p); p.$("depth-next").click();
  for (let round = 1; round <= 2; round += 1) {
    assert.equal(p.read("session.stage"), "hear");
    assert.equal(p.$("board-panel").hidden, true); assert.equal(p.$("depth-facts").children.length, 0);
    assert.equal(p.$("depth-use-copy").textContent, "");
    if (seed === 3) { assert.match(p.$("relationship-title").textContent, /Pitch A/); assert.doesNotMatch(p.text(), /B3|C4/); }
    const cue = await audition(p); assert.equal(cue.length, 4);
    p.$("depth-compare-unsure").dispatch("change"); p.$("depth-next").click();
    assert.equal(p.read("session.stage"), "reveal"); assert.match(p.$("depth-facts").textContent, /Your comparison: Unsure/);
    p.$("depth-next").click(); selectAnswers(p);
    reflect(p); const backing = await audition(p); assert.ok(backing.every((e) => e.gesture === "strum"));
    p.$("depth-next").click();
  }
  assert.equal(p.read("view"), "complete"); assert.equal(p.$("complete-rounds").children.length, 3);
}
const source = await readFile(new URL("../lab/practice-depth-material.mjs", import.meta.url), "utf8");
assert.doesNotMatch(source, /STEEL_SAMPLES|availablePositions|sampled-guitar|AudioContext|%\s*12/);
console.log("Practice Depth: alternate routes, chord-role/reverse facts, independent axes, Foundation replay, prediction/comparison disclosure, ungraded responses, sampled backing and complete runtime paths passed.");
