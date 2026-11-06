# Musical Worlds — expansive creative workspace (implementation review)

## Purpose

This expands the Instrument Desk beyond interval/role retrieval. The five research missions inform *distinct musical responsibilities*, not a universal learning taxonomy or an implication that teaching effectiveness is established.

The new multi-experience workspace is integrated into Home beside the accepted Practice Runtime, without changing draft PR #79 or the existing deterministic music engine.

## Seven experiences

| Situation | Learner responsibility | Audible consequences |
|---|---|---|
| The band's empty space | Compose a supportive guitar part; leave space and adapt across arrangements | Compare ensemble, backing only and isolated guitar |
| Inside the groove | Write rests, ghost strokes and pitched offbeat figures | Hear new patterns against original drums and bass |
| The missing musician | Reconstruct a line by ear before revealing one interpretation | Remove and restore the reference guitar |
| Harmony detective | Hold one pitch while the underlying chord changes; defend an interpretation | Compare G/C/D7 bass contexts with conditional engine facts |
| Musical dialogue | Invent an answer to an authored call | Four-bar alternating call and response |
| A phrase becomes a piece | Write A/B phrases and choose a formal return | AABA / ABAB / ABBA over changing original accompaniment |
| The same notes, four voices | Hear contrasting attack/duration placements and perform your own | Elementary expressive comparisons, not stylistic grading |

This is broad experience coverage, **not** a claim of unlimited repertoire, culturally authenticated style packs, or completed expert-level pedagogy.

## Ownership and privacy

- Engine facts come from musicQueries.getNoteAtFret and (given an explicit chord context) musicQueries.analyseNotes; no new engine facts or public theory contracts.
- Authored material and bounded editorial choices live in lab/musical-worlds-material.mjs.
- The sample-backed guitar uses the existing verified CC0 manifest with byte-size checks; bass and drums are original synthesised accompaniment, not oscillator substitutes for missing guitar recordings. All sound events share one native Web Audio clock.
- Local user input is held in this browser tab; there is no account, telemetry, mastery model or backend.
- Microphone recording is optional and explicitly local-only, using MediaRecorder for personal replay and saving, not a musically precise looper or automatic grading.
- Disclosures do not turn subjective impressions into correct/incorrect judgments.
- No copyrighted song tabs, commercial recordings or bulk source acquisition were added.

## Scope and limitations

1. Three original arrangements and two original reference phrases still bound the musical palette; the app does not yet offer rich cross-cultural repertoire or licensed real songs.
2. The beat editor uses sixteen subdivisions in a 4/4 bar. It is not a general metre, swing or complex groove engine.
3. Composition uses 1-bar A/B phrases combined into four bars. It does not provide an unrestricted multitrack, polyphonic DAW.
4. Microtiming controls are intentionally simple and do not claim authentic style or an emotion score.
5. Seven experiences and passing technical checks do not establish musical depth, retention or transfer.

## Verification and learner gate

Run npm run verify, which includes npm run test:worlds. Review all seven modes with the real guitar and headphones, including the hidden-answer and self-recording flows, on a desktop and narrow viewport in light and dark themes. Confirm the existing Home/Practice experience continues to work. The exact-head PR preview must be published and manually approved before a learner-facing merge.

No automated workflow or generated report can replace the learner's verdict about musical usefulness.
