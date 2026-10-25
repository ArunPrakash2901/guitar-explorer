export const EVIDENCE_SCHEMA = "guitar-explorer/session-evidence";
export const EVIDENCE_SCHEMA_VERSION = 1;

const INTERPRETATIONS = new Set([
  "",
  "keep",
  "change",
  "remove",
  "promotion-candidate",
  "inconclusive",
]);

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

function normalizeReflection(reflection = {}) {
  const normalized = {};
  for (const field of REFLECTION_FIELDS) {
    normalized[field] = cleanText(reflection[field]);
  }

  const interpretation = cleanText(reflection.interpretation, 80);
  normalized.interpretation = INTERPRETATIONS.has(interpretation) ? interpretation : "";
  return normalized;
}

export function createEvidenceSession({
  experience,
  page,
  revision = null,
  previewPr = null,
  startedAt = new Date().toISOString(),
} = {}) {
  const normalizedExperience = cleanText(experience, 160);
  const normalizedPage = cleanText(page, 500);
  if (!normalizedExperience) throw new TypeError("experience is required");
  if (!normalizedPage) throw new TypeError("page is required");

  const numericPr = previewPr === null || previewPr === "" ? null : Number(previewPr);

  return {
    schema: EVIDENCE_SCHEMA,
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    experience: normalizedExperience,
    page: normalizedPage,
    revision: cleanText(revision, 120) || null,
    previewPr: Number.isInteger(numericPr) && numericPr > 0 ? numericPr : null,
    startedAt: validIso(startedAt, "startedAt"),
    interactions: [],
    reflection: normalizeReflection(),
  };
}

export function recordEvidenceInteraction(session, {
  elapsedMs,
  kind,
  targetId = null,
  name = null,
  value = null,
  label = null,
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
  };

  return {
    ...session,
    interactions: [...session.interactions, interaction],
  };
}

export function finalizeEvidenceSession(session, {
  endedAt = new Date().toISOString(),
  reflection = {},
} = {}) {
  if (!session || !Array.isArray(session.interactions)) {
    throw new TypeError("session must be an evidence session");
  }

  const normalizedEndedAt = validIso(endedAt, "endedAt");
  const durationMs = Math.max(0, Date.parse(normalizedEndedAt) - Date.parse(session.startedAt));

  return {
    ...session,
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
  const date = cleanText(session?.startedAt, 80).slice(0, 19).replace(/[:T]/g, "-") || "unknown-time";
  return `guitar-explorer-evidence-${experience}-${date}.json`;
}
