import { METERS } from "./progression-rhythm.mjs";

export const DRUM_PARTS = Object.freeze(["kick", "snare", "hat"]);
export const DEFAULT_RHYTHM_EDIT = Object.freeze({ parts: null, fill: false, click: false });

const off = Object.freeze({ id: "off", name: "Off", hits: Object.freeze([]) });
const grooves = [
  { id: "pop-backbeat", meter: "4/4", name: "Pop backbeat", subdivisions: 2,
    kick: [[0, 1], [4, .82]], snare: [[2, .78], [6, .86]], hat: [[0,.5],[1,.22],[2,.42],[3,.22],[4,.5],[5,.22],[6,.42],[7,.24]] },
  { id: "rock-drive", meter: "4/4", name: "Rock drive", subdivisions: 2,
    kick: [[0,1],[3,.69],[4,.91],[7,.58]], snare: [[2,.92],[6,1]], hat: [[0,.7],[1,.35],[2,.55],[3,.35],[4,.72],[5,.4],[6,.52],[7,.44]] },

  // Original kit arrangements: 4/4 uses eighths (8 steps), sixteenths (16),
  // or swung triplet subdivisions (12). No new samples or transport required.
  { id: "rock-backbeat", meter: "4/4", name: "Rock", subdivisions: 2,
    kick: [[0,1],[4,.93],[7,.55]], snare: [[2,.98],[6,1]],
    hat: [[0,.67],[1,.3],[2,.57],[3,.33],[4,.7],[5,.32],[6,.6],[7,.34]] },
  { id: "half-time", meter: "4/4", name: "Half-time", subdivisions: 2,
    kick: [[0,1],[3,.42],[6,.72]], snare: [[4,.92]],
    hat: [[0,.46],[1,.2],[2,.36],[3,.2],[4,.55],[5,.24],[6,.38],[7,.22]] },
  { id: "light-funk", meter: "4/4", name: "Light funk", subdivisions: 4,
    kick: [[0,.92],[6,.57],[10,.73],[14,.49]], snare: [[4,.82],[11,.24],[12,.94]],
    hat: [[0,.53],[2,.35],[3,.22],[4,.52],[6,.36],[8,.58],[10,.36],[11,.26],[12,.5],[14,.37],[15,.22]] },
  { id: "pocket-funk", meter: "4/4", name: "Pocket funk", subdivisions: 4,
    kick: [[0,1],[3,.61],[7,.5],[10,.78],[14,.63]], snare: [[4,.94],[12,1],[15,.23]],
    hat: [[0,.54],[2,.3],[4,.54],[5,.23],[7,.34],[8,.56],[10,.38],[12,.52],[13,.23],[15,.37]] },
  { id: "jazz-swing-kit", meter: "4/4", name: "Jazz swing (basic kit)", subdivisions: 3,
    kick: [[0,.64],[6,.5]], snare: [[3,.45],[9,.52]],
    hat: [[0,.46],[2,.34],[3,.39],[5,.3],[6,.47],[8,.33],[9,.4],[11,.34]] },
  { id: "half-shuffle", meter: "4/4", name: "Half shuffle", subdivisions: 3,
    kick: [[0,.95],[6,.64],[10,.37]], snare: [[6,.88]],
    hat: [[0,.56],[2,.26],[3,.38],[5,.27],[6,.55],[8,.3],[9,.42],[11,.32]] },
  { id: "reggae-one-drop", meter: "4/4", name: "Reggae (one drop)", subdivisions: 2,
    kick: [[4,.94]], snare: [[4,.85]],
    hat: [[0,.16],[1,.54],[3,.58],[5,.52],[7,.6]] },
  { id: "soul", meter: "4/4", name: "Soul", subdivisions: 2,
    kick: [[0,.98],[3,.54],[4,.8],[7,.46]], snare: [[2,.85],[5,.23],[6,.97]],
    hat: [[0,.51],[1,.3],[2,.44],[3,.35],[4,.56],[5,.29],[6,.47],[7,.37]] },
  { id: "country-train", meter: "4/4", name: "Country (train beat)", subdivisions: 2,
    kick: [[0,1],[4,.85]], snare: [[1,.27],[2,.85],[3,.28],[5,.25],[6,.87],[7,.3]],
    hat: [[0,.4],[1,.28],[2,.45],[3,.3],[4,.48],[5,.28],[6,.47],[7,.31]] },
  { id: "disco", meter: "4/4", name: "Disco", subdivisions: 2,
    kick: [[0,1],[2,.92],[4,.96],[6,.95]], snare: [[2,.88],[6,.96]],
    hat: [[0,.2],[1,.69],[2,.22],[3,.7],[4,.24],[5,.73],[6,.23],[7,.78]] },
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

  "rock-backbeat": [["snare", 1, .68]],
  "half-time": [["snare", 1, .55]],
  "light-funk": [["snare", 1, .64]],
  "pocket-funk": [["snare", 1, .72]],
  "jazz-swing-kit": [["snare", 1, .53]],
  "half-shuffle": [["snare", 1, .67]],
  "reggae-one-drop": [["snare", 1, .53]],
  "soul": [["snare", 1, .64]],
  "country-train": [["snare", 1, .66]],
  "disco": [["snare", 1, .7]],
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
