# Chord-tone marker scaffold — non-production

**Status:** experimental, unapproved for application use. This is intentionally
separate from the Song Study FRD and does not alter the existing engine.

## Why this small slice exists

StrumForge-like chord highlighting and Guitar Explorer Song Study both need to
show *supplied* chord tones on a fretboard. The existing Music Engine can already
calculate the chord tones and matching physical locations. This adapter merely
turns those results into presentation markers.

## What exists

- `src/experimental/chord-tone-markers.ts`: a pure projector from `Chord` and
  `FretboardNote[]` into `{ position, noteName, pitchClass, degrees, isRoot }[]`.
- `tests/experimental/chord-tone-markers.test.ts`: contract examples backed by
  public engine queries, plus no-mutation/no-voicing tests.

## Explicitly absent

No playable voicing selection, finger assignment, strum order, audio engine,
transport clock, TAB layout, chord progression generator, Song Study pack, new
Music Engine query, persistence, external dependency, or browser UI.

**A highlighted pitch location is not a playable chord shape.**

## How to verify on the PR #84 reset base

1. `npm ci`
2. `npm run typecheck`
3. `npm test -- tests/experimental/chord-tone-markers.test.ts`
4. `npm run verify`

The PR #84 reset branch remains the proposed base until reviewed and merged.
Do not merge this branch or promote the adapter into the app before the reset and
Song Study requirements gates are satisfied. The fact that tests pass does not
authorise learner-facing behaviour.
