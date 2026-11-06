import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as engine from "../.lab-dist/engine/index.js";
import { STEEL_SAMPLES } from "../lab/sampled-guitar-manifest.mjs";
import { createSampledGuitar, sampleAttacks } from "../lab/sampled-guitar.mjs";
import { intervalMaterials, composeIntervalSession } from "../lab/practice-material.mjs";
import * as plan from "../lab/practice-plan.mjs";
import { createTestDOM, accessibleText, installRenderer, find } from "./fretboard-test-dom.mjs";

const prepare = (quality = "major", seed = 0) => composeIntervalSession({ quality, seed, availablePositions: STEEL_SAMPLES, queries: engine.musicQueries });
const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;
for (const quality of ["major", "minor"]) {
  const materials = intervalMaterials({ quality, availablePositions: STEEL_SAMPLES, queries: engine.musicQueries });
  assert.equal(materials.length, 4, "bounded recorded third pairs, not unrestricted fallback");
  for (let seed = 0; seed < 16; seed += 1) {
    const session = prepare(quality, seed);
    assert.deepEqual(session, prepare(quality, seed), "replay must be deterministic");
    assert.equal(session.version, 1);
    assert.equal(session.rounds.length, 3);
    const [first, move, transfer] = session.rounds.map((round) => round.material);
    assert.equal(first.root.pitchClass, move.root.pitchClass);
    assert.notEqual(first.root.name, move.root.name, "register genuinely changes");
    assert.notEqual(first.root.pitchClass, transfer.root.pitchClass, "transfer changes the root");
    for (const material of [first, move, transfer]) {
      assert.equal(material.interval.name, quality === "major" ? "Major 3rd" : "Minor 3rd");
      assert.equal(material.interval.semitones, quality === "major" ? 4 : 3);
      assert.equal(material.chord.tones.find((tone) => tone.degree === 3).pitchClass, material.target.pitchClass);
      assert.ok(material.choices.some((note) => key(note.position) === key(material.target.position)));
      assert.ok(material.choices.every((note) => note.position.fret >= 0 && note.position.fret <= 3));
      for (const event of plan.intervalCue(material, true)) assert.equal(sampleAttacks([event])[0].samples.length, 1);
      const unrevealed = JSON.stringify(plan.intervalBoard(plan.beginSession({ ...session, rounds: [{ material }] })));
      assert.equal(unrevealed.includes(material.target.name), false, "target pitch cannot leak to DOM/ARIA");
    }
  }
}
assert.deepEqual(prepare().rounds.map((round) => round.material.id), ["major:0:3>1:2", "major:3:0>4:0", "major:1:3>2:2"]);
assert.throws(() => composeIntervalSession({ quality: "major", seed: 0, availablePositions: [], queries: engine.musicQueries }), /Not enough recorded/);
assert.throws(() => prepare("dorian"), /major or minor/);
assert.throws(() => prepare("major", -1), /seed/);

