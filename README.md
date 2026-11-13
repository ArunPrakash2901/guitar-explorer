# Guitar Explorer

Guitar Explorer is a fretboard-first musical reasoning environment: it should help
the guitarist see musical relationships they currently cannot see, hear them,
physically locate them, manipulate them and reuse them in real music. It is not
primarily a course app.

The **merged `master` baseline** contains the deterministic TypeScript music
kernel and the accepted early Practice runtime. Separately, the current
**unmerged development stack** adds Chord Progressions, recorded sampled playback,
triad and arpeggio trainers, chord colours and style/groove controls. Treat those
newer features as review code until they have been independently validated and
merged, not as a published production application.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the current source of truth for
ownership, migration direction, deferred work and the distinction between current
capabilities and the target.

## Public previews and repository cleanup

The repository was still **private** at the 13 November audit. Publication
requires an owner visibility change in GitHub Settings after checking
repository history, third-party licences and evidence assets. See
[public-readiness and housekeeping](docs/PUBLICATION_AND_HOUSEKEEPING.md).

Routine cleanup is managed by `.github/workflows/weekly-housekeeping.yml`:
it prunes expired temporary Actions artifacts, older failed workflow runs,
and PR-preview directories for closed PRs only. It retains successful runs,
open PR previews, source branches, tagged releases and release attachments.
Manual housekeeping uses a dry-run first. The first cleanup removed 31 stale
preview directories while retaining the five existing open-PR previews.

## Installable app and GitHub release status (13 November 2026)

**Release status: NOT PUBLISHED.** The repository's GitHub Releases page has
no Windows or Android download artifacts. GitHub Actions is returning
`startup_failure` before jobs are allocated, so merging source alone **will not**
produce binaries or publish a GitHub Release.

The intended *personal test* binaries are:

| Device | Intended file | Packaging |
| --- | --- | --- |
| Windows 10/11 x64 | `GuitarExplorer-Setup-0.1.0-x64.exe` | Electron + NSIS |
| Android phone/tablet | `GuitarExplorer-Android-Phone-Tablet.apk` | Capacitor + Android debug APK |

