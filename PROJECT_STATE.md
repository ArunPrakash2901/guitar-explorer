# Guitar Explorer — Project State

Last updated: 2026-10-25

This is the short operational entry point for deciding **what matters now**. It is
not a replacement for architecture, decisions, tests or issue-specific scope. The
versioned machine-readable companion is [`project-state.json`](project-state.json);
`npm run context` validates and prints it with runtime revision/PR/channel metadata.

## North star

Build a fretboard-first musical reasoning environment that helps the guitarist see,
hear, physically locate, manipulate and reuse musical relationships in real music.
The product should develop independent musical use rather than shape memorisation.

## Current stage

**Product Spine consolidation with a hardened development/validation loop.**

The engine through Phase 2D, current Labs, ScenarioV1 and stabilized Melody
generation already exist. Standing support/runtime infrastructure now includes:

- Issue #18 / PR #19: PR previews, local-only evidence export and explicit agent autonomy
- Issue #21 / PR #22: authoritative `npm run verify`, stable ScenarioV1 identity,
  evidence schema v2 and Physical Validation Protocol v1
- Issue #29 / PR #30: the bounded DOM-free Melody preparation seam, reconciled onto
  current `master`; stale PR #13 is closed as superseded
- Issue #32 / PR #33: machine-readable project context, explicit stable/preview/
  experimental build-channel provenance, Session Evidence schema v3, and local
  longitudinal evidence timeline tooling

Arun has enabled GitHub Pages for the `gh-pages` preview branch. GitHub's Pages build
and deployment workflow has successfully published PR previews. This remains
non-production preview infrastructure and must not publish private learner evidence.
Stable publication remains reserved for a separate explicit decision; experimental
builds are opt-in and non-production.

## Active work

**Issue #15 — Physical validation — current Lab cohort.**

The next useful evidence now comes from real-guitar trials. Use
`docs/PHYSICAL_VALIDATION_PROTOCOL.md` and the Session Evidence panel to evaluate:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

Evidence schema v3 records protocol, scenario and exact build/deployment provenance.
`npm run evidence:timeline` can reconcile repeated exports of the same `trialId` and
build a local descriptive history under the gitignored `.evidence-local/` path.
Nothing is uploaded automatically and the timeline must not infer mastery.

### Decision held behind it

- **Issue #16 — Decision gate — choose next Product Spine slice** remains blocked on
  enough Issue #15 physical evidence to support a bounded next decision.

## Current gate

New capability breadth is not the default next move.

Before promoting more experimental behaviour into permanent engine/product
architecture, gather physical-guitar evidence from the existing learning probes and
use that evidence to decide whether to keep, change, remove or promote them.

The Melody preparation seam and all three developer-leverage batches are standing
infrastructure only. They do not authorize a general Experience Router, Practice
Policy, new theory breadth or a Learning Engine.

## Waiting on Arun

Issue #15 requires at least one focused Protocol v1 trial for each current experience.
For each trial:

1. make an unaided attempt
2. use the smallest assistance only if needed
3. play the idea in context
4. try the transfer
5. record reflection and a provisional disposition

Reset the Session Evidence panel after choosing the material/scenario. Export JSON
when useful; the local timeline can combine those exports later without turning them
into scores or inferred mastery.

## Authorized next work

- collect structured physical-guitar evidence in Issue #15
- fix correctness, usability or pedagogy problems directly supported by evidence
- maintain the existing context/preview/verify/evidence/Melody-preparation
  infrastructure when needed for correctness or reliability
- use Issue #16 to choose and bound the next Product Spine slice only after its
  physical-evidence blocker is satisfied

## Not currently authorized

- Phase 2E progression/cadence/function breadth
- CAGED production logic
- generic voicing or voice-leading engine promotion
- new standalone Labs by default
- general Experience Router or Practice/Learning Engine infrastructure
- learner mastery/adaptation/telemetry systems
- microphone grading or audio recognition
- AI tutor behaviour
- React/framework migration
- broad song/progression import
- production deployment or paid/external preview infrastructure

These may be reconsidered later; their presence in historical plans is not current
authorization.

## Decision queue

1. What do the existing Labs actually improve during physical playing? (Issue #15)
2. Which Lab behaviours deserve simplification, removal or promotion?
3. Given that evidence, what is the smallest next Product Spine slice? (Issue #16)

## Control-plane rules

- `PROJECT_STATE.md` defines the current human-readable operational focus and gates.
- `project-state.json` is the validated machine-readable snapshot; use `npm run context`.
- `AGENTS.md` defines repository constraints and current authorization rules.
- `docs/AUTONOMY_CONTRACT.md` defines what an agent may do independently and where it
  must stop for Arun.
- `docs/ARCHITECTURE.md` defines current product/architecture boundaries.
- `docs/VERIFY.md` defines the authoritative software verification gate.
- `docs/DEPLOYMENT_CHANNELS.md` defines build-channel identity and evidence privacy.
- `docs/PHYSICAL_VALIDATION_PROTOCOL.md` defines the current real-guitar validation method.
- A GitHub issue defines the scope and acceptance criteria for one authorized work
  slice.
- A pull request should link its issue (or explain why no issue is needed), state
  behaviour impact, list verification, and identify any required physical review.
- If these disagree, stop expansion and resolve the mismatch rather than guessing.
- Update this file when the active slice, gate, waiting-on-Arun state or next
  decision materially changes. Keep it short enough to read at the start of a new
  session.
