# Historical Codex kickoff

> SUPERSEDED, non-operative historical instructions. Current authorization is in
> [AGENTS.md](AGENTS.md); the current product and architecture source of truth is
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The foundation was implemented under
> the later engine plan, and Product Spine consolidation is documentation only.
> The old React/CAGED/phase instructions below do not authorize runtime work.
> The original handoff remains archived byte-for-byte.

Use the following as the first instruction to Codex after this package is committed to its own repository.

---

Read `AGENTS.md` and every document it lists before editing anything.

Your job is to implement **Phase 0 and Phase 1 only** from `docs/V0_2_PLAN.md`.

Important context:

- `prototype/` is a behavioural prototype, not the desired production architecture.
- `references/gemini-reference.png` is the visual starting reference.
- The educational objective in `docs/LEARNING_MODEL.md` is more important than feature breadth.
- Do not implement later phases yet.

For Phase 0:

1. Create the production React + TypeScript + Vite app in the repository without deleting the prototype/specification material.
2. Add Vitest and Playwright infrastructure.
3. Add a minimal CI workflow for install, typecheck, unit tests and production build.
4. Create a responsive dark application shell with the three mode tabs, but do not implement mode behaviour yet.

For Phase 1:

1. Implement a UI-independent music domain under `src/music/`.
2. Model pitch class separately from note spelling.
3. Support standard tuning, frets 0–15, the 12 roots specified in the product, correct major-scale spelling, major triads, intervals, the five major CAGED templates, and I–IV–V–I progressions.
4. Port the useful regression tests from `prototype/music.test.js` and expand them to satisfy `docs/TEST_MATRIX.md` sections 1–6.
5. Do not put musical calculations inside React components.

Before finishing:

- run the full unit test suite
- run typecheck
- run the production build
- report the architecture created, tests added, commands run and any unresolved issue
- do not start Phase 2 unless explicitly asked

---
