import { describe, expect, it } from "vitest";
import { MusicError } from "../../src/engine/core/errors.js";
import { negateInterval } from "../../src/engine/core/intervals.js";
import { formatPitch, parsePitch, toSemitone } from "../../src/engine/core/pitch.js";
import {
  buildPhrase, extractPhraseFragment, phraseContour, phraseIntervals, samePhraseContour,
  samePhraseIntervals, samePhraseRhythm, transposePhrase,
} from "../../src/engine/core/phrase.js";
import type { Phrase } from "../../src/engine/core/phrase.js";
import { MAX_TEMPORAL_EVENTS } from "../../src/engine/core/time.js";
import { getNoteAt, STANDARD_FRETBOARD } from "../../src/engine/guitar/fretboard.js";
import {
  PROOF_CONTOUR, PROOF_CONTOUR_ALTERNATIVE, PROOF_CROP, PROOF_FRAGMENT, PROOF_INTERVALS,
  PROOF_PHRASE, PROOF_PLACEMENTS, PROOF_UP_M2, q,
} from "../fixtures/phrases.js";

const empty: Phrase = { duration: q(0), events: [] };
const line = (...pitches: string[]): Phrase => ({
  duration: q(pitches.length),
  events: pitches.map((pitch, index) => ({ pitch: parsePitch(pitch), onset: q(index), duration: q(1) })),
});
function frozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) frozen(nested);
}
function invalid(input: unknown, path: string, code = "INVALID_INPUT"): void {
  expect(() => buildPhrase(input as never)).toThrow(MusicError);
  expect(() => buildPhrase(input as never)).toThrowError(expect.objectContaining({
    code, message: expect.stringContaining(path),
  }));
}

