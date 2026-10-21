# Rule Generator V1 — Deterministic Melody Scenario Generation

## 1. Architectural Purpose

Rule Generator V1 solves the authoring bottleneck for the *Melody Over Harmony* Lab. Instead of requiring every educational practice scenario to be manually written by hand into a static catalogue, the generator deterministically constructs valid, playable `ScenarioV1` Melody scenarios from declarative educational rules.

```text
Generation Rule (`MelodyGenerationRuleV1`)
      ↓
Deterministic Candidate Generator (`generateMelodyScenario`)
      ↓
Candidate ScenarioV1 Specification
      ↓
Scenario Resolver (`resolveScenario`)
      ↓
   [Reject & Retry]  OR  [Accept & Score]
      ↓
Melody Session Pedagogy (`createMelodyPlan`)
      ↓
Fretboard View Model (`annotatedBoard`)
      ↓
Fretboard UI v2 (`createFretboard`)
```

### Essential Division of Responsibilities

- **Generation Rule (`lab/rule-contract.mjs`)**: Declares *what kind of musical relationship* should be practiced (e.g. target the 3rd of V7, or move between chord tones across changes).
- **Candidate Generator (`lab/melody-generator.mjs`)**: Samples musical parameters (keys, progression templates, guitar regions) deterministically from a pseudo-random seed.
- **Scenario Resolver (`lab/scenario-resolver.mjs`)**: The objective gatekeeper. Validates that the candidate strictly obeys `ScenarioV1` rules, that notes exist in the fret region, and that intervals survive transfer.
- **Session Pedagogy (`lab/melody-session.mjs`)**: Guides the learner through prediction, commitment, comparison, line construction, improvisation, and transfer.
- **Human Learner**: The sole judge of musical feel and educational usefulness on a physical instrument.

---

## 2. Generation Rules & Task Families

Rules are versioned declarative data objects (`MelodyGenerationRuleV1`). They never encode literal pitches or frets.

Three initial task families are implemented:

### Family A — Dominant 3rd Targeting (`rule-dominant-third`)
- **Pedagogical Intention**: Locate and deliberately target the 3rd of a dominant seventh chord, hearing it resolve up a half step to the root of the arrival chord.
- **Progression Templates**: Diatonic seventh progressions (`ii7 → V7 → Imaj7` and `IVmaj7 → V7 → Imaj7`).
- **Target Role**: Degree 3 of the V7 chord.
- **Arrival Role**: Degree 1 (root) of the Imaj7 chord.

### Family B — Dominant ♭7 Targeting (`rule-dominant-seventh`)
- **Pedagogical Intention**: Locate and hear the minor 7th of V7 as a structurally essential chord tone resolving downward to the 3rd of the tonic chord.
- **Progression Templates**: Diatonic seventh progressions (`ii7 → V7 → Imaj7` and `IVmaj7 → V7 → Imaj7`).
- **Target Role**: Degree 7 (alteration -1) of the V7 chord.
- **Arrival Role**: Degree 3 of the Imaj7 chord.

### Family C — Chord-Change Target Trajectory (`rule-target-trajectory`)
- **Pedagogical Intention**: Move deliberately between salient chord tones across harmonic changes.
- **Progression Templates**: Diatonic triads and sevenths (`ii7 → V7 → Imaj7`, `I → V → vi → IV`, and `IVmaj7 → V7 → Imaj7`).
- **Target Pairs**: `3rd → root`, `3rd → 3rd`, `7th → 3rd`, `5th → root`.

---

## 3. Seeded Reproducibility & PRNG

Generation is strictly deterministic. A Mulberry32 32-bit PRNG turns numeric or string seeds into repeatable floating-point streams in $[0, 1)$.

Given the same `(ruleId, difficulty, seed)`, `generateMelodyScenario` produces the **exact same** candidate and resolved scenario every time.

This guarantees:
- Automated tests run repeatably without flaky random failures.
- Bug reports can be reproduced by sharing the seed.
- The UI can provide "Replay this scenario" to repeat the exact same exercise.
- "Generate another" advances the seed monotonically to yield fresh surface material.

---

## 4. Rejection Sampling & Attempt Budget

The generator employs **constrained generation → deterministic validation → rejection → retry**.

1. Up to $N = 30$ attempts are permitted.
2. Each attempt samples a key, progression template, target role, fretboard region, transfer key, and phrase lead notes.
3. The candidate is submitted to `resolveScenario(candidate, queries)`.
4. If validation fails (e.g., target note out of fret window, non-ascending lead, transfer interval mismatch), the failure is logged and the next seed step is tried.
5. If validation succeeds, the candidate is scored according to pedagogical preferences. Resolver validity is **necessary but not sufficient**: candidates must also meet the documented minimum pedagogical score floor ($S \ge 5$).
6. If the attempt budget is exhausted without any candidate meeting the score floor, a deterministic `GenerationError` is thrown detailing `ruleId`, `difficulty`, `seed`, `attempts` (attempt count), `bestScoreReached`, and `lastFailure`. Low-quality candidates are never silently accepted.

---

## 5. Hard Constraints vs Pedagogical Preferences (Scoring)

