import { describe, expect, it } from "vitest";
import { MusicError } from "../../src/engine/core/errors.js";
import type { ErrorCode } from "../../src/engine/core/errors.js";
import type { NoteLetter, Pitch } from "../../src/engine/core/types.js";
import {
  MAX_ENUMERATED_LOCATIONS,
  STANDARD_FRETBOARD,
  STANDARD_TUNING,
  findLocations,
  getNoteAt,
  validateFretboard,
  validatePosition,
  validateTuning,
} from "../../src/engine/guitar/index.js";
import type {
  FindLocationsRequest,
  Fretboard,
  FretPosition,
  Tuning,
} from "../../src/engine/guitar/index.js";

function pitch(letter: NoteLetter, octave: number, accidental = 0): Pitch {
  return { note: { letter, accidental }, octave };
}

function expectError(run: () => unknown, code: ErrorCode = "INVALID_INPUT"): void {
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(MusicError);
  expect((thrown as MusicError).code).toBe(code);
}

describe("fretboard sounding pitches", () => {
  it("defines standard tuning with register, low E through high E", () => {
    expect(STANDARD_TUNING.openStrings).toEqual([
      pitch("E", 2), pitch("A", 2), pitch("D", 3),
      pitch("G", 3), pitch("B", 3), pitch("E", 4),
    ]);
    expect(STANDARD_FRETBOARD.maxFret).toBe(15);
    expect(findLocations({ board: STANDARD_FRETBOARD })).toHaveLength(96);
  });

  it.each([
    [0, 0, 40, 4],
    [0, 5, 45, 9],
    [1, 3, 48, 0],
    [2, 7, 57, 9],
    [3, 6, 61, 1],
    [4, 1, 60, 0],
    [5, 12, 76, 4],
  ])("calculates string %i fret %i without choosing a spelling", (stringIndex, fret, semitone, pitchClass) => {
    expect(getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret })).toEqual({
      position: { stringIndex, fret }, semitone, pitchClass,
    });
  });

  it("preserves pitch class and adds an octave after twelve frets on every string", () => {
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      const open = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret: 0 });
      const octave = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret: 12 });
      expect(octave.semitone - open.semitone).toBe(12);
      expect(octave.pitchClass).toBe(open.pitchClass);
    }
  });

  it("moves one sounding semitone at each successive fret", () => {
    for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
      for (let fret = 0; fret < 15; fret += 1) {
        const current = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
        const next = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret: fret + 1 });
        expect(next.semitone).toBe(current.semitone + 1);
        expect(next.pitchClass).toBe((current.pitchClass + 1) % 12);
      }
    }
  });

  it("supports Drop D without changing the other strings", () => {
    const board: Fretboard = {
      tuning: { id: "drop-d", openStrings: [pitch("D", 2), ...STANDARD_TUNING.openStrings.slice(1)] },
      maxFret: 24,
    };
    expect(getNoteAt(board, { stringIndex: 0, fret: 0 }).semitone).toBe(38);
    expect(getNoteAt(board, { stringIndex: 0, fret: 2 }).semitone).toBe(40);
    for (let stringIndex = 1; stringIndex < 6; stringIndex += 1) {
      expect(getNoteAt(board, { stringIndex, fret: 3 }))
        .toEqual(getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret: 3 }));
    }
  });

  it("preserves reentrant string order and supports non-six-string instruments", () => {
    const board: Fretboard = {
      tuning: { id: "reentrant", openStrings: [pitch("G", 4), pitch("C", 4), pitch("E", 4), pitch("A", 4)] },
      maxFret: 0,
    };
    expect(findLocations({ board }).map((location) => location.semitone)).toEqual([67, 60, 64, 69]);
    expect(findLocations({ board }).map((location) => location.position.stringIndex)).toEqual([0, 1, 2, 3]);
  });

  it("supports a one-string board and safe pitches outside MIDI device range", () => {
    const board: Fretboard = { tuning: { id: "single", openStrings: [pitch("C", -2)] }, maxFret: 2 };
    expect(findLocations({ board }).map((location) => location.semitone)).toEqual([-12, -11, -10]);
    expect(findLocations({ board }).map((location) => location.pitchClass)).toEqual([0, 1, 2]);
  });
});

