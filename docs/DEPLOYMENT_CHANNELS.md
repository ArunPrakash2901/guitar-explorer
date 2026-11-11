# Deployment channels and provenance

All three channels build the same static application with explicit provenance.

| Channel | Source identity | Publication |
| --- | --- | --- |
| `preview` | Exact pull-request head SHA in GitHub Actions | Automatic for same-repository PRs under `pr-preview/pr-<number>/`. |
| `experimental` | Explicitly chosen ref or SHA | Opt-in local build. |
| `stable` | `master` or an explicitly approved release revision | Reserved for deliberate releases. The command builds locally. |

```sh
npm run preview:build
npm run experimental:build
npm run stable:build
```

Set `GE_REVISION` and `GE_DEPLOYMENT_LABEL` in the environment when recording a
specific non-PR build. The builder rejects unknown channels and embeds these
metadata fields in the HTML:

- `guitar-explorer-revision`
- `guitar-explorer-preview-pr`
- `guitar-explorer-deployment-channel`
- `guitar-explorer-deployment-label`

`npm run test:deployments` verifies channel metadata and the static output.
See [PR previews](PR_PREVIEWS.md) for the published review path.

The preview build contains the entrypoint, browser assets, and compiled Song Study and engine modules. Keep private
records and any historical learner evidence local unless explicitly authorized
for sharing. The former evidence recorder and timeline tooling are archived in
Git history.
