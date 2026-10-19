import { describe, expect, it } from "vitest";
import { buildScale, SCALE_FORMULAS } from "../../src/engine/core/collections.js";
import { transposeNote } from "../../src/engine/core/intervals.js";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import type { ScaleId } from "../../src/engine/core/types.js";
import { phase2BFormulas, phase2BScaleIds, phase2BScaleSpellings } from "../fixtures/scales.js";

const allScaleIds = Object.keys(SCALE_FORMULAS) as ScaleId[];
const MAJOR_SECOND = Object.freeze({ diatonicSteps: 1, semitones: 2 });

describe("Phase 2B scale catalog", () => {
  it.each(phase2BScaleIds)("stores %s as the approved structured formula", (scaleId) => {
    expect(SCALE_FORMULAS[scaleId].map(({ degree, alteration }) => [degree, alteration]))
      .toEqual(phase2BFormulas[scaleId]);
  });

  it.each(phase2BScaleSpellings)("spells $tonic $scaleId without enharmonic substitution", ({ tonic, scaleId, notes }) => {
    const scale = buildScale({ tonic: parseNote(tonic), scaleId });
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
  });

  it("spells a double-accidental tonic without collapsing written identity", () => {
    const scale = buildScale({ tonic: parseNote("F##"), scaleId: "harmonicMinor" });
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual([
      "F##", "G##", "A#", "B#", "C##", "D#", "E##",
    ]);
  });

  it("keeps every catalog formula frozen, ordered and identity-unique", () => {
    expect(Object.isFrozen(SCALE_FORMULAS)).toBe(true);
    for (const scaleId of allScaleIds) {
      const formula = SCALE_FORMULAS[scaleId];
      expect(Object.isFrozen(formula)).toBe(true);
      expect(formula.every(Object.isFrozen)).toBe(true);
      expect(new Set(formula.map(({ degree, alteration }) => `${degree}:${alteration}`)).size).toBe(formula.length);

      const scale = buildScale({ tonic: parseNote("C"), scaleId });
      const semitones = scale.tones.map((tone) => tone.interval.semitones);
      for (let index = 1; index < semitones.length; index += 1) {
        expect(semitones[index]!).toBeGreaterThan(semitones[index - 1]!);
      }
      expect(Object.isFrozen(scale)).toBe(true);
      expect(Object.isFrozen(scale.tones)).toBe(true);
      expect(scale.tones.every(Object.isFrozen)).toBe(true);
    }
  });

  it("preserves each scale formula when the tonic is transposed", () => {
    for (const scaleId of allScaleIds) {
      for (const tonicName of ["C", "F#", "Bb"] as const) {
        const tonic = parseNote(tonicName);
        const transposedTonic = transposeNote(tonic, MAJOR_SECOND);
        const original = buildScale({ tonic, scaleId });
        const moved = buildScale({ tonic: transposedTonic, scaleId });
        expect(moved.formula).toBe(SCALE_FORMULAS[scaleId]);
        expect(moved.tones.map((tone) => tone.note)).toEqual(
          original.tones.map((tone) => transposeNote(tone.note, MAJOR_SECOND)),
        );
        expect(moved.tones.map((tone) => [tone.degree, tone.alteration])).toEqual(
          original.tones.map((tone) => [tone.degree, tone.alteration]),
        );
      }
    }
  });

  it("retains both flat-five and perfect-five identities in minor blues", () => {
    const scale = buildScale({ tonic: parseNote("C"), scaleId: "minorBlues" });
    expect(scale.tones.map(({ degree, alteration }) => [degree, alteration])).toEqual([
      [1, 0], [3, -1], [4, 0], [5, -1], [5, 0], [7, -1],
    ]);
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual(["C", "Eb", "F", "Gb", "G", "Bb"]);
    expect(scale.tones.map((tone) => tone.interval.semitones)).toEqual([0, 3, 5, 6, 7, 10]);
  });
});
