import type { ChordId } from "../engine/core/types.js";

export type Confidence = "high" | "medium" | "low" | "unknown";
export type Json = null | string | number | boolean | readonly Json[] | { readonly [key: string]: Json };
export type Realization = Readonly<{ id: string; kind: "studio_recording" | "live_performance" | "artist_demonstration" | "music_video" | "candidate_realization"; label: string }>;
export type Source = Readonly<{
  id: string; type: "studio_audio" | "live_video" | "music_video" | "artist_demo" | "artist_interview" | "specialist_analysis" | "research_pilot";
  reference: string; locator: string; realizationId: string | null; scope: string; derivationNote?: string;
}>;
type Base = Readonly<{
  id: string; fragmentId: string; realizationId: string; sourceIds: readonly string[];
  status: "observed" | "reported" | "measured" | "estimated" | "contested" | "unknown";
  confidence: Confidence; unknownReason?: string;
}>;
export type Observation = Base & (
  | Readonly<{ kind: "sounding_pitch"; value: { pitch: string | null; atBeats: number | null } }>
  | Readonly<{ kind: "physical_position"; value: { stringIndex: number | null; fret: number | null } }>
  | Readonly<{ kind: "string_stroke"; value: { atBeats: number | null; pitched: readonly { stringIndex: number; fret: number }[]; mutedStringIndices: readonly number[] } }>
  | Readonly<{ kind: "tempo"; value: { bpm: number | null } }>
  | Readonly<{ kind: "texture" | "reported_technique"; value: { description: string } }>
);
export type Assumption = Readonly<{
  id: string; origin: string; kind: "tuning" | "key" | "chord";
  value: "standard" | { tonic: string; mode: "major" | "minor" } | { root: string; chordId: ChordId };
}>;
export type Derivation = Readonly<{
  id: string; observationIds: readonly string[]; assumptionIds: readonly string[];
  engineQuery: "getNoteAtFret" | "getInterval"; result: Json;
}>;
export type Interpretation = Readonly<{
  id: string; supportIds: readonly string[]; claim: string; confidence: Confidence;
  author: string; deterministic: false;
}>;
export type Alternative = Readonly<{
  id: string; subject: string; status: "unresolved";
  options: readonly { id: string; supportIds: readonly string[]; description: string }[];
}>;
export type ResearchFragment = Readonly<{
  schemaVersion: 1; id: string; workId: string; arrangementId: string;
  realizations: readonly Realization[]; sources: readonly Source[]; observations: readonly Observation[];
  assumptions: readonly Assumption[]; derivations: readonly Derivation[];
  interpretations: readonly Interpretation[]; alternatives: readonly Alternative[];
}>;
