# Guitar Explorer architecture

This document defines the **durable product and software boundaries** for Guitar Explorer. It is not the current-work queue. Read `PROJECT_STATE.md` / `project-state.json` for active issues, PRs and approval gates.

## Product definition

Guitar Explorer is a fretboard-first musical reasoning and practice environment that helps a guitarist hear relationships, understand their role, locate them physically, manipulate them, create with them, improvise and transfer them into new contexts.

It is not primarily a course app and should not become a generic theory app, tab player, DAW, transcription system, AI guitar judge or architecture showcase.

The core design question is always:

> What can the learner hear, understand, find, play, create, improvise or transfer more reliably after this experience?

## Current implemented baseline

Merged `master` has established the following durable capabilities:

| Capability | Architectural status |
|---|---|
| Music Core + Guitar + `musicQueries` | Implemented deterministic foundation through Phase 2D. |
| Exact musical time + monophonic Phrase | Implemented by Phrase Foundation PR 1; pure, additive and consumer-independent. |
| Existing Labs / ScenarioV1 / bounded Melody generation | Implemented validation and learner-experience infrastructure. ScenarioV1 remains Melody/Motif-local, not universal. |
| Product Spine v1 / Harmonic Gravity | Implemented and physically accepted: Instrument Desk, temporary PLAY Focus Mode, staged disclosure, tiny phrase use and transfer. |
| Role Lens v0 | Implemented and physically accepted: one supplied material supports distinct learner actions without a universal recipe/context framework. |
| Audio Out v0.5 | Implemented and physically accepted: learner-controlled tempo, native plucked-string playback, staggered strums and explicit single-note plucks. |
| Accompaniment v1 | Implemented and physically accepted: supplied harmony plus bounded tempo, bars-per-chord and down/up/rest strumming choices. |
| Guitar Performance placement | Closed unmerged reference; selectively reuse curated physical mappings when a Practice task needs them. |
| Sample-backed acoustic rendering | Closed experiment provides reference assets/renderer for fresh Productization children; not a general sampler or tone system. |
| Precise learner looper | Not implemented. Earlier MediaRecorder prototype is reference UX only. |
| Style runtime, AI runtime, learner model, backend persistence | Not implemented; explicitly deferred pending concrete learner need. |

## Practice product boundary

Learner-facing work composes Home → generated session → one Practice Runtime → physical action → variation → transfer → completion. Implementation/Lab names are not product information architecture. Keep legacy routes for reference/regression while moving useful actions into local recipes and shared tools.

Material generation consumes Music Engine truth; a small recipe owns the action/disclosure/transfer invariant; a simple composer orders prepared rounds; the runtime owns view/state and presents prepared fretboard/audio data. These are ordinary modules, not a universal learning DSL, curriculum graph or mastery engine. Only expose focus filters and tools that actually work.

Sampled guitar is the normal sound in new Productization Practice. Keep native synthesis as legacy/developer infrastructure, not a silent product fallback. Renderer failure should be visible/retryable; physical practice remains possible. Per-string sample coverage constrains supported material explicitly and must not redefine musical truth.

## Dependency direction

The preferred dependency direction is:

```text
Learner experience / page
        ↓
activity material + learner action
        ↓
queries / guitar placement / accompaniment choices
        ↓
Music Core + Guitar geometry

optional presentation consumers:
visual fretboard / native audio / sampled audio
```

Musical truth flows outward. Browser/audio/learner code must not become a second source of musical truth.

One TypeScript package and ordinary module boundaries remain sufficient. No service split, backend, dependency-injection container, plugin framework or framework migration is justified by current needs.

## 1. Music Core

Core owns instrument-independent deterministic musical values and pure operations, including:

- written notes and accidentals;
- registered pitches and sounding semitones;
- intervals and formulas;
- scales/collections and chord formulas;
- conventional major/natural-minor diatonic harmony already implemented;
- exact rational musical time;
- immutable monophonic Phrase values and pure phrase operations.

Core must not own:

- guitar fingering;
- playback;
- learner state;
- exercise stages;
- accompaniment taste;
- style interpretation;
- audio observations;
- subjective musical quality.

