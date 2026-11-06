import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { musicQueries, toSemitone } from "../.lab-dist/engine/index.js";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import { createWorldAudio } from "../lab/musical-worlds-audio.mjs";
import { createWorldTake } from "../lab/musical-worlds-takes.mjs";
import {
  WORLD_DEFINITIONS, ARRANGEMENTS, NOTE_PALETTE, FEELS,
  initialWorldState, editGrid, emptyGrid, shapeGridCell, positionFromKey,
  buildWorldScore, worldRoleFacts,
} from "../lab/musical-worlds-material.mjs";

const keys = new Set(STEEL_SAMPLES.map(x => x.stringIndex + ":" + x.fret));
assert.equal(WORLD_DEFINITIONS.length, 7);
assert.equal(new Set(WORLD_DEFINITIONS.map(x => x.id)).size, 7);
for (const k of NOTE_PALETTE) {
  assert.ok(keys.has(k), "Every offered physical position has a verified recording: " + k);
  const fact = musicQueries.getNoteAtFret({ position: positionFromKey(k) });
  assert.equal(fact.ok, true, k);
}
assert.throws(() => positionFromKey("outside"));
const initial = initialWorldState();
let state = editGrid(initial, "groove", 6, "3:0");
state = shapeGridCell(state, "groove", 6, "held");
assert.equal(initial.groove[6].note, "mute");
assert.equal(state.groove[6].note, "3:0");
assert.equal(state.groove[6].held, true);
assert.equal(state.pattern, initial.pattern, "A groove edit cannot change the band's part");
assert.throws(() => editGrid(state, "pattern", 16, "3:0"));
assert.throws(() => editGrid(state, "pattern", 3, "7:14"));

const lead = score => score.events.filter(e => e.instrument === "guitar");
const scoreFor = (world, options = {}, mode = "full") => buildWorldScore({ ...initial, world, ...options }, { mode });
const facts = worldRoleFacts(musicQueries, "4:1");
assert.deepEqual(facts.map(c => c.symbol), ["G", "C", "D7"]);
assert.deepEqual(facts.map(c => c.relation.isChordTone), [false, true, true]);
const detective = scoreFor("detective");
assert.deepEqual(detective.labels, ["G", "C", "D7", "G"]);
assert.ok(detective.events.some(e => e.instrument === "chord" && e.chord === "D7"),
  "A named D7 must have an actual D7 voicing event, not only a bass root");
assert.deepEqual(new Set(lead(detective).map(e => e.note)), new Set(["4:1"]));
assert.equal(lead(scoreFor("detective", {}, "backing")).length, 0, "Play along leaves the anchor to the guitarist");
assert.ok(scoreFor("detective", { context: "C" }).events.filter(e => e.instrument === "chord").every(e => e.chord === "C"));

const reply = editGrid(initial, "response", 5, "3:2").response;
const call = scoreFor("dialogue", { response: reply }, "call");
assert.ok(lead(call).every(e => Math.floor(e.step / 16) % 2 === 0), "The reply bars stay free of a generated lead");
assert.deepEqual(lead(scoreFor("dialogue", { response: reply }, "solo")).map(e => e.step), [21, 53]);
assert.ok(scoreFor("dialogue").labels[1].startsWith("Your turn"));
const reconstruction = editGrid(initial, "reconstruction", 2, "4:1").reconstruction;
const original = scoreFor("missing", { reconstruction }, "original");
const draft = scoreFor("missing", { reconstruction });
assert.deepEqual(lead(draft).map(e => e.step), [2, 34], "Hearing a reconstruction plays the learner's part, not the hidden answer");
assert.notDeepEqual(lead(draft), lead(original));
assert.equal(lead(scoreFor("missing", {}, "backing")).length, 0);
assert.equal(scoreFor("missing", {}, "solo").events.length, 0);
assert.equal(new Set(ARRANGEMENTS.map(a => JSON.stringify(lead(scoreFor("missing", { arrangement: a.id }, "original"))))).size, 3,
  "A different backing supplies a different lead to reconstruct");
