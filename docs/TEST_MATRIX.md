# Test Matrix

> **Current status:** automated coverage includes Music Engine Phase 1 through
> Phase 2D plus Phrase Foundation PR 1, the existing Lab activities, ScenarioV1, and Rule Generator V1 using
> generator algorithm/provenance version 2. The current Product Spine architecture
> is defined in [ARCHITECTURE.md](ARCHITECTURE.md); its consolidation is
> documentation only. Historical v0.2 acceptance examples are preserved separately
> below and do not imply implemented CAGED, telemetry, PWA, or Playwright features.

The app teaches musical facts. A plausible-looking wrong answer is worse than an obvious UI failure, so domain tests are mandatory.

## Current automated verification

Run the established suite from the repository root:

```text
npm run typecheck
npm test
npm run test:prototype
npm run test:lab
```

`typecheck` checks engine/TypeScript contracts; `test` runs the domain and contract
tests under `tests/domain` and `tests/contracts`. `test:prototype` preserves the
standalone reference checks. `test:lab` builds the engine consumer, checks Lab
JavaScript syntax, and runs the shared-fretboard, Chord, Practice, Parsimonious
Path, phrase, and generator suites. Lab behavior checks use custom DOM/VM
harnesses; they are not Playwright or real-browser layout tests. Software checks
do not establish physical playability or pedagogical effectiveness.

### Current engine, Lab, and generator coverage

- foundational note spelling, registered pitches, intervals, transposition, tuning, note-at-fret, and bounded fretboard enumeration
- conventional key signatures, relative keys, and fifths relationships with explicit display limits
- broader scale formulas and selected-scale analysis separating written-degree references from sounding membership
- explicit major/natural-minor diatonic triads and sevenths, structural Roman identities, and engine/query dependency boundaries
- all 35 chord formulas across natural, sharp, flat and double-accidental roots
- formula length, degree/alteration identity, spelling, pitch class and interval number
- catalogue order, deep freezing, JSON serialization and version-1 query envelopes
- exact formula object identity between catalogue entries and `CHORD_FORMULAS`
- add9 versus sus2, 13 versus 6, diminished-seventh and named spelling fixtures
- canonical M13 versus the registered C3→A3 played M6
- Lab family/quality selection, select-all, clear-all and empty-selection rejection
- engine-derived anchors, targets, windows, reconstructions and transfers across the catalogue
- exact transfer role identity, stable frozen plans and changed consecutive variations
- complete reconstruction through four tones and bounded compound-role reconstruction above four
- delayed reveal labels, wrong-fret chord analysis, timer/reset behavior and static answer-leakage checks
- engine-derived G–C–D7–G and A–D–E7–A four-string candidates
- structural-tone completeness and non-chord-tone rejection for every enumerated candidate
- deterministic nearest-movement scoring, common tones, per-string direction and distance labels
- separate invalid-chord, valid-distant and valid-nearest outcomes
- F#–G and C–B resolution roles/degrees plus transferred G#–A
- progressive hint disclosure, assisted-state cleanup and no answer leakage on replay/back
- physical two-voice deconstruction, A-major transfer, reflection and full restart behavior
- native button keyboard semantics and explicit selected-state accessibility labels
- melody target roles, key degrees, same-pitch chord reinterpretation, approach and phrase paths, A-major transfer and withheld answers
- motif source/adaptation, one-variable changes, intervallic sequence, fragmentation, response, target transfer and ungraded reflections
- ScenarioV1 contract validation (version, schema, keys, chords, bounds), deterministic musical derivation across 6 catalogue entries, UI switching, surprise selection, state cleanup, and answer withholding
- Rule Generator V1 high-volume seed verification (300+ generations), key/fret diversity, quality invariants, negative failure modes, and interactive UI generation controls
- fixed generator string/window policy for every main and transfer region across all difficulties, independently derived target windows, and absence of unsupported region-pool declarations
- generator-version-2 pinned seeded fixtures, fixed-order Fisher–Yates selection, unchanged seed normalization, and exact reproducibility under unchanged engine/query facts
- exhausted distinct-generation UI search preserves accepted material, session progress, selections, and evidence; a recoverable message appears without an unrestricted fallback or answer leakage
- Melody preparation seam verification (`scripts/test-melody-experience.mjs`): DOM-free execution without browser/DOM globals, catalogue preparation across all 3 approved entries, generated scenario preparation determinism and version-2 replay, distinct generation, source convergence to identical PreparedMelodyExperience shape, explicit error semantics (INVALID_REQUEST, UNKNOWN_CATALOGUE_SCENARIO, UNKNOWN_RULE, UNKNOWN_DIFFICULTY, RESOLUTION_FAILURE, GENERATION_FAILURE), no silent fallback between material authorities, and shared query adapter (`createPhraseQueries`) verification

