# Chord Progressions review

The local Lab and PR preview open Chord Progressions at the home route. The Instrument Desk remains available at `/instrument-desk.html`. Stable and experimental builds use the Instrument Desk as their home.

## Implementation and review

| Feature | Implemented | Automated verification | Browser verification | Review or limit |
|---|---|---|---|---|
| Arrangement | All/Auto, seven modes, style and mood, 2–8, 12 or 16 chords, locks, replacement and reorder | Scale membership and spelling, shape availability, lock conflicts, long loops and snapshot round trips | Generate, conflict recovery, locked grip preservation, drag and touch reorder, keyboard focus, long playback and sharing | Blues stays within the selected mode. |
| Chord diagrams | Fingered open chords, barres, compact grips, inversions and colour chords with enlarge, audition and label options | Sounded pitches, fingering, barre endpoints and all twelve roots | Voicing navigation, replacement, zoom buttons, keys and swipe, fingers, note names and intervals | Compare muted strings, finger numbers and bass notes on a guitar. |
| Fretboard | Full 0–15 fret view, five CAGED positions, diatonic key chords, both pentatonic layers, modal and triad highlights, and Once, Loop and All scale practice | Fret coordinates, pitch classes, enharmonic intervals and scale events | Key Chords and audition, all forms, keyboard navigation, scale cursor and Stop | Locrian uses CAGED windows as position references. Try the reduced minor C and G forms on guitar. |
| Guitar sound | Three recorded acoustic velocity layers and recorded clean electric, direction-specific strums and short releases | Asset hashes, fret coverage, pitch bounds, cache, cancellation and scheduling | Chrome decoded both banks, switched sound during the loop and stopped pending loads | Electric uses 13 recorded pitch anchors, one take per anchor, and at most two semitones of pitch shift. Listen on speakers and headphones. |
| Rhythm and drums | 4/4, 3/4 and 6/8, editable kick/snare/hat patterns, phrase-end fills, hi-hat click, live track mix and transport | Meter and subdivisions, groove masks, fills, loop boundaries and transport changes | Live drum edits, meter, tempo, groove, independent gains and mute, metronome and pause/resume | Listen to attacks, balance and the loop seam at different tempos. |
| Favorites and export | Star, names, collection filtering, restore/delete, readable text, compact URL and PNG | Validation, version-one migration, chord/grip/rhythm/appearance round trips and private-field allowlist | Native clipboard, old and current links, favorite restore and real PNG download | Favorites stay in the current browser, with room for 24. |
| Integration | Local and nested preview, responsive controls and keyboard navigation | Full repository verification and Chrome journey | 1600, 1380, 844, 390 and 320 px in light and dark | Test audio and touch on a physical phone. |

## Reproduce the checks

Use Node 22 and Google Chrome or a compatible Chromium executable. Set `GE_CHROME` if the browser is in a different location.

```text
npm ci
npm run typecheck
npm test -- tests/domain/progression.test.ts tests/domain/progression-voicings.test.ts tests/domain/progression-workspace.test.ts tests/domain/progression-caged.test.ts
npm run verify
npm run test:progression-browser
npm run preview:build
npm run test:progression-browser:preview
```

Set `GE_REVISION` to the checkout SHA before building and `GE_EXPECTED_REVISION` to the same SHA before running the nested browser check. To run the browser journey against a hosted build, set `GE_BROWSER_URL` to the HTTPS preview directory, `GE_EXPECTED_REVISION` to its full head SHA and `GE_PREVIEW_PR` to the PR number. Run `npm run test:progression-browser:preview`. The test prints the screenshot directory and checks real media decoding and audio scheduling with browser output muted.

## Owner listening and physical-guitar trial

1. Open the review build with Key set to All, Mode set to Auto and chord count set to four. Click Generate, then Play. Try at least three generations and choose a progression worth playing.
2. Turn on Rhythm. Change the meter and strum pattern while playing. Try 4/4 and 3/4 at quarter-note BPM, then 6/8 at dotted-quarter BPM. In Rhythm settings, edit a kick hit and turn on the fill and metronome. Move the independent volume sliders, mute each track and switch from Acoustic to Clean electric. Listen to attacks, releases, fill timing and the loop seam. Pause, resume, then Stop.
3. Choose C major. Compare the displayed open C and G, B diminished, and a G7 or Cadd9 grip on a standard-tuned guitar. Cycle to a barre and an inverted triad. Compare the muted strings, finger numbers and written bass with what you play. Replace and lock one chord, then Generate again and check both its chord and grip.
4. In C major, try the open C form, the A form around fret 3, and the E form around fret 8. Compare the outlined tonic grip with your guitar. Try Key Chords, play a scale in Once and Loop, then stop it. In A minor, try the minor pentatonic C and G forms.
5. On a phone, drag a locked card by its handle, swipe an enlarged diagram and scroll the full fretboard. Save a favorite with a name and collection, open its share link in a new tab and check the grip, groove and fretboard settings. Download the PNG and compare it with the four selected grips.

## Existing stack register

The rows below were inspected at the start of the full implementation mission. PR #94 lists its repaired head. Every row is a draft based on the branch shown.

