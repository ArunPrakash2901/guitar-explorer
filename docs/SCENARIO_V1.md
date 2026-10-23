# Scenario V1 Contract & Resolver

## 1. Architectural Purpose

`ScenarioV1` separates the **fixed teaching procedure** of compatible Melody/Motif
activities from **the bounded musical material that procedure uses**. It is not
the universal data model for Guitar Explorer. See
[ARCHITECTURE.md](ARCHITECTURE.md) for current Product Spine ownership.

Before this contract, Lab teaching procedures (such as *Melody Over Harmony* and *Develop the Idea*) hard-coded specific chord symbols (such as Am7 -> D7 -> Gmaj7), target notes (F#), and motif cells (A -> C -> A) directly into pedagogical routines.

With `ScenarioV1`, these procedures can reuse compatible validated material
without hardcoding its answers. The current envelope is an explicit major key,
three or four diatonic chords uniformly using triads or sevenths, bounded guitar
regions, prescribed relationships and a mandatory transfer key. This does not
make the procedures compatible with arbitrary musical problems:

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

- **Music Engine (`src/engine/**`)**: Core is the authoritative, instrument-independent source of truth for notes, intervals, chords, chord formulas, diatonic harmony and scale degrees. Guitar adds instrument-specific tuning and fretboard positions above Core; `musicQueries` exposes validated facts from both. The engine has no knowledge of lessons, scenario IDs, pedagogical targets, or learner state.
- **Scenario Specification (`ScenarioV1`)**: Minimal declarative description of musical context, constraints, and target relationships.
- **Scenario Resolver (`lab/scenario-resolver.mjs`)**: Deterministic compiler and validator that combines a `ScenarioV1` specification with Music Engine queries to produce an immutable, fully derived musical context.
- **Session Pedagogy (`lab/*-session.mjs`)**: Existing activity-specific teaching flow. Melody retains its prescribed targeting, reinterpretation, approach/phrase, constrained-use and transfer procedure; Motif retains its rise-return procedure. The modules consume resolved notes and chords rather than declaring their answers. Scenario selection does not define a new procedure or a general workflow engine.
- **Fretboard View Model (`lab/phrase-app.js`)**: Maps pedagogical stage state to physical string/fret coordinates, visibility states, and path connections.
- **Fretboard UI v2 (`lab/fretboard-view.mjs`)**: Pure rendering surface over SVG/DOM; handles geometry, native keyboard navigation, and button focus.

---

## 2. Intent Over Hard-Coded Answers

Scenario specifications encode musical **intent and relationships**, not hardcoded
answer pitches or target frets. Explicit key tonics and bounded fret ranges remain
valid inputs; the engine derives the answers within those constraints.

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
  - `chordSize` (`"triad" | "seventh"`): One diatonic chord stacking type shared by the whole progression; mixed chord sizes are not represented.
- `transfer` (`object`):
  - `key` (`{ tonic: Note, mode: "major" }`): Mandatory destination key for transposition and transfer tasks.
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

Schema validity is not a promise that every field combination is supported by an
existing activity. The current Melody selection/evaluation UI uses the target
string for its fret-only responses, including arrival responses. Approved
catalogue and generated Melody material therefore keep target and arrival on the
same string. The resolver accepts separately specified strings; widening that
consumer behavior requires a later correctness change, not a documentation
claim that it already works.

The plain `ScenarioV1` specification is serializable. The resolved runtime bundle
also contains query closures such as `at`, `tone` and `locate`; it is not a
persistable JSON DTO or a general shared-workspace document.

---

## 5. What Scenario V1 Does NOT Represent

`ScenarioV1` is strictly a data contract for the two existing Lab phrase experiments. It **does NOT** represent or attempt to solve:

- **Universal Workspace Material**: Ordinary Explore requests may use `musicQueries` directly. Apply may use other material representations later; neither intention must pass through ScenarioV1.

- **Stylistic Authenticity or Genre Grammar**: Does not model idiom rules, blues bends, swing inflections, jazz reharmonization, or genre conventions.
- **Expressive Articulation**: Does not model legato, staccato, slides, hammer-ons, pull-offs, or dynamics.
- **Groove or Rhythm Quality**: Contains no tempo, meter, beat grid, syncopation model, or duration tracking.
- **Composition or Artistic Quality**: Does not grade melodies or motifs for aesthetic merit.
- **Learner Mastery or Adaptive Scheduling**: Difficulty tags are descriptive; there is no learner model, spaced repetition, or performance-based routing.
- **Long-Term Curriculum**: Does not define progression sequences, course prerequisites, or competency levels.
- **Arbitrary Song Analysis**: Designed for bounded diatonic educational exercises, not whole-score analysis.
- **Audio, Microphone, or DSP**: Uses pure deterministic data queries; no audio synthesis or pitch detection.

---

## 6. Current Generation and Future Boundaries

The current deterministic Melody generator emits compatible ScenarioV1 material
and resolved output for the existing Melody procedure. Its supported envelope is
narrower than the scenario schema: target and arrival use high E; the first
phrase-lead note uses B or high E; main and transfer windows derive independently
from their targets. Difficulty selects key pools, not arbitrary strings or
caller-supplied regions. See [RULE_GENERATOR_V1.md](RULE_GENERATOR_V1.md) for the
exact policy, generator-version-2 replay and failure guarantees.

```text
Current Melody Generation Rule
      ↓
Deterministic Melody Generator
      ↓
Scenario V1 Specification
      ↓
Scenario Resolver
      ↓
Session Pedagogy
```

Future Style Packs are knowledge/preferences, not product modes. Articulation,
rhythmic language and broader harmonic treatment are outside this contract.
ScenarioV1 does not guarantee that broader generation, style or Apply material can
be added without changes to sessions, UI or material representation. Style Pack
V1, a Motif Generator and ScenarioV2 remain deferred under the Product Spine
direction; this document authorizes none of them.
