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
import {
  DEFAULT_AUDIO_BPM,
  beatsToSeconds,
  harmonicGravityPromptCue,
  roleLensComparisonCue,
  singlePitchCue,
} from "../lab/audio-cues.mjs";

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
assert.equal(DEFAULT_AUDIO_BPM, 84);
assert.equal(beatsToSeconds(2, 120), 1);
assert.throws(() => beatsToSeconds(1, 20), /between 40 and 220/);

assert.deepEqual(
  registerChord(practice.context.chords.home.entry.chord, 3, engine.transposePitch).map(engine.formatPitch),
  ["G3", "B3", "D4"],
);
assert.deepEqual(
  registerChord(practice.context.chords.pressure.entry.chord, 3, engine.transposePitch).map(engine.formatPitch),
  ["D3", "F#3", "A3", "C4"],
);

const gPrompt = harmonicGravityPromptCue(practice.context, engine.transposePitch, { bpm: 84 });
assert.equal(gPrompt.length, 2);
assert.equal(gPrompt[0].gesture, "strum");
assert.equal(gPrompt[1].gesture, "strum");
assert.ok(Math.abs(gPrompt[1].at - beatsToSeconds(2, 84)) < 1e-9);
assert.deepEqual(gPrompt[0].pitches.map(engine.formatPitch), ["G3", "B3", "D4"]);
assert.deepEqual(gPrompt[1].pitches.map(engine.formatPitch), ["D3", "F#3", "A3", "C4"]);

const fastPrompt = harmonicGravityPromptCue(practice.context, engine.transposePitch, { bpm: 120 });
assert.ok(cueDuration(fastPrompt) < cueDuration(gPrompt));

const aPrompt = harmonicGravityPromptCue(practice.transfer, engine.transposePitch, { bpm: 84 });
assert.deepEqual(aPrompt[0].pitches.map(engine.formatPitch), ["A3", "C#4", "E4"]);
assert.deepEqual(aPrompt[1].pitches.map(engine.formatPitch), ["E3", "G#3", "B3", "D4"]);

const anchorCue = singlePitchCue(roleLens.context.anchor.pitch, { bpm: 84 });
assert.equal(anchorCue.length, 1);
assert.equal(anchorCue[0].gesture, "pluck");
assert.equal(engine.formatPitch(anchorCue[0].pitches[0]), "C4");

const roleCue = roleLensComparisonCue(roleLens.context, engine.transposePitch, { bpm: 84 });
assert.equal(roleCue.length, 6);
assert.deepEqual(roleCue.filter((_, index) => index % 2 === 1).map(({ gesture }) => gesture), ["pluck", "pluck", "pluck"]);
assert.deepEqual(roleCue.filter((_, index) => index % 2 === 1).map(({ pitches }) => engine.formatPitch(pitches[0])), ["C4", "C4", "C4"]);
assert.deepEqual(roleCue.filter((_, index) => index % 2 === 0).map(({ pitches }) => pitches.map(engine.formatPitch)), [
  ["A3", "C4", "E4", "G4"],
  ["D3", "F#3", "A3", "C4"],
  ["G3", "B3", "D4", "F#4"],
]);
assert.ok(cueDuration(roleLensComparisonCue(roleLens.context, engine.transposePitch, { bpm: 120 })) < cueDuration(roleCue));

assert.throws(() => normalizeCue([]), /at least one event/);
assert.throws(() => normalizeCue([{ at: -1, duration: 1, pitches: [engine.parsePitch("A4")] }]), /non-negative/);
assert.throws(() => normalizeCue([{ at: 0, duration: 0, pitches: [engine.parsePitch("A4")] }]), /greater than zero/);
assert.throws(() => normalizeCue([{ at: 0, duration: 1, pitches: [engine.parsePitch("A4")], gesture: "bow" }]), /pluck or strum/);
assert.throws(() => normalizeCue([{ at: 0, duration: 1, pitches: [engine.parsePitch("A4")], strumSpread: 0.4 }]), /at most 0.25/);

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

class FakeFilter {
  constructor() {
    this.frequency = new FakeParam();
    this.Q = new FakeParam();
    this.type = "lowpass";
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
    this.filters = [];
    this.resumeCalls = 0;
    FakeAudioContext.instances.push(this);
  }
  async resume() { this.resumeCalls += 1; this.state = "running"; }
  createOscillator() { const node = new FakeOscillator(); this.oscillators.push(node); return node; }
  createGain() { const node = new FakeGain(); this.gains.push(node); return node; }
  createBiquadFilter() { const node = new FakeFilter(); this.filters.push(node); return node; }
}

const renderer = createAudioOut({ toSemitone: engine.toSemitone, AudioContextCtor: FakeAudioContext });
assert.equal(renderer.supported(), true);
const played = await renderer.play(gPrompt);
const fake = FakeAudioContext.instances[0];
assert.equal(fake.resumeCalls, 1);
assert.equal(played.eventCount, 2);
assert.equal(played.voiceCount, 7);
assert.equal(played.timbre, "native-plucked-string");
assert.equal(fake.oscillators.length, 21);
assert.equal(fake.filters.length, 7);
assert.ok(fake.oscillators.every((oscillator) => oscillator.starts.length === 1 && oscillator.starts[0] >= 10.03));
assert.ok(new Set(fake.oscillators.map((oscillator) => oscillator.starts[0])).size > 2, "strum should stagger pitch starts");
assert.ok(fake.filters.every((filter) => filter.connections.includes(fake.destination)));
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
assert.match(productHtml, /id="product-audio-tempo"/);
assert.match(productHtml, /Hear guitar prompt/);
assert.match(productHtml, /product-spine-audio\.js/);
assert.match(roleHtml, /id="role-audio-play"/);
assert.match(roleHtml, /id="role-audio-anchor"/);
assert.match(roleHtml, /id="role-audio-tempo"/);
assert.match(roleHtml, /role-lens-audio\.js/);
assert.match(productAudio, /addEventListener\("click", playPrompt\)/);
assert.match(productAudio, /addEventListener\("input", syncTempoLabel\)/);
assert.match(roleAudio, /addEventListener\("click", playAnchor\)/);
assert.match(roleAudio, /addEventListener\("click", playComparison\)/);
assert.doesNotMatch(`${productAudio}\n${roleAudio}`, /Tone\.|smplr|SoundFont|getUserMedia|MediaRecorder|MIDI/);

console.log("Audio Out v0.5 checks passed for tempo-aware registered chords, plucked single notes, staggered strums, native plucked-string rendering, stopping and Harmonic Gravity/Role Lens wiring.");
