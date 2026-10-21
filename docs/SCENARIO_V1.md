# Scenario V1 Contract & Resolver

## 1. Architectural Purpose

`ScenarioV1` separates **what a teaching session teaches** from **the specific musical material it happens to use**.

Before this contract, Lab teaching procedures (such as *Melody Over Harmony* and *Develop the Idea*) hard-coded specific chord symbols (such as Am7 -> D7 -> Gmaj7), target notes (F#), and motif cells (A -> C -> A) directly into pedagogical routines.

With `ScenarioV1`, teaching procedures operate across arbitrary validated musical problems without altering pedagogical logic or hardcoding answers:

```text
Music Engine (Pure Truth)
      ↓
Scenario Resolver (resolveScenario)
      ↓
Session / Lab Pedagogy (createMelodyPlan, createMotifPlan)
      ↓
Fretboard View Model (annotatedBoard)
      ↓
Fretboard UI v2 (createFretboard)
```

### Layer Responsibilities

- **Music Engine (`src/engine/**`)**: Authoritative, instrument-independent source of truth for notes, intervals, chords, chord formulas, diatonic harmony, scale degrees, and fretboard positions. The engine has no knowledge of lessons, scenario IDs, pedagogical targets, or learner state.
- **Scenario Specification (`ScenarioV1`)**: Minimal declarative description of musical context, constraints, and target relationships.
- **Scenario Resolver (`lab/scenario-resolver.mjs`)**: Deterministic compiler and validator that combines a `ScenarioV1` specification with Music Engine queries to produce an immutable, fully derived musical context.
- **Session Pedagogy (`lab/*-session.mjs`)**: Pure teaching flow (hear -> predict -> commit -> reveal -> compare -> manipulate -> transfer -> reflect). It consumes engine-resolved musical material and knows nothing about specific notes or chord symbols.
- **Fretboard View Model (`lab/phrase-app.js`)**: Maps pedagogical stage state to physical string/fret coordinates, visibility states, and path connections.
- **Fretboard UI v2 (`lab/fretboard-view.mjs`)**: Pure rendering surface over SVG/DOM; handles geometry, native keyboard navigation, and button focus.

---

## 2. Intent Over Hard-Coded Answers

Scenario specifications encode musical **intent and relationships**, never literal notes or fret numbers.

| Prohibited Anti-Pattern | Required Scenario V1 Intent |
|---|---|
| `targetNote: "F#"` | `target: { chordIndex: 1, degree: 3, stringIndex: 5 }` |
| `targetFret: 2` | Guitar region constraint: `strings: [4, 5], minFret: 0, maxFret: 8` |
| `transferAnswer: "G#"` | `transfer: { key: { tonic: { letter: "A", accidental: 0 }, mode: "major" } }` |
| `motifPitches: ["A", "C", "A"]` | `motif.source: { chordIndex: 0, lowerDegree: 1, upperDegree: 3, ... }` |

The Scenario Resolver uses the Music Engine to derive chord identities, spelled chord tones, target pitches, and playable fretboard coordinates. If a relationship cannot be resolved or transferred faithfully, the scenario is rejected during validation.

---

## 3. Contract Schema Specification

Every `ScenarioV1` object conforms to the following schema:

### Shared Top-Level Fields

- `version` (`number`): Must equal `1`.
- `type` (`"melody" | "motif"`): Identifies the consuming teaching procedure.
- `id` (`string`): Unique non-empty kebab-case identifier.
- `title` (`string`): Descriptive human-facing title.
- `description` (`string`): Summary of the musical task.
- `difficulty` (`"introductory" | "developing" | "transfer"`): Descriptive difficulty tier (non-adaptive).
- `context` (`object`):
  - `key` (`{ tonic: Note, mode: "major" }`): Spelled key.
  - `degrees` (`number[]`): 3 or 4 scale degree integers (1-7) defining the progression (e.g. `[2, 5, 1]` or `[1, 5, 6, 4]`).
  - `chordSize` (`"triad" | "seventh"`): Diatonic chord stacking type.
- `transfer` (`object`):
  - `key` (`{ tonic: Note, mode: "major" }`): Destination key for transposition and transfer tasks.
- `fretboard` (`object`):
  - `main` (`{ strings: number[], minFret: number, maxFret: number }`): Physical guitar search region for the primary progression.
  - `transfer` (`{ strings: number[], minFret: number, maxFret: number }`): Physical guitar search region for the transfer key.
- `targets` (`object`):
  - `target` (`{ chordIndex: number, degree: number, stringIndex: number }`): The first melodic/harmonic target.
  - `arrival` (`{ chordIndex: number, degree: number, stringIndex: number }`): The destination arrival target (`arrival.chordIndex > target.chordIndex`).

### Melody-Specific Fields (`type === "melody"`)

- `melody` (`object`):
  - `approachScaleDegree` (`number`, 1-7): Key scale degree situated exactly one upward diatonic step below the target note.
  - `phraseLead` (`Array<{ scaleDegree: number, stringIndex: number }>`): Exactly two ascending notes introducing the target.

### Motif-Specific Fields (`type === "motif"`)

- `motif` (`object`):
  - `source` (`{ chordIndex: number, lowerDegree: number, upperDegree: number, lowerString: number, upperString: number }`): The opening 3-note rise-return cell.
  - `adaptation` (`{ ... }`): Destination cell over the arriving chord.
  - `arrival` (`{ ... }`): Destination cell over the cadence chord.
  - `sequence` (`{ lowerScaleDegree: number, upperScaleDegree: number, lowerString: number, upperString: number }`): Intervallic sequence preserving the source cell's opening interval.

---

## 4. Deterministic Validation & Resolution

The resolver (`resolveScenario(scenario, queries)`) enforces strict structural and musical validity:

1. **Schema Integrity**: Unknown fields, missing fields, incorrect types, or invalid numbers throw `ScenarioError` with the exact dotted JSON path (e.g., `scenario.context.degrees[0]`).
2. **Musical Consistency**:
   - Diatonic chords must exist in the engine chord catalog.
   - Target degrees must exist within their respective chords.
   - `approachScaleDegree` must be exactly one upward diatonic step below the target.
   - Phrase lead notes must ascend into the target pitch.
   - Motif upper roles must rise above lower roles in pitch.
   - Sequence intervals must exactly match the source cell's interval in both diatonic steps and semitones.
3. **Physical Playability**:
   - Every required tone must exist on the specified string within the bounded fret window (`minFret`-`maxFret`).
4. **Transfer Invariance**:
   - The interval from `target` to `arrival` must transfer identically to the destination key.
   - Motif cell intervals must transfer identically to the destination key.
5. **Immutability**: The resolved data structure is deeply frozen before being returned to consumers.

---

## 5. What Scenario V1 Does NOT Represent

`ScenarioV1` is strictly a data contract for the two existing Lab phrase experiments. It **does NOT** represent or attempt to solve:

- **Stylistic Authenticity or Genre Grammar**: Does not model idiom rules, blues bends, swing inflections, jazz reharmonization, or genre conventions.
- **Expressive Articulation**: Does not model legato, staccato, slides, hammer-ons, pull-offs, or dynamics.
- **Groove or Rhythm Quality**: Contains no tempo, meter, beat grid, syncopation model, or duration tracking.
- **Composition or Artistic Quality**: Does not grade melodies or motifs for aesthetic merit.
- **Learner Mastery or Adaptive Scheduling**: Difficulty tags are descriptive; there is no learner model, spaced repetition, or performance-based routing.
- **Long-Term Curriculum**: Does not define progression sequences, course prerequisites, or competency levels.
- **Arbitrary Song Analysis**: Designed for bounded diatonic educational exercises, not whole-score analysis.
- **Audio, Microphone, or DSP**: Uses pure deterministic data queries; no audio synthesis or pitch detection.

---

## 6. Future Extensibility: Rule Generators & Style Packs

`ScenarioV1` is designed so that future slices can generate scenarios programmatically without modifying session pedagogy:

```text
Style Pack (e.g., Folk / Rock / Classical)
      ↓
Deterministic Rule Generator
      ↓
Scenario V1 Specification
      ↓
Scenario Resolver
      ↓
Session Pedagogy
```

Because `ScenarioV1` contains only plain serializable data and relies on pure Music Engine truth, a future deterministic generator can emit scenario specifications directly, and the existing resolver and session runners will validate and execute them without UI coupling.
