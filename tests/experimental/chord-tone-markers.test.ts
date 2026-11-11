import { describe, expect, it } from "vitest";
import { parseNote } from "../../src/engine/core/pitch.js";
import { musicQueries } from "../../src/engine/query/index.js";
import { toChordToneMarkers } from "../../src/experimental/chord-tone-markers.js";

function cMajorInputs() {
  const chord = { root: parseNote("C"), chordId: "major" as const };
  const chordResult = musicQueries.getChord(chord);
  const locationsResult = musicQueries.getFretboardLocations({
    context: { currentChord: chord },
    fretRange: { minFret: 0, maxFret: 3 },
    stringIndices: [0, 1],
    pitchClasses: [0, 4, 7],
  });
  expect(chordResult.ok).toBe(true);
  expect(locationsResult.ok).toBe(true);
  if (!chordResult.ok || !locationsResult.ok) throw new Error("Expected valid engine inputs");
  return { chord: chordResult.data, locations: locationsResult.data };
}

describe("isolated chord tone marker presentation adapter", () => {
  it("reuses engine chord tones and actual fret positions without choosing a voicing", () => {
    const { chord, locations } = cMajorInputs();
    expect(toChordToneMarkers(chord, locations)).toEqual([
      { position: { stringIndex: 0, fret: 0 }, noteName: "E2", pitchClass: 4, degrees: [3], isRoot: false },
      { position: { stringIndex: 0, fret: 3 }, noteName: "G2", pitchClass: 7, degrees: [5], isRoot: false },
      { position: { stringIndex: 1, fret: 3 }, noteName: "C3", pitchClass: 0, degrees: [1], isRoot: true },
    ]);
  });

  it("preserves existing ordering and does not mutate engine query results", () => {
    const { chord, locations } = cMajorInputs();
    const before = JSON.stringify({ chord, locations });
    const first = toChordToneMarkers(chord, locations);
    const second = toChordToneMarkers(chord, locations);
    expect(second).toEqual(first);
    expect(JSON.stringify({ chord, locations })).toBe(before);
    expect(first.every((marker) => !Object.hasOwn(marker, "fingering") && !Object.hasOwn(marker, "audio"))).toBe(true);
  });

  it("does not add notes that the caller did not supply", () => {
    const { chord, locations } = cMajorInputs();
    expect(toChordToneMarkers(chord, locations.slice(0, 1))).toHaveLength(1);
    expect(toChordToneMarkers(chord, [])).toEqual([]);
  });
});
