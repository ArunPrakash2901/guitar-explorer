import { describe, expect, it } from "vitest";
import { formatNote, parseNote } from "../../src/engine/core/pitch.js";
import { cycleChordVoicing, generateWorkspace, toggleChordLock } from "../../src/progression/workspace.js";
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
});
