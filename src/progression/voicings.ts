import { formatNote, pitchClass } from "../engine/core/pitch.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../engine/guitar/fretboard.js";
import type { Chord, PitchClass } from "../engine/core/types.js";

/**
 * Small, explicitly bounded standard-tuning guitar vocabulary. A chord's
 * identity comes from the existing Music Core; this consumer only selects and
 * validates concrete string/fret positions. No generic fingering solver yet.
 */
export type GuitarShapeFamily = "open" | "e-barre" | "a-barre";
export type StringFret = number | null; // null = muted, zero = open

export type GuitarVoicingNote = Readonly<{
  stringIndex: number;
  fret: number;
  semitone: number;
  pitchClass: PitchClass;
}>;

export type GuitarVoicing = Readonly<{
  id: string;
  shapeFamily: GuitarShapeFamily;
  frets: readonly StringFret[]; // Six strings, low E to high E
  notes: readonly GuitarVoicingNote[];
  lowestFret: number;
  highestFret: number;
}>;

export type DiagramString = Readonly<{
  stringIndex: number;
  fret: StringFret;
  state: "muted" | "open" | "fretted";
  diagramRow: number | null; // 1 through 4 for a fretted position
}>;

export type ChordDiagramModel = Readonly<{
  baseFret: number;
  fretCount: 4;
  strings: readonly DiagramString[];
}>;

type ShapeDefinition = Readonly<{
  family: GuitarShapeFamily;
  frets: readonly StringFret[];
}>;

const OPEN_SHAPES: Readonly<Record<string, readonly StringFret[]>> = Object.freeze({
  "C:major": Object.freeze([null, 3, 2, 0, 1, 0]),
  "A:major": Object.freeze([null, 0, 2, 2, 2, 0]),
  "G:major": Object.freeze([3, 2, 0, 0, 0, 3]),
  "E:major": Object.freeze([0, 2, 2, 1, 0, 0]),
  "D:major": Object.freeze([null, null, 0, 2, 3, 2]),
  "A:minor": Object.freeze([null, 0, 2, 2, 1, 0]),
  "E:minor": Object.freeze([0, 2, 2, 0, 0, 0]),
  "D:minor": Object.freeze([null, null, 0, 2, 3, 1]),
});

function construct(chord: Chord, candidate: ShapeDefinition): GuitarVoicing | null {
  const frets = candidate.frets;
  if (frets.length !== 6) return null;
  const notes: GuitarVoicingNote[] = [];
  const expected = new Set(chord.tones.map(({ pitchClass: value }) => value));
  const found = new Set<PitchClass>();

  for (let stringIndex = 0; stringIndex < frets.length; stringIndex += 1) {
    const fret = frets[stringIndex];
    if (fret === null) continue;
    if (fret === undefined || !Number.isInteger(fret) || fret < 0 || fret > STANDARD_FRETBOARD.maxFret) return null;
    const location = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
    if (!expected.has(location.pitchClass)) return null;
    found.add(location.pitchClass);
    notes.push(Object.freeze({ stringIndex, fret, semitone: location.semitone, pitchClass: location.pitchClass }));
  }

  // Every triad member, including its third, must sound. The lowest sounded
  // string must sound the explicitly requested root; inversions come later.
  if (notes.length < 3 || found.size !== expected.size || ![...expected].every((value) => found.has(value))) return null;
  if (notes[0]!.pitchClass !== pitchClass(chord.root)) return null;

  const soundingFrets = notes.filter(({ fret }) => fret > 0).map(({ fret }) => fret);
  const lowestFret = soundingFrets.length ? Math.min(...soundingFrets) : 0;
  const highestFret = soundingFrets.length ? Math.max(...soundingFrets) : 0;

  return Object.freeze({
    id: [
      formatNote(chord.root), chord.chordId, candidate.family,
      frets.map((fret) => fret === null ? "x" : String(fret)).join("-"),
    ].join(":"),
    shapeFamily: candidate.family,
    frets: Object.freeze([...frets]),
    notes: Object.freeze(notes),
    lowestFret,
    highestFret,
  });
}

/**
 * Returns engine-validated open and root-position E/A-shape barre grips.
 * Major/minor triads only, standard tuning, frets 0..15.
 * Missing coverage is explicit (empty array), never a misleading diagram.
 */
export function getPlayableVoicings(chord: Chord): readonly GuitarVoicing[] {
  if (chord.chordId !== "major" && chord.chordId !== "minor") return Object.freeze([]);
  const definitions: ShapeDefinition[] = [];
  const open = OPEN_SHAPES[formatNote(chord.root) + ":" + chord.chordId];
  if (open) definitions.push({ family: "open", frets: open });

  const rootClass = pitchClass(chord.root);
  // Fret 1..12 gives each pitch class one E-shape and one A-shape root,
  // with all of their stopped notes inside the engine's 15-fret board.
  for (let fret = 1; fret <= 12; fret += 1) {
    if (getNoteAt(STANDARD_FRETBOARD, { stringIndex: 0, fret }).pitchClass === rootClass) {
      definitions.push({
        family: "e-barre",
        frets: chord.chordId === "major"
          ? [fret, fret + 2, fret + 2, fret + 1, fret, fret]
          : [fret, fret + 2, fret + 2, fret, fret, fret],
      });
    }
    if (getNoteAt(STANDARD_FRETBOARD, { stringIndex: 1, fret }).pitchClass === rootClass) {
      definitions.push({
        family: "a-barre",
        frets: chord.chordId === "major"
          ? [null, fret, fret + 2, fret + 2, fret + 2, fret]
          : [null, fret, fret + 2, fret + 2, fret + 1, fret],
      });
    }
  }

  return Object.freeze(definitions
    .map((definition) => construct(chord, definition))
    .filter((voicing): voicing is GuitarVoicing => voicing !== null));
}

/**
 * Pure visual model: this is not a source of chord theory or finger numbers.
 * A browser renderer can use its rows to draw an accessible SVG diagram.
 */
export function chordDiagramModel(voicing: GuitarVoicing): ChordDiagramModel {
  const baseFret = voicing.shapeFamily === "open" ? 1 : voicing.lowestFret > 1 ? voicing.lowestFret : 1;
  if (voicing.highestFret > baseFret + 3) throw new RangeError("A voicing exceeds the four-fret diagram window");
  const strings = voicing.frets.map((fret, stringIndex): DiagramString => Object.freeze({
    stringIndex,
    fret,
    state: fret === null ? "muted" : fret === 0 ? "open" : "fretted",
    diagramRow: fret === null || fret === 0 ? null : fret - baseFret + 1,
  }));
  return Object.freeze({ baseFret, fretCount: 4, strings: Object.freeze(strings) });
}
