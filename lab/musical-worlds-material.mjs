// Original arrangements and bounded musical choices. Engine queries supply
// pitch/chord facts; this file neither knows about samples nor renders audio.
export const WORLD_DEFINITIONS = Object.freeze([
  { id: "band", title: "The band's empty space", intention: "Arrange",
    question: "Leave room for the bass.",
    action: "Play along with two notes per bar. Answer a bass accent, then leave the next beat empty. Hear how much the band can say in the gap.",
    transfer: "Keep the role of your part and move it to Room to breathe. Which notes can you leave out?" },
  { id: "groove", title: "Inside the groove", intention: "Rhythm",
    question: "Move the accent. Keep the pulse.",
    action: "On one string, play short notes and muted strokes. Keep the rhythm, then move just one accent to an offbeat. Listen for the push against the drums.",
    transfer: "Keep that right-hand pattern against another backing. Try moving the accent again before changing any pitch." },
  { id: "missing", title: "The missing musician", intention: "Reconstruct",
    question: "Bring back the missing lead.",
    action: "Hear the lead in bars 1 and 3. Sing its contour. Remove it and play your version in those spaces before looking at the reference.",
    transfer: "Keep the contour of the opening. Make a different ending for the same band." },
  { id: "detective", title: "Harmony detective", intention: "Hear harmony",
    question: "Keep a note. Change its surroundings.",
    action: "Hear the note against the chords, then play that same pitch on your guitar. Notice where it sounds like home and where you want it to move.",
    transfer: "Try the other anchor without changing the backing. Over the last G, compare staying where you are with moving to the neighbouring note." },
  { id: "dialogue", title: "Musical dialogue", intention: "Respond",
    question: "Answer the call in the space it leaves.",
    action: "Listen during the call bar. In your turn, echo its rhythm with two notes of your own. On the next pass, keep one note and change the timing.",
    transfer: "Take your reply to a different backing. Hear the new call and keep only the part of your reply that still fits." },
  { id: "composition", title: "A phrase becomes a piece", intention: "Compose",
    question: "Give your idea a departure and a return.",
    action: "Play the A phrase on your guitar. Make B answer it with a different ending. Hear how moving B changes where the piece seems to come home.",
    transfer: "Keep A intact. Move B from the third bar to the second and listen for what changes when A returns." },
  { id: "expression", title: "The same notes, four voices", intention: "Interpret",
    question: "Change the feel without changing the notes.",
    action: "Hear the plain phrase and one interpretation. Play the same frets with your own attack and space. Can the second take say something different?",
    transfer: "Carry the same touch to the new phrase in another backing. Keep its notes and change the delivery." },
]);

const G2 = "0:3", B2 = "1:2", C3 = "1:3", D3 = "2:0", E3 = "2:2";
const G3 = "3:0", A3 = "3:2", B3 = "4:0", C4 = "4:1", E4 = "5:0", FS4 = "5:2", G4 = "5:3";
export const NOTE_PALETTE = Object.freeze([G2, B2, C3, D3, E3, G3, A3, B3, C4, E4, FS4, G4]);
export const WORLD_CHORDS = Object.freeze({
  G: { id: "G:major", spec: { root: { letter: "G", accidental: 0 }, chordId: "major" }, bass: G2, colour: B2 },
  C: { id: "C:major", spec: { root: { letter: "C", accidental: 0 }, chordId: "major" }, bass: C3, colour: E3 },
  D7: { id: "D:dominant7", spec: { root: { letter: "D", accidental: 0 }, chordId: "dominant7" }, bass: D3, colour: C3 },
});
export const ANCHORS = Object.freeze([C4, B3]);
const DETECTIVE_PROGRESSION = Object.freeze(["G", "C", "D7", "G"]);
const phrase = rows => Object.freeze(rows.map(([step, note, duration]) => Object.freeze({ step, note, duration })));
export const REFERENCE_PHRASE = phrase([[0,G3,2], [4,B3,2], [6,C4,2], [10,B3,2], [14,G3,2]]);
export const CALL_PHRASE = phrase([[0,G3,2], [3,B3,2], [7,C4,2], [12,G3,3]]);
export const ARRANGEMENTS = Object.freeze([
  { id: "interlock", name: "Interlocking pocket", tempo: 102,
    description: "The bass answers the kick on offbeats. Leave room between those answers.",
    chords: ["G","C","D7","G"], bassSteps: [0,6,10,14], bassLength: 2, colourAt: [10],
    kicks: [0,7,10], snares: [4,12], hats: [0,2,4,6,8,10,12,14], turnaround: [14,15],
    reference: REFERENCE_PHRASE, call: CALL_PHRASE },
  { id: "air", name: "Room to breathe", tempo: 78,
    description: "Long bass notes, a spare backbeat and open space for a ringing guitar line.",
    chords: ["G","G","C","D7"], bassSteps: [0,9], bassLength: 6, colourAt: [],
    kicks: [0,8], snares: [12], hats: [0,4,8,12], turnaround: [14],
    reference: phrase([[2,B3,4], [8,G3,4], [13,E3,3]]),
    call: phrase([[0,G3,5], [8,A3,3], [12,B3,4]]) },
  { id: "crosscurrent", name: "Cross-current", tempo: 112,
    description: "A three-three-two accent pattern against a steady four-beat bar, with a snare pickup on the return.",
    chords: ["C","D7","G","C"], bassSteps: [0,6,12], bassLength: 3, colourAt: [6],
    kicks: [0,6,12], snares: [4,12], hats: [0,2,5,8,10,13], turnaround: [10,14,15],
    reference: phrase([[0,E4,2], [3,G4,2], [6,E4,3], [12,C4,4]]),
    call: phrase([[0,C4,2], [6,E4,2], [9,G4,2], [12,E4,3]]) },
]);

