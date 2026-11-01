import { parsePitch } from "../../src/engine/core/pitch.js";
import type { Phrase, PhraseContourDirection } from "../../src/engine/core/phrase.js";
import type { MusicalTime } from "../../src/engine/core/time.js";
import type { FretPosition } from "../../src/engine/guitar/types.js";

// Authored values/expectations from the approved handoff, not derived by Phrase APIs.
export const q = (numerator: number, denominator = 1): MusicalTime => ({ numerator, denominator });

/** “Held G, changing chord”: the pure phrase portion of the two-PR proof. */
export const PROOF_PHRASE: Phrase = {
  duration: q(4),
  events: [
    { pitch: parsePitch("D4"), onset: q(0), duration: q(1, 3) },
    { pitch: parsePitch("F4"), onset: q(1, 3), duration: q(1, 3) },
    { pitch: parsePitch("E4"), onset: q(2, 3), duration: q(1, 3) },
    { pitch: parsePitch("G4"), onset: q(1), duration: q(3, 2) },
    { pitch: parsePitch("G4"), onset: q(3), duration: q(1, 2) },
    { pitch: parsePitch("C5"), onset: q(7, 2), duration: q(1, 4) },
  ],
};
export const PROOF_INTERVALS = [
  { diatonicSteps: 2, semitones: 3 },
  { diatonicSteps: -1, semitones: -1 },
  { diatonicSteps: 2, semitones: 3 },
  { diatonicSteps: 0, semitones: 0 },
  { diatonicSteps: 3, semitones: 5 },
] as const;
export const PROOF_CONTOUR: readonly PhraseContourDirection[] = [
  "ascending", "descending", "ascending", "stationary", "ascending",
];
export const PROOF_UP_M2: Phrase = {
  duration: q(4),
  events: [
    { pitch: parsePitch("E4"), onset: q(0), duration: q(1, 3) },
    { pitch: parsePitch("G4"), onset: q(1, 3), duration: q(1, 3) },
    { pitch: parsePitch("F#4"), onset: q(2, 3), duration: q(1, 3) },
    { pitch: parsePitch("A4"), onset: q(1), duration: q(3, 2) },
    { pitch: parsePitch("A4"), onset: q(3), duration: q(1, 2) },
    { pitch: parsePitch("D5"), onset: q(7, 2), duration: q(1, 4) },
  ],
};
export const PROOF_CONTOUR_ALTERNATIVE: Phrase = {
  ...PROOF_PHRASE,
  events: PROOF_PHRASE.events.map((event, index) => ({
    ...event, pitch: parsePitch(["D4", "F#4", "E4", "A4", "A4", "D5"][index]!),
  })),
};
export const PROOF_CROP = { onset: q(1, 2), duration: q(11, 4) };
export const PROOF_FRAGMENT = {
  phrase: {
    duration: q(11, 4),
    events: [
      { pitch: parsePitch("F4"), onset: q(0), duration: q(1, 6) },
      { pitch: parsePitch("E4"), onset: q(1, 6), duration: q(1, 3) },
      { pitch: parsePitch("G4"), onset: q(1, 2), duration: q(3, 2) },
      { pitch: parsePitch("G4"), onset: q(5, 2), duration: q(1, 4) },
    ],
  },
  sourceEventIndices: [1, 2, 3, 4],
  clippedAtStart: true,
  clippedAtEnd: true,
};

// External placement sidecars: zero-based engine string indices, low E first.
export const PROOF_PLACEMENTS: readonly (readonly FretPosition[])[] = [
  [
    { stringIndex: 4, fret: 3 }, { stringIndex: 4, fret: 6 }, { stringIndex: 4, fret: 5 },
    { stringIndex: 5, fret: 3 }, { stringIndex: 5, fret: 3 }, { stringIndex: 5, fret: 8 },
  ],
  [
    { stringIndex: 3, fret: 7 }, { stringIndex: 3, fret: 10 }, { stringIndex: 3, fret: 9 },
    { stringIndex: 4, fret: 8 }, { stringIndex: 4, fret: 8 }, { stringIndex: 5, fret: 8 },
  ],
];