“Deterministic” means deterministic computation from supplied inputs/assumptions. It does not make an uncertain human analysis of key, style or tonic automatically true.

## 2. Guitar geometry

Guitar owns instrument-specific physical geometry over Core:

- tuning;
- string order;
- fret positions;
- note-at-position and location queries;
- bounded physical geometry explicitly required by learner tasks.

Playable voicing choices, fingering strategy, CAGED, 3NPS and ergonomic search are **not automatically Core/Guitar truth**. They should remain local/curated until repeated learner needs justify promotion.

## 3. Musical Query Interface

`musicQueries` exposes validated JSON-compatible facts derived from Core + Guitar.

It may expose deterministic musical relationships and locations. It must not expose:

- playback commands;
- session/mastery state;
- learner history;
- subjective style judgments;
- probabilistic microphone detections as certain facts.

Future evidence/history queries, if ever justified, belong outside the musical query surface.

## 4. Musical material and learner action

The accepted learner evidence supports this conceptual separation:

```text
Musical material → learner action → learner experience
```

One supplied material can support different useful actions: prediction, role noticing, locating, phrase creation, variation and transfer.

This does **not** require one universal runtime schema.

Existing material contracts may remain bounded to the experiences that need them. Do not introduce a universal Exercise Recipe DSL, permanent generic Context/Constraint object or Learning Engine merely to unify shapes.

Use the smallest representation that preserves the facts required by the current learner action.

## 5. Product Spine and experience structure

The implemented Instrument Desk provides a shared workspace direction. Temporary Focus Mode is appropriate while the learner is physically playing.

The durable interaction principles are:

- preserve the musical question and relevant context;
- prediction before explanation where appropriate;
- keep answers withheld until the learner has made the intended attempt;
- connect hearing to physical location/use;
- include transfer rather than stopping at identification;
- keep subjective reflections ungraded;
- avoid global curriculum locks, XP trees or mastery assumptions.

There is currently **no general Experience Router or extracted Practice Policy framework**. Existing experiences may keep local planners/state. Introduce a shared router/policy only after repeated real duplication demonstrates value.

## 6. Guitar Performance boundary

A chord or pitch collection is not automatically a guitar performance.

Where needed, a Guitar Performance layer may map supplied musical material to curated physical events such as:

- string/fret positions;
- muted strings;
- attack order/direction;
- per-string attack timing;
- bounded release/velocity choices.

This layer sits **above** deterministic chord/pitch truth. A playable voicing must be checked against musical truth but does not redefine it.

Do not promote current curated G/C/D7 placement into a universal voicing/fingering engine without repeated need.

## 7. Accompaniment boundary

Accompaniment owns bounded practice/performance choices over supplied harmony, such as:

- tempo;
- meter for the supplied exercise;
- bars per chord;
- subdivision/pattern choices;
- down/up/rest strumming actions.

These are not Music Core truths.

The accepted Accompaniment v1 intentionally uses one supplied progression and a small 4/4 eighth-note pattern. It proves the boundary; it does not authorize a general sequencer, transport, groove engine or backing-track system.

Musical time and audio seconds remain distinct. Convert to audio scheduling only at the presentation boundary.

## 8. Audio Out

Audio Out is a presentation consumer of already prepared musical/performance events.

Its responsibilities may include:

- scheduling on the Web Audio clock;
- rendering single pitches and chord/performance attacks;
- stopping/restarting playback;
- selecting between bounded rendering implementations where explicitly authorized.

It must not:

- select harmony;
- infer style;
- decide learner correctness;
- own exercise sequencing;
- become a DAW/mixer.

Native Web Audio is the baseline technology.

A small sample-backed instrument is acceptable when:

- source/license/provenance are clear;
- only the needed asset set is included;
- it serves a concrete learner/listening question;
- a broader sampler architecture is not smuggled in.

A minimal common interface such as `play(performanceEvents)` / `stop()` may be introduced only if actual renderer reuse earns it. Do not build a plugin system around it.

Tone/amp modelling is not on the critical path. Acoustic samples should not be used as a pretext to build an amp simulator. Revisit tone only with an appropriate clean/DI source and a concrete learner purpose.

