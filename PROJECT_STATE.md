# Guitar Explorer — Project State

Last updated: 2026-11-13 (Australia/Melbourne). This release/integration note reconciles newer draft work without retroactively declaring it merged or physically accepted.

## Current app distribution and integration — 13 November 2026

- **GitHub Releases: none published.** GitHub Actions runs for installer sources completed with `startup_failure` and **zero jobs**, so there are no downloadable EXE/APK files. The immediate blocker is restoring Actions execution; source merges do not produce binaries.
- **Personal native package source:** PR #118 (`feat/personal-windows-android-installers`) is stacked on PWA PR #117 (`feat/pwa-installable-release`), itself stacked on integrated Guitar Progressions/Trainers PR #116. Windows uses Electron/NSIS; Android phone/tablet share a Capacitor debug APK. These are personal test wrappers, not signed production releases.
- **Intended workflow:** `.github/workflows/build-personal-installers.yml` creates `personal-v0.1.0-preview` with Windows and Android files *only after both builds pass*. No publish event or download is claimed until the real GitHub Release and attachments are verified.
- **Unmerged dependencies:** the progression/trainer work is a stack of draft PRs; a merge into a parent branch does not merge source into `master`. The independent Looper Studio #111 remains out of this app installer pilot.
- **Validation:** exact native binary builds, iOS/Android/Windows real-device audio, persistence, icons and export remain unverified. Earlier Chromium and source tests on PR #116 are not a substitute for testing this packaging head.
- **Scope decision:** the owner authorized reconciliation and merging of the installer/release work on 13 November, not automatic release publication or bypassing an infrastructure failure. Preserve the review status of unrelated learner-facing PRs.

Responsibility map: `README.md` = entry/installation/status, `AGENTS.md` and
`AUTONOMY_CONTRACT.md` = execution/approval boundaries,
`docs/ARCHITECTURE.md` = stable ownership of Music Core, musical consumers,
audio and packaging adapters, `project-state.json` = machine state,
`docs/PERSONAL_INSTALLER_RELEASE.md` = build/recovery checklist.
All claims about binary availability require a live Release asset.

## Earlier accepted Practice baseline (4 November 2026)



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

## Latest accepted child and next scope

Issue #73 is closed completed. PR #74: Productization 1B — Role Ear → Fretboard inside the same root Practice Runtime, merged as e323d1c466288fc656ab20b68cdb8b35db00c17d.

Arun explicitly approved reviewed head c70c74007e5e75a9789ead40c6c7382eeb951a5e on 4 November 2026: “Approved.” Full verify, exact-head preview and desktop/narrow/light/dark review passed before merge. Record that approval without inventing a more detailed listening, physical-guitar or learning verdict.

The accepted child adds one real Ear/context focus: hear an unchanged anchor against three chords → commit ungraded impressions → reveal engine role facts → locate/play the anchor → play that same pitch against changing sampled harmony → transfer to another anchor/context order → complete. Interval Hunt stays available and unchanged.

The musical generator derives valid contrasting roles without reading sample coverage. A separate adapter validates curated G/C/D7 placements against engine chord tones, then checks audio support. Only the F#4 attack from closed #58 is added to the existing renderer; no branch reopen/merge or synth default.

#71/#72 and #73/#74 are completed and accepted. #70 remains incomplete: two distinct families exist; the third family is now scoped in Issue #75 — Productization 1C / Target Landing inside the shared Practice Runtime. Read that live issue and inspect current master before implementation. #74's approval adds no Target Landing code, mixed-family composer or parked work, and does not approve any future child for merge.

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
