import { buildChord, buildScale, CHORD_FORMULAS } from "../engine/core/collections.js";
import { MusicError } from "../engine/core/errors.js";
import { buildDiatonicHarmony } from "../engine/core/harmony.js";
import { formatNote, validateNote } from "../engine/core/pitch.js";
import type { Chord, ChordId, NoteName } from "../engine/core/types.js";

/**
 * A deliberately bounded progression consumer. The Music Core remains the only
 * authority for spelled scales, chords and major/natural-minor harmonization.
 * This module selects musical material; it never changes core musical truth.
 */
export type ProgressionMode = "major" | "naturalMinor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "locrian";

export type LockedChordSlot = Readonly<{
  slotIndex: number;
  root: NoteName;
  chordId: ChordId;
}>;

export type ProgressionRequest = Readonly<{
  tonic: NoteName;
  mode: ProgressionMode;
  seed: number;
  lockedSlots?: readonly LockedChordSlot[];
  length?: number;
  style?: ProgressionStyle;
  mood?: ProgressionMood;
  allowedDegrees?: readonly number[]; // 1–7, e.g. from a playable shape filter
  previousDegrees?: readonly number[];
  color?: ProgressionColor;
  isChordPlayable?: (chord: Chord) => boolean;
}>;

export type ProgressionSlot = Readonly<{
  slotIndex: number;
  degree: number;
  chord: Chord;
  symbol: string;
  romanNumeral: string;
  isLocked: boolean;
}>;

export type GeneratedProgression = Readonly<{
  tonic: NoteName;
  mode: ProgressionMode;
  seed: number;
  selection: "template" | "constrained";
  slots: readonly ProgressionSlot[];
}>;

export type ProgressionResult =
  | Readonly<{ ok: true; data: GeneratedProgression }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: "INVALID_INPUT" | "UNSUPPORTED_MODE" | "LOCK_OUT_OF_MODE" | "NO_PLAYABLE_CHORDS";
        message: string;
      }>;
    }>;

type DegreeChord = Readonly<{ chord: Chord; romanNumeral: string }>;
const TRIAD_IDS = ["major", "minor", "diminished", "augmented"] as const;
const MODAL_NUMERALS = {
  dorian: ["i", "ii", "♭III", "IV", "v", "vi°", "♭VII"],
  phrygian: ["i", "♭II", "♭III", "iv", "v°", "♭VI", "♭vii"],
  lydian: ["I", "II", "iii", "♯iv°", "V", "vi", "vii"],
  mixolydian: ["I", "ii", "iii°", "IV", "v", "vi", "♭VII"],
  locrian: ["i°", "♭II", "♭iii", "iv", "♭V", "♭VI", "♭vii"],
} as const;
type HarmonizedModalMode = keyof typeof MODAL_NUMERALS;

const TEMPLATES: Readonly<Record<ProgressionMode, readonly (readonly number[])[]>> = {
  major: [
    [0, 4, 5, 3], // I - V - vi - IV
    [0, 5, 3, 4], // I - vi - IV - V
    [0, 3, 4, 0], // I - IV - V - I
    [0, 4, 3, 0], // I - V - IV - I
  ],
  naturalMinor: [
    [0, 5, 2, 6], // i - VI - III - VII
    [0, 3, 4, 0], // i - iv - v - i
    [0, 5, 3, 4], // i - VI - iv - v
    [0, 6, 5, 6], // i - VII - VI - VII
  ],
  mixolydian: [
    [0, 4, 3, 0], // I - v - IV - I
    [0, 6, 3, 0], // I - ♭VII - IV - I
    [0, 3, 6, 0], // I - IV - ♭VII - I
    [0, 4, 6, 3], // I - v - ♭VII - IV
  ],
  dorian: [
    [0, 3, 6, 0], // i - IV - ♭VII - i
    [0, 1, 3, 0], // i - ii - IV - i
    [0, 4, 3, 0], // i - v - IV - i
    [0, 6, 3, 0], // i - ♭VII - IV - i
  ],
  phrygian: [
    [0, 1, 5, 0], // i - ♭II - ♭VI - i
    [0, 3, 1, 0], // i - iv - ♭II - i
    [0, 5, 1, 0], // i - ♭VI - ♭II - i
    [0, 2, 1, 0], // i - ♭III - ♭II - i
  ],
  locrian: [[0, 1, 3, 0], [0, 4, 1, 0], [0, 5, 4, 1]],
  lydian: [
    [0, 1, 4, 0], // I - II - V - I
    [0, 4, 1, 0], // I - V - II - I
    [0, 1, 0, 4], // I - II - I - V
    [0, 1, 2, 0], // I - II - iii - I
  ],
};

