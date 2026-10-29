import { scenarioIdentity } from "./scenario-identity.mjs";

export const ASSISTANT_CONTEXT_SCHEMA = "guitar-explorer/melody-assistant-context";
export const ASSISTANT_PROPOSAL_SCHEMA = "guitar-explorer/melody-assistant-proposal";
export const ASSISTANT_CONTRACT_VERSION = 1;
export const MAX_CONTEXT_BYTES = 4096;
export const MAX_PROPOSAL_BYTES = 1024;

const byteCount = (value) => new TextEncoder().encode(value).byteLength;

// Only copy facts already shown at the current Melody stage. In particular,
// never traverse the resolved material, stage.answer, plan, or evaluator.
export function createMelodyAssistantContext({ sessionId, stateRevision, build, scenario, provenance, stage,
  selections = [], hintsUsed = 0, revealed = false } = {}) {
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 128 || !Number.isInteger(stateRevision) || stateRevision < 1) {
    throw new TypeError("An active session ID and revision are required");
  }
  if (scenario?.type !== "melody" || !stage?.context?.boardRange || !Array.isArray(selections)) {
    throw new TypeError("An accepted Melody scenario and stage are required");
  }
  const identity = scenarioIdentity(scenario);
  const context = stage.context;
  const source = identity.scenarioSource;
  const snapshot = {
    schema: ASSISTANT_CONTEXT_SCHEMA,
    version: ASSISTANT_CONTRACT_VERSION,
    build: {
      revision: build?.revision ?? "local",
      channel: build?.channel ?? "local",
      previewPr: build?.previewPr ?? null,
    },
    sessionId,
    stateRevision,
    experience: "melody-over-harmony",
    scenario: {
      ...identity,
      provenance: source === "generated"
        ? { ruleId: provenance?.ruleId, difficulty: provenance?.difficulty, seed: provenance?.seed,
          generatorVersion: provenance?.generatorVersion }
        : { source: "catalogue" },
    },
    stage: { id: stage.id, kind: stage.kind, title: stage.title, prompt: stage.prompt,
      instruction: stage.instruction },
    musicalContext: {
      key: { tonic: { letter: context.key.tonic.letter, accidental: context.key.tonic.accidental },
        mode: context.key.mode },
      chords: context.chords.map(({ symbol }) => symbol),
      region: { strings: [...context.boardRange.strings], minFret: context.boardRange.minFret,
        maxFret: context.boardRange.maxFret },
    },
    selections: selections.map(({ stringIndex, fret }) => ({ stringIndex, fret })),
    hintsUsed,
    revealed: Boolean(revealed),
    allowedActions: stage.kind === "select" && !revealed && hintsUsed < 2 ? ["request-hint"] : [],
  };
  if (byteCount(JSON.stringify(snapshot)) > MAX_CONTEXT_BYTES) throw new RangeError("Assistant context is too large");
  return snapshot;
}

const proposalKeys = ["actionId", "kind", "schema", "sessionId", "stateRevision", "version"];
const rejected = (code) => ({ ok: false, code });

export function validateMelodyAssistantProposal(raw, currentContext, appliedActionIds = new Set()) {
  if (typeof raw !== "string" || byteCount(raw) > MAX_PROPOSAL_BYTES) return rejected("INVALID_SIZE");
  let proposal;
  try { proposal = JSON.parse(raw); } catch { return rejected("MALFORMED_JSON"); }
  if (!proposal || Array.isArray(proposal) || typeof proposal !== "object"
    || JSON.stringify(Object.keys(proposal).sort()) !== JSON.stringify(proposalKeys)
    || proposal.schema !== ASSISTANT_PROPOSAL_SCHEMA || proposal.version !== ASSISTANT_CONTRACT_VERSION
    || proposal.kind !== "request-hint" || typeof proposal.sessionId !== "string"
    || !Number.isInteger(proposal.stateRevision)
    || typeof proposal.actionId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(proposal.actionId)) {
    return rejected("INVALID_PROPOSAL");
  }
  if (appliedActionIds.has(proposal.actionId)) return rejected("DUPLICATE_ACTION");
  if (proposal.sessionId !== currentContext?.sessionId) return rejected("SESSION_MISMATCH");
  if (proposal.stateRevision !== currentContext?.stateRevision) return rejected("STALE_CONTEXT");
  if (!currentContext?.allowedActions?.includes(proposal.kind)) return rejected("ACTION_NOT_ALLOWED");
  return { ok: true, action: { id: proposal.actionId, kind: proposal.kind } };
}
