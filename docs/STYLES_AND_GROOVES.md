# Styles and grooves review

Choose a style to guide harmonic movement. In **More settings → Rhythm**, select **Use style rhythm** to apply its suggested meter, strum, kit and tempo. Each setting remains editable. Press Generate to hear the style's harmonic preferences with the chosen key and chord colors.

| Style | Try | Listen for |
|---|---|---|
| Funk | E Dorian at 108 BPM | Sixteenth-note syncopation, short upper-string attacks and a staggered kick |
| Reggae | A Mixolydian at 82 BPM | Offbeat upstrokes and the kick/snare together on beat 3 |
| Bossa Nova | C major at 126 BPM with sevenths | Bass alternation and syncopated chord answers |
| Country | G major at 112 BPM | Bass and treble motion on a triplet shuffle |
| Soul / R&B | A minor at 86 BPM with sevenths | Soft anticipations and a halftime snare |
| Acoustic Ballad | D major at 68 dotted-quarter BPM | Bass and chord separation within 6/8 |

The kit uses the recorded kick, center snare and hi-hat. Softer hits use lower velocity on the same recording. Short guitar attacks use gain envelopes on pitched samples. Bossa is labelled as a basic-kit interpretation. Dedicated cross-stick, rimshot, muted-guitar and separate ghost-note recordings would be needed for those articulations.

`npm run verify` checks meter grids, sample routing, repeatability and loop duration for 16 chords. `npm run test:progression-browser` and `npm run test:progression-browser:preview` check the controls, live switching and audio assets. Listen at both ends of each suggested range and verify that each rhythm still supports the guitar part.
