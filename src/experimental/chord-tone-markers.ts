/**
 * Research-stage presentation adapter, not a Music Engine query or a playable voicing engine.
 *
 * Inputs are facts returned by the existing engine. No key, harmony, fingering,
 * rhythm, audio, or pedagogy is inferred here. This file is intentionally not
 * exported by src/engine/index.ts or connected to a browser route.
 */
import type { Chord } from "../engine/core/types.js";
import type { FretboardNote } from "../engine/query/index.js";

export type ChordToneMarker = Readonly<{
  position: Readonly<{ stringIndex: number; fret: number }>;
  noteName: string;
  pitchClass: number;
  /** Formula degrees from the supplied chord, not inferred finger numbers. */
  degrees: readonly number[];
  isRoot: boolean;
}>;

/**
 * Project precomputed chord facts onto precomputed fretboard locations.
 * Retains engine ordering, including multiple register locations for a tone.
 * All positions are candidates for highlighting, NOT a simultaneous voicing.
 */
export function toChordToneMarkers(
  chord: Chord,
  locations: readonly FretboardNote[],
): readonly ChordToneMarker[] {
  const degreesByPitchClass = new Map<number, number[]>();
  for (const tone of chord.tones) {
    const degrees = degreesByPitchClass.get(tone.pitchClass) ?? [];
    if (!degrees.includes(tone.degree)) degrees.push(tone.degree);
    degreesByPitchClass.set(tone.pitchClass, degrees);
  }

  const rootPitchClass = chord.tones[0]?.pitchClass;
  return locations.flatMap((location) => {
    const degrees = degreesByPitchClass.get(location.pitchClass);
    if (!degrees) return [];
    return [{
      position: { ...location.position },
      noteName: location.name,
      pitchClass: location.pitchClass,
      degrees: [...degrees],
      isRoot: location.pitchClass === rootPitchClass,
    }];
  });
}
