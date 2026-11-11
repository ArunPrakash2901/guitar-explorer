export type SectionId = "SEC-01" | "SEC-02" | "SEC-03" | "SEC-04" | "SEC-05" | "SEC-06"
  | "SEC-07" | "SEC-08" | "SEC-09" | "SEC-10" | "SEC-11";

export type SourceId = "recording" | "marty" | "solo" | "marin" | "guitarforce";

type Harmony = Readonly<{ tonic: string; chord: "power5" | "major" | "minor" }>;

export type Event = Readonly<{
  /** Offset and length are eighth-note ticks from the start of the educational example. */
  at: number;
  length: number;
  notes?: readonly string[];
  click?: "accent" | "pulse" | "muted";
  gesture?: string;
  harmony?: Harmony;
  gain?: number;
}>;

export type Example = Readonly<{
  label: string;
  description: string;
  bpm?: number;
  beats?: number;
  group?: number;
  events: readonly Event[];
  fretRange?: readonly [number, number];
  phrase?: true;
  referenceRoot?: string;
  scale?: "minorPentatonic" | "majorPentatonic";
  harmony?: Harmony;
  technique?: string;
}>;

export type Study = Readonly<{
  title: string;
  question: string;
  listen: string;
  context: string;
  uncertainty?: string;
  sources: readonly SourceId[];
  play: string;
  transfer: string;
  examples: readonly Example[];
}>;
