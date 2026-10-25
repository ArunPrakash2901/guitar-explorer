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
slice: PR-preview plumbing, local-only session-evidence export and an explicit agent
autonomy contract are now baseline support infrastructure.

No new musical capability is authorized merely because that tooling exists.

## Active work

**Validation and reconciliation, not a new capability slice.**

- **Issue #15 — Physical validation — current Lab cohort** is the current learner-
  evidence task.
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

### One-time preview publication choice

The `gh-pages` preview branch and automation now exist. To make future PR preview
URLs web-accessible, Arun may choose to configure GitHub Pages to deploy from
`gh-pages` / root as documented in `docs/PR_PREVIEWS.md`.

That is intentionally a manual choice because GitHub Pages publishes browser content
to the web. Do not enable or substitute another public/external preview host without
explicit approval.

### Physical-guitar evidence

Issue #15 tracks review of:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

For each experience, capture what became easier without looking at answers, where
calculation or hesitation remained, whether assistance/reveal timing helped, and
whether transfer worked away from the initial material. The merged Session Evidence
panel can export a versioned local JSON snapshot when useful; nothing is uploaded
automatically.

## Authorized next work

- collect structured physical-guitar evidence in Issue #15
- reconcile PR #13 with current `master` without broadening its bounded seam
- fix correctness, usability or pedagogy problems directly supported by evidence
- use Issue #16 to choose and bound the next Product Spine slice only after its
  blocking evidence is available
- maintain the merged preview/evidence/autonomy tooling when a concrete defect is
  found, without treating maintenance as authorization for new infrastructure

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

1. Enable GitHub Pages only if Arun accepts the web-publication boundary for PR previews.
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
