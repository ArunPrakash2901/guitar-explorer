const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;

export function beginSession(plan) {
  return Object.freeze({
    plan, roundIndex: 0, stage: "find", selected: null,
    attempts: 0, assisted: false, played: false, reflection: null,
  });
}

// Workflow evidence only. A correct screen choice is not proof of guitar playing.
export function advanceSession(state, action) {
  if (!state || !state.plan.rounds[state.roundIndex]) throw new TypeError("An active session is required");
  const material = state.plan.rounds[state.roundIndex].material;
  switch (action.type) {
    case "select":
      if (state.stage !== "find") return state;
      if (!material.choices.some((note) => key(note.position) === key(action.position))) throw new RangeError("Position is outside the task");
      return Object.freeze({ ...state, selected: action.position });
    case "commit":
      if (state.stage !== "find" || !state.selected) return state;
      return Object.freeze({
        ...state, attempts: state.attempts + 1,
        stage: key(state.selected) === key(material.target.position) ? "use" : "find",
      });
    case "help":
      if (state.stage !== "find" || state.attempts === 0) return state;
      return Object.freeze({ ...state, stage: "use", assisted: true });
    case "played":
      return state.stage === "use" ? Object.freeze({ ...state, played: action.value === true }) : state;
    case "reflect":
      if (state.stage !== "use" || !["home", "exploring"].includes(action.value)) return state;
      return Object.freeze({ ...state, reflection: action.value });
    case "next":
      if (state.stage !== "use" || !state.played || !state.reflection) return state;
      if (state.roundIndex === state.plan.rounds.length - 1) return Object.freeze({ ...state, stage: "complete" });
      return Object.freeze({
        ...beginSession(state.plan), roundIndex: state.roundIndex + 1,
      });
    default: throw new RangeError("Unknown Practice action");
  }
}

export function stringName(index) {
  return ["6 · low E", "5 · A", "4 · D", "3 · G", "2 · B", "1 · high E"][index];
}

// The renderer receives only permitted labels, never unrevealed pitch metadata.
export function intervalBoard(state) {
  const material = state.plan.rounds[state.roundIndex].material;
  const revealed = state.stage !== "find";
  const rootKey = key(material.root.position);
  const targetKey = key(material.target.position);
  const selectedKey = state.selected && key(state.selected);
  const positions = material.choices.map((note) => {
    const id = key(note.position);
    const isRoot = id === rootKey;
    const isAnswer = revealed && id === targetKey;
    return {
      ...note.position, selectable: !revealed, selected: !revealed && id === selectedKey,
      states: isAnswer ? ["correct"] : isRoot ? ["source"] : [],
      primaryLabel: isAnswer ? material.target.name : isRoot ? material.root.name : "",
      ariaLabel: isAnswer
        ? material.target.name + ", " + stringName(note.position.stringIndex) + " string, fret " + note.position.fret
        : (isRoot ? material.root.name + " root, " : "") + stringName(note.position.stringIndex) + " string, fret " + note.position.fret,
    };
  });
  if (!positions.some((position) => key(position) === rootKey)) {
    positions.push({
      ...material.root.position, selectable: false, states: ["source"],
      primaryLabel: material.root.name,
      ariaLabel: material.root.name + " root, " + stringName(material.root.position.stringIndex) + " string, fret " + material.root.position.fret,
    });
  }
  return {
    strings: Array.from({ length: 6 }, (_, i) => ({ index: 5 - i, label: stringName(5 - i) }))
      .filter(({ index }) => !revealed || [material.root.position.stringIndex, material.target.position.stringIndex].includes(index)),
    activeStringIndices: [...new Set([material.root.position.stringIndex, material.target.position.stringIndex])],
    fretRange: material.region, positions, connections: [],
    label: revealed
      ? "The strings used for this interval. Standard tuning, open through fret 3."
      : "Find an interval on the guitar. Standard tuning, open through fret 3. Arrow keys move between choices.",
  };
}

export function intervalCue(material, pair = false) {
  const notes = pair ? [material.root, material.target, material.root] : [material.root];
  return notes.map((note, index) => ({
    at: index * 1.05, duration: 0.8, level: 0.7, gesture: "pluck", direction: "down",
    strumSpread: 0, pitches: [note.pitch], positions: [note.position],
  }));
}
