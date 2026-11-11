# Pull-request previews

The `preview` channel publishes the Song Study application and compiled
Music Engine on GitHub Pages. See [deployment channels](DEPLOYMENT_CHANNELS.md)
for the stable and experimental build policies.

## Review the PR revision

For same-repository pull requests, `.github/workflows/pr-preview.yml` checks out
the exact head SHA, installs dependencies, builds with `npm run preview:build`
and publishes the output under `pr-preview/pr-<number>/` on `gh-pages`. It
comments the preview URL on the PR, checks that the live page contains the head
revision and removes the preview after the PR closes.

Open the URL from the PR and compare the `guitar-explorer-revision` meta tag in
the page source with the PR head SHA. At desktop and narrow widths, open a
section and a recording anchor. Try the comparison audio and fretboard,
then return to the song overview and resume the section. Follow the
guitar-in-hand review route for the passage and its transfer action.
[Review on guitar](BLACK_DOG_REQUIREMENTS.md#review-on-guitar)

If the workflow fails to start or Pages does not publish, record the hosted
status separately. Build and review the same revision locally while hosted
publication is unavailable. Publication and owner approval remain part of
the merge gate. [Autonomy contract](AUTONOMY_CONTRACT.md)

## Static build

Run `npm run preview:build` from the repository root. The build writes the
HTML entrypoint, its stylesheet and browser modules, compiled Song Study and
engine modules, and `.nojekyll` to `.preview-dist/`. It injects revision,
PR and channel metadata and stamps local asset URLs. The output supports PR
subpaths and excludes source maps, TypeScript source, retired exercise files,
research code, tests, documentation and media files.

For local browser review, run `npm run lab` and open
[http://127.0.0.1:4173/](http://127.0.0.1:4173/).

## Repository setup

GitHub Pages uses **Settings → Pages → Deploy from a branch** with branch
`gh-pages` and folder `/(root)`. The workflow needs write access to update the
dedicated preview branch and comment on PRs. Arun enabled this preview path
on 25 October 2026. Publication approval applies to the preview channel.

GitHub Pages availability depends on the repository and account configuration.
Keep secrets, private evidence and learner records out of published output.
