import { describe, expect, it } from "vitest";
import { buildChordCatalog } from "../../src/engine/core/chords.js";
import { CHORD_FORMULAS, buildChord } from "../../src/engine/core/collections.js";
import { analysePitch } from "../../src/engine/core/context.js";
import { getIntervalBetweenPitches, transposeNote } from "../../src/engine/core/intervals.js";
import { formatNote, parseNote, parsePitch, pitchClass } from "../../src/engine/core/pitch.js";
import type { ChordId, NoteLetter, NoteName } from "../../src/engine/core/types.js";
import { chordCatalogFixtures, chordSymbolFixtures, difficultChordSpellings } from "../fixtures/chords.js";

const LETTERS: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
const BASELINE = [0, 2, 4, 5, 7, 9, 11] as const;

function formulaPairs(id: ChordId): readonly (readonly [number, number])[] {
  return CHORD_FORMULAS[id].map((tone) => [tone.degree, tone.alteration] as const);
}

function expectedLetter(root: NoteName, degree: number): NoteLetter {
  const rootIndex = LETTERS.indexOf(root.letter);
  return LETTERS[(rootIndex + degree - 1) % LETTERS.length]!;
}

describe("Phase 2C chord formulas", () => {
  it("declares every approved formula exactly once in CHORD_FORMULAS", () => {
    expect(Object.keys(CHORD_FORMULAS)).toEqual(chordCatalogFixtures.map(({ id }) => id));
    for (const fixture of chordCatalogFixtures) {
      expect(formulaPairs(fixture.id)).toEqual(fixture.formula);
    }
  });

  it.each(difficultChordSpellings)("spells $root $id without enharmonic substitution", ({ root, id, notes }) => {
    const chord = buildChord({ root: parseNote(root), chordId: id });
    expect(chord.tones.map((tone) => formatNote(tone.note))).toEqual(notes);
  });

  it("preserves compound chord roles independently of pitch-class equivalence", () => {
    const add9 = analysePitch(parsePitch("D4"), { currentChord: { root: parseNote("C"), chordId: "add9" } });
    const sus2 = analysePitch(parsePitch("D4"), { currentChord: { root: parseNote("C"), chordId: "sus2" } });
    const thirteen = analysePitch(parsePitch("A4"), { currentChord: { root: parseNote("C"), chordId: "major13" } });
    const six = analysePitch(parsePitch("A4"), { currentChord: { root: parseNote("C"), chordId: "major6" } });
    expect(add9.chordRelation?.matchingTones[0]).toMatchObject({ degree: 9, interval: { label: "M9" } });
    expect(sus2.chordRelation?.matchingTones[0]).toMatchObject({ degree: 2, interval: { label: "M2" } });
    expect(thirteen.chordRelation?.matchingTones[0]).toMatchObject({ degree: 13, interval: { label: "M13" } });
    expect(six.chordRelation?.matchingTones[0]).toMatchObject({ degree: 6, interval: { label: "M6" } });
  });

  it("distinguishes formula interval from the interval physically sounded", () => {
    const thirteen = buildChord({ root: parseNote("C"), chordId: "dominant13" }).tones.at(-1)!;
    const played = getIntervalBetweenPitches(parsePitch("C3"), parsePitch("A3"));
    expect(thirteen).toMatchObject({ degree: 13, note: parseNote("A"), interval: { label: "M13", semitones: 21 } });
    expect(played).toMatchObject({ label: "M6", semitones: 9 });
  });

  it("keeps diminished-seventh spelling separate from sounding membership", () => {
    const context = { currentChord: { root: parseNote("C"), chordId: "diminished7" as const } };
    const spelled = analysePitch(parsePitch("Bbb3"), context);
    const enharmonic = analysePitch(parsePitch("A3"), context);
    expect(spelled.chordRelation).toMatchObject({ isChordTone: true, spellingMatches: true });
    expect(enharmonic.chordRelation).toMatchObject({ isChordTone: true, spellingMatches: false });
    expect(enharmonic.chordRelation?.matchingTones[0]).toMatchObject({ degree: 7, alteration: -2, note: parseNote("Bbb") });
  });

  it("satisfies catalogue-wide construction invariants over finite theoretical roots", () => {
    for (const letter of LETTERS) {
      for (let accidental = -2; accidental <= 2; accidental += 1) {
        const root = Object.freeze({ letter, accidental });
        for (const fixture of chordCatalogFixtures) {
          const chord = buildChord({ root, chordId: fixture.id });
          expect(chord.formula).toBe(CHORD_FORMULAS[fixture.id]);
          expect(chord.tones).toHaveLength(fixture.formula.length);
          expect(Object.isFrozen(chord)).toBe(true);
          expect(Object.isFrozen(chord.tones)).toBe(true);
          expect(JSON.parse(JSON.stringify(chord))).toEqual(chord);
          for (const [index, tone] of chord.tones.entries()) {
            const [degree, alteration] = fixture.formula[index]!;
            const diatonicSteps = degree - 1;
            const expectedSemitones = BASELINE[diatonicSteps % 7]! + 12 * Math.floor(diatonicSteps / 7) + alteration;
            expect(tone).toMatchObject({ degree, alteration, interval: { number: degree, semitones: expectedSemitones } });
            expect(tone.note.letter).toBe(expectedLetter(root, degree));
            expect(tone.note).toEqual(transposeNote(root, tone.interval));
            expect(tone.pitchClass).toBe(pitchClass(tone.note));
            expect(tone.pitchClass).toBe((pitchClass(root) + expectedSemitones) % 12);
          }
        }
      }
    }
  });
});

describe("Phase 2C chord catalogue", () => {
  it("attaches the single authoritative formula objects to presentation metadata", () => {
    const catalog = buildChordCatalog();
    expect(catalog.map(({ id }) => id)).toEqual([
      "triads", "suspended", "powerOpen", "sixth", "seventh",
      "addedTone", "ninth", "eleventh", "thirteenth", "alteredDominant",
    ]);
    expect(catalog.flatMap(({ chords }) => chords)).toHaveLength(chordCatalogFixtures.length);
    for (const entry of catalog.flatMap(({ chords }) => chords)) {
      expect(entry.formula).toBe(CHORD_FORMULAS[entry.id]);
      expect(Object.isFrozen(entry)).toBe(true);
    }
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(catalog.every((family) => Object.isFrozen(family) && Object.isFrozen(family.chords))).toBe(true);
    for (const fixture of chordCatalogFixtures) {
      const entry = catalog.flatMap(({ chords }) => chords).find(({ id }) => id === fixture.id)!;
      expect(entry.family).toBe(fixture.family);
      expect(entry.symbol).toBe(chordSymbolFixtures[fixture.id]);
      expect(entry.displayName.length).toBeGreaterThan(0);
      expect(Object.keys(entry)).toEqual(["id", "family", "displayName", "symbol", "formula"]);
    }
  });
});
