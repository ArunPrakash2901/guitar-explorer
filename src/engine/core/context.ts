import { assertInteger, assertRecord, MusicError } from "./errors.js";
import { buildChord, buildScale } from "./collections.js";
import { intervalBetweenNotes } from "./intervals.js";
import { validateKey } from "./keys.js";
import { formatPitch, NATURAL_PITCH_CLASSES, pitchClass, pitchFromSemitone, toSemitone, validateNote, validatePitch } from "./pitch.js";
import type { ChordId, ChordSpec, HarmonicContext, IntervalInfo, NoteName, Pitch, PitchClass, ScaleId, ScaleSpec, SpellingPreference, Tone } from "./types.js";

export type KeyRelation = Readonly<{
  tonic: NoteName;
  mode: "major" | "minor";
  degree: number;
  alterationFromKey: number;
  inKey: boolean;
  spellingMatches: boolean;
  interval: IntervalInfo;
}>;

export type ScaleRelation = Readonly<{
  tonic: NoteName;
  scaleId: ScaleId;
  degree: number;
  alterationFromScale: number;
  inScale: boolean;
  spellingMatches: boolean;
  interval: IntervalInfo;
}>;

export type ChordRelation = Readonly<{
  root: NoteName;
  chordId: ChordId;
  interval: IntervalInfo;
  isChordTone: boolean;
  spellingMatches: boolean;
  matchingTones: readonly Tone[];
}>;

export type NoteAnalysis = Readonly<{
  pitch: Pitch;
  name: string;
  semitone: number;
  pitchClass: PitchClass;
  keyRelation?: KeyRelation;
  scaleRelation?: ScaleRelation;
  chordRelation?: ChordRelation;
}>;

export type SpellingSource = "root" | "chord" | "scale" | "key" | "fallback";
export type SpelledPitch = Readonly<{
  pitch: Pitch;
  spellingSource: SpellingSource;
  alternativeSpellings: readonly NoteName[];
}>;

export function validateContext(value: unknown): asserts value is HarmonicContext {
  assertRecord(value, "context");
  if (value.key !== undefined) validateKey(value.key);
  if (value.activeScale !== undefined) buildScale(value.activeScale as ScaleSpec);
  if (value.currentChord !== undefined) buildChord(value.currentChord as ChordSpec);
}

function sameSpelling(a: NoteName, b: NoteName): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

/** Only domain fields leave the engine, even when JS callers supply extra data. */
function copyNote(note: NoteName): NoteName {
  return { letter: note.letter, accidental: note.accidental };
}

function degreeRelationship(tonic: NoteName, note: NoteName, tones: readonly Tone[]) {
  const interval = intervalBetweenNotes(tonic, note);
  const degree = interval.diatonicSteps + 1;
  const reference = tones.find((tone) => tone.degree === degree);
  if (!reference) throw new Error("Seven-note collection is missing a declared degree");
  const alteration = note.accidental - reference.note.accidental;
  assertInteger(alteration, "contextual alteration");
  return {
    degree,
    alteration,
    member: tones.some((tone) => tone.pitchClass === pitchClass(note)),
    spellingMatches: tones.some((tone) => sameSpelling(tone.note, note)),
    interval,
  };
}

