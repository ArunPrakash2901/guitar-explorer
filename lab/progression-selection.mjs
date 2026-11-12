/**
 * UI-only choice policy: reproducibility remains internal, not a user-facing
 * form control. All/Auto chooses a new musical context for an unlocked result;
 * while chord locks exist, All/Auto preserve the current context so a new
 * generation never silently discards them.
 */
export const TONIC_CHOICES = Object.freeze(["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
export const MODE_CHOICES = Object.freeze(["major", "naturalMinor", "mixolydian"]);

export function resolveGenerateChoice({ keyChoice, modeChoice, lockedCount = 0, previous = null, randomUint32 }) {
  if (typeof randomUint32 !== "function") throw new TypeError("Random source is required");
  if (keyChoice !== "all" && !TONIC_CHOICES.includes(keyChoice)) throw new RangeError("Unsupported tonic selection");
  if (modeChoice !== "auto" && !MODE_CHOICES.includes(modeChoice)) throw new RangeError("Unsupported mode selection");
  const value = randomUint32();
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError("Random source must return a uint32");
  }
  const preserve = lockedCount > 0 && previous;
  const chosenKey = keyChoice === "all"
    ? preserve?.tonic ?? TONIC_CHOICES[value % TONIC_CHOICES.length]
    : keyChoice;
  const chosenMode = modeChoice === "auto"
    ? preserve?.mode ?? MODE_CHOICES[Math.floor(value / TONIC_CHOICES.length) % MODE_CHOICES.length]
    : modeChoice;
  return Object.freeze({ tonic: chosenKey, mode: chosenMode, seed: value });
}
