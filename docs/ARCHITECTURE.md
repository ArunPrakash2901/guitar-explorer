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
| Guitar Performance placement | Experimental/review layer above accepted accompaniment; not automatically permanent until learner evidence supports it. |
| Sample-backed acoustic rendering | Experimental/review renderer; not a general sampler or tone system. |
| Precise learner looper | Not implemented. Earlier MediaRecorder prototype is reference UX only. |
| Style runtime, AI runtime, learner model, backend persistence | Not implemented; explicitly deferred pending concrete learner need. |

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

## 13. Deployment boundaries

- `preview`: automatically published exact-head PR review surface.
- `experimental`: opt-in/non-production.
- `stable`: reserved and explicitly controlled; not automatically published.

Do not add another host, production deployment, account system or backend merely for convenience.

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

## 15. Architecture stop condition

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
- GitHub issues/PRs: bounded implementation authority and review evidence.
- Trello: navigation/coordination only.
- Figma: approved visual/product direction where applicable.

Historical plans are references only and do not override these boundaries.
