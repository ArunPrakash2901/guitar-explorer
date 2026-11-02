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

Two independent tracks are active.

### 1. Audio Out v0.5 · Issue #47 / draft PR #48

Arun's first Audio Out review rejected the primitive simultaneous oscillator / web-blip
surface as too weak for a musical-learning product. The merge target is now a bounded
v0.5 rather than the original v0 proof.

The current slice adds only:

- learner-controlled playback tempo (50–140 BPM in the current UI);
- native sample-free plucked-string synthesis;
- staggered pitch onsets for chord strums;
- an explicit single-note pluck in Role Lens;
- the existing Harmonic Gravity and Role Lens musical facts, unchanged.

The Harmonic Gravity prompt still leaves the resolving answer silent. Audio remains
optional and must preserve prediction plus physical guitar use rather than turning the
experience into passive playback.

This slice deliberately does **not** add editable strumming-pattern vocabulary,
bars-per-chord accompaniment, recording/looping, Audio In, grading, a backing-track
engine, sample-library framework, DAW/transport architecture or Style runtime.

If the native plucked-string voice remains musically distracting in physical review,
stop and evaluate one licensed/sample-backed guitar instrument as a separate decision
rather than expanding synthesis architecture inside #48.

### 2. 5–10 fragment Style Study · research only

The Style Study continues independently as a source-backed representation pressure
test. For each fragment record:

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
engine. Do not shape the study to justify Audio, Accompaniment, Looper or Style runtime.

### Style research boundary

- Research only; no Style Pack runtime or weighted artist generator.
- Style Knowledge may propose/select material; it does not redefine deterministic
  theory truth.
- Preserve provenance and distinguish sourced fact from interpretation.
- Do not broaden Core because one fragment is awkward to represent; look for repeated
  demand across the small corpus.
- Do not turn copyrighted source material into a lick catalogue. Capture only the
  structure needed for capability analysis and transferable learning concepts.

## Planned sequence after Audio Out v0.5

Only if #48 is physically accepted, the current product direction is:

1. **Accompaniment v1** — separately scope meter, bars-per-chord and a small editable
   strumming-pattern representation/playback boundary. Harmony truth remains in the
   engine; accompaniment choice remains material/playback policy, not theory truth.
2. **Looper v0** — only after accompaniment is useful, separately scope count-in,
   record/re-record, loop playback and improvisation over the learner's own recorded
   progression. Recorded audio remains media/observation, not proof of correctness.

Neither follow-up is commissioned by this file. Each needs its own issue, implementation
scope, exact-head preview and learner review.

## Gated follow-ups

**Audio In remains later and experimental.** A first spike should stop at permission /
input level, onset and stable monophonic pitch. Preserve uncertainty in an
`AudioObservation`; deterministic musical queries may explain what a candidate pitch
would mean, but must not convert probabilistic perception into certain performed
correctness. No polyphonic/style grading.

Phrase/Harmony PR 2, broad meter/groove/articulation/polyphony promotion,
voicing/fingering promotion, broad AI/agent work, Style runtime and GX-10/rig control
remain gated by a concrete learner/material need.

## Current PR / issue disposition

- **PR #48 / Issue #47:** Audio Out v0.5 active and draft; current merge gate is exact-head
  verification/preview plus Arun browser/audio/physical-guitar review and explicit
  approval.
- **PR #46 / Issue #45:** Role Lens v0 merged as
  `415605407252b4046fe36bc42b9af29043163517`; completed and physically accepted.
- **PR #44 / Issue #43:** Product Spine v1 merged as `239d933`; completed.
- **PR #41 / Issue #40:** Phrase Foundation PR 1 merged as `d25217a`; PR 2 is not
  commissioned.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged.

## Review and verification

Use `npm run verify` as the authoritative full repository gate for implementation.
PR #48 must have refreshed exact-head CI and Pages revision evidence after the v0.5
changes. Arun must test tempo, timbre, chord strum and Role Lens single-note playback
with his guitar and explicitly approve the exact head before merge.

The Style Study is research and has no learner-facing merge gate of its own. Any future
runtime slice derived from it must receive a new bounded issue and the normal review
gates.

Keep musical truth, accompaniment choice, task compliance, audio perception, AI
proposals and subjective musical judgment separate.

## Where decisions live

- GitHub master: merged implementation/capability.
- GitHub issue/PR: one implementation slice's scope and evidence.
- Figma: approved visual/product design when applicable.
- Trello Project Hub: cross-chat meeting point for priorities, dependencies, sources and
  decisions.
- Research artifacts: input, not implementation authorization.

`AGENTS.md` and `docs/AUTONOMY_CONTRACT.md` define execution boundaries;
`docs/ARCHITECTURE.md` defines architecture, and the physical protocol applies to new
trials. Keep the control layer small; add no other planning system or invented
deadlines.
