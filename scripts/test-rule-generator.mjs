import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { getMelodyRules, getMelodyRuleById } from "../lab/rule-contract.mjs";
import { generateMelodyScenario, generateDistinctMelodyScenario, getScenarioFingerprint, MIN_PEDAGOGICAL_SCORE, GENERATOR_VERSION, GenerationError, createPrng } from "../lab/melody-generator.mjs";
import { resolveScenario, ScenarioError } from "../lab/scenario-resolver.mjs";
import { createMelodyPlan } from "../lab/melody-session.mjs";
import { chordRole, pathConnections } from "../lab/phrase-material.mjs";
import { getMelodyScenarios, getMotifScenarios } from "../lab/scenario-catalogue.mjs";
import { createTestDOM, installRenderer, accessibleText, all } from "./fretboard-test-dom.mjs";
import { prepareMelodyExperience, prepareDistinctMelodyExperience, createPhraseQueries } from "../lab/melody-experience.mjs";
import { readScenarioContext, setScenarioContext } from "../lab/scenario-context.mjs";
import { makeGeneratedScenarioId } from "../lab/scenario-identity.mjs";

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
for (const rule of rules) {
  assert.equal(rule.version, 1, "Narrowing physical claims does not change Rule V1");
  assert.equal(Object.hasOwn(rule, "regionPools"), false, "Rules do not advertise unsupported region pools");
}

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
      assert.equal(result.provenance.generatorVersion, GENERATOR_VERSION);
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

      // The narrowed generator envelope applies to main AND transfer material.
      // Difficulty changes keys, not target strings or selectable neck regions.
      assert.equal(s.targets.target.stringIndex, 5);
      assert.equal(s.targets.arrival.stringIndex, 5);
      assert.ok([4, 5].includes(s.melody.phraseLead[0].stringIndex));
      assert.equal(s.melody.phraseLead[1].stringIndex, 5);
      const supportedStrings = s.melody.phraseLead[0].stringIndex === 4 ? [4, 5] : [5];
      for (const ctx of [m.main, m.transfer]) {
        const region = ctx.boardRange;
        assert.deepEqual(region.strings, supportedStrings);
        assert.equal(ctx.target.position.stringIndex, 5);
        assert.equal(ctx.arrival.position.stringIndex, 5);
        assert.equal(ctx.approach.position.stringIndex, 5);
        assert.ok(ctx.target.position.fret >= 0 && ctx.target.position.fret <= 14);
        assert.equal(region.minFret, Math.max(0, ctx.target.position.fret - 4));
        assert.equal(region.maxFret, Math.min(15, region.minFret + 7));
        assert.deepEqual(region, ctx === m.main ? s.fretboard.main : s.fretboard.transfer);
        for (const note of ctx.phrase) {
          assert.ok(region.strings.includes(note.position.stringIndex));
          assert.ok(note.position.fret >= region.minFret && note.position.fret <= region.maxFret);
        }
      }

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

// Versioned fixtures pin complete ScenarioV1 data, including phrase leads and
// transfer regions omitted by the surface fingerprint. They are checked-in data,
// never regenerated by this test. Numeric/string seeds and flat keys are covered.
const replayFixtures = JSON.parse(await readFile(new URL("./fixtures/rule-generator-replay.json", import.meta.url), "utf8"));
const generatorCode = await readFile(new URL("../lab/melody-generator.mjs", import.meta.url), "utf8");
const portableContext = vm.createContext({ getMelodyRuleById, getMelodyRules, resolveScenario, ScenarioError, makeGeneratedScenarioId, queries });
vm.runInContext(generatorCode.replace(/^import .*;\s*/gm, "").replace(/^export /gm, ""), portableContext);
// Only the generator's realm is changed; engine query ordering stays untouched.
vm.runInContext("Array.prototype.sort = () => { throw new Error('Generator must not depend on Array.sort'); };", portableContext);
for (const fixture of replayFixtures) {
  assert.equal(fixture.generatorVersion, 2, "Fixtures explicitly describe algorithm version 2");
  assert.equal(GENERATOR_VERSION, fixture.generatorVersion);
  for (let replay = 0; replay < 2; replay += 1) {
    const result = generateMelodyScenario({ ...fixture.request, queries });
    assert.deepEqual(result.scenario, fixture.scenario, "Pinned seed reproduces the entire scenario");
    assert.equal(result.provenance.fingerprint, fixture.fingerprint);
    assert.equal(result.provenance.attempts, fixture.attempts);
    assert.equal(result.provenance.score, fixture.score);
  }
  portableContext.fixtureRequest = fixture.request;
  const portable = vm.runInContext("generateMelodyScenario({ ...fixtureRequest, queries })", portableContext);
  assert.deepEqual(JSON.parse(JSON.stringify(portable.scenario)), fixture.scenario, "Pinned output survives a realm where Array.sort is forbidden");
  assert.equal(portable.provenance.fingerprint, fixture.fingerprint);
}

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

