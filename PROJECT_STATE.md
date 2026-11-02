# Guitar Explorer — Project State

Last updated: 2026-11-02

This is the operational entry point. `project-state.json` is its validated
machine-readable companion; `npm run context` prints it with revision metadata.

## North star

Help Arun see the fretboard, hear relationships, follow harmony, create and develop
short phrases, improvise and transfer ideas on his guitar. For substantial work,
state what he will be able to hear, understand, find, play, improvise or transfer
more reliably. Physical usefulness is the product signal; completion is not mastery.

## Accepted merged capability

Merged master includes the deterministic engine through Phase 2D, existing Labs,
ScenarioV1, bounded Melody generation, Phrase Foundation PR 1 (#41), Harmonic Gravity
Product Spine v1 (#44), Role Lens v0 (#46), exact-head preview/verify/evidence tooling,
and **Audio Out v0.5 (#48)**.

Issue #15 remains complete. Arun's acceptance of Harmonic Gravity / Practice Session,
Parsimonious Path, Melody Over Harmony and Develop the Idea must not be repeated as an
old blocker.

Product Spine v1 is accepted: Instrument Desk, temporary PLAY Focus Mode, preserved
musical context and PLAY → NOTICE → UNDERSTAND → TRANSFER changed how Arun listened,
predicted, noticed and made a musical decision rather than merely following
instructions.

Role Lens v0 is accepted: one supplied material supported distinct role-notice,
phrase creation/variation and transfer actions without requiring a universal recipe
schema, generic Context framework or Learning Engine.

**Audio Out v0.5 is now accepted and merged.** Arun reviewed exact head
`7c5a7415efa858cb4a3d3daacfbd93b0f3917f94` in the browser with his guitar and
explicitly approved it. PR #48 merged as
`3f1c8edd786202e93d9a12df6fd27217efa2c270`; Issue #47 is complete. Accepted Audio
Out capability is intentionally bounded to learner-controlled tempo, native
plucked-string playback, staggered chord strums and explicit single-note plucks. The
learner's prediction and physical guitar remain central.

## Current active work

Two independent tracks are active.

### 1. Accompaniment v1 · Issue #51 / draft PR #52

The next learner-facing slice is now commissioned.

Goal: turn one supplied progression into an editable accompaniment plan the learner
can hear, modify and then play physically.

The first proof deliberately reuses the existing G-major material:

`G → C → D7 → G`

Current bounded scope:

- 4/4 only;
- tempo 50–140 BPM;
- 1–4 bars independently for each chord;
- one-bar eighth-note pattern with eight editable slots;
- each slot is `down`, `up` or `rest`;
- three starting patterns plus direct slot editing;
- down/up events reuse the accepted Audio Out v0.5 renderer;
- playback repeats the chosen pattern for each chord's configured bars;
- the learner then stops playback and plays the same plan on guitar.

Architecture separation is mandatory:

- **Harmony truth** stays in the deterministic engine / supplied musical material.
- **Accompaniment plan** owns meter, tempo, bars and strumming choices. These are not
  deterministic theory truth.
- **Audio renderer** renders the plan. It does not choose harmony or musical taste.

Explicitly out of scope for #51/#52: recording, loop capture, microphone analysis,
performance grading, generalized transport/DAW/mixer architecture, swing/groove
quality judgement, Style runtime, AI-generated accompaniment, persistence and new
harmony theory.

Merge gate: exact-head `npm run verify`, exact-head Pages preview, Arun browser +
physical-guitar review, then explicit approval of that exact head.

### 2. 5–10 fragment Style Study · research only

The Style Study continues independently as a source-backed representation pressure
test. For each fragment record source/provenance, pitch structure, supported rhythm,
harmonic situation/roles, articulation/technique, guitar placement where known,
transferable principle, current representability, missing representation and
confidence/interpretation notes.

The study must not be shaped to justify Accompaniment, Looper or Style runtime. Repeated
real requirements may later justify one bounded representation addition; heterogeneous
gaps are evidence to keep material flexible.

## Planned next slice after Accompaniment v1

Only if Accompaniment v1 is physically useful and accepted:

**Looper v0** may separately test count-in, input-device choice, one bounded learner
recording, re-record, loop playback and improvisation over the learner's own
accompaniment.

Recorded learner audio is media/observation, not deterministic proof of correctness.
Looper v0 does not automatically authorize pitch grading, transcription, effects,
cloud storage or a DAW.

## Gated follow-ups

Audio In remains later and experimental. A first spike should stop at permission /
input level, onset and stable monophonic pitch, preserving uncertainty in an
`AudioObservation` rather than converting perception into certain correctness.

Phrase/Harmony PR 2, broad meter/groove/articulation/polyphony promotion,
voicing/fingering promotion, broad AI/agent work, Style runtime and GX-10/rig control
remain gated by concrete learner/material needs.

## Current PR / issue disposition

- **PR #52 / Issue #51:** Accompaniment v1 active and draft; review/merge gate pending.
- **PR #48 / Issue #47:** Audio Out v0.5 merged as
  `3f1c8edd786202e93d9a12df6fd27217efa2c270`; physically/browser accepted.
- **PR #46 / Issue #45:** Role Lens v0 merged and physically accepted.
- **PR #44 / Issue #43:** Product Spine v1 merged and physically accepted.
- **PR #41 / Issue #40:** Phrase Foundation PR 1 merged; PR 2 is not commissioned.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged.

## Review and verification

Use `npm run verify` as the authoritative full repository gate for implementation.
Learner-facing runtime work requires the exact-head Pages preview and Arun's explicit
browser/physical-guitar approval before merge.

The Style Study is research and has no learner-facing merge gate by itself.

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
