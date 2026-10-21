import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { getMelodyRules, getMelodyRuleById } from "../lab/rule-contract.mjs";
import { generateMelodyScenario, generateDistinctMelodyScenario, getScenarioFingerprint, MIN_PEDAGOGICAL_SCORE, GenerationError, createPrng } from "../lab/melody-generator.mjs";
import { resolveScenario, ScenarioError } from "../lab/scenario-resolver.mjs";
import { createMelodyPlan } from "../lab/melody-session.mjs";
import { chordRole, pathConnections } from "../lab/phrase-material.mjs";
import { getMelodyScenarios, getMotifScenarios } from "../lab/scenario-catalogue.mjs";
import { createTestDOM, installRenderer, accessibleText, all } from "./fretboard-test-dom.mjs";

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

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
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
};

// 1. PRNG determinism & reproducibility
const prng1 = createPrng(4821);
const prng2 = createPrng(4821);
const seq1 = Array.from({ length: 20 }, () => prng1());
const seq2 = Array.from({ length: 20 }, () => prng2());
assert.deepEqual(seq1, seq2, "PRNG is deterministic given the same seed");
const prngDiff = createPrng(4822);
const seqDiff = Array.from({ length: 20 }, () => prngDiff());
assert.notDeepEqual(seq1, seqDiff, "Different seeds produce different sequences");

// 2. Rule catalogue completeness
const rules = getMelodyRules();
assert.equal(rules.length, 3);
assert.equal(getMelodyRuleById("rule-dominant-third").family, "dominant-third");
assert.equal(getMelodyRuleById("rule-dominant-seventh").family, "dominant-seventh");
assert.equal(getMelodyRuleById("rule-target-trajectory").family, "target-trajectory");
assert.equal(getMelodyRuleById("nonexistent"), undefined);

// 3. High-volume generator quality tests across families & difficulties
let totalGenerations = 0;
const SEEDS_PER_COMBINATION = 35; // 35 * 3 * 3 = 315 generations

for (const rule of rules) {
  for (const difficulty of ["introductory", "developing", "transfer"]) {
    for (let seed = 1; seed <= SEEDS_PER_COMBINATION; seed += 1) {
      totalGenerations += 1;
      const result = generateMelodyScenario({ ruleId: rule.id, difficulty, seed, queries });

      // Provenance assertions
      assert.equal(result.provenance.source, "generated");
      assert.equal(result.provenance.ruleId, rule.id);
      assert.equal(result.provenance.family, rule.family);
      assert.equal(result.provenance.difficulty, difficulty);
      assert.equal(result.provenance.seed, seed);
      assert.ok(result.provenance.attempts >= 1);
      assert.ok(result.provenance.score >= MIN_PEDAGOGICAL_SCORE, `Scenario score ${result.provenance.score} must meet floor ${MIN_PEDAGOGICAL_SCORE}`);
      assert.ok(result.provenance.fingerprint, "Scenario has deterministic fingerprint");
      assert.equal(result.provenance.fingerprint, getScenarioFingerprint(result), "Fingerprint matches helper calculation");

      // ScenarioV1 schema assertions
      const s = result.scenario;
      assert.equal(s.version, 1);
      assert.equal(s.type, "melody");
      assert.ok(s.id.startsWith(`gen-${rule.family}-${difficulty}-${seed}`));
      assert.ok(s.title && s.description);
      assert.equal(s.difficulty, difficulty);
      assert.ok(Array.isArray(s.context.degrees) && s.context.degrees.length >= 3);
      assert.ok(["triad", "seventh"].includes(s.context.chordSize));
      assert.ok(s.transfer.key.tonic.letter);
      assert.ok(s.fretboard.main.strings.length >= 1);
      assert.ok(s.targets.target.degree);
      assert.ok(s.targets.arrival.degree);
      assert.ok(s.targets.arrival.chordIndex > s.targets.target.chordIndex);

      // Resolved material assertions
      const m = result.resolved;
      assert.ok(Object.isFrozen(m));
      assert.ok(Object.isFrozen(m.main));
      assert.ok(Object.isFrozen(m.transfer));
      assert.equal(m.main.targetMotion.diatonicSteps, m.transfer.targetMotion.diatonicSteps);
      assert.equal(m.main.targetMotion.semitones, m.transfer.targetMotion.semitones);

      // Pedagogical consumption test: createMelodyPlan
      const plan = createMelodyPlan(m);
      assert.equal(plan.stages.length, 10);
      for (const stage of plan.stages) {
        assert.ok(stage.title && stage.prompt && stage.instruction);
        if (stage.kind === "select") {
          const evalPass = plan.evaluate(stage, stage.answer.position.fret);
          assert.equal(evalPass.correct, true, `${s.id}: ${stage.id} answer should pass`);
          const evalFail = plan.evaluate(stage, -1);
          assert.equal(evalFail.correct, false, `${s.id}: ${stage.id} invalid fret should fail`);
        }
      }
    }
  }
}
assert.equal(totalGenerations, SEEDS_PER_COMBINATION * 9);

