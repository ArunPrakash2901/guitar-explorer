# Pull-request previews

Guitar Explorer can build a self-contained static Lab and deploy one preview per pull
request under GitHub Pages.

## What the workflow does

For same-repository pull requests, `.github/workflows/pr-preview.yml`:

1. installs dependencies
2. runs `npm run preview:build`
3. writes only generated browser-preview output to the dedicated `gh-pages` branch
   under `pr-preview/pr-<number>/`
4. comments the preview URL on the pull request
5. removes that preview when the pull request closes

The preview output contains the browser Lab files and compiled engine files required
by the app. Repository docs, tests, references and unrelated source files are not
published. Browser JavaScript used by the Lab is necessarily visible to anyone who
can access the Pages site, and source maps are intentionally omitted.

## One-time repository setup

The workflow can create/update the `gh-pages` deployment branch, but GitHub Pages must
still be configured once in repository settings.

After the first preview workflow has created `gh-pages`:

1. open **Settings → Pages**
2. under **Build and deployment**, choose **Deploy from a branch**
3. select branch **`gh-pages`** and folder **`/(root)`**
4. save

If repository policy prevents the workflow token from writing, also check
**Settings → Actions → General → Workflow permissions** and allow the workflow the
write permissions requested in the workflow file.

## Privacy note

GitHub Pages sites are web-published content, including when the source repository is
private on plans that allow private-repository Pages. Enabling Pages is therefore an
explicit publication decision. Do not put secrets, private learner records or
exported session-evidence JSON into the preview build.

The evidence recorder itself stays local in the browser and exports a file only when
the learner chooses to do so. The preview workflow does not upload that exported
JSON.

For private repositories, Pages availability depends on the GitHub plan/account
configuration. If Pages is unavailable or public preview publication is not desired,
`npm run preview:build` still produces the same static output locally; a different
preview host can be added later only with explicit authorization.

## Static build contract

Run:

```text
npm run preview:build
```

Output is written to `.preview-dist/` and is ignored by Git.

The build:

- compiles the current engine with the existing Lab TypeScript configuration
- copies the Lab and compiled engine into one static directory
- creates a real `harmony.html` alias for the local-server route
- rewrites only local root-absolute `src`, `href` and ES-module import references so
  the site works below a PR-specific subpath
- adjusts the generated Harmony route check for the PR-specific path prefix without
  changing the source Lab behaviour
- injects the local-only session-evidence recorder plus build revision / PR metadata
- omits source maps from published preview output
- fails if required entry files are missing or root-absolute local references remain

It does not rewrite musical data or exercise logic.
