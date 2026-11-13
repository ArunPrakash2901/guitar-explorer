import { describe, expect, it } from "vitest";
import { buildChord, buildScale } from "../../src/engine/core/collections.js";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import { COLOR_GROUPS, COLOR_IDS, selectedChordColors } from "../../src/progression/chord-colors.js";
import { generateProgression, isBluesMode, listProgressionChoices, listProgressionVariants } from "../../src/progression/generator.js";
import { getPlayableVoicings } from "../../src/progression/voicings.js";
import { generateWorkspace } from "../../src/progression/workspace.js";

const tonic = parseNote("C");
const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const modes = ["major", "naturalMinor", "dorian", "phrygian", "lydian", "mixolydian", "locrian",
  "majorBlues", "minorBlues", "harmonicMinor", "melodicMinorAscending"] as const;

describe("independent chord colors", () => {
  it("offers distinct playable chord identities in seven groups", () => {
    expect(COLOR_GROUPS.map(({ name }) => name)).toEqual(["7ths", "Sus/add", "6ths", "9ths", "11ths", "13ths", "Dim/aug"]);
    expect(COLOR_GROUPS.flatMap(({ chords }) => chords.map(({ id }) => id)).sort()).toEqual([...COLOR_IDS].sort());
    expect(new Set(COLOR_IDS).size).toBe(COLOR_IDS.length);
    expect(selectedChordColors(["major7", "major7", "minor9"])).toEqual(["major7", "minor9"]);
    expect(selectedChordColors(["major", "unknown"])).toBeNull();
    for (const quality of COLOR_IDS) {
      for (const root of roots) {
        const chord = buildChord({ root: parseNote(root), chordId: quality });
        const voicings = getPlayableVoicings(chord);
        expect(voicings.length, quality + " in " + root).toBeGreaterThan(0);
        const required = chord.tones.length > 5 || ["dominant7Flat9", "dominant7Sharp9"].includes(quality)
          ? chord.tones.filter(({ degree }) => [1, 3, 7, chord.tones.at(-1)!.degree].includes(degree)) : chord.tones;
        for (const voicing of voicings) {
          expect(required.every(({ pitchClass }) => voicing.notes.some((note) => note.pitchClass === pitchClass))).toBe(true);
        }
      }
      const example = modes.flatMap((mode) => listProgressionVariants(tonic, mode, [quality])
        .filter(({ chord }) => chord.chordId === quality).map((chord) => ({ mode, chord }))).at(0);
      expect(example, quality).toBeDefined();
      const generated = generateWorkspace({ tonic, mode: example!.mode, seed: 3, colors: [quality], length: 4,
        allowedDegrees: [example!.chord.degree], shapeFilter: "all" });
      expect(generated.ok && generated.data.cards.every(({ slot }) => slot.chord.chordId === quality), quality).toBe(true);
    }
  });

  it("keeps locked identities while restricting unlocked generation", () => {
    const result = generateProgression({ tonic, mode: "major", seed: 9, length: 12, colors: ["minor7", "major9"],
      lockedSlots: [{ slotIndex: 2, root: tonic, chordId: "add9" }] });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.slots[2]?.chord.chordId).toBe("add9");
    expect(result.data.slots.filter(({ isLocked }) => !isLocked).every(({ chord }) =>
      ["major", "minor", "minor7", "major9"].includes(chord.chordId))).toBe(true);
    const basic = generateProgression({ tonic, mode: "locrian", seed: 19, length: 16, colors: [] });
    expect(basic.ok && basic.data.slots.every(({ chord }) => ["major", "minor"].includes(chord.chordId))).toBe(true);
  });
});

describe("expanded progression contexts", () => {
  it("uses distinct major and minor blues solo scales with practical backing harmony", () => {
    expect(buildScale({ tonic, scaleId: "majorBlues" }).tones.map(({ note }) => formatNote(note)))
      .toEqual(["C", "D", "Eb", "E", "G", "A"]);
    expect(buildScale({ tonic, scaleId: "minorBlues" }).tones.map(({ note }) => formatNote(note)))
      .toEqual(["C", "Eb", "F", "Gb", "G", "Bb"]);
    expect(listProgressionChoices(tonic, "majorBlues").map(({ symbol }) => symbol)).toEqual(["C", "F", "G"]);
    expect(listProgressionChoices(tonic, "minorBlues").map(({ symbol }) => symbol)).toEqual(["Cm", "Fm", "G"]);
    for (const mode of modes.filter(isBluesMode)) {
      const result = generateWorkspace({ tonic, mode, seed: 8, length: 12, colors: ["dominant7"], shapeFilter: "all" });
      if (!result.ok) throw new Error(result.error.message);
      const degrees = result.data.cards.map(({ slot }) => slot.degree);
      expect([1, 4]).toContain(degrees[1]);
      expect(degrees).toEqual([1, degrees[1], 1, 1, 4, 4, 1, 1, 5, 4, 1, 5]);
      expect(result.data.cards.some(({ slot }) => slot.symbol === "G7")).toBe(true);
    }
  });

  it("derives harmonic and ascending melodic minor triads by written thirds", () => {
    for (const root of roots.map(parseNote)) {
      for (const mode of ["harmonicMinor", "melodicMinorAscending"] as const) {
        const scale = buildScale({ tonic: root, scaleId: mode });
        const choices = listProgressionChoices(root, mode);
        expect(choices).toHaveLength(7);
        expect(choices[4]?.chord.chordId).toBe("major");
        expect(choices[2]?.chord.chordId).toBe("augmented");
        for (const [index, { chord }] of choices.entries()) {
          expect(chord.tones.map(({ note }) => note)).toEqual([0, 2, 4].map((step) => scale.tones[(index + step) % 7]?.note));
        }
      }
    }
  });
});
