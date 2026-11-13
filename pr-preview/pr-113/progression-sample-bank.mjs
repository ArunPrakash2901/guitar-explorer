import { formatPitch, getNoteAt, pitchFromSemitone, STANDARD_FRETBOARD } from "./engine/index.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { ELECTRIC_GUITAR_ATTACKS } from "./progression-electric-manifest.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { PROGRESSION_STEEL_SAMPLES } from "./progression-guitar-manifest.mjs?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";

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

export function selectGuitarAttack(note, velocity = 80, instrument = "steel") {
  if (!note || !Number.isInteger(note.semitone) || note.semitone < 0 || note.semitone > 127 ||
      !Number.isInteger(note.stringIndex) || note.stringIndex < 0 || note.stringIndex > 5) {
    throw new TypeError("A guitar attack needs a sounded semitone and string index");
  }
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) throw new RangeError("Velocity must be from 1 to 127");
  const open = getNoteAt(STANDARD_FRETBOARD, { stringIndex: note.stringIndex, fret: 0 }).semitone;
  const fret = note.semitone - open;
  if (fret < 0 || fret > STANDARD_FRETBOARD.maxFret) throw new RangeError("Note lies outside its guitar string");
  if (!["steel", "electric"].includes(instrument)) throw new RangeError("Choose a recorded guitar");
  const layer = velocity <= 48 ? 1 : velocity <= 96 ? 2 : 3;
  const candidates = instrument === "steel"
    ? strings[note.stringIndex].filter((sample) => sample.layer === layer)
    : ELECTRIC_GUITAR_ATTACKS;
  let best = candidates[0];
  for (const sample of candidates) {
    if (Math.abs(sample.semitone - note.semitone) < Math.abs(best.semitone - note.semitone)) best = sample;
  }
  return Object.freeze({ sample: best, playbackRate: 2 ** ((note.semitone - best.semitone) / 12) });
}

/** Match the initial energy within a recorded layer and retain the pick transient. */
export function guitarAttackProfile(buffer, layer = 2) {
  const rate = buffer.sampleRate;
  if (!Number.isFinite(rate) || rate < 1000 || !buffer.numberOfChannels || !buffer.getChannelData) {
    return { offset: 0, gain: 1 };
  }
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const frames = Math.min(channels[0].length, Math.floor(rate * .19));
  const blockSize = Math.round(rate * .003);
  if (frames < blockSize * 4) return { offset: 0, gain: 1 };
  const blocks = [];
  for (let start = 0; start + blockSize <= frames; start += blockSize) {
    let sum = 0;
    for (const channel of channels) {
      for (let frame = start; frame < start + blockSize; frame++) sum += channel[frame] ** 2;
    }
    blocks.push(sum / (blockSize * channels.length));
  }
  const peak = Math.max(...blocks);
  if (peak < 1e-7) return { offset: 0, gain: 1 };
  const threshold = peak * .008;
  const first = blocks.findIndex((power, index) => power >= threshold && (blocks[index + 1] ?? 0) >= threshold);
  const start = Math.max(0, first - 1);
  const onset = Math.min(.028, start * blockSize / rate);
  const attack = blocks.slice(Math.floor(onset * rate / blockSize));
  const rms = Math.sqrt(attack.reduce((sum, power) => sum + power, 0) / attack.length);
  const target = { 1: .065, 2: .102, 3: .151 }[layer] ?? .102;
  const gain = Math.min(1.33, Math.max(.71, target / rms));
  return { offset: onset, gain };
}
