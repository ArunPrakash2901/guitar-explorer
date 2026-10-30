# Architecture and Product Decisions

> **Current guidance:** [ARCHITECTURE.md](ARCHITECTURE.md) is the canonical
> Product Spine architecture and distinguishes implemented capabilities from
> future direction. D023–D028 record the current consolidation decisions and take
> precedence where earlier entries conflict. Earlier entries preserve the reasons
> and scope of their original decisions; they do not authorize deferred work.
> The later explicitly approved D030 adds the bounded Phrase Foundation. It does
> not authorize Product Spine runtime/UI work or other deferred capabilities.

## D001 — Build a web/PWA, not a native mobile app

Reason: one codebase works on phone, desktop and tablet; the learning interactions are well suited to browser SVG/touch; offline installation can be added without native-store overhead.

## D002 — React + TypeScript + Vite for production

Reason: enough structure for a long-lived interactive learning product while remaining lightweight. TypeScript is especially valuable for separating pitch, spelling, interval, exercise and UI concepts.

Status: historical long-term UI direction, not approval to migrate the current
Lab. UI framework migration remains deferred under D028.

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
React/Vite was retained as a long-term UI direction, not implementation approval;
UI framework migration remains deferred under D028. CAGED and general progression
capabilities remain later work; subsequent decisions record bounded Lab consumers.
That foundation slice's scope and stop conditions are preserved in ENGINE_PHASE1.md
and GitHub Issue #2; current product scope is defined in ARCHITECTURE.md.

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

The supported guitar envelope is deliberately narrow: target and arrival use
high E (zero-based string index 5), with the first phrase-lead note on B (4) or
high E (5). Main and transfer windows are derived independently from the first
matching target location over frets 0–14: `minFret = max(0, targetFret - 4)` and
`maxFret = min(15, minFret + 7)`. Difficulty changes the approved key pool, not
string/region policy; unused `regionPools` declarations are removed. ScenarioV1's
broader representation does not imply broader generator support.

Generator provenance is version 2, while Rule/Scenario contracts remain V1.
Seeded Fisher–Yates over fixed-order transfer candidates replaces random sorting;
replay requires the same rule, difficulty, seed, generator version, and unchanged
engine/query facts. Version-1 seeded outputs are not promised by version 2.
Exhausted distinct-generation search preserves the current accepted material and
session and reports a recoverable UI failure; it never weakens the distinctness
requirement through an unrestricted fallback.

This implementation is Lab-local and strictly for Melody practice. It does not
introduce motif generation, rhythm models, genre packs, audio, adaptive student
tracking, or LLM runtime calls.

## D023 — One fretboard-first workspace, three user intentions

