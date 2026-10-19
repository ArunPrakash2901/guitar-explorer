# Musical API — Phase 1 through Phase 2B

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
| getKeySignature | Key | Conventional signed fifths count and ordered alterations |
| getRelativeKey | Key | Relative major/minor, relationship kind and tonic interval |
| getFifthsNeighbors | Key | Clockwise P5 and counterclockwise descending-P5 neighbors |
| getKeyProfile | Key | Composition of signature, relative and fifths results |
| getNoteAtFret | { position, board?, context?, root?, spellingPreference? } | Location, registered pitch, spelling source, contextual relationships |
| getFretboardLocations | { board?, fretRange?, stringIndices?, pitchClasses?, context?, root?, spellingPreference? } | Annotated locations in string-index then fret order |
| analyseNotes | { notes: Pitch[], context: HarmonicContext } | Analysis in input order, preserving supplied spelling |
| transposePitch | { pitch: Pitch, interval: Interval } | Transposed spelled pitch |
| transposeNote | { note: NoteName, interval: Interval } | Transposed spelled note without register |
| invertInterval | { interval: Interval } | Simple ascending octave complement |

The query names remain unchanged in Phase 2B. Scale breadth is exposed through the
existing `getScale` and `analyseNotes` surfaces rather than new per-scale methods.

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

const blues = musicQueries.getScale({ tonic: parseNote("C"), scaleId: "minorBlues" });
if (blues.ok) blues.data.tones.map(tone => formatNote(tone.note));
// C Eb F Gb G Bb

const omitted = musicQueries.analyseNotes({
  notes: [parsePitch("F4")],
  context: { activeScale: { tonic: parseNote("C"), scaleId: "majorPentatonic" } },
});
// Scale relation: degree 4, referenceStatus "omitted",
// degreeReferences [], alterationFromScale null, inScale false.

const bluesFive = musicQueries.analyseNotes({
  notes: [parsePitch("Gb4"), parsePitch("G4")],
  context: { activeScale: { tonic: parseNote("C"), scaleId: "minorBlues" } },
});
// Both written notes are degree 5 and therefore expose the ordered degree references
// [b5, 5]. matchingTones identifies the sounding formula tone for each note.

musicQueries.getNoteAtFret({ position: { stringIndex: 0, fret: 0 } }); // E2
musicQueries.getNoteAtFret({ position: { stringIndex: 5, fret: 0 } }); // E4
musicQueries.getFretboardLocations({
  board: { tuning: STANDARD_TUNING, maxFret: 24 },
  fretRange: { minFret: 5, maxFret: 12 },
  pitchClasses: [1],
  root: parseNote("A"),
  context: { key: { tonic: parseNote("A"), mode: "major" } },
}); // C# locations with major-third root annotation

const profile = musicQueries.getKeyProfile({ tonic: parseNote("F#"), mode: "major" });
if (profile.ok) {
  profile.data.signature.fifths; // 6
  profile.data.signature.alterations.map(formatNote); // F# C# G# D# A# E#
  profile.data.relative.relativeKey; // D# minor
  profile.data.fifths.clockwise.destinationKey; // C# major
}
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
  intervalBetweenNotes uses an ascending written span, so C→Cb is d1.
- qualityMultiplicity is 0 for P/M/m, 1 for A/d, 2 for AA/dd.
  Interval inversion is the ascending simple octave complement, not transposition
  reversal. `negateInterval` reverses a transposition.
- Scale IDs: `major`, `naturalMinor`, `harmonicMinor`, `melodicMinorAscending`,
  `majorPentatonic`, `minorPentatonic`, `minorBlues`, `dorian`, `phrygian`,
  `lydian`, `mixolydian`, `locrian`.
- Chord IDs remain `major`, `minor`, `diminished`, `augmented` until Phase 2C.
- Formula alterations use major/perfect reference intervals independently of key.
  Minor blues intentionally contains both `{ degree: 5, alteration: -1 }` and
  `{ degree: 5, alteration: 0 }`; formula identity is not collapsed to pitch class.
- `ScaleRelation.degree` follows the queried written note letter relative to the
  scale tonic. `degreeReferences` contains every formula tone declared for that
  written degree, in formula order. `referenceStatus` is `single`, `omitted` or
  `multiple`. `alterationFromScale` is numeric only for `single`; it is `null` for
  omitted or multiple references. `matchingTones` is independent sounding-membership
  evidence and contains every scale tone sharing the queried pitch class.
- Therefore exact spelling and sounding membership can disagree intentionally. For
  example F# against C minor blues sounds as the scale's Gb blue note, but it is a
  differently spelled written degree and `spellingMatches` is false.
- Key-context degree analysis remains seven-note major/natural-minor analysis and is
  independent of generalized selected-scale analysis.
- Conventional key signatures cover signed fifths positions -7..7: Cb..C# major
  and their Ab..A# relative minors. Signature/profile requests outside that range
  return UNSUPPORTED; relative/fifths relationships remain available.
- HarmonicContext has independent optional key, activeScale and currentChord.
- Located pitches start unspelled. Spelling precedence is explicit matching root,
  current chord, selected scale, key, then sharp/flat display fallback.

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
or strings. There are no browser globals, storage, asynchronous work or learner-state
fields in the public import graph.
