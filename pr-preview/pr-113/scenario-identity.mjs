// Stable identity helpers for bounded ScenarioV1 material.
// Identity is metadata only: it must never choose notes, chords, frets or teaching flow.

export const SCENARIO_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SCENARIO_SOURCES = Object.freeze(["catalogue", "generated"]);

function clean(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function assertScenarioId(id, path = "scenario.id") {
  const value = clean(id);
  if (!value) throw new TypeError(`${path} must be nonempty text`);
  if (!SCENARIO_ID_PATTERN.test(value)) {
    throw new TypeError(`${path} must use lowercase kebab-case letters/numbers only`);
  }
  return value;
}

export function assertUniqueScenarioIds(scenarios, path = "scenarios") {
  if (!Array.isArray(scenarios)) throw new TypeError(`${path} must be an array`);
  const seen = new Set();
  for (let index = 0; index < scenarios.length; index += 1) {
    const id = assertScenarioId(scenarios[index]?.id, `${path}[${index}].id`);
    if (seen.has(id)) throw new TypeError(`${path}[${index}].id duplicates scenario id '${id}'`);
    seen.add(id);
  }
  return scenarios;
}

function stableSeedToken(seed) {
  const raw = clean(seed);
  if (!raw) return "1";
  if (/^[a-z0-9]+$/.test(raw)) return raw;

  // The generator already accepts arbitrary string/number seeds. Hash only the ID
  // token so unusual seeds remain URL/DOM-safe while provenance retains the raw seed.
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(index)) >>> 0;
  }
  return `h${hash.toString(16).padStart(8, "0")}`;
}

export function makeGeneratedScenarioId({ family, difficulty, seed } = {}) {
  const familyId = assertScenarioId(clean(family), "family");
  const difficultyId = assertScenarioId(clean(difficulty), "difficulty");
  return assertScenarioId(`gen-${familyId}-${difficultyId}-${stableSeedToken(seed)}`);
}

export function scenarioSourceForId(id) {
  return assertScenarioId(id).startsWith("gen-") ? "generated" : "catalogue";
}

export function scenarioIdentity(scenario, source = undefined) {
  const scenarioId = assertScenarioId(scenario?.id);
  const scenarioSource = source ?? scenarioSourceForId(scenarioId);
  if (!SCENARIO_SOURCES.includes(scenarioSource)) {
    throw new TypeError(`scenario source must be one of: ${SCENARIO_SOURCES.join(", ")}`);
  }
  return Object.freeze({
    scenarioId,
    scenarioSource,
    scenarioContractVersion: Number.isInteger(scenario?.version) ? scenario.version : null,
  });
}
