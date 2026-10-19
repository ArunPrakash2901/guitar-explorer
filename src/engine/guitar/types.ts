import type { Pitch, PitchClass } from "../core/types.js";

/** Array order is physical string order; standard tuning runs low E to high E. */
export type Tuning = Readonly<{
  id: string;
  openStrings: readonly Pitch[];
}>;

/** Zero-based string index into tuning.openStrings. Fret zero is the open string. */
export type FretPosition = Readonly<{ stringIndex: number; fret: number }>;
/** Both bounds are inclusive. */
export type FretRange = Readonly<{ minFret: number; maxFret: number }>;
export type Fretboard = Readonly<{ tuning: Tuning; maxFret: number }>;

/** Sounding identity only: fret geometry does not select an enharmonic spelling. */
export type LocatedPitch = Readonly<{
  position: FretPosition;
  semitone: number;
  pitchClass: PitchClass;
}>;

export type FindLocationsRequest = Readonly<{
  board: Fretboard;
  fretRange?: FretRange;
  stringIndices?: readonly number[];
  pitchClasses?: readonly PitchClass[];
}>;
