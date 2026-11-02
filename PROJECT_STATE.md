# Guitar Explorer — Project State

Last updated: 2026-11-02

This is the operational entry point. `project-state.json` is its validated
machine-readable companion; `npm run context` prints it with revision metadata.

## North star

Help Arun see the fretboard, hear relationships, follow harmony, create and develop
short phrases, improvise and transfer ideas on his guitar. Physical usefulness is the
product signal; completion is not mastery.

## Accepted merged capability

Merged master includes the deterministic engine through Phase 2D, existing Labs,
ScenarioV1, bounded Melody generation, Phrase Foundation PR 1 (#41), Harmonic Gravity
Product Spine v1 (#44), Role Lens v0 (#46), Audio Out v0.5 (#48), exact-head
preview/verify/evidence tooling, and now **Accompaniment v1 (#52)**.

Issue #15 remains complete. Do not repeat the old Harmonic Gravity, Parsimonious Path,
Melody Over Harmony or Develop the Idea validation gates.

**Audio Out v0.5 is accepted.** It established learner-controlled tempo, native
plucked-string playback, staggered chord strums and explicit single-note plucks while
preserving prediction and real guitar use.

**Accompaniment v1 is accepted and merged.** Arun approved exact head
`5bf9f26d943e3860301ef9ff2ff21d514885e0d2`; PR #52 merged as
`135a4589c57467c66472f86ab8a8463d9eeb7d10`; Issue #51 is complete. The accepted
proof keeps harmony truth in the existing engine while a reusable accompaniment
runtime owns editable tempo, per-chord bars and a small down/up/rest strumming plan.
Arun also explicitly noted that the current accompaniment UI should receive a later
Product Design/Figma refinement. That visual refinement is not a reason to move the
runtime logic into exercise-specific code.

## Current active work

Two independent tracks are active.

### 1. Looper v0 · Issue #53

Goal: record one learner-created accompaniment pass, loop it locally, then improvise
over the learner's own rhythm.

The first proof reuses the accepted G-major `G → C → D7 → G` accompaniment context.
The supplying accompaniment/exercise layer provides tempo, bars, pattern and capture
duration. The looper itself does not parse or judge harmony.

Bounded v0 scope:

- browser `getUserMedia` + `MediaRecorder` only;
- choose an audio input after permission where the browser exposes devices;
- one four-beat count-in at the supplied tempo;
- one bounded progression-length recording;
- automatic stop at the supplied capture duration plus manual stop/cancel;
- one local in-memory take at a time;
- play once, loop, stop and discard/re-record;
- use the loop as a backing context for a small existing Guitar Explorer improvisation
  relationship;
- explicit privacy boundary: no upload, transcription, pitch/chord/style grading or AI
  audio judgment.

### Reusable architecture boundary

These capabilities should be reusable across many exercises, but **not all belong in
the deterministic music engine**:

- **Music engine:** notes, intervals, chords, harmony, phrases and other deterministic
  musical truth.
- **Accompaniment runtime:** tempo, meter, bars-per-chord and strumming choices supplied
  to playback. These are material/learner choices, not theory truth.
- **Looper runtime:** microphone permission, count-in, supplied capture duration,
  recorded-media lifecycle and loop playback. It must not know whether the learner
  played the right notes or chords.
- **Exercise/material layer:** supplies the musical context and decides when playback or
  looping is pedagogically useful.

This makes accompaniment and looping **product-native reusable capabilities** without
polluting Core theory or baking them into one exercise.

Explicitly out of scope for Looper v0: latency calibration, automatic trimming or beat
correction, waveform editing, multitrack transport, effects/amp modelling, cloud
storage/sharing, transcription, correctness grading and generalized DAW architecture.

Merge gate: exact-head `npm run verify`, exact-head Pages preview, Arun browser +
physical-guitar + microphone/audio-interface review, then explicit approval.

### 2. 5–10 fragment Style Study · research only

The Style Study continues independently as a source-backed representation pressure
test. It must not be shaped to justify Looper, Audio In or Style runtime. Repeated real
requirements may later justify one bounded representation addition.

## Current PR / issue disposition

- **Issue #53:** Looper v0 active; implementation branch `feat/looper-v0`.
- **PR #52 / Issue #51:** Accompaniment v1 merged as
  `135a4589c57467c66472f86ab8a8463d9eeb7d10`; physically/browser accepted.
- **PR #48 / Issue #47:** Audio Out v0.5 merged as
  `3f1c8edd786202e93d9a12df6fd27217efa2c270`; physically/browser accepted.
- **PR #46 / Issue #45:** Role Lens v0 merged and physically accepted.
- **PR #44 / Issue #43:** Product Spine v1 merged and physically accepted.
- **PR #41 / Issue #40:** Phrase Foundation PR 1 merged; PR 2 is not commissioned.
- **PR #36 / Issue #35:** merged; retain exact-head preview protection.
- **PR #39 / Issue #38:** deferred and closed unmerged.

## Review and verification

Use `npm run verify` as the authoritative full repository gate for implementation.
Learner-facing runtime work requires an exact-head Pages preview and Arun's explicit
physical/browser approval before merge.

Keep musical truth, accompaniment choice, recorded media, audio perception, task
compliance, AI proposals and subjective musical judgment separate.

## Where decisions live

- GitHub master: merged implementation/capability.
- GitHub issue/PR: one implementation slice's scope and evidence.
- Figma: approved visual/product design when applicable.
- Trello Project Hub: cross-chat meeting point for priorities, dependencies, sources and
  decisions.
- Research artifacts: input, not implementation authorization.

`AGENTS.md` and `docs/AUTONOMY_CONTRACT.md` define execution boundaries;
`docs/ARCHITECTURE.md` defines architecture. Keep the control layer small and avoid
inventing a second planning system.