assert.notDeepEqual(lead(scoreFor("composition", { form: "AABA" })), lead(scoreFor("composition", { form: "ABAB" })));
const expressions = FEELS.map(([feel]) => lead(scoreFor("expression", { feel })));
for (const events of expressions) assert.deepEqual(events.map(e => e.note), expressions[0].map(e => e.note));
assert.equal(new Set(expressions.map(events => JSON.stringify(events.map(e => [e.offsetSteps, e.duration, e.velocity])))).size, 4,
  "Four treatments change the actual performance while keeping the pitches");
assert.notDeepEqual(scoreFor("groove").events, scoreFor("groove", { groove: state.groove }).events);
const accent = shapeGridCell(initial, "groove", 3, "accent").groove;
const ghosts = s => s.events.filter(e => e.instrument === "mute");
assert.ok(ghosts(scoreFor("groove", { groove: accent }))[0].velocity > ghosts(scoreFor("groove"))[0].velocity);

class FakeNode {
  constructor(audio) {
    this.audio = audio;
    this.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    this.gain = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
    this.stops = [];
  }
  connect() {}
  disconnect() { this.disconnected = true; }
  start(time) { this.at = time; this.audio.starts.push(this); }
  stop(time) { this.stops.push(time); }
}
class FakeContext {
  constructor() {
    this.currentTime = 5; this.sampleRate = 44100; this.state = "running"; this.starts = [];
    this.destination = new FakeNode(this);
    FakeContext.last = this;
  }
  async resume() { this.state = "running"; }
  createGain() { return new FakeNode(this); }
  createOscillator() { return new FakeNode(this); }
  createBufferSource() { return new FakeNode(this); }
  createBiquadFilter() { return new FakeNode(this); }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  async decodeAudioData() { return { duration: 2 }; }
}
const fakeFetch = async url => {
  const entry = STEEL_SAMPLES.find(sample => url.pathname.endsWith(sample.file));
  assert.ok(entry, "Only verified asset URLs may be requested");
  return { ok: true, arrayBuffer: async () => new Uint8Array(entry.bytes).buffer };
};
function fakePlayer(options = {}) {
  const callbacks = new Set();
  const player = createWorldAudio({
    queries: musicQueries, toSemitone, AudioContextCtor: FakeContext, fetchAsset: fakeFetch,
    setTimer: cb => { callbacks.add(cb); return cb; },
    clearTimer: cb => callbacks.delete(cb),
    ...options,
  });
  return { player, callbacks, tick: () => [...callbacks].forEach(cb => cb()) };
}
const { player, callbacks, tick } = fakePlayer();
state = { ...initial, response: reply, reconstruction };
for (const world of WORLD_DEFINITIONS) for (const arrangement of ARRANGEMENTS) {
  for (const mode of ["full","backing","solo"]) {
    const score = buildWorldScore({ ...state, world: world.id, arrangement: arrangement.id }, { mode });
    assert.equal(score.tempo, arrangement.tempo);
    assert.equal(score.bars, 4);
    assert.ok(Object.isFrozen(score));
    let previous = -1;
    for (const e of score.events) {
      assert.ok(e.step >= previous && e.step < 64, "Stable event order within the four bars");
      previous = e.step;
      if (e.instrument === "guitar") assert.ok(keys.has(e.note));
      if (mode === "backing") assert.notEqual(e.instrument, "guitar");
      if (mode === "solo") assert.ok(["guitar", "mute"].includes(e.instrument));
    }
    assert.equal((await player.play(score)).eventCount, score.events.length);
    player.stop();
  }
}
await assert.rejects(() => player.play(scoreFor("band", { pattern: emptyGrid() }, "solo")), /no guitar part yet/);

const rhythm = scoreFor("band", {}, "backing");
const { durationSeconds } = await player.play(rhythm, { repeat: true, countIn: true });
const audio = FakeContext.last;
const first = audio.starts.slice(-(rhythm.events.length + 4));
const beat = 60 / rhythm.tempo;
assert.equal(first.length, rhythm.events.length + 4);
for (let i = 0; i < 4; i++) assert.ok(Math.abs(first[i].at - first[0].at - i * beat) < 1e-9);
const origin = first[0].at + 4 * beat;
assert.ok(Math.abs(first[4].at - origin) < 1e-9);
assert.equal(player.position().phase, "count-in");
audio.currentTime = origin + durationSeconds - .13;
const beforeRepeat = audio.starts.length;
tick();
assert.equal(audio.starts.length, beforeRepeat + rhythm.events.length);
assert.ok(Math.abs(audio.starts[beforeRepeat].at - origin - durationSeconds) < 1e-9);
audio.currentTime = origin + durationSeconds + .012;
assert.equal(player.position().cycle, 1);
assert.equal(player.position().bar, 0);
player.stop();
assert.equal(callbacks.size, 0);
assert.equal(player.position().level, 0);
assert.ok(audio.starts.slice(beforeRepeat).every(node => node.disconnected && node.stops.at(-1) === audio.currentTime));

