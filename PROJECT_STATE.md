# Guitar Explorer project state

Updated 11 November 2026 (Australia/Sydney).

## Current work

The owner authorized the full Black Dog Song Study under Issue #83, superseding
the proposed one-fragment build. The branch provides the song overview and
workbench for all eleven sections. The provisional recording anchors, source
claims, and guitar-in-hand review requirements are documented with the original
FRD and the owner’s amendment. [Issue #83](https://github.com/ArunPrakash2901/guitar-explorer/issues/83) · [Black Dog requirements](docs/BLACK_DOG_REQUIREMENTS.md)

This work is stacked on cleanup PR #84 at `8a779419808fb94317ca83ad454fd548887094d8`.
The cleanup branch retires the former exercise product and preserves the
Music Engine and its tests. Its base on `master` is
`a1a76f4a2daadf0df80c47231877ef414c60d22d`. [Issue #82](https://github.com/ArunPrakash2901/guitar-explorer/issues/82) · [Cleanup PR](https://github.com/ArunPrakash2901/guitar-explorer/pull/84)

## Review gate

Run `npm run verify`, review the proposed revision in the browser and follow the
full-song physical-guitar review. Record hosted Actions and Pages results
separately from the local checks. Approximate recording alignment, disputed
source interpretations, and playing comfort require listening or physical
review. Arun's explicit approval of the reviewed revision is required before
merge. [PR previews](docs/PR_PREVIEWS.md) · [Review on guitar](docs/BLACK_DOG_REQUIREMENTS.md#review-on-guitar)

## Operational references

- [Machine-readable state](project-state.json), also available via `npm run context`
- [Execution rules](AGENTS.md) and [approval boundaries](docs/AUTONOMY_CONTRACT.md)
- [Architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFY.md)
