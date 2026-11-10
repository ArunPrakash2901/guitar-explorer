# AGENTS.md

This file contains **durable execution rules** for work in Guitar Explorer. It must not duplicate transient queue state.

For current work, waiting-on-Arun state, active issue/PR and merge gates, read [`PROJECT_STATE.md`](PROJECT_STATE.md) first. For machine-readable recovery, read [`project-state.json`](project-state.json) or run `npm run context`. For approval boundaries read [`docs/AUTONOMY_CONTRACT.md`](docs/AUTONOMY_CONTRACT.md). For durable architecture read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Instruction precedence

When instructions disagree, use this order:

1. Arun's explicit current request;
2. the active authorized GitHub issue / PR scope;
3. `PROJECT_STATE.md` / `project-state.json`;
4. this file and `docs/AUTONOMY_CONTRACT.md`;
5. `docs/ARCHITECTURE.md`, `docs/LEARNING_MODEL.md`, `docs/DECISIONS.md` and current test contracts;
6. historical documents.

A lower-level source must never broaden work beyond a higher-level one.

## Product north star

Guitar Explorer connects musical understanding with action on a real guitar. The song-led direction starts from what the learner hears in a specific song and helps them understand, locate, play, vary or transfer the relationship.

Physical usefulness is the product signal. Repository activity, architectural completeness and feature count are not learner mastery.

Do not turn the project into a generic theory app, tab player, DAW, transcription product, AI guitar judge, analytics platform or architecture exercise.

## Permanent architecture boundaries

Keep these responsibilities separate:

- **Music Core:** spelling-aware notes/pitches, intervals, collections, harmony primitives, exact musical time and pure phrase operations. Pure and instrument-independent.
- **Guitar:** standard tuning, physical string/fret geometry and other explicitly authorized instrument facts over Core.
- **Musical Query Interface:** validated deterministic facts from Core + Guitar. No learner state, playback commands or subjective judgment.
- **Material / activity preparation:** supplied musical material for a bounded learner action. Repeated needs must justify shared material contracts.
- **Learner action / experience:** teaching sequence, answer withholding, physical-use instructions, transfer and reflection. Musical validity, task compliance and subjective musical quality are distinct.
- **Guitar performance:** optional physical placement/attack choices above musical truth. A playable voicing does not redefine the chord.
- **Accompaniment:** tempo, meter/bar policy and strumming choices over supplied harmony. These are performance/practice choices, not deterministic theory truth.
- **Audio rendering:** presents prepared pitches/performance events. It does not choose harmony, infer learner correctness or own pedagogy.
- **Audio observation:** future microphone/audio perception must preserve uncertainty. `AudioObservation` is not `MusicalFact`, exercise compliance or human judgment.
- **Style research:** may propose/select material and interpretations with provenance; it never redefines deterministic musical truth.
- **AI:** may propose, explain, transform or compare within explicitly authorized boundaries. It must not launder uncertain interpretation into deterministic fact.

## Learner-facing merge rule

Automated correctness cannot substitute for learner evidence.

For learner-facing, audio-facing, new-phase or otherwise manually validated work:

1. satisfy the bounded issue acceptance criteria;
2. run the authoritative `npm run verify` gate;
3. publish and verify the exact-head GitHub Pages PR preview;
4. give Arun the exact preview and browser test path, with physical-guitar steps when the issue calls for them;
5. wait for Arun's explicit approval of that exact head before merge.

Do not infer physical success from browser automation, CI, screenshots or code review.

## Engine growth rule

Follow:

**learner action → demonstrated missing deterministic fact → smallest engine addition**

If existing Core/Guitar/query facts are sufficient, do not expand the engine.

Do not begin or promote broad harmonic-function classification, generic voicing search, CAGED production logic, meter/groove/articulation/polyphony systems, timed harmony, learner models or new theory breadth merely because they may be useful later.

Phrase Foundation PR 1 is a pure foundation. Further Phrase/Harmony breadth requires a separately authorized learner/material need.

## Material and pedagogy rule

The accepted evidence supports a useful conceptual separation:

**Musical material → learner action → learner experience**

It does **not** justify:

- a universal Exercise Recipe JSON/DSL;
- a permanent generic Context/Constraint layer;
- a general Learning Engine/curriculum graph/router;
- global mastery scoring or adaptive scheduling.

Keep future learning sequences bounded to the musical material and action under study.

## Audio and accompaniment rule

Use one musical clock where timing accuracy matters. Musical time, audio seconds and learning wall-clock time are distinct concepts.

Native Web Audio remains the baseline browser technology unless a bounded issue proves another dependency is needed.

A small sample-backed instrument may be used only with clear provenance/license and a concrete listening/learner purpose. Do not grow a general sampler/SFZ platform, effects suite or amp-modelling system by default.

A precise future looper must not treat MediaRecorder callback timing or ordinary JavaScript timers as authoritative musical boundaries. Preserve useful interaction evidence from earlier prototypes, but separately prove fixed-frame PCM capture/loop length, seam behavior and real-device latency before promotion.

Do not build a DAW, multitrack mixer, automatic beat correction, cloud audio store, transcription or performance grading without separate authorization.

## Style research rule

The 5–10 fragment Style Study is a representation pressure test, not a runtime roadmap.

For source-backed fragments preserve provenance, what is actually heard/seen/documented, supported pitch/rhythm/harmony/technique/placement, transferable interpretation, confidence and what Guitar Explorer can/cannot currently represent.

Repeated real requirements may justify one later bounded representation addition. One awkward fragment does not justify a framework. Heterogeneous gaps are evidence to keep material flexible.

Do not build weighted artist generators, automatic style scoring or a copied-lick catalogue from this research.

## Evidence, privacy and persistence

The physical validation protocol remains available for future learner experiences. Historical Session Evidence and timeline tooling are recoverable from Git history.

Keep evidence local-only unless explicitly authorized otherwise. Do not add telemetry, accounts, backend persistence, mastery inference or learner scoring without a new product decision.

Recorded learner audio is media/observation, not proof of correctness.

## Repository and planning authority

- GitHub `master` = merged implementation/capability authority.
- GitHub issue/PR = one bounded implementation slice and evidence.
- `PROJECT_STATE.md` / `project-state.json` = current operational gate.
- `docs/ARCHITECTURE.md` = durable architecture, not queue status.
- Figma = approved visual/product direction where applicable.
- Trello Project Hub = cross-chat navigation/coordination, not architecture authority.
- Research reports = evidence/input, never blanket implementation authorization.

Update existing Trello cards instead of creating a parallel planning system.

## Development infrastructure

Standing infrastructure includes exact-head PR previews, authoritative `npm run verify`, Physical Validation Protocol v1 and explicit deployment-channel provenance. The current application has a single static entrypoint and compiled engine modules. Retain engine tests and keep retired practice code outside the active build.

Preserve these gates. Do not weaken tests or review boundaries merely to make work mergeable.

Preview is the only automatically published channel. Stable remains explicitly controlled; experimental remains opt-in/non-production unless separately authorized.

## Historical references

Use [the historical index](docs/history/README.md) to recover superseded implementation and product references. The current control plane governs implementation.
