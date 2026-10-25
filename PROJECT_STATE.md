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
generation already exist. Standing support/runtime infrastructure includes:

- Issue #18 / PR #19: PR previews, local-only evidence export and explicit agent autonomy
- Issue #21 / PR #22: authoritative `npm run verify`, stable ScenarioV1 identity,
  evidence schema v2 and Physical Validation Protocol v1
- Issue #29 / PR #30: the bounded DOM-free Melody preparation seam, reconciled onto
  current `master`; stale PR #13 is closed as superseded

Arun has enabled GitHub Pages for the `gh-pages` preview branch. GitHub's Pages build
and deployment workflow has successfully published PR previews. This remains
non-production preview infrastructure and must not publish private learner evidence.

## Active work

**Issue #32 / PR #33 — Developer leverage batch 3.**

This bounded infrastructure slice implements the remaining roadmap upgrades 7–9:

1. versioned machine-readable project context plus `npm run context`
2. explicit stable / preview / experimental build-channel identities
3. Session Evidence schema v3 plus a local longitudinal evidence timeline tied to
   revisions, deployment channels and scenarios

This is infrastructure/traceability only. It does not authorize new musical
capability, a Learning Engine, telemetry, scoring or production deployment.

### Learner-evidence task remains active

**Issue #15 — Physical validation — current Lab cohort** remains the source of
learner evidence. Use `docs/PHYSICAL_VALIDATION_PROTOCOL.md` and the Session Evidence
panel to evaluate:

- Harmonic Gravity / Practice Session
- Parsimonious Path
- Melody Over Harmony
- Develop the Idea

### Decision held behind it

- **Issue #16 — Decision gate — choose next Product Spine slice** remains blocked on
  enough Issue #15 physical evidence to support a bounded next decision.

## Current gate

New capability breadth is not the default next move.

Before promoting more experimental behaviour into permanent engine/product
architecture, gather physical-guitar evidence from the existing learning probes and
use that evidence to decide whether to keep, change, remove or promote them.

The merged Melody preparation seam and Issue #32 developer tooling are
infrastructure/consolidation only. They do not authorize a general Experience Router,
Practice Policy, new theory breadth or a Learning Engine.

## Waiting on Arun

Issue #32 does not require a new product/pedagogy decision. Its stable channel remains
reserved and unpublished; production publication still requires explicit approval.

Issue #15 requires at least one focused Protocol v1 trial for each current experience.
For each trial:

1. make an unaided attempt
2. use the smallest assistance only if needed
3. play the idea in context
4. try the transfer
5. record reflection and a provisional disposition

Reset the Session Evidence panel after choosing the material/scenario. Evidence
schema v3 records protocol, scenario and build/deployment provenance while remaining
local-only. Nothing is uploaded automatically. Local timeline output is stored under
the gitignored `.evidence-local/` path by default.

## Authorized next work

- complete Issue #32 / PR #33 inside its infrastructure-only acceptance criteria
- collect structured physical-guitar evidence in Issue #15
- fix correctness, usability or pedagogy problems directly supported by evidence
- maintain the existing preview/verify/evidence/Melody-preparation infrastructure
  when needed for correctness or reliability
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

1. Finish the bounded developer-leverage batch without changing musical behaviour. (Issue #32)
2. What do the existing Labs actually improve during physical playing? (Issue #15)
3. Which Lab behaviours deserve simplification, removal or promotion?
4. Given that evidence, what is the smallest next Product Spine slice? (Issue #16)

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
