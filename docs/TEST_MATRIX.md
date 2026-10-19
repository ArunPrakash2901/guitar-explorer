# Test Matrix

> Historical v0.2 product matrix. Current Phase 1 acceptance is defined in
> `ENGINE_PHASE1.md` and automated under `tests/domain` and `tests/contracts`.
> Applicable musical fixtures are ported now; CAGED, progressions, UI, telemetry
> and browser tests await later authorization. Baseline prototype test success
> does not establish correctness of the legacy UI.

The app teaches musical facts. A plausible-looking wrong answer is worse than an obvious UI failure, so domain tests are mandatory.

## 1. Note-at-fret tests

Standard tuning examples:

- low E open = E
- low E fret 5 = A
- A string fret 3 = C
- D string fret 7 = A
- G string fret 6 = C#
- B string fret 1 = C
- high E fret 12 = E

Also verify octave repetition at fret 12 for every string.

## 2. Interval tests

At minimum:

- A → A = root/unison
- A → C = minor 3rd
- A → C# = major 3rd
- A → D = perfect 4th
- A → E = perfect 5th
- C → B = major 7th

Test all 12 semitone distances programmatically.

## 3. Major-scale spelling

Required examples:

- C = C D E F G A B
- A = A B C# D E F# G#
- Bb = Bb C D Eb F G A
- Eb = Eb F G Ab Bb C D
- F# = F# G# A# B C# D# E#
- C# = C# D# E# F# G# A# B#

The spelling layer must not silently replace E# with F or B# with C in diatonic contexts.

## 4. Major triads

Required examples:

- C = C E G
- A = A C# E
- Bb = Bb D F
- Eb = Eb G Bb
- F# = F# A# C#
- C# = C# E# G#

## 5. CAGED voicings

For every supported root × CAGED shape:

- every sounded position must be a root, major 3rd or perfect 5th of the requested chord
- muted strings from the source template remain muted
- fret positions must be within the supported 0–15 display for current supported roots/templates

Specific regression examples:

- A major G shape = low-to-high `[5,4,2,2,2,5]`
- C major C shape = `[null,3,2,0,1,0]`
- E major E shape = `[0,2,2,1,0,0]`

## 6. Progressions

- A major I–IV–V–I roots = A D E A
- Bb major = Bb Eb F Bb
- C# major = C# F# G# C#

Each chord must contain scale degrees 1/3/5 relative to its chord root while retaining correct key spelling.

## 7. Explore behaviour

- Full exposes note + interval
- Intervals does not expose note names by default
- Roots exposes only roots
- Hidden exposes no answer markers
- Build allows arbitrary position selection
- correct build passes
- missing/extra positions fail without revealing exact answer automatically

## 8. Navigate behaviour

- generated exercises always have at least one valid answer
- clicking an invalid note cannot be marked correct merely because it has the same screen geometry
- wrong interval feedback reports the actual interval from the relevant root
- solved exercise does not keep generating duplicate attempt events from random clicks

## 9. Harmony behaviour

- scale layer remains stable while progression chord changes
- active chord tones update on I/IV/V/I
- practice mode hides the chord-tone answer
- current-chord R/3/5 answers are evaluated by pitch class

## 10. Telemetry

- append event
- reload persistence
- event schema version included
- export contains all stored events
- response time non-negative
- no personally sensitive data is required for an attempt event

## 11. Critical Playwright flows

1. Open A major G shape → switch Full → Roots → Build → construct correct voicing → success.
2. Navigate Find Note → wrong click → informative feedback → correct click → success.
3. Harmony A major → advance I to IV → practice 3rd → select F# → success.
4. Reload page after attempts → local history count persists.
5. Mobile viewport → tabs, fretboard and task controls remain usable.
