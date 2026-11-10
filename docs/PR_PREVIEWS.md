# Pull-request previews

The `preview` channel publishes the engine-first entrypoint and compiled engine
on GitHub Pages. See [deployment channels](DEPLOYMENT_CHANNELS.md) for the
stable and experimental build policies.

## Exact-head review

For same-repository pull requests, `.github/workflows/pr-preview.yml` checks out
the exact head SHA, installs dependencies, builds with `npm run preview:build`
and publishes the output under `pr-preview/pr-<number>/` on `gh-pages`. It
comments the preview URL on the PR, checks that the live page contains the head
revision and removes the preview after the PR closes.

Open the URL from the PR and compare the `guitar-explorer-revision` meta tag in
the page source with the PR head SHA. Check the welcome page at desktop and
narrow widths. The page should identify the Music Engine and the upcoming Song
Study direction. Old activity URLs should return 404.

If the workflow fails to start or Pages does not publish, record the hosted
status separately. The static site can still be built locally from the same
head. Exact-head preview publication remains a merge gate.

## Static build

Run `npm run preview:build` from the repository root. The build writes the
welcome page, compiled engine modules and `.nojekyll` to `.preview-dist/`. It
injects revision, PR and channel metadata in the page. The output supports PR
subpaths and excludes source maps, TypeScript source, exercise files, tests,
documents and reference assets.

For local browser review, run `npm run lab` and open
[http://127.0.0.1:4173/](http://127.0.0.1:4173/).

## Repository setup

GitHub Pages uses **Settings → Pages → Deploy from a branch** with branch
`gh-pages` and folder `/(root)`. The workflow needs write access to update the
dedicated preview branch and comment on PRs. Arun enabled this preview path
on 25 October 2026. Publication approval applies to the preview channel.

GitHub Pages availability depends on the repository and account configuration.
Keep secrets, private evidence and learner records out of published output.