describe("monophonic Phrase values", () => {
  it("preserves the proof's separate repetitions, internal gap and trailing silence", () => {
    const phrase = buildPhrase(PROOF_PHRASE);
    expect(phrase).toStrictEqual(PROOF_PHRASE);
    expect(phrase.events.map((event) => formatPitch(event.pitch))).toEqual(["D4", "F4", "E4", "G4", "G4", "C5"]);
    expect(phrase.duration).toStrictEqual(q(4));
    expect(phrase.events[3]).toMatchObject({ onset: q(1), duration: q(3, 2) });
    expect(phrase.events[4]).toMatchObject({ onset: q(3), duration: q(1, 2) });
    expect(phrase.events[5]).toMatchObject({ onset: q(7, 2), duration: q(1, 4) });
    frozen(phrase);
  });

  it("normalizes each time on a deep owned copy without freezing or mutating inputs", () => {
    const input = {
      duration: q(8, 2),
      events: [{ pitch: { note: { letter: "B", accidental: 1 }, octave: 3 }, onset: q(2, 6), duration: q(2, 3) }],
    };
    const before = structuredClone(input);
    const output = buildPhrase(input as Phrase);
    expect(input).toStrictEqual(before);
    expect(output).toStrictEqual({
      duration: q(4), events: [{ pitch: parsePitch("B#3"), onset: q(1, 3), duration: q(2, 3) }],
    });
    for (const item of [input, input.duration, input.events, input.events[0], input.events[0]!.pitch, input.events[0]!.pitch.note]) {
      expect(Object.isFrozen(item)).toBe(false);
    }
    input.events[0]!.pitch.note.accidental = 0;
    input.events[0]!.pitch.octave = 7;
    input.events[0]!.onset = q(0);
    input.duration = q(9);
    input.events.length = 0;
    expect(output.events[0]!.pitch).toStrictEqual(parsePitch("B#3"));
    expect(output.events[0]!.onset).toStrictEqual(q(1, 3));
    expect(output.duration).toStrictEqual(q(4));
    frozen(output);
  });

  it("preserves legacy nested Pitch copying while rejecting extra new-record fields", () => {
    const note: Record<string, unknown> = { letter: "C", accidental: 0, metadata: 1n };
    note.self = note;
    const pitch = { note, octave: 4, source: 2n };
    const value = buildPhrase({ duration: q(1), events: [{ pitch, onset: q(0), duration: q(1) }] } as never);
    expect(value.events[0]!.pitch).toStrictEqual(parsePitch("C4"));
    expect(JSON.parse(JSON.stringify(value))).toStrictEqual(value);
    invalid({ ...line("C4"), harmony: [] }, "Phrase.harmony", "UNSUPPORTED");
    invalid({ duration: q(1), events: [{ ...line("C4").events[0], technique: "slide" }] }, "events[0].technique", "UNSUPPORTED");
    invalid({ duration: { ...q(1), seconds: 1 }, events: [] }, "Phrase.duration", "UNSUPPORTED");
    invalid({ duration: q(1), events: [{ ...line("C4").events[0], onset: { ...q(0), beat: 1 } }] }, "events[0].onset", "UNSUPPORTED");
  });

  it("accepts empty spans, leading silence and arbitrarily spelled safe registered pitches", () => {
    expect(buildPhrase(empty)).toStrictEqual(empty);
    expect(buildPhrase({ ...empty, duration: q(7, 3) })).toStrictEqual({ duration: q(7, 3), events: [] });
    const phrase = buildPhrase({ duration: q(4), events: [{ pitch: parsePitch("Cbb-2"), onset: q(1), duration: q(1) }] });
    expect(phrase.events[0]!.pitch).toStrictEqual(parsePitch("Cbb-2"));
    expect(phrase.events[0]!.onset).toStrictEqual(q(1));
  });

  it.each([
    [null, "Phrase"], [{}, "duration"], [{ duration: q(1) }, "events"],
    [{ duration: q(1), events: {} }, "events"], [{ duration: q(-1), events: [] }, "duration"],
    [{ duration: q(1), events: [null] }, "events[0]"],
    [{ duration: q(1), events: [undefined] }, "events[0]"],
    [{ duration: q(1), events: new Array(1) }, "events[0]"],
    [{ duration: q(1), events: [{ onset: q(0), duration: q(1) }] }, "events[0].pitch"],
    [{ duration: q(1), events: [{ pitch: [parsePitch("C4")], onset: q(0), duration: q(1) }] }, "events[0].pitch"],
    [{ duration: q(1), events: [{ pitch: { note: { letter: "H", accidental: 0 }, octave: 4 }, onset: q(0), duration: q(1) }] }, "events[0].pitch"],
    [{ duration: q(1), events: [{ pitch: { note: { letter: "C", accidental: 0 }, octave: Number.MAX_SAFE_INTEGER }, onset: q(0), duration: q(1) }] }, "events[0].pitch"],
    [{ duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(-1, 6), duration: q(1) }] }, "events[0].onset"],
    [{ duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(0), duration: q(0) }] }, "events[0].duration"],
    [{ duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(0), duration: q(-1) }] }, "events[0].duration"],
    [{ duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(1), duration: q(1, 3) }] }, "events[0].end"],
  ])("rejects malformed/local-bound input %# with a field/index path", (input, path) => {
    invalid(input, path as string);
  });

  it("checks same-record required types before unknown fields and local bounds before relations", () => {
    invalid({ events: [], style: "jazz" }, "Phrase.duration");
    invalid({ duration: q(1), events: [{ onset: q(0), duration: q(1), technique: "bend" }] }, "events[0].pitch");
    invalid({ duration: q(2), events: [
      { pitch: parsePitch("C4"), onset: q(0), duration: q(1) },
      { pitch: parsePitch("D4"), onset: q(1, 2), duration: q(1) },
      { pitch: parsePitch("E4"), onset: q(2), duration: q(0) },
    ] }, "events[2].duration");
  });

  it("rejects out-of-order events rather than sorting them", () => {
    invalid({ duration: q(3), events: [
      { pitch: parsePitch("C4"), onset: q(1), duration: q(1) },
      { pitch: parsePitch("D4"), onset: q(0), duration: q(1) },
    ] }, "events[1].onset");
  });

  it.each(["C4", "E4"])("rejects same-onset or sustained overlaps including repeated %s", (pitch) => {
    for (const onset of [q(0), q(1, 2)]) {
      invalid({ duration: q(2), events: [
        { pitch: parsePitch("C4"), onset: q(0), duration: q(1) },
        { pitch: parsePitch(pitch), onset, duration: q(1) },
      ] }, "events[1].onset", "UNSUPPORTED");
    }
    expect(buildPhrase(line("C4", pitch)).events).toHaveLength(2);
  });

  it("checks representability of computed ends without rounding", () => {
    const M = Number.MAX_SAFE_INTEGER;
    invalid({ duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(1, M), duration: q(1, M - 1) }] }, "events[0].end", "UNSUPPORTED");
    expect(buildPhrase({ duration: q(M), events: [{ pitch: parsePitch("C4"), onset: q(M, 2), duration: q(M, 2) }] }).duration).toStrictEqual(q(M));
  });

  it("accepts 10,000 sequential notes and rejects 10,001 before traversal", () => {
    const events = Array.from({ length: MAX_TEMPORAL_EVENTS }, (_, index) => ({
      pitch: parsePitch("C4"), onset: q(index), duration: q(1),
    }));
    expect(buildPhrase({ duration: q(MAX_TEMPORAL_EVENTS), events }).events).toHaveLength(10_000);
    let touched = false;
    const excessive = new Array(MAX_TEMPORAL_EVENTS + 1);
    Object.defineProperty(excessive, 0, { get() { touched = true; throw new Error("traversed oversized array"); } });
    invalid({ duration: q(MAX_TEMPORAL_EVENTS + 1), events: excessive }, "Phrase.events", "UNSUPPORTED");
    expect(touched).toBe(false);
  });
});

