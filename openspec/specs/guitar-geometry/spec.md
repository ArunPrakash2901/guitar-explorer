# Guitar Geometry

## Purpose

Describe deterministic sounding string/fret geometry over Music Core. Initial baseline candidate from master 2e35d7bea378f8b0db16238a1b3cdcc2d4d981d1.

## Requirements

### Requirement: Registered standard tuning
The standard fretboard SHALL expose registered pitches E2, A2, D3, G3, B3, E4 in low-to-high order.

#### Scenario: Open low E
- **WHEN** string index zero and fret zero are queried on the standard board
- **THEN** the sounding semitone is 40 and pitch class is 4

Evidence: tests/domain/guitar.test.ts.

### Requirement: Fret transposition
Each successive fret on a string SHALL increase its sounding pitch by one semitone.

#### Scenario: Octave fret
- **WHEN** fret twelve is compared with the same open string
- **THEN** the pitch class is unchanged and the registered pitch is twelve semitones higher

Evidence: tests/domain/guitar.test.ts.
