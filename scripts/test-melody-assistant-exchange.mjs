import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as engine from "../.lab-dist/engine/index.js";
import { prepareMelodyExperience, createPhraseQueries } from "../lab/melody-experience.mjs";
import {
  ASSISTANT_CONTEXT_SCHEMA, ASSISTANT_PROPOSAL_SCHEMA, MAX_CONTEXT_BYTES, MAX_PROPOSAL_BYTES,
  createMelodyAssistantContext, validateMelodyAssistantProposal,
} from "../lab/melody-assistant-exchange.mjs";

const prepared = prepareMelodyExperience({ source: "catalogue", scenarioId: "melody-g-ii-v-i" },
  { queries: createPhraseQueries(engine) });
const stage = prepared.plan.stages[1];
const input = { sessionId: "session-1", stateRevision: 7, build: { revision: "abc123", channel: "preview", previewPr: 39 },
  scenario: prepared.scenario, provenance: prepared.provenance, stage, selections: [], hintsUsed: 0, revealed: false };
const context = createMelodyAssistantContext(input);
const serialized = JSON.stringify(context);
assert.equal(context.schema, ASSISTANT_CONTEXT_SCHEMA);
assert.equal(context.build.revision, "abc123");
assert.equal(context.scenario.scenarioId, prepared.scenario.id);
assert.equal(context.stage.id, "target");
assert.deepEqual(context.musicalContext.chords, ["Am7", "D7", "Gmaj7"]);
assert.deepEqual(context.allowedActions, ["request-hint"]);
assert.deepEqual(JSON.parse(serialized), context, "The context is a plain JSON projection");
assert.ok(new TextEncoder().encode(serialized).length <= MAX_CONTEXT_BYTES);
assert.doesNotMatch(serialized, /F#|"answer"|"pitch"|"evaluate"/, "Unrevealed answer and functions stay outside the context");
assert.equal(createMelodyAssistantContext({ ...input, revealed: true }).allowedActions.length, 0);
assert.equal(createMelodyAssistantContext({ ...input, hintsUsed: 2 }).allowedActions.length, 0);
assert.throws(() => createMelodyAssistantContext({ ...input,
  stage: { ...stage, prompt: "x".repeat(MAX_CONTEXT_BYTES) } }), /too large/);
assert.deepEqual(createMelodyAssistantContext({ ...input, selections: [{ stringIndex: 5, fret: 1 }] }).selections,
  [{ stringIndex: 5, fret: 1 }], "Only already selected positions are shared");

const proposal = { schema: ASSISTANT_PROPOSAL_SCHEMA, version: 1, sessionId: context.sessionId,
  stateRevision: context.stateRevision, actionId: "first-hint", kind: "request-hint" };
const check = (value, current = context, used = new Set()) => validateMelodyAssistantProposal(JSON.stringify(value), current, used);
assert.deepEqual(check(proposal), { ok: true, action: { id: "first-hint", kind: "request-hint" } });
assert.equal(check(proposal, context, new Set([proposal.actionId])).code, "DUPLICATE_ACTION");
assert.equal(check(proposal, { ...context, stateRevision: 8 }).code, "STALE_CONTEXT");
assert.equal(check({ ...proposal, sessionId: "another-session" }).code, "SESSION_MISMATCH");
assert.equal(check(proposal, createMelodyAssistantContext({ ...input, revealed: true })).code, "ACTION_NOT_ALLOWED");
assert.equal(check({ ...proposal, kind: "reveal-answer" }).code, "INVALID_PROPOSAL");
assert.equal(check({ ...proposal, answer: "F#" }).code, "INVALID_PROPOSAL");
assert.equal(check({ ...proposal, actionId: "__proto__" }).ok, true, "Action IDs are treated as Set values only");
assert.equal(check({ ...proposal, actionId: "invalid id" }).code, "INVALID_PROPOSAL");
assert.equal(validateMelodyAssistantProposal("{broken", context).code, "MALFORMED_JSON");
assert.equal(validateMelodyAssistantProposal("x".repeat(MAX_PROPOSAL_BYTES + 1), context).code, "INVALID_SIZE");
const schema = JSON.parse(await readFile(new URL("../schemas/melody-assistant-proposal-v1.schema.json", import.meta.url), "utf8"));
assert.equal(schema.additionalProperties, false);
assert.deepEqual(new Set(schema.required), new Set(Object.keys(proposal)));
assert.equal(schema.properties.kind.const, "request-hint");
console.log("Melody assistant exchange contract checks passed");
