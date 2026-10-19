# Guitar Explorer — foundation kernel

Phase 1 implements a pure TypeScript music kernel: spelling-aware pitches,
intervals/transposition, major/natural-minor scales, four triads, configurable
tuning, bounded fretboard locations and structured musical queries.

```sh
npm ci
npm run typecheck
npm test
npm run test:prototype
```

Requires Node.js 22.17 or newer. Import `src/engine/index.ts` from a TypeScript
consumer. `musicQueries` is the validated, JSON-compatible musical-truth facade;
low-level helpers throw typed `MusicError` failures. See `docs/API.md` for examples,
`docs/ARCHITECTURE.md` for boundaries, and `docs/ENGINE_PHASE1.md` for acceptance.

The original demo remains in `prototype/` and is not wired to the new kernel. Its
known limitations remain. The exact original package is preserved in
`references/approved-v0.2-handoff.zip`. Production UI/audio/learning are not part of
this run. The package is private and source-only; no distribution is published.

## Historical v0.2 handoff README

The original roadmap below provides product context; the approved engine Phase 1
supersedes its UI-first implementation order and combined music/fretboard layout.

A long-term fretboard and musicianship trainer designed around one core problem: being able to physically learn guitar shapes without becoming dependent on those shapes.

This package is a **Codex-ready v0.2 handoff**. It contains:

- `prototype/` — a dependency-free behavioural prototype implementing Explore, Navigate and Harmony foundations.
- `references/` — the original visual reference and the earlier v0.1 standalone CAGED explorer.
- `docs/` — product, learning, architecture, implementation and test specifications.
- `AGENTS.md` — instructions for Codex or another coding agent.
- `CODEX_KICKOFF.md` — the first task to give Codex once this package is in its own GitHub repository.

## Product principle

The application must progressively remove assistance. Anything the learner can currently see should eventually become something they have to retrieve, reconstruct, transfer or use in musical context.

## Recommended production stack

- React
- TypeScript
- Vite
- SVG fretboard renderer
- Vitest for domain/unit tests
- Playwright for critical interaction flows
- native IndexedDB for local learning telemetry
- PWA shell for phone-first use
- no backend in v0.2

The dependency-free prototype is not the desired production architecture. It exists to make the intended behaviour unambiguous before Codex refactors it.

## Run the prototype

The files are dependency free. Open `prototype/index.html` in a modern browser. If local browser security blocks script loading, serve the folder with any small static server, for example:

```bash
cd prototype
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Verify the music-domain prototype

```bash
node prototype/music.test.js
node --check prototype/app.js
```

## Immediate GitHub/Codex workflow

1. Create a **private** GitHub repository named `guitar-learning-system`.
2. Put this package at the repository root and commit it as `chore: seed v0.2 product and learning specification`.
3. Connect that repository to Codex.
4. Give Codex the instructions in `CODEX_KICKOFF.md`.
5. Codex should work phase by phase and keep the behavioural prototype as a reference while replacing it with the production React/TypeScript implementation.

The repository can become public later. Keeping it private during the architecture/build phase gives freedom to iterate without treating every experiment as a published product.
