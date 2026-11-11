# Repository verification

Run the authoritative full gate from the repository root:

```sh
npm ci
npm run verify
```

| Command | Coverage |
| --- | --- |
| `npm run context:check` | Validate the machine-readable project state. |
| `npm run typecheck` | Type-check the engine, research code, Song Study model and tests. |
| `npm test` | Run the engine domain and public-contract suites, provenance research tests and Black Dog tests. |
| `npm run test:lab` | Check the Song Study entrypoint, browser and compiled modules, and retired routes over HTTP. |
| `npm run test:deployments` | Check static output and channel provenance. |
| `npm run preview:build` | Compile the engine and Song Study model and package the static review site. |

These commands also run individually for diagnosis. `npm run context` prints
project state and any revision, PR and deployment metadata supplied in the
environment. [Test matrix](TEST_MATRIX.md) · [PR preview guide](PR_PREVIEWS.md)

GitHub Actions runs `npm ci` and `npm run verify`. Report a hosted startup
failure or Pages publication failure separately from local test results.
Review the song map and workbench on the proposed revision, then check the
recording cues, source claims and playing tasks with a guitar in hand.
[Black Dog review route](BLACK_DOG_REQUIREMENTS.md#review-on-guitar) · [Physical Validation Protocol](PHYSICAL_VALIDATION_PROTOCOL.md)