## 9. Audio In and looper boundary

Audio capture/perception has a different epistemic status from deterministic music facts.

Preserve:

```text
AudioObservation ≠ MusicalFact ≠ ExerciseCompliance ≠ HumanJudgment
```

The earlier MediaRecorder looper prototype proved useful interaction ideas but did not establish a precise musical timing architecture.

A future precise looper should be separately scoped around:

```text
Accompaniment timing
      ↓
shared AudioContext clock
      ↓
count-in / capture boundary
      ↓
AudioWorklet fixed-frame PCM capture
      ↓
AudioBuffer loop playback
```

Required proof before promotion:

- exact/fixed capture length;
- stable repeated loop duration without accumulating drift;
- acceptable loop seam behavior;
- real microphone/interface input-latency observations.

Frame-accurate buffer length does not imply latency-free player alignment. Do not silently auto-correct or grade performances.

No multitrack DAW, waveform editor, cloud audio storage, automatic beat correction, transcription or AI audio judgment is implied.

## 10. Style research and provenance

Style research is currently a source-backed representation pressure test.

For external musical material, preserve enough provenance to distinguish:

- source/documented observation;
- supplied analytical assumption;
- deterministic derived fact;
- human/AI interpretation;
- pedagogical use.

Do not force every internal note/chord object to carry provenance when it is unnecessary. Attach provenance where source-backed/uncertain material requires it.

Repeated representation needs may justify one bounded extension such as timed harmony, articulation, polyphony or phrase-level placement. One difficult fragment does not justify a framework.

Style knowledge may propose/select material and interpretations; it never redefines Music Core truth.

## 11. AI boundary

AI may be useful for research, extraction, proposal, transformation, explanation, comparison and conversational guidance.

AI output must remain distinguishable from:

- deterministic musical computation;
- verified source observations;
- learner performance evidence;
- subjective human musical judgment.

Do not build a broad AI tutor/runtime until a concrete learner action demonstrates that existing deterministic/material boundaries are insufficient.

## 12. Validation and evidence

`npm run verify` is the authoritative repository gate.

Learner-facing/new-phase/audio-facing work also requires exact-head GitHub Pages preview and Arun's explicit physical/browser approval before merge where the issue requires it.

Physical evidence is descriptive. Do not convert hesitation, retries, timing or self-report into a mastery score unless a future explicitly authorized learning model defines that interpretation.

Session Evidence remains local-only validation tooling, not telemetry or a learner database.

## 13. Deployment and app packaging boundaries

The browser application remains the primary UI and music-engine consumer.
Packaging for a Windows or Android **personal install** is a distribution
adapter, not a new engine or learner-experience implementation.

- `scripts/build-preview.mjs` produces the static site assets from the
  existing Lab and compiled engine; `npm run app:build` selects a
  Chord Progressions first screen for offline-capable app containers.
- `packaging/windows/` contains the isolated Electron host and NSIS Windows
  setup metadata. It may manage its window, navigation and local asset protocol,
  but must not copy music facts or replace the Web Audio musical clock.
- `packaging/android/` contains the Capacitor project definition. Android
  phone and tablet share a responsive web UI and packaged local assets.
  Platform-specific permissions and WebView behaviour need device verification.
- `lab/manifest.webmanifest` and `lab/sw.js` provide installability
  and bounded web-shell caching; sample audio is excluded from PWA offline
  caching unless a later explicit storage/rights/size review approves it.
- `.github/workflows/build-personal-installers.yml` is the build,
  attachment and GitHub pre-release automation. Its existence is not
  proof that the build or upload ran. A missing GitHub Release is a
  release-blocker fact, not a documentation omission.

Do not classify any of the above as **published** until the exact GitHub
release is visible with valid binaries and the intended devices have been tested.

Deployment channels are distinct from native packaging:

- `preview`: exact-head PR review surface. A configured workflow does
  not guarantee a deployed preview; check the live Actions result and URL.
- `experimental`: opt-in/non-production.
- `stable`: reserved, separately approved; never automatically published
  by a personal installer build.

