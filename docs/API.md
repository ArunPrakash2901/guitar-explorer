# Phase 1 musical API

Import the pure public surface from `src/engine/index.ts`. Source uses ESM syntax
and .js import specifiers for TypeScript bundlers; the preserved prototype remains
CommonJS-compatible. This private package is source-only, not a published build.

## Musical queries

`musicQueries` methods accept structured objects and return:

```ts
type QueryResult<T> =
  | { schemaVersion: 1; ok: true; data: T }
  | { schemaVersion: 1; ok: false;
      error: { code: "INVALID_INPUT" | "UNSUPPORTED" | "NO_MATCH"; message: string } };
```

Only MusicError domain failures become error results. Programming errors propagate.
Empty location searches succeed with an empty array. No current operation needs to
emit NO_MATCH; the reserved error code does not imply an unimplemented method.

| Method | Request | Successful data |
|---|---|---|
| getInterval | { from: Pitch, to: Pitch } | Signed interval, number, quality, direction, label |
| getScale | { tonic: NoteName, scaleId } | Formula and spelled degree/tone metadata |
| getChord | { root: NoteName, chordId } | Formula and spelled degree/tone metadata |
| getNoteAtFret | { position, board?, context?, root?, spellingPreference? } | Location, registered pitch, spelling source, contextual relationships |
| getFretboardLocations | { board?, fretRange?, stringIndices?, pitchClasses?, context?, root?, spellingPreference? } | Annotated locations in string-index then fret order |
| analyseNotes | { notes: Pitch[], context: HarmonicContext } | Analysis in input order, preserving supplied spelling |
| transposePitch | { pitch: Pitch, interval: Interval } | Transposed spelled pitch |
| transposeNote | { note: NoteName, interval: Interval } | Transposed spelled note without register |
| invertInterval | { interval: Interval } | Simple ascending octave complement |

The six main queries and invertInterval also have named exports. Named
transposePitchQuery/transposeNoteQuery are envelope variants; named transposePitch
and transposeNote are low-level helpers. Direct Core/Guitar helpers validate and
throw MusicError instead of wrapping it. Parsers are helpers, not free-text theory
interpretation endpoints.

```ts
import {
  musicQueries, parseNote, parsePitch, formatNote,
  negateInterval, STANDARD_TUNING,
} from "../src/engine/index.js";

const third = musicQueries.getInterval({
  from: parsePitch("A3"), to: parsePitch("C#4"),
});
if (third.ok) {
  musicQueries.transposePitch({ pitch: parsePitch("D4"), interval: third.data });
  // F#4; the same relationship transferred to another root.
  musicQueries.transposePitch({
    pitch: parsePitch("C#4"), interval: negateInterval(third.data),
  }); // A3
}

const scale = musicQueries.getScale({ tonic: parseNote("C#"), scaleId: "major" });
if (scale.ok) scale.data.tones.map(tone => formatNote(tone.note));
// C# D# E# F# G# A# B#

musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 0 } }); // E2
musicQueries.getNoteAtFret({ position: { stringIndex: 5, fret: 0 } }); // E4
musicQueries.getFretboardLocations({
  board: { tuning: STANDARD_TUNING, maxFret: 24 },
  fretRange: { minFret: 5, maxFret: 12 },
  pitchClasses: [1],
  root: parseNote("A"),
  context: { key: { tonic: parseNote("A"), mode: "major" } },
}); // C# locations with major-third root annotation

musicQueries.analyseNotes({
  notes: [parsePitch("F#4")],
  context: {
    key: { tonic: parseNote("A"), mode: "major" },
    activeScale: { tonic: parseNote("D"), scaleId: "major" },
    currentChord: { root: parseNote("D"), chordId: "major" },
  },
}); // key degree 6; selected-scale degree 3; current-chord M3
```

## Values and conventions

- NoteName = { letter: "A".."G", accidental: integer }. Pitch adds octave.
  C4=60; octaves follow written letters, so B#3=C4 and Cb4=B3 in sound.
- Parsers accept capital letters and repeated ASCII #/b or Unicode sharp/flat/double
  signs. Formatting is canonical ASCII. Mixed sharp/flat suffixes are invalid.
- Pitch classes are 0..11. Numeric domain fields must be finite safe integers.
  Checked arithmetic rejects overflow. Frequencies and MIDI range limits do not
  constrain this pure kernel.
- Interval = { diatonicSteps, semitones }, both signed. P1=(0,0), M3=(2,4),
  P8=(7,12), M9=(8,14). Registered interval direction follows written movement,
  using sound for same-letter movement. C4→Cb4 is descending A1. Note-only
  intervalBetweenNotes uses an ascending written span, so C→Cb is d1. Both retain
  identical signed coordinates; use registered pitches when direction matters.
- qualityMultiplicity is 0 for P/M/m, 1 for A/d, 2 for AA/dd.
  Interval inversion is the ascending simple octave complement, not transposition
  reversal. It rejects compounds, descending intervals and chromatic displacement
  outside 0..12. negateInterval reverses a transposition.
- Scale IDs: major, naturalMinor. Chord IDs: major, minor, diminished, augmented.
  Formula alterations use major/perfect reference intervals, independent of key.
  Derived formulas/results preserve degrees and spellings; IDs select catalogs.
- HarmonicContext has independent optional key, activeScale and currentChord.
  A minor key means natural-minor reference in this phase; key signatures and
  functional/Roman/progression interpretation are later scope.
- Key/scale relations use the supplied note letter for degree and alteration from
  that collection. inKey/inScale and isChordTone compare sounding pitch classes;
  spellingMatches reports exact written membership. Thus E# in C major sounds in
  the collection but remains an altered third in its supplied spelling.
- Located pitches start unspelled. Spelling precedence is explicit matching root,
  current chord, selected scale, key, then sharp/flat display fallback (default
  sharps). alternativeSpellings retains other contextual matches. Fallback
  spelling is a display choice, not a claim of unique theoretical meaning.
- Root annotations report written interval and chromaticDistance separately.
  Locations and analyseNotes agree when given the same spelled pitch/context.

## Guitar bounds and ordering

Default board: standard E2 A2 D3 G3 B3 E4, frets 0..15 inclusive. Supply another
board to change tuning, string count or maximum fret. Index zero is the first
physical string (string 6 in standard tuning); visual string number = count-index.
Do not sort tuning by frequency: reentrant order is meaningful.

Ranges must fit the board; invalid ranges are rejected rather than clipped.
Duplicate filters do not duplicate results. Explicit empty filters succeed with
an empty array after validation. Ordering is stringIndex ascending, then fret.

Enumeration examines at most 10000 candidate positions after string/range selection,
before pitch-class filtering. Broader requests return UNSUPPORTED; narrow the range
or strings. Text accidental parsing/formatting is bounded to 4096 accidental units.
There are no browser globals, storage, asynchronous work or learner-state fields
in the public import graph.

