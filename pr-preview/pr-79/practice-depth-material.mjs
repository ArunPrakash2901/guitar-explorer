// Bounded task preparation. No DOM, renderer, sample manifest or theory arithmetic.
export const DEPTH_VERSION = 1;
export const DEPTH_REGION = Object.freeze({ minFret: 0, maxFret: 5 });
const STRINGS = Object.freeze([2, 3, 4, 5]);
const unwrap = (r) => { if (!r.ok) throw new Error(r.error.message); return r.data; };
const freeze = Object.freeze;
const key = (p) => p.stringIndex + ":" + p.fret;
const ROOTS = {
  major: [{ stringIndex: 3, fret: 0 }, { stringIndex: 4, fret: 1 }],
  minor: [{ stringIndex: 2, fret: 2 }, { stringIndex: 3, fret: 2 }],
};

function tools(queries, formatNote) {
  const catalogue = unwrap(queries.getChordCatalog({})).flatMap((g) => g.chords);
  const at = (position, context) => unwrap(queries.getNoteAtFret({ position, ...(context ? { context } : {}) }));
  const locations = (context) => unwrap(queries.getFretboardLocations({ fretRange: DEPTH_REGION, stringIndices: STRINGS, ...(context ? { context } : {}) }));
  const interval = (a, b) => unwrap(queries.getInterval({ from: a.pitch, to: b.pitch }));
  const chord = (spec) => {
    const fact = unwrap(queries.getChord(spec));
    const meta = catalogue.find((c) => c.id === fact.chordId);
    if (!meta) throw new Error("Missing chord catalogue entry");
    return freeze({ spec, chord: fact, id: formatNote(fact.root) + ":" + fact.chordId, symbol: formatNote(fact.root) + meta.symbol });
  };
  return { at, locations, interval, chord };
}

function thirdPair(t, quality, index) {
  const root = t.at(ROOTS[quality][index]);
  const context = t.chord({ root: root.pitch.note, chordId: quality });
  const third = context.chord.tones.find((tone) => tone.degree === 3);
  const choices = t.locations({ currentChord: context.spec });
  const targets = choices.filter((n) => n.pitchClass === third.pitchClass && t.interval(root, n).number === 3 && t.interval(root, n).direction === "ascending");
  if (targets.length < 2) throw new Error("A third needs two physical routes");
  return { root, context, choices, targets, interval: t.interval(root, targets[0]) };
}

const group = (locations, required = 1) => freeze({ locations: freeze(locations), required });
function material(fields) {
  const result = { region: DEPTH_REGION, ...fields };
  if (!result.groups.length || result.groups.some((g) => g.locations.length < g.required)) throw new Error("No complete physical answer set");
  return freeze({ ...result, groups: freeze(result.groups), choices: freeze(result.choices) });
}

export function composeIntervalDepth({ quality, seed, queries, formatNote }) {
  if (!["major", "minor"].includes(quality)) throw new RangeError("Choose a third quality");
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Depth seed must be a non-negative integer");
  const t = tools(queries, formatNote);
  const first = thirdPair(t, quality, seed % 2);
  const frettedOnly = Math.floor(seed / 2) % 2 === 1;
  const routes = material({
    kind: "routes", source: first.root, root: first.root, target: first.targets[0], interval: first.interval,
    context: first.context, frettedOnly,
    groups: [group(first.targets.filter((n) => !frettedOnly || n.position.fret > 0), frettedOnly ? 1 : 2)],
    choices: first.choices.filter((n) => !frettedOnly || n.position.fret > 0),
  });
  const roleRoot = t.at(quality === "major" ? { stringIndex: 2, fret: 0 } : { stringIndex: 3, fret: 2 });
  const context = t.chord({ root: roleRoot.pitch.note, chordId: quality === "major" ? "dominant7" : "minor7" });
  const requestedDegree = seed % 2 === 0 ? 5 : 7;
  const tone = context.chord.tones.find((n) => n.degree === requestedDegree);
  const roleChoices = t.locations({ currentChord: context.spec });
  const targets = roleChoices.filter((n) => n.chordRelation?.matchingTones.some((match) => match.degree === tone.degree)
    && t.interval(roleRoot, n).direction === "ascending" && t.interval(roleRoot, n).number <= 8);
  if (!targets.length) throw new Error("Missing role target");
  const role = material({
    kind: "chord-role", source: roleRoot, root: roleRoot, target: targets[0], context,
    role: tone.degree, interval: t.interval(roleRoot, targets[0]), choices: roleChoices, groups: [group(targets)],
  });
  const transfer = thirdPair(t, quality, 1 - seed % 2);
  const given = transfer.targets[Math.floor(seed / 4) % transfer.targets.length];
  const roots = transfer.choices.filter((n) => {
    const fact = t.interval(n, given);
    return fact.number === 3 && fact.quality === quality && fact.direction === "ascending";
  });
  const reverse = material({
    kind: "reverse", source: given, root: roots[0], target: given,
    context: transfer.context, interval: t.interval(roots[0], given), choices: transfer.choices, groups: [group(roots)],
  });
  return freeze({ family: "interval-hunt", challenge: "stretch", version: DEPTH_VERSION, quality, seed,
    rounds: freeze([{ purpose: "Find another route", material: routes }, { purpose: "Read a chord role", material: role }, { purpose: "Transfer · reverse the search", material: reverse }].map(freeze)),
  });
}

