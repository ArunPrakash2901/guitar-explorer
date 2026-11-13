# Guitar Explorer — Installable App v0

This is an installable **Progressive Web App (PWA)**, not a native App Store / Play Store submission.
It packages the current Chord Progressions review branch (including Triad and Arpeggio Trainers)
without changing the music engine, browser sample playback, or the current progression PR stack.

## Build

```bash
npm ci
npm run app:build
```

Publish **`.preview-dist`** as the site root of an HTTPS static host.
The app build uses stable channel metadata and opens Chord Progressions at `/`.
The existing `preview:build`, `stable:build`, and `experimental:build`
continue to use their previously documented entrypoints.

A static deployment can use:

- Build command: `npm ci && npm run app:build`
- Publish directory: `.preview-dist`
- Branch: `feat/pwa-installable-release` for an isolated pilot only

Use a dedicated HTTPS URL before asking testers to install. Do not share local
`127.0.0.1` links or a GitHub Pages URL that returns 404.

## Installation

- **Android (Chrome):** open the hosted URL, use the browser menu's **Install app**.
- **iPhone/iPad (Safari):** open the hosted URL, **Share → Add to Home Screen**;
  leave **Open as Web App** enabled if offered.
- **Windows (Edge/Chrome):** open the hosted URL and select **Install this site as an app**.
- **macOS (Safari):** **File → Add to Dock**; alternatively install through Chrome.

The app manifest has its own relative scope, standalone window mode, 192px/512px
maskable PNG icons, and a first-party service worker. All paths are relative to
support both root and versioned subdirectory hosts. Cache names include the
deployment revision so old PR assets are not reused after a head update.

The service worker saves the basic UI shell and progressively caches loaded
HTML, CSS and JavaScript for fallback. **Recorded guitar/drum audio assets are
intentionally excluded from offline caching** to avoid uncontrolled storage
usage; offline audio and full offline operation are not claimed.

## Release gates

1. Run `npm run verify`, `npm run test:progression-browser`, and
   `npm run test:progression-browser:preview` on the exact app branch head.
2. Publish the `app:build` output to a reachable, HTTPS host.
3. Check `/manifest.webmanifest` returns a JSON MIME type and both icon paths
   resolve. Check mobile browser install and desktop Chrome/Edge installation.
4. Test real guitar/drum audio, gesture-based playback, storage and library
   import/export on iOS, Android, Windows and macOS.
5. Verify service-worker update, offline shell fallback, and sample asset behavior.
6. Obtain owner approval before treating the app as a general public release.

The Looper Studio proof (PR #111) is *not* automatically included; it is a
separate experimental branch and requires microphone/latency validation.

## Rollback

Disable the static host or revert the feature branch deployment to the
previous known-good head. `master` is intentionally not modified.
