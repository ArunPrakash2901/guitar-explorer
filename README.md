# Guitar Explorer

Guitar Explorer is a long-term guitar and musicianship learning system built around one core problem: learning the fretboard and musical relationships without becoming dependent on visual shapes alone.

The project is currently **engine-first**. The production UI, audio, ear training and learning features will be built on top of a tested TypeScript music kernel rather than embedding musical truth inside React components.

## Current status

**Phase 1 — Foundation Kernel: implemented**

The current kernel includes:

- spelling-aware notes and registered pitches
- intervals, inversion and transposition
- major and natural-minor scales
- major, minor, diminished and augmented triads
- configurable tuning and standard guitar tuning
- bounded fretboard location queries
- structured, JSON-compatible musical queries through `musicQueries`
- typed `MusicError` failures for low-level helpers
- strict TypeScript and Vitest coverage
- regression checks for the preserved behavioural prototype

Phase 1 deliberately does **not** include CAGED production logic, broader harmony, audio, ear training, learning telemetry or React integration. See `docs/ENGINE_PHASE1.md` for the approved boundary and acceptance criteria.

## Verify the foundation kernel

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run typecheck
npm test
npm run test:prototype
```

Import `src/engine/index.ts` from a TypeScript consumer. See:

- `docs/API.md` for query examples
- `docs/ARCHITECTURE.md` for module boundaries and dependency direction
- `docs/ENGINE_PHASE1.md` for Phase 1 scope and acceptance

## Architecture

The engine keeps musical truth separate from presentation and learner state.

```text
Application / future React
        |
        +--> Musical Query Interface --> Music Core
        |                           \--> Guitar Engine --> Music Core
        |
        +--> future Learning Engine --> Core / Guitar / Ear
        |
        +--> future Browser Audio --> pure Audio plans
```

Key principles:

- Music Core remains instrument-independent.
- Guitar geometry is built on Core rather than defining musical truth.
- CAGED is a future guitar representation, not the fretboard model itself.
- Ear training remains instrument-independent; combined tasks such as hear → identify → find are composed by the Learning layer.
- `musicQueries` is the musical-truth query surface. Learner history will use a separate future learning query surface.
- A future rhythm/time domain is reserved architecturally but is not implemented yet.

## Roadmap

1. **Foundation kernel** — implemented
2. **Theory breadth** — keys, signatures, fifths, broader scales/chords, diatonic harmony and relationship analysis
3. **Guitar representations** — maps, triad voicings, inversions, CAGED and position connectivity
4. **Learning engine extraction** — deterministic exercises, evaluation, assistance and evidence contracts
5. **Audio and ear training** — playback plans, browser audio and auditory exercise families
6. **Production integration and stabilization** — React/PWA consumers, persistence and end-to-end verification

The roadmap is intentionally incremental. Each phase should pass its own tests and acceptance criteria before later phases begin.

## Prototype and historical references

The dependency-free prototype remains in `prototype/` as a behavioural reference and regression source. It is not wired to the new kernel and retains its known limitations.

The exact original package is preserved in `references/approved-v0.2-handoff.zip`.

The former v0.2 UI-first handoff has been moved to `docs/history/V0_2_HANDOFF.md`. It provides historical product context only and no longer defines the implementation order.

## Product principle

Anything the learner can currently see should eventually become something they have to retrieve, reconstruct, transfer or use in musical context.

That principle will guide future fretboard, harmony, ear-training and improvisation features built on top of the engine.