const once = await player.play(rhythm);
audio.currentTime += once.durationSeconds + 1;
tick();
assert.equal(player.position().phase, "ended");
assert.equal(callbacks.size, 0);

const delayed = Promise.withResolvers();
const { player: pending } = fakePlayer({ fetchAsset: async () => delayed.promise });
const queued = pending.play(scoreFor("detective", {}, "solo"));
await Promise.resolve();
pending.stop();
delayed.resolve({ ok: false });
assert.deepEqual(await queued, { cancelled: true }, "A late failed load after Stop cannot become a current error");
assert.equal(FakeContext.last.starts.length, 0);
let failed = true;
const { player: retry } = fakePlayer({ fetchAsset: url => failed ? Promise.resolve({ ok: false }) : fakeFetch(url) });
await assert.rejects(() => retry.play(detective), /Acoustic sample unavailable/);
assert.equal(FakeContext.last.starts.length, 0, "A missing recording must not leave a partially playing band");
failed = false;
assert.equal((await retry.play(detective)).cancelled, false);
retry.stop();

const permission = Promise.withResolvers();
let tracksStopped = 0, recorderCount = 0;
const stream = { getTracks: () => [{ stop() { tracksStopped += 1; } }] };
class Recorder {
  constructor() { recorderCount += 1; this.mimeType = "audio/ogg"; }
  start() {}
  stop() {
    this.ondataavailable({ data: new Blob(["test"], { type: this.mimeType }) });
    this.onstop();
  }
}
const cancelledTake = createWorldTake({ mediaDevices: { getUserMedia: () => permission.promise }, Recorder });
const requesting = cancelledTake.start();
cancelledTake.stop();
permission.resolve(stream);
await requesting;
assert.equal(recorderCount, 0, "A late permission grant cannot start recording after navigation");
assert.equal(tracksStopped, 1);
assert.equal(cancelledTake.snapshot().phase, "idle");
const denied = createWorldTake({ mediaDevices: { getUserMedia: async () => { throw new DOMException("Denied", "NotAllowedError"); } }, Recorder });
await denied.start();
assert.match(denied.snapshot().message, /declined/);
let pauses = 0;
const recording = createWorldTake({ mediaDevices: { getUserMedia: async () => stream }, Recorder,
  Player: class { async play() {} pause() { pauses += 1; } },
  makeUrl: blob => { assert.equal(blob.type, "audio/ogg"); return "blob:local"; },
  startLimit: () => 1, clearLimit: () => {},
});
await recording.start();
assert.equal(recording.snapshot().phase, "recording");
recording.stop();
assert.equal(recording.snapshot().clip.name, "guitar-explorer-take.ogg");
await recording.play();
assert.equal(recording.snapshot().replaying, true);
recording.stopReplay();
assert.equal(pauses, 1);
assert.equal(recording.snapshot().replaying, false);

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [page, server, preview] = await Promise.all([read("lab/instrument-desk.html"), read("scripts/serve-lab.mjs"), read("scripts/build-preview.mjs")]);
for (const id of ["worlds-view", "worlds-root", "nav-worlds", "open-worlds", "worlds-back"]) assert.ok(page.includes('id="' + id + '"'));
for (const asset of ["musical-worlds-app.mjs", "musical-worlds-audio.mjs", "musical-worlds-material.mjs", "musical-worlds-takes.mjs", "musical-worlds.css"]) {
  assert.ok(server.includes('"/' + asset + '"'), "Server route: " + asset);
  assert.ok(preview.includes('"' + asset + '"'), "Preview bundle: " + asset);
}
console.log("Musical Worlds: playable mix differences, actual chord voicings, repeat/count-in, sample failure and stop, local take lifecycle, and preview integration passed.");
