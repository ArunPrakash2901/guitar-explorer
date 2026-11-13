import { METERS } from "./progression-rhythm.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";

export const DRUM_PARTS = Object.freeze(["kick", "snare", "hat"]);
export const DEFAULT_RHYTHM_EDIT = Object.freeze({ parts: null, fill: false, click: false });

const off = Object.freeze({ id: "off", name: "Off", hits: Object.freeze([]) });
const grooves = [
  { id: "pop-backbeat", meter: "4/4", name: "Pop backbeat", subdivisions: 2,
    kick: [[0, 1], [4, .82]], snare: [[2, .78], [6, .86]], hat: [[0,.5],[1,.22],[2,.42],[3,.22],[4,.5],[5,.22],[6,.42],[7,.24]] },
  { id: "rock-drive", meter: "4/4", name: "Rock drive", subdivisions: 2,
    kick: [[0,1],[3,.69],[4,.91],[7,.58]], snare: [[2,.92],[6,1]], hat: [[0,.7],[1,.35],[2,.55],[3,.35],[4,.72],[5,.4],[6,.52],[7,.44]] },
  { id: "blues-triplets", meter: "4/4", name: "Blues shuffle", subdivisions: 3,
    kick: [[0,1],[6,.84]], snare: [[3,.85],[9,.9],[11,.25]], hat: [[0,.6],[2,.32],[3,.52],[5,.28],[6,.6],[8,.35],[9,.5],[11,.38]] },
  { id: "folk-waltz", meter: "3/4", name: "Folk waltz", subdivisions: 2,
    kick: [[0,.84]], snare: [[2,.48],[4,.6]], hat: [[0,.45],[2,.3],[4,.35],[5,.2]] },
  { id: "soft-waltz", meter: "3/4", name: "Soft waltz", subdivisions: 2,
    kick: [[0,.74],[3,.25]], snare: [[4,.51]], hat: [[0,.38],[1,.24],[2,.39],[3,.24],[4,.4],[5,.23]] },
  { id: "six-eight-sway", meter: "6/8", name: "6/8 sway", subdivisions: 3,
    kick: [[0,.9],[2,.31]], snare: [[3,.72]], hat: [[0,.54],[1,.24],[2,.28],[3,.51],[4,.2],[5,.33]] },
  { id: "six-eight-drive", meter: "6/8", name: "6/8 drive", subdivisions: 3,
    kick: [[0,1],[2,.58],[5,.52]], snare: [[3,.95]], hat: [[0,.65],[1,.32],[2,.42],[3,.65],[4,.32],[5,.45]] },
].map(({ kick, snare, hat, ...groove }) => Object.freeze({
  ...groove,
  hits: Object.freeze(Object.entries({ kick, snare, hat }).flatMap(([voice, events]) =>
    events.map(([step, level]) => Object.freeze({ voice, step, level }))).sort((a, b) => a.step - b.step)),
}));

export function groovesForMeter(meter) {
  if (!Object.hasOwn(METERS, meter)) throw new RangeError("Unsupported meter");
  return [off, ...grooves.filter((groove) => groove.meter === meter)];
}

export function getGrooveGrid(meter, grooveId) {
  const groove = groovesForMeter(meter).find(({ id }) => id === grooveId);
  if (!groove) throw new RangeError("The selected drum groove does not belong to " + meter);
  const subdivisions = groove.subdivisions ?? METERS[meter].subdivisions;
  const steps = METERS[meter].pulses * subdivisions;
  const parts = DRUM_PARTS.map((voice) =>
    groove.hits.reduce((mask, hit) => hit.voice === voice ? mask | (1 << hit.step) : mask, 0));
  return { subdivisions, steps, parts, hits: groove.hits };
}

export function validDrumParts(parts, steps) {
  return Array.isArray(parts) && parts.length === DRUM_PARTS.length &&
    Array.from(parts).every((part) => Number.isInteger(part) && part >= 0 && part < 2 ** steps);
}

// Each fill adds a short phrase near the bar line using the existing acoustic kit.
const fills = {
  "pop-backbeat": [["snare", 2, .68], ["hat", 1, .53]],
  "rock-drive": [["snare", 3, .72], ["snare", 2, .9], ["kick", 1, .85]],
  "blues-triplets": [["snare", 3, .57], ["snare", 1, .76]],
  "folk-waltz": [["snare", 1, .48]],
  "soft-waltz": [["hat", 2, .42], ["snare", 1, .42]],
  "six-eight-sway": [["hat", 2, .45], ["snare", 1, .51]],
  "six-eight-drive": [["snare", 3, .66], ["snare", 2, .76], ["kick", 1, .78]],
};
const addedLevel = { kick: .8, snare: .75, hat: .43 };

export function drumPlan(meter, grooveId, bpm, { parts = null, fill = false } = {}) {
  const grid = getGrooveGrid(meter, grooveId);
  if (!Number.isFinite(bpm) || bpm < 50 || bpm > 180) throw new RangeError("Tempo must be between 50 and 180 BPM");
  if (parts !== null && (grooveId === "off" || !validDrumParts(parts, grid.steps))) {
    throw new RangeError("The drum parts must match the groove grid");
  }
  if (typeof fill !== "boolean") throw new TypeError("The drum fill setting must be on or off");
  const masks = parts ?? grid.parts;
  const pattern = new Map(grid.hits.map((hit) => [hit.voice + ":" + hit.step, hit.level]));
  const hits = DRUM_PARTS.flatMap((voice, index) =>
    Array.from({ length: grid.steps }, (_, step) => step).filter((step) => masks[index] & (1 << step))
      .map((step) => ({ voice, step, level: pattern.get(voice + ":" + step) ?? addedLevel[voice] })));
  const events = new Map(hits.map((hit) => [hit.voice + ":" + hit.step, hit]));
  if (fill) {
    for (const [voice, beforeEnd, accent] of fills[grooveId] ?? []) {
      const step = grid.steps - beforeEnd;
      const key = voice + ":" + step;
      const level = Math.max(accent, events.get(key)?.level ?? 0);
      events.set(key, { voice, step, level });
    }
  }
  const secondsPerStep = 60 / bpm / grid.subdivisions;
  return Object.freeze([...events.values()].sort((a, b) => a.step - b.step)
    .map((hit) => Object.freeze({ ...hit, seconds: hit.step * secondsPerStep })));
}