describe("bounded location queries", () => {
  it("uses inclusive fret limits and deterministic string-index then fret order", () => {
    const result = findLocations({
      board: STANDARD_FRETBOARD,
      fretRange: { minFret: 1, maxFret: 3 },
      stringIndices: [5, 0],
    });
    expect(result.map((location) => location.position)).toEqual([
      { stringIndex: 0, fret: 1 }, { stringIndex: 0, fret: 2 }, { stringIndex: 0, fret: 3 },
      { stringIndex: 5, fret: 1 }, { stringIndex: 5, fret: 2 }, { stringIndex: 5, fret: 3 },
    ]);
    for (const location of result) {
      expect(location).toEqual(getNoteAt(STANDARD_FRETBOARD, location.position));
    }
  });

  it("intersects pitch classes, strings and fret range without duplicate locations", () => {
    const request: FindLocationsRequest = {
      board: STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 12 },
      stringIndices: [5, 0, 5, 0],
      pitchClasses: [4, 9, 4],
    };
    const before = JSON.stringify(request);
    const result = findLocations(request);
    expect(result.map((location) => location.position)).toEqual([
      { stringIndex: 0, fret: 0 }, { stringIndex: 0, fret: 5 }, { stringIndex: 0, fret: 12 },
      { stringIndex: 5, fret: 0 }, { stringIndex: 5, fret: 5 }, { stringIndex: 5, fret: 12 },
    ]);
    expect(JSON.stringify(request)).toBe(before);
    expect(findLocations(request)).toEqual(result);
  });

  it("returns an empty list for explicit empty filters or a valid no-match query", () => {
    expect(findLocations({ board: STANDARD_FRETBOARD, stringIndices: [] })).toEqual([]);
    expect(findLocations({ board: STANDARD_FRETBOARD, pitchClasses: [] })).toEqual([]);
    expect(findLocations({
      board: STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 0 },
      stringIndices: [0],
      pitchClasses: [0],
    })).toEqual([]);
  });

  it("accepts the enumeration budget boundary and rejects broader queries", () => {
    const board: Fretboard = {
      tuning: { id: "single", openStrings: [pitch("C", 0)] },
      maxFret: MAX_ENUMERATED_LOCATIONS,
    };
    expect(findLocations({
      board, fretRange: { minFret: 0, maxFret: MAX_ENUMERATED_LOCATIONS - 1 },
    })).toHaveLength(MAX_ENUMERATED_LOCATIONS);
    expectError(() => findLocations({ board }), "UNSUPPORTED");
    expectError(() => findLocations({ board, pitchClasses: [0] }), "UNSUPPORTED");
    expect(findLocations({ board, pitchClasses: [] })).toEqual([]);
  });

  it("counts the normalized string/range intersection against the budget", () => {
    const board: Fretboard = { tuning: STANDARD_TUNING, maxFret: 5_000 };
    expectError(() => findLocations({ board }), "UNSUPPORTED");
    expect(findLocations({ board, stringIndices: [4, 4] })).toHaveLength(5_001);
    expect(findLocations({ board, fretRange: { minFret: 5_000, maxFret: 5_000 } })).toHaveLength(6);
  });
});

describe("fretboard input guards", () => {
  it.each([
    null, [], {}, { id: "", openStrings: [pitch("E", 2)] },
    { id: " ", openStrings: [pitch("E", 2)] }, { id: "empty", openStrings: [] },
    { id: "bad", openStrings: [null] },
    { id: "bad", openStrings: [{ note: { letter: "H", accidental: 0 }, octave: 2 }] },
    { id: "bad", openStrings: [pitch("E", NaN)] },
  ])("rejects invalid tuning %j", (value) => {
    expectError(() => validateTuning(value));
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid maximum fret %s", (maxFret) => {
    expectError(() => validateFretboard({ tuning: STANDARD_TUNING, maxFret }));
  });

  it("validates the complete board and guards sounding-pitch overflow", () => {
    expectError(() => validateFretboard(null));
    expectError(() => validateFretboard({ tuning: {}, maxFret: 2 }));
    expectError(() => validateFretboard({ tuning: STANDARD_TUNING, maxFret: Number.MAX_SAFE_INTEGER }));
    expectError(() => validateTuning({ id: "overflow", openStrings: [pitch("C", Number.MAX_SAFE_INTEGER)] }));
  });

  it.each([
    null, {}, { stringIndex: -1, fret: 0 }, { stringIndex: 6, fret: 0 },
    { stringIndex: 0.5, fret: 0 }, { stringIndex: NaN, fret: 0 },
    { stringIndex: 0, fret: -1 }, { stringIndex: 0, fret: 16 },
    { stringIndex: 0, fret: 0.5 }, { stringIndex: 0, fret: Infinity },
    { stringIndex: 0, fret: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects invalid position %j", (position) => {
    expectError(() => validatePosition(position, STANDARD_FRETBOARD));
    expectError(() => getNoteAt(STANDARD_FRETBOARD, position as FretPosition));
  });

  it.each([
    { fretRange: null }, { fretRange: { minFret: -1, maxFret: 1 } },
    { fretRange: { minFret: 5, maxFret: 4 } },
    { fretRange: { minFret: 0, maxFret: 16 } },
    { fretRange: { minFret: NaN, maxFret: 1 } },
    { fretRange: { minFret: 0, maxFret: Infinity } },
    { stringIndices: null }, { stringIndices: [-1] }, { stringIndices: [6] },
    { stringIndices: [0.5] }, { stringIndices: [NaN] },
    { pitchClasses: null }, { pitchClasses: [-1] }, { pitchClasses: [12] },
    { pitchClasses: [0.5] }, { pitchClasses: [Infinity] },
  ])("rejects invalid query constraints %j", (constraints) => {
    expectError(() => findLocations({ board: STANDARD_FRETBOARD, ...constraints } as FindLocationsRequest));
  });

  it("does not hide invalid inputs behind empty filters", () => {
    expectError(() => findLocations({ board: STANDARD_FRETBOARD, stringIndices: [], pitchClasses: [12] } as unknown as FindLocationsRequest));
    expectError(() => findLocations({ board: STANDARD_FRETBOARD, stringIndices: [6], pitchClasses: [] }));
    expectError(() => findLocations({ board: null } as unknown as FindLocationsRequest));
    expectError(() => findLocations(null as unknown as FindLocationsRequest));
  });

  it("keeps exported standard defaults immutable", () => {
    expect(Object.isFrozen(STANDARD_FRETBOARD)).toBe(true);
    expect(Object.isFrozen(STANDARD_TUNING)).toBe(true);
    expect(Object.isFrozen(STANDARD_TUNING.openStrings)).toBe(true);
    expect(Object.isFrozen(STANDARD_TUNING.openStrings[0])).toBe(true);
    expect(Object.isFrozen(STANDARD_TUNING.openStrings[0]?.note)).toBe(true);
    expect(STANDARD_TUNING).toMatchObject({ id: "standard" } satisfies Partial<Tuning>);
  });
});