// Actual version-2 seeds 1 and 2 have the same surface; seed 3 differs. This tests
// a genuine duplicate instead of assuming the next seed must mean new material.
const duplicateStart = generateMelodyScenario({ ruleId: "rule-dominant-third", seed: 1, queries });
const duplicateNext = generateMelodyScenario({ ruleId: "rule-dominant-third", seed: 2, queries });
assert.equal(duplicateNext.provenance.fingerprint, duplicateStart.provenance.fingerprint);
const duplicateRequest = { ruleId: "rule-dominant-third", currentSeed: 1,
  currentFingerprint: duplicateStart.provenance.fingerprint, queries };
assert.throws(() => generateDistinctMelodyScenario({ ...duplicateRequest, maxRetries: 1 }), (err) => {
  assert.ok(err instanceof GenerationError);
  assert.equal(err.attempts, 1);
  assert.equal(err.lastFailure, "Identical surface fingerprint");
  assert.deepEqual(err.details.failures, [{ seed: 2, reason: "Identical surface fingerprint" }]);
  return true;
});
const skippedDuplicate = generateDistinctMelodyScenario({ ...duplicateRequest, maxRetries: 2 });
assert.equal(skippedDuplicate.provenance.seed, 3, "Distinct search skips seed 2 and accepts seed 3 within its budget");
assert.notEqual(skippedDuplicate.provenance.fingerprint, duplicateStart.provenance.fingerprint);

let failedCandidateAttempts = 0;
const failingQueries = { ...queries, getHarmony() {
  failedCandidateAttempts += 1;
  throw new Error("Deliberately unavailable harmony for exhaustion test");
} };
assert.throws(() => generateDistinctMelodyScenario({ ...duplicateRequest,
  queries: failingQueries, maxRetries: 3, attemptBudget: 2 }), (err) => {
  assert.ok(err instanceof GenerationError);
  assert.equal(err.attempts, 3);
  assert.deepEqual(err.details.failures.map(({ seed }) => seed), [2, 3, 4]);
  assert.match(err.lastFailure, /Deliberately unavailable harmony/);
  return true;
});
assert.equal(failedCandidateAttempts, 6, "Three seeds each consume at most two candidate attempts");

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
let ordinaryUiCalls = 0;
let exhaustDistinctSearch = false;
let exhaustedCandidateCalls = 0;
let distinctUiError = null;
const distinctUiRequests = [];