function sameNote(left: NoteName, right: NoteName): boolean {
  return left.letter === right.letter && left.accidental === right.accidental;
}

function error(code: Extract<ProgressionResult, { ok: false }>["error"]["code"], message: string): ProgressionResult {
  return Object.freeze({ ok: false, error: Object.freeze({ code, message }) });
}

export const CHORD_SUFFIXES: Readonly<Partial<Record<ChordId, string>>> = Object.freeze({
  major: "", minor: "m", diminished: "dim", augmented: "aug",
  major7: "maj7", dominant7: "7", minor7: "m7", halfDiminished7: "m7♭5",
  sus2: "sus2", sus4: "sus4", add9: "add9",
});

function chordSymbol(chord: Chord): string {
  return formatNote(chord.root) + (CHORD_SUFFIXES[chord.chordId] ?? "");
}

/**
 * Modes do not currently have a general getDiatonicHarmony query. Derive the
 * seven triads by stacking written scale thirds, then ask Core to identify each
 * triad. No pitch, interval or chord formula is reimplemented here.
 */
function modalTriads(tonic: NoteName, mode: HarmonizedModalMode): readonly DegreeChord[] {
  const scale = buildScale({ tonic, scaleId: mode });
  return scale.tones.map((tone, degree) => {
    const target = [0, 2, 4].map((offset) => scale.tones[(degree + offset) % 7]!.note);
    const matches = TRIAD_IDS.map((chordId) => buildChord({ root: tone.note, chordId }))
      .filter((chord) => chord.tones.every((note, index) => sameNote(note.note, target[index]!)));
    if (matches.length !== 1) throw new Error("Modal triad must match exactly one existing Core chord");
    return Object.freeze({ chord: matches[0]!, romanNumeral: MODAL_NUMERALS[mode][degree]! });
  });
}

function harmony(tonic: NoteName, mode: ProgressionMode): readonly DegreeChord[] {
  if (mode !== "major" && mode !== "naturalMinor") return modalTriads(tonic, mode);
  const result = buildDiatonicHarmony({
    key: { tonic, mode: mode === "major" ? "major" : "minor" },
    chordSize: "triad",
  });
  return result.degrees.map(({ chord, romanNumeral }) =>
    Object.freeze({ chord, romanNumeral: romanNumeral.label }));
}

export type ProgressionChordChoice = Pick<ProgressionSlot, "degree" | "chord" | "symbol" | "romanNumeral">;

/**
 * The same seven engine-derived chords used during generation, exposed for
 * explicit user substitution. No parallel chord table or theory is introduced.
 */
export function listProgressionChoices(tonic: NoteName, mode: ProgressionMode): readonly ProgressionChordChoice[] {
  if (!Object.hasOwn(TEMPLATES, mode)) {
    throw new MusicError("UNSUPPORTED", "Unsupported progression mode");
  }
  return Object.freeze(harmony(tonic, mode).map((item, index) => Object.freeze({
    degree: index + 1,
    chord: item.chord,
    symbol: chordSymbol(item.chord),
    romanNumeral: item.romanNumeral,
  })));
}

export const PROGRESSION_COLORS = ["triads", "sevenths", "suspended", "add9"] as const;
export type ProgressionColor = (typeof PROGRESSION_COLORS)[number];

const COLOR_QUALITIES = {
  triads: [],
  sevenths: ["major7", "dominant7", "minor7", "halfDiminished7"],
  suspended: ["sus4", "sus2"],
  add9: ["add9"],
} as const satisfies Record<ProgressionColor, readonly ChordId[]>;

