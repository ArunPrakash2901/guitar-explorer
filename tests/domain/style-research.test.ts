import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveInterval, derivePosition } from "../../src/research/engine-adapter.js";
import { validateResearchFragment } from "../../src/research/contract.js";

function fixture(id: string) {
  return JSON.parse(readFileSync(new URL(`../fixtures/style/${id}.json`, import.meta.url), "utf8")) as unknown;
}
const underBridge = validateResearchFragment(fixture("jf-cand-004"));
const cantStop = validateResearchFragment(fixture("jf-cand-012"));
const pastRecedes = validateResearchFragment(fixture("jf-cand-011"));

describe("research contract v0", () => {
  it("round-trips three contrasting source-backed fragments without defaults", () => {
    for (const record of [underBridge, cantStop, pastRecedes]) {
      expect(validateResearchFragment(JSON.parse(JSON.stringify(record)))).toEqual(record);
      expect(record.observations.every((o) => o.sourceIds.length > 0)).toBe(true);
    }
    expect(underBridge.observations.find((o) => o.id === "ub-studio-position")).toMatchObject({
      status: "unknown", value: { stringIndex: null, fret: null },
    });
    expect(pastRecedes.observations.find((o) => o.id === "pr-studio-position")).toMatchObject({
      status: "unknown", value: { stringIndex: null, fret: null },
    });
    expect(cantStop.observations.find((o) => o.id === "cs-muted-stroke")).toMatchObject({
      value: { atBeats: null, pitched: [{ stringIndex: 3, fret: 7 }], mutedStringIndices: [0, 1, 2, 4, 5] },
    });
    expect(pastRecedes.observations.find((o) => o.id === "pr-video-g")).toMatchObject({
      value: { pitched: expect.arrayContaining([{ stringIndex: 0, fret: 3 }]), mutedStringIndices: [] },
    });
  });

  it("rejects unsupported interpretation masquerading as observation and source-less claims", () => {
    const sourceLess = structuredClone(cantStop);
    (sourceLess.observations[0] as unknown as { sourceIds: string[] }).sourceIds = [];
    expect(() => validateResearchFragment(sourceLess)).toThrow(/sourceIds/);
    const leaked = structuredClone(underBridge);
    (leaked.observations[0] as unknown as Record<string, unknown>).harmonicFunction = "V/vi";
    expect(() => validateResearchFragment(leaked)).toThrow(/harmonicFunction/);
    const falseCertainty = structuredClone(underBridge);
    (falseCertainty.interpretations[0] as unknown as { deterministic: boolean }).deterministic = true;
    expect(() => validateResearchFragment(falseCertainty)).toThrow(/deterministic/);
  });

  it("keeps realization-specific physical evidence out of the studio", () => {
    const wrong = structuredClone(underBridge);
    (wrong.observations.find((o) => o.id === "ub-live-position") as unknown as { realizationId: string }).realizationId = "ub-studio";
    expect(() => validateResearchFragment(wrong)).toThrow(/another realization/);
    expect(underBridge.alternatives.map((a) => a.status)).toEqual(["unresolved", "unresolved"]);
    expect(cantStop.alternatives[0]?.options).toHaveLength(2);
    expect(cantStop.observations.find((o) => o.id === "cs-studio-unknown")?.realizationId).toBe("cs-studio");
  });

  it("delegates pitch, degree, chord role and interval to the existing Music Engine under explicit assumptions", () => {
    const note = derivePosition(cantStop, "cs-open-d", ["cs-standard", "cs-key-e", "cs-chord-d"], "derived-d3");
    expect(note.engineQuery).toBe("getNoteAtFret");
    expect(note.assumptionIds).toEqual(["cs-standard", "cs-key-e", "cs-chord-d"]);
    expect(note.result).toMatchObject({
      name: "D3", keyRelation: { degree: 7, inKey: true }, chordRelation: { isChordTone: true },
    });
    expect(() => derivePosition(cantStop, "cs-muted-stroke", ["cs-standard"], "unsupported")).toThrow(/physical-position/);
    const interval = deriveInterval(cantStop, "cs-upper-d", "cs-upper-e", ["cs-standard"], "derived-whole-step");
    expect(interval).toMatchObject({
      engineQuery: "getInterval", observationIds: ["cs-upper-d", "cs-upper-e"], result: { semitones: 2 },
    });
    expect(() => derivePosition(cantStop, "cs-studio-unknown", ["cs-standard"], "unknown")).toThrow(/known physical/);
    expect(validateResearchFragment({
      ...cantStop, derivations: [note, interval],
    }).derivations).toHaveLength(2);
  });

  it("rejects pitched/muted overlap and preserves ordinary chord evidence", () => {
    const overlap = structuredClone(cantStop);
    const stroke = overlap.observations.find((o) => o.id === "cs-muted-stroke")!;
    if (stroke.kind !== "string_stroke") throw new Error("bad test fixture");
    (stroke.value.mutedStringIndices as number[]).push(3);
    expect(() => validateResearchFragment(overlap)).toThrow(/sound and mute/);
    const chord = pastRecedes.observations.find((o) => o.id === "pr-video-g");
    expect(chord?.kind).toBe("string_stroke");
    if (chord?.kind === "string_stroke") expect(chord.value.pitched).toHaveLength(6);
  });
});
