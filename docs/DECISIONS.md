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

## D017 — One musical context, with experience before theory compression

The original construction-based Harmony Lab was rejected in physical use. The
Phase 2D engine and contracts remain valuable and unchanged. Practice Session v0
instead uses G/C/D7/Em to connect brief retrieval, expectation, a committed
prediction, contrasting endings, the same melody pitch under changing harmony,
and F#–G before naming the Roman identities. A-major transfer preserves the
curated relationships without reconstructing another whole scale.

The focused Harmony route shares the same frozen lesson plan, page and app, omitting
the warm-up. Listening responses are unscored; reflection is local and temporary.
Home/pressure explanations are curated pedagogy, not inferred engine output.
The proof still needs physical review. No universal curriculum, function/cadence
engine, CAGED, adaptive scheduling, persistence or Phase 2E work is introduced.

## D018 — Prove physical voice-leading pedagogy in the Lab before engine promotion

The Parsimonious Path is a separate Lab route over G–C–D7–G and its A-major
transfer. Existing musical queries remain authoritative for chords, spellings,
locations, degrees, roles and intervals. Lab-local code may enumerate complete
one-note-per-string candidates and rank same-string fret movement because that rule
is the learning probe being tested.

Harmony correctness and movement efficiency are separate judgments. A valid chord
that moves farther than the available minimum remains harmonically correct and is
invited to try again. Hints progress from common tones to stationary strings,
movement directions and one full voicing. The learner must isolate at least two
actual voices after solving the G path, then transfer from an unfamiliar compact A
inversion without seeing the route in advance.

This experiment does not authorize a Core voice-leading/voicing engine, inversions,
harmonic-function analysis, Phase 2E, CAGED, persistence or Learning infrastructure.
Attempts, assistance and elapsed time are temporary description only. Promotion of
any planner concept requires useful physical-guitar evidence and a separately
reviewed domain contract.

## D019 — Share the guitar surface without sharing pedagogy

Fretboard UI v2 uses one Lab-local renderer for physical string/fret geometry,
selection, short labels and position-to-position connections. Consumers supply
the view state after applying their own reveal rules. The renderer never imports
the Music Engine or a session planner and never calculates musical or learning
judgments. It uses native buttons over an SVG neck so fret selection remains
keyboard accessible while movement can be drawn between positions. Earlier
answers are removed from the DOM when the session resets or navigates back.

Parsimonious Path, Chord Lab and Practice warm-up can therefore share one
instrument orientation without making their tasks uniform. The focused Harmony
listening route has no fret-selection task and keeps its existing interaction.

## D020 — Test melodic targeting and motivic continuity as bounded Lab probes

Melody Over Harmony and Develop the Idea reuse the current musical-truth facade
and Fretboard UI v2. The former tests note meaning under changing chords and
deliberate targets; the latter tests whether a tiny identity can survive pitch
changes required by harmony. Their curated choices and reveal rules remain in
`lab/`, with temporary evidence and ungraded listening reflections. The
standalone rhythm/syncopation experiment is intentionally skipped. See
`LAB_PHRASE_PROBES.md` for the exact flows and physical validation questions.

## D021 — Separate musical scenario variability from teaching procedures

ScenarioV1 formalizes the boundary between what a Lab session teaches
(pedagogical flow) and which musical problem it uses (progression, keys, target
roles, guitar regions). The contract declares musical intent and physical
constraints only; it never encodes hardcoded note names or frets.

A Lab-local resolver compiles ScenarioV1 specifications against pure Music
Engine queries, ensuring musical validity, playability within the bounded
guitar region, and relationship preservation across transfer keys before
returning immutable frozen contexts. Melody Over Harmony and Develop the Idea
operate across genuinely distinct musical environments (different keys, triads
vs sevenths, 3-chord vs 4-chord progressions, alternative motif cells, and
different guitar registers) without bespoke branching or answer leakage.

This separation is Lab-local and does not authorize engine promotion,
procedural generation, style packs, curriculum algorithms, adaptive mastery,
audio, or rhythm models.

## D022 — Deterministic rule generation for practice variation

Rule Generator V1 automates the construction of ScenarioV1 Melody scenarios
from declarative educational rules. Instead of hardcoded catalogue entries, the
generator uses seeded PRNG sampling, rejection sampling via resolveScenario,
and a bounded attempt budget to propose valid, playable practice problems.

The generator does not teach, does not bypass ScenarioV1, and does not alter
pure Music Engine truth. The Scenario Resolver remains the objective authority
verifying fret playability, diatonic scale consistency, and transfer interval
invariance. Scoring prioritizes educational preferences (close voice leading,
salient chord roles, compact neck regions) without asserting aesthetic or
stylistic superiority.

This implementation is Lab-local and strictly for Melody practice. It does not
introduce motif generation, rhythm models, genre packs, audio, adaptive student
tracking, or LLM runtime calls.

