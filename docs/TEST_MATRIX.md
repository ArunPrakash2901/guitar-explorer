# Test Matrix

The active tests cover the deterministic Music Engine, the source-provenance
research contract and the Black Dog Song Study. [Verification commands](VERIFY.md)

| Area | Automated coverage |
| --- | --- |
| Pitch and intervals | Spelling, registered pitches, sounding equivalence, signed intervals and transposition. |
| Collections and harmony | Scale formulas, contextual membership, all 35 chord formulas, diatonic triads and sevenths, key signatures, relative keys and fifths relationships. |
| Guitar | Standard tuning, string and fret geometry, note-at-position and bounded location enumeration. |
| Queries and boundaries | Public exports, query envelopes and errors, deterministic serialization, and the dependency boundary around the engine. |
| Source-provenance research | Validation and traceability of source observations, analytical assumptions and engine-derived facts. |
| Black Dog model | Section order and occurrence references, authored pitch and fretboard facts, interval and chord relationships, rational rhythm, and prepared examples. |
| Local application | HTTP smoke tests for the Song Study entrypoint and its browser and compiled modules, plus 404s for retired exercise routes. |
| Static output | Entry files, browser and compiled module imports, revision and channel metadata, and allowed output for preview, experimental and stable builds. |

The [Black Dog traceability matrix](BLACK_DOG_REQUIREMENTS.md) ties these checks
and the listening and physical-guitar acceptance work to individual
requirements.

## Phrase Foundation PR 1 — executable acceptance coverage

The normative contract is [PHRASE_FOUNDATION_V1.md](PHRASE_FOUNDATION_V1.md).
These checks exercise the exact-time and Phrase contracts. Run `npm run verify`
for the full repository gate.

| File | Implemented gates |
|---|---|
| `tests/domain/time.test.ts` | T01–T06 exact normalization, tuplets, signed arithmetic, all malformed numeric fields, huge intermediates with safe reduced results, close-fraction comparisons, reduced-result overflow; finite fraction-equivalence/complement loops. |
| `tests/domain/phrase.test.ts` | A01–A09 mandatory rhythm/register/spelling, exact transposition/inverse, contour versus intervals, repetitions/silence and authored clipped crop; A13–A15 twelve registered placement checks, transposition versus relocation and unsupported overlaps. T07/T11–T14/T17–T18 as applicable: empty/count semantics, half-open/silent/zero crops, strict fields, copying/freezing, dense/order/bounds, 10,000/10,001 resource boundary and independent transformation scope. |
| `tests/contracts/phrase-foundation.test.ts` | All eight wrapper facts and success/failure envelopes, JSON/determinism/input ownership, strict requests, oversize early rejection, empty-argument validation, programming-error propagation and collision-safe root exports; T12/T14–T15/T18. |
| `tests/fixtures/phrases.ts` | Hand-authored six-note phrase, interval/contour/transposition/crop expectations and two external placement sidecars. No timeline/analysis or API-derived expected fractions. |
| `tests/contracts/query.test.ts`, `boundaries.test.ts` | Exact 23-method facade and 24 named runtime query exports including `musicQueries`; browser globals trapped for every new wrapper; existing local-only import graph/dependency direction retained. |

A10–A12 and harmonic T08–T10/T16 remain reserved for a separately scoped
harmony timeline and analysis slice.

## Historical v0.2 acceptance examples — reference only

The following examples preserve the original product matrix. Sections 1–4 overlap
current engine facts, but this historical list is not the inventory of executable
tests. CAGED, generic progression handling, the original Explore/Navigate/Harmony
UI, persistent telemetry, PWA/offline behavior, and critical Playwright flows were
historical targets. The old prototype and its tests remain available from the original handoff and
Git history.

### 1. Note-at-fret tests

Standard tuning examples:

- low E open = E
- low E fret 5 = A
- A string fret 3 = C
- D string fret 7 = A
- G string fret 6 = C#
- B string fret 1 = C
- high E fret 12 = E

Also verify octave repetition at fret 12 for every string.

### 2. Interval tests

At minimum:

- A → A = root/unison
- A → C = minor 3rd
- A → C# = major 3rd
- A → D = perfect 4th
- A → E = perfect 5th
- C → B = major 7th

Test all 12 semitone distances programmatically.

### 3. Major-scale spelling

Required examples:

- C = C D E F G A B
- A = A B C# D E F# G#
- Bb = Bb C D Eb F G A
- Eb = Eb F G Ab Bb C D
- F# = F# G# A# B C# D# E#
- C# = C# D# E# F# G# A# B#

The spelling layer must not silently replace E# with F or B# with C in diatonic contexts.

### 4. Major triads

Required examples:

- C = C E G
- A = A C# E
- Bb = Bb D F
- Eb = Eb G Bb
- F# = F# A# C#
- C# = C# E# G#

### 5. CAGED voicings

For every supported root × CAGED shape:

- every sounded position must be a root, major 3rd or perfect 5th of the requested chord
- muted strings from the source template remain muted
- fret positions must be within the supported 0–15 display for current supported roots/templates

Specific regression examples:

- A major G shape = low-to-high `[5,4,2,2,2,5]`
- C major C shape = `[null,3,2,0,1,0]`
- E major E shape = `[0,2,2,1,0,0]`

### 6. Progressions

- A major I–IV–V–I roots = A D E A
- Bb major = Bb Eb F Bb
- C# major = C# F# G# C#

Each chord must contain scale degrees 1/3/5 relative to its chord root while retaining correct key spelling.

### 7. Explore behaviour

- Full exposes note + interval
- Intervals does not expose note names by default
- Roots exposes only roots
- Hidden exposes no answer markers
- Build allows arbitrary position selection
- correct build passes
- missing/extra positions fail without revealing exact answer automatically

### 8. Navigate behaviour

- generated exercises always have at least one valid answer
- clicking an invalid note cannot be marked correct merely because it has the same screen geometry
- wrong interval feedback reports the actual interval from the relevant root
- solved exercise does not keep generating duplicate attempt events from random clicks

### 9. Harmony behaviour

- scale layer remains stable while progression chord changes
- active chord tones update on I/IV/V/I
- practice mode hides the chord-tone answer
- current-chord R/3/5 answers are evaluated by pitch class

### 10. Telemetry

- append event
- reload persistence
- event schema version included
- export contains all stored events
- response time non-negative
- no personally sensitive data is required for an attempt event

### 11. Critical Playwright flows

1. Open A major G shape → switch Full → Roots → Build → construct correct voicing → success.
2. Navigate Find Note → wrong click → informative feedback → correct click → success.
3. Harmony A major → advance I to IV → practice 3rd → select F# → success.
4. Reload page after attempts → local history count persists.
5. Mobile viewport → tabs, fretboard and task controls remain usable.
