# Phase 1 — approved foundation kernel

This scope supersedes the old v0.2 Phase 0/1 kickoff. Preserve the original handoff
as reference; implement one pure TypeScript package before production UI work.

## Included

- Spelled notes, numeric accidentals, registered pitches and derived pitch classes.
- Signed spelled intervals, chromatic distance, transposition and simple inversion.
- Major/natural-minor scales; major/minor/diminished/augmented triads.
- Independent key, selected-scale and current-chord relationships.
- Configurable tuning/string counts, standard tuning and bounded fretboard queries.
- Structured musical queries, validation, deterministic serializable results.
- Strict TypeScript, Vitest, npm lockfile, typecheck/test CI and API documentation.

## Acceptance

1. Explain A → C# as M3 and transfer the relationship to D → F#.
2. Distinguish C → F# (A4) from C → Gb (d5).
3. Spell C# major with E# and B#.
4. Distinguish standard-tuning low E2 from high E4.
5. Pass typechecking and domain/contract tests without browser dependencies.

Round-trip single/double accidentals and registered pitches. Preserve physical
string order in alternate/reentrant tunings. Reject malformed or unbounded numeric
input. Independent mathematical/contextual tests supplement the prototype fixtures.

## Stop after this phase

No CAGED, broader harmony, Audio, Ear, Learning, persistence, rhythm domain or React
migration. Do not expose placeholder methods. Document future extensions without
implementing them. This phase does not wire the legacy UI to the new engine or
claim completion of the original v0.2 product requirements.
