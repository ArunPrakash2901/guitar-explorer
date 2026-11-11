import { describe, expect, it } from "vitest";
import { buildChord } from "../../src/engine/core/collections.js";
import { parseNote, pitchClass } from "../../src/engine/core/pitch.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../../src/engine/guitar/fretboard.js";
import { chordDiagramModel, getPlayableVoicings } from "../../src/progression/voicings.js";
import type { Chord } from "../../src/engine/core/types.js";
import type { GuitarVoicing } from "../../src/progression/voicings.js";

function chord(root: string, chordId: Chord["chordId"]): Chord {
  return buildChord({ root: parseNote(root), chordId });
}

function shape(root: string, quality: "major" | "minor", frets: readonly (number | null)[]): GuitarVoicing {
  const found = getPlayableVoicings(chord(root, quality)).find((voicing) =>
    JSON.stringify(voicing.frets) === JSON.stringify(frets));
  if (!found) throw new Error("Missing shape " + root + ":" + quality + " " + JSON.stringify(frets));
  return found;
}

describe("engine-validated guitar chord grips", () => {
  it("produces concrete shapes for D-flat Mixolydian reference chords", () => {
    const db = shape("Db", "major", [null, 4, 6, 6, 6, 4]);
    const abm = shape("Ab", "minor", [4, 6, 6, 4, 4, 4]);
    const gb = shape("Gb", "major", [2, 4, 4, 3, 2, 2]);
    expect(db.shapeFamily).toBe("a-barre");
    expect(abm.shapeFamily).toBe("e-barre");
    expect(gb.shapeFamily).toBe("e-barre");
  });

  it.each([
    ["C", "major", [null, 3, 2, 0, 1, 0]],
    ["G", "major", [3, 2, 0, 0, 0, 3]],
    ["D", "major", [null, null, 0, 2, 3, 2]],
    ["A", "major", [null, 0, 2, 2, 2, 0]],
    ["E", "major", [0, 2, 2, 1, 0, 0]],
    ["A", "minor", [null, 0, 2, 2, 1, 0]],
    ["D", "minor", [null, null, 0, 2, 3, 1]],
    ["E", "minor", [0, 2, 2, 0, 0, 0]],
  ] as const)("includes the familiar open %s %s grip", (root, quality, frets) => {
    expect(shape(root, quality, frets).shapeFamily).toBe("open");
  });

  it("all emitted grips sound precisely the supplied Core chord pitch classes", () => {
    const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    for (const root of roots) {
      for (const quality of ["major", "minor"] as const) {
        const source = chord(root, quality);
        const target = new Set(source.tones.map((tone) => tone.pitchClass));
        const voicings = getPlayableVoicings(source);
        expect(voicings.length).toBeGreaterThan(0);
        for (const voicing of voicings) {
          const notes = voicing.frets.flatMap((fret, stringIndex) =>
            fret === null ? [] : [getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret })]);
          expect(notes[0]!.pitchClass).toBe(pitchClass(source.root));
          expect(new Set(notes.map(({ pitchClass: value }) => value))).toEqual(target);
          expect(notes.every(({ pitchClass: value }) => target.has(value))).toBe(true);
          expect(voicing.notes.map((note) => note.pitchClass)).toEqual(notes.map(({ pitchClass: value }) => value));
          expect(voicing.highestFret).toBeLessThanOrEqual(STANDARD_FRETBOARD.maxFret);
        }
      }
    }
  });

  it("refuses unsupported chord families instead of rendering a false voicing", () => {
    expect(getPlayableVoicings(chord("C", "dominant7"))).toEqual([]);
    expect(getPlayableVoicings(chord("F", "diminished"))).toEqual([]);
  });

  it("returns stable, immutable voicing IDs and models", () => {
    const first = getPlayableVoicings(chord("Db", "major"));
    const second = getPlayableVoicings(chord("Db", "major"));
    expect(first).toEqual(second);
    expect(new Set(first.map(({ id }) => id)).size).toBe(first.length);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every((item) => Object.isFrozen(item) && Object.isFrozen(item.frets) && Object.isFrozen(item.notes))).toBe(true);
  });

  it("creates a four-fret diagram with muted and open-string markers", () => {
    const c = chordDiagramModel(shape("C", "major", [null, 3, 2, 0, 1, 0]));
    expect(c.baseFret).toBe(1);
    expect(c.strings.map((string) => string.state)).toEqual(["muted", "fretted", "fretted", "open", "fretted", "open"]);
    expect(c.strings.map((string) => string.diagramRow)).toEqual([null, 3, 2, null, 1, null]);
    const g = chordDiagramModel(shape("G", "major", [3, 2, 0, 0, 0, 3]));
    expect(g.baseFret).toBe(1);
  });

  it("uses a higher base fret for movable barre grips", () => {
    const result = chordDiagramModel(shape("Db", "major", [null, 4, 6, 6, 6, 4]));
    expect(result.baseFret).toBe(4);
    expect(result.strings[0]!.state).toBe("muted");
    expect(result.strings[1]!.diagramRow).toBe(1);
    expect(result.strings[2]!.diagramRow).toBe(3);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
