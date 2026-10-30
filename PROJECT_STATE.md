# Guitar Explorer — Project State

Last updated: 2026-10-30

This is the short operational entry point for deciding **what matters now**. It is
not a replacement for architecture, decisions, tests or issue-specific scope. The
versioned machine-readable companion is [`project-state.json`](project-state.json);
`npm run context` validates and prints it with runtime revision/PR/channel metadata.

## North star

Build a fretboard-first musical reasoning environment that helps the guitarist see,
hear, physically locate, manipulate and reuse musical relationships in real music.
The product should develop independent musical use rather than shape memorisation.

## Current stage

**Phrase Foundation PR 1: approved pure engine slice, pending PR review.**

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

**[Issue #40 — Phrase Foundation PR 1](https://github.com/ArunPrakash2901/guitar-explorer/issues/40).**

Arun approved the Phrase Foundation v1 design handoff and explicitly authorized
PR 1 on 2026-10-30. Implement exact rational quarter lengths, monophonic registered
phrases, pure transformations/comparisons/clipping, eight additive query methods,
tests and scoped documentation. See `docs/PHRASE_FOUNDATION_V1.md`.

This branch implements that slice; it is not the complete two-PR foundation and
must be reviewed before merge. Supplied harmony timeline/overlap analysis belongs
to dependent PR 2, with no placeholder API here. Product Spine UI/Figma direction
remains established but unimplemented.

### Completed physical gate

Issue #15 is closed/completed. Arun directly confirmed that Harmonic Gravity /
Practice Session, Parsimonious Path, Melody Over Harmony and Develop the Idea are
physically validated and approved, including PR #37's transfer regression:
[validation confirmation](https://github.com/ArunPrakash2901/guitar-explorer/issues/15#issuecomment-6494414657).
Preserve this approval; do not repeat those old trials or infer mastery from it.
Issue #16's physical-evidence blocker is satisfied; Issue #40 records the next
bounded approved work item. The decision gate remains open for broader choices.

Evidence schema v3 and `npm run evidence:timeline` remain local descriptive tooling;
no evidence is uploaded automatically and no mastery is inferred.

## Current gate

Complete only the approved Foundation PR 1 contract and full `npm run verify`,
publish the ordinary exact-head PR preview, and wait for Arun's review before merge.
This pure Core slice needs no repeat physical trials. The unchanged Lab preview
does not demonstrate the new APIs; head-specific tests and the authored proof do.

The Melody preparation seam and all three developer-leverage batches are standing
infrastructure only. They do not authorize a general Experience Router, Practice
Policy, new theory breadth or a Learning Engine.

## Waiting on Arun

Review the concrete Foundation PR 1 code and automated evidence once the PR is
ready. No additional answer or old Lab validation is required to implement the
currently approved slice. A later consuming exercise must establish its own
physical usefulness; this foundation makes no such claim.

## Authorized next work

- implement and verify Issue #40 exactly within the approved handoff
- maintain the existing context/preview/verify/evidence/Melody-preparation
  infrastructure when needed for correctness or reliability
- use Issue #16 for separately bounded later decisions; PR 2 implementation is
  not part of the current request

## Not currently authorized

- Phase 2E progression/cadence/function breadth
- Foundation PR 2 timeline/analysis implementation in this PR
- Product Spine UI or existing Lab migration
- polyphony, techniques, meter/tempo/transport and phrase generation
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

1. Review Foundation PR 1's exact time, invariants, operations and regression evidence.
2. After PR 1 review/merge, explicitly commission the dependent supplied-harmony slice.
3. Keep consumer repairs, placement search and Product Spine UI in separate scopes.

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
