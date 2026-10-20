# Architecture and Product Decisions

## D001 — Build a web/PWA, not a native mobile app

Reason: one codebase works on phone, desktop and tablet; the learning interactions are well suited to browser SVG/touch; offline installation can be added without native-store overhead.

## D002 — React + TypeScript + Vite for production

Reason: enough structure for a long-lived interactive learning product while remaining lightweight. TypeScript is especially valuable for separating pitch, spelling, interval, exercise and UI concepts.

## D003 — SVG fretboard

Reason: precise scalable geometry, touch/click hit regions and layered marker rendering are easier to reason about than a canvas for this product.

## D004 — No backend in v0.2

Reason: the main risk is pedagogical usefulness, not cloud architecture. Local IndexedDB is enough to validate the learning loop.

## D005 — Raw learning evidence before mastery scores

Reason: premature scoring can create false confidence. Store attempts first; infer mastery only after enough real usage data exists.

## D006 — Private GitHub repository during active build

Reason: clean Codex workflow and freedom to refactor. Publication can happen when the product has a stable identity and correct musical behaviour.

## D007 — Keep the current dark visual language

Reason: it already provides a focused, instrument-like interface. v0.2 should improve usability, not spend engineering time on a gratuitous redesign.

## D008 — Behavioural prototype is disposable

Reason: `prototype/` proves interaction ideas quickly. Production code should not inherit its all-in-one DOM architecture.

## D009 — Foundation kernel supersedes the legacy UI-first kickoff

The user approved one TypeScript package under src/engine/{core,guitar,query}.
React/Vite remains the eventual UI direction; CAGED and progressions are later work.
Current scope and stop conditions are in ENGINE_PHASE1.md and GitHub Issue #2.

## D010 — Ear is instrument-independent

Ear will depend on Core and pure Audio contracts. Learning composes Ear + Guitar
for hear → identify → find. No direct Ear → Guitar dependency is allowed.

## D011 — Separate time and learner-query extension points

Future meter/beats/duration/subdivision/harmonic rhythm belong to a pure musical
time domain distinct from Audio seconds and Learning wall-clock time. Musical
queries remain learner-independent; evidence/history will use a separate Learning
Query Interface. Both extension points remain documentation-only.

## D012 — Bounded source-only kernel

Default board is standard tuning through fret 15; callers supply other tunings and
fret limits. Enumeration has a 10000-position budget before pitch filtering. Only
working operations are exported. The original prototype remains standalone and its
exact original archive is preserved under references/.

## D013 — Key signatures are relational, with a conventional display boundary

Keys, relatives and fifths neighbors are constructed from spelled intervals and
transposition. A signed fifths position selects the conventional alteration count,
and alteration order is generated algorithmically rather than stored as complete
per-key signature tables. Signature/profile queries support -7..7 and return
UNSUPPORTED outside that range; relative and fifths relationships remain valid.

Phase 2A adds focused musical-truth queries plus getKeyProfile as their convenience
composition.

## D014 — Scale analysis separates written-degree references from sounding membership

Phase 2B extends the scale catalog without creating per-scale query methods. Scale
formulas remain frozen structured `{ degree, alteration }` values and are resolved
through the existing spelling-aware transposition pipeline.

Selected-scale analysis may encounter a written degree that is omitted (for example
degree 4 in major pentatonic) or represented more than once (the flat-five and
perfect-five references in minor blues). `ScaleRelation` therefore exposes an
explicit `referenceStatus`, ordered `degreeReferences`, nullable
`alterationFromScale`, and independent pitch-class `matchingTones`.

The nullable field is an intentional TypeScript contract change: existing
major/natural-minor runtime answers remain numeric, while consumers must handle
`null` when a selected scale has no unique written-degree reference.

Key analysis deliberately retains the existing seven-note major/natural-minor
contract. Sounding membership never replaces spelled identity. Phase 2C and later
theory breadth remain separate implementation runs; no bitset, graph, caching or
adaptive-learning infrastructure is introduced merely for scale breadth.

## D015 — One chord-formula authority; physical intervals remain registered facts

Phase 2C keeps `CHORD_FORMULAS` as the sole declaration of chord formula truth.
Catalogue metadata contains only identity and presentation fields, and the query
attaches those existing formula objects. Compound degrees 9, 11 and 13 are retained
because add-tone and extension roles are part of chord identity, not display aliases
for 2, 4 and 6.

The Chord Lab distinguishes that canonical formula interval from the registered
interval sounded by its frozen fretboard locations. It creates physical constraints
only after the Guitar engine returns valid locations, then freezes the anchor,
target, string and window. Transfers preserve the exact role. Long formulas remain
complete in Core while physical reconstruction is bounded to four structural roles.

The catalogue deliberately excludes dominant-7-sharp-11 and dominant-7-flat-13
identities until a later chord-language policy can define their implied natural
extensions without ambiguity. Inversions, voicings, CAGED and progression meaning
remain separate models rather than properties inferred by the catalogue.

## D016 — Diatonic Roman identity is structural, not harmonic function

Phase 2D derives triads and sevenths by stacking written scale thirds under an
explicit major or natural-minor key, then matching canonical `CHORD_FORMULAS`.
Roman records retain degree and actual canonical quality with a derived display
label. They neither assert harmonic function nor predict resolution. Natural-minor
requests retain the unraised seventh and minor fifth-degree chord.

The query remains independent of key-signature display limits and of learner state.
The separate bounded Harmony Lab proves a consumer without changing the Chord Lab
or adding a curriculum/exercise framework. Function, progression/cadence analysis,
common/nearest/guide tones, voice leading, guitar voicings/inversions/CAGED, audio and
Learning infrastructure remain deferred. Phase 2E requires separate authorization.
