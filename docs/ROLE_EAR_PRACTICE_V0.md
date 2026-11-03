# Role Ear → Fretboard v0

Issue #73 is the second bounded child of #70. It extends the root Practice Runtime accepted in #72, merge d2db197. Arun's verdict that 1A felt like practicing approves that concept; it does not establish sufficient depth or completion of #70.

## Small interaction inside the existing shell

Inspected the merged Home/task runtime before implementation. Retain its header, Start/Continue, task/context area, shared fretboard, sampled audio controls and completion. The new focus is “One pitch, changing chords”. Interval Hunt's major/minor material, state sequence and replay identities stay unchanged.

One obvious next action at a time:

1. Hear one chord plus an unchanged anchor pitch.
2. Choose settled / tense / unsure and commit. Repeat for three contexts; no role labels yet.
3. Reveal all three engine-derived root intervals, chord membership and constituent notes alongside the unchanged subjective impressions.
4. Locate and play the exact anchor on D/G/B strings, open through fret 2. Screen location checking is separate from subjective hearing and real-guitar performance.
5. Play the same pitch while the app supplies two slow sampled strums per chord. Keep the same fretted position or open string throughout; replay the twelve-second comparison if useful.
6. Transfer to a different anchor pitch class and rotated context order, with fresh listening commitments before labels.
7. Complete or start another deterministic Role session inside the same runtime.

Continue preserves the current comparison/draft/commitments in this tab. It does not create learner history or survive reload. An assisted location reveal is distinct from independent screen retrieval. No score, mastery, microphone observation or performance inference.

## Material first, audio second

role-material.mjs consumes only existing Music Engine queries and formatting. Supplied chord requests G major, C major and D dominant seventh are bounded material choices, not a new harmonic-function system. The engine constructs their chords, catalogue symbols, note spellings, chord-root intervals and chord-tone membership.

The generator considers engine locations on D/G/B strings, frets 0–2. It chooses anchors with two chord-tone contexts, one non-chord context and three distinct root intervals, all derived from query results. Current valid anchors are C4, G3 and D3. Seed/version select a repeatable starting anchor and transfer; a fretted anchor is preferred first. No theory labels or tension/stability judgments are authored as an answer table.

The first default C4 comparison illustrates a fourth over G, root over C and minor seventh over D7. G3 transfer has a fifth over C, fourth over D7 and root over G. These are engine facts in the supplied contexts; “settled”, “tense” and “unsure” never become correctness labels. The transfer changes anchor and role pattern within the same three-chord palette; it does not claim new-key breadth.

role-performance.mjs independently validates curated placements from closed #56 against the generated engine chord tones, then checks sample coverage. It never selects the anchor or computes theory. Missing audio coverage is an explicit error, not a fallback to another musical answer. The existing sampled renderer remains unchanged.

Only one extra recorded attack is required: F#4 at high-E fret 2 from closed #58, under its existing CC0 provenance. It completes the curated D7 voicing. Total coverage is twelve attacks, 1,051,631 encoded bytes. All original eleven source attacks and the license are unchanged. No oscillator fallback, pitch shifting, generic voicing search, sampler platform or tone system.

## Small local state, shared runtime

Role state: round/context index, hear/reveal/find/use/complete stage, draft and committed listening impressions, successful audition request flags, selected position/attempt/help state and physical-use acknowledgement. A successful scheduling request is not proof that the learner heard or played anything.

The family has a local reducer and presentation preparation. It reuses the actual root runtime, existing board instance, audio instance, pause/resume and completion; it is not a separate page or a universal exercise DSL. Interval Hunt retains its own simpler sequence. Generic adaptation, mixed-family composition and Target Landing are not implemented here.

Every view/task transition stops current or pending audio. Audio loading failure stays visible and retryable. A cancelled/failed request cannot authorize the next listening commitment. Fixed-pitch use requires the supplied harmony audition and a descriptive learner acknowledgement, not a claim of automatic assessment.

## Validation and review

Focused tests cover deterministic sets/transfer, known engine relationships, sample/voicing agreement, absence of role-answer/location leakage, all subjective values following the same path, retry/help, audio failure/cancellation, fixed-note backing without added anchor plucks, complete two-round client flow, pause/continue and return to unchanged Interval Hunt. The existing Interval Hunt and full legacy regression gates remain.

Full npm run verify and exact-head PR preview are required. Browser review covers desktop, 390-pixel layout, light/dark, listening commitments, deterministic reveal, physical anchor handoff, backing, transfer and completion. Browser interaction only simulates the physical-use acknowledgement.

Arun review: choose “One pitch, changing chords”; listen before labels; keep whatever impressions you hear; find the anchor; physically play that same pitch against changing app chords; then complete the transfer. Does this feel like training hearing/context, rather than another interval quiz? Explicit approval of the exact head is required before merge.

Target Landing remains the next separately scoped child if this succeeds. No full mixed-family session, looper, songs, Style, tone, AI, backend or mastery system.
