# v0.2 Implementation Plan

> Archived implementation order. Superseded by `ENGINE_PHASE1.md` and the current
> `ARCHITECTURE.md`. The old UI, CAGED and progression requirements do not expand
> the approved foundation-kernel run.

Codex should execute these phases in order. Do not combine all phases into one giant rewrite.

## Phase 0 — Baseline and repository health

- initialise React + TypeScript + Vite production app
- preserve `prototype/` and `references/`
- add Vitest
- add Playwright
- add formatting/linting with minimal configuration
- add CI for typecheck, unit tests and build
- reproduce the current visual language at a basic level

Exit criteria: production shell builds and tests run.

## Phase 1 — Music/fretboard engine

Implement pure modules for:

- pitch classes and note spelling
- standard guitar tuning
- note-at-position calculation
- interval calculation
- major scale spelling
- major triads
- CAGED major voicings
- I–IV–V–I major progression

Port and improve the tests from `prototype/music.test.js`.

Exit criteria: theory layer is UI-independent and passes the test matrix.

## Phase 2 — Production SVG fretboard

- render six strings and frets 0–15
- clickable/tappable positions
- visual markers independent of theory calculations
- responsive mobile behaviour
- accessible labels for interactive positions

Exit criteria: UI can render arbitrary marker sets and report clicked positions.

## Phase 3 — Explore + Progressive Reveal

Implement:

- key selector
- CAGED shape selector
- Full
- Intervals
- Roots
- Hidden
- Build
- build evaluation and non-revealing feedback

Exit criteria: learner can progress from visible A-major G-shape information to reconstructing it on a blank fretboard.

## Phase 4 — Exercise engine + Navigate

Create typed exercise model and implement:

- Find Note
- Navigate from Anchor
- Complete Triad
- Transfer Function
- mixed exercise generator
- useful wrong-answer feedback

Exit criteria: exercise logic is testable without rendering the UI.

## Phase 5 — Harmony foundation

- selected major key
- I–IV–V–I progression
- stable scale layer
- changing current-chord layer
- manual Previous/Next
- show/hide chord tones
- Practice Current Chord task

Exit criteria: user can identify R/3/5 of the current chord while the key remains visually stable.

## Phase 6 — Local telemetry

- IndexedDB attempt store
- schema versioning
- response-time capture
- JSON export
- no mastery algorithm yet

Exit criteria: real exercises produce durable, exportable evidence.

## Phase 7 — PWA + end-to-end validation

- installable manifest
- offline app shell
- mobile pass
- Playwright critical paths
- no assessment-state answer leaks
- final production build

Exit criteria: v0.2 definition of done from `PRODUCT_SPEC.md` is satisfied.