`master` is merged implementation authority. A PR merged into its *stack
parent* is not thereby merged into `master`, and draft feature PRs remain
unvalidated until their own review gates are satisfied. Read
`PROJECT_STATE.md` and `docs/PERSONAL_INSTALLER_RELEASE.md` for operational
state rather than freezing it in this architecture document.

Do not add production hosting, analytics, an account system, a backend
or a new UI framework merely to ship personal binary packages.

## 14. Detailed implemented contracts that remain normative

The control-plane cleanup must not erase established lower-level contracts. The following details remain part of the architecture unless their dedicated contract documents are explicitly superseded.

### ScenarioV1 and material preparation

ScenarioV1 remains a **Lab-local** contract for compatible Melody/Motif exercises, not Guitar Explorer's universal data model.

It preserves:

- explicit main/transfer keys and bounded guitar regions;
- declared chord-role targets and arrivals that must resolve in the supplied regions;
- activity-specific Melody and Motif structures;
- query-derived spelling/location/interval facts;
- transfer invariance checks;
- a distinction between physical existence in a region and general fingering/playability.

The plain scenario is serializable; the resolved runtime bundle may contain query closures and is not a persistable workspace document. See `SCENARIO_V1.md` for the exact contract.

`prepareMelodyExperience(...)` remains a Melody-specific DOM-free preparation seam that converges approved catalogue and generated sources before the existing Melody plan. It does not authorize a general Experience Router.

### Rule Generator V1

Rule Generator V1 proposes Melody ScenarioV1 material only. It validates through the resolver, applies bounded preferences and returns provenance with the accepted material.

Generator provenance/versioning, deterministic seeded ordering, pinned replay fixtures, bounded generation budgets and explicit exhaustion behavior remain normative. No silent fallback to unrestricted generation is allowed. See `RULE_GENERATOR_V1.md` for exact behavior.

### Musical values and context

- Note identity preserves spelling separately from sounding equivalence.
- Pitch adds register; sounding semitone numbers are derived, not the identity itself.
- Intervals retain signed letter/semitone displacement.
- Formula tones retain actual degree and alteration.
- Key, selected scale and current chord remain independent context concepts.
- Key-relative alteration and formula alteration are distinct.
- Sounding membership and exact spelling membership are reported separately.

See `API.md` for detailed numeric/resource conventions and public query semantics.

### Phase 2A — key relationships

Conventional signatures derive from a fifths-axis model; minor reaches that axis through relative major. Relative keys and fifths neighbours retain spelling-aware interval relationships.

Signature/profile requests beyond the supported conventional range remain unsupported. The engine does not infer a unique key from unordered notes or a progression.

### Phase 2B — scale breadth/context

Implemented scale formulas include harmonic minor, ascending melodic minor, major/minor pentatonic, minor blues and the remaining major-scale modes.

Selected-scale analysis preserves written-degree evidence separately from sounding pitch-class membership, including omitted or repeated formula-degree situations. Key analysis remains the approved major/natural-minor seven-degree contract.

### Phase 2C — chord catalogue and physical planning

`CHORD_FORMULAS` remains the single theory authority for the approved chord formulas. Catalogue metadata must not redeclare formulas.

Compound chord roles such as 9, 11 and 13 remain abstract formula identities even when a selected registered guitar location lies within a simple octave. Played registered intervals are separate derived facts.

Lab planners may choose bounded material and actual locations from engine/Guitar query results, but no inversion/fingering/voicing engine is implied.

### Phase 2D — diatonic harmony

`buildDiatonicHarmony` remains pure Core. Explicit major/natural-minor keys construct seven triads/sevenths from spelled scale degrees and match them to authoritative chord formulas.

Roman identity is structural degree + actual quality. It does not itself classify tonic/predominant/dominant function, cadence or expected resolution. Natural-minor requests do not silently raise degree 7.

Curated home/pressure/expectation language in learner experiences is pedagogy/interpretation, not a new Core harmonic-function API.

### Lab-local voice-leading probe

The Parsimonious Path / voice-leading Lab keeps its bounded candidate enumeration and same-string fret-distance comparison under `lab/`. It is not a generic Core voicing, fingering, inversion, progression or voice-leading model.

Promotion requires demonstrated reuse and physical value plus an explicitly reviewed contract.

