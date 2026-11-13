import { assertInteger, assertRecord, MusicError } from "./errors.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
export const ZERO_MUSICAL_TIME = Object.freeze({ numerator: 0, denominator: 1 });
/** Computational budget per temporal value, not a musical difficulty limit. */
export const MAX_TEMPORAL_EVENTS = 10_000;
function canonical(numerator, denominator) {
    if (numerator === 0n)
        return ZERO_MUSICAL_TIME;
    let a = numerator < 0n ? -numerator : numerator;
    let b = denominator;
    while (b !== 0n)
        [a, b] = [b, a % b];
    const n = numerator / a;
    const d = denominator / a;
    const limit = BigInt(Number.MAX_SAFE_INTEGER);
    if (n < -limit || n > limit || d > limit) {
        throw new MusicError("UNSUPPORTED", "MusicalTime reduced result exceeds the safe-integer pair budget");
    }
    return Object.freeze({ numerator: Number(n), denominator: Number(d) });
}
export function normalizeMusicalTime(value) {
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
export function compareMusicalTime(left, right) {
    const a = normalizeMusicalTime(left);
    const b = normalizeMusicalTime(right);
    const difference = BigInt(a.numerator) * BigInt(b.denominator)
        - BigInt(b.numerator) * BigInt(a.denominator);
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
export function sameMusicalTime(left, right) {
    return compareMusicalTime(left, right) === 0;
}
export function addMusicalTime(left, right) {
    const a = normalizeMusicalTime(left);
    const b = normalizeMusicalTime(right);
    return canonical(BigInt(a.numerator) * BigInt(b.denominator) + BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}
export function subtractMusicalTime(left, right) {
    const a = normalizeMusicalTime(left);
    const b = normalizeMusicalTime(right);
    return canonical(BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator), BigInt(a.denominator) * BigInt(b.denominator));
}