### Hard Constraints (Must Be True)
- Major key in the approved difficulty pool.
- Supported progression template and diatonic chords.
- Target tone exists in the chord and on the specified guitar string within the fret window.
- Approach scale degree is exactly one upward diatonic step below the target.
- Phrase lead notes are strictly ascending in pitch into the target.
- Transfer key preserves the directed target-to-arrival interval in both diatonic steps and semitones.
- Output conforms to `ScenarioV1` schema and freezes completely.
- **Pedagogical Score Floor ($S \ge 5$)**: The candidate must reach or exceed the minimum score threshold to be accepted.

### Pedagogical Preferences (Scoring)
Scoring ranks valid candidates to prioritize high-value educational practice:
- **Target Motion Proximity**: Half-step or whole-step movement (+3 points), minor/major third (+1 point), large leap (-1 point).
- **Chord Role Salience**: 3rd or 7th targets (+3 points), roots (+1 point).
- **Arrival Salience**: Root or 3rd arrival (+2 points).
- **Neck Comfort**: Fret window span between 6 and 9 frets (+2 points).

Maximum pedagogical score is 10. The acceptance threshold is $S \ge 5$.

---

## 6. Surface Fingerprints & "Generate Another" Variation

To ensure successive generated exercises present genuine variation rather than identical musical problems under a different seed, each scenario has a deterministic **surface fingerprint** (`getScenarioFingerprint`):

```text
family:dominant-third|key:C major|prog:Dm7 > G7 > Cmaj7|rel:c1d3s5->c2d1s5(1steps,1st)|targetPos:s5f7|region:s[4,5]f3-10|transferKey:A major
```

The fingerprint encodes:
1. **Rule / Family**: e.g. `dominant-third`, `dominant-seventh`, `target-trajectory`.
2. **Key Context**: Spelled tonic and mode (e.g. `C major`).
3. **Harmonic Progression**: Chord symbols across the cycle (e.g. `Dm7 > G7 > Cmaj7`).
4. **Target / Arrival Relationship**: Tone roles, string index, diatonic step change, and semitone distance.
5. **Target Fretboard Location & Region**: Target string and fret (`s5f7`) and active region (`s[4,5]f3-10`).
6. **Transfer Key**: Key context for second-cycle consolidation.

### Surface Variation Controls
- **Generate Another (`generateDistinctMelodyScenario`)**: Increments the seed monotonically within a bounded budget ($N=30$) until a valid, accepted scenario with a *different* surface fingerprint is produced.
- **Replay Scenario**: Re-generates the exact current seed, strictly reproducing identical musical notes, fretboard locations, and pedagogical stages.
- No learner history, adaptation, or persistent profiling is introduced.

---

## 7. Difficulty Constraints

Difficulty levels constrain generation without requiring an adaptive student model:

| Level | Key Pool | Fretboard Regions | Strings |
|---|---|---|---|
| **Introductory** | C, G, D, A, F | Frets 0–8, 2–9 (comfortable low neck, target $\le$ fret 9) | [4, 5] |
| **Developing** | C, G, D, A, E, F, B♭ | Frets 0–8, 4–11, 5–12, 7–14 | [4, 5], [3, 4, 5] |
| **Transfer** | C, G, D, A, E, B, F, B♭, E♭ | Frets 4–11, 5–12, 7–14, 2–10 | [4, 5], [3, 4, 5], [2, 3, 4] |

---

## 8. Provenance & UI Integration

Generated scenarios conform 100% to `ScenarioV1`. Implementation metadata is kept in an outer provenance wrapper:

```javascript
{
  scenario: ScenarioV1,
  resolved: ResolvedScenario,
  provenance: {
    source: "generated",
    ruleId: "rule-dominant-third",
    family: "dominant-third",
    difficulty: "introductory",
    seed: 4821,
    attempts: 3,
    score: 10,
    fingerprint: "family:dominant-third|key:C major|prog:Dm7 > G7 > Cmaj7|rel:c1d3s5->c2d1s5(1steps,1st)|targetPos:s5f7|region:s[4,5]f3-10|transferKey:A major",
    generatorVersion: 1
  }
}
```

The `/melody.html` UI supports switching between:
- **Approved Catalogue**: The vetted hand-authored scenarios.
- **Generated Practice**: Rule-driven scenarios with Focus, Difficulty, "Generate practice", "Generate another", and "Replay this scenario" controls.

---

## 9. What Rule Generator V1 Does NOT Represent

Rule Generator V1 strictly generates bounded tonal melody exercises. It **does NOT** represent:
- **Genre or Style Packs**: No blues scales, jazz vocabulary, funk patterns, or idiomatic clichés.
- **Expressive Phrasing or Articulation**: No bends, vibrato, dynamics, slides, or hammer-ons.
- **Groove or Rhythm Quality**: No meter, tempo, swing, syncopation, or duration models.
- **Artistic or Composition Quality**: Does not grade melodies for beauty or aesthetic merit.
- **Learner Mastery or Adaptive Scheduling**: No user scoring, skill inference, or spaced repetition.
- **Audio, Microphone, or DSP**: Purely deterministic discrete musical data.
- **AI Runtime**: Zero calls to LLMs or external services.

---

## 9. Preparation for Future Style Packs

Rule Generator V1 is designed so future style packs can simply configure rule weights and constraints:

```text
Style Pack (e.g. Folk / Pop / Classical)
      ↓
Rule Selection & Weights
      ↓
Rule Generator V1
      ↓
ScenarioV1
      ↓
Scenario Resolver
      ↓
Melody Session
```

No session or UI code will need modification when style packs or rule weights are introduced.
