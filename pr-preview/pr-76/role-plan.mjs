import { stringName } from "./practice-plan.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";

const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;
export const LISTENING_IMPRESSIONS = Object.freeze(["settled", "tense", "unsure"]);
export function beginRoleSession(plan) {
  return Object.freeze({
    plan, roundIndex: 0, contextIndex: 0, stage: "hear", draft: null,
    impressions: Object.freeze([null, null, null]), auditioned: false,
    selected: null, attempts: 0, assisted: false, played: false, backingAuditioned: false,
  });
}

// Listening impressions never affect musical facts or correctness.
export function advanceRoleSession(state, action) {
  const material = state.plan.rounds[state.roundIndex].material;
  switch (action.type) {
    case "impression":
      return state.stage === "hear" && LISTENING_IMPRESSIONS.includes(action.value)
        ? Object.freeze({ ...state, draft: action.value }) : state;
    case "audition":
      if (state.stage === "hear") return Object.freeze({ ...state, auditioned: true });
      if (state.stage === "use") return Object.freeze({ ...state, backingAuditioned: true });
      return state;
    case "commit-impression": {
      if (state.stage !== "hear" || !state.auditioned || !state.draft) return state;
      const impressions = [...state.impressions]; impressions[state.contextIndex] = state.draft;
      return Object.freeze({
        ...state, impressions: Object.freeze(impressions), draft: null, auditioned: false,
        ...(state.contextIndex < 2 ? { contextIndex: state.contextIndex + 1 } : { stage: "reveal" }),
      });
    }
    case "select":
      if (state.stage !== "find") return state;
      if (!material.choices.some((note) => key(note.position) === key(action.position))) throw new RangeError("Anchor position is outside the task");
      return Object.freeze({ ...state, selected: action.position });
    case "commit-position":
      if (state.stage !== "find" || !state.selected) return state;
      return Object.freeze({
        ...state, attempts: state.attempts + 1,
        stage: material.locations.some((note) => key(note.position) === key(state.selected)) ? "use" : "find",
      });
    case "help":
      return state.stage === "find" && state.attempts > 0
        ? Object.freeze({ ...state, stage: "use", assisted: true, selected: material.anchor.position }) : state;
    case "played":
      return state.stage === "use" ? Object.freeze({ ...state, played: action.value === true }) : state;
    case "next":
      if (state.stage === "reveal") return Object.freeze({ ...state, stage: "find" });
      if (state.stage !== "use" || !state.backingAuditioned || !state.played) return state;
      return state.roundIndex === state.plan.rounds.length - 1
        ? Object.freeze({ ...state, stage: "complete" })
        : Object.freeze({ ...beginRoleSession(state.plan), roundIndex: state.roundIndex + 1 });
    default: throw new RangeError("Unknown Role Practice action");
  }
}

export function roleBoard(state) {
  const m = state.plan.rounds[state.roundIndex].material;
  const finding = state.stage === "find";
  const using = state.stage === "use";
  const positions = finding ? m.choices.map((note) => ({
    ...note.position, selectable: true,
    selected: state.selected && key(note.position) === key(state.selected),
    primaryLabel: "", states: [],
    ariaLabel: stringName(note.position.stringIndex) + " string, fret " + note.position.fret,
  })) : using ? [{
    ...(state.selected ?? m.anchor.position), selectable: false, states: ["correct"],
    primaryLabel: m.anchor.name,
    ariaLabel: m.anchor.name + ", " + stringName((state.selected ?? m.anchor.position).stringIndex) + " string, fret " + (state.selected ?? m.anchor.position).fret,
  }] : [];
  return {
    strings: Array.from({ length: 6 }, (_, i) => ({ index: 5 - i, label: stringName(5 - i) }))
      .filter(({ index }) => !using || index === (state.selected ?? m.anchor.position).stringIndex),
    activeStringIndices: using ? [(state.selected ?? m.anchor.position).stringIndex] : [2, 3, 4],
    fretRange: m.region, positions, connections: [],
    label: using ? "Keep this pitch fixed while the chords change." : "Find the anchor pitch on D, G or B strings, open through fret 2. Arrow keys move between choices.",
  };
}