// 4. Exact reproducibility & surface fingerprint tests
const genA = generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "introductory", seed: 9942, queries });
const genB = generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "introductory", seed: 9942, queries });
assert.deepEqual(JSON.parse(JSON.stringify(genA)), JSON.parse(JSON.stringify(genB)), "Identical seed produces identical JSON");

const fpA = getScenarioFingerprint(genA);
const fpB = getScenarioFingerprint(genB);
assert.equal(fpA, fpB, "Identical scenarios produce identical fingerprints");
assert.ok(fpA.startsWith("family:dominant-third|key:"), "Fingerprint starts with family and key");
assert.ok(fpA.includes("|prog:"), "Fingerprint contains progression");
assert.ok(fpA.includes("|rel:"), "Fingerprint contains target/arrival relationship");
assert.ok(fpA.includes("|targetPos:"), "Fingerprint contains target fretboard position");
assert.ok(fpA.includes("|region:"), "Fingerprint contains fretboard region");
assert.ok(fpA.includes("|transferKey:"), "Fingerprint contains transfer key");

// Generate distinct surface test
const distinctCandidate = generateDistinctMelodyScenario({
  ruleId: "rule-dominant-third",
  difficulty: "introductory",
  currentSeed: 9942,
  currentFingerprint: fpA,
  queries,
});
const distinctFp = getScenarioFingerprint(distinctCandidate);
assert.notEqual(distinctFp, fpA, "Distinct scenario has different surface fingerprint");
assert.ok(distinctCandidate.provenance.seed > 9942, "Seed advanced to produce distinct surface");
assert.ok(distinctCandidate.provenance.score >= MIN_PEDAGOGICAL_SCORE, "Distinct scenario meets score floor");

// 5. Diversity tests across 50 seeds
const keysObserved = new Set();
const fretSpansObserved = new Set();
const transferKeysObserved = new Set();

for (let seed = 1; seed <= 50; seed += 1) {
  const res = generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "developing", seed, queries });
  keysObserved.add(res.scenario.context.key.tonic.letter);
  fretSpansObserved.add(`${res.scenario.fretboard.main.minFret}-${res.scenario.fretboard.main.maxFret}`);
  transferKeysObserved.add(res.scenario.transfer.key.tonic.letter);
}

assert.ok(keysObserved.size >= 4, `Expected >= 4 distinct keys, got ${keysObserved.size}: ${[...keysObserved].join(", ")}`);
assert.ok(fretSpansObserved.size >= 2, `Expected varied fret regions, got ${fretSpansObserved.size}`);
assert.ok(transferKeysObserved.size >= 3, `Expected varied transfer keys, got ${transferKeysObserved.size}`);

// 6. Pedagogical-quality invariant tests
// Introductory scenarios must have compact fret span and comfortable register
for (let seed = 1; seed <= 20; seed += 1) {
  const res = generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "introductory", seed, queries });
  const span = res.scenario.fretboard.main.maxFret - res.scenario.fretboard.main.minFret;
  assert.ok(span <= 9, "Introductory fretboard span is bounded");
  assert.ok(res.scenario.fretboard.main.minFret <= 5, "Introductory region starts in comfortable lower neck");
}

// Target trajectory motion must be within useful musical distance
for (let seed = 1; seed <= 20; seed += 1) {
  const res = generateMelodyScenario({ ruleId: "rule-target-trajectory", difficulty: "introductory", seed, queries });
  const semi = Math.abs(res.resolved.main.targetMotion.semitones);
  assert.ok(semi <= 5, "Target trajectory motion is bounded to melodically useful distance");
}

