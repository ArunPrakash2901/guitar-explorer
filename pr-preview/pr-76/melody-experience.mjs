// DOM-free Melody preparation seam.
// Prepares validated, engine-resolved Melody material and teaching plans
// for both catalogue and generated sources without browser dependencies.

import { getScenarioById } from "./scenario-catalogue.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { resolveScenario } from "./scenario-resolver.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import {
  generateMelodyScenario,
  generateDistinctMelodyScenario,
  getScenarioFingerprint,
  GenerationError,
} from "./melody-generator.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { createMelodyPlan } from "./melody-session.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { getMelodyRuleById } from "./rule-contract.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";

export class MelodyPreparationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MelodyPreparationError";
    this.code = code;
    this.details = details;
    if (details.cause && !this.cause) this.cause = details.cause;
    if (details.ruleId) this.ruleId = details.ruleId;
    if (details.difficulty) this.difficulty = details.difficulty;
    if (details.seed !== undefined) this.seed = details.seed;
    if (details.attempts !== undefined) this.attempts = details.attempts;
  }
}

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function createPhraseQueries({ musicQueries, STANDARD_FRETBOARD, formatNote } = {}) {
  if (!musicQueries || !STANDARD_FRETBOARD || !formatNote) {
    throw new Error("createPhraseQueries requires musicQueries, STANDARD_FRETBOARD, and formatNote");
  }
  return {
    getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
    getScale: (request) => unwrap(musicQueries.getScale(request)),
    getCatalog: (request) => unwrap(musicQueries.getChordCatalog(request)),
    findLocations: ({ key, chord, stringIndices, fretRange, pitchClasses }) => unwrap(musicQueries.getFretboardLocations({
      board: STANDARD_FRETBOARD,
      stringIndices,
      fretRange,
      pitchClasses,
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    })),
    getNoteAtFret: ({ key, chord, stringIndex, fret }) => unwrap(musicQueries.getNoteAtFret({
      board: STANDARD_FRETBOARD,
      position: { stringIndex, fret },
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    })),
    getInterval: (request) => unwrap(musicQueries.getInterval(request)),
    formatNote,
  };
}

const SUPPORTED_DIFFICULTIES = ["introductory", "developing", "transfer"];

