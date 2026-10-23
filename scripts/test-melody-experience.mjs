import assert from "node:assert/strict";
import * as engine from "../.lab-dist/engine/index.js";
import { getMelodyScenarios } from "../lab/scenario-catalogue.mjs";
import {
  prepareMelodyExperience,
  prepareDistinctMelodyExperience,
  createPhraseQueries,
  MelodyPreparationError,
} from "../lab/melody-experience.mjs";
import { GenerationError } from "../lab/melody-generator.mjs";

// 1. Verify no browser dependency (pure Node execution, no DOM globals)
assert.equal(typeof window, "undefined", "No window global in pure Node environment");
assert.equal(typeof document, "undefined", "No document global in pure Node environment");

// 2. Query adapter verification
assert.throws(
  () => createPhraseQueries(),
  /createPhraseQueries requires musicQueries, STANDARD_FRETBOARD, and formatNote/
);
assert.throws(
  () => createPhraseQueries({}),
  /createPhraseQueries requires musicQueries, STANDARD_FRETBOARD, and formatNote/
);

const queries = createPhraseQueries(engine);
assert.equal(typeof queries.getHarmony, "function");
assert.equal(typeof queries.getScale, "function");
assert.equal(typeof queries.getCatalog, "function");
assert.equal(typeof queries.findLocations, "function");
assert.equal(typeof queries.getNoteAtFret, "function");
assert.equal(typeof queries.getInterval, "function");
assert.equal(typeof queries.formatNote, "function");

// Test query adapter functionality
const harmony = queries.getHarmony({
  key: { tonic: { letter: "G", accidental: 0 }, mode: "major" },
  chordSize: "seventh",
});
assert.equal(harmony.degrees.length, 7);
assert.equal(harmony.degrees[0].romanNumeral.label, "Imaj7");

// 3. Catalogue scenario preparation
const catalogueScenarios = getMelodyScenarios();
assert.equal(catalogueScenarios.length, 3);

for (const spec of catalogueScenarios) {
  const prepared = prepareMelodyExperience(
    { source: "catalogue", scenarioId: spec.id },
    { queries }
  );

  assert.equal(prepared.source, "catalogue");
  assert.equal(prepared.scenario.id, spec.id);
  assert.equal(prepared.scenario.type, "melody");
  assert.ok(prepared.resolved, "Resolved scenario must exist");
  assert.ok(prepared.resolved.main, "Resolved main context must exist");
  assert.ok(prepared.resolved.transfer, "Resolved transfer context must exist");
  assert.deepEqual(prepared.provenance, { source: "catalogue", scenarioId: spec.id });
  assert.ok(typeof prepared.fingerprint === "string" && prepared.fingerprint.length > 0);

  // Plan verification
  assert.ok(prepared.plan, "Melody plan must be produced");
  assert.equal(prepared.plan.stages.length, 10, "Melody plan must have exactly 10 stages");
  assert.equal(typeof prepared.plan.evaluate, "function");
  assert.equal(typeof prepared.plan.explanation, "function");
  assert.ok(Array.isArray(prepared.plan.phraseConnections));
  assert.equal(typeof prepared.plan.targetConnections, "function");

  // Evaluation on target stage
  const targetStage = prepared.plan.stages[1];
  assert.equal(targetStage.id, "target");
  assert.equal(prepared.plan.evaluate(targetStage, targetStage.answer.position.fret).correct, true);
  assert.equal(prepared.plan.evaluate(targetStage, -1).correct, false);
}

// 4. Generated scenario preparation
const genReq = {
  source: "generated",
  ruleId: "rule-dominant-third",
  difficulty: "introductory",
  seed: 1001,
};

const gen1 = prepareMelodyExperience(genReq, { queries });
const gen2 = prepareMelodyExperience(genReq, { queries });

