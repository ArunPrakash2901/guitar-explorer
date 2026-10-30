export const EVIDENCE_SCHEMA = "guitar-explorer/session-evidence";
export const EVIDENCE_SCHEMA_VERSION = 3;
export const PHYSICAL_VALIDATION_PROTOCOL = "guitar-explorer/physical-validation";
export const PHYSICAL_VALIDATION_PROTOCOL_VERSION = 1;

const INTERPRETATIONS = new Set([
  "",
  "keep",
  "change",
  "remove",
  "promotion-candidate",
  "inconclusive",
]);

const SCENARIO_SOURCES = new Set(["catalogue", "generated"]);
const DEPLOYMENT_CHANNELS = new Set(["local", "stable", "preview", "experimental"]);

const REFLECTION_FIELDS = [
  "easierWithoutAnswers",
  "calculationOrHesitation",
  "physicalAwkwardness",
  "assistanceEffect",
  "transferResult",
  "nextAction",
];

function cleanText(value, maxLength = 4000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, maxLength);
}

function validIso(value, fieldName) {
  const text = cleanText(value, 80);
  if (!text || Number.isNaN(Date.parse(text))) {
    throw new TypeError(`${fieldName} must be a valid ISO date-time string`);
  }
  return text;
}

function hash32(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeReflection(reflection = {}) {
  const normalized = {};
  for (const field of REFLECTION_FIELDS) {
    normalized[field] = cleanText(reflection[field]);
  }

  const interpretation = cleanText(reflection.interpretation, 80);
  normalized.interpretation = INTERPRETATIONS.has(interpretation) ? interpretation : "";
  return normalized;
}

function normalizeScenario({ scenarioId = null, scenarioSource = null, scenarioContractVersion = null } = {}) {
  const id = cleanText(scenarioId, 200) || null;
  const source = cleanText(scenarioSource, 80) || null;
  const numericVersion = scenarioContractVersion === null || scenarioContractVersion === ""
    ? null
    : Number(scenarioContractVersion);

  return {
    scenarioId: id,
    scenarioSource: id && SCENARIO_SOURCES.has(source) ? source : null,
    scenarioContractVersion: id && Number.isInteger(numericVersion) && numericVersion > 0 ? numericVersion : null,
  };
}

function normalizeDeployment({ deploymentChannel = null, deploymentLabel = null } = {}) {
  const channel = cleanText(deploymentChannel, 80) || "local";
  return {
    deploymentChannel: DEPLOYMENT_CHANNELS.has(channel) ? channel : "local",
    deploymentLabel: cleanText(deploymentLabel, 160) || null,
  };
}

function createTrialId({ startedAt, experience, page, revision, previewPr, scenarioId }) {
  const seed = [startedAt, experience, page, revision, previewPr, scenarioId]
    .map((value) => cleanText(value, 240))
    .join("|");
  return `trial-${hash32(seed)}`;
}

export function createEvidenceSession({
  experience,
  page,
  revision = null,
  previewPr = null,
  deploymentChannel = null,
  deploymentLabel = null,
  trialId = null,
  scenarioId = null,
  scenarioSource = null,
  scenarioContractVersion = null,
  startedAt = new Date().toISOString(),
} = {}) {
  const normalizedExperience = cleanText(experience, 160);
  const normalizedPage = cleanText(page, 500);
  if (!normalizedExperience) throw new TypeError("experience is required");
  if (!normalizedPage) throw new TypeError("page is required");

  const normalizedStartedAt = validIso(startedAt, "startedAt");
  const normalizedRevision = cleanText(revision, 120) || null;
  const numericPr = previewPr === null || previewPr === "" ? null : Number(previewPr);
  const normalizedPreviewPr = Number.isInteger(numericPr) && numericPr > 0 ? numericPr : null;
  const scenario = normalizeScenario({ scenarioId, scenarioSource, scenarioContractVersion });
  const deployment = normalizeDeployment({ deploymentChannel, deploymentLabel });
  const normalizedTrialId = cleanText(trialId, 160) || createTrialId({
    startedAt: normalizedStartedAt,
    experience: normalizedExperience,
    page: normalizedPage,
    revision: normalizedRevision,
    previewPr: normalizedPreviewPr,
    scenarioId: scenario.scenarioId,
  });

  return {
    schema: EVIDENCE_SCHEMA,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    protocol: {
      id: PHYSICAL_VALIDATION_PROTOCOL,
      version: PHYSICAL_VALIDATION_PROTOCOL_VERSION,
    },
    trialId: normalizedTrialId,
    experience: normalizedExperience,
    page: normalizedPage,
    revision: normalizedRevision,
    previewPr: normalizedPreviewPr,
    ...deployment,
    ...scenario,
    startedAt: normalizedStartedAt,
    interactions: [],
    reflection: normalizeReflection(),
  };
}

export function withEvidenceScenario(session, scenario = {}) {
  if (!session || !Array.isArray(session.interactions)) {
    throw new TypeError("session must be an evidence session");
  }
  return { ...session, ...normalizeScenario(scenario) };
}

export function recordEvidenceInteraction(session, {
  elapsedMs,
  kind,
  targetId = null,
  name = null,
  value = null,
  label = null,
  scenarioId = session?.scenarioId ?? null,
  scenarioSource = session?.scenarioSource ?? null,
  scenarioContractVersion = session?.scenarioContractVersion ?? null,
} = {}) {
  if (!session || !Array.isArray(session.interactions)) {
    throw new TypeError("session must be an evidence session");
  }

  const normalizedKind = cleanText(kind, 80);
  if (!normalizedKind) throw new TypeError("interaction kind is required");

  const numericElapsed = Number(elapsedMs);
  const interaction = {
    elapsedMs: Number.isFinite(numericElapsed) && numericElapsed >= 0
      ? Math.round(numericElapsed)
      : 0,
    kind: normalizedKind,
    targetId: cleanText(targetId, 160) || null,
    name: cleanText(name, 160) || null,
    value: cleanText(value, 240) || null,
    label: cleanText(label, 240) || null,
    ...normalizeScenario({ scenarioId, scenarioSource, scenarioContractVersion }),
  };

  return {
    ...session,
    interactions: [...session.interactions, interaction],
  };
}

export function finalizeEvidenceSession(session, {
  endedAt = new Date().toISOString(),
  reflection = {},
  scenario = null,
} = {}) {
  if (!session || !Array.isArray(session.interactions)) {
    throw new TypeError("session must be an evidence session");
  }

  const normalizedEndedAt = validIso(endedAt, "endedAt");
  const durationMs = Math.max(0, Date.parse(normalizedEndedAt) - Date.parse(session.startedAt));
  const contextualSession = scenario ? withEvidenceScenario(session, scenario) : session;

  return {
    ...contextualSession,
    endedAt: normalizedEndedAt,
    durationSeconds: Math.round(durationMs / 100) / 10,
    reflection: normalizeReflection(reflection),
  };
}

export function evidenceFilename(session) {
  const experience = cleanText(session?.experience, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "session";
  const scenario = cleanText(session?.scenarioId, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const revision = cleanText(session?.revision, 40)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = cleanText(session?.startedAt, 80).slice(0, 19).replace(/[:T]/g, "-") || "unknown-time";
  return `guitar-explorer-evidence-${experience}${scenario ? `-${scenario}` : ""}${revision ? `-${revision.slice(0, 12)}` : ""}-${date}.json`;
}
