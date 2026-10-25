# AGENTS.md

## Current scope — Product Spine consolidation

Read [`PROJECT_STATE.md`](PROJECT_STATE.md) first for the current operational focus,
active work, waiting-on-Arun state and decision gate. Read
[`docs/AUTONOMY_CONTRACT.md`](docs/AUTONOMY_CONTRACT.md) for what an agent may do
without asking and where explicit approval is required. Then read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) as the current product/architecture
source of truth alongside `docs/LEARNING_MODEL.md`, `docs/DECISIONS.md` and the
current part of `docs/TEST_MATRIX.md` before proposing changes.

Issue #18 / PR #19 is complete. PR-preview plumbing, local-only session-evidence
export and the autonomy contract are now baseline development/validation support,
not authorization for additional infrastructure or musical capability.

No new Product Spine capability slice is active by default. Issue #15 is the current
physical-evidence task and Issue #16 remains the next capability decision gate.

PR #13 remains the previously authorized bounded Product Spine runtime slice: one
DOM-free Melody preparation seam for existing catalogue/generated material, with no
intended learner-facing behaviour change and no new musical capability. It must be
reconciled with current `master` before merge; do not force it or generalize that seam
into a complete Experience Router, Practice Policy, generic Learning Engine, runtime
reorganization or UI redesign. A later Product Spine implementation slice requires
its own explicit issue/scope and must be consistent with the current gate in
`PROJECT_STATE.md`.

No new capability receives a learner-facing destination by default. It must fit
Explore, Practice, Apply or a shared service. Practice Policy applies only to an
explicit Practice experience; Explore and Apply have no curriculum gates.
ScenarioV1 remains bounded Melody/Motif material, not a universal workspace schema.
Preserve deterministic engine truth, current generator provenance, answer
withholding and the distinction between musical validity, exercise compliance and
subjective musical judgment. See the architecture for deferred capabilities.

## Existing foundation and Lab boundaries — implemented through Phase 2D

The following records the foundation and experimental consumer boundaries. It
does not override the current control-plane gate or authorize feature growth.

The user-approved Music Engine plan supersedes the historical v0.2 implementation
order, `src/music` layout, and UI-first kickoff. Phase 1 plus Issue #2 slices
2A through 2D implement `src/engine/{core,guitar,query}`: the foundation kernel,
conventional key relationships, broader scale formulas, generalized selected-scale
contextual analysis, the approved chord catalogue, and explicit major/natural-minor
diatonic triad/seventh harmony with structured Roman identity.

Do not begin Issue #2 slice 2E, harmonic-function classification, CAGED, inversions,
voicings, progressions, Audio, Ear, Learning, storage, React or rhythm implementation
without later authorization. Do not add future-engine placeholders. Do not introduce
bitsets, fretboard graphs, caching or adaptive-learning infrastructure without a
concrete later requirement. The preserved prototype remains a reference, not the
production implementation.

### Approved learning-harness experiment

`lab/` is authorized as a disposable browser consumer of the already-implemented
engine. Its job is to validate educational usefulness before more engine breadth is
added. It may call existing Core/Guitar/query exports, but it must not create a
second source of musical truth or silently begin the future Learning Engine.

Keep the lab intentionally thin: no persistence, learner history, mastery scores,
adaptive scheduling, analytics, accounts, AI, audio or React. New lab interactions
should earn their place by improving interval understanding, fretboard
reconstruction, scale-degree understanding or transfer. If an interaction is not
useful in practice, simplify or remove it rather than building infrastructure around
it.

The merged Session Evidence recorder from Issue #18 is a standing bounded validation
tool. It may keep ephemeral in-page interaction evidence and export a user-triggered
JSON file. It must not send evidence over the network, persist learner history, score
performance, infer mastery or change exercise correctness.

PR-preview infrastructure is likewise bounded development tooling. Do not enable a
web-public Pages site, introduce another external host, publish private evidence or
turn previews into production deployment without Arun's explicit approval. See
`docs/PR_PREVIEWS.md`.

Permanent boundaries: Ear is instrument-independent (Core + pure Audio contracts).
Learning composes Ear + Guitar for auditory-to-fretboard tasks. Musical queries
expose musical truth only; future evidence/history queries belong to a separate
Learning Query Interface. Musical time, audio seconds and learning wall-clock time
remain separate. See the current architecture for documentation-only extensions.

Scale formulas are structured degree/alteration values. Selected-scale analysis
must preserve written-degree evidence separately from sounding membership; omitted
and repeated formula degrees are explicit data, not errors or implicit choices.
Key analysis remains the existing seven-note major/natural-minor contract.

`CHORD_FORMULAS` is the only declaration of chord formula truth. Chord catalogue
metadata may contain only identity and presentation data; attach the authoritative
formula object when producing catalogue results. Preserve compound roles 9, 11 and
13 and diminished seventh alteration -2. A formula interval such as M13 describes
the abstract chord role; any physical Lab reveal must separately calculate the
registered interval actually played from the frozen root anchor.

Every physical Lab task must be sampled from engine-returned fretboard locations.
Freeze the selected chord, role, anchor, location, string and window before render.
Transfer preserves quality plus exact degree/alteration identity. Formulas longer
than four tones remain complete in Core while a physical reconstruction selects at
most four roles, including a compound extension for ninth/eleventh/thirteenth work.

Phase 2D stacks thirds from the spelled major/natural-minor scale and matches
canonical chords through `CHORD_FORMULAS`. Roman identity describes degree plus
actual chord quality; it does not classify harmonic function or predict resolution.
Practice Session v0 uses one curated G-major musical context, with a short related
warm-up, Harmonic Gravity, one explanatory relationship, constrained melodic use,
A-major transfer and reflection. The focused Harmony route shares the same page,
plan and app; it does not retain the rejected chord-construction workflow. Preserve
the Chord Lab as a separate focused tool rather than embedding its full session.

Home/pressure/expectation language belongs to this curated lesson, not Core. The
first harmony response concerns perceived musical consequence; reveal Roman and
functional labels only after prediction and melodic comparison. Do not score
perception or infer mastery. No engine/query/contract changes are authorized for
this learner-facing revision absent a real correctness bug. No generic Practice
Engine, curriculum framework, progression generator or Phase 2E capability.

The separately authorized Parsimonious Path remains a bounded Lab experiment at
`/voice-leading.html`. Its deterministic candidate enumeration and same-string fret
distance scoring stay local to `lab/`; they are not a generic Core voicing or
voice-leading engine. Preserve the separate harmony-versus-efficiency result,
progressive assistance, physical voice deconstruction, unfamiliar A-major transfer
and ephemeral evidence. Promotion into an engine module requires later evidence and
authorization.

Verify with `npm run typecheck`, `npm test`, `npm run test:prototype`,
`npm run test:lab`, and for preview-sensitive changes `npm run preview:build`. Stop
engine breadth after Phase 2D unless separately authorized. The exact original
handoff is in `references/approved-v0.2-handoff.zip`.

## Historical instructions

The former v0.2 agent instructions are preserved in
[`docs/history/AGENTS_V0_2.md`](docs/history/AGENTS_V0_2.md). They are non-operative
historical context and intentionally no longer share this active instruction file.
`CODEX_KICKOFF.md`, `docs/PRODUCT_SPEC.md` and `docs/V0_2_PLAN.md` are likewise
explicitly marked historical/superseded references.
