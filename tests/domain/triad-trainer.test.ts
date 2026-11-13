import { describe, expect, it } from "vitest";
import { buildChord } from "../../src/engine/core/collections.js";
import { formatNote, parseNote, toSemitone } from "../../src/engine/core/pitch.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../../src/engine/guitar/fretboard.js";
import { STRING_SETS, TRIAD_QUALITIES, triadShapes } from "../../src/progression/triads.js";
import { chordDiagramModel } from "../../src/progression/voicings.js";

describe("adjacent-string triad shapes", () => {
  const roots = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  it.each(TRIAD_QUALITIES)("validates every root and string set for %s", (quality) => {
    for (const root of roots.map(parseNote)) {
      for (const set of STRING_SETS) {
        const { chord, shapes } = triadShapes(root, quality, set);
        expect(shapes.length).toBeGreaterThanOrEqual(2);
        expect(shapes.length).toBeLessThanOrEqual(4);
        expect(new Set(shapes.map(({ id }) => id)).size).toBe(shapes.length);
        expect(shapes.map(({ position }) => position)).toEqual(shapes.map(({ position }) => position).sort((a, b) => a - b));
        for (const shape of shapes) {
          const pitches = shape.notes.map((note) => {
            const actual = getNoteAt(STANDARD_FRETBOARD, { stringIndex: note.stringIndex, fret: note.fret });
            expect(actual.semitone).toBe(note.semitone);
            expect(toSemitone(note.pitch)).toBe(note.semitone);
            expect(actual.pitchClass).toBe(note.tone.pitchClass);
            return actual.pitchClass;
          });
          expect(new Set(pitches)).toEqual(new Set(chord.tones.map(({ pitchClass }) => pitchClass)));
          expect(shape.notes.map(({ stringIndex }) => stringIndex)).toEqual([4 - set, 5 - set, 6 - set]);
          expect(chord.tones[shape.inversion]!.pitchClass).toBe(pitches[0]);
          expect(shape.span).toBeLessThanOrEqual(3);
          expect(chordDiagramModel(shape.voicing).strings.filter(({ state }) => state !== "muted")).toHaveLength(3);
        }
      }
    }
  });

  it("preserves the raised spelling and three diminished tones", () => {
    expect(triadShapes(parseNote("C#"), "major", 1).chord.tones.map(({ note }) => formatNote(note))).toEqual(["C#", "E#", "G#"]);
    expect(triadShapes(parseNote("G#"), "major", 1).chord.tones.map(({ note }) => formatNote(note))).toEqual(["G#", "B#", "D#"]);
    expect(buildChord({ root: parseNote("A"), chordId: "diminished" }).tones.map(({ note }) => formatNote(note))).toEqual(["A", "C", "Eb"]);
  });

  it("keeps theoretical inversions for the symmetric augmented chord", () => {
    const { shapes } = triadShapes(parseNote("C"), "augmented", 1);
    expect(shapes).toHaveLength(4);
    expect(new Set(shapes.map(({ inversion }) => inversion))).toEqual(new Set([0, 1, 2]));
  });
});
