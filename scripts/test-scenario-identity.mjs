import assert from "node:assert/strict";
import * as engine from "../.lab-dist/engine/index.js";
import { getMelodyScenarios, getMotifScenarios } from "../lab/scenario-catalogue.mjs";
import { generateMelodyScenario } from "../lab/melody-generator.mjs";
import {
  assertScenarioId,
  assertUniqueScenarioIds,
  makeGeneratedScenarioId,
  scenarioIdentity,
  scenarioSourceForId,
} from "../lab/scenario-identity.mjs";
import { readScenarioContext } from "../lab/scenario-context.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.data;
}

const queries = {
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getScale: (request) => unwrap(engine.musicQueries.getScale(request)),
  getCatalog: (request) => unwrap(engine.musicQueries.getChordCatalog(request)),
  findLocations: ({ key, chord, stringIndices, fretRange, pitchClasses }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD,
    stringIndices,
    fretRange,
    pitchClasses,
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getNoteAtFret: ({ key, chord, stringIndex, fret }) => unwrap(engine.musicQueries.getNoteAtFret({
    board: engine.STANDARD_FRETBOARD,
    position: { stringIndex, fret },
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
};

const melodyCatalogue = getMelodyScenarios();
const motifCatalogue = getMotifScenarios();
const catalogue = [...melodyCatalogue, ...motifCatalogue];
assertUniqueScenarioIds(catalogue);
assert.deepEqual(
  catalogue.map(({ id }) => id),
  [
    "melody-g-ii-v-i",
    "melody-c-ii-v-i",
    "melody-g-i-v-vi-iv",
    "motif-a-c-a",
    "motif-third-fifth",
    "motif-upper-region",
  ],
  "Approved catalogue IDs are stable and intentionally unchanged",
);

for (const scenario of catalogue) {
  assert.equal(assertScenarioId(scenario.id), scenario.id);
  assert.equal(scenarioIdentity(scenario).scenarioId, scenario.id);
  assert.equal(scenarioSourceForId(scenario.id), "catalogue");
}

assert.throws(() => assertScenarioId("Melody G"), /lowercase kebab-case/);
assert.throws(
  () => assertUniqueScenarioIds([{ id: "same-id" }, { id: "same-id" }]),
  /duplicates scenario id/,
);

const coordinates = { family: "dominant-third", difficulty: "introductory", seed: 1001 };
const stableGeneratedId = makeGeneratedScenarioId(coordinates);
assert.equal(stableGeneratedId, "gen-dominant-third-introductory-1001");
assert.equal(makeGeneratedScenarioId(coordinates), stableGeneratedId);
assert.equal(scenarioSourceForId(stableGeneratedId), "generated");
assert.equal(
  makeGeneratedScenarioId({ family: "dominant-third", difficulty: "introductory", seed: "seed with spaces" }),
  makeGeneratedScenarioId({ family: "dominant-third", difficulty: "introductory", seed: "seed with spaces" }),
  "Unusual seed tokens still produce deterministic stable IDs",
);

const generated = generateMelodyScenario({
  ruleId: "rule-dominant-third",
  difficulty: "introductory",
  seed: 1001,
  queries,
});
assert.equal(generated.scenario.id, stableGeneratedId);
assert.equal(
  generated.scenario.id,
  makeGeneratedScenarioId({
    family: generated.provenance.family,
    difficulty: generated.provenance.difficulty,
    seed: generated.provenance.seed,
  }),
  "Generator output follows the stable generated-ID contract",
);

function activeInfo(scenario) {
  return `${scenario.description} · ${scenario.difficulty} · active key`;
}

function fakeDocument({ probe, values = {}, text = {}, attributes = {} }) {
  const elements = new Map();
  const ids = new Set([...Object.keys(values), ...Object.keys(text), ...Object.keys(attributes)]);
  for (const id of ids) {
    elements.set(id, {
      value: values[id] ?? "",
      textContent: text[id] ?? "",
      getAttribute(name) { return attributes[id]?.[name] ?? null; },
    });
  }
  return {
    body: { dataset: { probe } },
    getElementById(id) { return elements.get(id) ?? null; },
  };
}

const activeMelody = melodyCatalogue[0];
const pendingMelody = melodyCatalogue[1];
const catalogueContext = readScenarioContext(fakeDocument({
  probe: "melody",
  values: { "scenario-select": pendingMelody.id },
  text: { "scenario-info": activeInfo(activeMelody) },
  attributes: { "source-generated": { "aria-selected": "false" } },
}));
assert.deepEqual(catalogueContext, {
  scenarioId: activeMelody.id,
  scenarioSource: "catalogue",
  scenarioContractVersion: 1,
});
assert.notEqual(
  catalogueContext.scenarioId,
  pendingMelody.id,
  "Changing the picker without starting it must not change evidence identity",
);

const activeMotif = motifCatalogue[2];
const pendingMotif = motifCatalogue[0];
const motifContext = readScenarioContext(fakeDocument({
  probe: "motif",
  values: { "scenario-select": pendingMotif.id },
  text: { "scenario-info": activeInfo(activeMotif) },
}));
assert.deepEqual(motifContext, {
  scenarioId: activeMotif.id,
  scenarioSource: "catalogue",
  scenarioContractVersion: 1,
});

const generatedContext = readScenarioContext(fakeDocument({
  probe: "melody",
  text: { "scenario-info": generated.scenario.description },
  attributes: { "source-generated": { "aria-selected": "true" } },
}));
assert.deepEqual(generatedContext, {
  scenarioId: generated.scenario.id,
  scenarioSource: "generated",
  scenarioContractVersion: 1,
});

assert.equal(readScenarioContext(fakeDocument({ probe: undefined })), null);

console.log("scenario identity checks passed");
