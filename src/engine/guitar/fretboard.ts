import { assertInteger, assertRecord, MusicError } from "../core/errors.js";
import { mod12, toSemitone, validatePitch } from "../core/pitch.js";
import type { NoteLetter, Pitch } from "../core/types.js";
import type {
  FindLocationsRequest,
  Fretboard,
  FretPosition,
  FretRange,
  LocatedPitch,
  Tuning,
} from "./types.js";

/** Budget counts candidate positions before filtering by pitch class. */
export const MAX_ENUMERATED_LOCATIONS = 10_000;

function openPitch(letter: NoteLetter, octave: number): Pitch {
  return Object.freeze({ note: Object.freeze({ letter, accidental: 0 }), octave });
}

export const STANDARD_TUNING: Tuning = Object.freeze({
  id: "standard",
  openStrings: Object.freeze([
    openPitch("E", 2),
    openPitch("A", 2),
    openPitch("D", 3),
    openPitch("G", 3),
    openPitch("B", 3),
    openPitch("E", 4),
  ]),
});

export const STANDARD_FRETBOARD: Fretboard = Object.freeze({
  tuning: STANDARD_TUNING,
  maxFret: 15,
});

export function validateTuning(value: unknown): asserts value is Tuning {
  assertRecord(value, "tuning");
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    throw new MusicError("INVALID_INPUT", "tuning.id must be a non-empty string");
  }
  if (!Array.isArray(value.openStrings) || value.openStrings.length === 0) {
    throw new MusicError("INVALID_INPUT", "tuning.openStrings must be a non-empty array");
  }
  for (const pitch of value.openStrings) {
    validatePitch(pitch);
    toSemitone(pitch);
  }
}

export function validateFretboard(value: unknown): asserts value is Fretboard {
  assertRecord(value, "fretboard");
  validateTuning(value.tuning);
  assertInteger(value.maxFret, "fretboard.maxFret");
  if (value.maxFret < 0) {
    throw new MusicError("INVALID_INPUT", "fretboard.maxFret must be non-negative");
  }
  for (const pitch of value.tuning.openStrings) {
    if (!Number.isSafeInteger(toSemitone(pitch) + value.maxFret)) {
      throw new MusicError("INVALID_INPUT", "fretboard pitches must remain safe integers");
    }
  }
}

function validatePositionOnBoard(value: unknown, board: Fretboard): asserts value is FretPosition {
  assertRecord(value, "position");
  assertInteger(value.stringIndex, "position.stringIndex");
  assertInteger(value.fret, "position.fret");
  if (value.stringIndex < 0 || value.stringIndex >= board.tuning.openStrings.length) {
    throw new MusicError("INVALID_INPUT", "position.stringIndex is outside the tuning");
  }
  if (value.fret < 0 || value.fret > board.maxFret) {
    throw new MusicError("INVALID_INPUT", "position.fret is outside the fretboard");
  }
}

export function validatePosition(value: unknown, board: Fretboard): asserts value is FretPosition {
  validateFretboard(board);
  validatePositionOnBoard(value, board);
}

function locate(board: Fretboard, stringIndex: number, fret: number): LocatedPitch {
  const openString = board.tuning.openStrings[stringIndex];
  // Every caller validates the string index before calculating a pitch.
  if (openString === undefined) {
    throw new MusicError("INVALID_INPUT", "position.stringIndex is outside the tuning");
  }
  const semitone = toSemitone(openString) + fret;
  return { position: { stringIndex, fret }, semitone, pitchClass: mod12(semitone) };
}

export function getNoteAt(board: Fretboard, position: FretPosition): LocatedPitch {
  validateFretboard(board);
  validatePositionOnBoard(position, board);
  return locate(board, position.stringIndex, position.fret);
}

function validateRange(value: unknown, board: Fretboard): asserts value is FretRange {
  assertRecord(value, "fretRange");
  assertInteger(value.minFret, "fretRange.minFret");
  assertInteger(value.maxFret, "fretRange.maxFret");
  if (value.minFret < 0 || value.maxFret < value.minFret || value.maxFret > board.maxFret) {
    throw new MusicError("INVALID_INPUT", "fretRange must be ordered and within the fretboard");
  }
}

/** Returns each matching location once, in string-index then fret order. */
export function findLocations(request: FindLocationsRequest): readonly LocatedPitch[] {
  assertRecord(request, "location request");
  validateFretboard(request.board);
  const board = request.board;
  const range = request.fretRange === undefined
    ? { minFret: 0, maxFret: board.maxFret }
    : request.fretRange;
  validateRange(range, board);

  let selectedStrings: Set<number> | undefined;
  if (request.stringIndices !== undefined) {
    if (!Array.isArray(request.stringIndices)) {
      throw new MusicError("INVALID_INPUT", "stringIndices must be an array");
    }
    selectedStrings = new Set<number>();
    for (const index of request.stringIndices) {
      assertInteger(index, "stringIndices entry");
      if (index < 0 || index >= board.tuning.openStrings.length) {
        throw new MusicError("INVALID_INPUT", "stringIndices entry is outside the tuning");
      }
      selectedStrings.add(index);
    }
  }

  let selectedPitchClasses: Set<number> | undefined;
  if (request.pitchClasses !== undefined) {
    if (!Array.isArray(request.pitchClasses)) {
      throw new MusicError("INVALID_INPUT", "pitchClasses must be an array");
    }
    selectedPitchClasses = new Set<number>();
    for (const pitchClass of request.pitchClasses) {
      assertInteger(pitchClass, "pitchClasses entry");
      if (pitchClass < 0 || pitchClass > 11) {
        throw new MusicError("INVALID_INPUT", "pitchClasses entry must be in 0..11");
      }
      selectedPitchClasses.add(pitchClass);
    }
  }

  const stringCount = selectedStrings?.size ?? board.tuning.openStrings.length;
  if (stringCount === 0 || selectedPitchClasses?.size === 0) return [];
  const fretWidth = range.maxFret - range.minFret;
  if (
    fretWidth >= MAX_ENUMERATED_LOCATIONS ||
    stringCount > Math.floor(MAX_ENUMERATED_LOCATIONS / (fretWidth + 1))
  ) {
    throw new MusicError(
      "UNSUPPORTED",
      `Location queries may examine at most ${MAX_ENUMERATED_LOCATIONS} positions; narrow the fret range or strings`,
    );
  }

  const stringIndices = selectedStrings === undefined
    ? Array.from({ length: board.tuning.openStrings.length }, (_, index) => index)
    : [...selectedStrings].sort((a, b) => a - b);
  const result: LocatedPitch[] = [];
  for (const stringIndex of stringIndices) {
    for (let fret = range.minFret; fret <= range.maxFret; fret += 1) {
      const located = locate(board, stringIndex, fret);
      if (selectedPitchClasses === undefined || selectedPitchClasses.has(located.pitchClass)) {
        result.push(located);
      }
    }
  }
  return result;
}
