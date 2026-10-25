import assert from "node:assert/strict";
import {
  EVIDENCE_SCHEMA,
  EVIDENCE_SCHEMA_VERSION,
  PHYSICAL_VALIDATION_PROTOCOL,
  PHYSICAL_VALIDATION_PROTOCOL_VERSION,
  createEvidenceSession,
  evidenceFilename,
  finalizeEvidenceSession,
  recordEvidenceInteraction,
  withEvidenceScenario,
} from "../lab/session-evidence-core.mjs";

const startedAt = "2026-10-25T07:00:00.000Z";
let session = createEvidenceSession({
  experience: "melody-over-harmony",
  page: "/melody.html",
  revision: "abc123",
  previewPr: "19",
  deploymentChannel: "preview",
  deploymentLabel: "pr-19",
  scenarioId: "melody-g-ii-v-i",
  scenarioSource: "catalogue",
  scenarioContractVersion: 1,
  startedAt,
});

assert.equal(session.schema, EVIDENCE_SCHEMA);
assert.equal(session.schemaVersion, EVIDENCE_SCHEMA_VERSION);
assert.equal(session.schemaVersion, 3);
assert.deepEqual(session.protocol, {
  id: PHYSICAL_VALIDATION_PROTOCOL,
  version: PHYSICAL_VALIDATION_PROTOCOL_VERSION,
});
assert.equal(session.protocol.id, "guitar-explorer/physical-validation");
assert.equal(session.protocol.version, 1);
assert.match(session.trialId, /^trial-[0-9a-f]{8}$/);
assert.equal(session.previewPr, 19);
assert.equal(session.revision, "abc123");
assert.equal(session.deploymentChannel, "preview");
assert.equal(session.deploymentLabel, "pr-19");
assert.equal(session.scenarioId, "melody-g-ii-v-i");
assert.equal(session.scenarioSource, "catalogue");
assert.equal(session.scenarioContractVersion, 1);
assert.deepEqual(session.interactions, []);

session = recordEvidenceInteraction(session, {
  elapsedMs: 1234.4,
  kind: "button-click",
  targetId: "hint",
  label: "Hint",
});

assert.equal(session.interactions.length, 1);
assert.deepEqual(session.interactions[0], {
  elapsedMs: 1234,
  kind: "button-click",
  targetId: "hint",
  name: null,
  value: null,
  label: "Hint",
  scenarioId: "melody-g-ii-v-i",
  scenarioSource: "catalogue",
  scenarioContractVersion: 1,
});

session = withEvidenceScenario(session, {
  scenarioId: "gen-dominant-third-introductory-1001",
  scenarioSource: "generated",
  scenarioContractVersion: 1,
});
assert.equal(session.scenarioSource, "generated");

session = recordEvidenceInteraction(session, {
  elapsedMs: 5000,
  kind: "scenario-change",
  label: "Generated scenario",
});
assert.equal(session.interactions[1].scenarioId, "gen-dominant-third-introductory-1001");
assert.equal(session.interactions[1].scenarioSource, "generated");

const completed = finalizeEvidenceSession(session, {
  endedAt: "2026-10-25T07:00:12.345Z",
  reflection: {
    easierWithoutAnswers: "Root locations felt immediate.",
    calculationOrHesitation: "I still calculated the third.",
    physicalAwkwardness: "String crossing.",
    assistanceEffect: "The hint narrowed the search without revealing the fret.",
    transferResult: "A major took one extra attempt.",
    interpretation: "change",
    nextAction: "Repeat the transfer with no hint.",
  },
});

assert.equal(completed.durationSeconds, 12.3);
assert.equal(completed.reflection.interpretation, "change");
assert.equal(completed.reflection.calculationOrHesitation, "I still calculated the third.");
assert.match(
  evidenceFilename(completed),
  /^guitar-explorer-evidence-melody-over-harmony-gen-dominant-third-introductory-1001-abc123-2026-10-25-07-00-00\.json$/,
);

const replay = createEvidenceSession({
  experience: "melody-over-harmony",
  page: "/melody.html",
  revision: "abc123",
  previewPr: 19,
  deploymentChannel: "preview",
  deploymentLabel: "pr-19",
  scenarioId: "melody-g-ii-v-i",
  scenarioSource: "catalogue",
  scenarioContractVersion: 1,
  startedAt,
});
assert.equal(replay.trialId, session.trialId);

const badInterpretation = finalizeEvidenceSession(session, {
  endedAt: "2026-10-25T07:00:13.000Z",
  reflection: { interpretation: "mastered" },
});
assert.equal(badInterpretation.reflection.interpretation, "");

const noScenario = createEvidenceSession({ experience: "harmonic-gravity-practice", page: "/practice.html", startedAt });
assert.equal(noScenario.scenarioId, null);
assert.equal(noScenario.scenarioSource, null);
assert.equal(noScenario.scenarioContractVersion, null);
assert.equal(noScenario.deploymentChannel, "local");
assert.equal(noScenario.deploymentLabel, null);

const unknownChannel = createEvidenceSession({
  experience: "harmonic-gravity-practice",
  page: "/practice.html",
  deploymentChannel: "production-ish",
  startedAt,
});
assert.equal(unknownChannel.deploymentChannel, "local");

assert.throws(
  () => createEvidenceSession({ experience: "", page: "/" }),
  /experience is required/,
);
assert.throws(
  () => recordEvidenceInteraction(session, { kind: "" }),
  /interaction kind is required/,
);

console.log("session evidence protocol, scenario, and deployment checks passed");
