import { describe, expect, it } from "vitest";
import { MusicError } from "../../src/engine/core/errors.js";
import {
  addMusicalTime, compareMusicalTime, MAX_TEMPORAL_EVENTS, normalizeMusicalTime,
  sameMusicalTime, subtractMusicalTime, ZERO_MUSICAL_TIME,
} from "../../src/engine/core/time.js";
import { q } from "../fixtures/phrases.js";

const M = Number.MAX_SAFE_INTEGER;

describe("exact rational quarter lengths", () => {
  it.each([
    [q(2, 4), q(1, 2)], [q(0, 17), q(0)], [q(-0, 7), q(0)],
    [q(-12, 18), q(-2, 3)], [q(M, M), q(1)], [q(-M, M), q(-1)],
  ])("normalizes %j to %j without decimals", (input, expected) => {
    const before = { ...input };
    const output = normalizeMusicalTime(input);
    expect(output).toStrictEqual(expected);
    expect(Object.is(output.numerator, -0)).toBe(false);
    expect(Object.isFrozen(output)).toBe(true);
    expect(input).toStrictEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
    expect(JSON.parse(JSON.stringify(output))).toStrictEqual(output);
  });

  it("exports frozen canonical zero and the approved event budget", () => {
    expect(ZERO_MUSICAL_TIME).toStrictEqual(q(0));
    expect(Object.isFrozen(ZERO_MUSICAL_TIME)).toBe(true);
    expect(MAX_TEMPORAL_EVENTS).toBe(10_000);
  });

  it("adds tuplets and subtracts signed values exactly", () => {
    expect(addMusicalTime(q(1, 3), q(2, 3))).toStrictEqual(q(1));
    expect(addMusicalTime(q(1, 5), q(4, 5))).toStrictEqual(q(1));
    expect(subtractMusicalTime(q(1, 3), q(1, 2))).toStrictEqual(q(-1, 6));
    expect(subtractMusicalTime(q(-1, 3), q(-1, 2))).toStrictEqual(q(1, 6));
    expect(addMusicalTime(q(-M, 2), q(M, 2))).toStrictEqual(q(0));
  });

  it("reduces huge integer intermediates before checking the output budget", () => {
    expect(addMusicalTime(q(M, 2), q(M, 2))).toStrictEqual(q(M));
    expect(subtractMusicalTime(q(M, 2), q(-M, 2))).toStrictEqual(q(M));
    expect(addMusicalTime(q(1, M), q(-1, M))).toStrictEqual(q(0));
  });

  it("compares large close fractions that collapse to the same floating-point value", () => {
    expect(compareMusicalTime(q(M - 1, M), q(M - 2, M - 1))).toBe(1);
    expect(compareMusicalTime(q(M - 2, M - 1), q(M - 1, M))).toBe(-1);
    expect(sameMusicalTime(q(M - 1, M), q(M - 2, M - 1))).toBe(false);
    expect(compareMusicalTime(q(-M + 1, M), q(-M + 2, M - 1))).toBe(-1);
    expect(sameMusicalTime(q(2, 6), q(1, 3))).toBe(true);
  });

  it.each([
    () => addMusicalTime(q(1, M), q(1, M - 1)),
    () => addMusicalTime(q(M), q(1)),
    () => subtractMusicalTime(q(-M), q(1)),
    () => subtractMusicalTime(q(1, M), q(1, M - 1)),
  ])("rejects an unrepresentable reduced result without rounding (%#)", (operation) => {
    expect(operation).toThrowError(expect.objectContaining({ code: "UNSUPPORTED" }));
    expect(operation).toThrow(MusicError);
  });

  it.each([
    null, undefined, [], 1, "1/3", {}, { numerator: 1 }, { denominator: 3 },
    q(1, 0), q(1, -3), q(1, -0), q(1, 0.5), q(0.5), q(NaN), q(Infinity),
    q(M + 1), q(1, M + 1), { numerator: "1", denominator: 3 },
    { numerator: 1n, denominator: 3 }, { numerator: 1, denominator: 3n },
  ])("returns MusicError for invalid pair %# in every scalar operation", (value) => {
    const invalid = value as never;
    const actions = [
      () => normalizeMusicalTime(invalid),
      () => sameMusicalTime(invalid, q(1)), () => sameMusicalTime(q(1), invalid),
      () => compareMusicalTime(invalid, q(1)), () => compareMusicalTime(q(1), invalid),
      () => addMusicalTime(invalid, q(0)), () => addMusicalTime(q(0), invalid),
      () => subtractMusicalTime(invalid, q(0)), () => subtractMusicalTime(q(0), invalid),
    ];
    for (const action of actions) {
      expect(action).toThrow(MusicError);
      expect(action).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
    }
  });

  it("rejects new scalar metadata and prioritizes required field errors", () => {
    expect(() => normalizeMusicalTime({ ...q(1), seconds: 1 } as never))
      .toThrowError(expect.objectContaining({ code: "UNSUPPORTED", message: expect.stringContaining("seconds") }));
    expect(() => normalizeMusicalTime({ numerator: 1, seconds: 1 } as never))
      .toThrowError(expect.objectContaining({ code: "INVALID_INPUT", message: expect.stringContaining("denominator") }));
    expect(() => normalizeMusicalTime({ ...q(1), [Symbol("metadata")]: 1 } as never))
      .toThrowError(expect.objectContaining({ code: "UNSUPPORTED" }));
  });

  it("preserves exact equality, complements and signed cancellation across fraction spellings", () => {
    for (let denominator = 2; denominator <= 31; denominator++) {
      for (let numerator = 1; numerator < denominator; numerator++) {
        const value = q(numerator, denominator);
        expect(sameMusicalTime(value, q(numerator * 7, denominator * 7))).toBe(true);
        expect(addMusicalTime(value, q(denominator - numerator, denominator))).toStrictEqual(q(1));
        expect(subtractMusicalTime(value, q(numerator * 3, denominator * 3))).toStrictEqual(q(0));
        expect(compareMusicalTime(value, q(0))).toBe(1);
        expect(compareMusicalTime(value, q(1))).toBe(-1);
      }
    }
  });
});
