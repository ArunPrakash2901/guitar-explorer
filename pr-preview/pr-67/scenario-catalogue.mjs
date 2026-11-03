// Approved ScenarioV1 data. Numbers here express degree, chord and guitar-region intent;
// pitches, chord identities and frets are never stored as answers.
const key = (letter) => ({ tonic: { letter, accidental: 0 }, mode: "major" });
const region = (strings, minFret, maxFret) => ({ strings, minFret, maxFret });
const target = (chordIndex, degree, stringIndex = 5) => ({ chordIndex, degree, stringIndex });
const cell = (chordIndex, lowerDegree, upperDegree, lowerString, upperString) =>
  ({ chordIndex, lowerDegree, upperDegree, lowerString, upperString });
const iiVI = [2, 5, 1];
const classicTargets = { target: target(1, 3), arrival: target(2, 1) };
const classicMotif = {
  source: cell(0, 1, 3, 3, 4), adaptation: cell(1, 1, 3, 4, 5),
  arrival: cell(2, 1, 3, 2, 3), sequence: { lowerScaleDegree: 3, upperScaleDegree: 5, lowerString: 3, upperString: 4 },
};

const scenarios = [
  { version: 1, type: "melody", id: "melody-g-ii-v-i", title: "Targets in G", description: "ii–V–I seventh chords; hear the dominant third resolve.", difficulty: "introductory",
    context: { key: key("G"), degrees: iiVI, chordSize: "seventh" }, transfer: { key: key("A") },
    fretboard: { main: region([4, 5], 0, 8), transfer: region([4, 5], 0, 8) },
    targets: classicTargets, melody: { approachScaleDegree: 6, phraseLead: [{ scaleDegree: 5, stringIndex: 4 }, { scaleDegree: 6, stringIndex: 5 }] } },
  { version: 1, type: "melody", id: "melody-c-ii-v-i", title: "Targets in C", description: "The same target relationship in a different register and key.", difficulty: "developing",
    context: { key: key("C"), degrees: iiVI, chordSize: "seventh" }, transfer: { key: key("D") },
    fretboard: { main: region([4, 5], 5, 10), transfer: region([4, 5], 7, 12) },
    targets: classicTargets, melody: { approachScaleDegree: 6, phraseLead: [{ scaleDegree: 5, stringIndex: 4 }, { scaleDegree: 6, stringIndex: 5 }] } },
  { version: 1, type: "melody", id: "melody-g-i-v-vi-iv", title: "Four-chord arrivals", description: "G–D–Em–C triads; target a third, then a new root.", difficulty: "developing",
    context: { key: key("G"), degrees: [1, 5, 6, 4], chordSize: "triad" }, transfer: { key: key("A") },
    fretboard: { main: region([4, 5], 0, 8), transfer: region([4, 5], 0, 8) },
    targets: classicTargets, melody: { approachScaleDegree: 6, phraseLead: [{ scaleDegree: 5, stringIndex: 4 }, { scaleDegree: 6, stringIndex: 5 }] } },
  { version: 1, type: "motif", id: "motif-a-c-a", title: "A small question", description: "A–C–A; keep its rise and return through ii–V–I.", difficulty: "introductory",
    context: { key: key("G"), degrees: iiVI, chordSize: "seventh" }, transfer: { key: key("A") },
    fretboard: { main: region([2, 3, 4, 5], 0, 10), transfer: region([2, 3, 4, 5], 0, 10) },
    targets: classicTargets, motif: classicMotif },
  { version: 1, type: "motif", id: "motif-third-fifth", title: "A wider question", description: "Begin on a chord third and rise to its fifth.", difficulty: "developing",
    context: { key: key("G"), degrees: iiVI, chordSize: "seventh" }, transfer: { key: key("A") },
    fretboard: { main: region([4, 5], 0, 12), transfer: region([4, 5], 2, 12) },
    targets: classicTargets,
    motif: { source: cell(0, 3, 5, 4, 5), adaptation: cell(1, 3, 5, 5, 5), arrival: cell(2, 3, 5, 5, 5),
      sequence: { lowerScaleDegree: 1, upperScaleDegree: 3, lowerString: 4, upperString: 5 } } },
  { version: 1, type: "motif", id: "motif-upper-region", title: "Upper-region answer", description: "Fmaj7–G7–Cmaj7; carry the cell to a higher guitar region.", difficulty: "transfer",
    context: { key: key("C"), degrees: [4, 5, 1], chordSize: "seventh" }, transfer: { key: key("D") },
    fretboard: { main: region([4, 5], 5, 12), transfer: region([4, 5], 5, 15) },
    targets: classicTargets,
    motif: { source: cell(0, 1, 3, 4, 5), adaptation: cell(1, 1, 3, 4, 5), arrival: cell(2, 1, 3, 5, 5),
      sequence: { lowerScaleDegree: 5, upperScaleDegree: 7, lowerString: 4, upperString: 5 } } },
];

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
freeze(scenarios);
export function getMelodyScenarios() { return scenarios.filter(({ type }) => type === "melody"); }
export function getMotifScenarios() { return scenarios.filter(({ type }) => type === "motif"); }
export function getScenarioById(id) { return scenarios.find((scenario) => scenario.id === id); }
