import { describe, expect, it } from "vitest";
import { formatNote } from "../../src/engine/index.js";
import { occurrences, relatedSections, sectionOccurrences, sectionPosition, sections, sources } from "../../src/song-study/arrangement.js";
import { eighths, exactLocations, groupOffsets, positionNotes, prepareExample, quarterPulse } from "../../src/song-study/model.js";
import { studies } from "../../src/song-study/studies.js";
import type { Example } from "../../src/song-study/types.js";

describe("Black Dog recording order", () => {
  it("preserves the FRD section ranges and all 31 estimated occurrence anchors", () => {
    expect(sections.map(({ id }) => id)).toEqual(Array.from({ length: 11 }, (_, i) => "SEC-" + String(i + 1).padStart(2, "0")));
    expect(sections.map(({ id }) => sectionOccurrences(id).length)).toEqual([1, 8, 1, 4, 1, 1, 8, 1, 4, 1, 1]);
    expect(occurrences.map(({ startSeconds, endSeconds }) => [startSeconds, endSeconds])).toEqual([
      [0, 6], [6, 12], [12, 18], [18, 24], [24, 29], [29, 35], [35, 41], [41, 46], [46, 52],
      [52, 65], [65, 70], [70, 75], [75, 81], [81, 87], [88, 99], [99, 123], [124, 130],
      [130, 135], [135, 141], [141, 146], [146, 152], [152, 158], [158, 163], [163, 169],
      [169, 182], [182, 187], [187, 192], [192, 198], [198, 203], [203, 215], [215, 295],
    ]);
    expect(occurrences.every(({ timing }) => timing === "estimated")).toBe(true);
    expect(new Set(occurrences.map(({ id }) => id)).size).toBe(31);
    expect(sectionPosition("SEC-11")).toEqual({ startSeconds: 215, endSeconds: 295 });
  });

  it("links passages that return in different sections and keeps source realizations distinct", () => {
    expect(relatedSections(sections[1]!).map(({ id }) => id)).toEqual(["SEC-04", "SEC-07", "SEC-09"]);
    expect(relatedSections(sections[4]!).map(({ id }) => id)).toEqual(["SEC-10"]);
    expect(occurrences.filter(({ identity }) => identity === "e-turnaround").map(({ id }) => id)).toEqual(["EVT-08", "EVT-23"]);
    expect(new Set(Object.values(sources).map(({ realizationId }) => realizationId)).size).toBe(Object.keys(sources).length);
  });
});