export function composeRoleDepth({ seed, queries, formatNote }) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Depth seed must be a non-negative integer");
  const t = tools(queries, formatNote);
  const contexts = [
    t.chord({ root: { letter: "G", accidental: 0 }, chordId: "major" }),
    t.chord({ root: { letter: "C", accidental: 0 }, chordId: "major" }),
    t.chord({ root: { letter: "D", accidental: 0 }, chordId: "dominant7" }),
  ];
  const anchorAt = (position) => {
    const note = t.at(position);
    const all = t.locations().filter((n) => n.semitone === note.semitone);
    const alternative = all.find((n) => key(n.position) !== key(note.position));
    return Math.floor(seed / 4) % 2 ? alternative ?? note : note;
  };
  const comparison = (anchor, context) => {
    const [analysis] = unwrap(queries.analyseNotes({ notes: [anchor.pitch], context: { currentChord: context.spec } }));
    return freeze({ anchor, context, relation: analysis.chordRelation });
  };
  const anchor = anchorAt([{ stringIndex: 4, fret: 1 }, { stringIndex: 3, fret: 0 }, { stringIndex: 4, fret: 0 }, { stringIndex: 5, fret: 2 }][seed % 4]);
  const facts = contexts.map((c) => comparison(anchor, c));
  const count = 2 + Math.floor(seed / 2) % 2;
  const contrasting = [facts.find((c) => c.relation.isChordTone), facts.find((c) => !c.relation.isChordTone)];
  if (contrasting.some((c) => !c)) throw new Error("Prediction needs contrasting facts");
  const selected = count === 3 ? facts : seed % 2 ? contrasting : [...contrasting].reverse();
  const prediction = material({ kind: "predict", anchors: freeze([anchor]), comparisons: freeze(selected),
    choices: t.locations(), groups: [group(t.locations().filter((n) => n.semitone === anchor.semitone))], named: true });
  const palette = seed % 3;
  const pair = (palette === 2
    ? [{ stringIndex: 5, fret: 0 }, { stringIndex: 5, fret: 2 }]
    : [{ stringIndex: 4, fret: 0 }, { stringIndex: 4, fret: 1 }]).map(anchorAt);
  const compare = (context) => material({
    kind: "compare", anchors: freeze(pair), comparisons: freeze(pair.map((n) => comparison(n, context))),
    named: seed % 2 === 0,
    choices: t.locations(), groups: pair.map((n) => group(t.locations().filter((other) => other.semitone === n.semitone))),
  });
  const first = compare(contexts[palette]);
  const transfer = compare(contexts[palette === 1 ? 0 : 1]);
  return freeze({ family: "role-ear", challenge: "stretch", version: DEPTH_VERSION, seed,
    rounds: freeze([{ purpose: "Predict, then hear", material: prediction }, { purpose: "One chord · two pitches", material: first }, { purpose: "Transfer · keep the pitches", material: transfer }].map(freeze)),
  });
}

export const depthPositionKey = key;
