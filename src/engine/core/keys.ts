import { assertRecord, MusicError } from "./errors.js";
import { describeInterval, transposeNote } from "./intervals.js";
import { validateNote } from "./pitch.js";
import type { IntervalInfo, Key, NoteName } from "./types.js";

export type KeySignatureAccidental = "sharp" | "flat" | null;

export type KeySignature = Readonly<{
  key: Key;
  fifths: number;
  accidental: KeySignatureAccidental;
  alterations: readonly NoteName[];
}>;

export type RelativeKeyRelationship = Readonly<{
  sourceKey: Key;
  relativeKey: Key;
  relationship: "relativeMajor" | "relativeMinor";
  tonicInterval: IntervalInfo;
}>;

export type FifthsNeighbor = Readonly<{
  destinationKey: Key;
  tonicInterval: IntervalInfo;
}>;

export type FifthsRelationships = Readonly<{
  sourceKey: Key;
  clockwise: FifthsNeighbor;
  counterclockwise: FifthsNeighbor;
}>;

export type KeyProfile = Readonly<{
  key: Key;
  signature: KeySignature;
  relative: RelativeKeyRelationship;
  fifths: FifthsRelationships;
}>;

const PERFECT_FIFTH = describeInterval({ diatonicSteps: 4, semitones: 7 });
const DESCENDING_PERFECT_FIFTH = describeInterval({ diatonicSteps: -4, semitones: -7 });
const RELATIVE_MINOR_INTERVAL = describeInterval({ diatonicSteps: 5, semitones: 9 });
const RELATIVE_MAJOR_INTERVAL = describeInterval({ diatonicSteps: 2, semitones: 3 });
const FIRST_SHARP_INTERVAL = describeInterval({ diatonicSteps: 3, semitones: 6 });
const FIRST_FLAT_INTERVAL = describeInterval({ diatonicSteps: -1, semitones: -2 });
const C_NATURAL = Object.freeze({ letter: "C", accidental: 0 } as const);

export function validateKey(value: unknown): asserts value is Key {
  assertRecord(value, "Key");
  validateNote(value.tonic);
  if (typeof value.mode !== "string") {
    throw new MusicError("INVALID_INPUT", "Key mode must be text");
  }
  if (value.mode !== "major" && value.mode !== "minor") {
    throw new MusicError("UNSUPPORTED", "Key mode must be major or minor");
  }
}

function copyNote(note: NoteName): NoteName {
  return Object.freeze({ letter: note.letter, accidental: note.accidental });
}

function copyKey(key: Key): Key {
  return Object.freeze({ tonic: copyNote(key.tonic), mode: key.mode });
}

function sameNote(left: NoteName, right: NoteName): boolean {
  return left.letter === right.letter && left.accidental === right.accidental;
}

function transposeKey(key: Key, interval: IntervalInfo): Key {
  return Object.freeze({
    tonic: transposeNote(key.tonic, interval),
    mode: key.mode,
  });
}

export function getRelativeKeyRelationship(key: Key): RelativeKeyRelationship {
  validateKey(key);
  const sourceKey = copyKey(key);
  const tonicInterval = sourceKey.mode === "major" ? RELATIVE_MINOR_INTERVAL : RELATIVE_MAJOR_INTERVAL;
  const relationship = sourceKey.mode === "major" ? "relativeMinor" : "relativeMajor";
  const relativeKey = Object.freeze({
    tonic: transposeNote(sourceKey.tonic, tonicInterval),
    mode: sourceKey.mode === "major" ? "minor" : "major",
  } as const);
  return Object.freeze({ sourceKey, relativeKey, relationship, tonicInterval });
}

export function getFifthsRelationships(key: Key): FifthsRelationships {
  validateKey(key);
  const sourceKey = copyKey(key);
  return Object.freeze({
    sourceKey,
    clockwise: Object.freeze({
      destinationKey: transposeKey(sourceKey, PERFECT_FIFTH),
      tonicInterval: PERFECT_FIFTH,
    }),
    counterclockwise: Object.freeze({
      destinationKey: transposeKey(sourceKey, DESCENDING_PERFECT_FIFTH),
      tonicInterval: DESCENDING_PERFECT_FIFTH,
    }),
  });
}

/** Resolve a conventional signature by walking the fifths axis from C major. */
function signatureFifths(key: Key): number {
  const majorKey = key.mode === "major" ? key : getRelativeKeyRelationship(key).relativeKey;
  if (sameNote(majorKey.tonic, C_NATURAL)) return 0;

  let clockwise: Key = Object.freeze({ tonic: C_NATURAL, mode: "major" });
  let counterclockwise = clockwise;
  for (let distance = 1; distance <= 7; distance += 1) {
    clockwise = getFifthsRelationships(clockwise).clockwise.destinationKey;
    if (sameNote(clockwise.tonic, majorKey.tonic)) return distance;
    counterclockwise = getFifthsRelationships(counterclockwise).counterclockwise.destinationKey;
    if (sameNote(counterclockwise.tonic, majorKey.tonic)) return -distance;
  }

  throw new MusicError(
    "UNSUPPORTED",
    "Key signature is outside the conventional range of seven sharps or flats",
  );
}

/** Build the conventional alteration order from intervals, not finished signature tables. */
function signatureAlterations(fifths: number): readonly NoteName[] {
  if (fifths === 0) return Object.freeze([]);
  const alterations: NoteName[] = [];
  const interval = fifths > 0 ? PERFECT_FIFTH : DESCENDING_PERFECT_FIFTH;
  let alteration = transposeNote(C_NATURAL, fifths > 0 ? FIRST_SHARP_INTERVAL : FIRST_FLAT_INTERVAL);
  for (let index = 0; index < Math.abs(fifths); index += 1) {
    alterations.push(copyNote(alteration));
    alteration = transposeNote(alteration, interval);
  }
  return Object.freeze(alterations);
}

export function buildKeySignature(key: Key): KeySignature {
  validateKey(key);
  const copiedKey = copyKey(key);
  const fifths = signatureFifths(copiedKey);
  return Object.freeze({
    key: copiedKey,
    fifths,
    accidental: fifths > 0 ? "sharp" : fifths < 0 ? "flat" : null,
    alterations: signatureAlterations(fifths),
  });
}

export function buildKeyProfile(key: Key): KeyProfile {
  validateKey(key);
  const copiedKey = copyKey(key);
  return Object.freeze({
    key: copiedKey,
    signature: buildKeySignature(copiedKey),
    relative: getRelativeKeyRelationship(copiedKey),
    fifths: getFifthsRelationships(copiedKey),
  });
}
