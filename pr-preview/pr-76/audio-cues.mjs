import { registerChord } from "./audio-out.mjs?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";

export const DEFAULT_AUDIO_BPM = 84;
const CHORD_LEVEL = 0.12;
const NOTE_LEVEL = 0.15;

function validatedBpm(bpm) {
  if (typeof bpm !== "number" || !Number.isFinite(bpm) || bpm < 40 || bpm > 220) {
    throw new RangeError("bpm must be between 40 and 220");
  }
  return bpm;
}

export function beatsToSeconds(beats, bpm = DEFAULT_AUDIO_BPM) {
  if (typeof beats !== "number" || !Number.isFinite(beats) || beats <= 0) {
    throw new RangeError("beats must be greater than zero");
  }
  return beats * (60 / validatedBpm(bpm));
}

function chordPitches(chordRef, transposePitch) {
  return registerChord(chordRef.entry.chord, 3, transposePitch);
}

export function singlePitchCue(pitch, { bpm = DEFAULT_AUDIO_BPM, beats = 0.8 } = {}) {
  return Object.freeze([
    Object.freeze({
      at: 0,
      duration: beatsToSeconds(beats, bpm),
      pitches: Object.freeze([pitch]),
      level: NOTE_LEVEL,
      gesture: "pluck",
    }),
  ]);
}

export function harmonicGravityPromptCue(context, transposePitch, { bpm = DEFAULT_AUDIO_BPM } = {}) {
  const chordDuration = beatsToSeconds(1.5, bpm);
  const secondChordAt = beatsToSeconds(2, bpm);
  return Object.freeze([
    Object.freeze({
      at: 0,
      duration: chordDuration,
      pitches: chordPitches(context.chords.home, transposePitch),
      level: CHORD_LEVEL,
      gesture: "strum",
      direction: "down",
    }),
    Object.freeze({
      at: secondChordAt,
      duration: chordDuration,
      pitches: chordPitches(context.chords.pressure, transposePitch),
      level: CHORD_LEVEL,
      gesture: "strum",
      direction: "down",
    }),
  ]);
}

export function roleLensComparisonCue(context, transposePitch, { bpm = DEFAULT_AUDIO_BPM } = {}) {
  const events = [];
  const comparisonSpacing = beatsToSeconds(3, bpm);
  const chordDuration = beatsToSeconds(1.4, bpm);
  const anchorAt = beatsToSeconds(1.65, bpm);
  const anchorDuration = beatsToSeconds(0.8, bpm);

  context.chords.forEach((chord, index) => {
    const offset = index * comparisonSpacing;
    events.push(Object.freeze({
      at: offset,
      duration: chordDuration,
      pitches: registerChord(chord.entry.chord, 3, transposePitch),
      level: CHORD_LEVEL,
      gesture: "strum",
      direction: "down",
    }));
    events.push(Object.freeze({
      at: offset + anchorAt,
      duration: anchorDuration,
      pitches: Object.freeze([context.anchor.pitch]),
      level: NOTE_LEVEL,
      gesture: "pluck",
    }));
  });
  return Object.freeze(events);
}
