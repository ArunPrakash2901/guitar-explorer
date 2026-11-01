# Phrase Foundation v1 — PR 1

Issue [#40](https://github.com/ArunPrakash2901/guitar-explorer/issues/40) implements
the first slice of Arun's approved Phrase Foundation design. This branch adds exact
musical time and pure monophonic Phrase values/operations to Core. It adds eight
query methods, bringing `musicQueries` from 15 to 23 methods. The dependent PR 2
will finish v1 with a separate supplied harmony timeline and overlap analysis;
neither its types nor placeholder endpoints are exported here.

No existing Lab, ScenarioV1 or generator migrates. Their untimed material is not
assigned invented timing. Product Spine UI, harmony/placement repair, import,
techniques, polyphony, generation, audio and learner modelling remain outside this
slice. The new operations need no key, chord, timeline or fretboard.

## Value contracts

```ts
type MusicalTime = Readonly<{ numerator: number; denominator: number }>;
type MusicalTimeSpan = Readonly<{ onset: MusicalTime; duration: MusicalTime }>;
type PhraseEvent = MusicalTimeSpan & Readonly<{ pitch: Pitch }>;
type Phrase = Readonly<{ duration: MusicalTime; events: readonly PhraseEvent[] }>;
type PhraseContourDirection = "ascending" | "descending" | "stationary";
type PhraseFragmentResult = Readonly<{
  phrase: Phrase;
  sourceEventIndices: readonly number[];
  clippedAtStart: boolean;
  clippedAtEnd: boolean;
}>;
```

Use the existing registered, spelling-aware `Pitch` and signed `Interval`. Phrase
contains no IDs, harmony, coordinates, cached derived vectors or technique tags.
Application identity/provenance and guitar placement belong in external wrappers
referencing the exact immutable value. Event indices are local to that snapshot.

One time unit is one **quarter-note length**, independent of tempo and meter:
quarter 1/1, eighth 1/2, triplet eighth 1/3. It is not audio seconds, an inferred
beat or a wall-clock timestamp. There is no time signature or transport.

## Exact time

`normalizeMusicalTime`, `sameMusicalTime`, `compareMusicalTime`,
`addMusicalTime` and `subtractMusicalTime` are direct Core helpers. Comparison
returns exactly -1, 0 or 1. `ZERO_MUSICAL_TIME` is frozen canonical 0/1.

Both fields must be finite safe integer Numbers, with denominator strictly
positive. Signed numerators are valid scalars. Inputs may be unreduced; every
output is gcd-reduced with positive denominator, canonical zero and no negative
zero. Internal gcd, arithmetic and comparisons use BigInt. Reduced output pairs
must fit safe integers; otherwise the operation throws `UNSUPPORTED`, without
rounding. BigInt never enters the public JSON shape. M/2 + M/2 = M/1 is valid
for M = Number.MAX_SAFE_INTEGER despite large intermediate products.

Computed event/range ends and derived fragment times obey the same budget.
`MAX_TEMPORAL_EVENTS = 10_000` bounds each Phrase before event traversal. It is a
computational limit, not a musical or difficulty limit. No fraction dependency,
fixed PPQ grid, per-document LCM or parser is introduced.

## Phrase invariants and ownership

`buildPhrase(input)` validates and returns a canonical, deeply frozen owned copy.
Every other operation validates through it; callers need no branded/prebuilt value.

- Total duration is nonnegative. Empty zero-span and positive silent spans are valid.
- Events form a dense chronological array within the resource budget. Each event
  has a valid sounding registered Pitch, nonnegative onset, positive duration and
  an end no greater than the total span.
- Decreasing onset is invalid; no automatic sorting changes index identity.
  Positive overlap, including same-pitch sustain or simultaneous starts, is
  unsupported monophony. End equal to next onset is allowed.
- Leading/interior/trailing silence is represented by gaps and total span. There
  are no rest events. Adjacent repeated notes stay distinct. One sustained note
  stays one event; Phrase does not infer attack, tie or slur semantics.
- New Phrase/Event/Time records accept only their declared fields. New request
  wrappers and fragment ranges also reject unknown fields. Missing/wrong required
  record fields take priority over extra fields at that record level.
- Nested existing Pitch/Note/Interval guards retain their legacy semantics.
  Declared Pitch fields are copied; foreign nested metadata is stripped rather
  than tightening the old guards. Authored spelling is never replaced by a
  fretboard display spelling. Inputs are never mutated or frozen.

Validation checks outer required types, unknown fields and the size budget before
item traversal. Every event's local fields/bounds are checked before chronological
and overlap relations. Expected failures identify the field/index path. Unknown
new-record fields are `UNSUPPORTED`; malformed types/numbers, negative bounds,
nonpositive event length, out-of-order events and out-of-span ranges are
`INVALID_INPUT`. Delegated Pitch/Interval errors retain their current codes.

## Pure operations

| Direct Core operation | Semantics |
|---|---|
| `phraseIntervals(phrase)` | N−1 adjacent registered intervals using `getIntervalBetweenPitches`, including across silence; [] for 0/1 events. |
| `phraseContour(phrase)` | N−1 signs of sounding movement. Enharmonic same-sound pitches are stationary even when written interval direction differs. |
| `transposePhrase(phrase, interval)` | Existing `transposePitch` on every note. Preserve order, exact timing, repetition and total span; return a new frozen Phrase. |
| `samePhraseIntervals(left, right)` | Equal counts plus exact adjacent diatonicSteps/semitones. Ignore starting pitch and timing. |
| `samePhraseContour(left, right)` | Equal counts plus sounding directions. Ignore interval sizes, spelling and timing. |
| `samePhraseRhythm(left, right)` | Equal counts/span plus every onset/duration by exact equality. Ignore pitches. Leading/trailing silence, shifts and scaling matter. |
| `extractPhraseFragment(phrase, range)` | Half-open time crop, positive intersections only, clipped/rebased notes and a source receipt. |

Both empty patterns match for interval/contour comparisons; two singleton patterns
match too. Zero versus one does not match. This does not establish phrase identity.
Secondary arguments and both comparison inputs are validated even for empty values
or unequal counts. Contour preservation is a comparison, not a generator. Exact
transposition does not perform scale-degree/chord-role adaptation or relocation.

## Temporal extraction

The range `[onset, onset + duration)` must be wholly within the source span. Both
fields are nonnegative; zero width at any in-span point yields a zero-span empty
Phrase, empty index map and false flags. Out-of-span ranges reject, never clamp.

Include every positive note/window overlap. Preserve its Pitch, clip the duration
to the overlap and rebase onset to the window start. Output span equals the requested
duration, including silence. Boundary-only contact is excluded.
`sourceEventIndices[i]` identifies the original event for output i. A clipping flag
is true only when an included note extends across that boundary. With monophony,
at most one included note crosses each boundary. The output and receipt are frozen.

A clipped note beginning at zero was already sounding in the source; this is a
logical sounding excerpt, not proof of a new performed attack. Later harmony and
placement consumers must explicitly align their own time origins/index references.
No timeline or placement is automatically changed by crop/transposition.

## Query facade

All eight methods retain `QueryResult.schemaVersion: 1`; only MusicError is caught.
Empty/false answers succeed. No method emits `NO_MATCH`. Existing wrappers keep
their metadata/error behaviour. There is no persistence/content-schema version.

| `musicQueries` method | Request | Successful data / named export |
|---|---|---|
| `getPhrase` | Phrase | Phrase / `getPhrase` |
| `getPhraseIntervals` | `{phrase}` | readonly IntervalInfo[] / `getPhraseIntervals` |
| `getPhraseContour` | `{phrase}` | readonly PhraseContourDirection[] / `getPhraseContour` |
| `transposePhrase` | `{phrase, interval}` | Phrase / `transposePhraseQuery` |
| `extractPhraseFragment` | `{phrase, range}` | PhraseFragmentResult / `extractPhraseFragmentQuery` |
| `comparePhraseIntervals` | `{left, right}` | boolean / `comparePhraseIntervals` |
| `comparePhraseContour` | `{left, right}` | boolean / `comparePhraseContour` |
| `comparePhraseRhythm` | `{left, right}` | boolean / `comparePhraseRhythm` |

The two `Query` suffixes distinguish envelope wrappers from direct Core functions
at the public root. Core and query barrels export only implemented operations.

## Six-note proof

The authored study **Held G, changing chord**, total span 4, is stored as ordinary
data in `tests/fixtures/phrases.ts`. Its harmonic portion belongs to PR 2.

| Pitch | Onset | Duration |
|---|---|---|
| D4 | 0 | 1/3 |
| F4 | 1/3 | 1/3 |
| E4 | 2/3 | 1/3 |
| G4 | 1 | 3/2 |
| G4 | 3 | 1/2 |
| C5 | 7/2 | 1/4 |

Intervals are m3, −m2, m3, P1, P4; contour is up/down/up/stationary/up.
M2 transposition gives E4–G4–F#4–A4–A4–D5 with identical timing/intervals.
The alternative D4–F#4–E4–A4–A4–D5 keeps contour/rhythm but changes intervals.

Crop `[1/2,13/4)` gives F4,E4,G4,G4 at 0,1/6,1/2,5/2, with durations
1/6,1/3,3/2,1/4, span 11/4, source indices [1,2,3,4] and both flags true.
Expected fractions are authored independently of the implementation.

Two external position arrays match all twelve registered pitches through existing
Guitar geometry. The same positions fail to realize the transposed pitches. This
checks sounding correctness and representation separation; it makes no ergonomic
or teaching-effectiveness claim. Existing four-Lab physical approval remains valid.

## Verification and remaining slice

Domain tests cover exact fractions/overflow, validation/ownership, proof operations,
clipping, empty values and finite transposition/inverse properties. Contract tests
exercise all eight success/failure envelopes, JSON, request strictness, resource
limits and unexpected-error propagation. Exact export inventories and trapped-browser
execution remain enforced. See `TEST_MATRIX.md`; full gate is `npm run verify`.

PR 2 will add only the separately designed HarmonicTimeline and phrase/harmony
intersection modules plus their two wrappers/tests/docs. No PR 2 stubs are included
here. Neither slice authorizes Product Spine UI or any other deferred capability.