// Determinism: same request produces identical results
assert.equal(gen1.source, "generated");
assert.equal(gen1.scenario.id, gen2.scenario.id);
assert.equal(gen1.fingerprint, gen2.fingerprint);
assert.deepEqual(gen1.provenance, gen2.provenance);
assert.equal(gen1.provenance.source, "generated");
assert.equal(gen1.provenance.ruleId, "rule-dominant-third");
assert.equal(gen1.provenance.difficulty, "introductory");
assert.equal(gen1.provenance.seed, 1001);
assert.equal(gen1.provenance.generatorVersion, 2);
assert.ok(gen1.provenance.score >= 5, "Score floor enforced");

// Plan verification for generated
assert.equal(gen1.plan.stages.length, 10);
const genTargetStage = gen1.plan.stages[1];
assert.equal(gen1.plan.evaluate(genTargetStage, genTargetStage.answer.position.fret).correct, true);

// Replay equivalence
const replayResult = prepareMelodyExperience({
  source: "generated",
  ruleId: gen1.provenance.ruleId,
  difficulty: gen1.provenance.difficulty,
  seed: gen1.provenance.seed,
}, { queries });
assert.equal(replayResult.scenario.id, gen1.scenario.id);
assert.equal(replayResult.fingerprint, gen1.fingerprint);

// 5. Distinct generation
const distinctPrep = prepareDistinctMelodyExperience({
  ruleId: "rule-dominant-third",
  difficulty: "introductory",
  currentSeed: 1001,
  currentFingerprint: gen1.fingerprint,
}, { queries });

assert.equal(distinctPrep.source, "generated");
assert.notEqual(distinctPrep.fingerprint, gen1.fingerprint, "Distinct preparation yields new fingerprint");
assert.ok(distinctPrep.provenance.seed > 1001, "Distinct preparation advances seed");
assert.equal(distinctPrep.plan.stages.length, 10);

// 6. Source convergence
// Both catalogue and generated sources produce the exact same downstream shape expected by Melody UI
const catPrepared = prepareMelodyExperience({ source: "catalogue", scenarioId: "melody-g-ii-v-i" }, { queries });
const genPrepared = gen1;

const expectedKeys = ["source", "scenario", "resolved", "plan", "provenance", "fingerprint"].sort();
assert.deepEqual(Object.keys(catPrepared).sort(), expectedKeys);
assert.deepEqual(Object.keys(genPrepared).sort(), expectedKeys);

assert.equal(catPrepared.plan.stages.length, genPrepared.plan.stages.length);
for (let i = 0; i < catPrepared.plan.stages.length; i += 1) {
  assert.equal(catPrepared.plan.stages[i].id, genPrepared.plan.stages[i].id);
  assert.equal(catPrepared.plan.stages[i].kind, genPrepared.plan.stages[i].kind);
}

// 7. Error semantics and no silent fallback
function expectPrepError(fn, expectedCode, pattern) {
  assert.throws(
    fn,
    (err) => {
      assert.ok(err instanceof MelodyPreparationError, `Expected MelodyPreparationError, got ${err?.name}: ${err?.message}`);
      assert.equal(err.code, expectedCode, `Expected code ${expectedCode}, got ${err.code}`);
      if (pattern) assert.match(err.message, pattern);
      return true;
    }
  );
}

// Invalid requests
expectPrepError(() => prepareMelodyExperience(null, { queries }), "INVALID_REQUEST", /must be an object/);
expectPrepError(() => prepareMelodyExperience([], { queries }), "INVALID_REQUEST", /must be an object/);
expectPrepError(() => prepareMelodyExperience("request", { queries }), "INVALID_REQUEST", /must be an object/);
expectPrepError(() => prepareMelodyExperience({ source: "unknown" }, { queries }), "INVALID_REQUEST", /Unsupported source/);
expectPrepError(() => prepareMelodyExperience({ source: "catalogue" }, { queries }), "INVALID_REQUEST", /scenarioId/);
expectPrepError(() => prepareMelodyExperience({ source: "catalogue", scenarioId: "   " }, { queries }), "INVALID_REQUEST", /scenarioId/);
expectPrepError(() => prepareMelodyExperience({ source: "catalogue", scenarioId: 123 }, { queries }), "INVALID_REQUEST", /scenarioId/);
expectPrepError(() => prepareMelodyExperience({ source: "generated" }, { queries }), "INVALID_REQUEST", /ruleId/);
expectPrepError(() => prepareMelodyExperience({ source: "generated", ruleId: "rule-dominant-third" }, { queries }), "INVALID_REQUEST", /difficulty/);
expectPrepError(() => prepareMelodyExperience({ source: "generated", ruleId: "rule-dominant-third", difficulty: "introductory", seed: {} }, { queries }), "INVALID_REQUEST", /Seed/);
expectPrepError(() => prepareMelodyExperience({ source: "catalogue", scenarioId: "melody-g-ii-v-i" }, {}), "INVALID_REQUEST", /queries or engine/);