### Shared fretboard presentation

`lab/fretboard-view.mjs` / shared fretboard CSS remain presentation surfaces. Consumers prepare positions, labels, selection state and optional directed connections before rendering.

The renderer must not infer pitches, chord roles, scale degrees, hints, candidate voicings, movement efficiency or learner evidence. Disclosure remains owned by the experience.

### Phrase Foundation PR 1

`core/time.ts` and `core/phrase.ts` remain pure foundation values/operations.

MusicalTime is exact rational quarter-note length; Phrase is immutable monophonic registered-pitch events with exact onset/duration and mandatory total span. Pure operations cover adjacent intervals, contour, exact transposition, pattern/rhythm comparison and half-open clipping/rebasing.

Guitar placement and harmony remain external. Meter, tempo maps, transport, playback, articulation, polyphony and timed harmony are not smuggled into Phrase PR 1.

Musical quarter lengths, audio scheduling seconds and learning wall-clock timestamps remain distinct.

## 15. What is intentionally not architecture yet

Do not build these without a separately justified learner/material need:

- general Learning Engine / curriculum graph;
- universal Exercise Recipe or Context DSL;
- broad Experience Router;
- mastery/adaptation/telemetry backend;
- generic voicing/fingering solver;
- full Style Pack runtime/generator;
- broad timed-harmony/meter/groove/articulation/polyphony framework;
- SFZ/SoundFont sampler platform;
- amp/effects suite;
- DAW/multitrack transport;
- automatic transcription or microphone grading;
- broad AI tutor/runtime;
- React/framework migration;
- broad song import.

## 16. Architecture rules

1. **No automatic destinations.** A capability must serve a proven learner action or shared service before gaining a learner-facing destination.
2. **One authority for musical facts.** Core/Guitar/query derivation remains authoritative; presentation, pedagogy, interpretation and style consume it.
3. **Separate material from teaching procedure.** Reusing musical material does not require a universal activity state machine.
4. **Keep local contracts local until reuse is demonstrated.** ScenarioV1, voice-leading probes, Guitar Performance mappings and other bounded contracts do not become global architecture by default.
5. **Separate validity, compliance and judgment.** A musically valid answer may miss an exercise constraint; subjective musical taste is not objective correctness.
6. **Present prepared information.** Renderers and playback adapters do not infer theory, select pedagogy or decide disclosure.
7. **Honor generation/provenance constraints.** Preserve explicit limits, versions, replay information and source uncertainty.
8. **Describe learner evidence precisely.** Screen correctness, assistance, self-reported playing/hearing and future audio evidence are distinct.
9. **Promote experiments only after evidence.** Generalize an algorithm or data shape only after demonstrated reuse and learner value.
10. **Do not confuse research validity with implementation necessity.** A sound external architecture idea is not automatically needed in Guitar Explorer now.

## 17. Architecture stop condition

The platform is sufficiently mature when Guitar Explorer can reliably support this loop without new broad infrastructure:

```text
supplied musical relationship
→ believable optional guitar playback
→ editable accompaniment
→ learner physical performance
→ optional reliable recording/looping
→ target-note / relationship navigation
→ improvisation
→ transfer
```

Once that workflow is stable, freeze broad platform work and prioritize learner capability rather than continuing to elaborate infrastructure.

## Sources of authority

- `PROJECT_STATE.md` / `project-state.json`: current operational state.
- `AGENTS.md` + `docs/AUTONOMY_CONTRACT.md`: execution/approval rules.
- this file: durable architecture boundaries.
- `docs/DECISIONS.md`: decision history.
- `docs/LEARNING_MODEL.md`: learning principles.
- `docs/PHYSICAL_VALIDATION_PROTOCOL.md`: physical evidence procedure.
- `API.md`, `SCENARIO_V1.md`, `RULE_GENERATOR_V1.md`, `PHRASE_FOUNDATION_V1.md`: detailed bounded contracts.
- GitHub issues/PRs: bounded implementation authority and review evidence.
- Trello: navigation/coordination only.
- Figma: approved visual/product direction where applicable.

Historical plans are references only and do not override these boundaries.
