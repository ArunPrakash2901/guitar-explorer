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
ScenarioV1, bounded Melody generation, the Melody preparation seam, and the preview /
verify / identity / local-evidence tooling. PR #36 adds the existing exact-head
preview protection. Stable publication remains a separate explicit decision.

**Issue #15 is complete.** Arun accepted Harmonic Gravity / Practice Session,
Parsimonious Path, Melody Over Harmony and Develop the Idea, including PR #37's
transfer regression. Preserve the [recorded confirmation](https://github.com/ArunPrakash2901/guitar-explorer/issues/15#issuecomment-6494414657)
and earlier history. Do not repeat those old trials or describe them as blockers.
PR #30 satisfied the old seam blocker by reworking and superseding PR #13.

## Primary learner-facing milestone

**Issue #16 — Product Spine v1: Harmonic Gravity first.**

The existing [Figma journey](https://www.figma.com/design/0nYwx0YwxqYZ0t29FeYMI9?node-id=8-2260)
still needs Arun's explicit design approval. No later approval is recorded in the
checked sources. Product Spine implementation has not begun.

Use Instrument Desk as the shell, Guitar Focus Mode as temporary PLAY, and
Relationship Sketchbook's musical-question framing. Preserve context through
PLAY → NOTICE → UNDERSTAND → TRANSFER, showing only what matters now. Explore
remains permissive; Practice deliberately withholds answers.

After approval, commission one bounded implementation issue/PR. Reuse accepted
Harmonic Gravity behaviour and preserve legacy Lab routes. Do not build a general
router/framework or universal Learning Engine. Existing engine facts suffice for
the supported journey unless a concrete approved learner action proves otherwise.

## Current PR disposition

- **PR #41 / Issue #40:** the approved narrow exact-time / monophonic Phrase
  foundation is under review, not merged capability. Its contract and proof are
  legitimate reusable groundwork. Keep it separate from Product Spine and return
  for the explicit merge decision required by its scope. It does not commission PR 2.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged. The optional assistant-hint
  exchange has no accepted physical-use benefit and is not an active milestone.

## Next small exercise design

Prove **Engine truth → Musical material → Exercise recipe → Learner experience**
with one supplied material reused for different learner actions. Role Lens is a
candidate, not an approved runtime or schema. State question, action, invariant,
variation, transfer, deterministic facts, assistance/reveal and human listening.

Bias the small set of repeatable experiences toward orientation, chord-tone
targeting, changing harmonic roles, short phrase creation, motif development,
rhythmic/phrase variation, constraint improvisation and transfer.

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

This session authorizes operational reconciliation and queue disposition, not
Product Spine implementation, learner-facing merges, production publication,
paid services, telemetry or private-evidence upload.

## Review and verification

Use `npm run verify` as the full repository gate. Implementation PRs retain the
existing exact-head Pages preview path. Learner-facing work requires Arun's
browser/physical-guitar review of new behaviour and explicit approval before merge.
Routine non-learner-facing maintenance may resolve within its authorized scope;
do not invent extra approvals or ask to repeat accepted trials. PR #41 retains
its own explicit review/merge requirement. Musical truth, task compliance and
subjective musical judgment remain separate.

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