// Unknown catalogue scenario (must NOT fall back to generated)
let fallbackAttempted = false;
expectPrepError(
  () => prepareMelodyExperience(
    { source: "catalogue", scenarioId: "nonexistent-scenario" },
    {
      queries,
      generateMelodyScenario: () => { fallbackAttempted = true; throw new Error("Fallback must not be called!"); },
    }
  ),
  "UNKNOWN_CATALOGUE_SCENARIO",
  /Unknown catalogue scenario/
);
assert.equal(fallbackAttempted, false, "Catalogue lookup failure must never quietly fall back to generation");

// Catalogue scenario of wrong type (motif instead of melody)
expectPrepError(
  () => prepareMelodyExperience({ source: "catalogue", scenarioId: "motif-a-c-a" }, { queries }),
  "UNKNOWN_CATALOGUE_SCENARIO",
  /not a melody scenario/
);

// Unknown rule
expectPrepError(
  () => prepareMelodyExperience(
    { source: "generated", ruleId: "nonexistent-rule", difficulty: "introductory" },
    { queries }
  ),
  "UNKNOWN_RULE",
  /Unknown melody rule/
);

// Unsupported difficulty
expectPrepError(
  () => prepareMelodyExperience(
    { source: "generated", ruleId: "rule-dominant-third", difficulty: "master" },
    { queries }
  ),
  "UNKNOWN_DIFFICULTY",
  /Unsupported difficulty/
);

// Resolution failure
expectPrepError(
  () => prepareMelodyExperience(
    { source: "catalogue", scenarioId: "melody-g-ii-v-i" },
    {
      queries,
      resolveScenario: () => { throw new Error("Injected resolution failure"); },
    }
  ),
  "RESOLUTION_FAILURE",
  /Failed to resolve catalogue scenario/
);

// Generation failure (must NOT fall back to catalogue)
let catalogueFallbackAttempted = false;
expectPrepError(
  () => prepareMelodyExperience(
    { source: "generated", ruleId: "rule-dominant-third", difficulty: "introductory" },
    {
      queries,
      getScenarioById: () => { catalogueFallbackAttempted = true; return catalogueScenarios[0]; },
      generateMelodyScenario: () => {
        throw new GenerationError("Simulated generation failure", { ruleId: "rule-dominant-third", seed: 1001, attempts: 30 });
      },
    }
  ),
  "GENERATION_FAILURE",
  /Simulated generation failure/
);
assert.equal(catalogueFallbackAttempted, false, "Generation failure must never quietly fall back to catalogue");

// Distinct generation exhaustion failure
expectPrepError(
  () => prepareDistinctMelodyExperience(
    {
      ruleId: "rule-dominant-third",
      difficulty: "introductory",
      currentSeed: 1001,
      currentFingerprint: "existing-fp",
    },
    {
      queries,
      generateDistinctMelodyScenario: () => {
        throw new GenerationError("Exhausted search", { ruleId: "rule-dominant-third", attempts: 30 });
      },
    }
  ),
  "GENERATION_FAILURE",
  /Exhausted search/
);

// 8. Passing engine directly in options
const engineDirectPrepared = prepareMelodyExperience(
  { source: "catalogue", scenarioId: "melody-g-ii-v-i" },
  { engine }
);
assert.equal(engineDirectPrepared.source, "catalogue");
assert.equal(engineDirectPrepared.plan.stages.length, 10);

console.log("Melody experience preparation seam checks passed: DOM-free execution, catalogue preparation, generated determinism, source convergence, explicit error semantics, and no silent fallbacks.");
