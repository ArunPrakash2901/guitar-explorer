import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as engine from "../.lab-dist/engine/index.js";
import { createPracticePlan } from "../lab/practice-session.mjs";
import { createRoleLensMaterial } from "../lab/role-lens-material.mjs";
import {
  createAudioOut,
  cueDuration,
  normalizeCue,
  pitchFrequency,
  registerChord,
} from "../lab/audio-out.mjs";
import { harmonicGravityPromptCue, roleLensComparisonCue } from "../lab/audio-cues.mjs";

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? "" : result.error.message);
  return result.data;
}

function findLocations({ key, chord, stringIndex, pitchClass }) {
  return unwrap(engine.musicQueries.getFretboardLocations({
    board: engine.STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: stringIndex === undefined ? undefined : [stringIndex],
    pitchClasses: pitchClass === undefined ? undefined : [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  }));
}

const practice = createPracticePlan({
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(engine.musicQueries.getChordCatalog({})),
  findLocations,
  getInterval: (request) => unwrap(engine.musicQueries.getInterval(request)),
  formatNote: engine.formatNote,
});

const roleLens = createRoleLensMaterial({
  getHarmony: (request) => unwrap(engine.musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(engine.musicQueries.getChordCatalog({})),
  analyseNotes: (request) => unwrap(engine.musicQueries.analyseNotes(request)),
  findLocations: ({ key, chord, pitch }) => {
    const [analysis] = unwrap(engine.musicQueries.analyseNotes({ notes: [pitch], context: { key } }));
    return unwrap(engine.musicQueries.getFretboardLocations({
      board: engine.STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 8 },
      pitchClasses: [analysis.pitchClass],
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    }));
  },
  formatNote: engine.formatNote,
});

assert.equal(Math.round(pitchFrequency(engine.parsePitch("A4"), engine.toSemitone) * 1000) / 1000, 440);
assert.ok(Math.abs(pitchFrequency(engine.parsePitch("C4"), engine.toSemitone) - 261.626) < 0.01);

assert.deepEqual(
  registerChord(practice.context.chords.home.entry.chord, 3, engine.transposePitch).map(engine.formatPitch),
  ["G3", "B3", "D4"],
);
assert.deepEqual(
  registerChord(practice.context.chords.pressure.entry.chord, 3, engine.transposePitch).map(engine.formatPitch),
  ["D3", "F#3", "A3", "C4"],
);

const gPrompt = harmonicGravityPromptCue(practice.context, engine.transposePitch);
assert.equal(gPrompt.length, 2);
assert.deepEqual(gPrompt.map(({ at }) => at), [0, 1.03]);
assert.deepEqual(gPrompt[0].pitches.map(engine.formatPitch), ["G3", "B3", "D4"]);
assert.deepEqual(gPrompt[1].pitches.map(engine.formatPitch), ["D3", "F#3", "A3", "C4"]);
assert.equal(cueDuration(gPrompt), 1.81);

const aPrompt = harmonicGravityPromptCue(practice.transfer, engine.transposePitch);
assert.deepEqual(aPrompt[0].pitches.map(engine.formatPitch), ["A3", "C#4", "E4"]);
assert.deepEqual(aPrompt[1].pitches.map(engine.formatPitch), ["E3", "G#3", "B3", "D4"]);

const roleCue = roleLensComparisonCue(roleLens.context, engine.transposePitch);
assert.equal(roleCue.length, 6);
assert.deepEqual(roleCue.filter((_, index) => index % 2 === 1).map(({ pitches }) => engine.formatPitch(pitches[0])), ["C4", "C4", "C4"]);
assert.deepEqual(roleCue.filter((_, index) => index % 2 === 0).map(({ pitches }) => pitches.map(engine.formatPitch)), [
  ["A3", "C4", "E4", "G4"],
  ["D3", "F#3", "A3", "C4"],
  ["G3", "B3", "D4", "F#4"],
]);
assert.ok(cueDuration(roleCue) > 3.5 && cueDuration(roleCue) < 4.5);

assert.throws(() => normalizeCue([]), /at least one event/);
assert.throws(() => normalizeCue([{ at: -1, duration: 1, pitches: [engine.parsePitch("A4")] }]), /non-negative/);
assert.throws(() => normalizeCue([{ at: 0, duration: 0, pitches: [engine.parsePitch("A4")] }]), /greater than zero/);

class FakeParam {
  constructor() { this.calls = []; }
  setValueAtTime(value, time) { this.calls.push(["set", value, time]); }
  linearRampToValueAtTime(value, time) { this.calls.push(["ramp", value, time]); }
  cancelScheduledValues(time) { this.calls.push(["cancel", time]); }
}

class FakeOscillator {
  constructor() {
    this.frequency = new FakeParam();
    this.type = "sine";
    this.starts = [];
    this.stops = [];
    this.connections = [];
    this.disconnected = false;
  }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
  start(time) { this.starts.push(time); }
  stop(time) { this.stops.push(time); }
}

class FakeGain {
  constructor() {
    this.gain = new FakeParam();
    this.connections = [];
    this.disconnected = false;
  }
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
}

class FakeAudioContext {
  static instances = [];
  constructor() {
    this.state = "suspended";
    this.currentTime = 10;
    this.destination = { id: "destination" };
    this.oscillators = [];
    this.gains = [];
    this.resumeCalls = 0;
    FakeAudioContext.instances.push(this);
  }
  async resume() { this.resumeCalls += 1; this.state = "running"; }
  createOscillator() { const node = new FakeOscillator(); this.oscillators.push(node); return node; }
  createGain() { const node = new FakeGain(); this.gains.push(node); return node; }
}

const renderer = createAudioOut({ toSemitone: engine.toSemitone, AudioContextCtor: FakeAudioContext });
assert.equal(renderer.supported(), true);
const played = await renderer.play(gPrompt);
const fake = FakeAudioContext.instances[0];
assert.equal(fake.resumeCalls, 1);
assert.equal(played.eventCount, 2);
assert.equal(played.voiceCount, 7);
assert.equal(fake.oscillators.length, 7);
assert.ok(fake.oscillators.every((oscillator) => oscillator.type === "triangle"));
assert.ok(fake.oscillators.every((oscillator) => oscillator.starts.length === 1 && oscillator.starts[0] >= 10.03));
assert.ok(fake.gains.every((gain) => gain.connections.includes(fake.destination)));
assert.equal(renderer.stop(), 7);
assert.ok(fake.oscillators.every((oscillator) => oscillator.stops.length >= 2));
assert.equal(renderer.stop(), 0);

const unavailable = createAudioOut({ toSemitone: engine.toSemitone, AudioContextCtor: null });
assert.equal(unavailable.supported(), false);
await assert.rejects(() => unavailable.play(gPrompt), /unavailable/);

const productHtml = await readFile(new URL("../lab/product-spine.html", import.meta.url), "utf8");
const roleHtml = await readFile(new URL("../lab/role-lens.html", import.meta.url), "utf8");
const productAudio = await readFile(new URL("../lab/product-spine-audio.js", import.meta.url), "utf8");
const roleAudio = await readFile(new URL("../lab/role-lens-audio.js", import.meta.url), "utf8");

assert.match(productHtml, /id="product-audio-play"/);
assert.match(productHtml, /product-spine-audio\.js/);
assert.match(roleHtml, /id="role-audio-play"/);
assert.match(roleHtml, /role-lens-audio\.js/);
assert.match(productAudio, /addEventListener\("click", playPrompt\)/);
assert.match(roleAudio, /addEventListener\("click", playComparison\)/);
assert.doesNotMatch(`${productAudio}\n${roleAudio}`, /Tone\.|smplr|SoundFont|getUserMedia|MediaRecorder|MIDI/);

console.log("Audio Out v0 checks passed for registered chord reuse, cue scheduling, native renderer behavior, stopping and Harmonic Gravity/Role Lens wiring.");
