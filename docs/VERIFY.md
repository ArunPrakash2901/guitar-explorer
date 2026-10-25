# Repository verification

The authoritative full-repository verification command is:

```text
npm run verify
```

CI runs `npm ci` followed by that command. A change is not repository-verified merely
because one narrower command passed.

`npm run verify` currently composes:

- `npm run context:check` — validates the versioned machine-readable project snapshot
- `npm run typecheck` — TypeScript contracts
- `npm test` — domain and contract tests
- `npm run test:prototype` — preserved prototype regression
- `npm run test:lab` — Lab syntax/behaviour plus session-evidence and timeline checks
- `npm run test:identity` — stable ScenarioV1 identity and active-scenario traceability
- `npm run test:deployments` — stable/preview/experimental channel metadata contracts
- `npm run preview:build` — static exact-head PR-preview build contract

Those component commands remain intentionally available for focused diagnosis and
fast local iteration. They are not competing full verification entry points.

`npm run context` prints the validated project snapshot plus runtime revision/PR/channel
metadata when supplied through the environment. Deployment-channel and evidence
privacy boundaries are documented in
[`DEPLOYMENT_CHANNELS.md`](DEPLOYMENT_CHANNELS.md).

Physical-guitar usefulness is a separate gate. When physical review is required,
run the software gate above and then follow
[`PHYSICAL_VALIDATION_PROTOCOL.md`](PHYSICAL_VALIDATION_PROTOCOL.md); automated tests
must not be treated as evidence of pedagogical effectiveness.
