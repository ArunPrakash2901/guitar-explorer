import { musicQueries, parseNote } from "./engine/index.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";

function conventionalContext(tonic, mode) {
  if (mode !== "major" && mode !== "naturalMinor") return true;
  return musicQueries.getKeySignature({ tonic: parseNote(tonic), mode: mode === "major" ? "major" : "minor" }).ok;
}

/**
 * UI-only choice policy: reproducibility remains internal, not a user-facing
 * form control. All/Auto chooses a new musical context for an unlocked result;
 * while chord locks exist, All/Auto preserve the current context so a new
 * generation never silently discards them.
 */
export const TONIC_CHOICES = Object.freeze(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
export const MODE_CHOICES = Object.freeze(["major", "naturalMinor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"]);

export function listGenerateChoices({ keyChoice, modeChoice, lockedCount = 0, previous = null, randomUint32 }) {
  if (typeof randomUint32 !== "function") throw new TypeError("Random source is required");
  if (keyChoice !== "all" && !TONIC_CHOICES.includes(keyChoice)) throw new RangeError("Unsupported tonic selection");
  if (modeChoice !== "auto" && !MODE_CHOICES.includes(modeChoice)) throw new RangeError("Unsupported mode selection");
  const value = randomUint32();
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError("Random source must return a uint32");
  }
  const preserve = lockedCount > 0 ? previous : null;
  const anyKey = keyChoice === "all" && !preserve;
  const anyMode = modeChoice === "auto" && !preserve;
  const keys = anyKey ? TONIC_CHOICES : [keyChoice === "all" ? preserve.tonic : keyChoice];
  const modes = anyMode ? MODE_CHOICES : [modeChoice === "auto" ? preserve.mode : modeChoice];
  const choices = modes.flatMap((mode) => keys
    .filter((tonic) => (!anyKey && !anyMode) || conventionalContext(tonic, mode))
    .map((tonic) => ({ tonic, mode })));
  if (!choices.length) throw new RangeError("No supported key and mode match these choices.");
  const start = value % choices.length;
  return [...choices.slice(start), ...choices.slice(0, start)]
    .map((choice) => Object.freeze({ ...choice, seed: value }));
}

export function resolveGenerateChoice(options) {
  return listGenerateChoices(options)[0];
}
