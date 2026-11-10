# Guitar Explorer project state

Updated 11 November 2026 (Australia/Sydney).

## Current work

Issue #82 resets Guitar Explorer to the deterministic Music Engine and a minimal
browser entrypoint. It retires the exercise catalogue, session runtime, activity
routes and practice-specific tooling from the active project. The starting
`master` revision is `a1a76f4a2daadf0df80c47231877ef414c60d22d`.
[Product reset](https://github.com/ArunPrakash2901/guitar-explorer/issues/82)

The proposed baseline retains the public query contracts, Core and Guitar
geometry, Phrase Foundation, engine correctness tests and independent
source-provenance research. Prior experiments and approval records remain in
Git history and the [historical references](docs/history/README.md).

## Review gate

Run `npm run verify`, then review the welcome page and verify the exact-head
[PR preview](docs/PR_PREVIEWS.md) once GitHub publishes it. Local verification,
hosted CI execution and live preview publication are distinct results. Arun's
explicit approval of the exact reviewed head is required before merge.

## Next separately scoped work

Issue #83 is the requirements and source audit for Song Study Pilot 001, a
whole-song study of Led Zeppelin's *Black Dog*. Its requirements must be reviewed
after this reset and before Song Study implementation begins.
[Song Study requirements](https://github.com/ArunPrakash2901/guitar-explorer/issues/83)

## Operational references

- [Machine-readable state](project-state.json), also available via `npm run context`
- [Execution rules](AGENTS.md) and [approval boundaries](docs/AUTONOMY_CONTRACT.md)
- [Architecture](docs/ARCHITECTURE.md) and [verification](docs/VERIFY.md)
