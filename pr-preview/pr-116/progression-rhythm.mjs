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

function stroke(step, direction = "down", level = 1, articulation, gate) {
  return Object.freeze({ step, direction, level, ...(articulation ? { articulation, gate } : {}) });
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
  Object.freeze({ id: "funk-syncopation", meter: "4/4", name: "Funk syncopation", subdivisions: 4,
    variation: true, strokes: Object.freeze([stroke(0,"down",1,"upper",.46), stroke(3,"up",.58,"upper",.42),
      stroke(6,"down",.74,"upper",.44), stroke(7,"up",.38,"upper",.4), stroke(10,"down",.86,"upper",.47),
      stroke(13,"up",.52,"upper",.4), stroke(15,"up",.47,"upper",.38)]) }),
  Object.freeze({ id: "reggae-offbeat", meter: "4/4", name: "Reggae offbeats", variation: true,
    strokes: Object.freeze([stroke(1,"up",.79,"upper",.27), stroke(3,"up",.66,"upper",.25),
      stroke(5,"up",.76,"upper",.26), stroke(7,"up",.71,"upper",.24)]) }),
  Object.freeze({ id: "bossa-bass", meter: "4/4", name: "Bossa bass and chords", subdivisions: 4,
    variation: true, strokes: Object.freeze([stroke(0,"down",.9,"bass",.86), stroke(2,"up",.62,"upper",.7),
      stroke(6,"down",.73,"upper",.75), stroke(8,"down",.78,"bass",.85),
      stroke(11,"up",.52,"upper",.73), stroke(14,"up",.63,"upper",.69)]) }),
  Object.freeze({ id: "country-shuffle", meter: "4/4", name: "Country shuffle", subdivisions: 3,
    variation: true, strokes: Object.freeze([stroke(0,"down",1,"bass",.78), stroke(2,"up",.54,"upper",.85),
      stroke(3,"down",.76), stroke(5,"up",.46,"upper",.7), stroke(6,"down",.93,"bass",.76),
      stroke(8,"up",.53,"upper",.85), stroke(9,"down",.81), stroke(11,"up",.49,"upper",.7)]) }),
  Object.freeze({ id: "soul-pocket", meter: "4/4", name: "Soul pocket", subdivisions: 4,
    variation: true, strokes: Object.freeze([stroke(0,"down",.77), stroke(3,"up",.48,"upper",.75),
      stroke(7,"up",.58,"upper",.76), stroke(10,"down",.92), stroke(14,"up",.54,"upper",.77)]) }),
  Object.freeze({ id: "ballad-bass", meter: "6/8", name: "Ballad bass and chords", variation: true,
    strokes: Object.freeze([stroke(0,"down",.86,"bass",.84), stroke(1,"down",.65,"upper",.98),
      stroke(3,"down",.73,"bass",.82), stroke(4,"down",.58,"upper",.93)]) }),
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
    secondsPerPulse, secondsPerBar, secondsPerStep, stepsPerBar, variation: pattern.variation === true,
    strokes: Object.freeze(strokes),
  });
}
