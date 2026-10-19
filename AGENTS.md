# AGENTS.md

## Approved scope override — Music Engine through Phase 2B

The user-approved Music Engine plan supersedes the historical v0.2 implementation
order, `src/music` layout, and UI-first kickoff below. Phase 1 plus Issue #2 slices
2A and 2B implement `src/engine/{core,guitar,query}`: the foundation kernel,
conventional key relationships, broader scale formulas and generalized selected-
scale contextual analysis.

Do not begin Issue #2 slice 2C, CAGED, broader harmony, Audio, Ear, Learning,
storage, React or rhythm implementation without later authorization. Do not add
future-engine placeholders. Do not introduce bitsets, fretboard graphs, caching or
adaptive-learning infrastructure without a concrete later requirement.
The preserved prototype remains a reference, not the production implementation.

Permanent boundaries: Ear is instrument-independent (Core + pure Audio contracts).
Learning composes Ear + Guitar for auditory-to-fretboard tasks. Musical queries
expose musical truth only; future evidence/history queries belong to a separate
Learning Query Interface. Musical time, audio seconds and learning wall-clock time
remain separate. See the current architecture for documentation-only extensions.

Scale formulas are structured degree/alteration values. Selected-scale analysis
must preserve written-degree evidence separately from sounding membership; omitted
and repeated formula degrees are explicit data, not errors or implicit choices.
Key analysis remains the existing seven-note major/natural-minor contract.

Verify with `npm run typecheck`, `npm test`, and `npm run test:prototype`. Stop after
Phase 2B. The exact original handoff is in `references/approved-v0.2-handoff.zip`.

## Historical v0.2 instructions (subject to the override above)

These instructions are binding for coding agents working in this repository.

## Read first

Before changing code, read these files in order:

1. `docs/LEARNING_MODEL.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/V0_2_PLAN.md`
5. `docs/TEST_MATRIX.md`
6. `docs/DECISIONS.md`

The product is an educational system, not a guitar-diagram catalogue. The learning model has priority over feature novelty.

## Core rule

Do not add a feature merely because it is common in guitar apps. A feature belongs only if it improves independent fretboard reconstruction, interval understanding, transfer across keys/positions, or playing in harmonic context.

## Scope discipline

v0.2 contains only:

- production fretboard/music engine
- Explore mode with Progressive Reveal
- Navigate mode with the first exercise families
- Harmony foundation with I–IV–V–I and current-chord target exercises
- local learning-event telemetry
- responsive/PWA-capable UI
- automated musical correctness tests

Do **not** add in v0.2:

- AI tutor or LLM calls
- microphone/audio transcription
- backing-track generation
- tuner
- metronome
- song library
- social features
- cloud accounts or backend database
- modes library
- giant chord encyclopaedia
- gamification points/streaks unless later specified

## Production architecture

Refactor the behavioural prototype into React + TypeScript + Vite. Keep musical logic pure and UI-independent.

Required separation:

- `src/music/` — deterministic music theory and fretboard calculations
- `src/learning/` — exercise definitions, generation, evaluation and difficulty
- `src/components/` — reusable UI and SVG fretboard rendering
- `src/modes/` — Explore, Navigate, Harmony orchestration
- `src/storage/` — IndexedDB telemetry only

Never hardcode theory answers inside React components.

## Educational behaviour

1. Guidance moves from Full → Intervals → Roots → Hidden → Build.
2. Hover must not leak answers during assessment states.
3. Wrong answers should be described musically when possible, e.g. “You chose D, the perfect 4th of A,” not merely “Wrong.”
4. Difficulty is primarily reduced assistance and increased transfer, not shorter timers.
5. Every important learned structure must be transferable to another key or location.
6. Harmony mode must distinguish the stable key/scale from the changing current chord.
7. The system should never imply that scale patterns alone constitute improvisation.

## Musical correctness

Educational correctness is safety-critical for this product. Tests must cover note spelling, intervals, chord construction, fretboard tuning and CAGED transposition before UI work is considered complete.

Enharmonic spelling matters. Examples:

- F# major = F# A# C#, not F# Bb C#
- Bb major = Bb D F
- C# major scale includes E# and B#

## Workflow

- Work one phase from `docs/V0_2_PLAN.md` at a time.
- Run tests before and after each phase.
- Prefer small, reviewable commits.
- If the prototype conflicts with the written specification, the written specification wins unless the product owner says otherwise.
- Do not redesign the visual language gratuitously. Preserve the dark, low-distraction reference aesthetic and improve accessibility/responsiveness as needed.
