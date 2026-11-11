import {
  formatNote, formatPitch, musicQueries, normalizeMusicalTime, parseNote, parsePitch,
  STANDARD_FRETBOARD, toSemitone,
} from "../engine/index.js";
import type { HarmonicContext, Interval, Pitch, QueryResult } from "../engine/index.js";
import type { Example } from "./types.js";

/** The standard tuning is retained. The study board includes the upper solo positions. */
export const studyBoard = { ...STANDARD_FRETBOARD, maxFret: 24 };
const wholeStep: Interval = { diatonicSteps: 1, semitones: 2 };

function requireResult<T>(result: QueryResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function eighths(ticks: number) {
  return normalizeMusicalTime({ numerator: ticks, denominator: 2 });
}

export function prepareExample(example: Example, upWholeStep = false) {
  const movePitch = (pitch: Pitch) => upWholeStep
    ? requireResult(musicQueries.transposePitch({ pitch, interval: wholeStep }))
    : pitch;
  const moveRoot = (text: string) => {
    const note = parseNote(text);
    return upWholeStep
      ? requireResult(musicQueries.transposeNote({ note, interval: wholeStep }))
      : note;
  };

  const root = example.referenceRoot ? moveRoot(example.referenceRoot) : undefined;
  const chordSpec = ({ tonic, chord }: NonNullable<Example["harmony"]>) => ({ root: moveRoot(tonic), chordId: chord });
  const currentChord = example.harmony ? chordSpec(example.harmony) : undefined;
  const context: HarmonicContext = {
    ...(root ? { key: { tonic: root, mode: "major" } as const } : {}),
    ...(root && example.scale ? { activeScale: { tonic: root, scaleId: example.scale } } : {}),
    ...(currentChord ? { currentChord } : {}),
  };
  const events = example.events.map((event) => ({
    ...event,
    pitches: (event.notes ?? []).map((text) => movePitch(parsePitch(text))),
  }));
  const duration = Math.max(0, ...events.map((event) => event.at + event.length));
  const pitches = [...new Map(events.flatMap((event) => event.pitches)
    .map((pitch) => [formatPitch(pitch), pitch])).values()];
  const notes = requireResult(musicQueries.analyseNotes({ notes: pitches, context }));
  const chord = currentChord ? requireResult(musicQueries.getChord(currentChord)) : undefined;
  const harmonyChanges = events.flatMap(({ harmony, pitches, at }) => {
    if (!harmony) return [];
    const currentChord = chordSpec(harmony);
    const notes = requireResult(musicQueries.analyseNotes({ notes: pitches, context: { currentChord } }));
    return [{ at, chord: requireResult(musicQueries.getChord(currentChord)), notes }];
  });
  const simultaneousIntervals = events.flatMap(({ pitches }) => pitches.length === 2
    ? [requireResult(musicQueries.getInterval({ from: pitches[0]!, to: pitches[1]! }))]
    : []);
  const phrase = example.phrase ? requireResult(musicQueries.getPhrase({
    duration: eighths(duration),
    events: events.flatMap(({ pitches, at, length }) => pitches.map((pitch) => ({
      pitch, onset: eighths(at), duration: eighths(length),
    }))),
  })) : undefined;

  return {
    duration, context, notes, chord, harmonyChanges,
    root: root ? formatNote(root) : undefined,
    events: events.map(({ pitches, at, length, click, gesture, gain }) => ({
      at, length, click, gesture, gain,
      names: pitches.map(formatPitch),
      semitones: pitches.map(toSemitone),
    })),
    simultaneousIntervals,
    phrase,
    contour: phrase ? requireResult(musicQueries.getPhraseContour({ phrase })) : [],
    intervals: phrase ? requireResult(musicQueries.getPhraseIntervals({ phrase })) : [],
  };
}

export function positionNotes(minFret: number, maxFret: number, context: HarmonicContext) {
  return requireResult(musicQueries.getFretboardLocations({
    board: studyBoard, fretRange: { minFret, maxFret }, context,
  }));
}

export function exactLocations(semitone: number) {
  return positionNotes(0, studyBoard.maxFret, {}).filter((note) => note.semitone === semitone);
}

export function quarterPulse(ticks: number, beatsPerBar: number) {
  return Array.from({ length: Math.ceil(ticks / 2) }, (_, beat) => ({
    at: beat * 2,
    length: 1,
    click: beat % beatsPerBar === 0 ? "accent" as const : "pulse" as const,
    semitones: [],
  }));
}

/** Position of each repeated accent against the bar grid. Values are eighth-note ticks. */
export function groupOffsets(group: number, beatsPerBar: number, count: number) {
  const bar = beatsPerBar * 2;
  return Array.from({ length: count }, (_, i) => (i * group) % bar);
}
