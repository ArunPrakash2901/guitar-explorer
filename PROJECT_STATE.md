# Guitar Explorer — Project State

Last updated: 2026-10-25

This is the short operational entry point for deciding **what matters now**. It is
not a replacement for architecture, decisions, tests or issue-specific scope.

## North star

Build a fretboard-first musical reasoning environment that helps the guitarist see,
hear, physically locate, manipulate and reuse musical relationships in real music.
The product should develop independent musical use rather than shape memorisation.

## Current stage

**Product Spine consolidation with a hardened development/validation loop.**

The engine through Phase 2D, current Labs, ScenarioV1 and stabilized Melody
generation already exist. Issue #18 / PR #19 completed the first developer-leverage
slice: PR previews, local-only evidence export and explicit agent autonomy are now
baseline support infrastructure.

Arun has enabled GitHub Pages for the `gh-pages` preview branch, so new PR previews
can now be tested as web-accessible browser builds. This remains non-production
preview infrastructure and must not publish private learner evidence.

## Active work

**Issue #21 — developer leverage batch 2.**

This bounded support/validation slice adds:

- one authoritative `npm run verify` repository gate
- an explicit stable ScenarioV1 identity contract carried into evidence
- Physical Validation Protocol v1 for real-guitar trials

It must not change musical truth, exercise answers, learner scoring, persistence or
product direction.

### Work held alongside it

- **Issue #15 — Physical validation — current Lab cohort** remains the learner-
  evidence task; after Issue #21 it should use Protocol v1 and evidence schema v2.
- **PR #13 — Melody preparation seam** remains the previously authorized bounded
  Product Spine runtime slice. It must be reconciled with current `master` before any
  merge attempt; do not force-merge it or broaden its scope.
- **Issue #16 — Decision gate — choose next Product Spine slice** remains blocked on
  enough physical evidence and a clear disposition of PR #13.

## Current gate

New capability breadth is not the default next move.

Before promoting more experimental behaviour into permanent engine/product
architecture, gather physical-guitar evidence from the existing learning probes and
use that evidence to decide whether to keep, change, remove or promote them.

## Waiting on Arun

No repository-setting change is currently required for previews; Pages publication
has been enabled.

Issue #15 still requires Arun's real-guitar trials of:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

Use `docs/PHYSICAL_VALIDATION_PROTOCOL.md`: unaided attempt first, assistance only if
needed, physical use, transfer, then reflection/disposition. The Session Evidence
panel may export a local JSON snapshot; nothing is uploaded automatically.

## Authorized next work

- complete Issue #21 without expanding musical capability
- collect structured physical-guitar evidence in Issue #15
- reconcile PR #13 with current `master` without broadening its bounded seam
- fix correctness, usability or pedagogy problems directly supported by evidence
- use Issue #16 to choose and bound the next Product Spine slice only after its
  blocking evidence is available

## Not currently authorized

- Phase 2E progression/cadence/function breadth
- CAGED production logic
- generic voicing or voice-leading engine promotion
- new standalone Labs by default
- general Practice/Learning Engine infrastructure
- learner mastery/adaptation/telemetry systems
- microphone grading or audio recognition
- AI tutor behaviour
- React/framework migration
- broad song/progression import
- production deployment or paid/external preview infrastructure

These may be reconsidered later; their presence in historical plans is not current
authorization.

## Decision queue

1. Does Issue #21 improve verification/traceability without creating learning analytics infrastructure?
2. What do the existing Labs actually improve during physical playing? (Issue #15)
3. Does PR #13 still represent the right bounded runtime seam after reconciliation?
4. Which Lab behaviours deserve simplification, removal or promotion?
5. Only then: what is the smallest next Product Spine slice? (Issue #16)

## Control-plane rules

- `PROJECT_STATE.md` defines the current operational focus and gates.
- `AGENTS.md` defines repository constraints and current authorization rules.
- `docs/AUTONOMY_CONTRACT.md` defines what an agent may do independently and where it
  must stop for Arun.
- `docs/ARCHITECTURE.md` defines current product/architecture boundaries.
- `docs/PHYSICAL_VALIDATION_PROTOCOL.md` defines the current real-guitar validation method.
- A GitHub issue defines the scope and acceptance criteria for one authorized work
  slice.
- A pull request should link its issue (or explain why no issue is needed), state
  behaviour impact, list verification, and identify any required physical review.
- If these disagree, stop expansion and resolve the mismatch rather than guessing.
- Update this file when the active slice, gate, waiting-on-Arun state or next
  decision materially changes. Keep it short enough to read at the start of a new
  session.
