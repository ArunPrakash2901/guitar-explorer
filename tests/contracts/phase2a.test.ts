import { describe, expect, it } from "vitest";
import { formatNote, parseNote, pitchClass } from "../../src/engine/core/pitch.js";
import type { Key } from "../../src/engine/core/types.js";
import { musicQueries } from "../../src/engine/query/index.js";
import type { QueryResult } from "../../src/engine/query/index.js";

function value<T>(result: QueryResult<T>): T {
  expect(result).toMatchObject({ schemaVersion: 1, ok: true });
  if (!result.ok) throw new Error(result.error.message);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  return result.data;
}

function unsupported(result: QueryResult<unknown>): void {
  expect(result).toMatchObject({
    schemaVersion: 1,
    ok: false,
    error: { code: "UNSUPPORTED" },
  });
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
}

describe("Phase 2A public musical queries", () => {
  it("returns canonical signature, relative and fifths data independently and as a composed profile", () => {
    const request = { tonic: parseNote("F#"), mode: "major" as const };
    const before = JSON.stringify(request);
    const signature = value(musicQueries.getKeySignature(request));
    const relative = value(musicQueries.getRelativeKey(request));
    const fifths = value(musicQueries.getFifthsNeighbors(request));
    const profile = value(musicQueries.getKeyProfile(request));

    expect(signature).toMatchObject({ fifths: 6, accidental: "sharp" });
    expect(signature.alterations.map(formatNote)).toEqual(["F#", "C#", "G#", "D#", "A#", "E#"]);
    expect(relative).toMatchObject({
      sourceKey: request,
      relativeKey: { tonic: parseNote("D#"), mode: "minor" },
      relationship: "relativeMinor",
      tonicInterval: { label: "M6", semitones: 9 },
    });
    expect(fifths).toMatchObject({
      clockwise: { destinationKey: { tonic: parseNote("C#"), mode: "major" }, tonicInterval: { label: "P5" } },
      counterclockwise: { destinationKey: { tonic: parseNote("B"), mode: "major" }, tonicInterval: { label: "-P5" } },
    });
    expect(profile).toEqual({ key: request, signature, relative, fifths });
    expect(JSON.stringify(request)).toBe(before);
  });

  it("preserves spelling across twelve public fifths moves", () => {
    let current: Key = { tonic: parseNote("C"), mode: "major" };
    for (let move = 0; move < 12; move += 1) {
      current = value(musicQueries.getFifthsNeighbors(current)).clockwise.destinationKey;
    }
    expect(formatNote(current.tonic)).toBe("B#");
    expect(pitchClass(current.tonic)).toBe(0);
    unsupported(musicQueries.getKeySignature(current));
    unsupported(musicQueries.getKeyProfile(current));
    expect(value(musicQueries.getRelativeKey(current))).toMatchObject({
      relationship: "relativeMinor",
      tonicInterval: { label: "M6" },
    });
  });

  it("uses typed envelopes for invalid and unsupported key requests", () => {
    for (const query of [
      musicQueries.getKeySignature,
      musicQueries.getRelativeKey,
      musicQueries.getFifthsNeighbors,
      musicQueries.getKeyProfile,
    ]) {
      const invalid = query({ tonic: parseNote("C"), mode: 3 } as never);
      expect(invalid).toMatchObject({ schemaVersion: 1, ok: false, error: { code: "INVALID_INPUT" } });
      const unsupportedMode = query({ tonic: parseNote("C"), mode: "dorian" } as never);
      expect(unsupportedMode).toMatchObject({ schemaVersion: 1, ok: false, error: { code: "UNSUPPORTED" } });
    }
    unsupported(musicQueries.getKeySignature({ tonic: parseNote("G#"), mode: "major" }));
  });
});