export const EDIT_FIELDS = Object.freeze({
  band: "pattern", groove: "groove", missing: "reconstruction", dialogue: "response",
});
const FORM_OPTIONS = ["AABA", "ABAB", "ABBA"];
export const FEELS = Object.freeze([
  ["natural","Plain"],
  ["laidback","Let it ring, just behind the beat"],
  ["ahead","Lean into the offbeats"],
  ["staccato","Short and sharp"],
]);
const unwrap = result => {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export function positionFromKey(key) {
  if (typeof key !== "string" || !/^[0-5]:\d{1,2}$/.test(key)) throw new RangeError("Invalid supplied guitar position");
  const [stringIndex, fret] = key.split(":").map(Number);
  return Object.freeze({ stringIndex, fret });
}

export function worldChordContexts(queries) {
  return Object.entries(WORLD_CHORDS).map(([symbol, { id, spec }]) => ({
    id, spec, symbol, chord: unwrap(queries.getChord(spec)),
  }));
}

export function worldRoleFacts(queries, anchorKey) {
  const anchor = unwrap(queries.getNoteAtFret({ position: positionFromKey(anchorKey) }));
  return worldChordContexts(queries).map(context => {
    const [analysis] = unwrap(queries.analyseNotes({ notes: [anchor.pitch], context: { currentChord: context.spec } }));
    if (!analysis?.chordRelation) throw new Error("No role found for this musical context");
    return { ...context, relation: analysis.chordRelation };
  });
}

export function emptyGrid() { return Array.from({ length: 16 }, () => null); }
const cell = (note, { accent = false, held = false } = {}) => Object.freeze({ note, accent, held });
function seedGrid(rows) {
  const grid = emptyGrid();
  for (const [step, note, choices] of rows) grid[step] = cell(note, choices);
  return grid;
}
export function initialWorldState() {
  return {
    world: "band", arrangement: "interlock", pattern: seedGrid([[6,B3], [14,G3]]),
    groove: seedGrid([[0,G3], [3,"mute"], [6,"mute",{accent:true}], [8,G3], [14,"mute"]]),
    reconstruction: emptyGrid(),
    phraseA: seedGrid([[0,G3], [4,B3], [7,C4], [12,G3,{held:true}]]),
    phraseB: seedGrid([[0,E4,{held:true}], [6,C4], [10,B3], [14,A3]]),
    response: emptyGrid(), section: "A", form: "AABA", feel: "natural",
    context: "progression", anchor: C4, selectedStep: 0, revealed: false,
    canReveal: false, repeat: true, reflections: {},
  };
}
export function currentGrid(state) {
  return state.world === "composition" ? "phrase" + state.section : EDIT_FIELDS[state.world];
}
export function editGrid(state, field, step, value) {
  if (![...Object.values(EDIT_FIELDS), "phraseA", "phraseB"].includes(field)
    || !Number.isInteger(step) || step < 0 || step >= 16) throw new RangeError("Invalid musical edit");
  if (value !== null && value !== "mute" && !NOTE_PALETTE.includes(value)) throw new RangeError("Unsupported guitar position");
  const previous = state[field][step];
  return { ...state, [field]: state[field].map((x, i) => i === step
    ? value === null ? null : cell(value, previous ?? {})
    : x) };
}
export function shapeGridCell(state, field, step, property) {
  if (![...Object.values(EDIT_FIELDS), "phraseA", "phraseB"].includes(field)
    || !["accent", "held"].includes(property) || !state[field]?.[step]) return state;
  const previous = state[field][step];
  if (property === "held" && previous.note === "mute") return state;
  return { ...state, [field]: state[field].map((x, i) => i === step ? cell(x.note, { ...x, [property]: !x[property] }) : x) };
}
export function arrangeWorld(id) {
  const material = ARRANGEMENTS.find(x => x.id === id);
  if (!material) throw new RangeError("Unknown authored arrangement");
  return material;
}

function addBacking(events, material, chords, { harmony, rootOnly }) {
  for (const [bar, symbol] of chords.entries()) {
    const chord = WORLD_CHORDS[symbol], start = bar * 16;
    for (const [instrument, steps] of [["kick", material.kicks], ["snare", material.snares], ["hat", material.hats]]) {
      for (const step of steps) events.push({
        instrument, step: start + step, velocity: instrument === "hat" ? (step % 4 === 0 ? .13 : .075) : .32,
      });
    }
    if (bar === 3) for (const step of material.turnaround) if (!material.snares.includes(step)) {
      events.push({ instrument: "snare", step: start + step, velocity: .16 });
    }
    for (const [i, step] of material.bassSteps.entries()) events.push({
      instrument: "bass", step: start + step,
      note: !rootOnly && material.colourAt.includes(step) ? chord.colour : chord.bass,
      duration: Math.min(material.bassLength, (material.bassSteps[i + 1] ?? 16) - step),
      velocity: step === 0 ? .25 : .18,
    });
    if (harmony) for (const step of [0,8]) events.push({
      instrument: "chord", chord: symbol, step: start + step, duration: step === 0 ? 6 : 5,
      velocity: rootOnly ? .37 : .23,
    });
  }
}

function addPhrase(events, line, bar, feel = "natural") {
  for (const [index, item] of line.entries()) {
    const offset = feel === "laidback" ? .27 : feel === "ahead" ? -.23 : 0;
    const duration = feel === "staccato" ? .56 : feel === "laidback" ? item.duration + 1.2
      : feel === "ahead" ? item.duration * .72 : item.duration;
    const emphasis = feel === "ahead" ? item.step % 4 !== 0 : feel === "laidback" ? index === line.length - 1 : index === 0;
    events.push({
      instrument: "guitar", step: bar * 16 + item.step, note: item.note,
      duration: Math.min(duration, (line[index + 1]?.step ?? 16) - item.step),
      offsetSteps: item.step === 0 ? Math.max(0, offset) : offset,
      velocity: emphasis ? .72 : feel === "staccato" ? .52 : .45,
    });
  }
}
function addGrid(events, grid, bar) {
  for (const [step, item] of grid.entries()) {
    if (!item) continue;
    const isMute = item.note === "mute";
    const next = grid.findIndex((value, index) => index > step && value !== null);
    events.push({
      instrument: isMute ? "mute" : "guitar", step: bar * 16 + step,
      ...(isMute ? {} : { note: item.note }),
      duration: Math.min(item.held ? 3.7 : 1.25, (next < 0 ? 16 : next) - step),
      velocity: item.accent ? .78 : .43,
    });
  }
}

export function buildWorldScore(state, { mode = "full" } = {}) {
  if (!WORLD_DEFINITIONS.some(w => w.id === state.world)) throw new RangeError("Unknown musical situation");
  if (!["full","backing","solo","original","call","plain"].includes(mode)) throw new RangeError("Unknown playback mix");
  const material = arrangeWorld(state.arrangement);
  const detective = state.world === "detective";
  const chords = detective ? state.context === "progression" ? DETECTIVE_PROGRESSION
    : Array(4).fill(state.context) : material.chords;
  if (!chords.every(symbol => Object.hasOwn(WORLD_CHORDS, symbol))) throw new RangeError("Unknown supplied harmony");
  const bars = chords.length;
  const events = [];
  const labels = chords.map((chord, index) => {
    if (state.world === "dialogue") return (index % 2 === 0 ? "Call" : "Your turn") + " · " + chord;
    if (state.world === "composition") return state.form[index] + " · " + chord;
    if (state.world === "missing") return (index % 2 === 0 ? "Lead space" : "Band") + " · " + chord;
    return chord;
  });
  if (state.world === "composition" && !FORM_OPTIONS.includes(state.form)) throw new RangeError("Unknown phrase order");
  if (mode !== "solo") addBacking(events, material, chords, { harmony: !["band","groove"].includes(state.world), rootOnly: detective });
  if (mode !== "backing") {
    for (let bar = 0; bar < bars; bar++) {
      if (state.world === "composition") addGrid(events, state["phrase" + state.form[bar]], bar);
      else if (state.world === "dialogue") {
        if (bar % 2 === 0 && mode !== "solo") addPhrase(events, material.call, bar);
        else if (bar % 2 === 1 && mode !== "call") addGrid(events, state.response, bar);
      } else if (detective) {
        if (!ANCHORS.includes(state.anchor)) throw new RangeError("Unknown anchor");
        for (const step of [3,11]) events.push({
          instrument: "guitar", step: bar * 16 + step, note: state.anchor, duration: 3, velocity: .62,
        });
      } else if (state.world === "missing") {
        if (bar % 2 === 0) {
          if (mode === "original") addPhrase(events, material.reference, bar);
          else addGrid(events, state.reconstruction, bar);
        }
      } else if (state.world === "expression") {
        addPhrase(events, material.reference, bar, mode === "plain" ? "natural" : state.feel);
      } else addGrid(events, state[currentGrid(state)], bar);
    }
  }
  events.sort((a, b) => a.step - b.step || a.instrument.localeCompare(b.instrument));
  return Object.freeze({ tempo: material.tempo, bars, labels: Object.freeze(labels), events: Object.freeze(events.map(Object.freeze)) });
}

export function worldReviewPrompts(state) {
  return WORLD_DEFINITIONS.find(x => x.id === state.world) ?? WORLD_DEFINITIONS[0];
}
