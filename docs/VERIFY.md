# Repository verification

Run the authoritative full gate from the repository root:

```sh
npm ci
npm run verify
```

| Command | Coverage |
| --- | --- |
| `npm run context:check` | Validate the machine-readable project state. |
| `npm run typecheck` | Type-check the engine, research code and TypeScript tests. |
| `npm test` | Run the engine domain and public-contract suites and the provenance research tests. |
| `npm run test:lab` | Serve the minimal app and check the entrypoint, compiled engine and retired routes over HTTP. |
| `npm run test:deployments` | Check static output and channel provenance. |
| `npm run preview:build` | Compile the engine and package the static review site. |

These commands also run individually for diagnosis. `npm run context` prints
project state and any revision, PR and deployment metadata supplied in the
environment. See the [test matrix](TEST_MATRIX.md) and [PR preview guide](PR_PREVIEWS.md).

GitHub Actions runs `npm ci` and `npm run verify`. Record local results separately
from jobs that actually execute on GitHub. The exact-head browser review checks the
cleanup page. Any future physical-guitar review follows the
[Physical Validation Protocol](PHYSICAL_VALIDATION_PROTOCOL.md).
