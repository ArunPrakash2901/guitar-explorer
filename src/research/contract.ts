import type { ResearchFragment } from "./types.js";

type Row = Record<string, unknown>;
function row(value: unknown, path: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path} must be an object`);
  return value as Row;
}
function keys(value: Row, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
}
function str(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${path} must be non-empty text`);
  return value;
}
function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  return value as unknown[];
}
function refs(value: unknown, ids: Set<string>, path: string, min = 1): void {
  const values = list(value, path);
  if (values.length < min) throw new TypeError(`${path} needs at least ${min} reference(s)`);
  for (const id of values) if (typeof id !== "string" || !ids.has(id)) throw new TypeError(`${path} has an unknown ID: ${String(id)}`);
}
function status(value: unknown, values: readonly string[], path: string): void {
  if (!values.includes(value as string)) throw new TypeError(`${path} is unsupported`);
}
function json(value: unknown, path: string): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach((v, i) => json(v, `${path}[${i}]`)); return; }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, v] of Object.entries(value)) json(v, `${path}.${key}`);
    return;
  }
  throw new TypeError(`${path} must be JSON-compatible`);
}
function position(value: unknown, path: string, nullable: boolean): void {
  const p = row(value, path);
  keys(p, ["stringIndex", "fret"], path);
  for (const field of ["stringIndex", "fret"]) {
    const n = p[field];
    if (nullable && n === null) continue;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || (field === "stringIndex" && n > 5)) {
      throw new TypeError(`${path}.${field} must be a valid non-negative guitar coordinate`);
    }
  }
}
function observationValue(kind: string, value: unknown, path: string): void {
  const v = row(value, path);
  switch (kind) {
    case "physical_position":
      position(v, path, true); return;
    case "sounding_pitch":
      keys(v, ["pitch", "atBeats"], path);
      if (v.pitch !== null) str(v.pitch, `${path}.pitch`);
      if (v.atBeats !== null && (typeof v.atBeats !== "number" || !Number.isFinite(v.atBeats) || v.atBeats < 0)) throw new TypeError(`${path}.atBeats`);
      return;
    case "tempo":
      keys(v, ["bpm"], path);
      if (v.bpm !== null && (typeof v.bpm !== "number" || !Number.isFinite(v.bpm) || v.bpm <= 0)) throw new TypeError(`${path}.bpm`);
      return;
    case "texture":
    case "reported_technique":
      keys(v, ["description"], path); str(v.description, `${path}.description`); return;
    case "string_stroke": {
      keys(v, ["atBeats", "pitched", "mutedStringIndices"], path);
      if (v.atBeats !== null && (typeof v.atBeats !== "number" || !Number.isFinite(v.atBeats) || v.atBeats < 0)) throw new TypeError(`${path}.atBeats`);
      const played = list(v.pitched, `${path}.pitched`);
      played.forEach((p, i) => position(p, `${path}.pitched[${i}]`, false));
      const muted = list(v.mutedStringIndices, `${path}.mutedStringIndices`);
      if (!muted.every((s) => typeof s === "number" && Number.isInteger(s) && s >= 0 && s <= 5)) throw new TypeError(`${path}.mutedStringIndices`);
      const sounding = played.map((p) => (p as Row).stringIndex);
      if (new Set([...sounding, ...muted]).size !== sounding.length + muted.length) throw new TypeError(`${path} cannot sound and mute the same string`);
      return;
    }
    default: throw new TypeError(`${path} has unsupported observation kind ${kind}`);
  }
}

