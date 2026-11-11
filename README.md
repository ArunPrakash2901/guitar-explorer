# Guitar Explorer

Guitar Explorer connects close listening with playing a real guitar. Its first
Song Study follows Led Zeppelin's *Black Dog* through eleven sections and 31
provisional recording anchors. The section workbench pairs musical questions
with reference listening, original audio comparisons, fretboard exploration
and guitar-in-hand transfer prompts. [Issue #83](https://github.com/ArunPrakash2901/guitar-explorer/issues/83)

## Open locally

Use Node.js 22.17.0 or newer. From the repository root, run:

```sh
npm ci
npm run lab
```

Open the song overview, choose a section, and open the studio recording link
to hear the passage. Its time link is an approximate listening cue. Compare the
study examples, select a fret to hear its pitch, and try the playing or transfer
prompt on guitar. Your section, reflection, and self-reported playing attempt
are saved in this browser when local storage is available. [Open Guitar Explorer](http://127.0.0.1:4173/)

The [Black Dog requirements and traceability](docs/BLACK_DOG_REQUIREMENTS.md)
document includes the full-song coverage, evidence for each study, and a
guitar-in-hand review route. See [PR previews](docs/PR_PREVIEWS.md) for hosted
review.

## Music Engine

- **Core** handles pitch spelling, registered pitch, intervals, transposition,
  scales, chords, keys, harmonic context, exact musical time and Phrase operations.
- **Guitar** handles tuning, string and fret geometry, and pitch locations.
- **Queries** expose validated, serializable facts through `musicQueries`.

The workbench uses the engine for the facts behind its examples. The independent
source-provenance research in `src/research/` has its own tests and stays outside
the browser build. [Public API](docs/API.md) · [Architecture](docs/ARCHITECTURE.md) · [Phrase Foundation](docs/PHRASE_FOUNDATION_V1.md)

## Verify and build

```sh
npm run typecheck
npm test
npm run verify
npm run preview:build
```

`npm run verify` covers the engine, Song Study, HTTP and static packaging. The
preview build is written to `.preview-dist/`. [Verification](docs/VERIFY.md) · [Test coverage](docs/TEST_MATRIX.md)

[Project state](PROJECT_STATE.md) records the current scope and review gate.
The previous learner experiences are recoverable from Git history. The
[historical index](docs/history/README.md) locates reference material and
attribution records.
