import { assertInteger, assertRecord, MusicError } from "./errors.js";

/** Exact quarter-note lengths, independent of meter, tempo and wall-clock time. */
export type MusicalTime = Readonly<{ numerator: number; denominator: number }>;
export type MusicalTimeSpan = Readonly<{ onset: MusicalTime; duration: MusicalTime }>;

export const ZERO_MUSICAL_TIME: MusicalTime = Object.freeze({ numerator: 0, denominator: 1 });
/** Computational budget per temporal value, not a musical difficulty limit. */
export const MAX_TEMPORAL_EVENTS = 10_000;

function canonical(numerator: bigint, denominator: bigint): MusicalTime {
  if (numerator === 0n) return ZERO_MUSICAL_TIME;
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  const n = numerator / a;
  const d = denominator / a;
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (n < -limit || n > limit || d > limit) {
    throw new MusicError("UNSUPPORTED", "MusicalTime reduced result exceeds the safe-integer pair budget");
  }
  return Object.freeze({ numerator: Number(n), denominator: Number(d) });
}

export function normalizeMusicalTime(value: MusicalTime): MusicalTime {
  assertRecord(value, "MusicalTime");
  assertInteger(value.numerator, "MusicalTime.numerator");
  assertInteger(value.denominator, "MusicalTime.denominator");
  if (value.denominator <= 0) {
    throw new MusicError("INVALID_INPUT", "MusicalTime.denominator must be positive");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key !== "numerator" && key !== "denominator") {
      throw new MusicError("UNSUPPORTED", `MusicalTime.${String(key)} is not supported`);
    }
  }
  return canonical(BigInt(value.numerator), BigInt(value.denominator));
}

export function compareMusicalTime(left: MusicalTime, right: MusicalTime): -1 | 0 | 1 {
  const a = normalizeMusicalTime(left);
  const b = normalizeMusicalTime(right);
  const difference = BigInt(a.numerator) * BigInt(b.denominator)
    - BigInt(b.numerator) * BigInt(a.denominator);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function sameMusicalTime(left: MusicalTime, right: MusicalTime): boolean {
  return compareMusicalTime(left, right) === 0;
}

export function addMusicalTime(left: MusicalTime, right: MusicalTime): MusicalTime {
  const a = normalizeMusicalTime(left);
  const b = normalizeMusicalTime(right);
  return canonical(
    BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator),
    BigInt(a.denominator) * BigInt(b.denominator),
  );
}

export function subtractMusicalTime(left: MusicalTime, right: MusicalTime): MusicalTime {
  const a = normalizeMusicalTime(left);
  const b = normalizeMusicalTime(right);
  return canonical(
    BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator),
    BigInt(a.denominator) * BigInt(b.denominator),
  );
}
