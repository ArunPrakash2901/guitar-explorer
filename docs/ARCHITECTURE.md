# Guitar Explorer architecture

This document defines the **durable product and software boundaries** for Guitar Explorer. It is not the current-work queue. Read `PROJECT_STATE.md` / `project-state.json` for active issues, PRs and approval gates.

## Current baseline

Guitar Explorer connects musical understanding with playing a real guitar.
The engine-first application consists of one static welcome page and compiled
Music Engine modules. The page describes the engine and the direction toward
song-led musical discovery. See [project state](../PROJECT_STATE.md) for scope
and review gates.

| Area | Responsibility |
| --- | --- |
| `src/engine/core/` | Deterministic pitch, spelling, intervals, collections, chords, keys, harmony, exact musical time and Phrase operations. |
| `src/engine/guitar/` | Tuning, string/fret geometry and pitch locations over Core. |
| `src/engine/query/` | Validated, serializable musical facts over Core and Guitar. |
| `src/research/` | A tested source-provenance research contract consuming engine queries, outside the browser build. |
| `lab/index.html` | Self-contained welcome page shared by local serving and static builds. |
| `scripts/serve-lab.mjs` and `scripts/build-preview.mjs` | Local HTTP serving and static packaging with revision and channel provenance. |

The entrypoint has no client runtime dependency. The local server and preview
builder make the compiled public engine available under `engine/`. The preview packages the same welcome page. See [PR previews](PR_PREVIEWS.md) for the build and
publication contract.

## Dependency direction

Query callers consume deterministic facts from the Music Engine. Within the
engine, the query interface depends on Core and Guitar, and Guitar depends on
Core. Browser presentation, musical interpretation and teaching sequences live
outside the engine.

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

Keep future material contracts bounded to the experience that needs them. Do not introduce a universal Exercise Recipe DSL, permanent generic Context/Constraint object or Learning Engine merely to unify shapes.

Use the smallest representation that preserves the facts required by the current learner action.

## 5. Guitar Performance boundary

A chord or pitch collection is not automatically a guitar performance.

Where needed, a Guitar Performance layer may map supplied musical material to curated physical events such as:

- string/fret positions;
- muted strings;
- attack order/direction;
- per-string attack timing;
- bounded release/velocity choices.

This layer sits **above** deterministic chord/pitch truth. A playable voicing must be checked against musical truth but does not redefine it.

The previous curated G/C/D7 placements remain available in Git history. Repeated demonstrated needs would justify a shared voicing or fingering engine.

## 6. Accompaniment boundary

Accompaniment owns bounded practice/performance choices over supplied harmony, such as:

- tempo;
- meter for the supplied exercise;
- bars per chord;
- subdivision/pattern choices;
- down/up/rest strumming actions.

These are not Music Core truths.

The retired Accompaniment v1 is an example of this separation. It used one supplied progression and a small 4/4 eighth-note pattern. A future sequencer, transport or backing-track system would need its own scope.

Musical time and audio seconds remain distinct. Convert to audio scheduling only at the presentation boundary.

## 7. Audio Out

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

## 8. Audio In and looper boundary

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

## 9. Style research and provenance

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

## 10. AI boundary

AI may be useful for research, extraction, proposal, transformation, explanation, comparison and conversational guidance.

AI output must remain distinguishable from:

- deterministic musical computation;
- verified source observations;
- learner performance evidence;
- subjective human musical judgment.

Do not build a broad AI tutor/runtime until a concrete learner action demonstrates that existing deterministic/material boundaries are insufficient.

## 11. Validation and evidence

`npm run verify` is the authoritative repository gate.

Learner-facing/new-phase/audio-facing work also requires exact-head GitHub Pages preview and Arun's explicit physical/browser approval before merge where the issue requires it.

Physical evidence is descriptive. Do not convert hesitation, retries, timing or self-report into a mastery score unless a future explicitly authorized learning model defines that interpretation.

Keep learner evidence local unless sharing is explicitly authorized. The previous recorder and timeline remain in Git history.

## 12. Deployment boundaries

- `preview`: automatically published exact-head PR review surface.
- `experimental`: opt-in/non-production.
- `stable`: reserved and explicitly controlled; not automatically published.

Do not add another host, production deployment, account system or backend merely for convenience.

## 13. Detailed implemented contracts that remain normative

The control-plane cleanup must not erase established lower-level contracts. The following details remain part of the architecture unless their dedicated contract documents are explicitly superseded.

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

Future consumers can choose locations for bounded material from engine/Guitar queries. General inversion, fingering and voicing search require separate contracts.

### Phase 2D — diatonic harmony

`buildDiatonicHarmony` remains pure Core. Explicit major/natural-minor keys construct seven triads/sevenths from spelled scale degrees and match them to authoritative chord formulas.

Roman identity is structural degree + actual quality. It does not itself classify tonic/predominant/dominant function, cadence or expected resolution. Natural-minor requests do not silently raise degree 7.

A listener's sense of home, pressure or expectation belongs to interpretation above Core.

### Phrase Foundation PR 1

`core/time.ts` and `core/phrase.ts` remain pure foundation values/operations.

MusicalTime is exact rational quarter-note length; Phrase is immutable monophonic registered-pitch events with exact onset/duration and mandatory total span. Pure operations cover adjacent intervals, contour, exact transposition, pattern/rhythm comparison and half-open clipping/rebasing.

Guitar placement and harmony remain external. Meter, tempo maps, transport, playback, articulation, polyphony and timed harmony are not smuggled into Phrase PR 1.

Musical quarter lengths, audio scheduling seconds and learning wall-clock timestamps remain distinct.

## 14. What is intentionally not architecture yet

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

## 15. Architecture rules

1. **No automatic destinations.** A capability must serve a proven learner action or shared service before gaining a learner-facing destination.
2. **One authority for musical facts.** Core/Guitar/query derivation remains authoritative; presentation, pedagogy, interpretation and style consume it.
3. **Separate material from teaching procedure.** Reusing musical material does not require a universal activity state machine.
4. **Keep contracts local until reuse is demonstrated.** Guitar performance mappings and other bounded contracts gain a shared interface only when repeated use justifies one.
5. **Separate validity, compliance and judgment.** A musically valid answer may miss an exercise constraint; subjective musical taste is not objective correctness.
6. **Present prepared information.** Renderers and playback adapters do not infer theory, select pedagogy or decide disclosure.
7. **Honor generation/provenance constraints.** Preserve explicit limits, versions, replay information and source uncertainty.
8. **Describe learner evidence precisely.** Screen correctness, assistance, self-reported playing/hearing and future audio evidence are distinct.
9. **Promote experiments only after evidence.** Generalize an algorithm or data shape only after demonstrated reuse and learner value.
10. **Do not confuse research validity with implementation necessity.** A sound external architecture idea is not automatically needed in Guitar Explorer now.

## Sources of authority

- `PROJECT_STATE.md` / `project-state.json`: current operational state.
- `AGENTS.md` + `docs/AUTONOMY_CONTRACT.md`: execution/approval rules.
- this file: durable architecture boundaries.
- `docs/DECISIONS.md`: decision history.
- `docs/LEARNING_MODEL.md`: learning principles.
- `docs/PHYSICAL_VALIDATION_PROTOCOL.md`: physical evidence procedure.
- [Music API](API.md) and [Phrase Foundation](PHRASE_FOUNDATION_V1.md) describe implemented contracts.
- GitHub issues/PRs: bounded implementation authority and review evidence.
- Trello: navigation/coordination only.
- Figma: approved visual/product direction where applicable.

Historical plans are references only and do not override these boundaries.
