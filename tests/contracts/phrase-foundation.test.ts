import { describe, expect, it } from "vitest";
import {
  buildPhrase, comparePhraseContour, comparePhraseIntervals, comparePhraseRhythm,
  extractPhraseFragment, extractPhraseFragmentQuery, getPhrase, getPhraseContour,
  getPhraseIntervals, MusicError, musicQueries, transposePhrase, transposePhraseQuery,
} from "../../src/engine/index.js";
import type { QueryResult } from "../../src/engine/query/index.js";
import {
  PROOF_CONTOUR, PROOF_CONTOUR_ALTERNATIVE, PROOF_CROP, PROOF_FRAGMENT,
  PROOF_INTERVALS, PROOF_PHRASE, PROOF_UP_M2, q,
} from "../fixtures/phrases.js";

const cases: readonly {
  name: string;
  request: object;
  requiredField: string;
  run: (request: unknown) => QueryResult<unknown>;
}[] = [
  { name: "getPhrase", request: PROOF_PHRASE, requiredField: "duration", run: (request) => musicQueries.getPhrase(request as never) },
  { name: "getPhraseIntervals", request: { phrase: PROOF_PHRASE }, requiredField: "phrase", run: (request) => musicQueries.getPhraseIntervals(request as never) },
  { name: "getPhraseContour", request: { phrase: PROOF_PHRASE }, requiredField: "phrase", run: (request) => musicQueries.getPhraseContour(request as never) },
  { name: "transposePhrase", request: { phrase: PROOF_PHRASE, interval: { diatonicSteps: 1, semitones: 2 } }, requiredField: "interval", run: (request) => musicQueries.transposePhrase(request as never) },
  { name: "extractPhraseFragment", request: { phrase: PROOF_PHRASE, range: PROOF_CROP }, requiredField: "range", run: (request) => musicQueries.extractPhraseFragment(request as never) },
  { name: "comparePhraseIntervals", request: { left: PROOF_PHRASE, right: PROOF_UP_M2 }, requiredField: "right", run: (request) => musicQueries.comparePhraseIntervals(request as never) },
  { name: "comparePhraseContour", request: { left: PROOF_PHRASE, right: PROOF_CONTOUR_ALTERNATIVE }, requiredField: "right", run: (request) => musicQueries.comparePhraseContour(request as never) },
  { name: "comparePhraseRhythm", request: { left: PROOF_PHRASE, right: PROOF_UP_M2 }, requiredField: "right", run: (request) => musicQueries.comparePhraseRhythm(request as never) },
];

function failure(result: QueryResult<unknown>, code = "INVALID_INPUT"): void {
  expect(result.schemaVersion).toBe(1);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected a query error");
  expect(Object.keys(result).sort()).toEqual(["error", "ok", "schemaVersion"]);
  expect(Object.keys(result.error).sort()).toEqual(["code", "message"]);
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
}

