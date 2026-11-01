# Guitar Explorer — Project State

Last updated: 2026-11-02

This is the operational entry point. `project-state.json` is its validated
machine-readable companion; `npm run context` prints it with revision metadata.

## North star

Help Arun see the fretboard, hear relationships, follow harmony, create and develop
short phrases, improvise and transfer ideas on his guitar. For substantial work,
state what he will be able to hear, understand, find, play, improvise or transfer
more reliably. Physical usefulness is the product signal; completion is not mastery.

## Current implementation and accepted evidence

Merged master has the deterministic engine through Phase 2D, existing Labs,
ScenarioV1, bounded Melody generation, the Melody preparation seam, Phrase Foundation
PR 1 (merged #41 at `d25217a`), Harmonic Gravity Product Spine v1 (merged #44 at
`239d933`), and the preview / verify / identity / local-evidence tooling. PR #36
provides exact-head preview protection. Stable publication remains a separate
explicit decision.

**Issue #15 is complete.** Arun accepted Harmonic Gravity / Practice Session,
Parsimonious Path, Melody Over Harmony and Develop the Idea, including PR #37's
transfer regression. Preserve the recorded confirmation and do not repeat those old
trials or describe them as blockers.

**Product Spine v1 is also complete and separately accepted.** Arun approved the
Figma journey, reviewed exact head `c46d9617a07ddd8e59402332b4311f2746e65f77`
in the browser with his guitar, and explicitly approved merge. PR #44 merged as
`239d933e6b70f761a07539f4f34e672d22852922`; Issue #43 closed completed. The
accepted learner result is that the flow changed how Arun listened, predicted,
noticed and made a musical decision rather than merely following instructions.

The Harmonic Gravity examples remain a vertical proof, not the product breadth,
exercise vocabulary or long-term ceiling.

## Current active slice

**Issue #45 — Role Lens v0: one material across multiple learner actions** is now the
single active learner-facing implementation scope.

The product question is deliberately small: can one supplied musical material support
at least two genuinely different useful learner actions rather than one exercise with
different buttons?

Starting material:
- C4 over supplied Am7 → D7 → Gmaj7 in G major.
- Transfer: D4 over Bm7 → E7 → Amaj7.

Required proof:
1. a notice / Role Lens action in which the learner hears or imagines the same anchor
   against changing chords, predicts/identifies its changing role and locates it;
2. a use/create action in which the learner reuses the same material to make a small
   deliberate phrase or ending, explain the choice, vary it and transfer the
   relationship.

Reuse current Music/Guitar/Phrase/Query/Product Spine capability first. Follow
**learner action → missing deterministic fact → smallest addition**. If current facts
are sufficient, do not expand Core.

### Architecture boundaries for Issue #45

- Prefer ordinary local objects/functions and activity-local contracts.
- Do not create a universal Exercise Recipe JSON/DSL.
- Do not create a permanent generic Context/Constraint layer.
- Musical Material is conceptually adjacent to deterministic truth rather than
  identical to it; the engine may validate/analyze objective facts about supplied
  material.
- Do not create a Learning Engine, curriculum graph, mastery model or generic router.
- Do not add Audio Out/In, microphone grading, Style Pack runtime, AI runtime,
  meter/groove/articulation/polyphony frameworks or Phrase/Harmony PR 2 unless this
  exact learner action proves a specific missing fact and receives separate scope.
- Preserve accepted legacy routes and Product Spine principles where useful, but do
  not force Harmonic Gravity's exact stage sequence onto Role Lens.

## Parallel research and gated follow-ups

A **5–10 fragment Style Study** is the parallel research track. It is a source-backed
representation pressure test, not Style Pack implementation. Record provenance,
pitch structure, rhythm where supported, harmonic situation/roles,
articulation/technique, guitar placement where known, transferable principle, what
Guitar Explorer can represent and what it cannot. Repeated real requirements may
justify later timed harmony, meter/groove, articulation, polyphony or placement work;
heterogeneous gaps should not become a universal Style schema.

**Audio Out v0 waits on Role Lens evidence.** If hearing the material materially
improves a proven learner action, scope the smallest renderer needed by that action.
Prefer native Web Audio as the first technical baseline; Tone.js, smplr and sampled
assets are experiments rather than architecture commitments.

**Audio In remains later and experimental.** A first spike should stop at permission /
input level, onset and stable monophonic pitch. Preserve uncertainty in an
`AudioObservation`; deterministic musical queries may explain what a candidate pitch
would mean, but must not convert probabilistic perception into certain performed
correctness. No polyphonic/style grading.

Broad AI/agent work, Style runtime and GX-10/rig control remain later and require a
concrete learner need.

## Current PR / issue disposition

- **Issue #45:** open; active Role Lens v0 implementation scope. No PR yet.
- **PR #44 / Issue #43:** Product Spine v1 merged as `239d933`; completed.
- **PR #41 / Issue #40:** Phrase Foundation PR 1 merged as `d25217a`; PR 2 is not
  commissioned.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged.

## Review and verification

Use `npm run verify` as the authoritative full repository gate. Issue #45 must reach:
1. exact-head repository verification,
2. exact-head GitHub Pages preview,
3. Arun browser + physical-guitar review,
4. explicit approval before merge.

The physical review must establish whether the same material actually produced
multiple cognitively/musically distinct useful actions. If it feels like one exercise
with cosmetic variants, stop rather than formalize a reusable recipe abstraction.

Keep musical truth, task compliance, audio perception and subjective musical judgment
separate.

## Where decisions live

- GitHub master: merged implementation/capability.
- GitHub issue/PR: one slice's scope and implementation evidence.
- Figma: approved visual/product design when applicable.
- Trello Project Hub: human-readable priorities, dependencies, sources and decisions.
- Research artifacts: input, not implementation authorization.

`AGENTS.md` and `docs/AUTONOMY_CONTRACT.md` define execution boundaries;
`docs/ARCHITECTURE.md` defines architecture, and the physical protocol applies to new
trials. Keep the control layer small; add no other planning system or invented
deadlines.