import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { planProgressionStrokes, ProgressionAudio } from "../lab/progression-audio.mjs";

function card(base) {
  return {
    voicingIndex: 0,
    voicings: [{ notes: [base, base + 4, base + 7].map((semitone) => ({ semitone })) }],
  };
}

const cards = [card(48), card(55), card(53), card(48)];
const plan = planProgressionStrokes(cards, 120);
assert.equal(plan.secondsPerBar, 2);
assert.equal(plan.loopSeconds, 8);
assert.deepEqual(plan.strokes.map(({ slotIndex }) => slotIndex), [0, 0, 1, 1, 2, 2, 3, 3]);
assert.deepEqual(plan.strokes.map(({ seconds }) => seconds), [0, 1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(plan.strokes[0].midis, [48, 52, 55]);
assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.strokes));

assert.throws(() => planProgressionStrokes(cards, 49), RangeError);
assert.throws(() => planProgressionStrokes(cards, 181), RangeError);
assert.throws(() => planProgressionStrokes(cards.slice(0, 3), 120), RangeError);
assert.throws(() => planProgressionStrokes([card(48), card(55), { voicingIndex: 0, voicings: [] }, card(48)], 120), /playable guitar grip/);

class FakeOscillator {
  constructor() {
    this.frequency = { setValueAtTime: (frequency) => { this.frequencyValue = frequency; } };
    this.startTime = null;
    this.stopTime = null;
  }
  connect() {}
  disconnect() {}
  start(value) { this.startTime = value; }
  stop(value) { this.stopTime = value ?? 0; }
}
class FakeGain {
  constructor() {
    this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }
  connect() {}
  disconnect() {}
}
class FakeContext {
  constructor() {
    this.currentTime = 100;
    this.state = "suspended";
    this.destination = {};
    this.oscillators = [];
    FakeContext.instance = this;
  }
  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() { return new FakeGain(); }
  async resume() { this.state = "running"; }
  async close() { this.state = "closed"; }
}

const audio = new ProgressionAudio(FakeContext);
assert.equal(audio.activeSlot(), null);
assert.equal(await audio.play(cards, 120), true);
assert.equal(audio.isPlaying(), true);
const context = FakeContext.instance;
assert.equal(context.oscillators.length, 3, "First scheduled strum uses three physical voices");
assert.equal(context.oscillators[0].startTime, 100.1);
assert.equal(context.oscillators[0].frequencyValue, 130.8127826502993); // C3, MIDI 48
assert.equal(audio.activeSlot(), null, "No active card during 100 ms count-in");
context.currentTime = 101.08;
audio.fillSchedule();
assert.equal(context.oscillators.length, 6, "Second strum scheduled on the same clock");
assert.equal(audio.activeSlot(), 0);
context.currentTime = 102.2;
assert.equal(audio.activeSlot(), 1);
context.currentTime = 108.2;
assert.equal(audio.activeSlot(), 0, "Playback cycles back to the first chord");
audio.stop();
assert.equal(audio.isPlaying(), false);
assert.equal(audio.activeSlot(), null);
assert.equal(audio.interval, null);
assert.ok(context.oscillators.every(({ stopTime }) => stopTime !== null));

assert.equal(await audio.audition(cards[2]), true);
assert.equal(audio.isPlaying(), false, "Single chord audition is not a looping transport");
assert.equal(context.oscillators.length, 9);
await audio.dispose();
assert.equal(context.state, "closed");

const outputRoot = new URL("../.preview-dist/", import.meta.url);
const page = await readFile(new URL("progression.html", outputRoot), "utf8");
const browserCode = await readFile(new URL("progression-workspace.mjs", outputRoot), "utf8");
const audioAsset = await readFile(new URL("progression-audio.mjs", outputRoot), "utf8");
assert.match(page, /id="play-progression"/);
assert.match(page, /id="stop-progression"/);
assert.match(browserCode, /progression-audio\.mjs\?ge-revision=/);
assert.match(audioAsset, /class ProgressionAudio/);
console.log("progression audio transport, loop alignment, stop and restart checks passed");
