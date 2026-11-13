# Guitar trainer review

## Triad Trainer

Try C major on strings 1–3. Play the three inversions in fret order and listen for C, E and G taking turns as the bass. Switch to strings 2–4 to feel how the G-to-B tuning changes the shapes. Compare C♯ major with D♭ major and look for E♯ in C♯. Try A diminished and C augmented with the interval view open.

Each card has one note on each chosen string, three distinct chord tones, and a span of at most four frets counting both endpoints. The trainer uses the first 15 frets and shows up to four positions. The optional finger numbers are suggestions for a guitar trial. The chord diagram, fretboard and sampled playback use the same string and fret coordinates.

## Arpeggio Trainer

Select C dominant 7 in the A position. Play an octave from C up to C and back down. The TAB shows the exact string and fret sequence the audio plays. Try the E position, then loop in eighth-note triplets with the metronome. Pause, resume and cycle all available shapes. For Full shape, the path follows increasing sounding pitches with a preference for adjacent string crossings and smaller fret changes. An octave is only offered when the entire root-to-root sequence fits the position.

The first count-in is one bar. Shape cycling plays all available shapes on the same clock. Looping with the metronome leaves a rest to the next bar when the notes finish early. Changing the tempo or material stops the current run so the new settings apply on the next Play. The display follows the Web Audio clock at the browser's paint rate. Try the paths on guitar before treating the hand-position rules as a fingering verdict.

## Chord colors and modes

Open **More settings → Chords → Chord colors**. Choose exact extras in the seven groups, then Apply and Generate. Select all and Clear all edit the dialog until Apply commits the selection. Cancel and Escape discard those edits. Major and minor remain available when they fit the key. Explicit locks keep their chord identities. Clear the lock to regenerate it under the new filter. Share links and favorites store the selected types, and older links map their single preference to the corresponding choices.

Try G7♯9 in C major with the altered ninth enabled, Cmaj13 with major 13 enabled, and E♭ augmented in C harmonic minor. The altered dominants are available on V, and some upper extensions use compact shells with the root, third, seventh and named extension. The voicing label identifies the shell. The sounded notes omit some of the inner tones of the full chord formula. Compact grips use the All shapes filter and fingerings should be tried on guitar.

In C major blues, play C–F–G while using the major blues scale. In C minor blues, compare Cm–Fm–G against the minor blues scale. Optional dominant sevenths support blues harmony. The Key Chords view labels those choices as backing chords. Harmonic minor and ascending melodic minor use seven chord degrees from written scale thirds.

## Verification

Run `npm run verify` and `npm run test:progression-browser`. For the static review build, set `GE_REVISION` and `GE_EXPECTED_REVISION` to the tested commit, then run `npm run preview:build` and `npm run test:progression-browser:preview`.
