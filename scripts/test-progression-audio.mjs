import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const outputRoot = new URL("../.preview-dist/", import.meta.url);
const { planProgressionStrokes, ProgressionAudio } = await import(new URL("progression-audio.mjs", outputRoot));
const { selectGuitarAttack, RECORDED_GUITAR_ATTACKS } = await import(new URL("progression-sample-bank.mjs", outputRoot));
const { resolveGenerateChoice, listGenerateChoices } = await import(new URL("progression-selection.mjs", outputRoot));
const { drumPlan, groovesForMeter } = await import(new URL("progression-grooves.mjs", outputRoot));
const { DRUM_SAMPLES } = await import(new URL("progression-drum-samples.mjs", outputRoot));
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
assert.throws(() => planProgressionStrokes(cards.slice(0, 1), 120), RangeError);
assert.throws(() => planProgressionStrokes([...cards, ...cards, cards[0]], 120), RangeError);
assert.equal(planProgressionStrokes(cards.slice(0, 3), 120).loopSeconds, 6);
assert.equal(planProgressionStrokes([...cards, ...cards], 120).loopSeconds, 16);

const { PROGRESSION_STEEL_SAMPLES } = await import(new URL("progression-guitar-manifest.mjs", outputRoot));
assert.equal(PROGRESSION_STEEL_SAMPLES.length, 90);
assert.equal(new Set(RECORDED_GUITAR_ATTACKS.map(({ file }) => file)).size, RECORDED_GUITAR_ATTACKS.length);
for (const sample of RECORDED_GUITAR_ATTACKS) {
  const bytes = await readFile(new URL("samples/steel/" + sample.file, outputRoot));
  assert.equal(bytes.length, sample.bytes);
  assert.equal(bytes.toString("ascii", 0, 4), "OggS");
  assert.equal(createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex"), sample.gitBlobSha);
  assert.equal(sample.note.replace("#", "s"), sample.file.split("_").at(-2));
}
const { STANDARD_FRETBOARD, getNoteAt } = await import(new URL("engine/index.js", outputRoot));
for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
  for (let fret = 0; fret <= STANDARD_FRETBOARD.maxFret; fret++) {
    const { semitone } = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
    for (const [velocity, layer] of [[40, 1], [80, 2], [110, 3]]) {
      const { sample, playbackRate } = selectGuitarAttack({ stringIndex, semitone }, velocity);
      assert.equal(sample.stringIndex, stringIndex);
      assert.equal(sample.layer, layer);
      assert.ok(Math.abs(sample.fret - fret) <= 2);
      assert.equal(sample.semitone + Math.round(12 * Math.log2(playbackRate)), semitone);
    }
  }
}
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
const { generateWorkspace } = await import(new URL("progression/workspace.js", outputRoot));
for (const context of listGenerateChoices({ keyChoice: "all", modeChoice: "auto", randomUint32: () => 0 })) {
  if (context.mode === "major" || context.mode === "naturalMinor") {
    assert.ok(musicQueries.getKeySignature({
      tonic: parseNote(context.tonic), mode: context.mode === "major" ? "major" : "minor",
    }).ok, "automatic choice must have a supported spelling");
  }
  const result = generateWorkspace({ ...context, tonic: parseNote(context.tonic), shapeFilter: "all" });
  assert.ok(result.ok, context.tonic + " " + context.mode);
  assert.equal(result.data.cards.length, 4);
  assert.ok(result.data.cards.every(({ voicings }) => voicings.length > 0));
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

for (const sample of Object.values(DRUM_SAMPLES)) {
  const bytes = await readFile(new URL("samples/drums/" + sample.file, outputRoot));
  assert.equal(bytes.length, sample.bytes);
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sample.sha256);
}
for (const meter of ["4/4", "3/4", "6/8"]) {
  for (const { id } of groovesForMeter(meter)) {
    const plan = planProgressionStrokes(cards, 120, { meter, groove: id });
    assert.equal(plan.events.length, plan.strokes.length + plan.drumHits.length);
    assert.equal(plan.loopSeconds, plan.secondsPerBar * cards.length);
    for (const [index, event] of plan.events.entries()) {
      assert.ok(event.seconds >= (plan.events[index - 1]?.seconds ?? 0) && event.seconds < plan.loopSeconds);
      if (event.kind === "drum" && event.step === 0) assert.equal(event.seconds, event.slotIndex * plan.secondsPerBar);
    }
    if (id !== "off") {
      assert.ok(plan.drumHits.some(({ voice }) => voice === "snare"));
      assert.equal(plan.strokes[0].seconds, plan.drumHits[0].seconds);
    }
  }
}
assert.throws(() => drumPlan("3/4", "rock-drive", 120), /does not belong/);
assert.equal(drumPlan("6/8", "six-eight-sway", 120).find(({ voice }) => voice === "snare").seconds, .5);
const shuffle = planProgressionStrokes(cards, 120, { pattern: "blues-shuffle", groove: "blues-triplets" });
assert.equal(shuffle.strokes[1].seconds, 1 / 3);
assert.ok(shuffle.drumHits.some(({ seconds, voice }) => seconds === 1 / 3 && voice === "hat"));

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
      setTargetAtTime(value) { this.target = value; },
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
    this.shelf = new FakeGain();
    FakeContext.instance = this;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createGain() { return new FakeGain(); }
  createBiquadFilter() {
    this.shelf.frequency = { setValueAtTime() {} };
    this.shelf.gain.setTargetAtTime = (value) => { this.toneGain = value; };
    return this.shelf;
  }
  async decodeAudioData() { return { duration: 1.75 }; }
  async resume() { this.state = "running"; }
  async close() { this.state = "closed"; }
}
let fetched = 0;
const fetchAsset = async (url) => {
  const name = url.pathname.split("/").pop();
  const sample = RECORDED_GUITAR_ATTACKS.find(({ file }) => file === name) ?? Object.values(DRUM_SAMPLES).find(({ file }) => file === name);
  assert.ok(sample, "only licensed manifest files are requested");
  fetched += 1;
  return { ok: true, async arrayBuffer() { return new ArrayBuffer(sample.bytes); } };
};
const audio = new ProgressionAudio(FakeContext, fetchAsset);
assert.equal(audio.activeSlot(), null);
assert.equal(await audio.play(cards, 120), true);
const context = FakeContext.instance;
assert.equal(audio.isPlaying(), true);
audio.setTone("warm");
assert.equal(context.toneGain, -4);
assert.throws(() => audio.setTone("unknown"), RangeError);
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
assert.equal(await audio.play(cards, 120), true);
const beforeWake = context.sources.length;
context.currentTime = audio.loopStart + audio.plan.loopSeconds * 15 - 0.06;
audio.fillSchedule();
const afterWake = context.sources.slice(beforeWake);
assert.equal(afterWake.length, 3);
assert.ok(afterWake.every(({ startedAt }) => startedAt >= context.currentTime));
assert.equal(afterWake[0].startedAt, audio.loopStart + audio.plan.loopSeconds * 15);
const scheduledBeforeGroove = context.sources.length;
assert.equal(await audio.play(cards, 120, { meter: "6/8", groove: "six-eight-sway" }), true);
const grooveStart = context.sources.slice(scheduledBeforeGroove).filter(({ startedAt }) => startedAt === audio.loopStart);
assert.equal(grooveStart.filter(({ rate }) => rate === undefined).length, 2, "kick and hat share the downstroke time");
assert.equal(grooveStart.filter(({ rate }) => rate !== undefined).length, 1);
audio.setTrackMix("drums", .44, true);
assert.equal(audio.trackBuses.drums.gain.target, 0);
audio.setTrackMix("drums", .44, false);
assert.equal(audio.trackBuses.drums.gain.target, .44);
const superseded = [...audio.voices];
assert.equal(await audio.play(cards, 135, { meter: "3/4", groove: "folk-waltz" }), true);
assert.ok(superseded.every(({ source }) => source.stoppedAt === 0), "changing meter and tempo cancels both tracks");
assert.equal(audio.context, context);
assert.equal(audio.plan.secondsPerBar, 3 * 60 / 135);
const priorLoop = context.sources.length;
context.currentTime = audio.loopStart + audio.plan.loopSeconds - .04;
audio.fillSchedule();
const wrapped = context.sources.slice(priorLoop).filter(({ startedAt }) => startedAt === audio.loopStart + audio.plan.loopSeconds);
assert.ok(wrapped.some(({ rate }) => rate === undefined) && wrapped.some(({ rate }) => rate !== undefined));
context.currentTime = audio.loopStart + .7;
const cancelledByPause = [...audio.voices];
assert.equal(audio.pause(), true);
assert.equal(audio.isPaused(), true);
assert.equal(audio.interval, null);
assert.ok(cancelledByPause.every(({ source }) => source.stoppedAt === 0));
const pauseOffset = audio.pausedOffset;
assert.equal(await audio.resume(), true);
assert.equal(audio.isPaused(), false);
assert.equal(audio.isPlaying(), true);
assert.ok(Math.abs(context.currentTime + .12 - audio.loopStart - pauseOffset) < 1e-9);
assert.ok(audio.plan.events[(audio.nextEvent - 1) % audio.plan.events.length].seconds >= pauseOffset);
audio.pause();
audio.stop();
assert.equal(await audio.resume(), false);
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
