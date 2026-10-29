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

const currentUpdatedExport = {
  ...current,
  endedAt: "2026-10-25T09:06:00.000Z",
  interactions: [{ kind: "button-click" }],
  reflection: { interpretation: "change", calculationOrHesitation: "still calculating the third" },
};

assert.match(fallbackTrialId(legacy), /^legacy-[0-9a-f]{8}$/);
assert.equal(normalizeEvidenceTrial(current).deploymentChannel, "preview");

const timeline = buildEvidenceTimeline([
  { evidence: current, sourceFile: ".evidence-local/exports/current.json" },
  { evidence: legacy, sourceFile: ".evidence-local/exports/legacy.json" },
  { evidence: currentUpdatedExport, sourceFile: ".evidence-local/exports/current-2.json" },
], { generatedAt: "2026-10-25T10:00:00.000Z" });

assert.equal(timeline.schema, "guitar-explorer/evidence-timeline");
assert.equal(timeline.schemaVersion, 1);
assert.equal(timeline.trialCount, 2);
assert.equal(timeline.trials[0].revision, "aaa111");
assert.equal(timeline.trials[0].deploymentChannel, "unknown");
assert.match(timeline.trials[0].trialId, /^legacy-/);
assert.equal(timeline.trials[1].trialId, "trial-1234");
assert.equal(timeline.trials[1].sourceFile, ".evidence-local/exports/current-2.json");
assert.equal(timeline.trials[1].interpretation, "change");
assert.equal(timeline.trials[1].interactionCount, 1);
assert.equal(timeline.byRevision.aaa111.trialCount, 1);
assert.equal(timeline.byRevision.bbb222.trialCount, 1);
assert.equal(timeline.byRevision.bbb222.experiences["melody-over-harmony"], 1);
assert.equal(timeline.byRevision.bbb222.interpretations.change, 1);
assert.equal(timeline.byRevision.bbb222.interpretations.keep, undefined);
assert.equal(timeline.byRevision.bbb222.channels.preview, 1);
assert.match(timeline.note, /Repeated exports of one trial are reconciled/);
assert.match(timeline.note, /Do not infer learner mastery/);

const objectPrototypeBefore = Object.getOwnPropertyDescriptors(Object.prototype);
for (const reserved of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
  const withReservedKeys = buildEvidenceTimeline([1, 2].map((number) => ({
    ...current,
    trialId: `reserved-${reserved}-${number}`,
    revision: reserved,
    experience: reserved,
    deploymentChannel: reserved,
    reflection: { interpretation: reserved },
  })));
  const group = withReservedKeys.byRevision[reserved];
  assert.equal(Object.hasOwn(withReservedKeys.byRevision, reserved), true, `Revision ${reserved} is its own group`);
  assert.equal(group.trialCount, 2);
  for (const field of ["experiences", "interpretations", "channels"]) {
    assert.equal(Object.hasOwn(group[field], reserved), true, `${field}.${reserved} is an own count`);
    assert.equal(group[field][reserved], 2);
    assert.equal(JSON.parse(JSON.stringify(withReservedKeys)).byRevision[reserved][field][reserved], 2);
  }
}
assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), objectPrototypeBefore);

assert.throws(() => normalizeEvidenceTrial({ schema: "wrong", schemaVersion: 3 }), /unsupported evidence schema/);

console.log("longitudinal evidence timeline checks passed");