Guitar Explorer is a fretboard-first musical reasoning environment, not primarily
a course app. One shared musical workspace will support **Explore** ("What
relationships are here?"), **Practice** ("Can I retrieve and use this relationship
independently?"), and **Apply** ("What can I understand and do with this musical
material?"). Explore permits inspection and comparison; Practice constrains and
supports deliberate retrieval; Apply starts from selected musical material.

These are intentions within one application, not separate apps. No capability
gets a learner-facing destination by default. The migration map and current versus
future capability status live in [ARCHITECTURE.md](ARCHITECTURE.md). Existing Lab
URLs remain available during migration and as regression/development surfaces
until replacement behavior is proven. No existing musical capability is deleted.

## D024 — A small Experience Router connects existing capabilities

The future Experience Router preserves selected musical context, interprets the
current intention, selects compatible existing capabilities, prepares material
through the appropriate service, preserves explicit handoff context, and returns
clear unsupported/failure states.

It does not own musical truth or chord/scale derivation, generator grammar,
activity state machines, style taste, learner mastery, fretboard geometry,
playback scheduling, or subjective musical grading. The deterministic engine
remains the musical-fact authority. This is an ownership decision only; no router
implementation is authorized by the documentation consolidation.

## D025 — Practice Policy governs explicit Practice only

Practice Policy replaces the application-wide Pedagogical Governor proposal. It
may select the target relationship, held-constant variables, permitted variation,
support, answer visibility, objective checks, repetition, remediation, and transfer
inside explicit Practice activities. Explore and Apply remain accessible without
XP, levels, unlock trees, or mandatory global prerequisite gates.

Evidence must distinguish objective screen correctness, assistance, self-report,
and any future performed/audio evidence. Existing temporary attempts and elapsed
time do not establish mastery or performed-note correctness. Research cautions
and their implications are recorded in [LEARNING_MODEL.md](LEARNING_MODEL.md).

## D026 — Keep material, teaching procedure, and musical judgment separate

ScenarioV1 remains a bounded contract for compatible Melody/Motif exercise
material, not Guitar Explorer's universal data model. Ordinary Explore tasks may
consume `musicQueries` directly; Apply may use other material representations
later. Do not force every capability through ScenarioV1 or expand it through
future-engine placeholders.

The resolver validates its bounded musical/region constraints; it does not prove
general fingering, performance, or pedagogical effectiveness. Musical validity,
exercise compliance, and musical judgment remain separate: minimum movement is
one exercise constraint, not universal musical quality. Generation must honor
explicit supported constraints and preserve provenance; exhausted search must
not silently weaken those constraints. See D021–D022 for the implemented bounds.

## D027 — Shared presentation consumes prepared material; style supplies knowledge

Future visual and audio presentation both consume prepared musical material.
Audio is a shared presentation/service capability, not a final stage downstream
of a fretboard lesson. Renderer and playback adapters display or sound prepared
information without inferring theory or owning disclosure/assessment policy.

Future Style Packs are knowledge/preferences that may influence target choices,
phrase vocabulary, articulation, rhythmic language, harmonic treatment, and
generated-idea preferences. They are not product modes and do not automatically
become pages. Neither audio nor Style Packs is implemented in this consolidation.

## D028 — Prove the Product Spine before expanding capabilities

The following remain deferred until the Product Spine is proven and later work
is separately authorized:

- Style Pack V1
- Motif Generator
- full audio layer
- learner model
- adaptive scheduling
- arbitrary song/progression import
- Ultimate Guitar-style input
- external AI idea generation
- new standalone Labs
- ScenarioV2
- broad voice-leading engine promotion
- UI framework migration

Experimental algorithms require demonstrated reuse and physical value before
promotion. The current step records architecture and migration direction only:
no Experience Router code, Explore/Practice/Apply UI redesign, new musical
capabilities, or runtime restructuring. Preserve the existing engine, activities,
generation, shared fretboard, and regression coverage while later slices prove
the workspace handoffs described in [ARCHITECTURE.md](ARCHITECTURE.md).

## D029 — Extract Melody material preparation into a DOM-free seam

The senior audit identified that `phrase-app.js` accumulated material-source
selection, query adaptation, scenario preparation, plan creation, and DOM rendering.
`prepareMelodyExperience` in `lab/melody-experience.mjs` extracts the material preparation
pipeline into a DOM-free seam, proving the future Experience Router preparation boundary
for Melody practice without changing learner-facing behavior, fretboard interaction, or
scoring. Catalogue and generated material converge into an identical prepared shape.
Errors (invalid request, unknown catalogue scenario, unknown rule/difficulty, resolution
failure, generation failure) are explicit and never silently switch material authorities.
This implements one narrow preparation seam; the general Experience Router, shared workspace,
Explore/Apply modes, Practice Policy engine, and other activity migrations remain deferred.

## D030 — Exact temporal phrases, separate from harmony and physical realization

On 2026-10-30 Arun approved the Phrase Foundation v1 design handoff and authorized
Foundation PR 1 via Issue #40. Add mandatory onset/duration and total span from the
first Phrase contract, using canonical safe-integer rational quarter lengths and
BigInt intermediate arithmetic. Time is independent of meter, tempo, audio seconds
and learner wall-clock time. A 10,000-event budget bounds computation.

Phrase is a pure monophonic registered-pitch value with owned frozen output,
preserved spelling/repetition/silence, strict new records and existing nested
Pitch semantics. Adjacent intervals, sounding contour, exact transposition,
interval/contour/rhythm comparisons and clipped/rebased temporal fragments reuse
the existing pitch/interval authority. Fragment source indices/clipping flags
retain boundary information without introducing notation/attack semantics.

Harmony and guitar placement are separate. Dependent Foundation PR 2 will finish
v1 with supplied harmonic timelines and overlap analysis; PR 1 publishes no stubs.
No existing Lab migrates or acquires invented timing. This approval does not start
Product Spine UI, techniques, polyphony, import, generation, voicings, audio or a
learner model. Normative semantics: [PHRASE_FOUNDATION_V1.md](PHRASE_FOUNDATION_V1.md).

Issue #15 is complete by Arun's confirmation of all four existing Labs, including
PR #37's transfer regression. Preserve that physical approval without rerunning old
trials. The exact-head automated proof is the review evidence for this pure Core
slice; its unchanged Lab preview makes no new educational/physical claim. Wait for
Arun's review before merge or the next implementation slice.
