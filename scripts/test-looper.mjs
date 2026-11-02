import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  captureTimeline,
  createLooperLifecycle,
  normalizeCaptureSpec,
} from "../lab/looper-runtime.mjs";

const spec = normalizeCaptureSpec({
  bpm: 84,
  countInBeats: 4,
  recordDurationSeconds: 80 / 7,
  contextLabel: "G → C → D7 → G",
});
assert.equal(spec.bpm, 84);
assert.equal(spec.countInBeats, 4);
assert.ok(Math.abs(spec.recordDurationSeconds - 11.428571) < 0.001);

const timeline = captureTimeline(spec);
assert.ok(Math.abs(timeline.secondsPerBeat - (5 / 7)) < 0.0001);
assert.ok(Math.abs(timeline.countInSeconds - (20 / 7)) < 0.0001);
assert.ok(Math.abs(timeline.totalSeconds - 14.285714) < 0.001);

assert.throws(() => normalizeCaptureSpec({ bpm: 0, recordDurationSeconds: 8 }), /bpm/);
assert.throws(() => normalizeCaptureSpec({ bpm: 84, countInBeats: 0, recordDurationSeconds: 8 }), /countInBeats/);
assert.throws(() => normalizeCaptureSpec({ bpm: 84, recordDurationSeconds: 0.2 }), /between 1 and 180/);

const lifecycle = createLooperLifecycle();
assert.equal(lifecycle.state, "idle");
assert.equal(lifecycle.transition("permission"), "ready");
assert.equal(lifecycle.transition("countIn"), "count-in");
assert.equal(lifecycle.transition("record"), "recording");
assert.equal(lifecycle.transition("capture"), "captured");
assert.equal(lifecycle.transition("loop"), "looping");
assert.equal(lifecycle.transition("stop"), "captured");
assert.equal(lifecycle.transition("rerecord"), "ready");
assert.throws(() => lifecycle.transition("play"), /Cannot play while looper is ready/);

const html = await readFile(new URL("../lab/looper.html", import.meta.url), "utf8");
const app = await readFile(new URL("../lab/looper-app.js", import.meta.url), "utf8");
const accompaniment = await readFile(new URL("../lab/accompaniment-app.js", import.meta.url), "utf8");

assert.match(html, /id="enable-input"/);
assert.match(html, /id="record-start"/);
assert.match(html, /id="take-loop"/);
assert.match(app, /getUserMedia/);
assert.match(app, /MediaRecorder/);
assert.match(app, /URL\.createObjectURL/);
assert.match(app, /audio\.loop = loop/);
assert.match(accompaniment, /looper\.html/);
assert.match(accompaniment, /searchParams\.set\("pattern"/);
assert.doesNotMatch(app, /fetch\(|XMLHttpRequest|WebSocket|upload/i);
assert.doesNotMatch(app, /pitch detection|transcrib|grading|correctness/i);

console.log("Looper v0 checks passed for capture timing, lifecycle, local MediaRecorder wiring and accompaniment handoff.");
