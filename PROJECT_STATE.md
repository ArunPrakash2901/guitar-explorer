# Guitar Explorer — Project State

Last updated: 2026-11-03. Productization reset from Arun's current request and Issue #70 supersedes the former feature-by-feature queue.

## North star and product test

Help Arun see the fretboard, hear relationships, follow harmony, develop phrases, improvise and transfer on his guitar.

Can he open Guitar Explorer, begin playing in a couple of actions, finish a useful 10–15 minute session and receive meaningful variation without ChatGPT designing it? Repository activity and screen completion are not musical mastery.

## Merged baseline

Master contains deterministic Music Engine through Phase 2D, Phrase Foundation #41, Product Spine/Harmonic Gravity #44, Role Lens #46, Audio Out v0.5 #48, Accompaniment v1 #52, control-plane reconciliation #61, research-only Style Foundation #63 and Instrument Desk Home #65. Legacy experience behavior remains available and regression-tested.

The merged Home catalogue and separate Labs do not yet meet the new product test. The native synth is accepted scaffolding, not the target sound for normal Productization Practice.

## One primary milestone

Issue #70: Productization 1 — Practice Session v0.

Home → focus/start/continue → generated session → ONE Practice Runtime → physical actions → variation → transfer → completion.

Thin responsibilities: Music Engine truth → Material Generator → local Exercise Recipe → simple Session Composer → Practice Runtime → reusable fretboard/audio/backing tools. No universal learning DSL, curriculum graph or mastery engine.

The milestone eventually proves Interval Hunt, Role Ear → Fretboard and Target Landing in the same runtime, with sampled guitar audio and a coherent 10–15 minute session. No later child is automatic.

## Current bounded child and review gate

Issue #71: Productization 1A — Home to generated Interval Hunt in one Practice Runtime.

Fresh branch from master b495276. Replaces the primary Home catalogue with Start/Continue and one runtime. Proves only major/minor thirds in standard tuning, frets 0–3: find → register variation → fresh-root transfer, with reveal, physical phrase use, ungraded reflection, completion and another deterministic session. Continue is in-tab only; no learner history.

Recorded acoustic prompts are selectively extracted from closed #58: 11 needed CC0 per-string attacks and the small Web Audio renderer. No A/B mode or normal oscillator fallback. #56's curated chord voicings are not needed in this child.

This short single-family session does NOT complete #70 or claim learner effectiveness. Next separately bounded child, after review: Role Ear → Fretboard in this same runtime; later Target Landing with simple backing.

Read docs/PRODUCTIZATION_1_BLUEPRINT.md for the current flow audit, minimal state model, reuse/removal decisions and audio path.

Required before any learner-facing merge: focused tests, full npm run verify, exact-head Pages preview, browser review, Arun's acoustic-guitar/listening trial and explicit approval of that exact head. Stable publication is still reserved and explicitly controlled. No merge is authorized by #70/#71 alone.

## Closed unmerged references

- #56 / Issue #55: curated G/C/D7 physical placement. Do not reopen or merge.
- #58 / Issue #57: sampled acoustic feasibility, 12 attacks/provenance. Extract only needed pieces on fresh Productization branches; do not revive the stacked branch.
- #69 / Issue #68: warm visual consolidation/Figma extensions. Useful tokens/reference, superseded as product flow.
- #67 / Issue #66: Interesting Material. Parked with Style/song work.
- #54 / Issue #53: MediaRecorder looper UX only. Not the future precise PCM architecture.
- #50 / Issue #49: superseded UI reference.

## Retained infrastructure and parked work

Retain deterministic truth, shared fretboard, bounded Melody generator/resolver, accompaniment plan/Web Audio clock, exact-head previews and local-only validation/evidence tools. Legacy routes remain reference/testing surfaces rather than the new learner navigation.

Accompaniment later enters Practice with strong defaults, progression, tempo, simple groove and play/stop. Per-chord structure editing is secondary. Target Navigation is a recipe inside Practice, not a new destination.

Do not implement or display unfinished controls for looper, Style, songs, tone/amp support, AI tutor, automatic transcription/grading, backend/accounts, learner adaptation/mastery or DAW/multitrack. Style research is parked; #63's merged contract is not a runtime roadmap.

Later looper remains separately scoped: one AudioContext clock, count-in, AudioWorklet fixed-frame PCM capture and AudioBuffer looping, with seam/real-device latency tests.

## Authority

Master = merged capability; Issue/PR = bounded execution; PROJECT_STATE/project-state.json = operational handoff; AGENTS + AUTONOMY_CONTRACT = execution boundaries; ARCHITECTURE = durable ownership; Trello = cross-chat priorities/navigation; Figma = reviewed visual direction; research/closed PRs = evidence only.
