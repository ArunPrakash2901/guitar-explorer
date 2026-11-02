import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as engine from "../.lab-dist/engine/index.js";
import { createPracticePlan } from "../lab/practice-session.mjs";
import {
  ACCOMPANIMENT_PRESETS,
  buildAccompanimentCue,
  createAccompanimentPlan,
} from "../lab/accompaniment-plan.mjs";
import {
  OPEN_POSITION_VOICINGS,
  buildGuitarPerformanceCue,
  guitarVoicingPositions,
} from "../lab/guitar-performance.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.data;
}
const practice = createPracticePlan({
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(engine.musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex],
    pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
});
const progression = [
  practice.context.chords.home,
  practice.context.chords.departure,
  practice.context.chords.pressure,
  practice.context.chords.home,
];
const plan = createAccompanimentPlan({
  progression, bpm: 84, barsPerChord: [1, 1, 1, 1], pattern: ACCOMPANIMENT_PRESETS.open.pattern,
});
const dependencies = {
  board: engine.STANDARD_FRETBOARD,
  getNoteAt: engine.getNoteAt,
  pitchFromSemitone: engine.pitchFromSemitone,
  toSemitone: engine.toSemitone,
  transposePitch: engine.transposePitch,
};

assert.deepEqual(Object.keys(OPEN_POSITION_VOICINGS), ["G", "C", "D7"]);
assert.deepEqual(guitarVoicingPositions("G").map(({ stringIndex, fret }) => [stringIndex, fret]),
  [[0, 3], [1, 2], [2, 0], [3, 0], [4, 0], [5, 3]]);
assert.deepEqual(guitarVoicingPositions("C").map(({ stringIndex, fret }) => [stringIndex, fret]),
  [[1, 3], [2, 2], [3, 0], [4, 1], [5, 0]]);
assert.deepEqual(guitarVoicingPositions("D7").map(({ stringIndex, fret }) => [stringIndex, fret]),
  [[2, 0], [3, 2], [4, 1], [5, 2]]);
assert.throws(() => guitarVoicingPositions("Am"), /No curated guitar voicing/);

const legacy = buildAccompanimentCue(plan, engine.transposePitch);
const guitar = buildGuitarPerformanceCue(plan, dependencies);
assert.equal(guitar.length, legacy.length);
assert.deepEqual(guitar.map(({ at }) => at), legacy.map(({ at }) => at));
assert.deepEqual(guitar.map(({ direction }) => direction), legacy.map(({ direction }) => direction));
assert.deepEqual(guitar.map(({ chordIndex }) => chordIndex), legacy.map(({ chordIndex }) => chordIndex));
assert.deepEqual(guitar.map(({ chordIndex }) => chordIndex).filter((value, index, all) => index === 0 || value !== all[index - 1]), [0, 1, 2, 3]);
assert.deepEqual(guitar[0].pitches.map(engine.formatPitch), ["G2", "B2", "D3", "G3", "B3", "G4"]);
assert.deepEqual(guitar[6].pitches.map(engine.formatPitch), ["C3", "E3", "G3", "C4", "E4"]);
assert.deepEqual(guitar[12].pitches.map(engine.formatPitch), ["D3", "A3", "C4", "F#4"]);
assert.deepEqual(guitar[18].pitches.map(engine.formatPitch), guitar[0].pitches.map(engine.formatPitch));
assert.equal(guitar[0].positions.length, 6);
assert.equal(guitar[6].positions.length, 5);
assert.equal(guitar[12].positions.length, 4);
assert.ok(guitar.every((event) => Object.isFrozen(event) && Object.isFrozen(event.positions)));
assert.ok(guitar.some((event) => event.direction === "up"));
assert.throws(() => buildGuitarPerformanceCue(plan, {}), /engine guitar\/pitch operations/);

const html = await readFile(new URL("../lab/accompaniment.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/accompaniment-app.js", import.meta.url), "utf8");
assert.match(html, /id="guitar-position-playback"/);
assert.match(app, /buildGuitarPerformanceCue/);
assert.match(app, /guitar-position-playback/);
assert.doesNotMatch(app, /SoundFont|sfz|AudioWorklet|MediaRecorder/);
console.log("Guitar Performance v0: curated positions, engine pitch agreement, timing preservation and A/B wiring passed.");
