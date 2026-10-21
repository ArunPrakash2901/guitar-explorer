# Guitar Explorer

Guitar Explorer is a long-term guitar and musicianship learning system built around one core problem: learning the fretboard and musical relationships without becoming dependent on visual shapes alone.

The tested TypeScript music kernel supports small physical-guitar learning probes.
The current learner-facing experiment is one connected Practice Session, with
focused Labs available as tools. Production UI, audio and Learning infrastructure
remain later work.

## Current status

**Phase 1 — Foundation Kernel: implemented**

**Phase 2A — Keys, signatures, relatives and fifths: implemented**

**Phase 2B — Scale catalog and contextual scale analysis: implemented**

**Phase 2C — Chord catalogue and learner-selectable Chord Lab: implemented**

**Phase 2D — Diatonic harmony/Roman engine implemented; Practice Session v0 ready for physical review**

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
- structured, JSON-compatible musical queries through `musicQueries`
- typed `MusicError` failures for low-level helpers
- strict TypeScript and Vitest coverage
- regression checks for the preserved behavioural prototype

The current engine deliberately does **not** include inversions, concrete voicings,
CAGED production logic, harmonic-function classification, progression relationships,
cadences, common/nearest/guide-tone analysis, audio, ear training, learning telemetry
or React integration. See `docs/ENGINE_PHASE1.md` for the foundation boundary and
GitHub Issue #2 for the incremental Phase 2 roadmap.

## Try the Phase 2C Chord Lab

`lab/` is a deliberately thin browser consumer of the existing engine. It is not
the production app and it does not introduce a general Learning Engine, persistence,
mastery scores or new musical truth. Its purpose is to test whether already-known
theory can become more tightly connected to sound, fretboard location, harmonic
function and phrase use.

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

## Practice Session v0 — Harmonic Gravity

Run `npm run lab`, then open `http://127.0.0.1:4173/practice.html` for the connected
session. Allow roughly 35–50 minutes of physical playing and listening; estimates
are guidance, with no timers or enforced pace.

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

`/harmony.html` now opens the focused Harmonic Gravity version of the same page,
plan and interaction code. It omits the retrieval warm-up rather than duplicating
the lesson. The old chord-construction Harmony workflow has been replaced.
The Chord Lab remains available at `/` as a separate focused tool; Practice Session
does not embed or run that entire Lab.

Use familiar chord shapes or arpeggios. On one guitar, sound a chord and then
replay the fixed melody note; no simultaneous accompaniment or generated audio is
required. The app checks only committed fret data and directs self-reported
listening. It cannot know which chord/voicing was played or assess the musical
result. Physical review must establish whether this feels like one musical idea.

`getDiatonicHarmony({ key, chordSize: "triad" | "seventh" })` derives seven ordered
chords from the spelled scale and matches the authoritative chord formulas. Minor
means natural minor: A minor's fifth chord is Em/Em7 (`v`/`v7`), without a silently
raised leading tone. Core Roman labels identify structure; they do not infer
function, cadence or resolution. The fixed lesson's conventional home/pressure
language is pedagogy, not a new engine classification. See `docs/API.md` for the
unchanged result contract.

## Verify the foundation kernel

Requires Node.js 22.17 or newer.

```sh
npm ci
npm run typecheck
npm test
npm run test:prototype
npm run test:lab
```

Import `src/engine/index.ts` from a TypeScript consumer. See:

- `docs/API.md` for query examples
- `docs/ARCHITECTURE.md` for module boundaries and dependency direction
- `docs/ENGINE_PHASE1.md` for Phase 1 scope and acceptance

## Architecture

The engine keeps musical truth separate from presentation and learner state.

```text
Application / future React
        |
        +--> Musical Query Interface --> Music Core
        |                           \--> Guitar Engine --> Music Core
        |
        +--> future Learning Engine --> Core / Guitar / Ear
        |
        +--> future Browser Audio --> pure Audio plans
```

Key principles:

- Music Core remains instrument-independent.
- Guitar geometry is built on Core rather than defining musical truth.
- CAGED is a future guitar representation, not the fretboard model itself.
- Ear training remains instrument-independent; combined tasks such as hear → identify → find are composed by the Learning layer.
- `musicQueries` is the musical-truth query surface. Learner history will use a separate future learning query surface.
- Spelled identity and sounding membership stay distinct, including in non-heptatonic scales.
- A future rhythm/time domain is reserved architecturally but is not implemented yet.

## Roadmap

1. **Foundation kernel** — implemented
2. **Theory breadth** — slices 2A through 2D implemented; Phase 2E relationship/function work remains pending
3. **Guitar representations** — maps, triad voicings, inversions, CAGED and position connectivity
4. **Learning engine extraction** — deterministic exercises, evaluation, assistance and evidence contracts
5. **Audio and ear training** — playback plans, browser audio and auditory exercise families
6. **Production integration and stabilization** — React/PWA consumers, persistence and end-to-end verification

The roadmap is intentionally incremental. Each phase should pass its own tests and acceptance criteria before later phases begin. The Learning Lab may be used between slices to validate that existing capabilities earn their place before more engine breadth is added.

## Prototype and historical references

The dependency-free prototype remains in `prototype/` as a behavioural reference and regression source. It is not wired to the new kernel and retains its known limitations.

The exact original package is preserved in `references/approved-v0.2-handoff.zip`.

The former v0.2 UI-first handoff has been moved to `docs/history/V0_2_HANDOFF.md`. It provides historical product context only and no longer defines the implementation order.

## Product principle

Anything the learner can currently see should eventually become something they have to retrieve, reconstruct, transfer or use in musical context.

That principle will guide future fretboard, harmony, ear-training and improvisation features built on top of the engine.