export function prepareMelodyExperience(request, options = {}) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new MelodyPreparationError("INVALID_REQUEST", "Melody experience request must be an object");
  }

  const { source } = request;
  if (source !== "catalogue" && source !== "generated") {
    throw new MelodyPreparationError(
      "INVALID_REQUEST",
      `Unsupported source '${source}'; expected 'catalogue' or 'generated'`,
      { source },
    );
  }

  let queries = options.queries;
  if (!queries && options.engine) queries = createPhraseQueries(options.engine);
  if (!queries) {
    throw new MelodyPreparationError(
      "INVALID_REQUEST",
      "Melody preparation requires queries or engine in options",
    );
  }

  if (source === "catalogue") {
    if (typeof request.scenarioId !== "string" || !request.scenarioId.trim()) {
      throw new MelodyPreparationError(
        "INVALID_REQUEST",
        "Catalogue request requires a non-empty string scenarioId",
        { request },
      );
    }

    const lookupScenario = options.getScenarioById ?? getScenarioById;
    const spec = lookupScenario(request.scenarioId);
    if (!spec) {
      throw new MelodyPreparationError(
        "UNKNOWN_CATALOGUE_SCENARIO",
        `Unknown catalogue scenario: ${request.scenarioId}`,
        { scenarioId: request.scenarioId },
      );
    }
    if (spec.type !== "melody") {
      throw new MelodyPreparationError(
        "UNKNOWN_CATALOGUE_SCENARIO",
        `Scenario '${request.scenarioId}' is a ${spec.type} scenario, not a melody scenario`,
        { scenarioId: request.scenarioId, type: spec.type },
      );
    }

    let resolved;
    try {
      const resolver = options.resolveScenario ?? resolveScenario;
      resolved = resolver(spec, queries);
    } catch (err) {
      throw new MelodyPreparationError(
        "RESOLUTION_FAILURE",
        `Failed to resolve catalogue scenario '${spec.id}': ${err.message}`,
        { scenarioId: spec.id, cause: err },
      );
    }

    const planner = options.createMelodyPlan ?? createMelodyPlan;
    const plan = planner(resolved);

    return {
      source: "catalogue",
      scenario: spec,
      resolved,
      plan,
      provenance: { source: "catalogue", scenarioId: spec.id },
      fingerprint: getScenarioFingerprint({ scenario: spec, resolved }),
    };
  }

  if (typeof request.ruleId !== "string" || !request.ruleId.trim()) {
    throw new MelodyPreparationError(
      "INVALID_REQUEST",
      "Generated request requires a non-empty string ruleId",
      { request },
    );
  }

  // `surprise` is a supported generator command, not a catalogue rule ID.
  // Preserve that existing public behavior by delegating it to the generator.
  if (request.ruleId !== "surprise") {
    const lookupRule = options.getMelodyRuleById ?? getMelodyRuleById;
    const rule = lookupRule(request.ruleId);
    if (!rule) {
      throw new MelodyPreparationError(
        "UNKNOWN_RULE",
        `Unknown melody rule: ${request.ruleId}`,
        { ruleId: request.ruleId },
      );
    }
  }

  if (typeof request.difficulty !== "string" || !request.difficulty.trim()) {
    throw new MelodyPreparationError(
      "INVALID_REQUEST",
      "Generated request requires a non-empty string difficulty",
      { request },
    );
  }

  if (!SUPPORTED_DIFFICULTIES.includes(request.difficulty)) {
    throw new MelodyPreparationError(
      "UNKNOWN_DIFFICULTY",
      `Unsupported difficulty '${request.difficulty}'; expected one of: ${SUPPORTED_DIFFICULTIES.join(", ")}`,
      { difficulty: request.difficulty, supported: SUPPORTED_DIFFICULTIES },
    );
  }

  if (request.seed !== undefined && typeof request.seed !== "number" && typeof request.seed !== "string") {
    throw new MelodyPreparationError(
      "INVALID_REQUEST",
      "Seed must be a number or string",
      { seed: request.seed },
    );
  }

  const seed = request.seed ?? 1001;

  let generatedResult;
  try {
    if (request.distinct) {
      const distinctGenerator = options.generateDistinctMelodyScenario ?? generateDistinctMelodyScenario;
      generatedResult = distinctGenerator({
        ruleId: request.ruleId,
        difficulty: request.difficulty,
        currentSeed: request.distinct.currentSeed ?? seed,
        currentFingerprint: request.distinct.currentFingerprint ?? "",
        queries,
        maxRetries: request.distinct.maxRetries,
        attemptBudget: request.attemptBudget,
        minScore: request.minScore,
      });
    } else {
      const generator = options.generateMelodyScenario ?? generateMelodyScenario;
      generatedResult = generator({
        ruleId: request.ruleId,
        difficulty: request.difficulty,
        seed,
        queries,
        attemptBudget: request.attemptBudget,
        minScore: request.minScore,
      });
    }
  } catch (err) {
    throw new MelodyPreparationError(
      "GENERATION_FAILURE",
      err.message,
      {
        ruleId: request.ruleId,
        difficulty: request.difficulty,
        seed,
        cause: err,
        ...(err instanceof GenerationError ? err.details : {}),
      },
    );
  }

  const planner = options.createMelodyPlan ?? createMelodyPlan;
  const plan = planner(generatedResult.resolved);

  return {
    source: "generated",
    scenario: generatedResult.scenario,
    resolved: generatedResult.resolved,
    plan,
    provenance: generatedResult.provenance,
    fingerprint: generatedResult.provenance?.fingerprint || getScenarioFingerprint(generatedResult),
  };
}

export function prepareDistinctMelodyExperience({
  ruleId,
  difficulty = "introductory",
  currentSeed = 1001,
  currentFingerprint = "",
  maxRetries,
} = {}, options = {}) {
  return prepareMelodyExperience({
    source: "generated",
    ruleId,
    difficulty,
    seed: currentSeed,
    distinct: {
      currentSeed,
      currentFingerprint,
      maxRetries,
    },
  }, options);
}
