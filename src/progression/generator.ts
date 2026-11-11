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
export type ProgressionMode = "major" | "naturalMinor" | "mixolydian";

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
        code: "INVALID_INPUT" | "UNSUPPORTED_MODE" | "LOCK_OUT_OF_MODE";
        message: string;
      }>;
    }>;

type DegreeChord = Readonly<{ chord: Chord; romanNumeral: string }>;
const TRIAD_IDS = ["major", "minor", "diminished", "augmented"] as const;
const MIXOLYDIAN_NUMERALS = ["I", "ii", "iii°", "IV", "v", "vi", "♭VII"] as const;

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
};

function sameNote(left: NoteName, right: NoteName): boolean {
  return left.letter === right.letter && left.accidental === right.accidental;
}

function error(code: "INVALID_INPUT" | "UNSUPPORTED_MODE" | "LOCK_OUT_OF_MODE", message: string): ProgressionResult {
  return Object.freeze({ ok: false, error: Object.freeze({ code, message }) });
}

function chordSymbol(chord: Chord): string {
  const suffix: Readonly<Record<(typeof TRIAD_IDS)[number], string>> = {
    major: "",
    minor: "m",
    diminished: "dim",
    augmented: "aug",
  };
  return formatNote(chord.root) + (suffix[chord.chordId as (typeof TRIAD_IDS)[number]] ?? "");
}

/**
 * Modes do not currently have a general getDiatonicHarmony query. Derive the
 * seven triads by stacking written scale thirds, then ask Core to identify each
 * triad. No pitch, interval or chord formula is reimplemented here.
 */
function modalTriads(tonic: NoteName): readonly DegreeChord[] {
  const scale = buildScale({ tonic, scaleId: "mixolydian" });
  return scale.tones.map((tone, degree) => {
    const target = [0, 2, 4].map((offset) => scale.tones[(degree + offset) % 7]!.note);
    const matches = TRIAD_IDS.map((chordId) => buildChord({ root: tone.note, chordId }))
      .filter((chord) => chord.tones.every((note, index) => sameNote(note.note, target[index]!)));
    if (matches.length !== 1) throw new Error("Modal triad must match exactly one existing Core chord");
    return Object.freeze({ chord: matches[0]!, romanNumeral: MIXOLYDIAN_NUMERALS[degree]! });
  });
}

function harmony(tonic: NoteName, mode: ProgressionMode): readonly DegreeChord[] {
  if (mode === "mixolydian") return modalTriads(tonic);
  const result = buildDiatonicHarmony({
    key: { tonic, mode: mode === "major" ? "major" : "minor" },
    chordSize: "triad",
  });
  return result.degrees.map(({ chord, romanNumeral }) =>
    Object.freeze({ chord, romanNumeral: romanNumeral.label }));
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

export function generateProgression(request: ProgressionRequest): ProgressionResult {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return error("INVALID_INPUT", "A progression request is required");
  }
  if (request.mode !== "major" && request.mode !== "naturalMinor" && request.mode !== "mixolydian") {
    return error("UNSUPPORTED_MODE", "This first slice supports major, natural minor and Mixolydian");
  }
  if (!Number.isInteger(request.seed) || request.seed < 0 || request.seed > 0xffffffff) {
    return error("INVALID_INPUT", "Seed must be an unsigned 32-bit integer");
  }
  if (request.lockedSlots !== undefined && !Array.isArray(request.lockedSlots)) {
    return error("INVALID_INPUT", "lockedSlots must be an array");
  }
  const locks = request.lockedSlots ?? [];
  if (locks.length > 4) return error("INVALID_INPUT", "A four-chord progression accepts at most four locks");

  try {
    const seen = new Set<number>();
    for (const lock of locks) {
      if (!lock || typeof lock !== "object" || Array.isArray(lock) ||
          !Number.isInteger(lock.slotIndex) || lock.slotIndex < 0 || lock.slotIndex > 3 || seen.has(lock.slotIndex)) {
        return error("INVALID_INPUT", "Locked chord slots must be unique, valid indices from 0 to 3");
      }
      if (typeof lock.chordId !== "string" || !Object.hasOwn(CHORD_FORMULAS, lock.chordId)) {
        return error("INVALID_INPUT", `Chord ${lock.slotIndex + 1} has an invalid locked chord quality`);
      }
      validateNote(lock.root);
      seen.add(lock.slotIndex);
    }

    const degrees = harmony(request.tonic, request.mode);
    const symbols = degrees.map(({ chord }) => chordSymbol(chord));
    const lockedDegrees = new Map<number, number>();
    for (const lock of locks) {
      const index = degrees.findIndex(({ chord }) => chord.chordId === lock.chordId && sameNote(chord.root, lock.root));
      if (index < 0) {
        return error("LOCK_OUT_OF_MODE", `Chord ${lock.slotIndex + 1} is locked and outside the selected key and mode`);
      }
      lockedDegrees.set(lock.slotIndex, index);
    }

    const modeTemplates = TEMPLATES[request.mode];
    const templates = modeTemplates.filter((path) => matchesLocks(path, lockedDegrees));
    const choices = templates.length ? templates : constrainedPaths(lockedDegrees, degrees, modeTemplates);
    const random = mulberry32(request.seed);
    const path = choices[Math.floor(random() * choices.length)]!;
    const slots = Object.freeze(path.map((degree, slotIndex): ProgressionSlot => {
      const chosen = degrees[degree]!;
      return Object.freeze({
        slotIndex,
        degree: degree + 1,
        chord: chosen.chord,
        symbol: symbols[degree]!,
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