describe("authored studies and engine facts", () => {
  it.each(sections)("has a useful comparison and playable examples for $title", ({ id }) => {
    expect(studies[id].length).toBeGreaterThan(0);
    for (const { question, listen, play, transfer, sources: ids, examples } of studies[id]) {
      expect([question, listen, play, transfer].every((text) => text.trim().length > 10)).toBe(true);
      expect(ids.every((source) => source in sources)).toBe(true);
      expect(examples.length).toBeGreaterThanOrEqual(2);
      for (const example of examples) {
        const prepared = prepareExample(example);
        expect(prepared.duration).toBeGreaterThan(0);
        expect(example.events.every((event) => Number.isInteger(event.at) && event.at >= 0 &&
          Number.isInteger(event.length) && event.length > 0 && (event.notes?.length || event.click))).toBe(true);
        const [min, max] = example.fretRange ?? [0, 7];
        const semitones = new Set(positionNotes(min, max, prepared.context).map((note) => note.semitone));
        expect(prepared.notes.every((note) => semitones.has(note.semitone))).toBe(true);
        expect(prepareExample(example, true).duration).toBe(prepared.duration);
        if (example.phrase) expect(prepared.phrase?.events.length).toBe(example.events.length);
      }
    }
  });

  it("derives the written chromatic degrees and retains the target in the comparison", () => {
    const [withApproach, without] = studies["SEC-02"][0]!.examples;
    const base = prepareExample(withApproach!);
    expect(base.notes.map((note) => [note.name, note.keyRelation?.degree, note.keyRelation?.alterationFromKey, note.scaleRelation?.inScale])).toEqual([
      ["E3", 5, 0, true], ["G3", 7, -1, true], ["G#3", 7, 0, false], ["A3", 1, 0, true],
    ]);
    expect(base.events.filter(({ names }) => !names.includes("G#3"))).toEqual(prepareExample(without!).events);
    expect(prepareExample(withApproach!, true).notes.map(({ name }) => name)).toEqual(["F#3", "A3", "A#3", "B3"]);
  });

  it("derives the same registered destination for the two candidate fingerings", () => {
    const notes = positionNotes(5, 9, {});
    expect(notes.find(({ position }) => position.stringIndex === 3 && position.fret === 7)?.name).toBe("D4");
    const e4 = notes.find(({ position }) => position.stringIndex === 3 && position.fret === 9)!;
    expect(e4.name).toBe("E4");
    expect(exactLocations(e4.semitone).map(({ position }) => position)).toContainEqual({ stringIndex: 4, fret: 5 });
  });

  it("keeps pickup and displaced starts on the same eighth-note unit as the audible pulse", () => {
    const [, pickup, turnaround] = studies["SEC-02"];
    expect(pickup!.examples[0]!.events.map(({ at }) => at)).toEqual([5, 6, 7, 8]);
    expect(eighths(9)).toEqual({ numerator: 9, denominator: 2 });
    expect(eighths(32)).toEqual({ numerator: 16, denominator: 1 });
    expect(groupOffsets(9, 4, 4)).toEqual([0, 1, 2, 3]);
    const demo = prepareExample(turnaround!.examples[0]!);
    expect(demo.events.filter(({ click }) => click).map(({ at }) => at)).toEqual([0, 9, 18, 27]);
    expect(quarterPulse(demo.duration, 4).filter(({ click }) => click === "accent").map(({ at }) => at)).toEqual([0, 8, 16, 24]);
  });

  it("uses explicit power-chord formulas and changes note roles with the current root", () => {
    const [groove, target] = studies["SEC-06"];
    const moving = prepareExample(groove!.examples[2]!);
    expect(moving.harmonyChanges.map(({ chord }) => formatNote(chord.root))).toEqual(["A", "G", "C", "G", "D"]);
    expect(moving.harmonyChanges.map(({ notes }) => notes.at(-1)?.chordRelation?.matchingTones[0]?.degree)).toEqual([5, 1, 1, 5, 5]);
    const [g, d] = target!.examples.map((example) => prepareExample(example));
    expect(g!.notes.find(({ name }) => name === "D4")?.chordRelation?.matchingTones[0]?.degree).toBe(5);
    expect(d!.notes.find(({ name }) => name === "D4")?.chordRelation?.matchingTones[0]?.degree).toBe(1);
    expect(d!.chord?.tones.map(({ note }) => formatNote(note))).toEqual(["D", "A"]);
  });

  it("keeps the two-voice example outside monophonic Phrase and reports vertical intervals", () => {
    const prepared = prepareExample(studies["SEC-07"][0]!.examples[2]!);
    expect(prepared.phrase).toBeUndefined();
    expect(prepared.simultaneousIntervals.map(({ label }) => label)).toEqual(["m3", "m3", "M3"]);
  });

  it("keeps the solo phrase, physical gesture, and fading gain as separate properties", () => {
    const [regions, , articulation, endings] = studies["SEC-11"];
    const [low, octave] = regions!.examples.map((example) => prepareExample(example));
    expect(low!.intervals).toEqual(octave!.intervals);
    expect(low!.phrase?.duration).toEqual(octave!.phrase?.duration);
    const bend = prepareExample(articulation!.examples[0]!);
    expect(bend.intervals[0]?.semitones).toBe(1);
    expect(bend.events.map(({ gesture }) => gesture)).toEqual(["Bend origin", "Sounding target"]);
    expect(new Set(prepareExample(endings!.examples[0]!).events.map(({ gain }) => gain))).toEqual(new Set([1, 0.55, 0.24]));
  });
});

describe("contrasting-song authoring check", () => {
  it("models a three-beat hymn entrance with the same question and example shapes", () => {
    // New Britain in Walker's Southern Harmony, Library of Congress item 2012562428.
    // The comparison uses original pitches and distinguishes the reference from teaching material.
    const hymn = {
      work: "Amazing Grace / New Britain",
      reference: "https://www.loc.gov/item/2012562428/",
      section: "First sung line",
      question: "How does an upbeat prepare the first stressed syllable?",
      examples: [
        { label: "Upbeat", description: "A sound on beat three leads into the next bar.", beats: 3, phrase: true,
          events: [{ at: 4, length: 2, notes: ["G3"] }, { at: 6, length: 4, notes: ["C4"] }] },
        { label: "On the barline", description: "The same two pitches begin on beat one.", beats: 3, phrase: true,
          events: [{ at: 6, length: 2, notes: ["G3"] }, { at: 8, length: 4, notes: ["C4"] }] },
      ] satisfies readonly Example[],
    };
    const [pickup, onBeat] = hymn.examples.map((example) => prepareExample(example));
    expect(pickup!.intervals).toEqual(onBeat!.intervals);
    expect(pickup!.phrase?.events[0]?.onset).toEqual({ numerator: 2, denominator: 1 });
    expect(onBeat!.phrase?.events[0]?.onset).toEqual({ numerator: 3, denominator: 1 });
    expect(quarterPulse(pickup!.duration, 3).filter(({ click }) => click === "accent").map(({ at }) => at)).toEqual([0, 6]);
  });
});
