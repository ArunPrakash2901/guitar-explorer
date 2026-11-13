import { CHORD_CATALOG_METADATA } from "../engine/core/chords.js";
import type { ChordId } from "../engine/core/types.js";

export const COLOR_GROUPS = [
  { name: "7ths", ids: ["major7", "dominant7", "minor7", "minorMajor7", "halfDiminished7", "dominant7Flat5", "dominant7Sharp5"] },
  { name: "Sus/add", ids: ["sus2", "sus4", "add9", "minorAdd9", "add11", "minorAdd11"] },
  { name: "6ths", ids: ["major6", "minor6", "major6Add9", "minor6Add9"] },
  { name: "9ths", ids: ["major9", "dominant9", "minor9", "dominant7Flat9", "dominant7Sharp9"] },
  { name: "11ths", ids: ["major11", "dominant11", "minor11"] },
  { name: "13ths", ids: ["major13", "dominant13", "minor13"] },
  { name: "Dim/aug", ids: ["diminished", "diminished7", "augmented", "augmentedMajor7"] },
].map(({ name, ids }) => ({ name, chords: ids.map((id) => CHORD_CATALOG_METADATA.find((entry) => entry.id === id)!) }));

export const COLOR_IDS: readonly ChordId[] = Object.freeze(COLOR_GROUPS.flatMap(({ chords }) => chords.map(({ id }) => id)));
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
