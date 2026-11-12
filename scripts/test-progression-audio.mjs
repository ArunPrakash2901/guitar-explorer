import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const outputRoot = new URL("../.preview-dist/", import.meta.url);
const { planProgressionStrokes, ProgressionAudio } = await import(new URL("progression-audio.mjs", outputRoot));
const { selectGuitarAttack, RECORDED_GUITAR_ATTACKS } = await import(new URL("progression-sample-bank.mjs", outputRoot));
const { resolveGenerateChoice } = await import(new URL("progression-selection.mjs", outputRoot));
const { rhythmPlan, patternsForMeter, DEFAULT_PATTERN } = await import(new URL("progression-rhythm.mjs", outputRoot));

function card(base) {
  return { voicingIndex: 0, voicings: [{
    notes: [
      { stringIndex: 0, semitone: base },
      { stringIndex: 1, semitone: base + 4 },
      { stringIndex: 2, semitone: base + 7 },
    ],
  }] };
}
const cards = [card(48), card(55), card(53), card(48)];
const plan = planProgressionStrokes(cards, 120);
assert.equal(plan.secondsPerBar, 2);
assert.equal(plan.loopSeconds, 8);
assert.deepEqual(plan.strokes.map(({ slotIndex }) => slotIndex), [0,0,1,1,2,2,3,3]);
assert.deepEqual(plan.strokes.map(({ seconds }) => seconds), [0,1,2,3,4,5,6,7]);
assert.deepEqual(plan.strokes[0].midis, [48,52,55]);
assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.strokes));
assert.throws(() => planProgressionStrokes(cards, 40), RangeError);
assert.throws(() => planProgressionStrokes(cards, 200), RangeError);
assert.throws(() => planProgressionStrokes(cards.slice(0,3), 120), RangeError);

assert.equal(RECORDED_GUITAR_ATTACKS.length, 12);
const selected = selectGuitarAttack({ stringIndex: 5, semitone: 64 });
assert.ok(selected.sample.file.endsWith(".ogg"));
assert.ok(Number.isFinite(selected.playbackRate) && selected.playbackRate > 0);
assert.ok(Object.isFrozen(selected));
assert.throws(() => selectGuitarAttack({ stringIndex: -1, semitone: 60 }), TypeError);
assert.throws(() => selectGuitarAttack({ stringIndex: 6, semitone: 60 }), TypeError);
assert.throws(() => selectGuitarAttack({ stringIndex: 0, semitone: 128 }), TypeError);

assert.deepEqual(resolveGenerateChoice({
  keyChoice: "all", modeChoice: "auto", randomUint32: () => 0,
}), { tonic: "C", mode: "major", seed: 0 });
assert.deepEqual(resolveGenerateChoice({
  keyChoice: "all", modeChoice: "auto", lockedCount: 1,
  previous: { tonic: "Db", mode: "mixolydian" }, randomUint32: () => 900,
}), { tonic: "Db", mode: "mixolydian", seed: 900 });
assert.deepEqual(resolveGenerateChoice({
  keyChoice: "G", modeChoice: "major", randomUint32: () => 17,
}), { tonic: "G", mode: "major", seed: 17 });


const { parseNote, musicQueries } = await import(new URL("engine/index.js", outputRoot));
for (let seed = 0; seed < 72; seed += 1) {
  const context = resolveGenerateChoice({ keyChoice: "all", modeChoice: "auto", randomUint32: () => seed });
  if (context.mode === "major" || context.mode === "naturalMinor") {
    assert.ok(musicQueries.getKeySignature({
      tonic: parseNote(context.tonic), mode: context.mode === "major" ? "major" : "minor",
    }).ok, "automatic choice must have a supported spelling");
  }
}

const options44 = patternsForMeter("4/4");
assert.ok(options44.some(({ id }) => id === "acoustic-pop"));
assert.equal(DEFAULT_PATTERN["6/8"], "rolling-six-eight");
assert.throws(() => rhythmPlan("7/8", "steady", 92), /Unsupported meter/);
assert.throws(() => rhythmPlan("3/4", "acoustic-pop", 92), /does not belong/);
assert.throws(() => rhythmPlan("4/4", "steady", 0), RangeError);

const waltz = planProgressionStrokes(cards, 60, { meter: "3/4", pattern: "waltz" });
assert.equal(waltz.secondsPerBar, 3);
assert.equal(waltz.loopSeconds, 12);
assert.equal(waltz.strokes.length, 12);
assert.deepEqual(waltz.strokes.slice(0, 4).map(({ seconds }) => seconds), [0, 1, 2, 3]);

