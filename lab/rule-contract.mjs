// MelodyGenerationRuleV1 contract and catalogue.
// Rules express what kind of musical relationship should be generated,
// not which exact notes, chords or frets to use.

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RULE_FAMILIES = ["dominant-third", "dominant-seventh", "target-trajectory"];

export const DIFFICULTY_LEVELS = ["introductory", "developing", "transfer"];

const key = (letter, accidental = 0) => ({ letter, accidental });

const KEY_POOLS = {
  introductory: [key("C"), key("G"), key("D"), key("A"), key("F")],
  developing: [key("C"), key("G"), key("D"), key("A"), key("E"), key("F"), key("B", -1)],
  transfer: [key("C"), key("G"), key("D"), key("A"), key("E"), key("B"), key("F"), key("B", -1), key("E", -1)],
};

const REGION_POOLS = {
  introductory: [
    { strings: [4, 5], minFret: 0, maxFret: 8 },
    { strings: [4, 5], minFret: 2, maxFret: 9 },
  ],
  developing: [
    { strings: [4, 5], minFret: 0, maxFret: 8 },
    { strings: [4, 5], minFret: 4, maxFret: 11 },
    { strings: [3, 4, 5], minFret: 5, maxFret: 12 },
    { strings: [4, 5], minFret: 7, maxFret: 14 },
  ],
  transfer: [
    { strings: [4, 5], minFret: 4, maxFret: 11 },
    { strings: [3, 4, 5], minFret: 5, maxFret: 12 },
    { strings: [4, 5], minFret: 7, maxFret: 14 },
    { strings: [2, 3, 4], minFret: 2, maxFret: 10 },
  ],
};

const rules = [
  {
    version: 1,
    id: "rule-dominant-third",
    family: "dominant-third",
    title: "Dominant 3rd Targeting",
    description: "Locate and target the 3rd of the arriving dominant chord; hear it resolve to the root.",
    progressionTemplates: [
      { name: "ii7–V7–Imaj7", degrees: [2, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
      { name: "IVmaj7–V7–Imaj7", degrees: [4, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
    ],
    targetRole: { targetDegree: 3, arrivalDegree: 1 },
    keyPools: KEY_POOLS,
    regionPools: REGION_POOLS,
  },
  {
    version: 1,
    id: "rule-dominant-seventh",
    family: "dominant-seventh",
    title: "Dominant ♭7 Targeting",
    description: "Target the minor 7th of the dominant seventh chord and hear it resolve downward to the 3rd.",
    progressionTemplates: [
      { name: "ii7–V7–Imaj7", degrees: [2, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
      { name: "IVmaj7–V7–Imaj7", degrees: [4, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
    ],
    targetRole: { targetDegree: 7, arrivalDegree: 3 },
    keyPools: KEY_POOLS,
    regionPools: REGION_POOLS,
  },
  {
    version: 1,
    id: "rule-target-trajectory",
    family: "target-trajectory",
    title: "Chord-Change Target Trajectory",
    description: "Move deliberately between key chord tones as the harmony changes.",
    progressionTemplates: [
      { name: "ii7–V7–Imaj7", degrees: [2, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
      { name: "I–V–vi–IV", degrees: [1, 5, 6, 4], chordSize: "triad", targetChordIndex: 1, arrivalChordIndex: 2 },
      { name: "IVmaj7–V7–Imaj7", degrees: [4, 5, 1], chordSize: "seventh", targetChordIndex: 1, arrivalChordIndex: 2 },
    ],
    targetPairs: [
      { targetDegree: 3, arrivalDegree: 1 },
      { targetDegree: 3, arrivalDegree: 3 },
      { targetDegree: 7, arrivalDegree: 3 },
      { targetDegree: 5, arrivalDegree: 1 },
    ],
    keyPools: KEY_POOLS,
    regionPools: REGION_POOLS,
  },
];

freeze(rules);

export function getMelodyRules() {
  return rules;
}

export function getMelodyRuleById(id) {
  return rules.find((rule) => rule.id === id);
}

export function getMelodyRuleByFamily(family) {
  return rules.find((rule) => rule.family === family);
}
