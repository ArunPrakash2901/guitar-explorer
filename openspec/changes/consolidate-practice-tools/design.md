## Context

The 138-ahead/24-behind branch is not a clean master merge. Preserve prior review history and audio assets. The original audio branch has one unique commit. Current CI failures need fresh diagnosis.

## Goals / Non-Goals

Recover existing work with no new features. No DAW expansion, Song Study, new generated assets, deletion of historical evidence, or release publication.

## Decisions

- Start from current master in a distinct integration branch; merge exact pinned #116 source only there. Inspect conflicts before resolution, particularly workflows, docs, core chord/scale formulas and preview build policy.
- Musical truth stays in Core/Guitar; progression planners consume it, audio renders material on the existing clock, UI does not redefine chord identities.
- Verify #90 independently by patch and behavior. Preserve all refs until disposition is evidenced.
- Candidate specs below are an initial, incomplete delta; flesh out accompaniment, favorites, chord colors, packaging and browser acceptance during scoped recovery. Do not use this partial delta as permission to implement new features.

## Risks / Trade-offs

Stale state, hidden unique commits, regressions in historical labs, preview publishing failure, real-device audio latency, sample rights. Stop rather than weaken gates or silently drop either side of conflicts.

## Migration Plan

Record original SHAs; create isolated branch; trial integration; inspect and test; verify exact head in browser and physical guitar; get owner approval; only then archive and merge. Rollback by discarding recovery branch before merge or reverting authorized integration commit after merge. No history rewrite.
