import { describe, expect, it } from "vitest";
import { buildChord, buildScale } from "../../src/engine/core/collections.js";
import { MusicError } from "../../src/engine/core/errors.js";
import {
  describeInterval,
  getIntervalBetweenPitches,
  intervalBetweenNotes,
  invertSimpleInterval,
  negateInterval,
  transposeNote,
  transposePitch,
} from "../../src/engine/core/intervals.js";
import {
  formatNote,
  formatPitch,
  mod12,
  parseNote,
  parsePitch,
  pitchClass,
  pitchFromSemitone,
  toSemitone,
  validateNote,
  validatePitch,
} from "../../src/engine/core/pitch.js";
import type { Interval, NoteLetter, NoteName, Pitch } from "../../src/engine/core/types.js";
import { majorScales, majorTriads, spelledIntervals } from "../fixtures/music.js";

function expectInvalid(action: () => unknown): void {
  expect(action).toThrow(MusicError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code: "INVALID_INPUT" });
  }
}

describe("written and sounding pitch", () => {
  it.each([
    ["C", "C", 0], ["F#", "F#", 6], ["Bb", "Bb", 10],
    ["E#", "E#", 5], ["B#", "B#", 0], ["Cb", "Cb", 11],
    ["F##", "F##", 7], ["Bbb", "Bbb", 9],
    ["F♯", "F#", 6], ["B♭", "Bb", 10], ["F𝄪", "F##", 7], ["B𝄫", "Bbb", 9],
  ])("normalizes %s as %s with pitch class %s", (input, spelling, expected) => {
    const note = parseNote(input);
    expect(formatNote(note)).toBe(spelling);
    expect(pitchClass(note)).toBe(expected);
    expect(parseNote(formatNote(note))).toEqual(note);
  });

  it.each([
    ["C4", 60], ["A4", 69], ["E2", 40], ["E4", 64],
    ["B#3", 60], ["Cb4", 59], ["F##4", 67], ["C-1", 0],
    ["Bbb-1", 9], ["C5", 72],
  ])("locates %s at absolute semitone %s", (name, expected) => {
    const pitch = parsePitch(name);
    expect(toSemitone(pitch)).toBe(expected);
    expect(formatPitch(pitch)).toBe(name);
    expect(parsePitch(formatPitch(pitch))).toEqual(pitch);
  });

  it("retains enharmonic written identity and accidental octave crossings", () => {
    expect(parsePitch("B#3")).not.toEqual(parsePitch("C4"));
    expect(toSemitone(parsePitch("B#3"))).toBe(toSemitone(parsePitch("C4")));
    expect(toSemitone(parsePitch("Cb4"))).toBe(toSemitone(parsePitch("B3")));
    expect(toSemitone(parsePitch("C##4"))).toBe(toSemitone(parsePitch("D4")));
  });

  it("uses caller-selected spelling for unspelled semitones", () => {
    expect(formatPitch(pitchFromSemitone(61, "sharps"))).toBe("C#4");
    expect(formatPitch(pitchFromSemitone(61, "flats"))).toBe("Db4");
    expect(formatPitch(pitchFromSemitone(60))).toBe("C4");
    for (let semitone = -24; semitone <= 144; semitone += 1) {
      for (const preference of ["sharps", "flats"] as const) {
        expect(toSemitone(pitchFromSemitone(semitone, preference))).toBe(semitone);
      }
    }
  });

  it("normalizes negative chromatic offsets", () => {
    expect(mod12(-1)).toBe(11);
    expect(mod12(-12)).toBe(0);
    expect(mod12(13)).toBe(1);
  });

  it.each(["", "H", "C4", "C#b", "Bbx", "#C", "C sharp"])("rejects malformed note %j", (input) => {
    expectInvalid(() => parseNote(input));
  });

  it.each(["C", "H4", "C4.5", "CInfinity", "CNaN", "4C", "C4#"])("rejects malformed pitch %j", (input) => {
    expectInvalid(() => parsePitch(input));
  });

  it("rejects noninteger and nonfinite structured pitch values", () => {
    for (const accidental of [0.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expectInvalid(() => validateNote({ letter: "C", accidental }));
    }
    for (const octave of [0.5, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expectInvalid(() => validatePitch({ note: parseNote("C"), octave }));
    }
    expectInvalid(() => validateNote({ letter: "H", accidental: 0 } as unknown as NoteName));
    expectInvalid(() => validatePitch(null as unknown as Pitch));
    expectInvalid(() => pitchFromSemitone(60.5));
    expectInvalid(() => pitchFromSemitone(Number.NaN));
    expectInvalid(() => pitchFromSemitone(Infinity));
  });
});

describe("spelled intervals", () => {
  it.each(spelledIntervals)("identifies $from → $to", ({ from, to, steps, semitones, number, quality }) => {
    const interval = getIntervalBetweenPitches(parsePitch(from), parsePitch(to));
    expect(interval).toMatchObject({
      diatonicSteps: steps, semitones, number, quality,
      qualityMultiplicity: quality === "augmented" || quality === "diminished" ? 1 : 0,
    });
  });

  it("gives distinct explanations for six-semitone intervals", () => {
    const sharpFourth = getIntervalBetweenPitches(parsePitch("C4"), parsePitch("F#4"));
    const flatFifth = getIntervalBetweenPitches(parsePitch("C4"), parsePitch("Gb4"));
    expect(sharpFourth.label).toBe("A4");
    expect(flatFifth.label).toBe("d5");
    expect(sharpFourth.semitones).toBe(flatFifth.semitones);
  });

  it("keeps unison, octave and compound intervals distinct", () => {
    const labels = ["C4", "C5", "D5"].map((to) =>
      getIntervalBetweenPitches(parsePitch("C4"), parsePitch(to)).label);
    expect(labels).toEqual(["P1", "P8", "M9"]);
  });

  it("retains direction in both musical dimensions", () => {
    expect(getIntervalBetweenPitches(parsePitch("E4"), parsePitch("C4"))).toMatchObject({
      direction: "descending", diatonicSteps: -2, semitones: -4, quality: "major", number: 3,
    });
    expect(getIntervalBetweenPitches(parsePitch("C4"), parsePitch("C4"))).toMatchObject({ direction: "stationary" });
  });

  it.each([
    ["A", "A", 0, 0, "perfect", 1], ["A", "C", 2, 3, "minor", 3],
    ["A", "C#", 2, 4, "major", 3], ["A", "D", 3, 5, "perfect", 4],
    ["A", "E", 4, 7, "perfect", 5], ["C", "B", 6, 11, "major", 7],
    ["C#", "Db", 1, 0, "diminished", 2], ["C", "Cb", 0, -1, "diminished", 1],
    ["Cb", "C", 0, 1, "augmented", 1],
  ])("calculates ascending written note interval %s → %s", (from, to, diatonicSteps, semitones, quality, number) => {
    expect(intervalBetweenNotes(parseNote(from), parseNote(to))).toMatchObject({ diatonicSteps, semitones, quality, number });
  });

  it("transfers the major-third relationship from A to D", () => {
    const relationship = intervalBetweenNotes(parseNote("A"), parseNote("C#"));
    expect(relationship).toMatchObject({ label: "M3", diatonicSteps: 2, semitones: 4 });
    expect(formatNote(transposeNote(parseNote("D"), relationship))).toBe("F#");
    expect(formatPitch(transposePitch(parsePitch("D3"), relationship))).toBe("F#3");
  });

  it.each([
    ["P1", 0, 0, "P8"], ["m2", 1, 1, "M7"], ["M2", 1, 2, "m7"],
    ["m3", 2, 3, "M6"], ["M3", 2, 4, "m6"], ["P4", 3, 5, "P5"],
    ["A4", 3, 6, "d5"], ["d5", 4, 6, "A4"], ["P5", 4, 7, "P4"],
    ["m6", 5, 8, "M3"], ["M6", 5, 9, "m3"], ["m7", 6, 10, "M2"],
    ["M7", 6, 11, "m2"], ["P8", 7, 12, "P1"],
  ])("inverts %s into its octave complement", (label, diatonicSteps, semitones, complement) => {
    const original = describeInterval({ diatonicSteps, semitones });
    const inverted = invertSimpleInterval(original);
    expect(original.label).toBe(label);
    expect(describeInterval(inverted).label).toBe(complement);
    expect(original.number + describeInterval(inverted).number).toBe(9);
    expect(original.semitones + inverted.semitones).toBe(12);
    expect(invertSimpleInterval(inverted)).toMatchObject({ diatonicSteps, semitones });
  });

  it("requires explicit simplification of compounds and ascending inversion", () => {
    expectInvalid(() => invertSimpleInterval({ diatonicSteps: 8, semitones: 14 }));
    expectInvalid(() => invertSimpleInterval({ diatonicSteps: -2, semitones: -4 }));
  });

  it("preserves spelling and register through forward/reverse transposition over a finite domain", () => {
    const letters: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
    const relationships: readonly Interval[] = [
      { diatonicSteps: 0, semitones: 0 }, { diatonicSteps: 1, semitones: 1 },
      { diatonicSteps: 1, semitones: 2 }, { diatonicSteps: 2, semitones: 3 },
      { diatonicSteps: 2, semitones: 4 }, { diatonicSteps: 3, semitones: 5 },
      { diatonicSteps: 3, semitones: 6 }, { diatonicSteps: 4, semitones: 6 },
      { diatonicSteps: 4, semitones: 7 }, { diatonicSteps: 5, semitones: 8 },
      { diatonicSteps: 5, semitones: 9 }, { diatonicSteps: 6, semitones: 10 },
      { diatonicSteps: 6, semitones: 11 }, { diatonicSteps: 7, semitones: 12 },
      { diatonicSteps: 8, semitones: 14 },
    ];
    for (const letter of letters) {
      for (let accidental = -2; accidental <= 2; accidental += 1) {
        for (let octave = -1; octave <= 6; octave += 1) {
          const original: Pitch = { note: { letter, accidental }, octave };
          for (const ascending of relationships) {
            for (const interval of [ascending, negateInterval(ascending)]) {
              const transposed = transposePitch(original, interval);
              expect(toSemitone(transposed) - toSemitone(original)).toBe(interval.semitones);
              expect(transposePitch(transposed, negateInterval(interval))).toEqual(original);
              expect(getIntervalBetweenPitches(original, transposed)).toMatchObject(interval);
              expect(transposeNote(transposeNote(original.note, interval), negateInterval(interval))).toEqual(original.note);
            }
          }
        }
      }
    }
  });

  it("rejects noninteger and nonfinite interval displacements", () => {
    for (const value of [0.25, Number.NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expectInvalid(() => describeInterval({ diatonicSteps: value, semitones: 4 }));
      expectInvalid(() => describeInterval({ diatonicSteps: 2, semitones: value }));
      expectInvalid(() => transposePitch(parsePitch("C4"), { diatonicSteps: 2, semitones: value }));
    }
  });
});

describe("spelled collections", () => {
  it.each(majorScales)("spells $tonic major without enharmonic substitutions", ({ tonic, notes }) => {
    const scale = buildScale({ tonic: parseNote(tonic), scaleId: "major" });
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
    expect(scale.tones.map((tone) => tone.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scale.tones.map((tone) => tone.alteration)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(scale.tones.map((tone) => tone.interval.semitones)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(scale.tones.map((tone) => tone.pitchClass)).toEqual(notes.map((name) => pitchClass(parseNote(name))));
  });

  it.each([
    ["A", ["A", "B", "C", "D", "E", "F", "G"]],
    ["C#", ["C#", "D#", "E", "F#", "G#", "A", "B"]],
    ["Bb", ["Bb", "C", "Db", "Eb", "F", "Gb", "Ab"]],
  ])("spells %s natural minor and retains degree alterations", (tonic, notes) => {
    const scale = buildScale({ tonic: parseNote(tonic), scaleId: "naturalMinor" });
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
    expect(scale.tones.map((tone) => tone.alteration)).toEqual([0, 0, -1, 0, 0, -1, -1]);
    expect(scale.tones.map((tone) => tone.interval.semitones)).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it.each(majorTriads)("spells $root major triad", ({ root, notes }) => {
    const chord = buildChord({ root: parseNote(root), chordId: "major" });
    expect(chord.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
    expect(chord.tones.map((tone) => tone.degree)).toEqual([1, 3, 5]);
  });

  it.each([
    ["minor", "C", ["C", "Eb", "G"], [0, 3, 7]],
    ["minor", "F#", ["F#", "A", "C#"], [0, 3, 7]],
    ["diminished", "B", ["B", "D", "F"], [0, 3, 6]],
    ["diminished", "C", ["C", "Eb", "Gb"], [0, 3, 6]],
    ["augmented", "C", ["C", "E", "G#"], [0, 4, 8]],
    ["augmented", "F#", ["F#", "A#", "C##"], [0, 4, 8]],
  ] as const)("spells %s triad rooted at %s", (chordId, root, notes, distances) => {
    const chord = buildChord({ root: parseNote(root), chordId });
    expect(chord.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
    expect(chord.tones.map((tone) => tone.interval.semitones)).toEqual(distances);
    expect(chord.tones.map((tone) => tone.degree)).toEqual([1, 3, 5]);
  });

  it("preserves a caller's musical inputs across construction", () => {
    const tonic = Object.freeze(parseNote("C#"));
    const spec = Object.freeze({ tonic, scaleId: "major" as const });
    expect(() => buildScale(spec)).not.toThrow();
    expect(spec).toEqual({ tonic: { letter: "C", accidental: 1 }, scaleId: "major" });
  });
});
