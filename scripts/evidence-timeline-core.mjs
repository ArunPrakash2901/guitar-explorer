const EVIDENCE_SCHEMA = "guitar-explorer/session-evidence";
const TIMELINE_SCHEMA = "guitar-explorer/evidence-timeline";
const TIMELINE_SCHEMA_VERSION = 1;

function cleanText(value, maxLength = 4000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, maxLength);
}

function hash32(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fallbackTrialId(evidence) {
  const seed = [
    evidence.startedAt,
    evidence.experience,
    evidence.page,
    evidence.revision,
    evidence.previewPr,
    evidence.scenarioId,
  ].map((value) => cleanText(value, 240)).join("|");
  return `legacy-${hash32(seed)}`;
}

export function normalizeEvidenceTrial(evidence, sourceFile = null) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("evidence must be an object");
  }
  if (evidence.schema !== EVIDENCE_SCHEMA) throw new TypeError("unsupported evidence schema");
  if (!Number.isInteger(evidence.schemaVersion) || evidence.schemaVersion < 2 || evidence.schemaVersion > 3) {
    throw new TypeError("unsupported evidence schema version");
  }
  const experience = cleanText(evidence.experience, 160);
  const startedAt = cleanText(evidence.startedAt, 80);
  if (!experience) throw new TypeError("evidence experience is required");
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) throw new TypeError("evidence startedAt must be a valid date-time");

  const revision = cleanText(evidence.revision ?? evidence.build?.revision, 120) || null;
  const deploymentChannel = cleanText(evidence.deploymentChannel ?? evidence.build?.channel, 80) || "unknown";
  const deploymentLabel = cleanText(evidence.deploymentLabel ?? evidence.build?.label, 160) || null;
  const previewPr = Number(evidence.previewPr ?? evidence.build?.previewPr);

  return {
    trialId: cleanText(evidence.trialId, 160) || fallbackTrialId(evidence),
    schemaVersion: evidence.schemaVersion,
    startedAt,
    endedAt: cleanText(evidence.endedAt, 80) || null,
    experience,
    scenarioId: cleanText(evidence.scenarioId, 200) || null,
    scenarioSource: cleanText(evidence.scenarioSource, 80) || null,
    revision,
    deploymentChannel,
    deploymentLabel,
    previewPr: Number.isInteger(previewPr) && previewPr > 0 ? previewPr : null,
    protocolVersion: Number.isInteger(evidence.protocol?.version) ? evidence.protocol.version : null,
    interpretation: cleanText(evidence.reflection?.interpretation, 80) || null,
    reflection: evidence.reflection && typeof evidence.reflection === "object" ? evidence.reflection : {},
    interactionCount: Array.isArray(evidence.interactions) ? evidence.interactions.length : 0,
    sourceFile: cleanText(sourceFile, 1000) || null,
  };
}

function groupKey(trial) {
  return trial.revision || "unknown-revision";
}

export function buildEvidenceTimeline(trials, { generatedAt = new Date().toISOString() } = {}) {
  const normalized = trials.map((trial) => normalizeEvidenceTrial(trial.evidence ?? trial, trial.sourceFile ?? null))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const byRevision = {};
  for (const trial of normalized) {
    const key = groupKey(trial);
    const group = byRevision[key] ??= {
      revision: trial.revision,
      trialCount: 0,
      experiences: {},
      interpretations: {},
      channels: {},
    };
    group.trialCount += 1;
    group.experiences[trial.experience] = (group.experiences[trial.experience] ?? 0) + 1;
    const interpretation = trial.interpretation || "unclassified";
    group.interpretations[interpretation] = (group.interpretations[interpretation] ?? 0) + 1;
    group.channels[trial.deploymentChannel] = (group.channels[trial.deploymentChannel] ?? 0) + 1;
  }

  return {
    schema: TIMELINE_SCHEMA,
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    generatedAt,
    note: "Descriptive physical-validation evidence only. Do not infer learner mastery from timing, hints, counts, or dispositions.",
    trialCount: normalized.length,
    trials: normalized,
    byRevision,
  };
}
