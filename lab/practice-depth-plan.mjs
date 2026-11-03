import { depthPositionKey as key } from "./practice-depth-material.mjs";
import { stringName } from "./practice-plan.mjs";

export const DEPTH_IMPRESSIONS = Object.freeze(["settled", "tense", "unsure"]);
export const DEPTH_COMPARISONS = Object.freeze(["a", "b", "same", "unsure"]);
export function beginDepthSession(plan) {
  return Object.freeze({ plan, roundIndex: 0, stage: plan.rounds[0].material.kind === "predict" ? "predict" : "find",
    comparisonIndex: 0, draft: null, predictions: Object.freeze([]), impressions: Object.freeze([]),
    selectedPositions: Object.freeze([]), attempts: 0, assisted: false, auditioned: false,
    backingAuditioned: false, played: false, reflection: null,
  });
}
export function depthAnswers(m) { return m.groups.flatMap((g) => g.locations.slice(0, g.required)); }
export function depthSelectionValid(m, positions) {
  return positions.length === m.groups.reduce((n, g) => n + g.required, 0)
    && m.groups.every((g) => positions.filter((p) => g.locations.some((n) => key(n.position) === key(p))).length === g.required);
}

// Only the five bounded task shapes use this local interaction state.
// No subjective value affects musical facts, task correctness or future selection.
export function advanceDepthSession(s, action) {
  const m = s.plan.rounds[s.roundIndex].material;
  switch (action.type) {
    case "select": {
      if (s.stage !== "find") return s;
      if (!m.choices.some((n) => key(n.position) === key(action.position)) || (m.source && key(m.source.position) === key(action.position))) throw new RangeError("Position outside this challenge");
      const already = s.selectedPositions.some((p) => key(p) === key(action.position));
      const limit = m.groups.reduce((n, g) => n + g.required, 0);
      const next = already ? s.selectedPositions.filter((p) => key(p) !== key(action.position))
        : limit === 1 ? [action.position] : [...s.selectedPositions, action.position].slice(-limit);
      return Object.freeze({ ...s, selectedPositions: Object.freeze(next) });
    }
    case "commit-position":
      if (s.stage !== "find" || !s.selectedPositions.length) return s;
      return Object.freeze({ ...s, attempts: s.attempts + 1, stage: depthSelectionValid(m, s.selectedPositions) ? "use" : "find" });
    case "help":
      return s.stage === "find" && s.attempts > 0 ? Object.freeze({ ...s, stage: "use", assisted: true,
        selectedPositions: Object.freeze(depthAnswers(m).map((n) => n.position)) }) : s;
    case "response": {
      const values = m.kind === "compare" ? DEPTH_COMPARISONS : DEPTH_IMPRESSIONS;
      return ["predict", "hear"].includes(s.stage) && values.includes(action.value) ? Object.freeze({ ...s, draft: action.value }) : s;
    }
    case "audition":
      if (s.stage === "hear") return Object.freeze({ ...s, auditioned: true });
      if (s.stage === "use") return Object.freeze({ ...s, backingAuditioned: true });
      return s;
    case "commit-response": {
      if (!s.draft) return s;
      if (s.stage === "predict") {
        const predictions = [...s.predictions]; predictions[s.comparisonIndex] = s.draft;
        return Object.freeze({ ...s, stage: "hear", draft: null, auditioned: false, predictions: Object.freeze(predictions) });
      }
      if (s.stage !== "hear" || !s.auditioned) return s;
      const impressions = [...s.impressions]; impressions[s.comparisonIndex] = s.draft;
      const more = m.kind === "predict" && s.comparisonIndex < m.comparisons.length - 1;
      return Object.freeze({ ...s, stage: more ? "predict" : "reveal", comparisonIndex: more ? s.comparisonIndex + 1 : s.comparisonIndex,
        draft: null, auditioned: false, impressions: Object.freeze(impressions) });
    }
    case "played": return s.stage === "use" ? Object.freeze({ ...s, played: action.value === true }) : s;
    case "reflect": return s.stage === "use" && ["clearer", "exploring"].includes(action.value) ? Object.freeze({ ...s, reflection: action.value }) : s;
    case "next": {
      if (s.stage === "reveal") return Object.freeze({ ...s, stage: "find" });
      const ear = s.plan.family === "role-ear";
      if (s.stage !== "use" || !s.played || !s.reflection || (ear && !s.backingAuditioned)) return s;
      if (s.roundIndex === s.plan.rounds.length - 1) return Object.freeze({ ...s, stage: "complete" });
      const nextIndex = s.roundIndex + 1;
      const nextMaterial = s.plan.rounds[nextIndex].material;
      return Object.freeze({ ...beginDepthSession(s.plan), roundIndex: nextIndex,
        stage: nextMaterial.kind === "predict" ? "predict" : nextMaterial.kind === "compare" ? "hear" : "find" });
    }
    default: throw new RangeError("Unknown depth action");
  }
}

export function depthBoard(s) {
  const m = s.plan.rounds[s.roundIndex].material;
  const finding = s.stage === "find", using = s.stage === "use";
  const selected = new Set(s.selectedPositions.map(key));
  const answers = using ? s.selectedPositions.map((p) => m.groups.flatMap((g) => g.locations).find((n) => key(n.position) === key(p))) : [];
  const positions = (finding ? m.choices : answers).map((n) => ({ ...n.position,
    selectable: finding && (!m.source || key(n.position) !== key(m.source.position)), selected: finding && selected.has(key(n.position)),
    primaryLabel: using ? n.name : "", states: using ? ["correct"] : [],
    ariaLabel: (using ? n.name + ", " : "") + stringName(n.position.stringIndex) + " string, fret " + n.position.fret,
  }));
  if ((finding || using) && m.source) {
    const source = positions.find((p) => key(p) === key(m.source.position));
    const value = { ...m.source.position, selectable: false, primaryLabel: m.source.name, states: ["source"], ariaLabel: m.source.name + " given, " + stringName(m.source.position.stringIndex) + " string, fret " + m.source.position.fret };
    if (source) Object.assign(source, value); else positions.push(value);
  }
  return { strings: [5, 4, 3, 2].filter((index) => !using || positions.some((p) => p.stringIndex === index)).map((index) => ({ index, label: stringName(index) })),
    activeStringIndices: [2, 3, 4, 5], fretRange: m.region, positions: finding || using ? positions : [], connections: [],
    label: finding ? "Find the required positions. Choose each with Enter or a click; choose again to remove it." : "Play your retrieved notes on the guitar.",
  };
}
