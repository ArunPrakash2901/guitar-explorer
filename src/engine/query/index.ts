import { analysePitch, spellSemitone, validateContext } from "../core/context.js";
import type { NoteAnalysis, SpelledPitch } from "../core/context.js";
import { buildChord, buildScale } from "../core/collections.js";
import { assertRecord, MusicError } from "../core/errors.js";
import type { ErrorCode } from "../core/errors.js";
import { getIntervalBetweenPitches, intervalBetweenNotes, invertSimpleInterval, transposeNote as transposeWrittenNote, transposePitch as transposeRegisteredPitch } from "../core/intervals.js";
import { mod12, validateNote } from "../core/pitch.js";
import type { ChordSpec, HarmonicContext, Interval, IntervalInfo, NoteName, Pitch, PitchClass, ScaleSpec, SpellingPreference } from "../core/types.js";
import { findLocations, getNoteAt, STANDARD_FRETBOARD } from "../guitar/fretboard.js";
import type { Fretboard, FretPosition, FretRange, LocatedPitch } from "../guitar/types.js";

export type QueryResult<T> =
  | Readonly<{ schemaVersion: 1; ok: true; data: T }>
  | Readonly<{ schemaVersion: 1; ok: false; error: Readonly<{ code: ErrorCode; message: string }> }>;

function query<T>(request: unknown, action: () => T): QueryResult<T> {
  try {
    assertRecord(request, "request");
    return { schemaVersion: 1, ok: true, data: action() };
  } catch (error) {
    if (!(error instanceof MusicError)) throw error;
    return { schemaVersion: 1, ok: false, error: { code: error.code, message: error.message } };
  }
}

export function getInterval(request: Readonly<{ from: Pitch; to: Pitch }>) {
  return query(request, () => getIntervalBetweenPitches(request.from, request.to));
}

export function getScale(request: ScaleSpec) {
  return query(request, () => buildScale(request));
}

export function getChord(request: ChordSpec) {
  return query(request, () => buildChord(request));
}

type LocationContext = Readonly<{
  context?: HarmonicContext;
  root?: NoteName;
  spellingPreference?: SpellingPreference;
}>;
export type RootRelation = Readonly<{
  root: NoteName;
  interval: IntervalInfo;
  chromaticDistance: PitchClass;
}>;
export type FretboardNote = LocatedPitch & NoteAnalysis & Omit<SpelledPitch, "pitch"> & Readonly<{ rootRelation?: RootRelation }>;
export type NoteAtFretRequest = LocationContext & Readonly<{ board?: Fretboard; position: FretPosition }>;
export type LocationsRequest = LocationContext & Readonly<{
  board?: Fretboard;
  fretRange?: FretRange;
  stringIndices?: readonly number[];
  pitchClasses?: readonly PitchClass[];
}>;

function validateLocationContext(request: LocationContext): void {
  if (request.context !== undefined) validateContext(request.context);
  if (request.root !== undefined) validateNote(request.root);
  if (request.spellingPreference !== undefined && request.spellingPreference !== "sharps" && request.spellingPreference !== "flats") {
    throw new MusicError("INVALID_INPUT", "Spelling preference must be sharps or flats");
  }
}

function annotate(location: LocatedPitch, request: LocationContext): FretboardNote {
  const spelling = spellSemitone(location.semitone, request.context, request.spellingPreference, request.root);
  const analysis = analysePitch(spelling.pitch, request.context);
  const interval = request.root && intervalBetweenNotes(request.root, spelling.pitch.note);
  return {
    ...location,
    ...analysis,
    spellingSource: spelling.spellingSource,
    alternativeSpellings: spelling.alternativeSpellings,
    ...(request.root && interval ? { rootRelation: {
      root: { letter: request.root.letter, accidental: request.root.accidental }, interval,
      chromaticDistance: mod12(interval.semitones),
    } } : {}),
  };
}

export function getNoteAtFret(request: NoteAtFretRequest): QueryResult<FretboardNote> {
  return query(request, () => {
    validateLocationContext(request);
    return annotate(getNoteAt(request.board === undefined ? STANDARD_FRETBOARD : request.board, request.position), request);
  });
}

export function getFretboardLocations(request: LocationsRequest): QueryResult<readonly FretboardNote[]> {
  return query(request, () => {
    validateLocationContext(request);
    const locations = findLocations({
      board: request.board === undefined ? STANDARD_FRETBOARD : request.board,
      ...(request.fretRange !== undefined ? { fretRange: request.fretRange } : {}),
      ...(request.stringIndices !== undefined ? { stringIndices: request.stringIndices } : {}),
      ...(request.pitchClasses !== undefined ? { pitchClasses: request.pitchClasses } : {}),
    });
    return locations.map((location) => annotate(location, request));
  });
}

export function analyseNotes(request: Readonly<{ notes: readonly Pitch[]; context: HarmonicContext }>): QueryResult<readonly NoteAnalysis[]> {
  return query(request, () => {
    if (!Array.isArray(request.notes)) throw new MusicError("INVALID_INPUT", "notes must be an array");
    validateContext(request.context);
    return Array.from(request.notes, (pitch: Pitch) => analysePitch(pitch, request.context));
  });
}

export function transposePitchQuery(request: Readonly<{ pitch: Pitch; interval: Interval }>) {
  return query(request, () => transposeRegisteredPitch(request.pitch, request.interval));
}

export function transposeNoteQuery(request: Readonly<{ note: NoteName; interval: Interval }>) {
  return query(request, () => transposeWrittenNote(request.note, request.interval));
}

export function invertInterval(request: Readonly<{ interval: Interval }>) {
  return query(request, () => invertSimpleInterval(request.interval));
}

/** Musical truth only. Playback and learner state never enter this interface. */
export const musicQueries = Object.freeze({
  getInterval, getScale, getChord, getNoteAtFret, getFretboardLocations, analyseNotes,
  transposePitch: transposePitchQuery,
  transposeNote: transposeNoteQuery,
  invertInterval,
});
