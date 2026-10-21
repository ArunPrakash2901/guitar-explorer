import { describe, expect, it } from "vitest";
import { parseNote, parsePitch } from "../../src/engine/core/pitch.js";
import type { HarmonicContext } from "../../src/engine/core/types.js";
import { STANDARD_FRETBOARD } from "../../src/engine/guitar/index.js";
import { musicQueries } from "../../src/engine/query/index.js";
import type { LocationsRequest, QueryResult } from "../../src/engine/query/index.js";

function data<T>(result: QueryResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected successful query: ${result.error.message}`);
  return result.data;
}

function failure(result: QueryResult<unknown>, code: "INVALID_INPUT" | "UNSUPPORTED" | "NO_MATCH" = "INVALID_INPUT"): void {
  expect(result.schemaVersion).toBe(1);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected a typed query error");
  expect(result.error.code).toBe(code);
  expect(typeof result.error.message).toBe("string");
  expect(result.error.message.length).toBeGreaterThan(0);
  expect(Object.keys(result).sort()).toEqual(["error", "ok", "schemaVersion"]);
  expect(Object.keys(result.error).sort()).toEqual(["code", "message"]);
  expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
}

describe("version 1 public music queries", () => {
  it("exposes the complete implemented kernel without future-operation placeholders", () => {
    expect(Object.keys(musicQueries).sort()).toEqual([
      "analyseNotes", "getChord", "getChordCatalog", "getDiatonicHarmony", "getFifthsNeighbors", "getFretboardLocations", "getInterval",
      "getKeyProfile", "getKeySignature", "getNoteAtFret", "getRelativeKey", "getScale",
      "invertInterval", "transposeNote", "transposePitch",
    ]);
    expect(Object.isFrozen(musicQueries)).toBe(true);
  });

  it("constructs an interval with written and sounding evidence", () => {
    expect(data(musicQueries.getInterval({ from: parsePitch("C4"), to: parsePitch("E4") })))
      .toMatchObject({ diatonicSteps: 2, semitones: 4, number: 3, quality: "major", label: "M3", direction: "ascending" });
  });

  it("preserves theoretical scale spelling and formula metadata", () => {
    const scale = data(musicQueries.getScale({ tonic: parseNote("F#"), scaleId: "major" }));
    expect(scale.tones.map((tone) => tone.note)).toEqual([
      "F#", "G#", "A#", "B", "C#", "D#", "E#",
    ].map(parseNote));
    expect(scale.tones.map((tone) => tone.pitchClass)).toEqual([6, 8, 10, 11, 1, 3, 5]);
    expect(scale.tones.map((tone) => tone.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scale.tones[6]).toMatchObject({ alteration: 0, interval: { label: "M7", semitones: 11 } });
  });

  it("constructs a spelled minor triad rather than a display-name-only answer", () => {
    const chord = data(musicQueries.getChord({ root: parseNote("Bb"), chordId: "minor" }));
    expect(chord.tones.map((tone) => tone.note)).toEqual(["Bb", "Db", "F"].map(parseNote));
    expect(chord.formula).toEqual([
      { degree: 1, alteration: 0 }, { degree: 3, alteration: -1 }, { degree: 5, alteration: 0 },
    ]);
    expect(chord.tones[1]).toMatchObject({ pitchClass: 1, interval: { label: "m3", semitones: 3 } });
  });

  it("provides sounding register and contextual spelling for a default-board location", () => {
    expect(data(musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 5 } }))).toEqual({
      position: { stringIndex: 0, fret: 5 },
      pitch: parsePitch("A2"),
      name: "A2", semitone: 45, pitchClass: 9,
      spellingSource: "fallback", alternativeSpellings: [],
    });
  });

  it("preserves written names through note and registered-pitch transposition", () => {
    expect(data(musicQueries.transposeNote({
      note: parseNote("Bb"), interval: { diatonicSteps: 2, semitones: 4 },
    }))).toEqual(parseNote("D"));
    expect(data(musicQueries.transposePitch({
      pitch: parsePitch("B#3"), interval: { diatonicSteps: 1, semitones: 2 },
    }))).toEqual(parsePitch("C##4"));
    expect(data(musicQueries.invertInterval({ interval: { diatonicSteps: 2, semitones: 3 } })))
      .toMatchObject({ diatonicSteps: 5, semitones: 9, label: "M6" });
  });

  it("returns JSON-compatible stable envelopes for every public operation", () => {
    const results: readonly QueryResult<unknown>[] = [
      musicQueries.getInterval({ from: parsePitch("C4"), to: parsePitch("G4") }),
      musicQueries.getScale({ tonic: parseNote("A"), scaleId: "naturalMinor" }),
      musicQueries.getChord({ root: parseNote("D"), chordId: "diminished" }),
      musicQueries.getKeySignature({ tonic: parseNote("F#"), mode: "major" }),
      musicQueries.getRelativeKey({ tonic: parseNote("A"), mode: "minor" }),
      musicQueries.getFifthsNeighbors({ tonic: parseNote("C"), mode: "major" }),
      musicQueries.getKeyProfile({ tonic: parseNote("Eb"), mode: "major" }),
      musicQueries.getNoteAtFret({ position: { stringIndex: 5, fret: 12 } }),
      musicQueries.getFretboardLocations({ stringIndices: [0], pitchClasses: [4] }),
      musicQueries.analyseNotes({ notes: [parsePitch("C4")], context: {} }),
      musicQueries.transposeNote({ note: parseNote("C"), interval: { diatonicSteps: 2, semitones: 4 } }),
      musicQueries.transposePitch({ pitch: parsePitch("C4"), interval: { diatonicSteps: 2, semitones: 4 } }),
      musicQueries.invertInterval({ interval: { diatonicSteps: 4, semitones: 7 } }),
    ];
    for (const result of results) {
      expect(result.schemaVersion).toBe(1);
      expect(result.ok).toBe(true);
      expect(Object.keys(result).sort()).toEqual(["data", "ok", "schemaVersion"]);
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    }
  });

  it("normalizes filters without changing deterministic fretboard ordering", () => {
    const request: LocationsRequest = {
      fretRange: { minFret: 0, maxFret: 5 },
      stringIndices: [5, 0, 5],
      pitchClasses: [9, 4, 9],
    };
    const before = JSON.stringify(request);
    const result = musicQueries.getFretboardLocations(request);
    expect(data(result).map((location) => location.position)).toEqual([
      { stringIndex: 0, fret: 0 }, { stringIndex: 0, fret: 5 },
      { stringIndex: 5, fret: 0 }, { stringIndex: 5, fret: 5 },
    ]);
    expect(musicQueries.getFretboardLocations(request)).toStrictEqual(result);
    expect(musicQueries.getFretboardLocations({
      ...request, stringIndices: [0, 5], pitchClasses: [4, 9],
    })).toStrictEqual(result);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("returns an empty successful collection when valid filters have no match", () => {
    expect(data(musicQueries.getFretboardLocations({
      fretRange: { minFret: 0, maxFret: 0 }, stringIndices: [0], pitchClasses: [0],
    }))).toEqual([]);
    expect(data(musicQueries.getFretboardLocations({ stringIndices: [] }))).toEqual([]);
    expect(data(musicQueries.analyseNotes({ notes: [], context: {} }))).toEqual([]);
  });
});

describe("contextual query evidence", () => {
  const position = { stringIndex: 4, fret: 1 }; // Sounding C4.
  const competingContext: HarmonicContext = {
    currentChord: { root: parseNote("C"), chordId: "major" },
    activeScale: { tonic: parseNote("G#"), scaleId: "major" },
    key: { tonic: parseNote("C"), mode: "major" },
  };

  it("chooses matching root, chord, scale, key, then fallback, retaining distinct alternatives", () => {
    const root = data(musicQueries.getNoteAtFret({
      position, root: parseNote("B#"), context: competingContext,
    }));
    expect(root).toMatchObject({ name: "B#3", spellingSource: "root", alternativeSpellings: [parseNote("C")] });
    expect(root.rootRelation).toMatchObject({
      root: parseNote("B#"), chromaticDistance: 0, interval: { label: "P1" },
    });
    const chord = data(musicQueries.getNoteAtFret({ position, context: competingContext }));
    expect(chord).toMatchObject({ name: "C4", spellingSource: "chord", alternativeSpellings: [parseNote("B#")] });
    const scale = data(musicQueries.getNoteAtFret({ position, context: {
      activeScale: competingContext.activeScale!, key: competingContext.key!,
    } }));
    expect(scale).toMatchObject({ name: "B#3", spellingSource: "scale", alternativeSpellings: [parseNote("C")] });
    const key = data(musicQueries.getNoteAtFret({ position, context: { key: competingContext.key! } }));
    expect(key).toMatchObject({ name: "C4", spellingSource: "key", alternativeSpellings: [] });
    expect(data(musicQueries.getNoteAtFret({ position }))).toMatchObject({
      name: "C4", spellingSource: "fallback", alternativeSpellings: [],
    });
    expect([root, chord, scale, key].map((result) => result.semitone)).toEqual([60, 60, 60, 60]);
  });

  it("does not apply a context source to pitches absent from its collection", () => {
    const result = data(musicQueries.getNoteAtFret({
      position: { stringIndex: 4, fret: 2 }, // C#4.
      root: parseNote("G"),
      context: {
        currentChord: { root: parseNote("C"), chordId: "major" },
        activeScale: { tonic: parseNote("C"), scaleId: "major" },
        key: { tonic: parseNote("C"), mode: "major" },
      },
      spellingPreference: "flats",
    }));
    expect(result).toMatchObject({ name: "Db4", spellingSource: "fallback", alternativeSpellings: [] });
    expect(result.rootRelation).toMatchObject({ chromaticDistance: 6, interval: { label: "d5" } });
    expect(result.keyRelation?.inKey).toBe(false);
    expect(result.scaleRelation?.inScale).toBe(false);
    expect(result.chordRelation?.isChordTone).toBe(false);
  });

  it("resolves enharmonic octave crossings without moving the sounding pitch", () => {
    const bSharp = data(musicQueries.getNoteAtFret({ position, context: {
      key: { tonic: parseNote("C#"), mode: "major" },
    } }));
    expect(bSharp).toMatchObject({ pitch: parsePitch("B#3"), name: "B#3", semitone: 60, pitchClass: 0 });
    const cFlat = data(musicQueries.getNoteAtFret({
      position: { stringIndex: 4, fret: 0 },
      root: parseNote("Cb"),
      context: { currentChord: { root: parseNote("B"), chordId: "major" } },
    }));
    expect(cFlat).toMatchObject({
      pitch: parsePitch("Cb4"), name: "Cb4", semitone: 59, pitchClass: 11,
      spellingSource: "root", alternativeSpellings: [parseNote("B")],
    });
  });

  it("annotates a target interval from the supplied root independently of harmonic key", () => {
    const result = data(musicQueries.getNoteAtFret({
      position: { stringIndex: 4, fret: 2 },
      root: parseNote("A"),
      context: { key: { tonic: parseNote("D"), mode: "major" } },
    }));
    expect(result).toMatchObject({
      name: "C#4", rootRelation: {
        root: parseNote("A"), chromaticDistance: 4,
        interval: { label: "M3", diatonicSteps: 2, semitones: 4 },
      },
      keyRelation: { tonic: parseNote("D"), degree: 7, inKey: true },
    });
    expect(data(musicQueries.getNoteAtFret({ position }))).not.toHaveProperty("rootRelation");
  });

  it("preserves supplied spelling while distinguishing sounding membership and written degree", () => {
    const result = data(musicQueries.analyseNotes({
      notes: [parsePitch("C4"), parsePitch("B#3")], context: competingContext,
    }));
    expect(result.map((entry) => entry.name)).toEqual(["C4", "B#3"]);
    expect(result.map((entry) => entry.semitone)).toEqual([60, 60]);
    expect(result[0]?.keyRelation).toMatchObject({ degree: 1, alterationFromKey: 0, inKey: true, spellingMatches: true });
    expect(result[1]?.keyRelation).toMatchObject({ degree: 7, alterationFromKey: 1, inKey: true, spellingMatches: false });
    expect(result[0]?.scaleRelation).toMatchObject({ degree: 4, alterationFromScale: -1, inScale: true, spellingMatches: false });
    expect(result[1]?.scaleRelation).toMatchObject({ degree: 3, alterationFromScale: 0, inScale: true, spellingMatches: true });
    expect(result[0]?.chordRelation).toMatchObject({ isChordTone: true, spellingMatches: true });
    expect(result[1]?.chordRelation).toMatchObject({ isChordTone: true, spellingMatches: false });
    expect(result[1]?.chordRelation?.matchingTones.map((tone) => tone.degree)).toEqual([1]);
  });

  it("evaluates key, selected scale with its own tonic, and current chord independently", () => {
    const context: HarmonicContext = {
      key: { tonic: parseNote("C"), mode: "major" },
      activeScale: { tonic: parseNote("D"), scaleId: "naturalMinor" },
      currentChord: { root: parseNote("E"), chordId: "major" },
    };
    const results = data(musicQueries.analyseNotes({ notes: [parsePitch("F4"), parsePitch("G#4")], context }));
    expect(results[0]).toMatchObject({
      keyRelation: { tonic: parseNote("C"), degree: 4, alterationFromKey: 0, inKey: true },
      scaleRelation: { tonic: parseNote("D"), degree: 3, alterationFromScale: 0, inScale: true },
      chordRelation: { root: parseNote("E"), isChordTone: false },
    });
    expect(results[1]).toMatchObject({
      keyRelation: { degree: 5, alterationFromKey: 1, inKey: false },
      scaleRelation: { degree: 4, alterationFromScale: 1, inScale: false },
      chordRelation: { isChordTone: true, interval: { label: "M3" } },
    });
    const location = data(musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 4 }, context }));
    expect(location).toMatchObject({
      name: "G#2", spellingSource: "chord", keyRelation: { inKey: false },
      scaleRelation: { inScale: false }, chordRelation: { isChordTone: true },
    });
  });

  it("reports natural-minor degrees against that key rather than major-key alterations", () => {
    const results = data(musicQueries.analyseNotes({
      notes: [parsePitch("F4"), parsePitch("G4"), parsePitch("G#4")],
      context: { key: { tonic: parseNote("A"), mode: "minor" } },
    }));
    expect(results.map((result) => result.keyRelation)).toMatchObject([
      { degree: 6, alterationFromKey: 0, inKey: true },
      { degree: 7, alterationFromKey: 0, inKey: true },
      { degree: 7, alterationFromKey: 1, inKey: false },
    ]);
  });

  it("does not leak context or mutable global state between unrelated queries", () => {
    const request = { position, root: parseNote("B#"), context: competingContext };
    const original = musicQueries.getNoteAtFret(request);
    const snapshot = JSON.stringify(original);
    musicQueries.getNoteAtFret({ position, context: { key: { tonic: parseNote("F"), mode: "minor" } } });
    musicQueries.getScale({ tonic: parseNote("Gb"), scaleId: "major" });
    musicQueries.getChord({ root: parseNote("E"), chordId: "augmented" });
    musicQueries.analyseNotes({ notes: [parsePitch("Db5")], context: {} });
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(musicQueries.getNoteAtFret(request)).toStrictEqual(original);
    expect(data(musicQueries.getNoteAtFret({ position }))).toMatchObject({
      name: "C4", spellingSource: "fallback", alternativeSpellings: [],
    });
  });
});

describe("untrusted public query requests", () => {
  it.each(Object.entries(musicQueries))("%s returns typed errors for malformed request envelopes", (_name, operation) => {
    for (const payload of [null, undefined, [], "C4", NaN, 12, true]) {
      failure(operation(payload as never));
    }
    if (!["getFretboardLocations", "getChordCatalog"].includes(_name)) failure(operation({} as never));
  });

  it.each(["wholeTone", "__proto__", "constructor", "toString"])("rejects unsupported scale ID %s", (scaleId) => {
    failure(musicQueries.getScale({ tonic: parseNote("C"), scaleId } as never), "UNSUPPORTED");
  });

  it.each(["dominant7Sharp11", "__proto__", "constructor", "toString"])("rejects unsupported chord ID %s", (chordId) => {
    failure(musicQueries.getChord({ root: parseNote("C"), chordId } as never), "UNSUPPORTED");
  });

  it.each([undefined, null, 1, {}, []])("classifies malformed definition IDs %j as invalid input", (id) => {
    failure(musicQueries.getScale({ tonic: parseNote("C"), scaleId: id } as never));
    failure(musicQueries.getChord({ root: parseNote("C"), chordId: id } as never));
    failure(musicQueries.analyseNotes({
      notes: [], context: { key: { tonic: parseNote("C"), mode: id } },
    } as never));
  });

  it("classifies an unknown textual key mode as unsupported", () => {
    failure(musicQueries.analyseNotes({
      notes: [], context: { key: { tonic: parseNote("C"), mode: "dorian" } },
    } as never), "UNSUPPORTED");
  });

  it("does not return partial scale or chord answers for unsupported collections", () => {
    failure(musicQueries.getScale({ tonic: parseNote("C"), scaleId: "melodicMinor" } as never), "UNSUPPORTED");
    failure(musicQueries.getChord({ root: parseNote("C"), chordId: "dominant7Flat13" } as never), "UNSUPPORTED");
  });

  it("ignores extra note metadata without leaking BigInt or cyclic input references", () => {
    const extendedNote: Record<string, unknown> = { letter: "C", accidental: 0, metadata: 1n };
    extendedNote.self = extendedNote;
    const pitch = { note: extendedNote, octave: 4 };
    const context = {
      key: { tonic: extendedNote, mode: "major" },
      activeScale: { tonic: extendedNote, scaleId: "major" },
      currentChord: { root: extendedNote, chordId: "major" },
    };
    const results: readonly QueryResult<unknown>[] = [
      musicQueries.getScale({ tonic: extendedNote, scaleId: "major" } as never),
      musicQueries.getChord({ root: extendedNote, chordId: "major" } as never),
      musicQueries.getInterval({ from: pitch, to: parsePitch("E4") } as never),
      musicQueries.transposeNote({ note: extendedNote, interval: { diatonicSteps: 2, semitones: 4 } } as never),
      musicQueries.transposePitch({ pitch, interval: { diatonicSteps: 2, semitones: 4 } } as never),
      musicQueries.analyseNotes({ notes: [pitch], context } as never),
      musicQueries.getNoteAtFret({ position: { stringIndex: 4, fret: 1 }, root: extendedNote, context } as never),
      musicQueries.getFretboardLocations({
        fretRange: { minFret: 1, maxFret: 1 }, stringIndices: [4], root: extendedNote, context,
      } as never),
    ];
    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(() => JSON.stringify(result)).not.toThrow();
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("metadata");
      expect(serialized).not.toContain("self");
      expect(JSON.parse(serialized)).toStrictEqual(result);
    }
  });

  it.each([
    { position: null }, { position: { stringIndex: 0, fret: NaN } },
    { position: { stringIndex: 0, fret: 0.1 } }, { position: { stringIndex: 6, fret: 0 } },
    { position: { stringIndex: 0, fret: 0 }, board: null },
    { position: { stringIndex: 0, fret: 0 }, root: { letter: "H", accidental: 0 } },
    { position: { stringIndex: 0, fret: 0 }, context: null },
    { position: { stringIndex: 0, fret: 0 }, spellingPreference: "automatic" },
  ])("returns typed location errors for %j", (request) => {
    failure(musicQueries.getNoteAtFret(request as never));
  });

  it("validates optional context and root before returning even an empty locations list", () => {
    for (const invalid of [
      { context: null },
      { context: { activeScale: null } },
      { context: { currentChord: { root: parseNote("C"), chordId: null } } },
      { root: null },
      { spellingPreference: null },
    ]) {
      failure(musicQueries.getFretboardLocations({ pitchClasses: [], ...invalid } as never));
    }
    failure(musicQueries.getFretboardLocations({
      stringIndices: [], context: { activeScale: { tonic: parseNote("D"), scaleId: "wholeTone" } },
    } as never), "UNSUPPORTED");
    expect(data(musicQueries.getFretboardLocations({
      stringIndices: [], context: { activeScale: { tonic: parseNote("D"), scaleId: "dorian" } },
    }))).toEqual([]);
  });

  it("rejects sparse, null and otherwise malformed note lists without leaking runtime errors", () => {
    for (const notes of [null, undefined, {}, [null], [undefined], new Array(1), [parsePitch("C4"), null]]) {
      failure(musicQueries.analyseNotes({ notes, context: {} } as never));
    }
    failure(musicQueries.analyseNotes({ notes: [], context: null } as never));
    failure(musicQueries.analyseNotes({ notes: [], context: undefined } as never));
  });

  it("rejects malformed nested pitch and interval values", () => {
    const goodPitch = parsePitch("C4");
    for (const pitch of [null, undefined, {}, { note: parseNote("C"), octave: NaN }, { note: parseNote("C"), octave: 0.5 }]) {
      failure(musicQueries.getInterval({ from: pitch, to: goodPitch } as never));
      failure(musicQueries.getInterval({ from: goodPitch, to: pitch } as never));
      failure(musicQueries.transposePitch({ pitch, interval: { diatonicSteps: 1, semitones: 2 } } as never));
    }
    for (const interval of [null, undefined, {}, { diatonicSteps: 1, semitones: NaN }, { diatonicSteps: Infinity, semitones: 2 }]) {
      failure(musicQueries.transposePitch({ pitch: goodPitch, interval } as never));
      failure(musicQueries.transposeNote({ note: parseNote("C"), interval } as never));
      failure(musicQueries.invertInterval({ interval } as never));
    }
  });

  it("rejects invalid filter arrays, ranges and board arithmetic", () => {
    for (const request of [
      { stringIndices: new Array(1) }, { pitchClasses: new Array(1) },
      { stringIndices: [NaN] }, { pitchClasses: [12] },
      { fretRange: null }, { fretRange: { minFret: 10, maxFret: 9 } },
      { board: { tuning: { id: "sparse", openStrings: new Array(1) }, maxFret: 15 } },
      { board: { tuning: STANDARD_FRETBOARD.tuning, maxFret: Number.MAX_SAFE_INTEGER } },
    ]) {
      failure(musicQueries.getFretboardLocations(request as never));
    }
  });

  it("turns a valid but excessive enumeration request into an unsupported result", () => {
    failure(musicQueries.getFretboardLocations({
      board: { tuning: STANDARD_FRETBOARD.tuning, maxFret: 5_000 },
    }), "UNSUPPORTED");
  });
});