/** Preserve the supplied spelling; membership compares sound, while degree uses letters. */
export function analysePitch(pitch: Pitch, context: HarmonicContext = {}): NoteAnalysis {
  validatePitch(pitch);
  validateContext(context);
  const pc = pitchClass(pitch.note);
  const key = context.key;
  const keyScale = key && buildScale({ tonic: key.tonic, scaleId: key.mode === "minor" ? "naturalMinor" : "major" });
  const scale = context.activeScale && buildScale(context.activeScale);
  const chord = context.currentChord && buildChord(context.currentChord);
  const keyDegree = keyScale && degreeRelationship(keyScale.tonic, pitch.note, keyScale.tones);
  const scaleDegree = scale && degreeRelationship(scale.tonic, pitch.note, scale.tones);
  const chordMatches = chord?.tones.filter((tone) => tone.pitchClass === pc);
  return {
    pitch: { note: copyNote(pitch.note), octave: pitch.octave },
    name: formatPitch(pitch),
    semitone: toSemitone(pitch),
    pitchClass: pc,
    ...(key && keyDegree ? { keyRelation: {
      tonic: copyNote(key.tonic), mode: key.mode,
      degree: keyDegree.degree, alterationFromKey: keyDegree.alteration,
      inKey: keyDegree.member, spellingMatches: keyDegree.spellingMatches, interval: keyDegree.interval,
    } } : {}),
    ...(scale && scaleDegree ? { scaleRelation: {
      tonic: copyNote(scale.tonic), scaleId: scale.scaleId,
      degree: scaleDegree.degree, alterationFromScale: scaleDegree.alteration,
      inScale: scaleDegree.member, spellingMatches: scaleDegree.spellingMatches, interval: scaleDegree.interval,
    } } : {}),
    ...(chord && chordMatches ? { chordRelation: {
      root: copyNote(chord.root), chordId: chord.chordId,
      interval: intervalBetweenNotes(chord.root, pitch.note),
      isChordTone: chordMatches.length > 0,
      spellingMatches: chordMatches.some((tone) => sameSpelling(tone.note, pitch.note)),
      matchingTones: chordMatches,
    } } : {}),
  };
}

/** Explicit matching root, then chord, selected scale, key, then display fallback. */
export function spellSemitone(
  semitone: number,
  context: HarmonicContext = {},
  preference: SpellingPreference = "sharps",
  root?: NoteName,
): SpelledPitch {
  assertInteger(semitone, "semitone");
  validateContext(context);
  if (preference !== "sharps" && preference !== "flats") {
    throw new MusicError("INVALID_INPUT", "Spelling preference must be sharps or flats");
  }
  if (root !== undefined) validateNote(root);
  const fallback = pitchFromSemitone(semitone, preference);
  const pc = pitchClass(fallback.note);
  const candidates: { note: NoteName; source: SpellingSource }[] = [];
  if (root && pitchClass(root) === pc) candidates.push({ note: root, source: "root" });
  if (context.currentChord) {
    for (const tone of buildChord(context.currentChord).tones) {
      if (tone.pitchClass === pc) candidates.push({ note: tone.note, source: "chord" });
    }
  }
  if (context.activeScale) {
    for (const tone of buildScale(context.activeScale).tones) {
      if (tone.pitchClass === pc) candidates.push({ note: tone.note, source: "scale" });
    }
  }
  if (context.key) {
    const scale = buildScale({ tonic: context.key.tonic, scaleId: context.key.mode === "minor" ? "naturalMinor" : "major" });
    for (const tone of scale.tones) {
      if (tone.pitchClass === pc) candidates.push({ note: tone.note, source: "key" });
    }
  }
  const unique = candidates.filter((candidate, i) => candidates.findIndex((other) => sameSpelling(other.note, candidate.note)) === i);
  const first = unique[0];
  if (!first) return { pitch: fallback, spellingSource: "fallback", alternativeSpellings: [] };
  const writtenBase = BigInt(NATURAL_PITCH_CLASSES[first.note.letter]) + BigInt(first.note.accidental);
  const octaveDistance = BigInt(semitone) - writtenBase;
  if (octaveDistance % 12n !== 0n) throw new Error("Contextual spelling does not match sounding pitch");
  const octave = Number(octaveDistance / 12n - 1n);
  assertInteger(octave, "contextually spelled octave");
  const pitch = { note: copyNote(first.note), octave };
  validatePitch(pitch);
  return {
    pitch,
    spellingSource: first.source,
    alternativeSpellings: unique.slice(1).map(({ note }) => copyNote(note)),
  };
}