The installer source began in
[PR #118](https://github.com/ArunPrakash2901/guitar-explorer/pull/118)
and was merged into the PWA staging branch through
[PR #117](https://github.com/ArunPrakash2901/guitar-explorer/pull/117).
Both have now merged into the head of the still-open learner-facing
[progression/trainer PR #116](https://github.com/ArunPrakash2901/guitar-explorer/pull/116).
This **does not mean the application code is merged to `master`**.
A merged source PR is also **not** proof an installer or app-store release exists.

**For a native release:** restore GitHub Actions execution, open **Actions →
Personal Windows + Android installers → Run workflow** on `master`, then
verify the source-check, Windows/Android builds and release-upload job.
The workflow checks out an exact commit from `codex/guitar-practice-tools`
without merging that learner-facing stack into `master`. Successful builds
create a GitHub pre-release named `personal-v0.1.0-<12-character-commit-SHA>`
with both binaries. Check the actual files on
[GitHub Releases](https://github.com/ArunPrakash2901/guitar-explorer/releases).
No release download exists until GitHub confirms those assets.

The Windows app contains local static assets behind an isolated Electron protocol;
the Android APK packages the same web UI in a local WebView. Neither requires a
live Guitar Explorer website for the bundled pages, but recorded audio, persistence,
touch interaction and file export still need real-device checks. The Windows
installer is unsigned and the Android installer is debug-signed for sideloading;
neither is a signed store-distribution package.

See [personal installer guide](docs/PERSONAL_INSTALLER_RELEASE.md) and
[installable PWA notes](docs/APP_RELEASE.md) for commands, boundaries and rollback.
The independent experimental Looper Studio PR #111 is **not** included.

### Run the current development app locally

Requires Node.js 22.17+ (including on Windows). On the checked-out
integration/installer branch:

```sh
npm ci
npm run lab
```

Open `http://127.0.0.1:4173/progression.html` for the progression workspace,
`/triad-trainer.html` or `/arpeggio-trainer.html` for the trainers.
The static `npm run app:build` produces `.preview-dist` for packaging; that
directory is **not** itself a Windows setup file or Android APK.

### Repository responsibilities and source of truth

| Layer | Responsibility |
| --- | --- |
| `src/engine`, `src/guitar`, `musicQueries` | Deterministic musical facts; no learner/session/audio implementation |
| `src/progression`, bounded `lab/progression-*.mjs` | Progression selection, playable voicings, style/strum/groove choices above music truth |
| `lab/progression-audio.mjs`, sample manifests | Playback clock, sample selection and audio output; not theory or user grading |
| `lab/*trainer*` and page modules | Learner interactions, display and practice flow |
| `packaging/windows`, `packaging/android` | Native shells and installer metadata only; no duplicate musical engine |
| `scripts/build-preview.mjs` and `.github/workflows/build-personal-installers.yml` | Build and distribution; not evidence of a successful release |
| `master`, issues/PRs and docs | Merged capability, bounded changes and review evidence; see `AGENTS.md` and `PROJECT_STATE.md` |

The active branch/PR graph is *stacked*: merging a leaf into an intermediate
branch does not put it on `master`. Keep release status, merged-source status and
physical verification separate. Do not delete an unmerged ancestor branch just
because its name looks old.

## Merged kernel baseline and historical Lab guide

**Phase 1 — Foundation Kernel: implemented**

**Phase 2A — Keys, signatures, relatives and fifths: implemented**

**Phase 2B — Scale catalog and contextual scale analysis: implemented**

**Phase 2C — Chord catalogue and learner-selectable Chord Lab: implemented**

**Phase 2D — Diatonic harmony/Roman engine implemented; current Lab cohort physically validated**

**Phrase Foundation PR 1 — exact musical time and pure monophonic Phrase: merged**

The shared fretboard, Parsimonious Path, Melody Over Harmony, Develop the Idea,
ScenarioV1/resolver and six-entry catalogue are implemented Lab capabilities.
Rule Generator V1 is integrated for Melody only; its stabilized algorithm reports
`generatorVersion: 2`. See [the generator contract](docs/RULE_GENERATOR_V1.md) for
its fixed guitar envelope, replay guarantee and recoverable distinct-search failure.
These software capabilities do not establish learning effectiveness.

The current kernel includes:

- spelling-aware notes and registered pitches
- intervals, inversion and transposition
- major and natural-minor scales
- harmonic minor and ascending melodic minor
- major/minor pentatonic and minor blues
- Dorian, Phrygian, Lydian, Mixolydian and Locrian
- generalized scale-context analysis for omitted and repeated written degrees
- 35 spelling-aware chord identities across triads, suspended, power/open, sixth,
  seventh, added-tone, ninth, eleventh, thirteenth and altered-dominant families
- an ordered, frozen chord catalogue built from the authoritative chord formulas
- conventional major/minor key signatures through seven sharps or flats
- interval-derived relative-key and Circle-of-Fifths relationships
- diatonic triad/seventh harmonization of explicit major and natural-minor keys
- structured Roman identities derived from degree and actual chord quality
- configurable tuning and standard guitar tuning
- bounded fretboard location queries
- exact rational musical time and immutable monophonic Phrase values
- phrase interval/contour/rhythm comparison, exact transposition and fragment extraction
- structured, JSON-compatible musical queries through `musicQueries`
- typed `MusicError` failures for low-level helpers
- strict TypeScript and Vitest coverage
- regression checks for the preserved behavioural prototype

The current engine deliberately does **not** include chord inversions, concrete voicings,
CAGED production logic, harmonic-function classification, progression relationships,
cadences, common/nearest/guide-tone analysis, audio, ear training, learning telemetry
or React integration. [ENGINE_PHASE1.md](docs/ENGINE_PHASE1.md) records the original
foundation acceptance; Issue #2 records the engine roadmap. Neither authorizes
capability expansion during Product Spine consolidation.

## Try the Phase 2C Chord Lab

`lab/` is a deliberately thin browser consumer of the existing engine. It is not
a general Learning Engine and it does not introduce persistence, mastery scores or
new musical truth. Its purpose is to test whether already-known theory can become
more tightly connected to sound, fretboard location, harmonic function and phrase use.

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run lab
```

Then open `http://127.0.0.1:4173`.

The Chord Lab renders its families, quality names, symbols and formulas from
`getChordCatalog`. Choose one family and one or more qualities, then work through a
frozen plan that asks you to sing or imagine, locate, play, commit, reconstruct and
transfer chord roles. Select-all and clear-all control the current family; a session
cannot start without a selected quality.

The planner selects a chord and formula role first, asks the engine for valid
fretboard locations, samples one of those locations, then derives a bounded window
that contains it. Transfers repeat that process with a different practical root
while preserving the quality and exact degree/alteration role. Extended chords keep
their complete abstract formula while the physical reconstruction uses at most four
structural roles.

Reveals keep three facts distinct: chord role, canonical formula interval and the
registered interval physically played from the chosen root anchor. For example, an
A functioning as C13's role 13 retains canonical M13, while C3→A3 is revealed as the
played M6. Wrong-fret feedback uses the same engine context to identify another
chord role or an outside tone.

The lab compiles and imports `src/engine/` directly. It does not duplicate a second
theory implementation in the UI. The physical guitar supplies the sound; the app
supplies prompts, constraints and deterministic theory/location verification. There
is deliberately no microphone grading or claim that the software can judge whether
your improvisation was musically good.

Treat the lab as a disposable learning probe: keep, change or delete interactions
based on whether they improve real practice.

## Product Spine v1 — Harmonic Gravity review surface

Run `npm run lab`, then open `http://127.0.0.1:4173/product-spine.html` for the
bounded Product Spine v1 workspace. It reuses the existing Harmonic Gravity lesson
facts and shared fretboard instead of creating another source of musical truth.

The first journey follows the approved design:

1. **Instrument Desk / Explore:** inspect the current fretboard context and choose a
   musical question without a curriculum gate.
2. **PLAY Focus:** play G → D7 → silence with normal workspace navigation removed so
   only the current cue remains.
3. **NOTICE:** select an expectation, optionally replay the comparison, then commit it
   before trying D7 → G. Listening responses are not scored.
4. **UNDERSTAND:** after confirming the physical comparison, reveal F# as D7's third,
   G as G's root, and the one-fret F# → G connection.
5. **Tiny phrase:** reuse those two notes in a small directed phrase rather than
   answering another identification question.
6. **TRANSFER:** change to A major, make a fresh prediction before labels, then reveal
   the corresponding G# → A relationship and replay the chosen phrase under new names.

Returning to the Instrument Desk preserves the in-page practice stage and choices.
Nothing is persisted, scored or interpreted as mastery. The simple musical examples
are a vertical Product Spine proof, not Guitar Explorer's future exercise vocabulary
or content ceiling.

## Practice Session v0 — Harmonic Gravity

Run `npm run lab`, then open `http://127.0.0.1:4173/practice.html` for the connected
legacy session. Allow roughly 35–50 minutes of physical playing and listening;
estimates are guidance, with no timers or enforced pace.

One G-major context connects all six blocks:

1. **Retrieve:** three brief fretboard/chord-role prompts using G and C material.
2. **Current focus:** sound G as home; compare G–C–G with G–D7–silence; commit an
   expectation before trying D7–G, then contrast D7–Em. Replay the same G over
   changing chords and compare it with F# leading into G. Perceptions are unscored.
3. **Connect:** only after listening, inspect Roman identities and the one
   engine-validated F#–G relationship that explains a melodic choice.
4. **Musicalize:** make a tiny phrase with a two-note palette, changing a destination
   because the harmony changes.
5. **Transfer:** try A, D, E7 and F#m, predicting and comparing before exposing
   the corresponding Roman labels.
6. **Reflect:** identify one source of friction, including fingering or no clear
   breakdown. Nothing is saved or turned into a mastery score.

`/harmony.html` opens the focused Harmonic Gravity version of the same legacy page,
plan and interaction code. It omits the retrieval warm-up rather than duplicating
the lesson. The old chord-construction Harmony workflow has been replaced.
The Chord Lab remains available at `/` as a separate focused tool; Practice Session
does not embed or run that entire Lab.

Use familiar chord shapes or arpeggios. On one guitar, sound a chord and then
replay the fixed melody note; no simultaneous accompaniment or generated audio is
required. The app checks only committed fret data and directs self-reported
listening. It cannot know which chord/voicing was played or assess the musical
result. Physical review must establish whether this feels like one musical idea.

## Lab experiment — The Parsimonious Path

Open `http://127.0.0.1:4173/voice-leading.html` after `npm run lab`. This separate
Lab asks the learner to connect G–C–D7–G on strings 4–3–2–1 by moving each voice
the smallest available same-string fret distance, then transfers the same rule to
A–D–E7–A from a compact first-inversion A voicing.

Chord identities, spellings, Roman identities, locations and registered intervals
come from `musicQueries`. A small Lab-local planner enumerates one note per active
string inside a bounded fret range, rejects candidates missing any structural chord
tone, and ranks the remaining candidates by total absolute fret movement, maximum
single-voice movement and fret vector. It accepts every valid candidate tied for
minimum total movement. This is an experimental physical constraint, not a Core
voicing or voice-leading API.

The UI reports harmony and movement separately, so a real but distant C chord is
never called theoretically wrong. Assistance reveals common tones, stationary
strings, directions and finally one complete nearest voicing. After G major, the
learner plays two actual chosen voices separately before reassembling the chords.
The A-major transfer withholds the route until commitment and exposes G#–A only
after the final solution. Attempts, invalid/distant counts, assistance and elapsed
seconds are ephemeral descriptive evidence; they are not persisted or interpreted
as mastery.

`getDiatonicHarmony({ key, chordSize: "triad" | "seventh" })` derives seven ordered
chords from the spelled scale and matches the authoritative chord formulas. Minor
means natural minor: A minor's fifth chord is Em/Em7 (`v`/`v7`), without a silently
raised leading tone. Core Roman labels identify structure; they do not infer
function, cadence or resolution. The fixed lesson's conventional home/pressure
language is pedagogy, not a new engine classification. See `docs/API.md` for the
unchanged result contract.

## Melody and motif Labs

After `npm run lab`, `/melody.html` runs Melody Over Harmony from the approved
catalogue or bounded Generated Practice. `/motif.html` runs Develop the Idea from
the catalogue only. Both consume ScenarioV1 material through the resolver and the
existing teaching plans; neither is a general song analyzer or a motif generator.
Attempts and reflections remain temporary, and the physical guitar supplies sound.

All standalone Lab URLs remain available during the planned migration. Their
target destinations are documented in the architecture.

## Verify the kernel and Lab consumers

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run verify
```

`npm run verify` is the authoritative repository gate. Narrower commands remain
available for diagnosis but do not replace it.

Import `src/engine/index.ts` from a TypeScript consumer. See:

- `docs/API.md` for query examples
- `docs/ARCHITECTURE.md` for module boundaries and dependency direction
- `docs/ENGINE_PHASE1.md` for Phase 1 scope and acceptance

## Architecture

The engine keeps musical truth separate from presentation and learner state.

```text
Current browser consumers
        |
        +--> Musical Query Interface --> Music Core
        |                           \--> Guitar Engine --> Music Core
        |
        +--> bounded material preparation --> existing teaching plans
                                             |
                                             +--> fretboard view model
```

Key principles:

- Music Core remains instrument-independent.
- Guitar geometry is built on Core rather than defining musical truth.
- CAGED is a future guitar representation, not the fretboard model itself.
- Ear training remains instrument-independent; combined tasks such as hear → identify → find are composed by a future Learning layer.
- `musicQueries` is the musical-truth query surface. Learner history will use a separate future learning query surface.
- Spelled identity and sounding membership stay distinct, including in non-heptatonic scales.
- Exact musical Phrase timing is implemented independently of audio seconds, meter and learner wall-clock time.

The target Experience Router may later select compatible capabilities and preserve
context; Product Spine v1 does not implement that general service. Future visual and
audio presentation consume prepared material in parallel. Practice Policy constrains
explicit Practice only. Style knowledge is not a separate product mode.

## Roadmap

1. **Accepted foundation** — engine through Phase 2D, Phrase Foundation PR 1, Labs, ScenarioV1, Melody generation, the preparation seam and developer tooling are merged. Issue #15's four Lab experiences are physically validated and accepted.
2. **Product Spine v1, Harmonic Gravity first** — the primary learner-facing milestone. The Figma direction is approved and PR #44 implements the bounded workspace. Full repository verification must remain green; exact-head Pages preview plus Arun's browser/physical-guitar approval are required before merge. The simple examples are a vertical proof, not a fixed exercise architecture.
3. **One material/exercise design pilot** — prove that one supplied material supports different learner actions, with explicit invariant, transfer, assistance and human listening. Role Lens is a candidate, not runtime authorization.
4. **Demand-driven engine work** — PR 2 and all further breadth need a concrete learner action, a missing deterministic fact and separate scope.

For current priorities and approval gates read [PROJECT_STATE.md](PROJECT_STATE.md);
[Trello](https://trello.com/b/blLKS9e7/guitar-explorer-project-hub) is the project navigation index.
Broad AI/agent and GX-10/rig work, Style Packs, Motif Generator, audio, learner models,
imports, general voice leading and framework migration remain Research & Later.
This roadmap does not authorize their implementation.

## Prototype and historical references

The dependency-free prototype remains in `prototype/` as a behavioural reference and regression source. It is not wired to the new kernel and retains its known limitations.

The exact original package is preserved in `references/approved-v0.2-handoff.zip`.

The former v0.2 UI-first handoff is in `docs/history/V0_2_HANDOFF.md`.
`docs/PRODUCT_SPEC.md`, `docs/V0_2_PLAN.md` and `CODEX_KICKOFF.md` also preserve
historical product/implementation directions. Their old modes, completion targets
and instructions do not override the current architecture or authorize work.

## Product principle

Anything shown can become material for a deliberately chosen Practice experience:
retrieve, reconstruct, manipulate, transfer and use it in context. Explore remains
permissive; access does not depend on completing that practice sequence.

The goal is broader functional fretboard vision and independent musical use.