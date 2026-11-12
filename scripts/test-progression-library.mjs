import assert from "node:assert/strict";

const output = new URL("../.preview-dist/", import.meta.url);
const { parseNote } = await import(new URL("engine/index.js", output));
const { generateWorkspace, replaceWorkspaceChord, toggleChordLock, cycleChordVoicing } = await import(new URL("progression/workspace.js", output));
const {
  DEFAULT_EXPLORER, snapshotProgression, encodeProgression, decodeProgression, restoreProgression, progressionText,
  readFavorites, saveFavorite, deleteFavorite, FAVORITES_KEY,
} = await import(new URL("progression-library.mjs", output));

const result = generateWorkspace({ tonic: parseNote("C"), mode: "major", seed: 4294967295, length: 8 });
assert.ok(result.ok);
const replaced = replaceWorkspaceChord(result.data, 1, 1, "add9");
const workspace = cycleChordVoicing(toggleChordLock(replaced, 7), 1, 1);
const preferences = {
  keyAuto: true, modeAuto: false, style: "indie", mood: "bright", color: "sevenths", shape: "all",
  bpm: 110, meter: "6/8", pattern: "six-eight", groove: "six-eight-sway", tone: "warm",
  guitar: 76, drums: 45, guitarMuted: false, drumsMuted: true, view: "chords", position: "A",
  layer: "majorPentatonic", selected: 1,
  explorer: { ...DEFAULT_EXPLORER, keyDegree: 7, diagramLabels: "intervals", fretHighlights: "modal" },
  rhythm: { parts: [9, 4, 11], fill: true, click: true },
};
const snapshot = snapshotProgression(workspace, { ...preferences, learnerEvidence: "private" });
assert.equal(Object.hasOwn(snapshot.p, "learnerEvidence"), false);
const token = encodeProgression(snapshot);
assert.ok(token.length < 1500);
assert.match(token, /^[A-Za-z0-9_-]+$/);
assert.deepEqual(decodeProgression(token), snapshot);
const restored = restoreProgression(decodeProgression(token));
assert.deepEqual(restored.preferences, preferences);
assert.deepEqual(restored.workspace.cards, workspace.cards);
assert.deepEqual(restored.workspace.scale, workspace.scale);
assert.equal(restored.workspace.context.seed, 4294967295);
assert.match(progressionText(workspace, preferences), /C major · 6\/8 · 110 dotted-quarter BPM\n.*Cadd9 \(locked\)/);

for (const length of [12, 16]) {
  const original = generateWorkspace({ tonic: parseNote("Db"), mode: "mixolydian", seed: 112, length, style: "jazz" });
  assert.ok(original.ok);
  const locked = toggleChordLock(original.data, length - 1);
  const encoded = encodeProgression(snapshotProgression(locked, { ...preferences, selected: length - 1 }));
  const copy = restoreProgression(decodeProgression(encoded));
  assert.deepEqual(copy.workspace.cards, locked.cards);
  assert.equal(copy.preferences.selected, length - 1);
  assert.ok(encoded.length < 2300);
}
const outside = structuredClone(snapshot);
outside.c[1] = [4, "sus4", "F:sus4:a-barre:x-8-10-10-11-8", true];
assert.throws(() => restoreProgression(outside), /outside the selected/);
const falseGrip = structuredClone(snapshot);
falseGrip.c[1][2] = "C:add9:open:x-9-9-9-9-9";
assert.throws(() => restoreProgression(falseGrip), /grip is unavailable/);
const packed = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
for (const invalid of [
  { ...snapshot, v: 3 }, { ...snapshot, s: -1 }, { ...snapshot, k: "H" }, { ...snapshot, c: [] },
  { ...snapshot, p: { ...preferences, bpm: 181 } }, { ...snapshot, p: { ...preferences, selected: 9 } },
  { ...snapshot, p: { ...preferences, groove: "pop-backbeat" } },
  { ...snapshot, p: { ...preferences, pattern: "waltz" } },
  { ...snapshot, p: { ...preferences, guitarMuted: "true" } },
  { ...snapshot, p: { ...preferences, rhythm: { parts: [64, 0, 0], fill: true, click: false } } },
  { ...snapshot, p: { ...preferences, explorer: { ...DEFAULT_EXPLORER, keyDegree: 8 } } },
]) assert.throws(() => decodeProgression(packed(invalid)));
assert.throws(() => decodeProgression("a".repeat(3401)), /invalid format/);
assert.throws(() => decodeProgression("%"), /invalid format/);

const { explorer, rhythm, ...legacyPreferences } = preferences;
const legacyToken = packed({ ...snapshot, v: 1, p: legacyPreferences });
const migrated = restoreProgression(decodeProgression(legacyToken));
assert.deepEqual(migrated.workspace.cards, workspace.cards);
assert.deepEqual(migrated.preferences.explorer, DEFAULT_EXPLORER);
assert.deepEqual(migrated.preferences.rhythm, { parts: null, fill: false, click: false });

const local = new Map();
const storage = { getItem: (key) => local.get(key), setItem: (key, value) => local.set(key, value) };
local.set(FAVORITES_KEY, JSON.stringify([legacyToken, "broken", legacyToken]));
assert.equal(readFavorites(storage).length, 1);
assert.equal(readFavorites(storage)[0].token, encodeProgression(decodeProgression(legacyToken)));
deleteFavorite(storage, legacyToken);
saveFavorite(storage, token);
assert.equal(readFavorites(storage).length, 1);
for (let seed = 0; seed < 23; seed++) saveFavorite(storage, encodeProgression({ ...snapshot, s: seed }));
assert.equal(readFavorites(storage).length, 24);
assert.throws(() => saveFavorite(storage, encodeProgression({ ...snapshot, s: 42 })), /Delete a favorite/);
deleteFavorite(storage, token);
assert.equal(readFavorites(storage).length, 23);
assert.ok(readFavorites(storage).every((entry) => entry.token !== token));
console.log("progression favorites, readable export, shared state validation and restoration checks passed");