function colorChoices(choices: readonly ProgressionChordChoice[], tonic: NoteName, mode: ProgressionMode) {
  const scale = buildScale({ tonic, scaleId: mode });
  return choices.flatMap((base) => {
    const qualities = [...COLOR_QUALITIES.sevenths, ...COLOR_QUALITIES.suspended, ...COLOR_QUALITIES.add9];
    return qualities.flatMap((chordId): ProgressionChordChoice[] => {
      const chord = buildChord({ root: base.chord.root, chordId });
      const preservesTriad = base.chord.tones.every((tone) => chord.tones.some((note) => sameNote(note.note, tone.note)));
      const isSuspension = chordId === "sus2" || chordId === "sus4";
      if ((!isSuspension && !preservesTriad) ||
        !chord.tones.every((tone) => scale.tones.some((note) => sameNote(note.note, tone.note)))) return [];
      const suffix = chordId === "halfDiminished7" ? "ø7" : chordId === "major7" ? "maj7"
        : chordId === "minor7" || chordId === "dominant7" ? "7" : chordId;
      const numeral = isSuspension ? base.romanNumeral.toUpperCase() : base.romanNumeral;
      return [Object.freeze({ degree: base.degree, chord, symbol: chordSymbol(chord),
        romanNumeral: numeral.replace("°", "") + suffix })];
    });
  });
}

export function listProgressionVariants(tonic: NoteName, mode: ProgressionMode): readonly ProgressionChordChoice[] {
  const triads = listProgressionChoices(tonic, mode);
  return Object.freeze([...triads, ...colorChoices(triads, tonic, mode)]);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function matchesLocks(path: readonly number[], locks: ReadonlyMap<number, number>): boolean {
  return [...locks].every(([slot, degree]) => path[slot] === degree);
}

function constrainedPaths(
  locks: ReadonlyMap<number, number>,
  degrees: readonly DegreeChord[],
  templates: readonly (readonly number[])[],
): readonly (readonly number[])[] {
  // Retain common tones and prefer transitions already used in this mode's templates.
  // This scores chord relationships without making claims about actual guitar voices.
  const transitions = degrees.map(({ chord }, from) => degrees.map(({ chord: next }, to) => {
    if (from === to) return -2;
    const commonTones = chord.tones.filter((tone) =>
      next.tones.some((other) => other.pitchClass === tone.pitchClass)).length;
    const inTemplate = templates.some((path) => path.some((degree, i) => degree === from && path[i + 1] === to));
    return commonTones + Number(inTemplate);
  }));

  const options = Array.from({ length: 4 }, (_, slot) => {
    const locked = locks.get(slot);
    return locked === undefined ? degrees.map((_, degree) => degree) : [locked];
  });
  const best: number[][] = [];
  let fewestAlteredTriads = Infinity;
  let bestScore = -Infinity;
  for (const a of options[0]!) {
    for (const b of options[1]!) {
      for (const c of options[2]!) {
        for (const d of options[3]!) {
          const path = [a, b, c, d];
          const alteredTriads = path.filter((degree) => {
            const { chordId } = degrees[degree]!.chord;
            return chordId === "diminished" || chordId === "augmented";
          }).length;
          // A locked diminished or augmented chord counts equally in every candidate.
          // Prefer fewer such chords in the unlocked slots before comparing transitions.
          if (alteredTriads > fewestAlteredTriads) continue;
          const score = (a === 0 ? 4 : 0) + (d === 0 ? 2 : 0) + new Set(path).size
            + transitions[a]![b]! + transitions[b]![c]! + transitions[c]![d]!;
          if (alteredTriads < fewestAlteredTriads || score > bestScore) {
            fewestAlteredTriads = alteredTriads;
            bestScore = score;
            best.length = 0;
          }
          if (score === bestScore) best.push(path);
        }
      }
    }
  }
  // The search is bounded by 7^4, with every best-scoring tie eligible for seeded selection.
  return best;
}

export const STYLES = ["auto", "pop", "rock", "blues", "folk", "indie", "jazz"] as const;
export const MOODS = ["any", "bright", "melancholic", "relaxed", "tense"] as const;
export type ProgressionStyle = (typeof STYLES)[number];
export type ProgressionMood = (typeof MOODS)[number];

type Profile = Readonly<{
  motifs: readonly (readonly number[])[];
  cadence: readonly (readonly [number, number])[];
}>;

// Zero-based degrees. These are preferences inside the chosen mode, so for
// example Blues in Aeolian keeps the modal v instead of raising a leading tone.
const PROFILES: Readonly<Record<ProgressionStyle, Profile>> = {
  auto: { motifs: [], cadence: [] },
  pop: { motifs: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4]], cadence: [[4, 5], [5, 3], [3, 0]] },
  rock: { motifs: [[0, 6, 3, 0], [0, 3, 0, 4], [0, 4, 3, 0]], cadence: [[6, 3], [4, 3], [3, 0]] },
  blues: { motifs: [[0, 0, 3, 0], [3, 3, 0, 4], [0, 0, 3, 0, 4, 3, 0, 4]], cadence: [[0, 0], [3, 0], [4, 3]] },
  folk: { motifs: [[0, 3, 0, 4], [0, 3, 5, 0], [0, 3, 4, 0]], cadence: [[0, 3], [3, 0], [4, 0]] },
  indie: { motifs: [[5, 2, 3, 0], [0, 2, 5, 3], [0, 6, 2, 3]], cadence: [[0, 2], [2, 5], [5, 3]] },
  jazz: { motifs: [[1, 4, 0, 5], [0, 5, 1, 4], [2, 5, 1, 4]], cadence: [[5, 1], [1, 4], [4, 0]] },
};