## Phrase Foundation PR 1 — executable acceptance coverage

The normative contract is [PHRASE_FOUNDATION_V1.md](PHRASE_FOUNDATION_V1.md).
These checks exercise the new time/Phrase slice, not Product Spine UI or the
dependent harmony timeline/analysis slice. Full repository gate: `npm run verify`.

| File | Implemented gates |
|---|---|
| `tests/domain/time.test.ts` | T01–T06 exact normalization, tuplets, signed arithmetic, all malformed numeric fields, huge intermediates with safe reduced results, close-fraction comparisons, reduced-result overflow; finite fraction-equivalence/complement loops. |
| `tests/domain/phrase.test.ts` | A01–A09 mandatory rhythm/register/spelling, exact transposition/inverse, contour versus intervals, repetitions/silence and authored clipped crop; A13–A15 twelve registered placement checks, transposition versus relocation and unsupported overlaps. T07/T11–T14/T17–T18 as applicable: empty/count semantics, half-open/silent/zero crops, strict fields, copying/freezing, dense/order/bounds, 10,000/10,001 resource boundary and independent transformation scope. |
| `tests/contracts/phrase-foundation.test.ts` | All eight wrapper facts and success/failure envelopes, JSON/determinism/input ownership, strict requests, oversize early rejection, empty-argument validation, programming-error propagation and collision-safe root exports; T12/T14–T15/T18. |
| `tests/fixtures/phrases.ts` | Hand-authored six-note phrase, interval/contour/transposition/crop expectations and two external placement sidecars. No timeline/analysis or API-derived expected fractions. |
| `tests/contracts/query.test.ts`, `boundaries.test.ts` | Exact 23-method facade and 24 named runtime query exports including `musicQueries`; browser globals trapped for every new wrapper; existing local-only import graph/dependency direction retained. |

A10–A12 and harmonic T08–T10/T16 are reserved for dependent PR 2 and are not
reported as implemented here. Existing Lab, generator-version-2 replay, evidence,
identity, deployment and prototype checks remain regression gates. These automated
checks establish musical/numeric contracts; they do not claim new physical teaching
success. Issue #15's completed four-Lab validation remains accepted.

## Historical Product Spine documentation acceptance — manual checks only

The consolidation adds no runtime behavior or application architecture code and
introduces no new test framework. Its acceptance review must confirm:

- `git diff` contains documentation changes only; existing runtime, tests, and musical capabilities remain intact.
- The canonical architecture distinguishes current implementation from future direction, with explicit Explore/Practice/Apply responsibilities, Experience Router ownership/non-ownership, and context-preserving handoffs.
- Practice Policy governs only explicit Practice; Explore and Apply have no curriculum gates. ScenarioV1 is bounded rather than universal.
- Feature migration, the deferred capability list, and historical-document precedence agree across current guidance.
- The four existing verification commands remain green on the documentation branch.

These are documentation/manual acceptance checks, not newly implemented automated
Product Spine tests. No router, shared workspace state, or new three-intention UI
is claimed to exist.

When later runtime slices are separately authorized, add targeted checks for
supported context/region/focus handoffs, unsupported requests, invalid material,
generation failure recovery, and answer disclosure before/after commitment and
assistance. Reuse existing regression coverage; these future checks are described
here as requirements, not reported as passing tests today.

## Historical v0.2 acceptance examples — reference only

The following examples preserve the original product matrix. Sections 1–4 overlap
current engine facts, but this historical list is not the inventory of executable
tests. CAGED, generic progression handling, the original Explore/Navigate/Harmony
UI, persistent telemetry, PWA/offline behavior, and critical Playwright flows were
historical targets. Bounded current Lab activities and diatonic harmony do not
establish those broader features. Prototype success does not establish legacy UI
correctness or authorize production implementation.

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