const sixEight = planProgressionStrokes(cards, 60, { meter: "6/8", pattern: "rolling-six-eight" });
assert.equal(sixEight.pulseUnit, "dotted-quarter");
assert.equal(sixEight.secondsPerBar, 2);
assert.equal(sixEight.loopSeconds, 8);
assert.equal(sixEight.strokes.length, 24);
assert.equal(sixEight.strokes[0].direction, "down");
assert.equal(sixEight.strokes[1].direction, "up");
assert.ok(Math.abs(sixEight.strokes[1].seconds - 1 / 3) < 0.000001);
assert.equal(sixEight.strokes[6].slotIndex, 1);
assert.equal(sixEight.strokes[6].seconds, 2);
assert.ok(Object.isFrozen(sixEight.strokes));
const pop = planProgressionStrokes(cards, 120, { meter: "4/4", pattern: "acoustic-pop" });
assert.equal(pop.strokes.length, 24);
assert.deepEqual(pop.strokes.slice(0,6).map(({ step }) => step), [0,2,3,4,6,7]);
assert.deepEqual(pop.strokes.slice(0,6).map(({ direction }) => direction), ["down","down","up","down","down","up"]);

class FakeSource {
  constructor() {
    this.playbackRate = { setValueAtTime: (value) => { this.rate = value; } };
    this.startedAt = null;
    this.stoppedAt = null;
  }
  connect() {}
  disconnect() {}
  start(value) { this.startedAt = value; }
  stop(value) { this.stoppedAt = value ?? 0; }
}
class FakeGain {
  constructor() {
    this.gain = {
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    };
  }
  connect() {}
  disconnect() {}
}
class FakeContext {
  constructor() {
    this.currentTime = 100;
    this.state = "suspended";
    this.destination = {};
    this.sources = [];
    FakeContext.instance = this;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createGain() { return new FakeGain(); }
  async decodeAudioData() { return { duration: 1.75 }; }
  async resume() { this.state = "running"; }
  async close() { this.state = "closed"; }
}
let fetched = 0;
const fetchAsset = async (url) => {
  const name = url.pathname.split("/").pop();
  const sample = RECORDED_GUITAR_ATTACKS.find(({ file }) => file === name);
  assert.ok(sample, "only licensed manifest files are requested");
  fetched += 1;
  return { ok: true, async arrayBuffer() { return new ArrayBuffer(sample.bytes); } };
};
const audio = new ProgressionAudio(FakeContext, fetchAsset);
assert.equal(audio.activeSlot(), null);
assert.equal(await audio.play(cards, 120), true);
const context = FakeContext.instance;
assert.equal(audio.isPlaying(), true);
assert.equal(context.sources.length, 3);
assert.equal(context.sources[0].startedAt, 100.12);
assert.ok(context.sources[0].rate > 0);
assert.equal(audio.activeSlot(), null);
context.currentTime = 101.09;
audio.fillSchedule();
assert.equal(context.sources.length, 6);
assert.equal(audio.activeSlot(), 0);
context.currentTime = 102.25;
assert.equal(audio.activeSlot(), 1);
context.currentTime = 108.3;
assert.equal(audio.activeSlot(), 0, "loop wraps to first chord");
audio.stop();
assert.equal(audio.isPlaying(), false);
assert.equal(audio.interval, null);
assert.equal(audio.activeSlot(), null);
assert.ok(context.sources.every(({ stoppedAt }) => stoppedAt !== null));
const fetchedBefore = fetched;
assert.equal(await audio.audition(cards[2]), true);
assert.equal(context.sources.length, 9);
assert.equal(fetched, fetchedBefore, "recordings are cached for the same progression");
await audio.dispose();
assert.equal(context.state, "closed");

const page = await readFile(new URL("progression.html", outputRoot), "utf8");
const browserCode = await readFile(new URL("progression-workspace.mjs", outputRoot), "utf8");
const audioAsset = await readFile(new URL("progression-audio.mjs", outputRoot), "utf8");
assert.match(page, /id="play-progression"/);
assert.match(page, /id="show-scale"/);
assert.match(page, /value="all" selected/);
assert.match(page, /value="auto" selected/);
assert.doesNotMatch(page, /id="seed"/);
assert.match(browserCode, /progression-audio\.mjs\?ge-revision=/);
assert.match(audioAsset, /createBufferSource/);
assert.doesNotMatch(audioAsset, /createOscillator/);
console.log("sample-based progression playback, rhythm meters, strum patterns, random generation and transport checks passed");
