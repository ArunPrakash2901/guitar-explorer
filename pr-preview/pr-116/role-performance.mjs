// Curated placements from closed reference #56, not a voicing search/theory table.
const VOICINGS = Object.freeze({
  "G:major": Object.freeze([3, 2, 0, 0, 0, 3]),
  "C:major": Object.freeze([null, 3, 2, 0, 1, 0]),
  "D:dominant7": Object.freeze([null, null, 0, 2, 1, 2]),
});
const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;
const unwrap = (result) => {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export function prepareRolePerformance(material, { queries, availablePositions }) {
  const coverage = new Set(availablePositions.map(key));
  const requireSample = (position) => {
    if (!coverage.has(key(position))) throw new RangeError("Recorded guitar coverage is missing for " + key(position));
  };
  requireSample(material.anchor.position);
  const contexts = material.contexts.map((context) => {
    const frets = VOICINGS[context.id];
    if (!frets) throw new RangeError("No curated performance for " + context.id);
    const notes = frets.flatMap((fret, stringIndex) => {
      if (fret === null) return [];
      const position = { stringIndex, fret };
      requireSample(position);
      return [unwrap(queries.getNoteAtFret({ position, context: { currentChord: context.spec } }))];
    });
    const expected = new Set(context.chord.tones.map((tone) => tone.pitchClass));
    const actual = new Set(notes.map((note) => note.pitchClass));
    if (actual.size !== expected.size || notes.some((note) => !note.chordRelation?.isChordTone) || [...expected].some((pc) => !actual.has(pc))) {
      throw new Error("Curated guitar performance disagrees with Music Engine chord tones");
    }
    return Object.freeze({ positions: Object.freeze(notes.map((note) => note.position)), pitches: Object.freeze(notes.map((note) => note.pitch)) });
  });
  return Object.freeze({ contexts: Object.freeze(contexts) });
}

export function roleCue(material, performance, mode, contextIndex = 0) {
  const pluck = (at) => ({
    at, duration: 1.3, level: 0.65, gesture: "pluck", direction: "down", strumSpread: 0,
    pitches: [material.anchor.pitch], positions: [material.anchor.position],
  });
  const chord = (index, at, duration) => ({
    at, duration, level: 0.38, gesture: "strum", direction: "down", strumSpread: 0.065,
    ...performance.contexts[index],
  });
  if (mode === "anchor") return Object.freeze([pluck(0)]);
  if (mode === "context") {
    if (!Number.isInteger(contextIndex) || !performance.contexts[contextIndex]) throw new RangeError("Unknown comparison");
    return Object.freeze([chord(contextIndex, 0, 2.4), pluck(0.8)]);
  }
  if (mode === "comparisons") return Object.freeze(material.contexts.flatMap((_, i) => [chord(i, i * 4, 2.4), pluck(i * 4 + 0.8)]));
  if (mode === "backing") return Object.freeze(material.contexts.flatMap((_, i) => [chord(i, i * 4, 2), chord(i, i * 4 + 2, 1.6)]));
  throw new RangeError("Unknown Role audio cue");
}