// 7. Negative tests
assert.throws(() => generateMelodyScenario({ ruleId: "nonexistent-rule", queries }), (err) => err instanceof GenerationError && err.message.includes("Unknown rule"));
assert.throws(() => generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "impossible", queries }), (err) => err instanceof GenerationError && err.message.includes("Unknown difficulty"));
assert.throws(() => generateMelodyScenario({ ruleId: "rule-dominant-third" }), (err) => err instanceof Error && err.message.includes("queries parameter is required"));

// Score floor negative test: candidate meeting resolver validation but below floor throws GenerationError
assert.throws(
  () => generateMelodyScenario({ ruleId: "rule-dominant-third", difficulty: "introductory", seed: 42, queries, minScore: 99 }),
  (err) => {
    assert.ok(err instanceof GenerationError);
    assert.equal(err.ruleId, "rule-dominant-third");
    assert.equal(err.difficulty, "introductory");
    assert.equal(err.seed, 42);
    assert.equal(err.attemptCount, 30);
    assert.equal(err.attempts, 30);
    assert.ok(typeof err.bestScoreReached === "number", "Error records best score reached");
    assert.ok(err.bestScoreReached < 99, "Best score was below impossible floor");
    assert.ok(err.lastFailure && typeof err.lastFailure === "string", "Error records last failure");
    return true;
  }
);

// 8. UI Integration tests in Melody Lab
const appCode = await readFile(new URL("../lab/phrase-app.js", import.meta.url), "utf8");
const melodyHtml = await readFile(new URL("../lab/melody.html", import.meta.url), "utf8");

const { document, root } = createTestDOM(melodyHtml);
document.body = root.querySelector("body");
const randomMock = Object.create(Math);
randomMock.random = () => 0.5;

const context = vm.createContext({
  ...engine,
  getMelodyScenarios,
  getMotifScenarios,
  resolveScenario,
  getMelodyRules,
  getMelodyRuleById,
  generateMelodyScenario,
  generateDistinctMelodyScenario,
  getScenarioFingerprint,
  createMelodyPlan,
  chordRole,
  pathConnections,
  document,
  console,
  Math: randomMock,
});
installRenderer(context);
vm.runInContext(appCode.replace(/^import .*;\s*/gm, ""), context, { filename: "phrase-app.js" });

const $ = (id) => document.getElementById(id);
const read = (expr) => vm.runInContext(expr, context);

// Check initial catalogue state
assert.equal(read("practiceSource"), "catalogue");
assert.equal($("catalogue-controls").hidden, false);
assert.equal($("generated-controls").hidden, true);

// Switch to Generated Practice
$("source-generated").click();
assert.equal(read("practiceSource"), "generated");
assert.equal($("catalogue-controls").hidden, true);
assert.equal($("generated-controls").hidden, false);
assert.ok(read("selectedScenario.id").startsWith("gen-"));

// Check "Generate another"
const firstId = read("selectedScenario.id");
const firstSeed = read("currentGeneratedSeed");
const firstFp = read("currentGeneratedFingerprint");
$("generate-another").click();
const secondId = read("selectedScenario.id");
const secondSeed = read("currentGeneratedSeed");
const secondFp = read("currentGeneratedFingerprint");
assert.notEqual(firstId, secondId, "Generate another creates a distinct scenario");
assert.notEqual(firstFp, secondFp, "Generate another creates a distinct surface fingerprint");
assert.ok(secondSeed > firstSeed, "Seed increments deterministically");

// Check "Replay this scenario"
$("replay-scenario").click();
assert.equal(read("selectedScenario.id"), secondId, "Replay preserves exact scenario");
assert.equal(read("currentGeneratedSeed"), secondSeed, "Replay preserves exact seed");
assert.equal(read("currentGeneratedFingerprint"), secondFp, "Replay preserves exact fingerprint");

// Check "Generate practice" button
$("generate-scenario").click();
assert.ok(read("selectedScenario.id").startsWith("gen-"));

// Switch back to Catalogue mode
$("source-catalogue").click();
assert.equal(read("practiceSource"), "catalogue");
assert.equal($("catalogue-controls").hidden, false);
assert.equal($("generated-controls").hidden, true);
assert.ok(!read("selectedScenario.id").startsWith("gen-"), "Switched back to catalogue scenario");

console.log(`Rule Generator V1 checks passed: ${totalGenerations} high-volume generations across 3 families and 3 difficulties, exact reproducibility, diversity across keys/regions, quality invariants, negative failures, and interactive UI controls.`);
