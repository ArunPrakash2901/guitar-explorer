import assert from "node:assert/strict";
import { createProgressionAudio } from "../lab/progression-audio.mjs";

const silentParam = {
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
};

function setup(initialState = "running") {
  let time = 0;
  let nextTimer = 0;
  let context;
  const timers = new Map();
  const oscillators = [];
  const resumes = [];
  const states = [];
  let contexts = 0;

  class FakeAudioContext {
    state = initialState;
    destination = {};
    get currentTime() { return time; }

    constructor() {
      contexts++;
      context = this;
    }

    resume() {
      return new Promise((resolve, reject) => resumes.push({
        resolve: () => { this.state = "running"; resolve(); },
        reject,
      }));
    }

    createGain() {
      return { gain: silentParam, connect() {}, disconnect() { this.disconnected = true; } };
    }

    createOscillator() {
      const oscillator = {
        frequency: {},
        ended: false,
        connect(gain) { this.gain = gain; },
        disconnect() { this.disconnected = true; },
        start(at) { this.startTime = at; },
        stop(at = time) { this.stopTime = at; },
        finish() {
          if (this.ended || time < this.stopTime) return;
          this.ended = true;
          this.onended?.();
        },
      };
      oscillators.push(oscillator);
      return oscillator;
    }
  }

  const player = createProgressionAudio({
    AudioContextCtor: FakeAudioContext,
    onState: (state) => states.push(state),
    setTimer(callback, delay) {
      assert.equal(delay, 25);
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimer: (id) => timers.delete(id),
  });

  return {
    player, oscillators, states, resumes, timers,
    get context() { return context; },
    get contexts() { return contexts; },
    advance(target) {
      assert.ok(target >= time, "The AudioContext clock always moves forward");
      time = target;
      for (const oscillator of oscillators) oscillator.finish();
      for (const tick of [...timers.values()]) tick();
    },
  };
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, actual + " does not match " + expected);
}

const fourGrips = [[60], [62], [64], [65]];

{
  const { player, oscillators, states, advance, timers } = setup();
  advance(10);
  assert.equal(await player.playChord([57, 64, 69], { slot: 2, bpm: 120 }), true);
  assert.deepEqual(states, [{ status: "starting", slot: null }, { status: "playing", slot: null }]);
  const [first, second, third] = oscillators;
  near(first.startTime, 10.045);
  near(second.startTime - first.startTime, 0.012);
  near(third.startTime - first.startTime, 0.024);
  near(third.frequency.value, 440);
  advance(first.startTime);
  assert.deepEqual(states.at(-1), { status: "playing", slot: 2 });
  advance(first.startTime + 2);
  assert.deepEqual(states.at(-1), { status: "idle", slot: null });
  assert.equal(timers.size, 0);
  assert.ok(oscillators.every(({ disconnected, gain }) => disconnected && gain.disconnected));
}

{
  const { player, oscillators, states, advance, timers } = setup();
  const chords = fourGrips.map((grip) => [...grip]);
  await player.playProgression(chords, { bpm: 120 });
  chords[1][0] = 72;
  const origin = oscillators[0].startTime;
  for (let bar = 0; bar < 4; bar++) {
    advance(origin + bar * 2 - (bar === 0 ? 0 : 0.1));
    near(oscillators[bar].startTime, origin + bar * 2);
    near(oscillators[bar].frequency.value, 440 * 2 ** ((fourGrips[bar][0] - 69) / 12));
    advance(origin + bar * 2);
    assert.deepEqual(states.at(-1), { status: "playing", slot: bar });
  }
  advance(origin + 8);
  assert.equal(timers.size, 0);
  assert.equal(oscillators.length, 4);
  assert.deepEqual(states.at(-1), { status: "idle", slot: null });
}

{
  const { player, oscillators, states, advance, timers } = setup();
  const bpm = 137;
  const barLength = 240 / bpm;
  await player.playProgression(fourGrips, { bpm, loop: true });
  const origin = oscillators[0].startTime;
  for (let bar = 0; bar < 12; bar++) {
    const start = origin + bar * barLength;
    advance(start - (bar === 0 ? 0 : 0.115));
    near(oscillators[bar].startTime, start);
    advance(start);
    assert.deepEqual(states.at(-1), { status: "playing", slot: bar % 4 });
  }

  const nextStart = origin + 12 * barLength;
  advance(nextStart - 0.09);
  const pending = oscillators.at(-1);
  near(pending.startTime, nextStart);
  player.stop();
  assert.ok(pending.stopTime < pending.startTime);
  assert.ok(pending.disconnected && pending.gain.disconnected);
  assert.equal(timers.size, 0);
  assert.deepEqual(states.at(-1), { status: "idle", slot: null });
  advance(nextStart + 10);
  assert.equal(oscillators.length, 13);
}

