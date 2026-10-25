import assert from "node:assert/strict";
import { buildEvidenceTimeline, fallbackTrialId, normalizeEvidenceTrial } from "./evidence-timeline-core.mjs";

const legacy = {
  schema: "guitar-explorer/session-evidence",
  schemaVersion: 2,
  protocol: { id: "guitar-explorer/physical-validation", version: 1 },
  experience: "melody-over-harmony",
  page: "/melody.html",
  revision: "aaa111",
  previewPr: 22,
  scenarioId: "melody-g-ii-v-i",
  scenarioSource: "catalogue",
  startedAt: "2026-10-24T09:00:00.000Z",
  endedAt: "2026-10-24T09:05:00.000Z",
  interactions: [{ kind: "button-click" }],
  reflection: { interpretation: "change", calculationOrHesitation: "third still calculated" },
};

const current = {
  schema: "guitar-explorer/session-evidence",
  schemaVersion: 3,
  protocol: { id: "guitar-explorer/physical-validation", version: 1 },
  trialId: "trial-1234",
  experience: "melody-over-harmony",
  page: "/melody.html",
  revision: "bbb222",
  deploymentChannel: "preview",
  deploymentLabel: "pr-33",
  previewPr: 33,
  scenarioId: "melody-g-ii-v-i",
  scenarioSource: "catalogue",
  startedAt: "2026-10-25T09:00:00.000Z",
  endedAt: "2026-10-25T09:04:00.000Z",
  interactions: [],
  reflection: { interpretation: "keep", calculationOrHesitation: "" },
};

assert.match(fallbackTrialId(legacy), /^legacy-[0-9a-f]{8}$/);
assert.equal(normalizeEvidenceTrial(current).deploymentChannel, "preview");

const timeline = buildEvidenceTimeline([
  { evidence: current, sourceFile: ".evidence-local/exports/current.json" },
  { evidence: legacy, sourceFile: ".evidence-local/exports/legacy.json" },
], { generatedAt: "2026-10-25T10:00:00.000Z" });

assert.equal(timeline.schema, "guitar-explorer/evidence-timeline");
assert.equal(timeline.schemaVersion, 1);
assert.equal(timeline.trialCount, 2);
assert.equal(timeline.trials[0].revision, "aaa111");
assert.equal(timeline.trials[0].deploymentChannel, "unknown");
assert.match(timeline.trials[0].trialId, /^legacy-/);
assert.equal(timeline.trials[1].trialId, "trial-1234");
assert.equal(timeline.byRevision.aaa111.trialCount, 1);
assert.equal(timeline.byRevision.bbb222.experiences["melody-over-harmony"], 1);
assert.equal(timeline.byRevision.bbb222.interpretations.keep, 1);
assert.equal(timeline.byRevision.bbb222.channels.preview, 1);
assert.match(timeline.note, /Do not infer learner mastery/);

assert.throws(() => normalizeEvidenceTrial({ schema: "wrong", schemaVersion: 3 }), /unsupported evidence schema/);

console.log("longitudinal evidence timeline checks passed");
