import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { reflectionNextHidden, resetSessionState, timerSnapshot } from "../lab/session-logic.mjs";

const state = {
  stageIndex: 12,
  mapRoleIndex: 3,
  savedMap: [{ label: "1" }],
  timerRemaining: 0,
  timerDeadlineMs: 123,
  timerStarted: true,
  timerFinished: true,
  reflection: "shape took over",
  selected: { stringIndex: 3, fret: 5 },
  checked: true,
  hintLevel: 3,
  lastWrong: { note: "D" },
  theoryRevealed: true,
};

resetSessionState(state);
assert.equal(state.stageIndex, 0);
assert.equal(state.reflection, null);
assert.equal(state.timerStarted, false);
assert.equal(state.timerFinished, false);
assert.equal(state.timerRemaining, 35);
assert.deepEqual(state.savedMap, []);
assert.equal(reflectionNextHidden(state.reflection), true);
assert.equal(reflectionNextHidden("no clear breakdown"), false);

const start = 1_000;
const deadline = start + 35_000;
assert.deepEqual(timerSnapshot(deadline, start), { remaining: 35, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, start + 5_000), { remaining: 30, finished: false, phase: "REST" });
assert.deepEqual(timerSnapshot(deadline, start + 10_000), { remaining: 25, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, start + 12_400), { remaining: 23, finished: false, phase: "PLAY" });
assert.deepEqual(timerSnapshot(deadline, deadline), { remaining: 0, finished: true, phase: "DONE" });
assert.deepEqual(timerSnapshot(deadline, deadline + 9_000), { remaining: 0, finished: true, phase: "DONE" });

const app = await readFile(new URL("../lab/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../lab/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("./serve-lab.mjs", import.meta.url), "utf8");
assert.match(app, /aria-pressed/);
assert.match(app, /Simple interval from root/);
assert.match(app, /from "\/session-logic\.mjs"/);
assert.match(html, /No clear breakdown/);
assert.doesNotMatch(html, /C versus C#/);
assert.doesNotMatch(html, /C can be ♭3/);
assert.match(server, /\["\.mjs", "text\/javascript; charset=utf-8"\]/);
assert.match(server, /pathname === "\/session-logic\.mjs"/);

console.log("Learning Lab focused behavior checks passed.");