| PR | Purpose | Base | Head |
|---|---|---|---|
| [#86](https://github.com/ArunPrakash2901/guitar-explorer/pull/86) | Generator | `master` | `4a214c15651c7e5b2f846b234988ea0f0d7dd355` |
| [#87](https://github.com/ArunPrakash2901/guitar-explorer/pull/87) | Guitar voicings | `feat/progression-generator-v0` | `a9494f0afe29e502367d87a59425eba5db085569` |
| [#88](https://github.com/ArunPrakash2901/guitar-explorer/pull/88) | Workspace | `feat/progression-voicings-v0` | `aa733100a27b9206c3a2875bf51d349070b03cd1` |
| [#89](https://github.com/ArunPrakash2901/guitar-explorer/pull/89) | Audio integration | `codex/progression-workspace` | `837355c4b65ac50e3577e14cae342d5073129561` |
| [#91](https://github.com/ArunPrakash2901/guitar-explorer/pull/91) | Product UX and sampled guitar | `feat/progression-audio-recovery` | `d311e60c28a8274597876ffcad3b9ab925a4565c` |
| [#92](https://github.com/ArunPrakash2901/guitar-explorer/pull/92) | Meter and strumming | `feat/progression-product-ux-v1` | `896d3f6e5f3d81840da296c1a895b048889d5a6d` |
| [#93](https://github.com/ArunPrakash2901/guitar-explorer/pull/93) | Chord replacement | `feat/progression-rhythm-v1` | `14355cdb26d63f2e2dfbaded02c3dffc11b9244b` |
| [#94](https://github.com/ArunPrakash2901/guitar-explorer/pull/94) | Modal expansion and repaired baseline | `feat/progression-chord-edit-v1` | `a6f18f85cf10b8541dfaa8718410998597452725` |
| [#95](https://github.com/ArunPrakash2901/guitar-explorer/pull/95) | Styles, moods and chord count | `feat/progression-modal-expansion` | `1e51b6a7572f04ee9473d5afacf27a2b679d2bac` |
| [#96](https://github.com/ArunPrakash2901/guitar-explorer/pull/96) | Fingered grips, chord colour and Locrian | `codex/progression-styles` | `2c7d2b3f5639e82fd540157b5e00bc2ef7ea3dee` |
| [#97](https://github.com/ArunPrakash2901/guitar-explorer/pull/97) | CAGED fretboard | `codex/progression-chord-shapes` | `01fce0857617f081f0a0be3a5d0d746925724b2d` |
| [#98](https://github.com/ArunPrakash2901/guitar-explorer/pull/98) | Acoustic sampler | `codex/progression-caged` | `9c30a4465cae9f5100082f698c13ff8beb569d8d` |
| [#99](https://github.com/ArunPrakash2901/guitar-explorer/pull/99) | Recorded drums and groove mixer | `codex/progression-guitar-sampler` | `881750565d74816ee53d003876cc5763ccee352f` |
| [#100](https://github.com/ArunPrakash2901/guitar-explorer/pull/100) | Workspace and pause/resume | `codex/progression-drums` | `c56332986911e91562c59b4ec64bbef1b2be590c` |
| [#101](https://github.com/ArunPrakash2901/guitar-explorer/pull/101) | Favorites and sharing | `codex/progression-interface` | `79292d5e8bb97f8cb864d2249705079b675c2ba0` |

The earlier heads were verified through their combined #94 integration.

| PR | Purpose | Base | Head |
|---|---|---|---|
| [#102](https://github.com/ArunPrakash2901/guitar-explorer/pull/102) | Progression integration | `codex/progression-favorites` | `4d034dbafc96157d2a7e5b7a297cd0d619b4749c` |
| [#103](https://github.com/ArunPrakash2901/guitar-explorer/pull/103) | Compact controls | `codex/progression-integration` | `f59ff62e17c84f5b9081fcda8fad31f882027553` |
| [#104](https://github.com/ArunPrakash2901/guitar-explorer/pull/104) | Progression interactions | `feat/progression-p0-parity-v1` | `b1022871f5e96fbf85a587cb5319d5f82610ee75` |
| [#105](https://github.com/ArunPrakash2901/guitar-explorer/pull/105) | Touch arrangement and longer progressions | `feat/progression-p1-interactions-v1` | `1408f7ee5a20340836c2bad57b2727a155b0b706` |
| [#106](https://github.com/ArunPrakash2901/guitar-explorer/pull/106) | Fretboard and scale practice | `codex/progression-arrangement` | `131c63b6d63e71a2c6aed5121fd9a9dd1b74f7c4` |
| [#107](https://github.com/ArunPrakash2901/guitar-explorer/pull/107) | Drum editor and metronome | `codex/progression-explorer` | `4e7a2ef2a9624dbd719d259870b933161ad2817d` |
| [#108](https://github.com/ArunPrakash2901/guitar-explorer/pull/108) | Acoustic voicing and clean electric | `codex/progression-rhythm-editor` | `decfb02c12cb97962ffec7dbe5023fa661d03596` |
| [#109](https://github.com/ArunPrakash2901/guitar-explorer/pull/109) | Favorite collections and PNG export | `codex/progression-guitar-sound` | `3be9410fc2ce45d94afc4742a32acf28549c5dc6` |

PR #104 and each of #105–#109 passed full verification and both local Chromium routes on the listed revisions. The final review PR records its own exact head, browser results and hosted-preview status.
