# Style Research Foundation v0

Issue #62 is a research-only normalization proof. This code does not define a Style Pack, transcribe a song, classify an artist, or provide learner-facing material.

## Boundary

Sources identify artifacts and locators. Observations are narrowly typed, source-linked statements scoped to one realization. Assumptions are analyst-supplied context. Derivations retain observation and assumption IDs and the existing Music Engine query that computed the result. Interpretations are explicitly non-deterministic. Alternative sets retain competing readings without choosing a winner. Pedagogy and style hypotheses are downstream and absent here.

Work, arrangement, fragment, and realization IDs are separate. A video or later demonstration cannot silently become evidence of the studio master's fretboard position. `candidate_realization` holds a reported physical reconstruction without asserting that it happened in the recording. Unknown string, fret, onset, and tempo values remain null with an explicit reason when the claim itself is unknown.

The small TypeScript contract and runtime validator accept JSON-compatible records with stable local IDs and references. The adapter delegates physical pitch, conditional key/chord roles, and interval computation to `musicQueries`; it does not supply tonic, fingering, or harmonic function. Standard tuning is the only physical adapter tuning in v0. Each derivation records the analytical assumption IDs. A computed degree is exact **given** that context, not evidence that the context is the true key.

## Diagnostic fixtures

- `JF-CAND-004`: studio sounding material, separate 1991 live/2006 demonstration, unknown studio fret position, unresolved no-capo/capo transcription and tonal-center readings.
- `JF-CAND-012`: studio D3 with unknown position; reported open-D/A5 alternatives in a candidate realization; one pitched G-string event and five simultaneous muted strings, based on artist report/pilot normalization.
- `JF-CAND-011`: ordinary full acoustic strum in the video, separate from the studio audio and its unknown exact position; causal arrangement explanation stays an interpretation.

These are **selective claims from the pilot**, not full event transcriptions. The original research sometimes classifies harmonic function as observed and transfers video fingerings to studio recordings. The Methodology Audit and independent audit flag those overclaims. The fixtures downgrade such details to reported candidates or unknowns. Source URLs and locators are carried for audit, but this PR did not independently remeasure the audio, inspect all video frames, or license a transcription.

## Fields and limits

`candidate_realization` is the one added identity beyond the requested list: it is necessary for incompatible physical reconstructions that are not observed in a specific live or studio take. `string_stroke` carries both pitched coordinates and disjoint muted string indices so the Can't Stop example does not manufacture pitches for percussive strings. `atBeats` is nullable because the pilot does not provide a measured onset for these diagnostic events.

The validator checks IDs, links, shape, source/realization separation and JSON round trips. It is not a provenance scoring system or proof that a source claim is true. It cannot yet represent polyphonic note lifetimes, continuous bends, microtiming curves, alternate tuning derivation, recording layer/overdub alignment, source revisions, complex performance relationships, or corpus comparisons. The Under the Bridge let-ring texture is therefore a scoped observation, not a fabricated polyphonic score.

Next, review these three normalizations against the underlying sources. If they hold, normalize only the remaining diagnostic fragments and record repeated gaps before adding event-time/polyphony representation. Do not turn them into exercises or a Frusciante pack from this PR.
