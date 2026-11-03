import { registerChord } from "./audio-out.mjs?ge-revision=f4e4f463a972c3e522b1f45c8654aef5d545c5eb";

export const ACCOMPANIMENT_SUBDIVISIONS = Object.freeze(["1", "&", "2", "&", "3", "&", "4", "&"]);
export const ACCOMPANIMENT_ACTIONS = Object.freeze(["down", "up", "rest"]);

export const ACCOMPANIMENT_PRESETS = Object.freeze({
  steady: Object.freeze({
    id: "steady",
    name: "Steady eighths",
    pattern: Object.freeze(["down", "up", "down", "up", "down", "up", "down", "up"]),
  }),
  open: Object.freeze({
    id: "open",
    name: "Open groove",
    pattern: Object.freeze(["down", "rest", "down", "up", "rest", "up", "down", "up"]),
  }),
  spacious: Object.freeze({
    id: "spacious",
    name: "Leave space",
    pattern: Object.freeze(["down", "rest", "rest", "up", "down", "rest", "rest", "up"]),
  }),
});

function assertIntegerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
}

export function normalizeAccompanimentPattern(pattern) {
  if (!Array.isArray(pattern) || pattern.length !== ACCOMPANIMENT_SUBDIVISIONS.length) {
    throw new TypeError("Accompaniment pattern must contain exactly eight eighth-note slots");
  }
  const normalized = pattern.map((action, index) => {
    if (!ACCOMPANIMENT_ACTIONS.includes(action)) {
      throw new RangeError(`Pattern slot ${index + 1} must be down, up or rest`);
    }
    return action;
  });
  if (normalized.every((action) => action === "rest")) {
    throw new RangeError("Accompaniment pattern must contain at least one strum");
  }
  return Object.freeze(normalized);
}

export function normalizeBarsPerChord(barsPerChord, chordCount) {
  if (!Array.isArray(barsPerChord) || barsPerChord.length !== chordCount) {
    throw new TypeError("barsPerChord must contain one value for every chord");
  }
  return Object.freeze(barsPerChord.map((bars, index) => {
    assertIntegerInRange(bars, 1, 4, `barsPerChord[${index}]`);
    return bars;
  }));
}

export function createAccompanimentPlan({ progression, bpm = 84, barsPerChord, pattern }) {
  if (!Array.isArray(progression) || progression.length < 2 || progression.length > 8) {
    throw new TypeError("Accompaniment progression must contain 2 to 8 supplied chords");
  }
  assertIntegerInRange(bpm, 50, 140, "bpm");
  const bars = normalizeBarsPerChord(barsPerChord ?? progression.map(() => 1), progression.length);
  const normalizedPattern = normalizeAccompanimentPattern(pattern ?? ACCOMPANIMENT_PRESETS.open.pattern);
  return Object.freeze({
    meter: Object.freeze({ beats: 4, beatUnit: 4, subdivisionsPerBar: 8 }),
    bpm,
    progression: Object.freeze([...progression]),
    barsPerChord: bars,
    pattern: normalizedPattern,
  });
}

export function buildAccompanimentCue(plan, transposePitch) {
  if (!plan || !Array.isArray(plan.progression)) throw new TypeError("buildAccompanimentCue requires a plan");
  if (typeof transposePitch !== "function") throw new TypeError("transposePitch must be a function");
  const normalized = createAccompanimentPlan(plan);
  const secondsPerBeat = 60 / normalized.bpm;
  const secondsPerSubdivision = secondsPerBeat / 2;
  const secondsPerBar = secondsPerBeat * 4;
  const duration = Math.max(0.16, Math.min(0.52, secondsPerSubdivision * 0.72));
  const events = [];
  let timeline = 0;

  normalized.progression.forEach((chordRef, chordIndex) => {
    if (!chordRef?.entry?.chord) throw new TypeError(`progression chord ${chordIndex + 1} is not an engine chord reference`);
    const pitches = registerChord(chordRef.entry.chord, 3, transposePitch);
    const bars = normalized.barsPerChord[chordIndex];
    for (let bar = 0; bar < bars; bar += 1) {
      normalized.pattern.forEach((action, slotIndex) => {
        if (action === "rest") return;
        events.push(Object.freeze({
          at: timeline + (bar * secondsPerBar) + (slotIndex * secondsPerSubdivision),
          duration,
          pitches,
          level: action === "down" ? 0.105 : 0.09,
          gesture: "strum",
          direction: action,
          strumSpread: action === "down" ? 0.08 : 0.065,
        }));
      });
    }
    timeline += bars * secondsPerBar;
  });

  if (!events.length) throw new Error("Accompaniment plan produced no audible events");
  return Object.freeze(events);
}

export function accompanimentDurationSeconds(plan) {
  const normalized = createAccompanimentPlan(plan);
  const totalBars = normalized.barsPerChord.reduce((sum, bars) => sum + bars, 0);
  return totalBars * 4 * (60 / normalized.bpm);
}