describe("Phrase Foundation PR 1 query contract", () => {
  it("has collision-safe named query aliases and distinct direct Core operations", () => {
    expect(getPhrase).toBe(musicQueries.getPhrase);
    expect(getPhraseIntervals).toBe(musicQueries.getPhraseIntervals);
    expect(getPhraseContour).toBe(musicQueries.getPhraseContour);
    expect(transposePhraseQuery).toBe(musicQueries.transposePhrase);
    expect(extractPhraseFragmentQuery).toBe(musicQueries.extractPhraseFragment);
    expect(comparePhraseIntervals).toBe(musicQueries.comparePhraseIntervals);
    expect(comparePhraseContour).toBe(musicQueries.comparePhraseContour);
    expect(comparePhraseRhythm).toBe(musicQueries.comparePhraseRhythm);
    expect(transposePhrase).not.toBe(transposePhraseQuery);
    expect(extractPhraseFragment).not.toBe(extractPhraseFragmentQuery);
    expect(buildPhrase(PROOF_PHRASE)).toStrictEqual(PROOF_PHRASE);
  });

  it("returns the approved proof facts through all eight wrappers without harmony", () => {
    expect(musicQueries.getPhrase(PROOF_PHRASE)).toStrictEqual({ schemaVersion: 1, ok: true, data: PROOF_PHRASE });
    const intervals = musicQueries.getPhraseIntervals({ phrase: PROOF_PHRASE });
    expect(intervals.ok).toBe(true);
    if (intervals.ok) expect(intervals.data.map(({ diatonicSteps, semitones }) => ({ diatonicSteps, semitones }))).toStrictEqual(PROOF_INTERVALS);
    expect(musicQueries.getPhraseContour({ phrase: PROOF_PHRASE })).toStrictEqual({ schemaVersion: 1, ok: true, data: PROOF_CONTOUR });
    expect(musicQueries.transposePhrase({ phrase: PROOF_PHRASE, interval: { diatonicSteps: 1, semitones: 2 } }))
      .toStrictEqual({ schemaVersion: 1, ok: true, data: PROOF_UP_M2 });
    expect(musicQueries.extractPhraseFragment({ phrase: PROOF_PHRASE, range: PROOF_CROP }))
      .toStrictEqual({ schemaVersion: 1, ok: true, data: PROOF_FRAGMENT });
    expect(musicQueries.comparePhraseIntervals({ left: PROOF_PHRASE, right: PROOF_UP_M2 })).toStrictEqual({ schemaVersion: 1, ok: true, data: true });
    expect(musicQueries.comparePhraseContour({ left: PROOF_PHRASE, right: PROOF_CONTOUR_ALTERNATIVE })).toStrictEqual({ schemaVersion: 1, ok: true, data: true });
    expect(musicQueries.comparePhraseRhythm({ left: PROOF_PHRASE, right: PROOF_UP_M2 })).toStrictEqual({ schemaVersion: 1, ok: true, data: true });
    expect(musicQueries.comparePhraseIntervals({ left: PROOF_PHRASE, right: PROOF_CONTOUR_ALTERNATIVE })).toStrictEqual({ schemaVersion: 1, ok: true, data: false });
    expect(musicQueries.comparePhraseContour({ left: PROOF_PHRASE, right: { duration: q(0), events: [] } })).toStrictEqual({ schemaVersion: 1, ok: true, data: false });
    expect(musicQueries.comparePhraseRhythm({ left: PROOF_PHRASE, right: { ...PROOF_PHRASE, duration: q(5) } })).toStrictEqual({ schemaVersion: 1, ok: true, data: false });
  });

  it.each(cases)("$name is deterministic, JSON-safe and leaves caller ownership intact", ({ request, run }) => {
    const input = structuredClone(request);
    const snapshot = structuredClone(input);
    const first = run(input);
    expect(first.ok).toBe(true);
    expect(Object.keys(first).sort()).toEqual(["data", "ok", "schemaVersion"]);
    expect(JSON.parse(JSON.stringify(first))).toStrictEqual(first);
    expect(run(JSON.parse(JSON.stringify(input)))).toStrictEqual(first);
    expect(run(input)).toStrictEqual(first);
    expect(input).toStrictEqual(snapshot);
    function mutable(value: unknown): void {
      if (value === null || typeof value !== "object") return;
      expect(Object.isFrozen(value)).toBe(false);
      for (const nested of Object.values(value)) mutable(nested);
    }
    mutable(input);
  });

  it.each(cases)("$name preserves typed failure envelopes and strict request fields", ({ request, requiredField, run }) => {
    for (const payload of [null, undefined, [], "phrase", 1, true, {}, { [requiredField]: null }]) failure(run(payload));
    failure(run({ ...request, tempo: 120 }), "UNSUPPORTED");
    const missing = { ...request, technique: "bend" } as Record<string, unknown>;
    delete missing[requiredField];
    failure(run(missing));
    const wrongType = { ...request, [requiredField]: [], style: "blues" };
    failure(run(wrongType));
  });

  it.each(cases)("$name rejects oversized Phrase input before traversing it", ({ name, request, run }) => {
    const excessive = { duration: q(10_001), events: new Array(10_001) };
    const payload = name === "getPhrase" ? excessive
      : name.startsWith("compare") ? { ...request, left: excessive }
        : { ...request, phrase: excessive };
    failure(run(payload), "UNSUPPORTED");
  });

  it("keeps emptiness valid but does not hide invalid secondary parameters", () => {
    const phrase = { duration: q(0), events: [] };
    expect(musicQueries.getPhraseIntervals({ phrase })).toStrictEqual({ schemaVersion: 1, ok: true, data: [] });
    expect(musicQueries.extractPhraseFragment({ phrase, range: { onset: q(0), duration: q(0) } }))
      .toStrictEqual({ schemaVersion: 1, ok: true, data: { phrase, sourceEventIndices: [], clippedAtStart: false, clippedAtEnd: false } });
    failure(musicQueries.transposePhrase({ phrase, interval: { diatonicSteps: 1, semitones: NaN } }));
    failure(musicQueries.extractPhraseFragment({ phrase, range: { onset: q(0), duration: q(1) } }));
    failure(musicQueries.comparePhraseIntervals({ left: phrase, right: { duration: q(1), events: [null] } } as never));
  });

  it("reports unsupported polyphony, new musical fields and computed-time overflow without partial output", () => {
    const event = PROOF_PHRASE.events[0]!;
    failure(musicQueries.getPhrase({ duration: q(1), events: [event, event] }), "UNSUPPORTED");
    failure(musicQueries.getPhrase({ duration: q(1), events: [{ ...event, articulation: "legato" }] } as never), "UNSUPPORTED");
    failure(musicQueries.getPhrase({ duration: q(1), events: [{ ...event, pitch: [event.pitch] }] } as never));
    const M = Number.MAX_SAFE_INTEGER;
    failure(musicQueries.getPhrase({ duration: q(1), events: [{ ...event, onset: q(1, M), duration: q(1, M - 1) }] }), "UNSUPPORTED");
  });

  it("returns canonical fractions without exporting BigInt and keeps legacy interval metadata semantics", () => {
    const result = musicQueries.getPhrase({ duration: q(8, 2), events: [] });
    expect(result).toStrictEqual({ schemaVersion: 1, ok: true, data: { duration: q(4), events: [] } });
    expect(musicQueries.transposePhrase({
      phrase: PROOF_PHRASE, interval: { diatonicSteps: 1, semitones: 2, metadata: 1n },
    } as never)).toStrictEqual({ schemaVersion: 1, ok: true, data: PROOF_UP_M2 });
  });

  it("does not swallow programming errors or freeze caller objects", () => {
    const error = new Error("unexpected getter error");
    const phrase = { duration: q(1), get events(): never { throw error; } };
    for (const operation of [
      () => musicQueries.getPhrase(phrase),
      () => musicQueries.getPhraseIntervals({ phrase }),
      () => musicQueries.getPhraseContour({ phrase }),
      () => musicQueries.transposePhrase({ phrase, interval: { diatonicSteps: 1, semitones: 2 } }),
      () => musicQueries.extractPhraseFragment({ phrase, range: PROOF_CROP }),
      () => musicQueries.comparePhraseIntervals({ left: PROOF_PHRASE, right: phrase }),
      () => musicQueries.comparePhraseContour({ left: PROOF_PHRASE, right: phrase }),
      () => musicQueries.comparePhraseRhythm({ left: PROOF_PHRASE, right: phrase }),
    ]) expect(operation).toThrow(error);
    expect(() => buildPhrase(null as never)).toThrow(MusicError);
  });
});
