import { prepareRolePerformance } from "./role-performance.mjs?ge-revision=f4e4f463a972c3e522b1f45c8654aef5d545c5eb";
import { depthPositionKey as key } from "./practice-depth-material.mjs?ge-revision=f4e4f463a972c3e522b1f45c8654aef5d545c5eb";

export function prepareDepthPerformance(plan, { queries, availablePositions }) {
  const coverage = new Set(availablePositions.map(key));
  const requireSample = (note) => { if (!coverage.has(key(note.position))) throw new RangeError("Depth recording missing at " + key(note.position)); };
  return Object.freeze(plan.rounds.map(({ material: m }) => {
    if (m.source) requireSample(m.source);
    for (const g of m.groups) for (const n of g.locations) requireSample(n);
    const contexts = m.comparisons?.map((c) => c.context) ?? (m.kind === "chord-role" ? [m.context] : []);
    return contexts.length ? prepareRolePerformance({ anchor: m.source ?? m.anchors[0], contexts }, { queries, availablePositions }) : null;
  }));
}

const pluck = (note, at) => ({ at, duration: 1.1, level: 0.65, gesture: "pluck", direction: "down", strumSpread: 0,
  pitches: [note.pitch], positions: [note.position] });
const strum = (performance, index, at, duration = 2.4) => ({ at, duration, level: 0.38, gesture: "strum", direction: "down", strumSpread: 0.065, ...performance.contexts[index] });

export function depthCue(state, performance, pair = false) {
  const m = state.plan.rounds[state.roundIndex].material;
  const ear = state.plan.family === "role-ear";
  if (state.stage === "predict") return [];
  if (ear) {
    if (state.stage === "find" || pair) {
      const notes = state.stage === "use" ? m.groups.map((g) => g.locations.find((n) => state.selectedPositions.some((p) => key(p) === key(n.position)))) : m.anchors;
      return notes.map((note, i) => pluck(note, i * 1.6));
    }
    if (state.stage === "use") {
      const contexts = m.kind === "predict" ? m.comparisons.map((_, i) => i) : [0, 0, 0];
      return contexts.flatMap((index, i) => [strum(performance, index, i * 4, 2), strum(performance, index, i * 4 + 2, 1.6)]);
    }
    const comparisons = m.kind === "predict" && state.stage === "hear" ? [state.comparisonIndex] : m.comparisons.map((_, i) => i);
    return comparisons.flatMap((index, i) => [strum(performance, index, i * 4), pluck(m.comparisons[index].anchor, i * 4 + 0.8)]);
  }
  if (!pair) return m.kind === "chord-role" ? [strum(performance, 0, 0)] : [pluck(m.source, 0)];
  const notes = state.selectedPositions.map((p) => m.groups.flatMap((g) => g.locations).find((n) => key(n.position) === key(p)));
  if (m.kind === "chord-role") return [strum(performance, 0, 0), pluck(notes[0], 0.8)];
  const phrase = m.kind === "reverse" ? [notes[0], m.source, notes[0]] : notes.flatMap((n) => [m.source, n, m.source]);
  return phrase.map((n, i) => pluck(n, i * 1.05));
}
