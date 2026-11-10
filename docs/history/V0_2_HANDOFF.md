# Historical v0.2 handoff

> Historical reference. This handoff describes the original prototype. Its files and tests are available in the original handoff archive or pre-reset Git history.
> See [project state](../../PROJECT_STATE.md) for the active application.

This document preserves the original UI-first Guitar Explorer handoff for product context and behavioural reference. It no longer defines the current implementation order.

A long-term fretboard and musicianship trainer designed around one core problem: being able to physically learn guitar shapes without becoming dependent on those shapes.

This package was a **Codex-ready v0.2 handoff**. It contained:

- `prototype/` — a dependency-free behavioural prototype implementing Explore, Navigate and Harmony foundations.
- `references/` — the original visual reference and the earlier v0.1 standalone CAGED explorer.
- `docs/` — product, learning, architecture, implementation and test specifications.
- `AGENTS.md` — instructions for Codex or another coding agent.
- `CODEX_KICKOFF.md` — the original first task for Codex once the package was placed in GitHub.

## Product principle

The application must progressively remove assistance. Anything the learner can currently see should eventually become something they have to retrieve, reconstruct, transfer or use in musical context.

## Recommended production stack at v0.2

- React
- TypeScript
- Vite
- SVG fretboard renderer
- Vitest for domain/unit tests
- Playwright for critical interaction flows
- native IndexedDB for local learning telemetry
- PWA shell for phone-first use
- no backend in v0.2

The dependency-free prototype was not intended to be the production architecture. It exists to make intended behaviour concrete while the production engine and application are rebuilt.

## Prototype verification

```bash
node prototype/music.test.js
node --check prototype/app.js
```

## Historical workflow

The original handoff asked for a private repository, then instructed Codex to work phase by phase while preserving the behavioural prototype. That setup step is now complete and superseded by the approved engine-first roadmap.

The exact original handoff package is preserved in `references/approved-v0.2-handoff.zip`.
