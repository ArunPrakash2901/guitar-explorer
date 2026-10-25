import assert from "node:assert/strict";
import * as engine from "../.lab-dist/engine/index.js";
import { getMelodyRules } from "../lab/rule-contract.mjs";
import {
  createPhraseQueries,
  prepareMelodyExperience,
  prepareDistinctMelodyExperience,
} from "../lab/melody-experience.mjs";

const queries = createPhraseQueries(engine);
const knownRuleIds = new Set(getMelodyRules().map((rule) => rule.id));

const first = prepareMelodyExperience({
  source: "generated",
  ruleId: "surprise",
  difficulty: "introductory",
  seed: 1001,
}, { queries });

const replay = prepareMelodyExperience({
  source: "generated",
  ruleId: "surprise",
  difficulty: "introductory",
  seed: 1001,
}, { queries });

assert.equal(first.source, "generated");
assert.equal(first.scenario.id, replay.scenario.id, "surprise must remain deterministic for the same seed");
assert.equal(first.fingerprint, replay.fingerprint, "surprise replay must preserve the generated surface");
assert.ok(knownRuleIds.has(first.provenance.ruleId), "surprise must resolve to one real rule in provenance");
assert.match(first.scenario.description, /^Generated · /);

const distinct = prepareDistinctMelodyExperience({
  ruleId: "surprise",
  difficulty: "introductory",
  currentSeed: first.provenance.seed,
  currentFingerprint: first.fingerprint,
}, { queries });

assert.equal(distinct.source, "generated");
assert.notEqual(distinct.fingerprint, first.fingerprint, "Generate another must still find a distinct surprise surface");
assert.ok(knownRuleIds.has(distinct.provenance.ruleId));

console.log("Melody preparation surprise regression checks passed.");
