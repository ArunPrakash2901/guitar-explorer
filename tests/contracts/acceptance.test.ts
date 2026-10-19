import { describe, expect, it } from "vitest";
import { formatNote, formatPitch, musicQueries, parseNote, parsePitch } from "../../src/engine/index.js";
import type { QueryResult } from "../../src/engine/query/index.js";

function value<T>(result: QueryResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

describe("approved Phase 1 acceptance", () => {
  it("explains a major third and transfers it from A to D and onto the guitar", () => {
    const interval = value(musicQueries.getInterval({ from: parsePitch("A3"), to: parsePitch("C#4") }));
    expect(interval).toMatchObject({ label: "M3", diatonicSteps: 2, semitones: 4 });
    const transferred = value(musicQueries.transposePitch({ pitch: parsePitch("D4"), interval }));
    expect(formatPitch(transferred)).toBe("F#4");
    const locations = value(musicQueries.getFretboardLocations({
      root: parseNote("D"), pitchClasses: [6],
      context: { key: { tonic: parseNote("D"), mode: "major" } },
    }));
    expect(locations.length).toBeGreaterThan(0);
    for (const location of locations) {
      expect(formatNote(location.pitch.note)).toBe("F#");
      expect(location.rootRelation?.interval.label).toBe("M3");
    }
  });

  it("distinguishes the two spellings of a tritone", () => {
    const augmented = value(musicQueries.getInterval({ from: parsePitch("C4"), to: parsePitch("F#4") }));
    const diminished = value(musicQueries.getInterval({ from: parsePitch("C4"), to: parsePitch("Gb4") }));
    expect([augmented.label, diminished.label]).toEqual(["A4", "d5"]);
    expect(augmented.semitones).toBe(diminished.semitones);
  });

  it("preserves E# and B# in C# major", () => {
    const scale = value(musicQueries.getScale({ tonic: parseNote("C#"), scaleId: "major" }));
    expect(scale.tones.map((tone) => formatNote(tone.note))).toEqual(["C#", "D#", "E#", "F#", "G#", "A#", "B#"]);
  });

  it("distinguishes low and high E by register", () => {
    const low = value(musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 0 } }));
    const high = value(musicQueries.getNoteAtFret({ position: { stringIndex: 5, fret: 0 } }));
    expect([low.name, high.name]).toEqual(["E2", "E4"]);
    expect(high.semitone - low.semitone).toBe(24);
    expect(high.pitchClass).toBe(low.pitchClass);
  });

  it("explains changing chord roles independently of key and selected scale", () => {
    const analysis = value(musicQueries.analyseNotes({
      notes: [parsePitch("F#4")],
      context: {
        key: { tonic: parseNote("A"), mode: "major" },
        activeScale: { tonic: parseNote("D"), scaleId: "major" },
        currentChord: { root: parseNote("D"), chordId: "major" },
      },
    }))[0];
    expect(analysis?.keyRelation).toMatchObject({ degree: 6, alterationFromKey: 0, inKey: true });
    expect(analysis?.scaleRelation).toMatchObject({ degree: 3, alterationFromScale: 0, inScale: true });
    expect(analysis?.chordRelation).toMatchObject({ isChordTone: true, interval: { label: "M3" } });
  });
});
