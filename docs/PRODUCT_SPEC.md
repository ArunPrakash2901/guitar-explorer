# Product Specification — v0.2

> Historical v0.2 product reference, not current scope or acceptance criteria.
> [ARCHITECTURE.md](ARCHITECTURE.md) defines the current Product Spine direction
> and implemented boundaries; [TEST_MATRIX.md](TEST_MATRIX.md) identifies current
> coverage. Explore / Navigate / Harmony below are historical mode names.
> The CAGED, telemetry, PWA and UI requirements here do not authorize implementation.

## Product definition

A mobile-first guitar-learning web application that converts a fretboard visualiser into an active learning system.

v0.2 has three user-facing modes that share one fretboard and one music engine: **Explore, Navigate and Harmony**.

## Explore

### Purpose

Teach a structure, then progressively remove the answer.

### Required controls

- key/root selector
- CAGED shape selector: C, A, G, E, D
- guidance selector: Full, Intervals, Roots, Hidden, Build

### Full

Show the selected major CAGED voicing with note names and chord functions.

Example for A major:

- A / R
- C# / 3
- E / 5

### Intervals

Show R, 3, 5 only. Note names are not visible by default.

### Roots

Show only root locations within the selected voicing.

### Hidden

Show no chord-tone answer markers. The learner mentally reconstructs the voicing.

### Build

Blank answer state. The learner selects the fret/string positions that form the requested CAGED voicing and presses Check.

Evaluation must report useful aggregate information without immediately revealing the answer, e.g. correct positions / missing / extra.

## Navigate

### Purpose

Develop fretboard orientation from anchors and relationships instead of visual-shape recognition.

### v0.2 exercise families

#### Find a note

Example:

> Find C# on string 3.

The string constraint prevents reliance on only familiar bass-string locations.

#### Navigate from an anchor

Display a root anchor and ask for a nearby interval.

Example:

> Starting from this A, find a nearby major 3rd.

The initial implementation may bound valid answers by a fret/string neighbourhood to make the intended local navigation explicit.

#### Complete a triad

Show a root anchor and ask for a missing major-triad function.

Example:

> Complete D major from this root: find a nearby perfect 5th.

#### Transfer the function

State a known relationship in one key and ask for the same function in another.

Example:

> In A major, the major 3rd is C#. Transfer that function to D major and find D’s major 3rd on string 3.

### Feedback

On incorrect interval answers, identify the selected interval relative to the root when possible.

## Harmony

### Purpose

Connect static fretboard knowledge to changing harmonic context.

### v0.2 progression

Use I–IV–V–I in the selected major key.

Example in A:

- A major (I)
- D major (IV)
- E major (V)
- A major (I)

### Display

- the major-key scale remains visible as faint reference points
- the current chord can highlight its root, 3rd and 5th
- Previous and Next move manually through the progression
- no tempo/backing track in v0.2

### Practice current chord

Hide chord-tone highlights and ask for one current-chord function:

- root
- major 3rd
- perfect 5th

A correct answer should be framed as a current harmonic destination, not merely a trivia answer.

## Learning telemetry

Store locally:

- timestamp
- mode
- exercise type
- key/root
- shape where relevant
- target interval/function
- target pitch class
- selected pitch class
- string/fret
- correctness
- attempt number
- response time where relevant
- schema version

Do not build an adaptive dashboard in v0.2. Data collection must come before claims about mastery.

## Mobile requirements

- usable on a phone in portrait orientation
- touch targets large enough for fret selection
- no hover-only critical information
- controls must not require horizontal precision
- the fretboard may scroll/scale if necessary but should remain legible

## PWA direction

The production implementation should be installable as a PWA and remain useful offline after initial load. No account is required in v0.2.

## Definition of done

v0.2 is complete when:

1. all 12 supported major keys and all 5 CAGED shapes render correctly
2. Progressive Reveal works through Build
3. Navigate has all four exercise families
4. wrong-answer feedback is musically informative
5. Harmony supports I–IV–V–I and current-chord target exercises
6. telemetry persists locally and can be exported
7. core theory logic has automated tests
8. critical flows have browser-level tests
9. phone layout is usable
10. the app does not expose answers accidentally in assessment states
