# Deployment channels and evidence provenance

Guitar Explorer uses three explicit static-build channels so validation evidence can say exactly what code was tested without treating every build as a release.

## Channel contract

| Channel | Source identity | Publication | Intended use |
| --- | --- | --- | --- |
| `preview` | exact pull-request head SHA | automatic for same-repository PRs under `pr-preview/pr-<number>/` | review and physical validation of a proposed change |
| `experimental` | an explicitly chosen ref/SHA | build only by explicit opt-in; no automatic publication | temporary experiments that must not be confused with stable behavior |
| `stable` | `master` / an explicitly approved release revision | reserved; publication requires a separate explicit release decision | future deliberate stable releases |

Issue #32 does not create a production deployment. `stable:build` only produces local static output; it does not publish it. `experimental:build` is likewise local unless a separately authorized publication workflow is added later.

All channel builds use the same static builder and inject provenance into the HTML:

- `guitar-explorer-revision`
- `guitar-explorer-preview-pr`
- `guitar-explorer-deployment-channel`
- `guitar-explorer-deployment-label`

The PR workflow checks out `github.event.pull_request.head.sha` directly, so preview evidence identifies the exact proposed revision rather than GitHub's synthetic merge commit.

## Commands

```text
npm run preview:build
npm run experimental:build
npm run stable:build
```

For non-PR builds, set provenance explicitly when useful:

```text
GE_REVISION=<sha> GE_DEPLOYMENT_LABEL=<label> npm run experimental:build
```

Unknown channels are rejected. `npm run test:deployments` verifies channel metadata and the static-build contract. The authoritative repository gate remains `npm run verify`.

## Evidence provenance

Session Evidence schema v3 adds deployment provenance while preserving the Protocol v1 and ScenarioV1 fields already used for physical validation:

- `trialId`
- `revision`
- `previewPr`
- `deploymentChannel`
- `deploymentLabel`
- scenario ID/source/contract version when applicable

This metadata is descriptive traceability only. It must not be interpreted as mastery, scoring, adaptation, or learner state.

## Local longitudinal timeline

Evidence exports remain user-triggered JSON files. To build a local descriptive timeline, place exports under `.evidence-local/exports/` and run:

```text
npm run evidence:timeline
```

The default output is `.evidence-local/timeline.json`. You may also supply one or more files/directories, or add `--stdout` to print the generated timeline instead of writing the default file.

The timeline validates supported evidence schemas, preserves individual trial identity, and groups trials descriptively by revision while retaining channel, scenario, experience and disposition metadata. It does not infer progress or mastery from duration, interaction counts, assistance, dispositions or any other signal.

`.evidence-local/` is gitignored. Neither PR previews nor CI upload these learner evidence files. Do not commit exported evidence, place it in preview assets, or add an automatic evidence backend without separate explicit authorization.
