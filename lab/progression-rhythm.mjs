/**
 * Bounded musical rhythm vocabulary. All strum events are expressed in regular
 * meter subdivisions and converted to real time only at the audio boundary.
 *
 * 6/8 BPM uses dotted-quarter pulses (two pulses per bar). 3/4 and 4/4 BPM
 * use quarter-note pulses. This convention is exposed in the UI.
 */
export const METERS = Object.freeze({
  "4/4": Object.freeze({ pulses: 4, subdivisions: 2, pulseUnit: "quarter" }),
  "3/4": Object.freeze({ pulses: 3, subdivisions: 2, pulseUnit: "quarter" }),
  "6/8": Object.freeze({ pulses: 2, subdivisions: 3, pulseUnit: "dotted-quarter" }),
});

function stroke(step, direction = "down", level = 1) {
  return Object.freeze({ step, direction, level });
}

export const RHYTHM_PATTERNS = Object.freeze([
  Object.freeze({ id: "steady", meter: "4/4", name: "Steady downstrokes",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(4, "down", .8)]) }),
  Object.freeze({ id: "acoustic-pop", meter: "4/4", name: "Acoustic pop",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(2, "down", .74),
      stroke(3, "up", .46), stroke(4, "down", .84), stroke(6, "down", .7), stroke(7, "up", .5)]) }),
  Object.freeze({ id: "folk", meter: "4/4", name: "Folk strum",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(2, "down", .8),
      stroke(3, "up", .45), stroke(5, "up", .48), stroke(6, "down", .78), stroke(7, "up", .53)]) }),
  Object.freeze({ id: "rock-eighths", meter: "4/4", name: "Rock eighths",
    strokes: Object.freeze(Array.from({ length: 8 }, (_, step) =>
      stroke(step, step % 2 ? "up" : "down", [1, .45, .75, .48, .9, .45, .76, .5][step]))) }),
  Object.freeze({ id: "blues-shuffle", meter: "4/4", name: "Blues shuffle", subdivisions: 3,
    strokes: Object.freeze([stroke(0), stroke(2, "up", .55), stroke(3, "down", .8), stroke(5, "up", .48),
      stroke(6, "down", .9), stroke(8, "up", .52), stroke(9, "down", .78), stroke(11, "up", .5)]) }),
  Object.freeze({ id: "waltz", meter: "3/4", name: "Waltz",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(2, "down", .58), stroke(4, "down", .63)]) }),
  Object.freeze({ id: "waltz-sway", meter: "3/4", name: "Waltz sway",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(2, "down", .62),
      stroke(3, "up", .35), stroke(4, "down", .65), stroke(5, "up", .42)]) }),
  Object.freeze({ id: "six-eight", meter: "6/8", name: "Slow 6/8",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(3, "down", .72)]) }),
  Object.freeze({ id: "rolling-six-eight", meter: "6/8", name: "Rolling 6/8",
    strokes: Object.freeze([stroke(0, "down", 1), stroke(1, "up", .36), stroke(2, "down", .58),
      stroke(3, "down", .78), stroke(4, "up", .36), stroke(5, "down", .55)]) }),
]);

export const DEFAULT_PATTERN = Object.freeze({
  "4/4": "acoustic-pop",
  "3/4": "waltz",
  "6/8": "rolling-six-eight",
});

export function patternsForMeter(meter) {
  if (!Object.hasOwn(METERS, meter)) throw new RangeError("Unsupported meter: " + String(meter));
  return Object.freeze(RHYTHM_PATTERNS.filter((pattern) => pattern.meter === meter));
}

export function rhythmPlan(meter, patternId, bpm) {
  const definition = Object.hasOwn(METERS, meter) ? METERS[meter] : undefined;
  if (!definition) throw new RangeError("Unsupported meter: " + String(meter));
  if (!Number.isFinite(bpm) || bpm < 50 || bpm > 180) {
    throw new RangeError("Tempo must be between 50 and 180 BPM");
  }
  const pattern = RHYTHM_PATTERNS.find((candidate) => candidate.id === patternId && candidate.meter === meter);
  if (!pattern) throw new RangeError("The selected strum pattern does not belong to " + meter);
  const secondsPerPulse = 60 / bpm;
  const secondsPerBar = definition.pulses * secondsPerPulse;
  const subdivisions = pattern.subdivisions ?? definition.subdivisions;
  const secondsPerStep = secondsPerPulse / subdivisions;
  const stepsPerBar = definition.pulses * subdivisions;
  let lastStep = -1;
  const strokes = pattern.strokes.map((item) => {
    if (!Number.isInteger(item.step) || item.step <= lastStep || item.step < 0 || item.step >= stepsPerBar) {
      throw new Error("Invalid non-increasing or out-of-meter strum step");
    }
    if (!["down", "up"].includes(item.direction) || !Number.isFinite(item.level) ||
        item.level <= 0 || item.level > 1) throw new Error("Invalid strum direction or intensity");
    lastStep = item.step;
    return Object.freeze({ ...item, seconds: item.step * secondsPerStep });
  });
  return Object.freeze({
    meter, pattern: pattern.id, bpm, pulseUnit: definition.pulseUnit,
    secondsPerPulse, secondsPerBar, secondsPerStep, stepsPerBar,
    strokes: Object.freeze(strokes),
  });
}
