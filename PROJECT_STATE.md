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
`239d933`), **Role Lens v0 (merged #46 at `415605407252b4046fe36bc42b9af29043163517`)**,
and the preview / verify / identity / local-evidence tooling. PR #36 provides exact-head
preview protection. Stable publication remains a separate explicit decision.

**Issue #15 is complete.** Arun accepted Harmonic Gravity / Practice Session,
Parsimonious Path, Melody Over Harmony and Develop the Idea, including PR #37's
transfer regression. Preserve the recorded confirmation and do not repeat those old
trials or describe them as blockers.

**Product Spine v1 is complete and separately accepted.** Arun approved the Figma
journey, reviewed exact head `c46d9617a07ddd8e59402332b4311f2746e65f77` in the
browser with his guitar, and explicitly approved merge. PR #44 merged as
`239d933e6b70f761a07539f4f34e672d22852922`; Issue #43 closed completed. The
accepted learner result is that the flow changed how Arun listened, predicted,
noticed and made a musical decision rather than merely following instructions.

**Role Lens v0 is also complete and physically accepted.** Issue #45 / PR #46 proved
that one supplied musical material can support genuinely different learner actions
without a universal Exercise Recipe, generic Context layer or new theory breadth.
The accepted flow reused C4 over Am7 → D7 → Gmaj7 for role prediction, fretboard
location, deliberate phrase creation and variation, then reconstructed the
relationship as D4 over Bm7 → E7 → Amaj7. Arun approved exact head
`125f9458802b1f1fd02293c9a8c12240f3cbcd96`; PR #46 merged as
`415605407252b4046fe36bc42b9af29043163517`.

The evidence supports keeping **Musical Material → learner action** as a useful
conceptual separation. It does **not** yet justify a universal recipe schema,
permanent generic Context framework, Learning Engine or broader engine abstraction.

## Current active work

**Issue #49 is the current bounded UI follow-up.** On 2026-11-02 Arun requested a
fresh Product Design/Figma review and implementation without another design-approval
stop. Refine the accepted Harmonic Gravity Instrument Desk and temporary playing
Focus, remove repeated headings, retain keyboard focus and correct the transfer key
boundary. Keep the accepted musical tasks, commitments, reveals and shared renderer.
This branch requires `npm run verify` and an exact-head Pages PR preview. It records
browser/software review only; it does not claim new physical-guitar acceptance.

The **5–10 fragment Style Study** remains a research-only
representation pressure test. Use a small, source-backed set of real musical ideas
from one or two coherent artists/traditions and record for each fragment:

- source/provenance;
- pitch structure;
- rhythm where the source supports it;
- harmonic situation and note/chord roles;
- articulation/technique;
- guitar placement where known;
- transferable musical principle;
- what Guitar Explorer can already represent;
- what it cannot represent;
- confidence/interpretation notes.

The purpose is to discover repeated real representation needs before expanding the
engine. Repeated material requirements may justify one later addition such as timed
harmony, meter/groove, articulation, polyphony or phrase-level guitar placement.
Heterogeneous gaps are evidence to keep material flexible rather than inventing a
universal Style schema.

### Style research boundary

- Research only; no Style Pack runtime or weighted artist generator.
- Style Knowledge may propose/select material; it does not redefine deterministic
  theory truth.
- Preserve provenance and distinguish sourced fact from interpretation.
- Do not broaden Core because one fragment is awkward to represent; look for repeated
  demand across the small corpus.
- Do not turn copyrighted source material into a lick catalogue. Capture only the
  structure needed for capability analysis and transferable learning concepts.

## Gated follow-ups

**Audio Out v0 remains waiting.** Role Lens confirms that listening-led interaction is
valuable, but that alone does not require an audio subsystem. After the Style Study,
compare whether the next highest-information slice is Audio Out, one specific
representation addition exposed by the material study, or another material/action
proof. If Audio Out is chosen, begin with the smallest renderer needed by one proven
learner action. Native Web Audio remains the technical baseline; Tone.js, smplr and
sample assets are experiments rather than architecture commitments.

**Audio In remains later and experimental.** A first spike should stop at permission /
input level, onset and stable monophonic pitch. Preserve uncertainty in an
`AudioObservation`; deterministic musical queries may explain what a candidate pitch
would mean, but must not convert probabilistic perception into certain performed
correctness. No polyphonic/style grading.

Phrase/Harmony PR 2, meter/groove, articulation, polyphony, voicing/fingering
promotion, broad AI/agent work, Style runtime and GX-10/rig control all remain gated
by a concrete learner/material need.

## Current PR / issue disposition

- **Issue #49:** UI follow-up commissioned on 2026-11-02; implementation/preview work
  continues on its own branch. No new theory, audio, framework or general router.
- **PR #46 / Issue #45:** Role Lens v0 merged as
  `415605407252b4046fe36bc42b9af29043163517`; completed and physically accepted.
- **PR #44 / Issue #43:** Product Spine v1 merged as `239d933`; completed.
- **PR #41 / Issue #40:** Phrase Foundation PR 1 merged as `d25217a`; PR 2 is not
  commissioned.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged.

## Review and verification

Use `npm run verify` as the authoritative full repository gate for implementation.
The next Style Study is research and therefore has no learner-facing merge gate of its
own. Any future runtime slice derived from it must receive a new bounded issue, exact-
head verification/preview where applicable, and physical review before merge.

Keep musical truth, task compliance, audio perception, AI proposals and subjective
musical judgment separate.

## Where decisions live

- GitHub master: merged implementation/capability.
- GitHub issue/PR: one implementation slice's scope and evidence.
- Figma: approved visual/product design when applicable.
- Trello Project Hub: human-readable priorities, dependencies, sources and decisions.
- Research artifacts: input, not implementation authorization.

`AGENTS.md` and `docs/AUTONOMY_CONTRACT.md` define execution boundaries;
`docs/ARCHITECTURE.md` defines architecture, and the physical protocol applies to new
trials. Keep the control layer small; add no other planning system or invented
deadlines.
