import type { ScaleId } from "../../src/engine/core/types.js";

export const phase2BScaleIds = [
  "harmonicMinor",
  "melodicMinorAscending",
  "majorPentatonic",
  "minorPentatonic",
  "minorBlues",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
] as const satisfies readonly ScaleId[];

export type Phase2BScaleId = typeof phase2BScaleIds[number];

export const phase2BFormulas: Readonly<Record<Phase2BScaleId, readonly (readonly [number, number])[]>> = {
  harmonicMinor: [[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, -1], [7, 0]],
  melodicMinorAscending: [[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, 0], [7, 0]],
  majorPentatonic: [[1, 0], [2, 0], [3, 0], [5, 0], [6, 0]],
  minorPentatonic: [[1, 0], [3, -1], [4, 0], [5, 0], [7, -1]],
  minorBlues: [[1, 0], [3, -1], [4, 0], [5, -1], [5, 0], [7, -1]],
  dorian: [[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, 0], [7, -1]],
  phrygian: [[1, 0], [2, -1], [3, -1], [4, 0], [5, 0], [6, -1], [7, -1]],
  lydian: [[1, 0], [2, 0], [3, 0], [4, 1], [5, 0], [6, 0], [7, 0]],
  mixolydian: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, -1]],
  locrian: [[1, 0], [2, -1], [3, -1], [4, 0], [5, -1], [6, -1], [7, -1]],
};

export const phase2BScaleSpellings: readonly Readonly<{
  tonic: string;
  scaleId: Phase2BScaleId;
  notes: readonly string[];
}>[] = [
  { tonic: "A", scaleId: "harmonicMinor", notes: ["A", "B", "C", "D", "E", "F", "G#"] },
  { tonic: "C#", scaleId: "harmonicMinor", notes: ["C#", "D#", "E", "F#", "G#", "A", "B#"] },
  { tonic: "G#", scaleId: "harmonicMinor", notes: ["G#", "A#", "B", "C#", "D#", "E", "F##"] },
  { tonic: "A", scaleId: "melodicMinorAscending", notes: ["A", "B", "C", "D", "E", "F#", "G#"] },
  { tonic: "Ab", scaleId: "melodicMinorAscending", notes: ["Ab", "Bb", "Cb", "Db", "Eb", "F", "G"] },
  { tonic: "C", scaleId: "majorPentatonic", notes: ["C", "D", "E", "G", "A"] },
  { tonic: "F#", scaleId: "majorPentatonic", notes: ["F#", "G#", "A#", "C#", "D#"] },
  { tonic: "A", scaleId: "minorPentatonic", notes: ["A", "C", "D", "E", "G"] },
  { tonic: "Bb", scaleId: "minorPentatonic", notes: ["Bb", "Db", "Eb", "F", "Ab"] },
  { tonic: "A", scaleId: "minorBlues", notes: ["A", "C", "D", "Eb", "E", "G"] },
  { tonic: "C", scaleId: "minorBlues", notes: ["C", "Eb", "F", "Gb", "G", "Bb"] },
  { tonic: "D", scaleId: "dorian", notes: ["D", "E", "F", "G", "A", "B", "C"] },
  { tonic: "F#", scaleId: "dorian", notes: ["F#", "G#", "A", "B", "C#", "D#", "E"] },
  { tonic: "E", scaleId: "phrygian", notes: ["E", "F", "G", "A", "B", "C", "D"] },
  { tonic: "C#", scaleId: "phrygian", notes: ["C#", "D", "E", "F#", "G#", "A", "B"] },
  { tonic: "F", scaleId: "lydian", notes: ["F", "G", "A", "B", "C", "D", "E"] },
  { tonic: "D#", scaleId: "lydian", notes: ["D#", "E#", "F##", "G##", "A#", "B#", "C##"] },
  { tonic: "G", scaleId: "mixolydian", notes: ["G", "A", "B", "C", "D", "E", "F"] },
  { tonic: "Cb", scaleId: "mixolydian", notes: ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bbb"] },
  { tonic: "B", scaleId: "locrian", notes: ["B", "C", "D", "E", "F", "G", "A"] },
  { tonic: "Bb", scaleId: "locrian", notes: ["Bb", "Cb", "Db", "Eb", "Fb", "Gb", "Ab"] },
];
