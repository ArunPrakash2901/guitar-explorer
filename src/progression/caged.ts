import { buildChord } from "../engine/core/collections.js";
import { parseNote, pitchClass } from "../engine/core/pitch.js";
import type { NoteName, Scale } from "../engine/core/types.js";
import { findLocations, getNoteAt, STANDARD_FRETBOARD } from "../engine/guitar/fretboard.js";
import { getPlayableVoicings } from "./voicings.js";
import type { StringFret } from "./voicings.js";

export const CAGED_FAMILIES = ["C", "A", "G", "E", "D"] as const;
export type CagedFamily = (typeof CAGED_FAMILIES)[number];
type GripQuality = "major" | "minor" | "reference";

const windowOffsets: Readonly<Record<CagedFamily, readonly [number, number]>> = {
  C: [0, 4], A: [-1, 3], G: [-1, 4], E: [-1, 3], D: [0, 4],
};

// The two minor forms with no familiar open-chord counterpart. These reduced
// shapes keep the C and G bass locations and lower the third of the open form.
const reducedMinorForms: Partial<Record<CagedFamily, readonly StringFret[]>> = {
  C: [null, 3, 1, 0, 1, null],
  G: [3, 1, 0, 0, 3, 3],
};

export type CagedPosition = Readonly<{
  family: CagedFamily;
  fromFret: number;
  toFret: number;
  gripFrets: readonly StringFret[];
}>;

export function getCagedPosition(tonic: NoteName, family: CagedFamily, quality: GripQuality): CagedPosition {
  if (!CAGED_FAMILIES.includes(family)) throw new RangeError("Choose a CAGED form");
  const anchorRoot = parseNote(family);
  const shift = (pitchClass(tonic) - pitchClass(anchorRoot) + 12) % 12;
  const [low, high] = windowOffsets[family];
  const fromFret = Math.max(0, shift + low);
  const toFret = Math.min(STANDARD_FRETBOARD.maxFret, shift + high);
  let gripFrets: readonly StringFret[] = [];
  if (quality !== "reference") {
    const source = quality === "minor" ? reducedMinorForms[family] : undefined;
    const open = source ?? getPlayableVoicings(buildChord({ root: anchorRoot, chordId: quality }))
      .find(({ shapeFamily }) => shapeFamily === "open")?.frets;
    if (!open) throw new Error("Missing CAGED reference grip");
    gripFrets = open.map((fret) => fret === null ? null : fret + shift);
    const sounded = new Set(gripFrets.flatMap((fret, stringIndex) => {
      if (fret === null) return [];
      if (fret < fromFret || fret > toFret) throw new Error("CAGED grip exceeds its position");
      return [getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret }).pitchClass];
    }));
    const chord = buildChord({ root: tonic, chordId: quality });
    if (sounded.size !== chord.tones.length || !chord.tones.every(({ pitchClass }) => sounded.has(pitchClass))) {
      throw new Error("CAGED grip must match the tonic chord");
    }
  }
  return Object.freeze({ family, fromFret, toFret, gripFrets: Object.freeze(gripFrets) });
}

/** Ascending scale practice uses one guitar location per sounded pitch. */
export function getScalePracticeNotes(scale: Scale, position?: Pick<CagedPosition, "fromFret" | "toFret">) {
  const locations = findLocations({
    board: STANDARD_FRETBOARD,
    pitchClasses: scale.tones.map((tone) => tone.pitchClass),
    ...(position ? { fretRange: { minFret: position.fromFret, maxFret: position.toFret } } : {}),
  }).slice().sort((a, b) => a.semitone - b.semitone || a.position.fret - b.position.fret);
  return locations.filter((note, index) => note.semitone !== locations[index - 1]?.semitone)
    .map(({ position: location, semitone }) => ({ ...location, semitone }));
}
