import { describe, expect, it } from "vitest";
import { parseNote, toSemitone } from "../../src/engine/core/pitch.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../../src/engine/guitar/fretboard.js";
import { ARPEGGIO_QUALITIES, arpeggioEvents, arpeggioMaterial } from "../../src/progression/arpeggios.js";
import { CAGED_FAMILIES } from "../../src/progression/caged.js";

describe("CAGED arpeggio practice", () => {
  it.each(ARPEGGIO_QUALITIES)("finds guitar-aware %s paths in every position", (quality) => {
    for (const name of ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]) {
      for (const family of CAGED_FAMILIES) {
        const root = parseNote(name);
        const { chord, position, path } = arpeggioMaterial(root, quality, family, false);
        expect(new Set(path.map((note) => note.tone.degree))).toEqual(new Set(chord.tones.map((tone) => tone.degree)));
        path.forEach((note, index) => {
          expect(note.fret).toBeGreaterThanOrEqual(position.fromFret);
          expect(note.fret).toBeLessThanOrEqual(position.toFret);
          expect(toSemitone(note.pitch)).toBe(note.semitone);
          expect(getNoteAt(STANDARD_FRETBOARD, { stringIndex: note.stringIndex, fret: note.fret }).semitone).toBe(note.semitone);
          if (!index) return;
          expect(note.semitone).toBeGreaterThan(path[index - 1]!.semitone);
          expect(note.stringIndex - path[index - 1]!.stringIndex).toBeGreaterThanOrEqual(0);
          expect(note.stringIndex - path[index - 1]!.stringIndex).toBeLessThanOrEqual(2);
        });
        const octave = arpeggioMaterial(root, quality, family, true);
        if (octave.octaveAvailable) {
          expect(octave.path[0]!.tone.degree).toBe(1);
          expect(octave.path.at(-1)!.semitone - octave.path[0]!.semitone).toBe(12);
          expect(octave.path).toHaveLength(chord.tones.length + 1);
        } else expect(octave.path).toHaveLength(0);
      }
    }
  });

  it("preserves exact rhythm, physical positions and turnaround endpoints", () => {
    const { path } = arpeggioMaterial(parseNote("C"), "dominant7", "A", true);
    const up = arpeggioEvents(path, "up", "quarter");
    const down = arpeggioEvents(path, "down", "eighth");
    expect(up.map((event) => event.notes[0])).toEqual(path);
    expect(down.map((event) => event.notes[0])).toEqual([...path].reverse());
    const both = arpeggioEvents(path, "both", "triplet");
    expect(both.map(({ notes: [note] }) => note)).toEqual([...path, ...path.slice(0, -1).reverse()]);
    expect(both[4]?.onset).toEqual({ numerator: 4, denominator: 3 });
    expect(both[4]?.duration).toEqual({ numerator: 1, denominator: 3 });
    const loop = arpeggioEvents(path, "both", "sixteenth", true);
    expect(loop).toHaveLength(both.length - 1);
    expect(loop.at(-1)!.notes[0]).not.toBe(loop[0]!.notes[0]);
  });
});
