import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as engine from "../.lab-dist/engine/index.js";
import { createPracticePlan } from "../lab/practice-session.mjs";
import {
  ACCOMPANIMENT_PRESETS,
  accompanimentDurationSeconds,
  buildAccompanimentCue,
  createAccompanimentPlan,
  normalizeAccompanimentPattern,
  normalizeBarsPerChord,
} from "../lab/accompaniment-plan.mjs";

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
assert.deepEqual(progression.map(({ symbol }) => symbol), ["G", "C", "D7", "G"]);

const plan = createAccompanimentPlan({
  progression,
  bpm: 84,
  barsPerChord: [1, 1, 1, 1],
  pattern: ACCOMPANIMENT_PRESETS.open.pattern,
});
assert.deepEqual(plan.meter, { beats: 4, beatUnit: 4, subdivisionsPerBar: 8 });
assert.equal(plan.bpm, 84);
assert.deepEqual(plan.barsPerChord, [1, 1, 1, 1]);
assert.equal(Math.round(accompanimentDurationSeconds(plan) * 1000) / 1000, 11.429);

const cue = buildAccompanimentCue(plan, engine.transposePitch);
assert.equal(cue.length, 24);
assert.equal(cue[0].direction, "down");
assert.equal(cue[1].direction, "down");
assert.equal(cue[2].direction, "up");
assert.deepEqual(cue[0].pitches.map(engine.formatPitch), ["G3", "B3", "D4"]);
assert.deepEqual(cue[6].pitches.map(engine.formatPitch), ["C3", "E3", "G3"]);
assert.deepEqual(cue[12].pitches.map(engine.formatPitch), ["D3", "F#3", "A3", "C4"]);
assert.ok(cue.every((event) => event.gesture === "strum"));
assert.ok(cue.every((event) => event.direction === "down" || event.direction === "up"));

const slow = createAccompanimentPlan({ ...plan, bpm: 60 });
const fast = createAccompanimentPlan({ ...plan, bpm: 120 });
assert.equal(accompanimentDurationSeconds(slow), 16);
assert.equal(accompanimentDurationSeconds(fast), 8);

const mixedBars = createAccompanimentPlan({ ...plan, barsPerChord: [1, 2, 3, 4] });
assert.equal(accompanimentDurationSeconds(mixedBars), 10 * 4 * (60 / 84));
assert.equal(buildAccompanimentCue(mixedBars, engine.transposePitch).length, 60);

assert.deepEqual(normalizeBarsPerChord([1, 2, 3, 4], 4), [1, 2, 3, 4]);
assert.throws(() => normalizeBarsPerChord([1, 2], 4), /one value for every chord/);
assert.throws(() => normalizeBarsPerChord([1, 2, 3, 5], 4), /1 to 4/);
assert.deepEqual(normalizeAccompanimentPattern(ACCOMPANIMENT_PRESETS.steady.pattern), ACCOMPANIMENT_PRESETS.steady.pattern);
assert.throws(() => normalizeAccompanimentPattern(["rest", "rest", "rest", "rest", "rest", "rest", "rest", "rest"]), /at least one strum/);
assert.throws(() => normalizeAccompanimentPattern(["down"]), /exactly eight/);
assert.throws(() => normalizeAccompanimentPattern(["down", "up", "rest", "down", "up", "rest", "down", "sideways"]), /down, up or rest/);

const html = await readFile(new URL("../lab/accompaniment.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/accompaniment-app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../lab/accompaniment.css", import.meta.url), "utf8");
assert.match(html, /G → C → D7 → G/);
assert.match(html, /id="accompaniment-tempo"/);
assert.match(html, /id="progression-controls"/);
assert.match(html, /id="pattern-grid"/);
assert.match(html, /data-preset="open"/);
assert.match(html, /accompaniment-app\.js/);
assert.match(app, /buildAccompanimentCue/);
assert.match(app, /data-preset/);
assert.match(app, /playAccompaniment/);
assert.match(css, /\.pattern-grid/);
assert.doesNotMatch(app, /MediaRecorder|getUserMedia|AudioWorklet|Tone\.|smplr|SoundFont|MIDI/);
assert.doesNotMatch(html, /src="\/looper-app\.js"|src="\/looper-runtime\.mjs"/);

console.log("Accompaniment v1 checks passed for supplied G-C-D7-G harmony, editable bars, eighth-note down/up/rest patterns, tempo scaling and browser wiring.");
