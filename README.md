# Guitar Explorer

Guitar Explorer is a fretboard-first musical reasoning environment: it should help
the guitarist see musical relationships they currently cannot see, hear them,
physically locate them, manipulate them and reuse them in real music. It is not
primarily a course app.

The implemented product is a tested TypeScript music kernel with browser Lab
consumers. The target is one shared musical workspace with **Explore**, **Practice**
and **Apply** intentions. That workspace and its Experience Router are documented,
not implemented. Existing pages and sessions remain unchanged.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the current source of truth for
ownership, migration direction, deferred work and the distinction between current
capabilities and the target. This consolidation slice changes documentation only.

## Current status

**Phase 1 — Foundation Kernel: implemented**

**Phase 2A — Keys, signatures, relatives and fifths: implemented**

**Phase 2B — Scale catalog and contextual scale analysis: implemented**

**Phase 2C — Chord catalogue and learner-selectable Chord Lab: implemented**

**Phase 2D — Diatonic harmony/Roman engine implemented; Practice Session v0 ready for physical review**

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
target destinations are documented in the architecture; no navigation change has
been made in this slice.

## Verify the kernel and Lab consumers

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
Current Lab consumers
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
- Ear training remains instrument-independent; combined tasks such as hear → identify → find are composed by the Learning layer.
- `musicQueries` is the musical-truth query surface. Learner history will use a separate future learning query surface.
- Spelled identity and sounding membership stay distinct, including in non-heptatonic scales.
- A future rhythm/time domain is reserved architecturally but is not implemented yet.

The target Experience Router selects compatible capabilities and preserves context;
it does not replace these domain or activity boundaries. Future visual and audio
presentation consume prepared material in parallel. Practice Policy constrains
explicit Practice only. Style knowledge is not a separate product mode.

## Roadmap

1. **Accepted foundation** — engine through Phase 2D, Labs, ScenarioV1, Melody generation, the preparation seam and developer tooling are merged. Issue #15's four Lab experiences are physically validated and accepted.
2. **Product Spine v1, Harmonic Gravity first** — the primary learner-facing milestone. Review the existing Figma direction in Issue #16, then commission one bounded implementation PR. Reuse validated behaviour, retain legacy routes and review an exact-head Pages preview with the guitar before learner-facing merge.
3. **One material/exercise design pilot** — prove that one supplied material supports different learner actions, with explicit invariant, transfer, assistance and human listening. Role Lens is a candidate, not runtime authorization.
4. **Demand-driven engine work** — approved Phrase PR #41 is under review. PR 2 and all further breadth need a concrete learner action, a missing deterministic fact and separate scope.

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
