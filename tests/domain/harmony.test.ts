import { describe, expect, it } from "vitest";
import { buildScale, CHORD_FORMULAS } from "../../src/engine/core/collections.js";
import { MusicError } from "../../src/engine/core/errors.js";
import { buildDiatonicHarmony } from "../../src/engine/core/harmony.js";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import type { ChordId, Key } from "../../src/engine/core/types.js";
import { harmonyFixtures } from "../fixtures/harmony.js";
import { conventionalSignatures } from "../fixtures/keys.js";

const chordSizes = ["triad", "seventh"] as const;
const qualities: Readonly<Record<Key["mode"], Readonly<Record<typeof chordSizes[number], readonly ChordId[]>>>> = {
  major: {
    triad: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
    seventh: ["major7", "minor7", "minor7", "major7", "dominant7", "minor7", "halfDiminished7"],
  },
  minor: {
    triad: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
    seventh: ["minor7", "halfDiminished7", "major7", "minor7", "minor7", "major7", "dominant7"],
  },
};

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

function assertMusicError(action: () => unknown, code: "INVALID_INPUT" | "UNSUPPORTED"): void {
  let caught: unknown;
  try { action(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(MusicError);
  expect(caught).toMatchObject({ code });
}

describe("derived diatonic harmony", () => {
  it.each(harmonyFixtures)("matches every written chord and Roman identity in $tonic $mode", (fixture) => {
    const key: Key = { tonic: parseNote(fixture.tonic), mode: fixture.mode };
    for (const chordSize of chordSizes) {
      const result = buildDiatonicHarmony({ key, chordSize });
      const expected = chordSize === "triad" ? fixture.triads : fixture.sevenths;
      expect(result.key).toEqual(key);
      expect(result.chordSize).toBe(chordSize);
      expect(result.degrees).toHaveLength(7);
      for (const [index, [quality, label, spelling]] of expected.entries()) {
        const entry = result.degrees[index]!;
        expect(entry.degree).toBe(index + 1);
        expect(entry.chord.chordId).toBe(quality);
        expect(entry.chord.root).toEqual(parseNote(spelling.split(" ")[0]!));
        expect(entry.chord.tones.map(({ note }) => formatNote(note)).join(" ")).toBe(spelling);
        expect(entry.romanNumeral).toEqual({ degree: index + 1, quality, label });
      }
    }
  });

  it.each(conventionalSignatures)("preserves stacked scale thirds across $major major and $minor natural minor", (fixture) => {
    for (const mode of ["major", "minor"] as const) {
      const key: Key = { tonic: parseNote(fixture[mode]), mode };
      const scale = buildScale({ tonic: key.tonic, scaleId: mode === "major" ? "major" : "naturalMinor" });
      for (const chordSize of chordSizes) {
        const harmony = buildDiatonicHarmony({ key, chordSize });
        expect(harmony.degrees.map(({ degree }) => degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(harmony.degrees.map(({ chord }) => chord.chordId)).toEqual(qualities[mode][chordSize]);
        const offsets = chordSize === "triad" ? [0, 2, 4] : [0, 2, 4, 6];
        for (const [index, entry] of harmony.degrees.entries()) {
          const scaleNotes = offsets.map((offset) => scale.tones[(index + offset) % 7]!.note);
          expect(entry.chord.root).toEqual(scale.tones[index]!.note);
          expect(entry.chord.tones.map(({ note }) => note)).toEqual(scaleNotes);
          expect(entry.chord.tones.map(({ degree }) => degree)).toEqual(chordSize === "triad" ? [1, 3, 5] : [1, 3, 5, 7]);
          expect(entry.chord.formula).toBe(CHORD_FORMULAS[entry.chord.chordId]);
          expect(entry.romanNumeral.degree).toBe(entry.degree);
          expect(entry.romanNumeral.quality).toBe(entry.chord.chordId);
        }
        assertDeepFrozen(harmony);
        expect(buildDiatonicHarmony({ key, chordSize })).toEqual(harmony);
        expect(JSON.parse(JSON.stringify(harmony))).toEqual(harmony);
      }
    }
  });

  it("uses natural minor without substituting a raised-leading-tone dominant", () => {
    const key: Key = { tonic: parseNote("A"), mode: "minor" };
    const triads = buildDiatonicHarmony({ key, chordSize: "triad" });
    const sevenths = buildDiatonicHarmony({ key, chordSize: "seventh" });
    expect(triads.degrees[4]!.chord.chordId).toBe("minor");
    expect(triads.degrees[4]!.romanNumeral.label).toBe("v");
    expect(sevenths.degrees[4]!.chord.chordId).toBe("minor7");
    expect(sevenths.degrees[4]!.romanNumeral.label).toBe("v7");
    expect(sevenths.degrees[4]!.chord.tones.map(({ note }) => formatNote(note))).toEqual(["E", "G", "B", "D"]);
  });

  it("keeps E-sharp as a spelled diatonic root in F-sharp major", () => {
    const result = buildDiatonicHarmony({ key: { tonic: parseNote("F#"), mode: "major" }, chordSize: "seventh" });
    expect(result.degrees[6]!.chord.root).toEqual(parseNote("E#"));
    expect(result.degrees[6]!.chord.tones.map(({ note }) => formatNote(note))).toEqual(["E#", "G#", "B", "D#"]);
    expect(result.degrees[6]!.romanNumeral.label).toBe("viiø7");
  });

  it("supports theoretical keys outside the key-signature display range", () => {
    const gSharp = buildDiatonicHarmony({ key: { tonic: parseNote("G#"), mode: "major" }, chordSize: "seventh" });
    expect(gSharp.degrees[6]!.chord.root).toEqual(parseNote("F##"));
    expect(gSharp.degrees[6]!.chord.tones.map(({ note }) => formatNote(note))).toEqual(["F##", "A#", "C#", "E#"]);
    const doubleSharp = buildDiatonicHarmony({ key: { tonic: parseNote("C##"), mode: "major" }, chordSize: "triad" });
    expect(doubleSharp.degrees[0]!.chord.tones.map(({ note }) => formatNote(note))).toEqual(["C##", "E##", "G##"]);
    const doubleFlat = buildDiatonicHarmony({ key: { tonic: parseNote("Bbb"), mode: "minor" }, chordSize: "seventh" });
    expect(doubleFlat.degrees[0]!.chord.tones.map(({ note }) => formatNote(note))).toEqual(["Bbb", "Dbb", "Fb", "Abb"]);
    expect(doubleFlat.degrees[0]!.romanNumeral.label).toBe("i7");
  });

  it("validates direct-domain requests and classifies unsupported scope explicitly", () => {
    for (const request of [null, undefined, [], {}, { key: null, chordSize: "triad" }]) {
      assertMusicError(() => buildDiatonicHarmony(request as never), "INVALID_INPUT");
    }
    const key: Key = { tonic: parseNote("C"), mode: "major" };
    assertMusicError(() => buildDiatonicHarmony({ key, chordSize: 3 } as never), "INVALID_INPUT");
    assertMusicError(() => buildDiatonicHarmony({ key, chordSize: "ninth" } as never), "UNSUPPORTED");
    assertMusicError(() => buildDiatonicHarmony({ key: { tonic: key.tonic, mode: "dorian" }, chordSize: "triad" } as never), "UNSUPPORTED");
  });
});
