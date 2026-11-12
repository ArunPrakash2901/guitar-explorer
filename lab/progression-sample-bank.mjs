import { parsePitch, toSemitone } from "./engine/index.js";
import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs";

/**
 * Reuse Guitar Explorer's existing CC0 Meta Steel Guitar attacks; no audio
 * assets are copied from StrumForge. Use the original string when practical,
 * but allow a nearby string's sample to avoid extreme transposition.
 *
 * This small bank is an interim solution: pitch-shifting a limited set of
 * attacks cannot reproduce the articulation or realism of full multisampling.
 */
export const RECORDED_GUITAR_ATTACKS = Object.freeze(STEEL_SAMPLES.map((sample) => Object.freeze({
  ...sample,
  semitone: toSemitone(parsePitch(sample.note)),
})));

export function selectGuitarAttack(note) {
  if (!note || !Number.isInteger(note.semitone) || note.semitone < 0 || note.semitone > 127 ||
      !Number.isInteger(note.stringIndex) || note.stringIndex < 0 || note.stringIndex > 5) {
    throw new TypeError("A guitar attack needs a sounded semitone and string index");
  }
  const best = [...RECORDED_GUITAR_ATTACKS].sort((a, b) => {
    const penalty = (s) => Math.abs(s.semitone - note.semitone) +
      (s.stringIndex === note.stringIndex ? 0 : 2.3 + Math.abs(s.stringIndex - note.stringIndex) * 0.5);
    return penalty(a) - penalty(b);
  })[0];
  if (!best) throw new Error("No licensed guitar recordings are available");
  return Object.freeze({
    sample: best,
    playbackRate: 2 ** ((note.semitone - best.semitone) / 12),
    semitoneShift: note.semitone - best.semitone,
  });
}
