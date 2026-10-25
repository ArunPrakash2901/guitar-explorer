# Guitar Explorer — Project State

Last updated: 2026-10-25

This is the short operational entry point for deciding **what matters now**. It is
not a replacement for architecture, decisions, tests or issue-specific scope.

## North star

Build a fretboard-first musical reasoning environment that helps the guitarist see,
hear, physically locate, manipulate and reuse musical relationships in real music.
The product should develop independent musical use rather than shape memorisation.

## Current stage

**Product Spine consolidation with development-loop hardening.**

The engine through Phase 2D, current Labs, ScenarioV1 and stabilized Melody
generation already exist. The current objective is to make the existing system
easier to test physically and easier for future agent sessions to operate safely,
without expanding musical capability.

## Active work

**Issue #18 — developer leverage: PR previews, session-evidence export and autonomy contract**

This is the active support/tooling slice. It may improve previewability, evidence
capture and agent execution boundaries, but it must not change musical truth,
learner scoring, persistence or product direction.

### Runtime work held alongside it

**PR #13 — Melody preparation seam** remains the previously authorized bounded
Product Spine runtime slice. After later `master` changes it must be reconciled with
current `master` before merge. Do not force-merge it or treat its open state as
authorization for broader runtime work.

## Current gate

New capability breadth is not the default next move.

Before promoting more experimental behaviour into permanent engine/product
architecture, gather physical-guitar evidence from the existing learning probes and
use that evidence to decide whether to keep, change, remove or promote them.

Tracking:

- **Issue #15 — Physical validation — current Lab cohort**
- **Issue #16 — Decision gate — choose next Product Spine slice**
- **Issue #18 — Developer leverage — current support/tooling slice**

## Waiting on Arun

Issue #15 tracks physical-guitar review of the current Lab cohort:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

For each experience, capture what became easier without looking at answers, where
calculation or hesitation remained, whether assistance/reveal timing helped, and
whether transfer worked away from the initial material.

After Issue #18 creates the `gh-pages` preview branch, one repository setting may be
needed once: configure GitHub Pages to deploy from `gh-pages` / root. That setting is
only for non-production PR previews and is documented in `docs/PR_PREVIEWS.md`.

## Authorized next work

- complete Issue #18 without changing musical capability
- collect structured physical-guitar evidence in Issue #15
- reconcile PR #13 with current `master` before any merge attempt
- fix correctness, usability or pedagogy problems revealed by evidence
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
- production deployment or paid external preview infrastructure

These may be reconsidered later; their presence in historical plans is not current
authorization.

## Decision queue

1. Does Issue #18 give us a reliable preview/evidence loop without becoming analytics infrastructure?
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
- A GitHub issue defines the scope and acceptance criteria for one authorized work
  slice.
- A pull request should link its issue (or explain why no issue is needed), state
  behaviour impact, list verification, and identify any required physical review.
- If these disagree, stop expansion and resolve the mismatch rather than guessing.
- Update this file when the active slice, gate, waiting-on-Arun state or next
  decision materially changes. Keep it short enough to read at the start of a new
  session.