describe("pure Phrase transformations and comparisons", () => {
  it("derives the authored adjacent interval vector across gaps and repeated notes", () => {
    const result = phraseIntervals(PROOF_PHRASE);
    expect(result.map(({ diatonicSteps, semitones }) => ({ diatonicSteps, semitones }))).toStrictEqual(PROOF_INTERVALS);
    expect(result.map(({ label }) => label)).toEqual(["m3", "-m2", "m3", "P1", "P4"]);
    expect(phraseContour(PROOF_PHRASE)).toStrictEqual(PROOF_CONTOUR);
    frozen(result);
    frozen(phraseContour(PROOF_PHRASE));
  });

  it("retains registered octaves and enharmonic identity independently of sounding contour", () => {
    expect(phraseIntervals(line("C3", "C4"))[0]).toMatchObject({ label: "P8", semitones: 12 });
    expect(phraseContour(line("C3", "C4"))).toEqual(["ascending"]);
    const enharmonic = line("C#4", "Db4", "B#3", "C4");
    expect(phraseIntervals(enharmonic)[0]).toMatchObject({ diatonicSteps: 1, semitones: 0, direction: "ascending" });
    expect(phraseContour(enharmonic)).toEqual(["stationary", "descending", "stationary"]);
    expect(buildPhrase(enharmonic).events[2]!.pitch).toStrictEqual(parsePitch("B#3"));
    expect(samePhraseIntervals(line("C#4", "Db4"), line("C4", "C4"))).toBe(false);
    expect(samePhraseContour(line("C#4", "Db4"), line("C4", "C4"))).toBe(true);
  });

  it("transposes the complete proof by M2 with exact rhythm, spelling and interval preservation", () => {
    const before = JSON.stringify(PROOF_PHRASE);
    const result = transposePhrase(PROOF_PHRASE, { diatonicSteps: 1, semitones: 2 });
    expect(result).toStrictEqual(PROOF_UP_M2);
    expect(result).not.toBe(PROOF_PHRASE);
    expect(samePhraseIntervals(result, PROOF_PHRASE)).toBe(true);
    expect(samePhraseRhythm(result, PROOF_PHRASE)).toBe(true);
    expect(transposePhrase(result, { diatonicSteps: -1, semitones: -2 })).toStrictEqual(PROOF_PHRASE);
    expect(JSON.stringify(PROOF_PHRASE)).toBe(before);
    frozen(result);
  });

  it("distinguishes contour, exact interval pattern and exact rhythm", () => {
    expect(samePhraseContour(PROOF_PHRASE, PROOF_CONTOUR_ALTERNATIVE)).toBe(true);
    expect(samePhraseIntervals(PROOF_PHRASE, PROOF_CONTOUR_ALTERNATIVE)).toBe(false);
    expect(samePhraseRhythm(PROOF_PHRASE, PROOF_CONTOUR_ALTERNATIVE)).toBe(true);
    const rhythm = {
      ...PROOF_PHRASE,
      events: PROOF_PHRASE.events.map((event, index) => index === 4 ? { ...event, duration: q(1, 4) } : event),
    };
    expect(buildPhrase(rhythm)).not.toStrictEqual(buildPhrase(PROOF_PHRASE));
    expect(samePhraseRhythm(PROOF_PHRASE, rhythm)).toBe(false);
    expect(samePhraseIntervals(PROOF_PHRASE, rhythm)).toBe(true);
    expect(samePhraseContour(PROOF_PHRASE, rhythm)).toBe(true);
    expect(samePhraseRhythm(PROOF_PHRASE, { ...PROOF_PHRASE, duration: q(5) })).toBe(false);
    expect(samePhraseRhythm(line("C4"), { duration: q(2), events: [{ pitch: parsePitch("D4"), onset: q(1), duration: q(1) }] })).toBe(false);
    expect(samePhraseRhythm(line("C4"), { duration: q(2), events: [{ pitch: parsePitch("D4"), onset: q(0), duration: q(2) }] })).toBe(false);
    const equivalent = { duration: q(8, 2), events: PROOF_PHRASE.events.map((event) => ({
      ...event, onset: q(event.onset.numerator * 2, event.onset.denominator * 2),
      duration: q(event.duration.numerator * 3, event.duration.denominator * 3),
    })) };
    expect(samePhraseRhythm(PROOF_PHRASE, equivalent)).toBe(true);
  });

  it("uses equal event counts for vacuous interval/contour patterns, independently of rhythm", () => {
    for (const operation of [samePhraseIntervals, samePhraseContour]) {
      expect(operation(empty, { ...empty, duration: q(5) })).toBe(true);
      expect(operation(line("C4"), line("Gb7"))).toBe(true);
      expect(operation(empty, line("C4"))).toBe(false);
      expect(operation(line("C4"), empty)).toBe(false);
    }
    expect(samePhraseRhythm(empty, { ...empty, duration: q(5) })).toBe(false);
    expect(phraseIntervals(empty)).toEqual([]);
    expect(phraseIntervals(line("C4"))).toEqual([]);
    expect(phraseContour(empty)).toEqual([]);
    expect(phraseContour(line("C4"))).toEqual([]);
    expect(transposePhrase(empty, { diatonicSteps: 7, semitones: 12 })).toStrictEqual(empty);
  });

  it("validates all arguments even when inputs are empty or event counts already differ", () => {
    expect(() => transposePhrase(empty, null as never)).toThrow(MusicError);
    expect(() => transposePhrase(empty, { diatonicSteps: 1, semitones: NaN })).toThrow(MusicError);
    expect(() => extractPhraseFragment(empty, null as never)).toThrow(MusicError);
    for (const operation of [samePhraseIntervals, samePhraseContour, samePhraseRhythm]) {
      expect(() => operation(empty, { duration: q(1), events: [null] } as never)).toThrow(MusicError);
      expect(() => operation(null as never, empty)).toThrow(MusicError);
    }
    for (const operation of [phraseIntervals, phraseContour]) expect(() => operation(null as never)).toThrow(MusicError);
  });

  it("round-trips exact transposition through varied signed and enharmonic intervals", () => {
    for (const source of [PROOF_PHRASE, line("B#3", "Cb4", "C##4", "Dbb4"), line("C-2", "G#-1")]) {
      for (const interval of [
        { diatonicSteps: 0, semitones: 0 }, { diatonicSteps: 0, semitones: -1 },
        { diatonicSteps: 1, semitones: 0 }, { diatonicSteps: 1, semitones: 2 },
        { diatonicSteps: -2, semitones: -3 }, { diatonicSteps: 7, semitones: 12 },
        { diatonicSteps: -14, semitones: -24 }, { diatonicSteps: 8, semitones: 14 },
      ]) {
        const moved = transposePhrase(source, interval);
        expect(transposePhrase(moved, negateInterval(interval))).toStrictEqual(buildPhrase(source));
        expect(samePhraseIntervals(source, moved)).toBe(true);
        expect(samePhraseContour(source, moved)).toBe(true);
        expect(samePhraseRhythm(source, moved)).toBe(true);
        expect(buildPhrase(JSON.parse(JSON.stringify(moved)))).toStrictEqual(moved);
      }
    }
  });

  it("reuses exact registered guitar facts without embedding placement or silently relocating a transpose", () => {
    const phrase = buildPhrase(PROOF_PHRASE);
    const moved = transposePhrase(phrase, { diatonicSteps: 1, semitones: 2 });
    for (const placements of PROOF_PLACEMENTS) {
      for (const [index, position] of placements.entries()) {
        const semitone = getNoteAt(STANDARD_FRETBOARD, position).semitone;
        expect(semitone).toBe(toSemitone(phrase.events[index]!.pitch));
        expect(semitone).not.toBe(toSemitone(moved.events[index]!.pitch));
      }
    }
    expect(Object.keys(phrase).sort()).toEqual(["duration", "events"]);
    expect(phrase.events.every((event) => Object.keys(event).sort().join() === "duration,onset,pitch")).toBe(true);
  });
});

