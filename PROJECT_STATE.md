# Guitar Explorer — Project State

Last updated: 2026-11-06 (Australia/Sydney). This branch records the current Musical Worlds review under Issue #70.

## North star and product test

Help Arun see the fretboard, hear relationships, follow harmony, develop phrases, improvise and transfer on his guitar.

Can he open Guitar Explorer, begin playing in a couple of actions, finish a useful 10–15 minute session and receive meaningful variation without ChatGPT designing it? Repository activity and screen completion are not musical mastery.

## Merged baseline

Master contains deterministic Music Engine through Phase 2D, Phrase Foundation #41, Product Spine/Harmonic Gravity #44, Role Lens #46, Audio Out v0.5 #48, Accompaniment v1 #52, control-plane reconciliation #61, research-only Style Foundation #63, Instrument Desk Home #65, Productization 1A #72 (merge d2db197) and Productization 1B #74 (merge e323d1c). Legacy experience behavior remains available and regression-tested.

Merged Productization 1A replaces the Home catalogue with a functional Start/Continue path and one sampled-guitar Practice Runtime. Arun accepted that it felt like practicing while deliberately primitive/simple. This is not approval of sufficient exercise depth. Legacy Labs remain reference/regression surfaces, not primary navigation.

## One primary milestone

Issue #70: Productization 1 — Practice Session v0.

Home → focus/start/continue → generated session → ONE Practice Runtime → physical actions → variation → transfer → completion.

Thin responsibilities: Music Engine truth → Material Generator → local Exercise Recipe → simple Session Composer → Practice Runtime → reusable fretboard/audio/backing tools. No universal learning DSL, curriculum graph or mastery engine.

The milestone eventually proves Interval Hunt, Role Ear → Fretboard and Target Landing in the same runtime, with sampled guitar audio and a coherent 10–15 minute session. No later child is automatic.

## Latest accepted child

Issue #73 is closed completed. PR #74: Productization 1B — Role Ear → Fretboard inside the same root Practice Runtime, merged as e323d1c466288fc656ab20b68cdb8b35db00c17d.

Arun explicitly approved reviewed head c70c74007e5e75a9789ead40c6c7382eeb951a5e on 4 November 2026: “Approved.” Full verify, exact-head preview and desktop/narrow/light/dark review passed before merge. Record that approval without inventing a more detailed listening, physical-guitar or learning verdict.

The accepted child adds one real Ear/context focus: hear an unchanged anchor against three chords → commit ungraded impressions → reveal engine role facts → locate/play the anchor → play that same pitch against changing sampled harmony → transfer to another anchor/context order → complete. Interval Hunt stays available and unchanged.

The musical generator derives valid contrasting roles without reading sample coverage. A separate adapter validates curated G/C/D7 placements against engine chord tones, then checks audio support. Only the F#4 attack from closed #58 is added to the existing renderer; no branch reopen/merge or synth default.

#71/#72 and #73/#74 are completed and accepted. #70 remains incomplete. #75 Target Landing is closed not-planned and stays deferred.

## Current unmerged work

- **Draft PR #81: Musical Worlds.** Continue the existing branch from the live master baseline. Seven creative situations share the Instrument Desk with the accepted Practice Runtime. Current work focuses on playable recurring backing, musical decisions and audible consequences. See docs/MUSICAL_WORLDS.md for the learner review.
- **PR #79: rejected learner review.** Keep it separate and unmerged; #77/#78 remain open and unaccepted. More puzzle shapes did not give Arun satisfying musical application. Preserve the blocking review as evidence.
- **Review gate:** authoritative full verify, exact-head Pages preview, browser audio and layout checks, then Arun's listening and physical-guitar review. Do not merge without explicit approval of the reviewed head. A GitHub Actions startup failure with no jobs is an infrastructure blocker, not a passing or failing test result.

Read docs/ROLE_EAR_PRACTICE_V0.md for the bounded sequence, material/audio boundary and review path.

Read docs/PRODUCTIZATION_1_BLUEPRINT.md for the current flow audit, minimal state model, reuse/removal decisions and audio path.

Required before any future learner-facing merge: focused tests, full npm run verify, exact-head Pages preview, browser review, Arun's acoustic-guitar/listening trial and explicit approval of that exact head. #74's approval applies only to its reviewed head. Stable publication is still reserved and explicitly controlled; PR previews may be removed automatically after merge.

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
