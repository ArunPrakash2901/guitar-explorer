import { registerChord } from "./audio-out.mjs";

const CHORD_LEVEL = 0.105;
const NOTE_LEVEL = 0.13;

function chordPitches(chordRef, transposePitch) {
  return registerChord(chordRef.entry.chord, 3, transposePitch);
}

export function harmonicGravityPromptCue(context, transposePitch) {
  return Object.freeze([
    Object.freeze({
      at: 0,
      duration: 0.78,
      pitches: chordPitches(context.chords.home, transposePitch),
      level: CHORD_LEVEL,
    }),
    Object.freeze({
      at: 1.03,
      duration: 0.78,
      pitches: chordPitches(context.chords.pressure, transposePitch),
      level: CHORD_LEVEL,
    }),
  ]);
}

export function roleLensComparisonCue(context, transposePitch) {
  const events = [];
  context.chords.forEach((chord, index) => {
    const offset = index * 1.55;
    events.push(Object.freeze({
      at: offset,
      duration: 0.68,
      pitches: registerChord(chord.entry.chord, 3, transposePitch),
      level: CHORD_LEVEL,
    }));
    events.push(Object.freeze({
      at: offset + 0.78,
      duration: 0.46,
      pitches: Object.freeze([context.anchor.pitch]),
      level: NOTE_LEVEL,
    }));
  });
  return Object.freeze(events);
}
