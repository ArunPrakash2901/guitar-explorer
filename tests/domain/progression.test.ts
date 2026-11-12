import { describe, expect, it } from "vitest";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import { generateProgression, listProgressionChoices } from "../../src/progression/generator.js";
import type { GeneratedProgression, ProgressionRequest } from "../../src/progression/generator.js";

const request = (overrides: Partial<ProgressionRequest> = {}): ProgressionRequest => ({
  tonic: parseNote("C"),
  mode: "major",
  seed: 42,
  ...overrides,
});

function generated(input: ProgressionRequest): GeneratedProgression {
  const result = generateProgression(input);
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

describe("bounded four-chord progression generation", () => {
  it("reuses existing major harmony and returns Roman identities", () => {
    const result = generated(request());
    expect(result.slots).toHaveLength(4);
    for (const slot of result.slots) {
      expect(slot.degree).toBeGreaterThanOrEqual(1);
      expect(slot.degree).toBeLessThanOrEqual(7);
      expect(slot.chord.tones).toHaveLength(3);
      expect(slot.chord.tones[0]!.note).toEqual(slot.chord.root);
      expect(slot.romanNumeral).not.toBe("");
      expect(slot.symbol.startsWith(formatNote(slot.chord.root))).toBe(true);
    }
  });

  it("produces identical results for identical seed and request", () => {
    const input = request({ seed: 123456789 });
    expect(generated(input)).toEqual(generated(input));
  });

  it("offers different valid template sequences across seeds", () => {
    const variants = new Set(Array.from({ length: 32 }, (_, seed) =>
      generated(request({ seed })).slots.map((slot) => slot.symbol).join(" - ")));
    expect(variants.size).toBeGreaterThan(1);
  });

  it("preserves natural minor rather than silently raising the leading tone", () => {
    const result = generated(request({ tonic: parseNote("A"), mode: "naturalMinor" }));
    const symbols = result.slots.map((slot) => slot.symbol);
    expect(symbols[0]).toBe("Am");
    expect(symbols).not.toContain("E7");
    for (const slot of result.slots) {
      if (slot.degree === 5) expect(slot.symbol).toBe("Em");
    }
  });

  it("spells D-flat Mixolydian v as A-flat minor with C-flat", () => {
    const result = generated(request({
      tonic: parseNote("Db"),
      mode: "mixolydian",
      seed: 23,
      lockedSlots: [
        { slotIndex: 1, root: parseNote("Ab"), chordId: "minor" },
        { slotIndex: 3, root: parseNote("Db"), chordId: "major" },
      ],
    }));
    expect(result.selection).toBe("template");
    expect(result.slots.map((slot) => slot.symbol)).toEqual(["Db", "Abm", "Gb", "Db"]);
    expect(result.slots.map((slot) => slot.romanNumeral)).toEqual(["I", "v", "IV", "I"]);
    expect(result.slots[1]!.chord.tones.map(({ note }) => formatNote(note)))
      .toEqual(["Ab", "Cb", "Eb"]);
    expect(result.slots.map((slot) => slot.isLocked)).toEqual([false, true, false, true]);
  });

  it("uses flat-seven C-flat, not B, as the modal subtonic root", () => {
    const result = generated(request({
      tonic: parseNote("Db"),
      mode: "mixolydian",
      lockedSlots: [{ slotIndex: 1, root: parseNote("Cb"), chordId: "major" }],
    }));
    expect(result.slots[1]!.symbol).toBe("Cb");
    expect(result.slots[1]!.romanNumeral).toBe("♭VII");
    expect(result.slots[1]!.chord.tones.map(({ note }) => formatNote(note)))
      .toEqual(["Cb", "Eb", "Gb"]);
  });

  it("preserves an unusual diatonic locked chord through constrained fallback", () => {
    const result = generated(request({
      tonic: parseNote("Db"),
      mode: "mixolydian",
      lockedSlots: [{ slotIndex: 0, root: parseNote("F"), chordId: "diminished" }],
    }));
    expect(result.selection).toBe("constrained");
    expect(result.slots[0]).toMatchObject({ symbol: "Fdim", isLocked: true, romanNumeral: "iii°" });
    expect(result.slots.slice(1).every(({ chord }) => chord.chordId !== "diminished")).toBe(true);
  });

  it("uses seeded ties between connected major/minor paths after an unusual lock", () => {
    const lockedSlots = [{ slotIndex: 0, root: parseNote("D"), chordId: "minor" }] as const;
    const variants = new Set(Array.from({ length: 32 }, (_, seed) => {
      const result = generated(request({ seed, lockedSlots }));
      expect(result.selection).toBe("constrained");
      return result.slots.map(({ symbol }) => symbol).join(" ");
    }));
    expect(variants).toEqual(new Set(["Dm F Am C", "Dm Am F C"]));
  });

  it("retains all four locked slots unchanged", () => {
    const original = generated(request());
    const locks = original.slots.map(({ slotIndex, chord }) => ({
      slotIndex,
      root: chord.root,
      chordId: chord.chordId,
    }));
    const regenerated = generated(request({ seed: 2, lockedSlots: locks }));
    expect(regenerated.slots.map(({ symbol }) => symbol))
      .toEqual(original.slots.map(({ symbol }) => symbol));
    expect(regenerated.slots.every(({ isLocked }) => isLocked)).toBe(true);
  });

  it("returns a conflict instead of silently changing an out-of-mode lock", () => {
    const result = generateProgression(request({
      lockedSlots: [{ slotIndex: 2, root: parseNote("Db"), chordId: "major" }],
    }));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "LOCK_OUT_OF_MODE", message: expect.stringContaining("Chord 3") },
    });
    expect(Object.isFrozen(result)).toBe(true);
    if (!result.ok) expect(Object.isFrozen(result.error)).toBe(true);
  });

  it("distinguishes malformed lock input from a well-formed unsupported chord", () => {
    const malformed = [
      { slotIndex: 0, root: { letter: "H", accidental: 0 }, chordId: "major" },
      { slotIndex: 0, root: { letter: "A", accidental: 0.5 }, chordId: "major" },
      { slotIndex: 0, root: parseNote("C"), chordId: "made-up" },
    ];
    for (const lock of malformed) {
      const lockedSlots = [lock] as ProgressionRequest["lockedSlots"];
      expect(generateProgression(request({ lockedSlots: lockedSlots! })))
        .toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
    expect(generateProgression(request({
      lockedSlots: [{ slotIndex: 0, root: parseNote("C"), chordId: "sus4" }],
    }))).toMatchObject({ ok: false, error: { code: "LOCK_OUT_OF_MODE" } });
  });

  it("rejects oversized lock arrays and unformattable theoretical keys", () => {
    expect(generateProgression(request({
      lockedSlots: Array.from({ length: 5 }, (_, slotIndex) => ({ slotIndex, root: parseNote("C"), chordId: "major" })),
    }))).toMatchObject({ ok: false, error: { code: "INVALID_INPUT", message: expect.stringContaining("at most four") } });
    expect(generateProgression(request({ tonic: { letter: "C", accidental: 4097 }, mode: "mixolydian" })))
      .toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("rejects duplicate slots, invalid indices and invalid seeds", () => {
    const chord = { root: parseNote("C"), chordId: "major" } as const;
    const invalid = [
      request({ lockedSlots: [{ slotIndex: 0, ...chord }, { slotIndex: 0, ...chord }] }),
      request({ lockedSlots: [{ slotIndex: 4, ...chord }] }),
      request({ seed: -1 }),
      request({ seed: 2 ** 32 }),
      request({ seed: 0.5 }),
    ];
    for (const input of invalid) {
      expect(generateProgression(input)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
  });

  it("rejects unsupported mode requests without expanding the core", () => {
    const result = generateProgression(request({ mode: "locrian" as ProgressionRequest["mode"] }));
    expect(result).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_MODE" } });
  });

  it("harmonizes D Dorian without raising the characteristic sixth", () => {
    const tonic = parseNote("D");
    const choices = listProgressionChoices(tonic, "dorian");
    expect(choices.map(({ romanNumeral }) => romanNumeral))
      .toEqual(["i", "ii", "♭III", "IV", "v", "vi°", "♭VII"]);
    expect(choices.map(({ symbol }) => symbol))
      .toEqual(["Dm", "Em", "F", "G", "Am", "Bdim", "C"]);
    for (const seed of [0, 1, 8, 29]) {
      const result = generated(request({ tonic, mode: "dorian", seed }));
      expect(result.slots[0]!.symbol).toBe("Dm");
      expect(result.slots.every(({ chord }) => chord.chordId !== "diminished")).toBe(true);
    }
  });

  it("derives Phrygian flat second from the written scale", () => {
    const tonic = parseNote("E");
    const choices = listProgressionChoices(tonic, "phrygian");
    expect(choices[0]).toMatchObject({ symbol: "Em", romanNumeral: "i" });
    expect(choices[1]).toMatchObject({ symbol: "F", romanNumeral: "♭II" });
    expect(choices[1]!.chord.tones.map(({ note }) => formatNote(note)))
      .toEqual(["F", "A", "C"]);
    const result = generated(request({ tonic, mode: "phrygian", seed: 2 }));
    expect(result.slots[0]!.symbol).toBe("Em");
    expect(result.slots.some(({ symbol }) => symbol === "F")).toBe(true);
  });

  it("derives Lydian raised fourth and major II without treating it as a tonic dominant", () => {
    const tonic = parseNote("F");
    const choices = listProgressionChoices(tonic, "lydian");
    expect(choices.map(({ symbol }) => symbol))
      .toEqual(["F", "G", "Am", "Bdim", "C", "Dm", "Em"]);
    expect(choices[1]).toMatchObject({ symbol: "G", romanNumeral: "II" });
    expect(choices[3]).toMatchObject({ symbol: "Bdim", romanNumeral: "♯iv°" });
    const result = generated(request({ tonic, mode: "lydian", seed: 7 }));
    expect(result.slots[0]!.romanNumeral).toBe("I");
    expect(result.slots.some(({ romanNumeral }) => romanNumeral === "II")).toBe(true);
  });

  it("returns immutable progression and chord values", () => {
    const tonic = { ...parseNote("C"), metadata: { source: "caller" } };
    const result = generated(request({ tonic }));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tonic)).toBe(true);
    expect(result.tonic).toEqual(parseNote("C"));
    expect(Object.isFrozen(result.slots)).toBe(true);
    expect(result.slots.every((slot) => Object.isFrozen(slot) && Object.isFrozen(slot.chord))).toBe(true);
  });
});
