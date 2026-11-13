# Public repository readiness and routine housekeeping

**Checked 13 November 2026. GitHub visibility remained private at the time of this audit.**
Publication is a separate owner action: the connected GitHub API capability
can read/manage branches and PRs but has no repository-visibility setting action.

## Before making Guitar Explorer public

1. **Review Git history as well as current files.** Visibility change publishes
   historical commits, all branches, open/closed PR discussions and Actions logs.
   Use a local secret-history scanner such as `gitleaks git` / `trufflehog git`
   on a full clone, including all refs, and review the results before publication.
   Do not merely delete a secret from the latest branch: rotate exposed secrets
   and remove sensitive history where necessary.
2. **Review binary/reference assets.** `references/approved-v0.2-handoff.zip`
   includes a historical prototype, docs and a PNG. The current files under
   `docs/evidence/productization-1/*.jpg` and
   `references/gemini-reference.png` should be visually checked for
   personal data, unlicensed design imagery and private material.
3. **Review third-party audio.** `lab/samples/steel`,
   `lab/samples/electric`, and `lab/samples/drums` contain CC0-1.0
   licence files and provenance docs identifying the recorded sources.
   Reconfirm attribution, actual upstream provenance and that these are
   the only distributed audio assets. Public code does not automatically
   grant unrelated source/audio rights.
4. **Choose the repository's code licence deliberately.** No root-level
   `LICENSE` file was observed in the 13 November repository tree.
   Publishing publicly does not, on its own, give others a licence to reuse code.
5. **Review Actions/Pages and branch protection.** A public visibility
   change makes Actions history/logs publicly visible and may affect
   repository rules. Don't publish session-evidence exports or private data.
6. **Only then change visibility:** GitHub repository Settings →
   Danger Zone → Change repository visibility → Public → read and
   confirm GitHub's warnings. This cannot be performed with the
   currently connected tool.
7. Verify `GitHub Actions` jobs actually start following the change.
   The old `startup_failure` was pre-job and does not prove source failure,
   but conversion might not clear every billing/account restriction.

## Automatic kickoff after changing visibility

The default-branch workflows listen to GitHub's one-time `public` event:

- `.github/workflows/bootstrap-public-preview.yml` checks out the current
  `codex/guitar-practice-tools` head, verifies it, builds the static
  exact-revision PR #116 preview and publishes only the
  `gh-pages/pr-preview/pr-116/` directory. It checks the live Pages URL
  for the exact SHA. If Pages remains 404, use Settings → Pages to ensure
  `gh-pages` and `/(root)` are selected and rerun manually.
- `.github/workflows/build-personal-installers.yml` verifies the same
  staging branch, builds one Windows EXE and one Android phone/tablet APK,
  and publishes a SHA-tagged GitHub pre-release **only if both pass**.
- Both workflows also permit manual `workflow_dispatch` after a billing
  or Pages restriction is repaired. A repository visibility change does
  not itself prove any of these jobs completed successfully.

Do not change the repository visibility until the history/private-asset
review above is satisfactory. Only the repository owner can make the
visibility change through the GitHub website in this environment.

## Preview and personal-release gates

- Existing `.github/workflows/pr-preview.yml` publishes static review
  output from same-repository PRs under `gh-pages/pr-preview/pr-<number>/`
  when Actions is functioning. It removes a preview on PR close.
- `.github/workflows/build-personal-installers.yml` is a manual workflow
  on `master`. It verifies a pinned head of
  `codex/guitar-practice-tools`, builds Windows EXE/Android APK and
  publishes a commit-tagged pre-release only if both builds succeed.
  Publishing source is not publishing a release.
- Do not automatically merge draft learner-facing PRs as part of
  preview/release housekeeping; follow exact-head/physical-review gates.
- Do not publish a fabricated installer URL. Inspect the actual Releases
  assets and test on Windows, Android phone and tablet first.

## Automatic weekly cleanup

`.github/workflows/weekly-housekeeping.yml` runs each Sunday 03:00 UTC,
or manually with `dry_run=true` by default.

The scheduled run:
- Deletes temporary Actions artifacts older than 14 days, up to 100 per run.
  A separate seven-day artifact retention is set for temporary EXE/APK
  workflow handoff files. The **attached files on published GitHub Releases**
  are a separate store and are never targeted.
- Deletes at most 100 **non-successful** completed workflow runs older than
  30 days. Successful runs and recent failures are preserved for audit.
- Removes only **closed-PR** preview folders under `gh-pages/pr-preview`,
  retaining all previews whose PRs are open. It never force-pushes.
- Does **not** remove Git branches, open PRs, tagged releases, source commits,
  source-control history, saved musical material or user data.

Do not add automated branch deletion: a stacked PR's dependent branches
must be explicitly audited by commit ancestry, not by last-update date.

## Completed one-time cleanup

- On 13 November 2026, pruned 31 old preview directories on `gh-pages`.
- Previous recoverable `gh-pages` commit:
  `349205dc7461e0193fba5cb5badd6548b63bb858`.
- New cleanup commit:
  `d334d69f3c56ab80b07758f7b577a5ddab998342`.
- Preserved open-PR preview folders: `pr-110`, `pr-113`,
  `pr-114`, `pr-115`, `pr-116`.
- Actual publication to GitHub Pages after that commit still depends on
  successful Pages/Actions deployment.

## Further review

After publication, perform a focused smoke test with the live PR #116
preview and manual personal installer workflow; verify release attachments
and logs, and keep the exact-head source commit in the release notes.