describe("exact temporal fragment extraction", () => {
  it("clips both boundary notes, preserves the internal gap and returns the authored source receipt", () => {
    const before = JSON.stringify(PROOF_PHRASE);
    const result = extractPhraseFragment(PROOF_PHRASE, PROOF_CROP);
    expect(result).toStrictEqual(PROOF_FRAGMENT);
    expect(JSON.stringify(PROOF_PHRASE)).toBe(before);
    frozen(result);
  });

  it("includes partial sustain and excludes boundary-only contact using half-open windows", () => {
    expect(extractPhraseFragment(line("C4", "D4", "E4"), { onset: q(1), duration: q(1) })).toStrictEqual({
      phrase: line("D4"), sourceEventIndices: [1], clippedAtStart: false, clippedAtEnd: false,
    });
    expect(extractPhraseFragment(line("C4"), { onset: q(1, 3), duration: q(1, 3) })).toStrictEqual({
      phrase: { duration: q(1, 3), events: [{ pitch: parsePitch("C4"), onset: q(0), duration: q(1, 3) }] },
      sourceEventIndices: [0], clippedAtStart: true, clippedAtEnd: true,
    });
  });

  it.each([q(0), q(1, 3), q(4)])("accepts a zero-width window at %j, including inside a sustain", (onset) => {
    expect(extractPhraseFragment(PROOF_PHRASE, { onset, duration: q(0) })).toStrictEqual({
      phrase: empty, sourceEventIndices: [], clippedAtStart: false, clippedAtEnd: false,
    });
  });

  it("preserves silent windows, full-span identity and trailing silence without clamping", () => {
    expect(extractPhraseFragment(PROOF_PHRASE, { onset: q(5, 2), duration: q(1, 2) })).toStrictEqual({
      phrase: { duration: q(1, 2), events: [] }, sourceEventIndices: [], clippedAtStart: false, clippedAtEnd: false,
    });
    const full = extractPhraseFragment(PROOF_PHRASE, { onset: q(0), duration: q(4) });
    expect(full).toStrictEqual({ phrase: PROOF_PHRASE, sourceEventIndices: [0, 1, 2, 3, 4, 5], clippedAtStart: false, clippedAtEnd: false });
    expect(full.phrase).not.toBe(PROOF_PHRASE);
    expect(extractPhraseFragment({ duration: q(2), events: [] }, { onset: q(1), duration: q(1) }).phrase).toStrictEqual({ duration: q(1), events: [] });
  });

  it.each([
    null, {}, { onset: q(0) }, { onset: q(-1), duration: q(1) },
    { onset: q(0), duration: q(-1) }, { onset: q(4), duration: q(1, 3) },
    { onset: q(5), duration: q(0) },
  ])("rejects invalid/out-of-span range %j", (range) => {
    expect(() => extractPhraseFragment(PROOF_PHRASE, range as never))
      .toThrowError(expect.objectContaining({ code: "INVALID_INPUT", message: expect.stringContaining("range") }));
  });

  it("rejects unrepresentable derived times and unsupported range metadata", () => {
    const M = Number.MAX_SAFE_INTEGER;
    const source = { duration: q(1), events: [{ pitch: parsePitch("C4"), onset: q(1, M), duration: q(1, M) }] };
    expect(() => extractPhraseFragment(source, { onset: q(1, M - 1), duration: q(1, M - 1) }))
      .toThrowError(expect.objectContaining({ code: "UNSUPPORTED" }));
    expect(() => extractPhraseFragment(PROOF_PHRASE, { onset: q(0), duration: q(1), ticks: 100 } as never))
      .toThrowError(expect.objectContaining({ code: "UNSUPPORTED", message: expect.stringContaining("range.ticks") }));
    expect(() => extractPhraseFragment(PROOF_PHRASE, { onset: q(0), ticks: 100 } as never))
      .toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });
});
