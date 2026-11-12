import { METERS } from "./progression-rhythm.mjs";

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

export function drumPlan(meter, grooveId, bpm) {
  const groove = groovesForMeter(meter).find(({ id }) => id === grooveId);
  if (!groove) throw new RangeError("The selected drum groove does not belong to " + meter);
  if (!Number.isFinite(bpm) || bpm < 50 || bpm > 180) throw new RangeError("Tempo must be between 50 and 180 BPM");
  const secondsPerStep = 60 / bpm / (groove.subdivisions ?? METERS[meter].subdivisions);
  return Object.freeze(groove.hits.map((hit) => {
    if (!Number.isInteger(hit.step) || hit.step < 0 || hit.step >= METERS[meter].pulses * groove.subdivisions ||
        !(hit.level > 0 && hit.level <= 1)) throw new Error("Invalid drum groove event");
    return Object.freeze({ ...hit, seconds: hit.step * secondsPerStep });
  }));
}
