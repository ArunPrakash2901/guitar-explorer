import { formatPitch, getNoteAt, pitchFromSemitone, STANDARD_FRETBOARD } from "./engine/index.js";
import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs";
import { PROGRESSION_STEEL_SAMPLES } from "./progression-guitar-manifest.mjs";

const files = new Map([
  ...STEEL_SAMPLES.map((sample) => ({ ...sample, layer: 2 })),
  ...PROGRESSION_STEEL_SAMPLES,
].map((sample) => [sample.file, sample]));

export const RECORDED_GUITAR_ATTACKS = Object.freeze([...files.values()].map((sample) => {
  const { semitone } = getNoteAt(STANDARD_FRETBOARD, sample);
  return Object.freeze({ ...sample, note: formatPitch(pitchFromSemitone(semitone)), semitone });
}));

const strings = Array.from({ length: 6 }, (_, stringIndex) =>
  RECORDED_GUITAR_ATTACKS.filter((sample) => sample.stringIndex === stringIndex));

export function selectGuitarAttack(note, velocity = 80) {
  if (!note || !Number.isInteger(note.semitone) || note.semitone < 0 || note.semitone > 127 ||
      !Number.isInteger(note.stringIndex) || note.stringIndex < 0 || note.stringIndex > 5) {
    throw new TypeError("A guitar attack needs a sounded semitone and string index");
  }
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) throw new RangeError("Velocity must be from 1 to 127");
  const open = getNoteAt(STANDARD_FRETBOARD, { stringIndex: note.stringIndex, fret: 0 }).semitone;
  const fret = note.semitone - open;
  if (fret < 0 || fret > STANDARD_FRETBOARD.maxFret) throw new RangeError("Note lies outside its guitar string");
  const layer = velocity <= 48 ? 1 : velocity <= 96 ? 2 : 3;
  let best;
  for (const sample of strings[note.stringIndex]) {
    if (sample.layer !== layer) continue;
    if (!best || Math.abs(sample.fret - fret) < Math.abs(best.fret - fret)) best = sample;
  }
  return Object.freeze({ sample: best, playbackRate: 2 ** ((fret - best.fret) / 12) });
}
