import { describe, expect, it } from "vitest";
import { formatNote, parseNote, parsePitch } from "../../src/engine/core/pitch.js";
import type { ScaleSpec } from "../../src/engine/core/types.js";
import { musicQueries } from "../../src/engine/query/index.js";
import type { QueryResult } from "../../src/engine/query/index.js";
import { phase2BScaleIds } from "../fixtures/scales.js";

function data<T>(result: QueryResult<T>): T {
  expect(result.schemaVersion).toBe(1);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected successful query: ${result.error.message}`);
  return result.data;
}

function expectFailure(result: QueryResult<unknown>, code: "INVALID_INPUT" | "UNSUPPORTED"): void {
  expect(result.schemaVersion).toBe(1);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected query failure");
  expect(result.error.code).toBe(code);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
}

function toneIdentity(tones: readonly Readonly<{ degree: number; alteration: number; note: ReturnType<typeof parseNote> }>[]) {
  return tones.map((tone) => [tone.degree, tone.alteration, formatNote(tone.note)]);
}

describe("Phase 2B public scale queries", () => {
  it.each(phase2BScaleIds)("exposes %s through schema-version-1 getScale", (scaleId) => {
    const request = { tonic: parseNote("C#"), scaleId } as const;
    const before = JSON.stringify(request);
    const first = musicQueries.getScale(request);
    const second = musicQueries.getScale(request);
    const scale = data(first);
    expect(scale.scaleId).toBe(scaleId);
    expect(Object.isFrozen(scale)).toBe(true);
    expect(Object.isFrozen(scale.formula)).toBe(true);
    expect(Object.isFrozen(scale.tones)).toBe(true);
    expect(second).toStrictEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toStrictEqual(first);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("keeps malformed and unsupported scale IDs as typed query failures", () => {
    expectFailure(musicQueries.getScale({ tonic: parseNote("C"), scaleId: "wholeTone" } as unknown as ScaleSpec), "UNSUPPORTED");
    expectFailure(musicQueries.getScale({ tonic: parseNote("C"), scaleId: 42 } as unknown as ScaleSpec), "INVALID_INPUT");
  });
});

describe("Phase 2B contextual scale analysis", () => {
  it("reports omitted pentatonic degrees without inventing a reference", () => {
    const [f, b] = data(musicQueries.analyseNotes({
      notes: [parsePitch("F4"), parsePitch("B4")],
      context: {
        key: { tonic: parseNote("C"), mode: "major" },
        activeScale: { tonic: parseNote("C"), scaleId: "majorPentatonic" },
      },
    }));

    expect(f?.keyRelation).toMatchObject({ degree: 4, alterationFromKey: 0, inKey: true });
    expect(f?.scaleRelation).toMatchObject({
      degree: 4,
      referenceStatus: "omitted",
      degreeReferences: [],
      alterationFromScale: null,
      matchingTones: [],
      inScale: false,
      spellingMatches: false,
    });
    expect(b?.scaleRelation).toMatchObject({
      degree: 7,
      referenceStatus: "omitted",
      degreeReferences: [],
      alterationFromScale: null,
      matchingTones: [],
      inScale: false,
    });
  });

  it("preserves both minor-blues degree-five references while matching the sounding identity", () => {
    const [flatFive, five] = data(musicQueries.analyseNotes({
      notes: [parsePitch("Gb4"), parsePitch("G4")],
      context: { activeScale: { tonic: parseNote("C"), scaleId: "minorBlues" } },
    }));

    for (const result of [flatFive, five]) {
      expect(result?.scaleRelation).toMatchObject({
        degree: 5,
        referenceStatus: "multiple",
        alterationFromScale: null,
        inScale: true,
        spellingMatches: true,
      });
      expect(toneIdentity(result!.scaleRelation!.degreeReferences)).toEqual([
        [5, -1, "Gb"],
        [5, 0, "G"],
      ]);
    }
    expect(toneIdentity(flatFive!.scaleRelation!.matchingTones)).toEqual([[5, -1, "Gb"]]);
    expect(toneIdentity(five!.scaleRelation!.matchingTones)).toEqual([[5, 0, "G"]]);
  });

  it("separates sounding membership from exact spelling in generalized scales", () => {
    const [fSharp] = data(musicQueries.analyseNotes({
      notes: [parsePitch("F#4")],
      context: { activeScale: { tonic: parseNote("C"), scaleId: "minorBlues" } },
    }));
    expect(fSharp?.scaleRelation).toMatchObject({
      degree: 4,
      referenceStatus: "single",
      alterationFromScale: 1,
      inScale: true,
      spellingMatches: false,
    });
    expect(toneIdentity(fSharp!.scaleRelation!.degreeReferences)).toEqual([[4, 0, "F"]]);
    expect(toneIdentity(fSharp!.scaleRelation!.matchingTones)).toEqual([[5, -1, "Gb"]]);
  });

  it("preserves major and natural-minor contextual behavior while adding reference evidence", () => {
    const [e, c] = data(musicQueries.analyseNotes({
      notes: [parsePitch("E4"), parsePitch("C4")],
      context: { activeScale: { tonic: parseNote("C"), scaleId: "major" } },
    }));
    expect(e?.scaleRelation).toMatchObject({
      degree: 3,
      referenceStatus: "single",
      alterationFromScale: 0,
      inScale: true,
      spellingMatches: true,
    });
    expect(toneIdentity(e!.scaleRelation!.degreeReferences)).toEqual([[3, 0, "E"]]);

    const [minorThird] = data(musicQueries.analyseNotes({
      notes: [parsePitch("C4")],
      context: { activeScale: { tonic: parseNote("A"), scaleId: "naturalMinor" } },
    }));
    expect(minorThird?.scaleRelation).toMatchObject({
      degree: 3,
      referenceStatus: "single",
      alterationFromScale: 0,
      inScale: true,
      spellingMatches: true,
    });
    expect(toneIdentity(c!.scaleRelation!.matchingTones)).toEqual([[1, 0, "C"]]);
  });
});
