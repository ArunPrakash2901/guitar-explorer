# Guitar Explorer

Guitar Explorer is a long-term guitar and musicianship learning system built around one core problem: learning the fretboard and musical relationships without becoming dependent on visual shapes alone.

The project is currently **engine-first**. The production UI, audio, ear training and learning features will be built on top of a tested TypeScript music kernel rather than embedding musical truth inside React components.

## Current status

**Phase 1 — Foundation Kernel: implemented**

**Phase 2A — Keys, signatures, relatives and fifths: implemented**

**Phase 2B — Scale catalog and contextual scale analysis: implemented**

The current kernel includes:

- spelling-aware notes and registered pitches
- intervals, inversion and transposition
- major and natural-minor scales
- harmonic minor and ascending melodic minor
- major/minor pentatonic and minor blues
- Dorian, Phrygian, Lydian, Mixolydian and Locrian
- generalized scale-context analysis for omitted and repeated written degrees
- major, minor, diminished and augmented triads
- conventional major/minor key signatures through seven sharps or flats
- interval-derived relative-key and Circle-of-Fifths relationships
- configurable tuning and standard guitar tuning
- bounded fretboard location queries
- structured, JSON-compatible musical queries through `musicQueries`
- typed `MusicError` failures for low-level helpers
- strict TypeScript and Vitest coverage
- regression checks for the preserved behavioural prototype

The current engine deliberately does **not** include Phase 2C chord breadth,
CAGED production logic, diatonic harmony, audio, ear training, learning telemetry
or React integration. See `docs/ENGINE_PHASE1.md` for the foundation boundary and
GitHub Issue #2 for the incremental Phase 2 roadmap.

## Try Learning Lab v1 — Relational Transfer

`lab/` is a deliberately thin browser consumer of the existing engine. It is not
the production app and it does not introduce a Learning Engine, persistence,
mastery scores or new musical truth. Its purpose is to answer one question early:
**can the existing foundation drive a serious guitar-first practice interaction?**

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run lab
```

Then open `http://127.0.0.1:4173`.

Learning Lab v1 replaces the earlier quiz-style tabs with one connected 10–15 minute
relational-transfer session built around the minor-triad relationship `1–♭3–5`:

- orient in A minor inside frets 5–9
- play first, then commit a root and minor-third location on the blank fretboard
- find a second minor third on a different string
- add the fifth and reconstruct the triad away from the screen
- transfer the same relationship to D minor in the same window
- transfer again to C minor in a different fret region
- finish with a 30-second constrained phrase using only `1`, `♭3` and `5`
- reflect briefly on whether note names, interval relationships, fretboard locations or finger pattern broke first
- stop with a delayed-retest instruction rather than another quiz question

The lab compiles and imports `src/engine/` directly. It does not duplicate a second
theory implementation in the UI. Incorrect fret choices are described musically and
repaired before reveal; hints progress from relational information to the note name
without exposing the entire solution. Treat the lab as a disposable learning probe:
keep, change or delete interactions based on whether they improve real practice.

## Verify the foundation kernel

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run typecheck
npm test
npm run test:prototype
npm run test:lab
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
- Spelled identity and sounding membership stay distinct, including in non-heptatonic scales.
- A future rhythm/time domain is reserved architecturally but is not implemented yet.

## Roadmap

1. **Foundation kernel** — implemented
2. **Theory breadth** — slices 2A and 2B implemented; chord breadth, diatonic harmony and relationship analysis remain pending
3. **Guitar representations** — maps, triad voicings, inversions, CAGED and position connectivity
4. **Learning engine extraction** — deterministic exercises, evaluation, assistance and evidence contracts
5. **Audio and ear training** — playback plans, browser audio and auditory exercise families
6. **Production integration and stabilization** — React/PWA consumers, persistence and end-to-end verification

The roadmap is intentionally incremental. Each phase should pass its own tests and acceptance criteria before later phases begin. The Learning Lab may be used between slices to validate that existing capabilities earn their place before more engine breadth is added.

## Prototype and historical references

The dependency-free prototype remains in `prototype/` as a behavioural reference and regression source. It is not wired to the new kernel and retains its known limitations.

The exact original package is preserved in `references/approved-v0.2-handoff.zip`.

The former v0.2 UI-first handoff has been moved to `docs/history/V0_2_HANDOFF.md`. It provides historical product context only and no longer defines the implementation order.

## Product principle

Anything the learner can currently see should eventually become something they have to retrieve, reconstruct, transfer or use in musical context.

That principle will guide future fretboard, harmony, ear-training and improvisation features built on top of the engine.