const context = vm.createContext({
  ...engine,
  getMelodyScenarios,
  getMotifScenarios,
  resolveScenario,
  getMelodyRules,
  getMelodyRuleById,
  generateMelodyScenario: (request) => {
    ordinaryUiCalls += 1;
    return generateMelodyScenario(request);
  },
  generateDistinctMelodyScenario: (request) => {
    distinctUiRequests.push({ ruleId: request.ruleId, difficulty: request.difficulty,
      currentSeed: request.currentSeed, currentFingerprint: request.currentFingerprint });
    if (!exhaustDistinctSearch) return generateDistinctMelodyScenario(request);
    try {
      // Exercise the real bounded search: both candidate seeds fail validation.
      return generateDistinctMelodyScenario({ ...request, maxRetries: 2, attemptBudget: 1,
        queries: { ...request.queries, getHarmony() {
          exhaustedCandidateCalls += 1;
          throw new Error("Injected unavailable harmony for exhausted-search test");
        } } });
    } catch (error) {
      distinctUiError = error;
      throw error;
    }
  },
  getScenarioFingerprint,
  createMelodyPlan,
  chordRole,
  pathConnections,
  document,
  console,
  Math: randomMock,
  prepareMelodyExperience,
  prepareDistinctMelodyExperience,
  createPhraseQueries,
  setScenarioContext,
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

// Exhausted "Generate another" preserves a meaningful in-progress session.
$("act").click();
$("next").click();
assert.equal(read("current().id"), "target");
$("hint").click();
const answer = read("current().answer.position");
all($("board"), (element) => element.tagName === "button"
  && Number(element.dataset.stringIndex) === answer.stringIndex
  && Number(element.dataset.fret) === answer.fret)[0].click();
$("check").click();
assert.equal(read("state.revealed"), true);
assert.equal(read("state.evidence.target.attempts"), 1);
assert.equal(read("state.evidence.target.hints"), 1);
$("reflection").value = "unclear";
const accepted = read("({ selectedScenario, material, plan, config: currentGeneratedConfig, seed: currentGeneratedSeed, fingerprint: currentGeneratedFingerprint, stateJson: JSON.stringify(state) })");
const lessonDom = () => JSON.stringify({
  scenarioInfo: $("scenario-info").textContent, progress: $("progress-text").textContent,
  progressWidth: $("progress-fill").style.width, board: accessibleText($("board")),
  explanation: $("explanation-list").textContent, explanationHidden: $("explanation").hidden,
  feedback: $("feedback").textContent, feedbackClass: $("feedback").className,
  reflection: $("reflection").value,
});
const acceptedDom = lessonDom();
const acceptedIdentity = readScenarioContext(document);
const callsBeforeFailure = ordinaryUiCalls;
exhaustDistinctSearch = true;
$("generate-another").click();
assert.ok(distinctUiError instanceof GenerationError, "Real exhausted search raises explicit GenerationError");
assert.equal(distinctUiError.attempts, 2, "Distinct search stops after its positive seed budget");
assert.equal(exhaustedCandidateCalls, 2, "Both bounded candidate attempts actually failed");
assert.equal(ordinaryUiCalls, callsBeforeFailure, "Exhaustion never falls back to ordinary generation");
assert.equal(read("selectedScenario"), accepted.selectedScenario, "Accepted scenario object remains active");
assert.equal(read("material"), accepted.material, "Accepted resolved material remains active");
assert.equal(read("plan"), accepted.plan, "Accepted teaching plan remains active");
assert.equal(read("currentGeneratedConfig"), accepted.config, "Accepted replay configuration remains unchanged");
assert.equal(read("currentGeneratedSeed"), accepted.seed, "Failure never advances the accepted seed");
assert.equal(read("currentGeneratedFingerprint"), accepted.fingerprint, "Failure never presents a new fingerprint");
assert.equal(read("JSON.stringify(state)"), accepted.stateJson, "Progress, selections, reveal, result, timing and evidence remain unchanged");
assert.equal(lessonDom(), acceptedDom, "Lesson display and feedback remain unchanged");
assert.deepEqual(readScenarioContext(document), acceptedIdentity, "Failed generation preserves exported identity");
assert.equal($("generation-feedback").hidden, false);
assert.equal($("generation-feedback").getAttribute("role"), "status");
assert.equal($("generation-feedback").getAttribute("aria-live"), "polite");
assert.match($("generation-feedback").textContent, /No different scenario.*search limit.*current scenario is unchanged.*Retry.*change focus or difficulty/);
for (const id of ["generate-another", "rule-select", "difficulty-select"]) {
  assert.equal($(id).disabled, false, `${id} stays available after exhaustion`);
}

// Retrying uses the unchanged accepted seed/fingerprint and can recover normally.
const failedRequest = distinctUiRequests.at(-1);
exhaustDistinctSearch = false;
$("generate-another").click();
assert.deepEqual(distinctUiRequests.at(-1), failedRequest, "Retry retains the accepted request");
assert.notEqual(read("currentGeneratedFingerprint"), accepted.fingerprint, "Successful retry finds a distinct surface");
assert.equal(readScenarioContext(document).scenarioId, read("selectedScenario.id"), "Recovered scenario publishes its accepted ID");
assert.equal(read("state.index"), 0, "Only success starts a new session");
assert.equal($("generation-feedback").hidden, true, "Success clears the generation failure");
assert.equal($("generation-feedback").textContent, "");

// Changing the available focus/difficulty after another exhaustion also recovers.
exhaustDistinctSearch = true;
$("generate-another").click();
assert.equal($("generation-feedback").hidden, false);
$("rule-select").value = "rule-dominant-seventh";
$("difficulty-select").value = "developing";
exhaustDistinctSearch = false;
$("generate-another").click();
assert.equal(read("currentGeneratedConfig.ruleId"), "rule-dominant-seventh");
assert.equal(read("currentGeneratedConfig.difficulty"), "developing");
assert.equal($("generation-feedback").hidden, true);

// Check "Generate practice" button
$("generate-scenario").click();
assert.ok(read("selectedScenario.id").startsWith("gen-"));

// Switch back to Catalogue mode
$("source-catalogue").click();
assert.equal(read("practiceSource"), "catalogue");
assert.equal($("catalogue-controls").hidden, false);
assert.equal($("generated-controls").hidden, true);
assert.ok(!read("selectedScenario.id").startsWith("gen-"), "Switched back to catalogue scenario");

console.log(`Rule Generator V1 checks passed: ${totalGenerations} generations across 3 families and 3 difficulties, fixed main/transfer region contract, 3 pinned version-2 replay fixtures without Array.sort, duplicate skipping, bounded exhaustion, score floor, and UI failure preservation/recovery.`);
