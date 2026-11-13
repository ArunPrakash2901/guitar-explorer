# Guitar Explorer — personal Windows and Android installers

## Intended downloads

| Device | Binary | Build |
| --- | --- | --- |
| Windows 10/11 x64 | `GuitarExplorer-Setup-0.1.0-x64.exe` | Electron/NSIS installer |
| Android phone + Android tablet | `GuitarExplorer-Android-Phone-Tablet.apk` | Capacitor debug-signed sideload APK |

These are **personal test builds**, not signed commercial or app-store releases.

## Source and publishing

Installer source PR #118 merged into PWA PR #117; the combined package then
merged into `codex/guitar-practice-tools` (still-open PR #116), **not**
`master`. That branch contains the progression/trainer work and packaging,
but no verified native binaries or published GitHub Release. The independent
experimental Looper Studio PR #111 is excluded.

The publish workflow is `.github/workflows/build-personal-installers.yml`.
Once the workflow is integrated into `master`, open **Actions → Personal Windows
+ Android installers → Run workflow** to trigger it manually. It resolves and
pins the exact commit currently on `codex/guitar-practice-tools` (PR #116);
`master` does not need the unreviewed app features merged. It runs `npm run
verify` and builds both files on Windows and Linux hosted runners. **Only after
both builds succeed** does it create a commit-specific GitHub prerelease named
`personal-v0.1.0-<12-character-commit-SHA>` and upload both files.

Run `node scripts/test-native-packaging.mjs` to verify the source setup before
building. This checks the package declarations, native entrypoint syntax,
project paths and release workflow. It is **not** a substitute for actual builds.

## Windows install

Download the EXE from the repository's Releases tab. Double-click to install.
Because this is an unsigned personal build, Windows SmartScreen can warn;
verify the download came from your own private GitHub repository.

The desktop app bundles its HTML, JavaScript, guitar/drum samples and static
engine output. It serves these through an isolated, secure Electron app protocol
and does not require an externally hosted site for normal use.

## Android phone or tablet install

Download the same APK to either Android device. Tap the APK in your Downloads,
allow installing from that source when prompted, then install.

This is a **debug-signed** personal build; debug APKs are not suitable for
store distribution. CI-generated debug keystores may differ between workflow
runs. If installation of a later build reports a signature mismatch, Android may
require uninstalling the previous app, which deletes the app's local storage.
Back up/export any favourites before doing so.

The Android app uses its local WebView, and the static assets are packaged
inside the APK rather than loaded from GitHub Pages. Native microphone/recording
functions, file exports and sample playback still require physical-device
testing. Tablet responsiveness must be tested separately.

## Rebuild instructions

1. Restore GitHub Actions operation, including any account billing/spending
   restriction; `startup_failure` means no runner has started.
2. From GitHub Actions on `master`, manually run **Personal Windows + Android
   installers**. Confirm the workflow resolved the intended staging SHA.
3. Check both Windows and Android jobs succeed. Download the run artifacts
   for local checks.
4. Check the `github-release` job finishes and that the prerelease actually
   contains both binary attachments.
5. Install on a Windows laptop, Android phone and Android tablet; verify chord
   progression generator, triads/arpeggios, recorded guitar/drums, favourites,
   app launch, and offline playback.
6. Only after manual approval consider merging; no changes are required on
   `master` for this personal prerelease.

**Do not advertise a download link to a Release until GitHub confirms the
Release and its assets exist.** The repository may show failing Actions even
when source commits succeed.
