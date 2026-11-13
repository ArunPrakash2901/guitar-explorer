// Supplied harmony is pedagogy/material. The engine supplies every musical fact.
// Audio coverage is deliberately absent from this module.
export const ROLE_MATERIAL_VERSION = 1;
export const ROLE_REGION = Object.freeze({ minFret: 0, maxFret: 2 });
const CHORD_REQUESTS = [
  { root: { letter: "G", accidental: 0 }, chordId: "major" },
  { root: { letter: "C", accidental: 0 }, chordId: "major" },
  { root: { letter: "D", accidental: 0 }, chordId: "dominant7" },
];
const unwrap = (result) => {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export function roleMaterials({ queries, formatNote }) {
  const catalog = unwrap(queries.getChordCatalog({})).flatMap((group) => group.chords);
  const chords = CHORD_REQUESTS.map((spec) => {
    const chord = unwrap(queries.getChord(spec));
    const metadata = catalog.find((entry) => entry.id === chord.chordId);
    if (!metadata) throw new Error("Missing chord catalogue metadata");
    return Object.freeze({
      id: formatNote(chord.root) + ":" + chord.chordId, spec, chord,
      symbol: formatNote(chord.root) + metadata.symbol,
      noteNames: Object.freeze(chord.tones.map((tone) => formatNote(tone.note))),
    });
  });
  const choices = unwrap(queries.getFretboardLocations({ fretRange: ROLE_REGION, stringIndices: [2, 3, 4] }));
  const materials = choices.flatMap((anchor) => {
    const contexts = chords.map((context) => {
      const [analysis] = unwrap(queries.analyseNotes({ notes: [anchor.pitch], context: { currentChord: context.spec } }));
      if (!analysis?.chordRelation) throw new Error("Missing engine chord relation");
      return Object.freeze({ ...context, relation: analysis.chordRelation });
    });
    const members = contexts.filter((context) => context.relation.isChordTone).length;
    // Contrast is selected from query results, never a hand-authored role table.
    if (members < 2 || members === contexts.length || new Set(contexts.map((context) => context.relation.interval.label)).size < 3) return [];
    return [Object.freeze({
      id: "roles:" + anchor.name, anchor, contexts: Object.freeze(contexts), region: ROLE_REGION,
      choices: Object.freeze(choices),
      locations: Object.freeze(choices.filter((note) => note.semitone === anchor.semitone)),
    })];
  });
  // Prefer a fretted anchor for the first fixed-finger comparison.
  return Object.freeze(materials.sort((a, b) => b.anchor.position.fret - a.anchor.position.fret || b.anchor.semitone - a.anchor.semitone));
}

export function composeRoleSession({ seed, queries, formatNote }) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Role seed must be a non-negative safe integer");
  const materials = roleMaterials({ queries, formatNote });
  if (materials.length < 2) throw new RangeError("Not enough contrasting role materials");
  const first = materials[seed % materials.length];
  const transfers = materials.filter((material) => material.anchor.pitchClass !== first.anchor.pitchClass);
  if (!transfers.length) throw new RangeError("Role transfer needs a different anchor");
  const transfer = transfers[Math.floor(seed / materials.length) % transfers.length];
  const ordered = (material, shift) => Object.freeze({
    ...material, contexts: Object.freeze([...material.contexts.slice(shift), ...material.contexts.slice(0, shift)]),
  });
  return Object.freeze({
    family: "role-ear", version: ROLE_MATERIAL_VERSION, seed,
    rounds: Object.freeze([
      Object.freeze({ purpose: "Hear & use", material: ordered(first, seed % 3) }),
      Object.freeze({ purpose: "Transfer", material: ordered(transfer, (seed + 1) % 3) }),
    ]),
  });
}
