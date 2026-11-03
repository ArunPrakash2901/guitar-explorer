# Guitar Explorer — Project State

Last updated: 2026-11-03. Productization reset from Arun's current request and Issue #70 supersedes the former feature-by-feature queue.

## North star and product test

Help Arun see the fretboard, hear relationships, follow harmony, develop phrases, improvise and transfer on his guitar.

Can he open Guitar Explorer, begin playing in a couple of actions, finish a useful 10–15 minute session and receive meaningful variation without ChatGPT designing it? Repository activity and screen completion are not musical mastery.

## Merged baseline

Master contains deterministic Music Engine through Phase 2D, Phrase Foundation #41, Product Spine/Harmonic Gravity #44, Role Lens #46, Audio Out v0.5 #48, Accompaniment v1 #52, control-plane reconciliation #61, research-only Style Foundation #63, Instrument Desk Home #65 and Productization 1A #72 (merge d2db197). Legacy experience behavior remains available and regression-tested.

Merged Productization 1A replaces the Home catalogue with a functional Start/Continue path and one sampled-guitar Practice Runtime. Arun accepted that it felt like practicing while deliberately primitive/simple. This is not approval of sufficient exercise depth. Legacy Labs remain reference/regression surfaces, not primary navigation.

## One primary milestone

Issue #70: Productization 1 — Practice Session v0.

Home → focus/start/continue → generated session → ONE Practice Runtime → physical actions → variation → transfer → completion.

Thin responsibilities: Music Engine truth → Material Generator → local Exercise Recipe → simple Session Composer → Practice Runtime → reusable fretboard/audio/backing tools. No universal learning DSL, curriculum graph or mastery engine.

The milestone eventually proves Interval Hunt, Role Ear → Fretboard and Target Landing in the same runtime, with sampled guitar audio and a coherent 10–15 minute session. No later child is automatic.

## Current bounded child and review gate

Issue #73 / draft PR #74: Productization 1B — Role Ear → Fretboard inside the same root Practice Runtime.

Fresh branch from master d2db197. Adds one real Ear/context focus: hear an unchanged anchor against three chords → commit ungraded impressions → reveal engine role facts → locate/play the anchor → play that same pitch against changing sampled harmony → transfer to another anchor/context order → complete. Interval Hunt stays available and unchanged.

The musical generator derives valid contrasting roles without reading sample coverage. A separate adapter validates curated G/C/D7 placements against engine chord tones, then checks audio support. Only the F#4 attack from closed #58 is added to the existing renderer; no branch reopen/merge or synth default.

#71 is closed completed and #72 is merged/accepted at d2db197. This second child still requires its own listening/physical-guitar review and explicit approval. #70 remains incomplete. Target Landing is the next separately scoped child if #73 is accepted; no mixed-family composer yet.

Read docs/ROLE_EAR_PRACTICE_V0.md for the bounded sequence, material/audio boundary and review path.

Read docs/PRODUCTIZATION_1_BLUEPRINT.md for the current flow audit, minimal state model, reuse/removal decisions and audio path.

Required before any learner-facing merge: focused tests, full npm run verify, exact-head Pages preview, browser review, Arun's acoustic-guitar/listening trial and explicit approval of that exact head. Stable publication is still reserved and explicitly controlled. No merge of the new child is authorized by #70/#73 alone.

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