// Asset integrity + engine-derived physical provenance. No pitch-shifting/mapping guess.
assert.equal(STEEL_SAMPLES.length, 12);
assert.equal(STEEL_SAMPLES.reduce((sum, sample) => sum + sample.bytes, 0), 1051631);
for (const sample of STEEL_SAMPLES) {
  const location = engine.musicQueries.getNoteAtFret({ position: sample });
  assert.ok(location.ok);
  assert.equal(location.data.name, sample.note);
  const bytes = await readFile(new URL("../lab/samples/steel/" + sample.file, import.meta.url));
  assert.equal(bytes.length, sample.bytes);
  assert.equal(createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex"), sample.gitBlobSha);
}
assert.match(await readFile(new URL("../lab/samples/steel/LICENSE", import.meta.url), "utf8"), /CC0 1\.0 Universal/);

const starts = [];
const stops = [];
class AudioContextFake {
  currentTime = 10; destination = {}; state = "running";
  async decodeAudioData() { return { duration: 2 }; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createBufferSource() { return { connect() {}, disconnect() {}, start(time) { starts.push(time); }, stop(time) { stops.push(time); } }; }
}
let fetches = 0;
const fetchSuccess = async (url) => {
  fetches += 1;
  const sample = STEEL_SAMPLES.find(({ file }) => url.pathname.endsWith(file));
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(sample.bytes) };
};
const events = plan.intervalCue(prepare().rounds[0].material, true);
const player = createSampledGuitar({ AudioContextCtor: AudioContextFake, fetchAsset: fetchSuccess });
assert.equal((await player.play(events)).voiceCount, 3);
assert.equal(fetches, 12);
assert.ok(Math.abs(starts[1] - starts[0] - 1.05) < 1e-9, "audio clock preserves prepared offsets");
assert.equal(player.stop(), 3);
await player.play(events);
assert.equal(fetches, 12, "decode/cache reused");
assert.throws(() => sampleAttacks([{ ...events[0], at: -1 }]), /timing/);
assert.throws(() => sampleAttacks([{ ...events[0], level: 5 }]), /bounded/);
assert.throws(() => sampleAttacks([{ ...events[0], positions: [{ stringIndex: 5, fret: 9 }] }]), /No acoustic sample/);
let release;
const gate = new Promise((resolve) => { release = resolve; });
const pendingPlayer = createSampledGuitar({ AudioContextCtor: AudioContextFake, fetchAsset: async (url) => { await gate; return fetchSuccess(url); } });
const before = starts.length;
const pending = pendingPlayer.play(events);
pendingPlayer.stop();
release();
assert.equal((await pending).cancelled, true);
assert.equal(starts.length, before, "Stop during loading cannot start stale playback");
let failing = true;
const retryPlayer = createSampledGuitar({ AudioContextCtor: AudioContextFake, fetchAsset: (url) => failing ? Promise.resolve({ ok: false }) : fetchSuccess(url) });
await assert.rejects(() => retryPlayer.play(events), /sample unavailable/);
failing = false;
assert.equal((await retryPlayer.play(events)).voiceCount, 3, "retry recovers from failure");

// Actual client callbacks + shared renderer: complete path, withholding and in-tab resume.
const html = await readFile(new URL("../lab/instrument-desk.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/instrument-desk-app.js", import.meta.url), "utf8");
const { document, root, $ } = createTestDOM(html);
$("practice-focus").value = "major";
let stopped = 0;
let worldsMounted = 0;
let worldsStopped = 0;
const context = vm.createContext({
  ...engine, ...plan, composeIntervalSession, STEEL_SAMPLES,
  document, console, addEventListener() {},
  createSampledGuitar: () => ({ stop() { stopped += 1; }, play: async () => ({ durationSeconds: 3 }) }),
  createMusicalWorlds(container) {
    assert.equal(container, $("worlds-root"));
    worldsMounted += 1;
    return { stop() { worldsStopped += 1; }, focus() {} };
  },
});
installRenderer(context);
vm.runInContext(app.replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\s*/gm, ""), context);
const read = (source) => vm.runInContext(source, context);
const text = () => accessibleText(root);
assert.equal($("home-view").hidden, false);
assert.doesNotMatch(text(), /Lab|Harmonic Gravity|Role Lens|looper|My music/);
$("start-practice").click();
assert.equal(read("view"), "practice");
assert.equal(read("session.stage"), "find");
assert.equal($("check-position").disabled, true);
assert.equal($("help-reveal").hidden, true);
assert.equal($("hear-pair").hidden, true);
const firstState = read("session");
assert.equal(worldsMounted, 0, "Accepted Practice does not mount the creative workbench");
$("nav-worlds").click();
assert.equal(read("view"), "worlds");
assert.equal(worldsMounted, 1);
$("nav-practice").click();
assert.equal(worldsStopped, 1, "Returning to Practice stops the Worlds transport and capture");
assert.equal(read("session"), firstState, "Worlds navigation preserves the accepted Practice session");
$("pause-practice").click();
assert.equal($("continue-practice").hidden, false);
$("continue-practice").click();
assert.equal(read("session"), firstState, "pause/continue restores exact state");

for (let i = 0; i < 3; i += 1) {
  const m = read("session.plan.rounds[session.roundIndex].material");
  assert.equal(read("session.roundIndex"), i);
  assert.equal(text().includes(m.target.name), false, "fresh target remains withheld");
  assert.equal($("reveal-title").textContent, "", "previous answer cleared from hidden DOM");
  const choices = $("desk-board").querySelectorAll("button").filter((button) => !button.disabled);
  if (i === 0) {
    const wrong = choices.find((button) => key({ stringIndex: Number(button.dataset.stringIndex), fret: Number(button.dataset.fret) }) !== key(m.target.position));
    wrong.click(); $("check-position").click();
    assert.equal(read("session.stage"), "find");
    assert.equal($("help-reveal").hidden, false);
    assert.equal(text().includes(m.target.name), false);
    $("help-reveal").click();
    assert.equal(read("session.assisted"), true);
  } else {
    const correct = choices.find((button) => key({ stringIndex: Number(button.dataset.stringIndex), fret: Number(button.dataset.fret) }) === key(m.target.position));
    correct.key("Enter"); $("check-position").click();
  }
  assert.equal(read("session.stage"), "use");
  assert.ok(text().includes(m.target.name));
  assert.equal($("next-round").disabled, true);
  assert.equal(read("advanceSession(session, { type: 'next' })"), read("session"));
  $("played-phrase").checked = true; $("played-phrase").dispatch("change");
  assert.equal($("next-round").disabled, true);
  $("reflection-exploring").value = "exploring"; $("reflection-exploring").dispatch("change");
  assert.equal($("next-round").disabled, false, "either ungraded impression permits continuation");
  $("next-round").click();
}
assert.equal(read("view"), "complete");
assert.equal($("complete-view").hidden, false);
assert.match(text(), /Session complete/);
assert.equal($("complete-rounds").children.length, 3);
$("another-session").click();
assert.equal(read("session.plan.seed"), 1);
assert.notEqual(read("session.plan.rounds[0].material.id"), firstState.plan.rounds[0].material.id);
assert.ok(stopped >= 7, "all task/view transitions stop playback");
assert.doesNotMatch(app, /createAudioOut|createOscillator|localStorage|fetch\(/);
console.log("Practice product: bounded generation, transfer, source hashes, audio cancellation/retry and complete client path passed.");
