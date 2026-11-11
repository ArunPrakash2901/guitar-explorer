# Codex handoff — after the scaffold

Repository: `ArunPrakash2901/guitar-explorer`
Scaffold branch: `scaffold/chord-tone-markers-20261111`
Base: PR #84 reset branch `chore/song-study-engine-first-reset` (unmerged)

## Current state

A small, isolated, dependency-free presentation adapter and tests are prepared.
They do not add a browser screen or new engine capability. Do not restart the
product direction, reactivate retired labs, or merge PR #84.

## Reserve higher-effort work for Codex

After the PR #84 review/merge and Issue #83 FRD reconciliation, take **one**
approved song passage or original musical fixture through the following decisions:

1. Decide the smallest physical guitar event contract needed by that passage
   (muting, note/fret placement, attack order, timing) without polluting Music Core.
2. Reuse the engine's exact rational musical time and note/fret query facts.
3. Design one authoritative timing path for the event's audio and display
   projections; keep audio-clock seconds separate from musical beats.
4. Produce tests for pause/resume, seeking, loop boundaries, order, spelling,
   and any explicit expressive-technique contract actually required.
5. Build exactly one thin interactive vertical slice with an exact-head preview,
   then request physical guitar validation before any learner-facing merge.

### Do not assume or implement without evidence

- General voicing search/CAGED engine
- A full multi-song content catalogue or licensed Black Dog audio/TAB assets
- DSP amp simulation, automatic transcription, live performance grading
- Third-party dependencies before comparing their cost/benefit to native Web Audio
- Universal activity DSL, learner scoring, permanent account or backend

### Required proposal before coding the harder slice

A one-page design note with (a) user action, (b) specific missing capabilities,
(c) minimal data contract, (d) engine reuse, (e) tests and manual validation,
(f) expected deletions/risks, (g) non-goals. Await approval if scope or
pedagogical implications exceed the agreed FRD.

### Review gates

`AGENTS.md`, `PROJECT_STATE.md`, `docs/AUTONOMY_CONTRACT.md`, PR #84 and Issue #83
remain authoritative. No merge before exact-head preview and required explicit
user approval. Standalone scaffold does not satisfy those gates.
