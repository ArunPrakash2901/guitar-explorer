import { CHORD_CATALOG_METADATA } from "../engine/core/chords.js";
import type { ChordId } from "../engine/core/types.js";

export const COLOR_GROUPS = [
  { name: "7ths", ids: ["dominant7", "major7", "minor7", "minorMajor7", "dominant7Flat5", "dominant7Sharp5"] },
  { name: "Sus/add", ids: ["sus2", "sus4", "add9", "minorAdd9", "dominant7Sus4", "add11", "minorAdd11"] },
  { name: "6ths", ids: ["major6", "minor6", "major6Add9", "minor6Add9"] },
  { name: "9ths", ids: ["dominant9", "major9", "minor9", "dominant7Flat9", "dominant7Sharp9"] },
  { name: "11ths", ids: ["dominant11", "minor11", "major7Sharp11", "major11"] },
  { name: "13ths", ids: ["dominant13", "major13", "minor13"] },
  { name: "Dim/aug", ids: ["diminished", "augmented", "halfDiminished7", "diminished7", "augmentedMajor7"] },
].map(({ name, ids }) => ({ name, chords: ids.map((id) => CHORD_CATALOG_METADATA.find((entry) => entry.id === id)!) }));

// Keep selection order stable across picker layouts. The generator uses it to prefer compatible colors.
export const COLOR_IDS: readonly ChordId[] = Object.freeze([
  "major7", "dominant7", "minor7", "minorMajor7", "halfDiminished7", "dominant7Flat5", "dominant7Sharp5",
  "sus2", "sus4", "add9", "minorAdd9", "add11", "minorAdd11", "major6", "minor6", "major6Add9", "minor6Add9",
  "major9", "dominant9", "minor9", "dominant7Flat9", "dominant7Sharp9", "major11", "dominant11", "minor11",
  "major13", "dominant13", "minor13", "diminished", "diminished7", "augmented", "augmentedMajor7",
  "dominant7Sus4", "major7Sharp11",
]);
export const LEGACY_COLORS = {
  triads: [],
  sevenths: ["major7", "dominant7", "minor7", "halfDiminished7"],
  suspended: ["sus4", "sus2"],
  add9: ["add9"],
} as const satisfies Record<string, readonly ChordId[]>;

export function selectedChordColors(value: unknown): readonly ChordId[] | null {
  if (!Array.isArray(value) || value.length > COLOR_IDS.length ||
      Array.from(value).some((entry) => !COLOR_IDS.includes(entry))) return null;
  return COLOR_IDS.filter((id) => value.includes(id));
}
