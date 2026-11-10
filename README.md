# Guitar Explorer

Guitar Explorer is a fretboard-first project for discovering how music works on a
real guitar. Its current baseline is a deterministic Music Engine and a small
browser entrypoint that describes it. The next direction is song-led musical
discovery. Song Study Pilot 001 is tracked separately. [Issue #83](https://github.com/ArunPrakash2901/guitar-explorer/issues/83)

## Open locally

Use Node.js 22.17.0 or newer. From the repository root, run:

```sh
npm ci
npm run lab
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). The server compiles the
engine and serves the welcome page at the root. The former exercise URLs return
404. For an exact-head hosted review, see [PR previews](docs/PR_PREVIEWS.md).

## Music Engine

- **Core** handles pitch spelling, registered pitch, intervals, transposition,
  scales, chords, keys, harmonic context, exact musical time and Phrase operations.
- **Guitar** handles tuning, string and fret geometry, and pitch locations.
- **Queries** expose validated, serializable facts through `musicQueries`.

See the [public API](docs/API.md), [architecture](docs/ARCHITECTURE.md) and
[Phrase Foundation contract](docs/PHRASE_FOUNDATION_V1.md). The source-provenance
research in `src/research/` is covered by its own tests and is outside the browser
build. [Research contract](docs/STYLE_RESEARCH_V0.md)

## Verify and build

```sh
npm run typecheck
npm test
npm run verify
npm run preview:build
```

`npm run verify` runs the repository gate, including engine tests, HTTP smoke
tests and the static packaging checks. The preview build is written to
`.preview-dist/`. See [verification](docs/VERIFY.md) for focused commands and
[test coverage](docs/TEST_MATRIX.md) for the checks they run.

[Project state](PROJECT_STATE.md) records the current scope and review gate.
The previous learner experiences are recoverable from Git history. The
[historical index](docs/history/README.md) locates reference material and
attribution records.
