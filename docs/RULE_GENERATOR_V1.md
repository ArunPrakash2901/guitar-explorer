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
- **Candidate Generator (`lab/melody-generator.mjs`)**: Samples keys, progression templates, and tone roles deterministically from a pseudo-random seed, then derives regions using the fixed guitar policy below.
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

The current implementation reports `generatorVersion: 2`; the rule and scenario contracts remain `MelodyGenerationRuleV1` and `ScenarioV1`. A Mulberry32 32-bit PRNG turns numeric or string seeds into repeatable floating-point streams in $[0, 1)$.

Seed normalization is unchanged: numeric seeds use unsigned 32-bit conversion with zero replaced by 1; string seeds accumulate UTF-16 code units with `seed = (Math.imul(31, seed) + codeUnit) >>> 0`, again replacing zero by 1. Other inputs use 1.

Transfer-key candidates retain the declared key-pool order before a seeded Fisher–Yates shuffle. Starting with `i = length - 1` and descending through `i = 1`, the generator draws `j = Math.floor(random() * (i + 1))` and swaps entries `i` and `j`. It does not use a random sort comparator. Rule, template, and target-pair arrays also retain their declared input order.

Given the same `(ruleId, difficulty, seed, generatorVersion)` and unchanged engine/query facts and ordering, generation produces the same candidate and resolved musical material. Pinned fixtures protect version-2 replay from accidental sampling-order changes. Version 2 changes seeded selection; it does not promise to reproduce version-1 output from an old seed.

This guarantees:
- Automated tests run repeatably without flaky random failures.
- Bug reports can be reproduced by sharing the seed.
- The UI can provide "Replay this scenario" to repeat the exact same exercise.
- "Generate another" advances the seed monotonically to yield fresh surface material.

---

## 4. Rejection Sampling & Attempt Budget

The generator employs **constrained generation → deterministic validation → rejection → retry**.

1. Up to $N = 30$ attempts are permitted.
2. Each attempt samples a key, progression template, and target role; derives the target, region, and phrase lead using the fixed guitar policy; and searches a seeded ordering of transfer keys.
3. The candidate is submitted to `resolveScenario(candidate, queries)`.
4. If validation fails (e.g., target note out of fret window, non-ascending lead, transfer interval mismatch), the failure is logged and the next attempt advances the same seed's PRNG stream. Only distinct-scenario search advances the seed itself.
5. If validation succeeds, the candidate is scored according to pedagogical preferences. Resolver validity is **necessary but not sufficient**: candidates must also meet the documented minimum pedagogical score floor ($S \ge 5$).
6. If the attempt budget is exhausted without any candidate meeting the score floor, a deterministic `GenerationError` is thrown detailing `ruleId`, `difficulty`, `seed`, `attempts` (attempt count), `bestScoreReached`, and `lastFailure`. Low-quality candidates are never silently accepted.

---

## 5. Hard Constraints vs Pedagogical Preferences (Scoring)

### Hard Constraints (Must Be True)
- Major key in the approved difficulty pool.
- Supported progression template and diatonic chords.
- Target tone exists in the chord and on the specified guitar string within the fret window.
- Main and transfer material both obey the fixed string/window policy in section 7.
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
- **Replay Scenario**: Re-generates the current seed under the current generator version, reproducing the musical material and restarting the existing pedagogical stages.
- **Distinct search exhaustion**: Throws a `GenerationError`. The UI preserves the current accepted material and session, including its selections and evidence, and shows a recoverable message inviting retry or a change of focus/difficulty. It never falls back to unrestricted generation after failing to find a different fingerprint.
- No learner history, adaptation, or persistent profiling is introduced.

---

## 7. Difficulty Constraints

Difficulty changes the approved key pool without requiring an adaptive student model:

| Level | Ordered Key Pool |
|---|---|
| **Introductory** | C, G, D, A, F |
| **Developing** | C, G, D, A, E, F, B♭ |
| **Transfer** | C, G, D, A, E, B, F, B♭, E♭ |

All difficulties share this bounded guitar policy:

- String indices are zero-based: B is 4 and high E is 5. Target and arrival use high E (index 5); the approach and second phrase-lead note also use index 5.
- Search target locations on index 5 over frets 0–14, retain exact spelled-note matches, and choose the first engine-returned match. For both main and transfer material, derive the window independently from its selected target fret: `minFret = Math.max(0, targetFret - 4)` and `maxFret = Math.min(15, minFret + 7)`.
- Search the first phrase-lead note on B (index 4), then high E (index 5), requiring a location below the approach pitch within the main window. Active strings are `[4, 5]` when that note uses B, otherwise `[5]`; the same active strings apply to transfer. The resolver verifies the complete phrase in both regions before acceptance.
- Introductory does not impose a separate maximum target fret of 9. Difficulty does not select a region pool or enable broader string/neck control. The unused `regionPools` declaration has been removed rather than presented as a supported rule constraint.

The candidate is rejected if these fixed choices cannot resolve. Arbitrary string selection and caller-supplied regions are outside this generator's supported envelope, even though ScenarioV1 can represent other curated regions.

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
    generatorVersion: 2
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

## 10. Future Scope

Style packs, broader region controls, and other generation families require separate authorization and contracts appropriate to their material. The existing rule boundary does not guarantee that those capabilities can be added without changes to sessions or UI.