{
  const { player, oscillators, states, advance } = setup();
  await player.playProgression(fourGrips, { bpm: 120, loop: true });
  const origin = oscillators[0].startTime;
  advance(origin + 6.05);
  assert.equal(oscillators.length, 1, "Missed bars do not burst when the timer wakes up");
  assert.deepEqual(states.at(-1), { status: "playing", slot: null });
  advance(origin + 7.9);
  near(oscillators[1].startTime, origin + 8);
  advance(origin + 8);
  assert.deepEqual(states.at(-1), { status: "playing", slot: 0 });
  player.stop();
}

{
  const fixture = setup();
  const { player, oscillators, states, advance, timers } = fixture;
  await player.playProgression(fourGrips, { bpm: 120, loop: true });
  advance(0.05);
  const previous = oscillators[0];

  await assert.rejects(player.playChord([], { slot: 0, bpm: 120 }), /one to six/);
  await assert.rejects(player.playChord([69], { slot: 4, bpm: 120 }), /index from 0 to 3/);
  await assert.rejects(player.playChord([128], { slot: 0, bpm: 120 }), /registered semitones/);
  await assert.rejects(player.playChord([69], { slot: 0, bpm: 39 }), /40 and 220/);
  await assert.rejects(player.playProgression(fourGrips.slice(0, 3), { bpm: 120 }), /four playable grips/);
  await assert.rejects(player.playProgression(fourGrips, { bpm: 120, loop: "yes" }), /on or off/);
  assert.equal(timers.size, 1);
  assert.deepEqual(states.at(-1), { status: "playing", slot: 0 });
  assert.equal(previous.disconnected, undefined);

  assert.equal(await player.playChord([69], { slot: 3, bpm: 100 }), true);
  assert.equal(fixture.contexts, 1, "Restart reuses the same AudioContext");
  assert.ok(previous.disconnected && previous.gain.disconnected);
  near(previous.stopTime, 0.05);
  assert.equal(timers.size, 1);
  near(oscillators[1].startTime, 0.095);
  advance(0.095);
  assert.deepEqual(states.at(-1), { status: "playing", slot: 3 });
  player.stop();
  assert.ok(oscillators[1].disconnected);
}

{
  const fixture = setup("suspended");
  const { player, resumes, oscillators, advance, states } = fixture;
  const first = player.playChord([60], { slot: 0, bpm: 120 });
  const second = player.playChord([69], { slot: 1, bpm: 120 });
  resumes[1].resolve();
  assert.equal(await second, true);
  resumes[0].reject(new Error("Superseded resume failed"));
  assert.equal(await first, false);
  assert.equal(fixture.contexts, 1);
  assert.equal(oscillators.length, 1);
  near(oscillators[0].frequency.value, 440);
  advance(0.045);
  assert.deepEqual(states.at(-1), { status: "playing", slot: 1 });
  player.stop();
}

{
  const { player, resumes, oscillators, states, timers } = setup("suspended");
  const pending = player.playChord([69], { slot: 0, bpm: 120 });
  player.stop();
  resumes[0].resolve();
  assert.equal(await pending, false);
  assert.equal(timers.size, 0);
  assert.equal(oscillators.length, 0);
  assert.deepEqual(states.at(-1), { status: "idle", slot: null });
}

{
  const { player, resumes, states } = setup("suspended");
  const pending = player.playChord([69], { slot: 0, bpm: 120 });
  resumes[0].reject(new Error("Browser blocked audio"));
  await assert.rejects(pending, /Browser blocked audio/);
  assert.deepEqual(states.at(-1), { status: "idle", slot: null });
  await assert.rejects(
    createProgressionAudio({ AudioContextCtor: null }).playChord([69], { slot: 0, bpm: 120 }),
    /Web Audio is unavailable/,
  );
}

console.log("progression audio transport, loop alignment, stop and restart checks passed");
