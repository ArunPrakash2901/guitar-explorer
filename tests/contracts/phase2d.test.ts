import { describe, expect, it } from "vitest";
import { parseNote } from "../../src/engine/core/pitch.js";
import { musicQueries } from "../../src/engine/query/index.js";
import type { QueryResult } from "../../src/engine/query/index.js";

function data<T>(result: QueryResult<T>): T {
  expect(result).toMatchObject({ schemaVersion: 1, ok: true });
  if (!result.ok) throw new Error(result.error.message);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  return result.data;
}

function failure(result: QueryResult<unknown>, code: "INVALID_INPUT" | "UNSUPPORTED"): void {
  expect(result).toMatchObject({ schemaVersion: 1, ok: false, error: { code } });
  if (result.ok) throw new Error("Expected a typed harmony failure");
  expect(typeof result.error.message).toBe("string");
  expect(result.error.message.length).toBeGreaterThan(0);
  expect(Object.keys(result).sort()).toEqual(["error", "ok", "schemaVersion"]);
  expect(Object.keys(result.error).sort()).toEqual(["code", "message"]);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
}

describe("Phase 2D public diatonic-harmony query", () => {
  it("returns ordered musical identity through the existing deterministic version-1 facade", () => {
    const request = Object.freeze({
      key: Object.freeze({ tonic: Object.freeze(parseNote("C")), mode: "major" as const }),
      chordSize: "seventh" as const,
    });
    const before = JSON.stringify(request);
    const first = musicQueries.getDiatonicHarmony(request);
    const harmony = data(first);
    expect(musicQueries.getDiatonicHarmony(request)).toStrictEqual(first);
    expect(JSON.stringify(request)).toBe(before);
    expect(Object.keys(harmony).sort()).toEqual(["chordSize", "degrees", "key"]);
    expect(harmony.degrees.map(({ romanNumeral }) => romanNumeral.label)).toEqual([
      "Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7",
    ]);
    expect(harmony.degrees[4]!.chord).toMatchObject({ root: parseNote("G"), chordId: "dominant7" });
    for (const entry of harmony.degrees) {
      // Roman identity deliberately carries no harmonic-function interpretation.
      expect(Object.keys(entry).sort()).toEqual(["chord", "degree", "romanNumeral"]);
      expect(Object.keys(entry.romanNumeral).sort()).toEqual(["degree", "label", "quality"]);
      expect(entry.romanNumeral).toMatchObject({ degree: entry.degree, quality: entry.chord.chordId });
    }
  });

  it("retains key-relative natural-minor Roman labels and seventh qualities", () => {
    const request = { key: { tonic: parseNote("A"), mode: "minor" as const }, chordSize: "seventh" as const };
    const harmony = data(musicQueries.getDiatonicHarmony(request));
    expect(harmony.degrees.map(({ romanNumeral }) => romanNumeral.label)).toEqual([
      "i7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7",
    ]);
    expect(harmony.degrees[1]!.chord.chordId).toBe("halfDiminished7");
    expect(harmony.degrees[4]!.chord.chordId).toBe("minor7");
  });

  it("accepts theoretical harmony even when a conventional signature is unavailable", () => {
    const key = { tonic: parseNote("G#"), mode: "major" as const };
    failure(musicQueries.getKeySignature(key), "UNSUPPORTED");
    const harmony = data(musicQueries.getDiatonicHarmony({ key, chordSize: "triad" }));
    expect(harmony.degrees[6]!.chord.root).toEqual(parseNote("F##"));
  });

  it("copies only musical request fields and does not leak foreign or cyclic metadata", () => {
    const tonic: Record<string, unknown> = { letter: "C", accidental: 1, metadata: 1n };
    tonic.self = tonic;
    const key: Record<string, unknown> = { tonic, mode: "minor", metadata: 1n };
    key.self = key;
    const request: Record<string, unknown> = { key, chordSize: "seventh", metadata: 1n };
    request.self = request;
    const first = musicQueries.getDiatonicHarmony(request as never);
    const harmony = data(first);
    expect(harmony.key).toEqual({ tonic: parseNote("C#"), mode: "minor" });
    expect(harmony.key).not.toBe(key);
    expect(harmony.key.tonic).not.toBe(tonic);
    expect(JSON.stringify(first)).not.toContain("metadata");
    expect(JSON.stringify(first)).not.toContain("self");
    expect(tonic.metadata).toBe(1n);
    expect(tonic.self).toBe(tonic);
    expect(key.self).toBe(key);
    expect(request.self).toBe(request);
    expect(musicQueries.getDiatonicHarmony(request as never)).toStrictEqual(first);
  });

  it.each([
    null, undefined, [], "C major", 4, true, {},
    { chordSize: "triad" }, { key: null, chordSize: "triad" },
    { key: {}, chordSize: "triad" },
    { key: { tonic: { letter: "H", accidental: 0 }, mode: "major" }, chordSize: "triad" },
    { key: { tonic: { letter: "C", accidental: NaN }, mode: "major" }, chordSize: "triad" },
    { key: { tonic: { letter: "C", accidental: 0.5 }, mode: "major" }, chordSize: "triad" },
    { key: { tonic: { letter: "C", accidental: 0 }, mode: 3 }, chordSize: "triad" },
  ])("uses a typed invalid-input result for malformed harmony request %j", (request) => {
    failure(musicQueries.getDiatonicHarmony(request as never), "INVALID_INPUT");
  });

  it.each([undefined, null, 3, {}, [], true])("rejects malformed chord size %j", (chordSize) => {
    failure(musicQueries.getDiatonicHarmony({ key: { tonic: parseNote("C"), mode: "major" }, chordSize } as never), "INVALID_INPUT");
  });

  it.each(["ninth", "triads", "__proto__", "constructor", "toString"])("rejects unsupported chord size %s", (chordSize) => {
    failure(musicQueries.getDiatonicHarmony({ key: { tonic: parseNote("C"), mode: "major" }, chordSize } as never), "UNSUPPORTED");
  });

  it.each(["dorian", "harmonicMinor", "melodicMinorAscending", "__proto__"])("does not silently harmonize unsupported key mode %s", (mode) => {
    failure(musicQueries.getDiatonicHarmony({ key: { tonic: parseNote("C"), mode }, chordSize: "triad" } as never), "UNSUPPORTED");
  });
});