const MODAL_COLOR: Partial<Record<ProgressionMode, number>> = {
  dorian: 3, phrygian: 1, lydian: 1, mixolydian: 6, locrian: 1,
};

type PathOptions = Readonly<{
  length: number;
  style: ProgressionStyle;
  mood: ProgressionMood;
  mode: ProgressionMode;
  allowed: readonly number[];
  previous?: readonly number[];
}>;

function hybridPath(
  locks: ReadonlyMap<number, number>,
  degrees: readonly DegreeChord[],
  templates: readonly (readonly number[])[],
  options: PathOptions,
  random: () => number,
): number[] {
  const { length, style, mood, mode, allowed, previous } = options;
  const profile = PROFILES[style];
  const pickDegree = () => allowed[Math.floor(random() * allowed.length)]!;
  const transitions = degrees.map(({ chord }, from) => degrees.map(({ chord: next }, to) => {
    const common = chord.tones.filter((tone) => next.tones.some((other) => other.pitchClass === tone.pitchClass)).length;
    const modeMovement = templates.some((path) => path.some((degree, index) => degree === from && path[index + 1] === to));
    const styleMovement = profile.cadence.some(([a, b]) => a === from && b === to);
    const step = (next.tones[0]!.pitchClass - chord.tones[0]!.pitchClass + 12) % 12;
    const tension = mood === "tense" && (step === 1 || step === 11 || step === 6);
    return (from === to ? -2 : common * (mood === "relaxed" ? 1.45 : 0.6))
      + Number(modeMovement) * 0.7 + Number(styleMovement) * 2.6 + Number(tension) * 1.7;
  }));
  const chordScores = degrees.map(({ chord }) => {
    if (chord.chordId === "diminished" || chord.chordId === "augmented") return mood === "tense" ? 1.3 : -3;
    if (mood === "bright" && chord.chordId === "major") return 2.4;
    if (mood === "melancholic" && chord.chordId === "minor") return 2.4;
    return 0;
  });
  const candidates = new Map<string, { path: number[]; score: number }>();
  function add(motif: readonly number[], preference = 0) {
    const path = Array.from({ length }, (_, slot) => {
      const degree = motif[slot % motif.length];
      return locks.get(slot) ?? (degree !== undefined && allowed.includes(degree) ? degree : pickDegree());
    });
    const signature = path.join(",");
    const color = MODAL_COLOR[mode];
    const tonicStart = style === "jazz" || style === "indie" ? 0.7 : 2.1;
    const resolution = mood === "tense" ? -1 : mood === "relaxed" ? 2.2 : 1;
    const diversity = Math.min(4, new Set(path).size) * 0.8;
    const movement = path.reduce((total, degree, slot) => total + chordScores[degree]!
      + (slot ? transitions[path[slot - 1]!]![degree]! : 0), 0);
    const score = preference + diversity + movement + (path[0] === 0 ? tonicStart : 0)
      + (path.at(-1) === 0 ? resolution : 0) + (color !== undefined && path.includes(color) ? 2.6 : 0);
    if ((candidates.get(signature)?.score ?? -Infinity) < score) candidates.set(signature, { path, score });
  }

  for (const template of templates) add(template, 1.5);
  for (const motif of profile.motifs) {
    add(motif, 3);
    for (let variation = 0; variation < 5; variation++) {
      const phrase = Array.from({ length }, (_, slot) => motif[slot % motif.length]!);
      phrase[Math.floor(random() * length)] = pickDegree();
      add(phrase, 1.5);
    }
  }
  for (let attempt = 0; attempt < 96; attempt++) {
    add(Array.from({ length }, pickDegree));
  }

  // Guarantee a different eligible path when at least one unlocked position
  // has an alternative, even if the random draws happened to miss it.
  const prior = previous?.map((degree) => degree - 1);
  if (prior?.length === length) {
    const slot = prior.findIndex((degree, index) => !locks.has(index) && allowed.some((other) => degree !== other));
    if (slot >= 0) {
      const variant = prior.slice();
      variant[slot] = allowed.find((degree) => degree !== prior[slot])!;
      add(variant);
      candidates.delete(prior.join(","));
    }
  }

  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
  const finalists = ranked.filter(({ score }) => ranked[0]!.score - score <= (length <= 4 ? 3 : 5)).slice(0, 8);
  return finalists[Math.floor(random() * finalists.length)]!.path;
}