/** No inference or defaulting: reject broken links and retain explicit unknowns. */
export function validateResearchFragment(input: unknown): ResearchFragment {
  json(input, "fragment");
  const f = row(input, "fragment");
  keys(f, ["schemaVersion", "id", "workId", "arrangementId", "realizations", "sources", "observations", "assumptions", "derivations", "interpretations", "alternatives"], "fragment");
  if (f.schemaVersion !== 1) throw new TypeError("Unsupported research schemaVersion");
  for (const field of ["id", "workId", "arrangementId"]) str(f[field], field);
  const ids = new Set<string>();
  function collect(items: unknown, name: string): Row[] {
    return list(items, name).map((item, index) => {
      const r = row(item, `${name}[${index}]`);
      const id = str(r.id, `${name}[${index}].id`);
      if (ids.has(id)) throw new TypeError(`Duplicate research ID ${id}`);
      ids.add(id);
      return r;
    });
  }
  const realizations = collect(f.realizations, "realizations");
  const sources = collect(f.sources, "sources");
  const observations = collect(f.observations, "observations");
  const assumptions = collect(f.assumptions, "assumptions");
  const derivations = collect(f.derivations, "derivations");
  const interpretations = collect(f.interpretations, "interpretations");
  const alternatives = collect(f.alternatives, "alternatives");
  const realizationIds = new Set(realizations.map((r) => r.id as string));
  const sourceIds = new Set(sources.map((s) => s.id as string));
  const observationIds = new Set(observations.map((o) => o.id as string));
  const assumptionIds = new Set(assumptions.map((a) => a.id as string));
  const supportIds = new Set([...sourceIds, ...observationIds, ...derivations.map((d) => d.id as string), ...interpretations.map((i) => i.id as string)]);
  for (const r of realizations) {
    keys(r, ["id", "kind", "label"], "realization");
    status(r.kind, ["studio_recording", "live_performance", "artist_demonstration", "music_video", "candidate_realization"], "realization.kind");
    str(r.label, "realization.label");
  }
  for (const s of sources) {
    keys(s, ["id", "type", "reference", "locator", "realizationId", "scope", "derivationNote"], "source");
    status(s.type, ["studio_audio", "live_video", "music_video", "artist_demo", "artist_interview", "specialist_analysis", "research_pilot"], "source.type");
    for (const field of ["reference", "locator", "scope"]) str(s[field], `source.${field}`);
    if (s.realizationId !== null && !realizationIds.has(s.realizationId as string)) throw new TypeError("source.realizationId");
    if (s.derivationNote !== undefined) str(s.derivationNote, "source.derivationNote");
  }
  for (const o of observations) {
    keys(o, ["id", "fragmentId", "realizationId", "sourceIds", "kind", "value", "status", "confidence", "unknownReason"], "observation");
    if (o.fragmentId !== f.id || !realizationIds.has(o.realizationId as string)) throw new TypeError("observation realization/fragment mismatch");
    refs(o.sourceIds, sourceIds, "observation.sourceIds");
    for (const id of o.sourceIds as string[]) {
      const source = sources.find((s) => s.id === id)!;
      if (source.realizationId !== null && source.realizationId !== o.realizationId) throw new TypeError("Source evidence cannot be assigned to another realization");
    }
    status(o.status, ["observed", "reported", "measured", "estimated", "contested", "unknown"], "observation.status");
    status(o.confidence, ["high", "medium", "low", "unknown"], "observation.confidence");
    observationValue(str(o.kind, "observation.kind"), o.value, "observation.value");
    if (o.status === "unknown") str(o.unknownReason, "observation.unknownReason");
    if (o.unknownReason !== undefined) str(o.unknownReason, "observation.unknownReason");
  }
  for (const a of assumptions) {
    keys(a, ["id", "origin", "kind", "value"], "assumption");
    str(a.origin, "assumption.origin");
    status(a.kind, ["tuning", "key", "chord"], "assumption.kind");
    if (a.kind === "tuning" && a.value !== "standard") throw new TypeError("Only standard tuning is supported in v0 adapter");
    if (a.kind === "key" || a.kind === "chord") {
      const v = row(a.value, "assumption.value");
      keys(v, a.kind === "key" ? ["tonic", "mode"] : ["root", "chordId"], "assumption.value");
      str(v[a.kind === "key" ? "tonic" : "root"], "assumption.note");
      if (a.kind === "key") status(v.mode, ["major", "minor"], "assumption.mode");
      else str(v.chordId, "assumption.chordId");
    }
  }
  for (const d of derivations) {
    keys(d, ["id", "observationIds", "assumptionIds", "engineQuery", "result"], "derivation");
    refs(d.observationIds, observationIds, "derivation.observationIds");
    refs(d.assumptionIds, assumptionIds, "derivation.assumptionIds");
    status(d.engineQuery, ["getNoteAtFret", "getInterval"], "derivation.engineQuery");
  }
  for (const i of interpretations) {
    keys(i, ["id", "supportIds", "claim", "confidence", "author", "deterministic"], "interpretation");
    refs(i.supportIds, supportIds, "interpretation.supportIds");
    str(i.claim, "interpretation.claim"); str(i.author, "interpretation.author");
    status(i.confidence, ["high", "medium", "low", "unknown"], "interpretation.confidence");
    if (i.deterministic !== false) throw new TypeError("interpretation.deterministic must be false");
  }
  for (const a of alternatives) {
    keys(a, ["id", "subject", "status", "options"], "alternative");
    str(a.subject, "alternative.subject");
    if (a.status !== "unresolved") throw new TypeError("v0 alternatives remain unresolved");
    const options = list(a.options, "alternative.options");
    if (options.length < 2) throw new TypeError("alternative needs competing options");
    for (const option of options) {
      const v = row(option, "alternative.option");
      keys(v, ["id", "supportIds", "description"], "alternative.option");
      str(v.id, "alternative.option.id"); str(v.description, "alternative.option.description");
      refs(v.supportIds, supportIds, "alternative.option.supportIds");
    }
  }
  return structuredClone(f) as unknown as ResearchFragment;
}
