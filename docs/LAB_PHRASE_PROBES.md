# Melody and motif Lab probes

> Historical reference. These probes and routes are archived in pre-reset Git history.
> See [project state](../PROJECT_STATE.md) for the active application.

These are bounded, disposable physical-guitar experiments at `/melody.html` and
`/motif.html`. They use Music Engine queries for chord identity, written tones,
key degrees, contextual chord relations, intervals and playable fret positions.
The Lab selects a progression, a few role constraints, the order of actions and
when to reveal facts. Fretboard UI v2 only renders the supplied positions,
labels and paths. Attempts, hints, elapsed seconds and reflections remain in
page memory and do not imply mastery or persist across reloads.

**Melody Over Harmony** tests whether deliberate chord-tone targeting helps a
learner hear *pitch meaning as a function of changing harmony*. It uses
ii7–V7–Imaj7 in G major (Am7–D7–Gmaj7) and transfers the same role task to
Bm7–E7–Amaj7. The learner first hears and plays the chords, commits the D7
third, replays one physical G against all three chords, connects the D7 third
to the Gmaj7 root, distinguishes a one-step approach from that target, plays
a four-note example, improvises under a tight note budget and re-derives both
targets in A major. The Lab does not infer harmonic function from the Roman
identity; any sense of arrival is a curated listening prompt.

**Develop the Idea** tests whether a learner can *preserve and transform a
small musical identity across changing harmony*. The given Am7 motif is a
three-note rise and return with a fixed short–short–long feel. The learner
reflects on what makes it recognizable, adapts it to D7 and Gmaj7, changes
one feature at a time, sequences its opening interval from another start,
reuses its last two notes as a fragment, makes an ungraded response, then
combines the motif with deliberate targets in short improvisation passes.
The A-major transfer asks for new harmonic targets before another motif
adaptation. Contour and the fixed feel are Lab-local cues; there is no
universal motif grammar, scoring of musical quality or microphone judgment.

The standalone Rhythm / Syncopation / Delayed Resolution experiment was
**intentionally not implemented**. A fixed motif feel is the only rhythm cue
here. There is no beat grid, meter model, syncopation curriculum, delayed
resolution exercise or musical-time engine.

The next gate is a physical-guitar trial. Melody questions: did target-tone
thinking clarify the chord changes, did “3rd of D7” replace rote “F#”, did
the held G reveal context, and did the relationship survive the A-major
transfer? Motif questions: did phrases sound connected, did the idea survive
the chord change, did scale runs become less automatic, and did target-tone
awareness persist during variation? These questions are not pre-answered by
the software or its automated tests.
