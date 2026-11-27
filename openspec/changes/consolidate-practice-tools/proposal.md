## Why

Resolve divergent progression/trainer work and stale project instructions before adding capabilities. Tracking #123. Candidate source #116 (5ea69e9d6df45285e586ed463a8d72d8416f6030); baseline 2e35d7bea378f8b0db16238a1b3cdcc2d4d981d1.

## What Changes

- Integrate the already developed practice tools into a review branch from current master, resolve divergence and explicitly account for the original audio fork.
- Add candidate behavioral specs and verification traceability, and restore exact-head preview/release gates.
- Keep Song Study #84/#85, Looper #111, AI assets, new musical features and production release outside this change.

## Capabilities

### New Capabilities
- `practice-tools`: candidate progression generation, triad and arpeggio behaviors.

### Modified Capabilities
- None proposed to the accepted baseline in this initial draft. Any core formula/catalog changes found in the candidate must receive explicit spec deltas before implementation approval.

## Impact

src/progression, lab progression/trainer/audio files, tests, packaging, workflows and shared docs. No approval of source or release is implied by this proposal. See docs/SDD_TRANSITION_AUDIT.md.
