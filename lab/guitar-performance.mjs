import { buildAccompanimentCue } from "./accompaniment-plan.mjs";
import { registerChord } from "./audio-out.mjs";

// Low E → high E. null means the string is deliberately not played.
// These are curated physical placements for the *existing* G-C-D7-G proof,
// not a general voicing or fingering engine.
export const OPEN_POSITION_VOICINGS = Object.freeze({
  G: Object.freeze([3, 2, 0, 0, 0, 3]),
  C: Object.freeze([null, 3, 2, 0, 1, 0]),
  D7: Object.freeze([null, null, 0, 2, 1, 2]),
});

export function guitarVoicingPositions(symbol) {
  const frets = Object.hasOwn(OPEN_POSITION_VOICINGS, symbol)
    ? OPEN_POSITION_VOICINGS[symbol]
    : null;
  if (!frets) throw new RangeError(`No curated guitar voicing for ${symbol}`);
  return Object.freeze(frets.flatMap((fret, stringIndex) =>
    fret === null ? [] : [Object.freeze({ stringIndex, fret })]));
}

// Adapt an accepted accompaniment cue to *physical* string/fret placements.
// Timing and harmony still come from the existing plan and engine; this adapter
// does not choose chords, infer style, or change the sound source.
export function buildGuitarPerformanceCue(plan, {
  board,
  getNoteAt,
  pitchFromSemitone,
  toSemitone,
  transposePitch,
} = {}) {
  if (!board || typeof getNoteAt !== "function" || typeof pitchFromSemitone !== "function"
      || typeof toSemitone !== "function" || typeof transposePitch !== "function") {
    throw new TypeError("Guitar performance requires existing engine guitar/pitch operations");
  }

  const cue = buildAccompanimentCue(plan, transposePitch);
  const chordVoicings = plan.progression.map((chordRef) => {
    const positions = guitarVoicingPositions(chordRef.symbol);
    const located = positions.map((position) => getNoteAt(board, position));
    const actual = new Set(located.map((note) => note.pitchClass));
    const expected = new Set(registerChord(chordRef.entry.chord, 3, transposePitch)
      .map((pitch) => ((toSemitone(pitch) % 12) + 12) % 12));
    if (actual.size !== expected.size || [...actual].some((pitchClass) => !expected.has(pitchClass))) {
      throw new Error(`Guitar voicing for ${chordRef.symbol} does not match engine chord tones`);
    }
    return Object.freeze({
      positions,
      pitches: Object.freeze(located.map((note) => pitchFromSemitone(note.semitone))),
    });
  });

  return Object.freeze(cue.map((event) => {
    const voicing = chordVoicings[event.chordIndex];
    if (!voicing) throw new Error("Accompaniment cue refers to an unknown chord index");
    return Object.freeze({ ...event, pitches: voicing.pitches, positions: voicing.positions });
  }));
}