export function generateProgression(request: ProgressionRequest): ProgressionResult {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return error("INVALID_INPUT", "A progression request is required");
  }
  if (!Object.hasOwn(TEMPLATES, request.mode)) {
    return error("UNSUPPORTED_MODE", "Choose a supported progression mode");
  }
  if (!Number.isInteger(request.seed) || request.seed < 0 || request.seed > 0xffffffff) {
    return error("INVALID_INPUT", "Seed must be an unsigned 32-bit integer");
  }
  if (request.lockedSlots !== undefined && !Array.isArray(request.lockedSlots)) {
    return error("INVALID_INPUT", "lockedSlots must be an array");
  }
  const length = request.length ?? 4;
  const style = request.style ?? "auto";
  const mood = request.mood ?? "any";
  const color = request.color ?? "triads";
  if (!Number.isInteger(length) || length < 2 || length > 8) {
    return error("INVALID_INPUT", "Choose a progression length from two to eight chords");
  }
  if (!STYLES.includes(style) || !MOODS.includes(mood) || !PROGRESSION_COLORS.includes(color)) {
    return error("INVALID_INPUT", "Choose a supported style, mood and chord colour");
  }
  for (const list of [request.allowedDegrees, request.previousDegrees]) {
    if (list !== undefined && (!Array.isArray(list) || list.length > 8 ||
      !list.every((degree) => Number.isInteger(degree) && degree >= 1 && degree <= 7))) {
      return error("INVALID_INPUT", "Chord degrees must be integers from one to seven");
    }
  }
  const locks = request.lockedSlots ?? [];
  if (request.length === undefined && locks.length > 4) {
    return error("INVALID_INPUT", "A four-chord progression accepts at most four locks");
  }
  const requested = [...new Set(request.allowedDegrees ?? [1, 2, 3, 4, 5, 6, 7])].map((degree) => degree - 1);

  try {
    const seen = new Set<number>();
    for (const lock of locks) {
      if (!lock || typeof lock !== "object" || Array.isArray(lock) ||
          !Number.isInteger(lock.slotIndex) || lock.slotIndex < 0 || seen.has(lock.slotIndex)) {
        return error("INVALID_INPUT", "Locked chord positions must be unique, valid card indices");
      }
      if (lock.slotIndex >= length) {
        return error("INVALID_INPUT", "Unlock chord " + (lock.slotIndex + 1) + " or increase the chord count");
      }
      if (typeof lock.chordId !== "string" || !Object.hasOwn(CHORD_FORMULAS, lock.chordId)) {
        return error("INVALID_INPUT", `Chord ${lock.slotIndex + 1} has an invalid locked chord quality`);
      }
      validateNote(lock.root);
      seen.add(lock.slotIndex);
    }

    const triads = listProgressionChoices(request.tonic, request.mode);
    const variants = color !== "triads" || locks.some(({ chordId }) => !TRIAD_IDS.some((id) => id === chordId))
      ? colorChoices(triads, request.tonic, request.mode) : [];
    const preferred: readonly ChordId[] = COLOR_QUALITIES[color];
    const playable = (chord: Chord) => request.isChordPlayable?.(chord) ?? true;
    const degrees = triads.map((base) => preferred.map((id) => variants.find(({ degree, chord }) =>
      degree === base.degree && chord.chordId === id && playable(chord))).find((choice) => choice) ?? base);
    const allowed = requested.filter((index) => playable(degrees[index]!.chord));
    const lockedChords = new Map<number, ProgressionChordChoice>();
    const lockedDegrees = new Map<number, number>();
    for (const lock of locks) {
      const choice = [...triads, ...variants].find(({ chord }) =>
        chord.chordId === lock.chordId && sameNote(chord.root, lock.root));
      if (!choice) {
        return error("LOCK_OUT_OF_MODE", `Chord ${lock.slotIndex + 1} is locked and outside the selected key and mode`);
      }
      const index = choice.degree - 1;
      if (!requested.includes(index) || !playable(choice.chord)) {
        return error("NO_PLAYABLE_CHORDS", "Locked chord " + (lock.slotIndex + 1) + " has no matching guitar grip");
      }
      lockedChords.set(lock.slotIndex, choice);
      lockedDegrees.set(lock.slotIndex, index);
    }

    if (!allowed.length && lockedDegrees.size !== length) {
      return error("NO_PLAYABLE_CHORDS", "No chord in this context has a matching guitar grip for the unlocked cards");
    }
    const modeTemplates = TEMPLATES[request.mode];
    const templates = length === 4 && style === "auto" && mood === "any" ? modeTemplates.filter((path) =>
      matchesLocks(path, lockedDegrees) && path.every((degree, index) => lockedDegrees.has(index) || allowed.includes(degree)) &&
      !path.every((degree, index) => request.previousDegrees?.[index] === degree + 1)) : [];
    const random = mulberry32(request.seed);
    const legacyFallback = length === 4 && request.allowedDegrees === undefined &&
      request.previousDegrees === undefined && request.isChordPlayable === undefined && color === "triads" &&
      style === "auto" && mood === "any";
    const choices = templates.length ? templates : legacyFallback ? constrainedPaths(lockedDegrees, degrees, modeTemplates) : [];
    const path = choices.length ? choices[Math.floor(random() * choices.length)]!
      : hybridPath(lockedDegrees, degrees, modeTemplates, {
        length, style, mood, mode: request.mode, allowed: allowed.length ? allowed : [...lockedDegrees.values()],
        ...(request.previousDegrees?.length === length ? { previous: request.previousDegrees } : {}),
      }, random);
    const slots = Object.freeze(path.map((degree, slotIndex): ProgressionSlot => {
      const chosen = lockedChords.get(slotIndex) ?? degrees[degree]!;
      return Object.freeze({
        slotIndex,
        degree: degree + 1,
        chord: chosen.chord,
        symbol: chosen.symbol,
        romanNumeral: chosen.romanNumeral,
        isLocked: lockedDegrees.has(slotIndex),
      });
    }));

    const { letter, accidental } = request.tonic;
    return Object.freeze({
      ok: true,
      data: Object.freeze({
        tonic: Object.freeze({ letter, accidental }),
        mode: request.mode,
        seed: request.seed,
        selection: templates.length ? "template" : "constrained",
        slots,
      }),
    });
  } catch (caught) {
    if (caught instanceof MusicError) return error("INVALID_INPUT", caught.message);
    throw caught;
  }
}
