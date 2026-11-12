import { describe, expect, it } from "vitest";
import { buildChord, buildScale } from "../../src/engine/core/collections.js";
import { parseNote, pitchClass } from "../../src/engine/core/pitch.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../../src/engine/guitar/fretboard.js";
import { CAGED_FAMILIES, getCagedPosition, getScalePracticeNotes } from "../../src/progression/caged.js";

const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

describe("guitar CAGED positions", () => {
  it.each(roots)("uses playable geometry for all five major and minor forms of %s", (name) => {
    const tonic = parseNote(name);
    for (const quality of ["major", "minor"] as const) {
      const chord = buildChord({ root: tonic, chordId: quality });
      const pentatonic = buildScale({ tonic, scaleId: quality === "major" ? "majorPentatonic" : "minorPentatonic" });
      const scale = new Set(pentatonic.tones.map(({ pitchClass }) => pitchClass));
      const positions = CAGED_FAMILIES.map((family) => getCagedPosition(tonic, family, quality));
      expect(new Set(positions.map(({ fromFret, toFret }) => fromFret + ":" + toFret)).size).toBe(5);
      for (const { fromFret, toFret, gripFrets } of positions) {
        expect(fromFret).toBeGreaterThanOrEqual(0);
        expect(toFret).toBeLessThanOrEqual(STANDARD_FRETBOARD.maxFret);
        expect(toFret - fromFret).toBeLessThanOrEqual(5);
        const sounded = gripFrets.flatMap((fret, stringIndex) => {
          if (fret === null) return [];
          expect(fret).toBeGreaterThanOrEqual(fromFret);
          expect(fret).toBeLessThanOrEqual(toFret);
          return [getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret }).pitchClass];
        });
        expect(sounded).toContain(pitchClass(tonic));
        expect(sounded.every((value) => scale.has(value))).toBe(true);
        expect(new Set(sounded)).toEqual(new Set(chord.tones.map(({ pitchClass }) => pitchClass)));
      }
    }
  });

  it("transposes familiar open shapes and keeps enharmonic positions equal", () => {
    expect(getCagedPosition(parseNote("C"), "C", "major").gripFrets).toEqual([null, 3, 2, 0, 1, 0]);
    expect(getCagedPosition(parseNote("C"), "A", "major").gripFrets).toEqual([null, 3, 5, 5, 5, 3]);
    expect(getCagedPosition(parseNote("F#"), "E", "minor")).toEqual(getCagedPosition(parseNote("Gb"), "E", "minor"));
    expect(getCagedPosition(parseNote("Cb"), "G", "major")).toEqual(getCagedPosition(parseNote("B"), "G", "major"));
  });

  it("returns ascending unique sounded pitches from the selected form or the full guitar", () => {
    const tonic = parseNote("Db");
    const scale = buildScale({ tonic, scaleId: "mixolydian" });
    const position = getCagedPosition(tonic, "E", "major");
    const notes = getScalePracticeNotes(scale, position);
    expect(notes.length).toBeGreaterThan(6);
    const full = getScalePracticeNotes(scale);
    expect(full.length).toBeGreaterThan(notes.length);
    expect(full.some(({ fret }) => fret < position.fromFret)).toBe(true);
    for (const [index, note] of notes.entries()) {
      expect(note.fret).toBeGreaterThanOrEqual(position.fromFret);
      expect(note.fret).toBeLessThanOrEqual(position.toFret);
      const found = getNoteAt(STANDARD_FRETBOARD, note);
      expect(found.semitone).toBe(note.semitone);
      expect(scale.tones.some((tone) => tone.pitchClass === found.pitchClass)).toBe(true);
      if (index) expect(note.semitone).toBeGreaterThan(notes[index - 1]!.semitone);
    }
  });

  it("can show a modal reference window without claiming a tonic triad grip", () => {
    const { fromFret, toFret, gripFrets } = getCagedPosition(parseNote("B"), "D", "reference");
    expect([fromFret, toFret]).toEqual([9, 13]);
    expect(gripFrets).toEqual([]);
  });
});
