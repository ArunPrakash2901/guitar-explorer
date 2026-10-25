import assert from "node:assert/strict";
import {
  EVIDENCE_SCHEMA,
  EVIDENCE_SCHEMA_VERSION,
  createEvidenceSession,
  evidenceFilename,
  finalizeEvidenceSession,
  recordEvidenceInteraction,
} from "../lab/session-evidence-core.mjs";

const startedAt = "2026-10-25T07:00:00.000Z";
let session = createEvidenceSession({
  experience: "melody-over-harmony",
  page: "/melody.html",
  revision: "abc123",
  previewPr: "19",
  startedAt,
});

assert.equal(session.schema, EVIDENCE_SCHEMA);
assert.equal(session.schemaVersion, EVIDENCE_SCHEMA_VERSION);
assert.equal(session.previewPr, 19);
assert.equal(session.revision, "abc123");
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
});

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
assert.match(evidenceFilename(completed), /^guitar-explorer-evidence-melody-over-harmony-2026-10-25-07-00-00\.json$/);

const badInterpretation = finalizeEvidenceSession(session, {
  endedAt: "2026-10-25T07:00:13.000Z",
  reflection: { interpretation: "mastered" },
});
assert.equal(badInterpretation.reflection.interpretation, "");

assert.throws(
  () => createEvidenceSession({ experience: "", page: "/" }),
  /experience is required/,
);
assert.throws(
  () => recordEvidenceInteraction(session, { kind: "" }),
  /interaction kind is required/,
);

console.log("session evidence core checks passed");
