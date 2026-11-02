import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as engine from "../.lab-dist/engine/index.js";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import { createSampledGuitar, sampleAttacks } from "../lab/sampled-guitar.mjs";

assert.equal(STEEL_SAMPLES.length, 12);
assert.equal(new Set(STEEL_SAMPLES.map(({ stringIndex, fret }) => `${stringIndex}:${fret}`)).size, 12);
assert.equal(STEEL_SAMPLES.reduce((sum, { bytes }) => sum + bytes, 0), 1051631);
for (const sample of STEEL_SAMPLES) {
  const location = engine.getNoteAt(engine.STANDARD_FRETBOARD, sample);
  assert.equal(engine.formatPitch(engine.pitchFromSemitone(location.semitone)), sample.note);
  const bytes = await readFile(new URL(`../lab/samples/steel/${sample.file}`, import.meta.url));
  assert.equal(bytes.length, sample.bytes);
  const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(blob, sample.gitBlobSha, sample.file);
}

const event = Object.freeze({
  at: 0.5, duration: 0.4, level: 0.1, gesture: "strum", direction: "down",
  strumSpread: 0.08, positions: [{ stringIndex: 0, fret: 3 }, { stringIndex: 1, fret: 2 }],
  pitches: [{}, {}],
});
assert.deepEqual(sampleAttacks([event])[0].samples.map(({ note }) => note), ["G2", "B2"]);
assert.deepEqual(sampleAttacks([{ ...event, direction: "up" }])[0].samples.map(({ note }) => note), ["B2", "G2"]);
assert.throws(() => sampleAttacks([{ ...event, positions: [event.positions[0]] }]), /matching/);
assert.throws(() => sampleAttacks([{ ...event, positions: [{ stringIndex: 0, fret: 9 }, event.positions[1]] }]), /No acoustic sample/);

const starts = [];
const stops = [];
class AudioContextFake {
  currentTime = 10;
  destination = {};
  state = "running";
  async decodeAudioData() { return { duration: 2 }; }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}, disconnect() {},
    };
  }
  createBufferSource() {
    return {
      connect() {}, disconnect() {},
      start(time) { starts.push(time); },
      stop(time) { stops.push(time); },
    };
  }
}
let fetches = 0;
const player = createSampledGuitar({
  AudioContextCtor: AudioContextFake,
  fetchAsset: async (url) => {
    fetches += 1;
    const sample = STEEL_SAMPLES.find(({ file }) => url.pathname.endsWith(file));
    assert.ok(sample);
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(sample.bytes) };
  },
});
const played = await player.play([event, { ...event, at: 1, direction: "up" }]);
assert.equal(fetches, 12);
assert.equal(played.eventCount, 2);
assert.equal(played.voiceCount, 4);
assert.ok(starts[0] < starts[1] && starts[1] < starts[2]);
assert.ok(Math.abs(starts[1] - starts[0] - 0.08) < 1e-9);
assert.equal(player.stop(), 4);
assert.equal(stops.length, 8);
await player.play([event]);
assert.equal(fetches, 12, "decoded samples should be reused");

const unavailable = createSampledGuitar({
  AudioContextCtor: AudioContextFake,
  fetchAsset: async () => ({ ok: false }),
});
await assert.rejects(() => unavailable.play([event]), /sample unavailable/);

const app = await readFile(new URL("../lab/accompaniment-app.js", import.meta.url), "utf8");
assert.match(app, /native synth fallback/);
assert.match(app, /stopPlayback/);
console.log("Sampled guitar: 12 source blobs, string order, scheduling, stop, cache and failure path passed.");
