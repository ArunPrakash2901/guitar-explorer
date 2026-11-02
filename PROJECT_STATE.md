# Guitar Explorer — Project State

Last updated: 2026-11-02

This is the operational entry point. `project-state.json` is its validated machine-readable companion; `npm run context` prints it with revision metadata.

## North star

Help Arun see the fretboard, hear relationships, follow harmony, create and develop short phrases, improvise and transfer ideas on his guitar. For substantial work, state what he will be able to hear, understand, find, play, improvise or transfer more reliably. Physical usefulness is the product signal; completion is not mastery.

## Accepted merged capability

Merged `master` includes:

- deterministic Music Engine through Phase 2D;
- existing validated Labs, ScenarioV1 and bounded Melody generation;
- Phrase Foundation PR 1 (#41): exact rational musical time plus pure monophonic Phrase/query capability;
- Harmonic Gravity Product Spine v1 (#44): Instrument Desk, temporary PLAY Focus Mode, staged disclosure, tiny phrase use and transfer;
- Role Lens v0 (#46): one supplied material supporting distinct role-notice, create/vary and transfer actions;
- Audio Out v0.5 (#48): learner-controlled tempo, native plucked-string playback, staggered strums and explicit single-note plucks;
- Accompaniment v1 (#52): supplied `G → C → D7 → G` harmony with editable tempo, per-chord bar lengths and one-bar down/up/rest strumming patterns;
- exact-head preview/verify, Session Evidence v3 and physical-validation tooling.

Issue #15 is complete. Earlier accepted physical/browser trials must not be reopened as stale blockers.

## Current learner-facing review gate

### Guitar Performance v0 · Issue #55 / draft PR #56

Primary question: does using actual standard-tuning guitar placements for the accepted accompaniment make the rhythm/harmony easier to hear and reproduce physically?

Current proof keeps the accepted `G → C → D7 → G` plan and compares:

- abstract registered chord tones through the native synth; and
- curated playable open-position voicings `G 320003`, `C x32010`, `D7 xx0212`, still through the native synth.

Architecture boundary:

- Music Engine owns chord/pitch truth;
- Guitar geometry supplies sounding positions;
- the Guitar Performance adapter owns curated physical placement only;
- Accompaniment owns tempo, bars and down/up/rest pattern;
- the audio renderer owns sound only.

PR #56 is verified and previewable but **not approved for merge**. It still requires Arun's listening + physical-guitar A/B review and explicit approval of the exact head.

### Stacked sample feasibility experiment · Issue #57 / draft PR #58

PR #58 is intentionally stacked on #56 so the same physical placements can be auditioned with a small legally sourced steel-string acoustic sample set.

The experiment uses exactly 12 required string/fret attacks, local CC0 assets, provenance/license records and Web Audio clock scheduling. It is a sample-feasibility audition, not a general sampler, electric DI guitar, amp model or TonePreset system.

PR #58 is verified and previewable but **not approved for merge**. The preferred evidence session compares three modes on the same accompaniment:

1. abstract chord-tone native synth;
2. curated physical voicings through native synth;
3. curated physical voicings through sampled acoustic guitar.

Even if one physical session supplies evidence for both boundaries, #56 and #58 remain separate merge decisions.

## Closed / superseded work

### Harmonic Gravity UI follow-up · Issue #49 / PR #50

Closed unmerged as superseded by a later consolidated Instrument Desk/Product Design pass. Preserve its concrete reference fixes: one NOTICE question, temporary focused PLAY actions, keyboard-focus preservation, explicit transfer-key boundary and responsive layout. Do not treat #50 as shipped behavior.

### MediaRecorder Looper v0 · Issue #53 / PR #54

Closed unmerged. Preserve its UX evidence: permission, input selection, count-in, re-record, play/loop/stop and improvisation handoff.

Do **not** promote its MediaRecorder + JavaScript-timer + HTML audio timing path as the musical looper architecture. A future precise looper must be separately scoped around a shared Web Audio clock, fixed-frame PCM/AudioWorklet capture, AudioBuffer looping, seam behavior and real-device input-latency testing.

## Parallel research

The 5–10 fragment Style Study continues independently as a source-backed representation pressure test. It must remain research, not a Style Pack/runtime implementation. Repeated real requirements may justify one later bounded representation addition; isolated awkward fragments do not justify a framework.

## Planned sequence after the current review

No later slice is automatic.

1. Complete Arun's physical/listening review of #56/#58.
2. If accepted, merge #56 and #58 separately with exact-head approval and clean base history.
3. Only then decide whether a tiny common audio-instrument interface is earned by real reuse.
4. Separately commission a PCM/AudioWorklet looper proof if learner recording/looping still has clear value.
5. After runtime boundaries are stable, do one consolidated Product Design/Figma pass for accompaniment + recording/looping + improvisation/target-navigation inside the Instrument Desk.
6. Freeze broad audio/platform work and return the main product lane to learner capability, especially fretboard navigation and transfer.

Tone/amp modelling is not on the critical path. It should return only when a suitable electric/DI source and concrete learner need justify it.

## Review and verification

Use `npm run verify` as the authoritative full repository gate for implementation.

Learner-facing runtime work requires:

- exact-head verification;
- exact-head GitHub Pages preview;
- Arun browser/audio/physical-guitar review where relevant;
- explicit approval of that exact head before merge.

Documentation/control-plane reconciliation does not require a new physical trial.

## Permanent boundaries

Keep these distinct:

- deterministic musical truth;
- supplied/curated musical material;
- guitar placement/performance choices;
- accompaniment choices;
- audio rendering;
- audio observations;
- exercise/task compliance;
- AI proposals;
- subjective human musical judgment.

Do not introduce a generic Learning Engine, universal Exercise Recipe DSL, permanent generic Context/Constraint layer, backend analytics/mastery system, DAW, automatic audio grading or broad Style runtime without a separately justified learner need.

## Where decisions live

- GitHub `master`: merged implementation/capability authority.
- GitHub issue/PR: one bounded implementation slice and its evidence.
- `PROJECT_STATE.md` / `project-state.json`: current operational gate.
- `docs/ARCHITECTURE.md`: durable architecture and boundaries, not transient queue state.
- `AGENTS.md`: durable execution rules, not transient queue state.
- Figma: approved visual/product direction where applicable.
- Trello Project Hub: cross-chat meeting/navigation point for priorities, dependencies and research references.
- Research artifacts: evidence/input, never blanket implementation authorization.

`docs/AUTONOMY_CONTRACT.md` defines execution/approval boundaries. Keep the control layer small; add no parallel planning system or invented deadlines.
