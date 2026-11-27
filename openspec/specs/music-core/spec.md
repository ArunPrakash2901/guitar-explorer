# Music Core

## Purpose

Preserve deterministic, spelling-aware, instrument-independent musical truth. Initial baseline candidate derived from merged master 2e35d7bea378f8b0db16238a1b3cdcc2d4d981d1; subject to audit PR review. Not a complete API specification.

## Requirements

### Requirement: Written pitch identity
The engine SHALL preserve written note identity independently of sounding pitch class.

#### Scenario: Enharmonic spelling
- **WHEN** E# is parsed and formatted
- **THEN** its written identity remains E# and its pitch class is 5

Evidence: tests/domain/core.test.ts (written and sounding pitch).

### Requirement: Natural minor harmony
The engine SHALL derive natural minor diatonic harmony without silently raising its seventh degree.

#### Scenario: Natural minor dominant
- **WHEN** diatonic triads are requested in A natural minor
- **THEN** the fifth-degree chord is E minor, not E major

Evidence: tests/domain/harmony.test.ts.

### Requirement: Exact musical time
Musical time operations SHALL use normalized rational quarter lengths, independently of audio seconds.

#### Scenario: Tuplet addition
- **WHEN** one third and two thirds of a quarter length are added
- **THEN** the result is exactly one quarter length

Evidence: tests/domain/time.test.ts.
