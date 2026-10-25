# Guitar Explorer — Project State

Last updated: 2026-10-25

This is the short operational entry point for deciding **what matters now**. It is
not a replacement for architecture, decisions, tests or issue-specific scope.

## North star

Build a fretboard-first musical reasoning environment that helps the guitarist see,
hear, physically locate, manipulate and reuse musical relationships in real music.
The product should develop independent musical use rather than shape memorisation.

## Current stage

**Product Spine consolidation — first runtime seam.**

The engine through Phase 2D, current Labs, ScenarioV1 and stabilized Melody
generation already exist. The current objective is to connect those capabilities
through a clearer product spine without expanding theory breadth or silently
building a generic learning framework.

## Active work

**PR #13 — Melody preparation seam**

The active runtime slice introduces one DOM-free preparation boundary for existing
Melody catalogue and generated material while preserving learner-facing behaviour.
It is the current implementation focus and should be reviewed/merged before a new
runtime slice is started.

## Current gate

New capability breadth is not the default next move.

Before promoting more experimental behaviour into permanent engine/product
architecture, gather physical-guitar evidence from the existing learning probes and
use that evidence to decide whether to keep, change, remove or promote them.

## Waiting on Arun

Physical-guitar review of the current Lab cohort:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

For each experience, capture what became easier without looking at answers, where
calculation or hesitation remained, whether assistance/reveal timing helped, and
whether transfer worked away from the initial material.

## Authorized next work

- review and merge PR #13 if its behaviour-preservation and verification claims hold
- collect structured physical-guitar evidence from the existing Lab cohort
- fix correctness, usability or pedagogy problems revealed by that evidence
- improve existing Product Spine seams without introducing new musical capability
- make the next Product Spine decision only after the evidence/decision gate is met

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

These may be reconsidered later; their presence in historical plans is not current
authorization.

## Decision queue

1. Does PR #13 prove a useful preparation seam without changing the learning flow?
2. What do the existing Labs actually improve during physical playing?
3. Which Lab behaviours deserve simplification, removal or promotion?
4. Only then: what is the smallest next Product Spine slice?

## Control-plane rules

- `AGENTS.md` defines agent constraints and authorization rules.
- `docs/ARCHITECTURE.md` defines current product/architecture boundaries.
- `PROJECT_STATE.md` defines the current operational focus and gates.
- A GitHub issue defines the scope and acceptance criteria for one authorized work
  slice.
- A pull request should link its issue (or explain why no issue is needed), state
  behaviour impact, list verification, and identify any required physical review.
- If these disagree, stop expansion and resolve the mismatch rather than guessing.
- Update this file when the active slice, gate, waiting-on-Arun state or next
  decision materially changes. Keep it short enough to read at the start of a new
  session.
