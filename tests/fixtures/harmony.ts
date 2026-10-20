import type { ChordId, Key } from "../../src/engine/core/types.js";

/** Independent written references; no production harmonization logic builds these. */
export type HarmonyChordFixture = readonly [quality: ChordId, roman: string, notes: string];
type HarmonyFixture = Readonly<{
  tonic: string;
  mode: Key["mode"];
  triads: readonly HarmonyChordFixture[];
  sevenths: readonly HarmonyChordFixture[];
}>;

export const harmonyFixtures = [
  {
    tonic: "C", mode: "major",
    triads: [
      ["major", "I", "C E G"], ["minor", "ii", "D F A"],
      ["minor", "iii", "E G B"], ["major", "IV", "F A C"],
      ["major", "V", "G B D"], ["minor", "vi", "A C E"],
      ["diminished", "vii°", "B D F"],
    ],
    sevenths: [
      ["major7", "Imaj7", "C E G B"], ["minor7", "ii7", "D F A C"],
      ["minor7", "iii7", "E G B D"], ["major7", "IVmaj7", "F A C E"],
      ["dominant7", "V7", "G B D F"], ["minor7", "vi7", "A C E G"],
      ["halfDiminished7", "viiø7", "B D F A"],
    ],
  },
  {
    tonic: "A", mode: "minor",
    triads: [
      ["minor", "i", "A C E"], ["diminished", "ii°", "B D F"],
      ["major", "III", "C E G"], ["minor", "iv", "D F A"],
      ["minor", "v", "E G B"], ["major", "VI", "F A C"],
      ["major", "VII", "G B D"],
    ],
    sevenths: [
      ["minor7", "i7", "A C E G"], ["halfDiminished7", "iiø7", "B D F A"],
      ["major7", "IIImaj7", "C E G B"], ["minor7", "iv7", "D F A C"],
      ["minor7", "v7", "E G B D"], ["major7", "VImaj7", "F A C E"],
      ["dominant7", "VII7", "G B D F"],
    ],
  },
  {
    tonic: "F#", mode: "major",
    triads: [
      ["major", "I", "F# A# C#"], ["minor", "ii", "G# B D#"],
      ["minor", "iii", "A# C# E#"], ["major", "IV", "B D# F#"],
      ["major", "V", "C# E# G#"], ["minor", "vi", "D# F# A#"],
      ["diminished", "vii°", "E# G# B"],
    ],
    sevenths: [
      ["major7", "Imaj7", "F# A# C# E#"], ["minor7", "ii7", "G# B D# F#"],
      ["minor7", "iii7", "A# C# E# G#"], ["major7", "IVmaj7", "B D# F# A#"],
      ["dominant7", "V7", "C# E# G# B"], ["minor7", "vi7", "D# F# A# C#"],
      ["halfDiminished7", "viiø7", "E# G# B D#"],
    ],
  },
  {
    tonic: "Eb", mode: "major",
    triads: [
      ["major", "I", "Eb G Bb"], ["minor", "ii", "F Ab C"],
      ["minor", "iii", "G Bb D"], ["major", "IV", "Ab C Eb"],
      ["major", "V", "Bb D F"], ["minor", "vi", "C Eb G"],
      ["diminished", "vii°", "D F Ab"],
    ],
    sevenths: [
      ["major7", "Imaj7", "Eb G Bb D"], ["minor7", "ii7", "F Ab C Eb"],
      ["minor7", "iii7", "G Bb D F"], ["major7", "IVmaj7", "Ab C Eb G"],
      ["dominant7", "V7", "Bb D F Ab"], ["minor7", "vi7", "C Eb G Bb"],
      ["halfDiminished7", "viiø7", "D F Ab C"],
    ],
  },
  {
    tonic: "C#", mode: "minor",
    triads: [
      ["minor", "i", "C# E G#"], ["diminished", "ii°", "D# F# A"],
      ["major", "III", "E G# B"], ["minor", "iv", "F# A C#"],
      ["minor", "v", "G# B D#"], ["major", "VI", "A C# E"],
      ["major", "VII", "B D# F#"],
    ],
    sevenths: [
      ["minor7", "i7", "C# E G# B"], ["halfDiminished7", "iiø7", "D# F# A C#"],
      ["major7", "IIImaj7", "E G# B D#"], ["minor7", "iv7", "F# A C# E"],
      ["minor7", "v7", "G# B D# F#"], ["major7", "VImaj7", "A C# E G#"],
      ["dominant7", "VII7", "B D# F# A"],
    ],
  },
  {
    tonic: "Bb", mode: "minor",
    triads: [
      ["minor", "i", "Bb Db F"], ["diminished", "ii°", "C Eb Gb"],
      ["major", "III", "Db F Ab"], ["minor", "iv", "Eb Gb Bb"],
      ["minor", "v", "F Ab C"], ["major", "VI", "Gb Bb Db"],
      ["major", "VII", "Ab C Eb"],
    ],
    sevenths: [
      ["minor7", "i7", "Bb Db F Ab"], ["halfDiminished7", "iiø7", "C Eb Gb Bb"],
      ["major7", "IIImaj7", "Db F Ab C"], ["minor7", "iv7", "Eb Gb Bb Db"],
      ["minor7", "v7", "F Ab C Eb"], ["major7", "VImaj7", "Gb Bb Db F"],
      ["dominant7", "VII7", "Ab C Eb Gb"],
    ],
  },
] as const satisfies readonly HarmonyFixture[];
