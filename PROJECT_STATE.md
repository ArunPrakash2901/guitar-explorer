# Guitar Explorer — Project State

Last updated: 2026-11-01

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
provides the existing exact-head preview protection. Stable publication remains a
separate explicit decision.

**Issue #15 is complete.** Arun accepted Harmonic Gravity / Practice Session,
Parsimonious Path, Melody Over Harmony and Develop the Idea, including PR #37's
transfer regression. Preserve the [recorded confirmation](https://github.com/ArunPrakash2901/guitar-explorer/issues/15#issuecomment-6494414657)
and earlier history. Do not repeat those old trials or describe them as blockers.
PR #30 satisfied the old seam blocker by reworking and superseding PR #13.

**Product Spine v1 is also complete and separately accepted.** Arun approved the
existing [Figma journey](https://www.figma.com/design/0nYwx0YwxqYZ0t29FeYMI9?node-id=8-2260),
reviewed exact head `c46d9617a07ddd8e59402332b4311f2746e65f77` in the browser
with his guitar, and explicitly approved merge. PR #44 merged as `239d933e6b70f761a07539f4f34e672d22852922`;
Issue #43 closed completed.

The accepted learner result is that the Product Spine flow changed how Arun listened,
predicted, noticed and made a musical decision rather than merely following
instructions. The merged slice provides Instrument Desk as the shell, temporary PLAY
Focus Mode, explicit NOTICE commitment, delayed note-role/fretboard reveal, a tiny
phrase action using the same material, and an A-major transfer while preserving
in-page context and every legacy Lab route.

The simple Harmonic Gravity questions and examples remain a first vertical proof,
not the product breadth, exercise vocabulary or long-term ceiling. Do not turn its
stages/examples into a fixed exercise schema. Future material must permit
substantially different learner actions and richer musical material.

## Current operational state

There is no active learner-facing implementation issue or PR after Product Spine v1.
Do not create implementation work merely to keep the queue busy.

The next bounded product question is the existing material/exercise design pilot:
prove **Engine truth → Musical material → Exercise recipe → Learner experience**
with one supplied material reused for genuinely different learner actions. Role Lens
is a candidate, not an approved runtime or schema. State question, action, invariant,
variation, transfer, deterministic facts, assistance/reveal and human listening.

Audio Out / Audio In is now a promising future research direction because Product
Spine demonstrated the value of listening-led interaction. It is not commissioned
implementation. Keep deterministic musical truth separate from audio perception;
do not jump directly to microphone grading or AI judgment of improvisation.

## Current PR disposition

- **PR #41 / Issue #40:** merged as `d25217a` after Arun explicitly approved
  unchanged reviewed head `5bc8d3e`; exact-time / monophonic Phrase foundation is
  merged capability. PR 2 is not commissioned.
- **PR #44 / Issue #43:** Product Spine v1 merged as `239d933` after exact-head
  verification, live Pages revision check and Arun's separate browser/physical-guitar
  review of `c46d961`. Issue #43 is closed completed.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged. The optional assistant-hint
  exchange has no accepted physical-use benefit and is not an active milestone.

There are currently no open GitHub issues after Product Spine completion.

## Development rule and scope

Follow **learner action → missing deterministic fact → smallest engine addition**.
Use existing Core facts when sufficient. Phrase/Harmony PR 2 needs a concrete timed
phrase/harmony task and separate commissioning. Do not expand theory, voice leading,
CAGED, technique, audio, learner models, progression/function engines or universal
material schemas merely because they could be useful.

AI may later propose material or prompts; the engine owns objective musical facts
and humans judge subjective musical quality. Broad AI/agent work and optional
GX-10/rig control stay in Research & Later, beneath a demonstrated learning need.
No new exercise framework, generator, curriculum graph or mastery system is approved.

No new learner-facing runtime, audio capability, Phrase PR 2, production publication,
paid service, telemetry or private-evidence upload is currently commissioned.
Routine non-learner-facing maintenance may reconcile state without inventing a new
product gate.

## Review and verification

Use `npm run verify` as the full repository gate. Future implementation PRs retain
the existing exact-head Pages preview path. New learner-facing behaviour requires
Arun's browser/physical-guitar review and explicit approval before merge; preserve
accepted old trials rather than repeating them. Product Spine #44 has completed that
gate. Musical truth, task compliance, audio perception and subjective musical
judgment remain separate.

## Where decisions live

- GitHub master: merged implementation/capability.
- GitHub issue/PR: one slice's scope and implementation evidence.
- Figma: approved visual/product design when applicable.
- [Trello Project Hub](https://trello.com/b/blLKS9e7/guitar-explorer-project-hub): human-readable priorities,
  dependencies, sources and decisions; update existing cards during work sessions.
- Research artifacts: input, not implementation authorization.

`AGENTS.md` and `docs/AUTONOMY_CONTRACT.md` define execution boundaries;
`docs/ARCHITECTURE.md` defines architecture, and the physical protocol applies to
new trials. Update these operational records and Trello when real status changes.
Keep the control layer small; add no other planning system or invented deadlines.