import { describe, expect, it } from "vitest";
import { MusicError } from "../../src/engine/core/errors.js";
import {
  buildKeyProfile,
  buildKeySignature,
  getFifthsRelationships,
  getRelativeKeyRelationship,
  validateKey,
} from "../../src/engine/core/keys.js";
import { formatNote, parseNote, pitchClass } from "../../src/engine/core/pitch.js";
import type { Key } from "../../src/engine/core/types.js";
import { conventionalSignatures } from "../fixtures/keys.js";

function key(tonic: string, mode: Key["mode"]): Key {
  return { tonic: parseNote(tonic), mode };
}

function expectMusicError(action: () => unknown, code: "INVALID_INPUT" | "UNSUPPORTED"): void {
  expect(action).toThrow(MusicError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe("conventional key signatures", () => {
  it.each(conventionalSignatures)("builds the $major major and $minor minor signatures at fifths=$fifths", ({ fifths, major, minor, alterations }) => {
    for (const source of [key(major, "major"), key(minor, "minor")]) {
      const signature = buildKeySignature(source);
      expect(signature).toEqual({
        key: source,
        fifths,
        accidental: fifths > 0 ? "sharp" : fifths < 0 ? "flat" : null,
        alterations: alterations.map(parseNote),
      });
      expect(Object.isFrozen(signature)).toBe(true);
      expect(Object.isFrozen(signature.alterations)).toBe(true);
    }
  });

  it("derives the supported major-key axis by repeated fifths movement from C", () => {
    const byFifths = new Map<number, (typeof conventionalSignatures)[number]>(
      conventionalSignatures.map((fixture) => [fixture.fifths, fixture]),
    );
    let clockwise = key("C", "major");
    let counterclockwise = clockwise;
    for (let distance = 0; distance <= 7; distance += 1) {
      expect(formatNote(clockwise.tonic)).toBe(byFifths.get(distance)?.major);
      expect(buildKeySignature(clockwise).fifths).toBe(distance);
      const counterclockwiseDistance = distance === 0 ? 0 : -distance;
      expect(formatNote(counterclockwise.tonic)).toBe(byFifths.get(counterclockwiseDistance)?.major);
      expect(buildKeySignature(counterclockwise).fifths).toBe(counterclockwiseDistance);
      clockwise = getFifthsRelationships(clockwise).clockwise.destinationKey;
      counterclockwise = getFifthsRelationships(counterclockwise).counterclockwise.destinationKey;
    }
  });

  it.each(conventionalSignatures)("gives relative $major major and $minor minor identical signatures", ({ major, minor }) => {
    const majorSignature = buildKeySignature(key(major, "major"));
    const minorSignature = buildKeySignature(key(minor, "minor"));
    expect(minorSignature.fifths).toBe(majorSignature.fifths);
    expect(minorSignature.accidental).toBe(majorSignature.accidental);
    expect(minorSignature.alterations).toEqual(majorSignature.alterations);
  });

  it.each([
    ["G#", "major"], ["Fb", "major"], ["B#", "major"],
    ["E#", "minor"], ["Db", "minor"], ["B#", "minor"],
  ] as const)("rejects the out-of-range signature %s %s", (tonic, mode) => {
    expectMusicError(() => buildKeySignature(key(tonic, mode)), "UNSUPPORTED");
    expectMusicError(() => buildKeyProfile(key(tonic, mode)), "UNSUPPORTED");
  });
});

describe("relative keys and fifths relationships", () => {
  it.each(conventionalSignatures)("describes both directions of the $major/$minor relative pair", ({ major, minor }) => {
    expect(getRelativeKeyRelationship(key(major, "major"))).toEqual({
      sourceKey: key(major, "major"),
      relativeKey: key(minor, "minor"),
      relationship: "relativeMinor",
      tonicInterval: expect.objectContaining({ label: "M6", diatonicSteps: 5, semitones: 9 }),
    });
    expect(getRelativeKeyRelationship(key(minor, "minor"))).toEqual({
      sourceKey: key(minor, "minor"),
      relativeKey: key(major, "major"),
      relationship: "relativeMajor",
      tonicInterval: expect.objectContaining({ label: "m3", diatonicSteps: 2, semitones: 3 }),
    });
  });

  it("returns signed fifths neighbors with the mode preserved", () => {
    expect(getFifthsRelationships(key("C", "major"))).toEqual({
      sourceKey: key("C", "major"),
      clockwise: {
        destinationKey: key("G", "major"),
        tonicInterval: expect.objectContaining({ label: "P5", diatonicSteps: 4, semitones: 7 }),
      },
      counterclockwise: {
        destinationKey: key("F", "major"),
        tonicInterval: expect.objectContaining({ label: "-P5", diatonicSteps: -4, semitones: -7 }),
      },
    });
    expect(getFifthsRelationships(key("A", "minor"))).toMatchObject({
      clockwise: { destinationKey: key("E", "minor") },
      counterclockwise: { destinationKey: key("D", "minor") },
    });
  });

  it("returns to pitch class C as B# after twelve spelled clockwise fifths", () => {
    let current = key("C", "major");
    for (let move = 0; move < 12; move += 1) {
      current = getFifthsRelationships(current).clockwise.destinationKey;
    }
    expect(formatNote(current.tonic)).toBe("B#");
    expect(pitchClass(current.tonic)).toBe(0);
    expectMusicError(() => buildKeySignature(current), "UNSUPPORTED");
  });

  it("composes a profile from the canonical relationship results", () => {
    const source = key("Eb", "major");
    const profile = buildKeyProfile(source);
    expect(profile).toEqual({
      key: source,
      signature: buildKeySignature(source),
      relative: getRelativeKeyRelationship(source),
      fifths: getFifthsRelationships(source),
    });
    expect(Object.isFrozen(profile)).toBe(true);
  });

  it("strips undeclared input fields and rejects malformed keys", () => {
    const withExtras = {
      tonic: { ...parseNote("D"), ignored: 1n },
      mode: "major" as const,
      ignored: 1n,
    };
    expect(JSON.parse(JSON.stringify(buildKeyProfile(withExtras)))).toEqual(buildKeyProfile(key("D", "major")));

    for (const invalid of [
      null, {}, { tonic: parseNote("C") }, { tonic: parseNote("C"), mode: 1 },
      { tonic: { letter: "C", accidental: Number.NaN }, mode: "major" },
    ]) {
      expectMusicError(() => validateKey(invalid), "INVALID_INPUT");
    }
    expectMusicError(() => validateKey({ tonic: parseNote("C"), mode: "dorian" }), "UNSUPPORTED");
  });
});
