# Chord Progressions review

The local Lab and PR preview open Chord Progressions at the home route. The Instrument Desk remains available at `/instrument-desk.html`. Stable and experimental builds use the Instrument Desk as their home.

## Implementation and review

| Feature | Implemented | Automated verification | Browser verification | Review or limit |
|---|---|---|---|---|
| Generation | All/Auto, seven diatonic modes, six style preferences, mood, two to eight chords, exact chord locks and grip-aware selection | Scale membership, modal spelling, distinct style and mood behaviour, seeded variation, lock conflicts and shape availability | Generate, incompatible locks, shortening and playable regeneration | Mood biases chord colour and movement. Blues stays within the selected mode. |
| Voicings | Open chords, E/A barres, compact grips, inverted triads, sevenths, suspended, diminished and add9 shapes | Sounded pitches, fingering, barre endpoints and all twelve root classes | Finger numbers, real grip navigation, replacement and locking | Try the listed grips on a guitar. The catalogue covers practical selections from a bounded set of chord qualities. |
| Fretboard | Full 0–15 fret view, five CAGED forms, modal and pentatonic layers, selected chord tones and note audition | CAGED coordinates, pitch classes and enharmonic pairs | Full/cropped views, all five forms and arrow/End navigation | Locrian uses the CAGED windows as position references. Try the reduced minor C and G forms on guitar. |
| Guitar sound | Three recorded velocity layers, direction-specific strums, three tone settings, release envelopes and bounded voices | Sample bytes/hashes, all fret positions, pitch, cache, cancellation and scheduler recovery | Real browser decoding, audition and playback, tone change and Stop during loading | The source provides one take per fret and velocity layer. Listen to balance, realism and release. |
| Rhythm and drums | 4/4, 3/4 and 6/8, strum patterns, drum grooves, live track mix and Play/Pause/Stop | Meter pulse math, drum alignment, loop wrap and transport changes | Live meter, tempo, groove and mute changes and pause/resume | Listen to guitar/drum balance at slow and fast tempos. |
| Favorites and sharing | Save, restore, delete, readable text and compact URL | Strict validation, chord/grip restoration, local storage and privacy allowlist | Native clipboard, reloading a link, malformed input and favorites | Favorites are stored in this browser, with room for 24. |
| Integration | Local and nested PR preview entry, desktop/tablet/mobile layout and keyboard controls | Full repository verification and optional Chrome journey | 1380, 844, 390 and 320 px, light and dark | Owner review and exact-head hosted Pages verification precede merge. |

## Reproduce the checks

Use Node 22 and Google Chrome or a compatible Chromium executable. Set `GE_CHROME` if the browser is in a different location.

```text
npm ci
npm run typecheck
npm test -- tests/domain/progression.test.ts tests/domain/progression-voicings.test.ts tests/domain/progression-workspace.test.ts tests/domain/progression-caged.test.ts
npm run verify
npm run test:progression-browser
npm run test:progression-browser -- --preview
```

Set `GE_REVISION` to the checkout SHA before building and `GE_EXPECTED_REVISION` to the same SHA before running the nested browser check. The browser test prints the screenshot directory. It verifies real media decoding, audio scheduling and interactions with browser audio output muted.

## Owner listening and physical-guitar trial

1. Open the review build with Key set to All, Mode set to Auto and chord count set to four. Click Generate, then Play. Try at least three generations and choose a progression worth playing.
2. Open Rhythm. Add a groove, then change meter and strum pattern while playing. Test 4/4 and 3/4 at quarter-note BPM, then 6/8 at dotted-quarter BPM. Move the guitar and drum volume sliders and mute each track. Listen to the attack, balance and loop seam. Pause, resume, then Stop.
3. Choose C major. Compare the displayed open C and G, B diminished, and a G7 or Cadd9 grip on a standard-tuned guitar. Cycle to a barre and an inverted triad. Compare the muted strings, finger numbers and written bass with what you play. Replace and lock one chord, then Generate again and check both its chord and grip.
4. In C major, try the open C form, the A form around fret 3, and the E form around fret 8. Compare the outlined tonic grip with your guitar. Switch to major pentatonic and selected chord tones. In A minor, try the minor pentatonic C and G forms and listen to the highlighted notes.
5. Save a favorite, copy the URL into another tab and verify the restored chord, lock, grip, tempo, groove and fretboard position. Delete the favorite after the trial if desired.

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

The earlier heads were verified through their combined #94 integration. Each new slice passed `npm run verify` locally on its listed SHA. The integration PR records the final exact head, browser results and hosted-preview status.
