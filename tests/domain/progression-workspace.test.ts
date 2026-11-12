import { describe, expect, it } from "vitest";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import { cycleChordVoicing, generateWorkspace, replaceWorkspaceChord, toggleChordLock } from "../../src/progression/workspace.js";
import { listProgressionChoices } from "../../src/progression/generator.js";
import type { ProgressionWorkspace } from "../../src/progression/workspace.js";

const cMajor = { tonic: parseNote("C"), mode: "major", seed: 42 } as const;

function requireWorkspace(result: ReturnType<typeof generateWorkspace>): ProgressionWorkspace {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

describe("progression workbench state", () => {
  it("keeps card order and tones tied to the engine-spelled modal context", () => {
    const { cards, scale } = requireWorkspace(generateWorkspace({
      tonic: parseNote("Db"), mode: "mixolydian", seed: 23,
    }));
    expect(cards.map(({ slot }) => [slot.slotIndex, slot.symbol, slot.romanNumeral])).toEqual([
      [0, "Db", "I"], [1, "Abm", "v"], [2, "Gb", "IV"], [3, "Db", "I"],
    ]);
    expect(cards[1]?.slot.chord.tones.map(({ note }) => formatNote(note))).toEqual(["Ab", "Cb", "Eb"]);
    expect(formatNote(scale.tones[6]!.note)).toBe("Cb");
  });

  it("preserves a locked chord and its grip while changing unlocked cards", () => {
    const original = requireWorkspace(generateWorkspace(cMajor));
    const selected = cycleChordVoicing(original, 0, 1);
    const locked = toggleChordLock(selected, 0);
    const regenerated = requireWorkspace(generateWorkspace({ ...cMajor, seed: 43 }, locked));
    expect(regenerated.cards[0]).toEqual(locked.cards[0]);
    expect(regenerated.cards.slice(1).map(({ slot }) => slot.symbol)).not.toEqual(
      original.cards.slice(1).map(({ slot }) => slot.symbol),
    );
    expect(original.cards[0]).toMatchObject({ slot: { isLocked: false }, voicingIndex: 0 });
  });

  it("returns an incompatible lock error and keeps the previous context available", () => {
    const locked = toggleChordLock(requireWorkspace(generateWorkspace(cMajor)), 0);
    const snapshot = structuredClone(locked);
    expect(generateWorkspace({ tonic: parseNote("C"), mode: "naturalMinor", seed: 43 }, locked))
      .toMatchObject({ ok: false, error: { code: "LOCK_OUT_OF_MODE", message: expect.stringContaining("Chord 1") } });
    expect(locked).toEqual(snapshot);
    expect(requireWorkspace(generateWorkspace({ ...cMajor, mode: "naturalMinor" }, toggleChordLock(locked, 0)))
      .cards[0]?.slot.symbol).toBe("Cm");
  });

  it("cycles one card's grip in both directions and wraps at the ends", () => {
    const initial = requireWorkspace(generateWorkspace(cMajor));
    const cycled = cycleChordVoicing(initial, 2, -1);
    expect(cycled.cards[2]?.voicingIndex).toBe(initial.cards[2]!.voicings.length - 1);
    expect(cycleChordVoicing(cycled, 2, 1)).toEqual(initial);
    expect(cycled.cards[0]).toBe(initial.cards[0]);
    expect(cycled.cards[2]?.slot).toBe(initial.cards[2]?.slot);
  });

  it("regenerates a fully locked progression with all four original chords", () => {
    const initial = requireWorkspace(generateWorkspace(cMajor));
    const locked = [0, 1, 2, 3].reduce(toggleChordLock, initial);
    const next = requireWorkspace(generateWorkspace({ ...cMajor, seed: 0 }, locked));
    expect(next.cards).toEqual(locked.cards);
    expect(next.context.seed).toBe(0);
  });

  it("selects playable open grips from a fixed key and retains them across generation", () => {
    const request = { ...cMajor, shapeFilter: "open", length: 2, style: "folk" } as const;
    const first = requireWorkspace(generateWorkspace(request));
    const second = requireWorkspace(generateWorkspace(request, toggleChordLock(first, 0)));
    expect(second.cards).toHaveLength(2);
    expect(second.cards.every(({ voicings }) => voicings.some(({ shapeFamily }) => shapeFamily === "open"))).toBe(true);
    expect(second.cards[0]!.slot).toEqual({ ...first.cards[0]!.slot, isLocked: true });
    expect(second.cards[1]!.slot.degree).not.toEqual(first.cards[1]!.slot.degree);
  });

  it("offers seven correctly spelled chords from the current engine context", () => {
    const major = listProgressionChoices(parseNote("C"), "major");
    expect(major).toHaveLength(7);
    expect(major.map(({ romanNumeral }) => romanNumeral)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(major.map(({ symbol }) => symbol)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    const mode = listProgressionChoices(parseNote("Db"), "mixolydian");
    expect(mode[4]).toMatchObject({ symbol: "Abm", romanNumeral: "v" });
    expect(mode[6]).toMatchObject({ symbol: "Cb", romanNumeral: "♭VII" });
    expect(Object.isFrozen(mode)).toBe(true);
  });

  it("replaces one chord, locks it and preserves it through regeneration", () => {
    const initial = requireWorkspace(generateWorkspace({
      tonic: parseNote("Db"), mode: "mixolydian", seed: 23,
    }));
    const updated = replaceWorkspaceChord(initial, 1, 7);
    expect(updated.cards[1]!.slot).toMatchObject({
      slotIndex: 1, degree: 7, symbol: "Cb", romanNumeral: "♭VII", isLocked: true,
    });
    expect(updated.cards[1]!.slot.chord.tones.map(({ note }) => formatNote(note))).toEqual(["Cb", "Eb", "Gb"]);
    expect(updated.cards[0]).toBe(initial.cards[0]);
    expect(updated.cards[2]).toBe(initial.cards[2]);
    expect(initial.cards[1]!.slot.symbol).toBe("Abm");
    const regenerated = requireWorkspace(generateWorkspace({
      tonic: parseNote("Db"), mode: "mixolydian", seed: 50,
    }, updated));
    expect(regenerated.cards[1]!.slot).toEqual(updated.cards[1]!.slot);
  });

  it("reports unsupported voicings explicitly for a selected diminished chord", () => {
    const initial = requireWorkspace(generateWorkspace(cMajor));
    const edited = replaceWorkspaceChord(initial, 2, 7);
    expect(edited.cards[2]!.slot).toMatchObject({ symbol: "Bdim", isLocked: true });
    expect(edited.cards[2]!.voicings).toEqual([]);
  });

  it("rejects out-of-range chord replacements without changing the progression", () => {
    const initial = requireWorkspace(generateWorkspace(cMajor));
    const original = structuredClone(initial);
    expect(() => replaceWorkspaceChord(initial, -1, 2)).toThrow(RangeError);
    expect(() => replaceWorkspaceChord(initial, 4, 2)).toThrow(RangeError);
    expect(() => replaceWorkspaceChord(initial, 0, 0)).toThrow(RangeError);
    expect(() => replaceWorkspaceChord(initial, 0, 8)).toThrow(RangeError);
    expect(initial).toEqual(original);
  });
});
