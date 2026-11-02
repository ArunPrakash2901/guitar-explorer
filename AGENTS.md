# AGENTS.md

## Current scope — Harmonic Gravity UI follow-up, Issue #49

On 2026-11-02 Arun explicitly requested a fresh UI/Product Design/Figma review and
implementation without another design-approval stop. Issue #49 bounds this branch:
refine the accepted Instrument Desk/temporary playing Focus presentation, keyboard
continuity and transfer context. Preserve musical tasks, reveal order, shared
renderer, evidence semantics and all legacy routes. No new engine, router, audio,
AI, CAGED, persistence or framework scope follows from this UI request. Complete
`npm run verify` and publish an exact-head Pages PR preview. Do not claim physical
evidence from browser automation. Existing preview-first merge rules still apply.

### Standing post-Role-Lens direction and boundaries

Read [`PROJECT_STATE.md`](PROJECT_STATE.md) first for the current operational focus,
active work, waiting-on-Arun state and decision gate. For machine-readable recovery,
read [`project-state.json`](project-state.json) or run `npm run context`; the snapshot
is validated by the authoritative repository gate. Read
[`docs/AUTONOMY_CONTRACT.md`](docs/AUTONOMY_CONTRACT.md) for what an agent may do
without asking and where explicit approval is required. Then read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) as the current product/architecture
source of truth alongside `docs/LEARNING_MODEL.md`, `docs/DECISIONS.md` and the
current part of `docs/TEST_MATRIX.md` before proposing changes.

The completed developer-leverage and bounded learner slices are standing
infrastructure:

- Issue #18 / PR #19: PR previews, local-only Session Evidence export and the agent
  autonomy contract
- Issue #21 / PR #22: authoritative `npm run verify`, stable ScenarioV1 identity,
  evidence schema v2 and Physical Validation Protocol v1
- Issue #29 / PR #30: one DOM-free Melody preparation seam for existing
  catalogue/generated material, superseding stale PR #13
- Issue #32 / PR #33: machine-readable project context, explicit stable/preview/
  experimental build-channel provenance, Session Evidence schema v3 and local
  longitudinal evidence timeline tooling
- Issue #43 / PR #44: accepted Harmonic Gravity Product Spine v1 with Instrument
  Desk, temporary PLAY Focus Mode, staged disclosure, tiny phrase use and A-major
  transfer while preserving legacy Lab routes
- Issue #45 / PR #46: accepted Role Lens v0, proving one supplied material can support
  distinct role-notice, create/vary and transfer actions without a universal recipe
  or Context framework

Those capabilities may be maintained for correctness and reliability, but they do
not authorize a Learning Engine, analytics backend, persistence, scoring, a general
Experience Router or speculative new musical capability. Scenario identity remains
Lab/validation metadata, not a universal workspace schema. The Melody preparation
seam remains Melody-specific; do not generalize it without a new explicit issue.

Issue #15 is closed: Arun physically validated and accepted all four legacy Lab
experiences, including PR #37's transfer regression. Product Spine v1 is complete and
accepted. Role Lens v0 is also complete: Arun reviewed exact head
`125f9458802b1f1fd02293c9a8c12240f3cbcd96` with his guitar/browser and explicitly
approved it; PR #46 merged as `415605407252b4046fe36bc42b9af29043163517`.

The accepted Role Lens result is architectural evidence with a narrow meaning:
**Musical Material → learner action** is a useful separation, and one material can
support genuinely different musical work. It is not permission to introduce a
universal Exercise Recipe JSON/DSL, permanent generic Context/Constraint layer,
general Learning Engine/router or broad new theory layer.

The default after Role Lens v0 was research-only work. Issue #49 supersedes that
default for the explicitly commissioned UI follow-up; it does not authorize other
runtime work merely to keep a queue active.

The **research-only 5–10 fragment Style Study** remains a separate task. Use one or
two coherent artists/traditions and record, for each source-backed fragment:
provenance, pitch structure, rhythm where supported, harmonic situation/roles,
articulation/technique, guitar placement where known, transferable principle, what
Guitar Explorer already represents, what it cannot represent, and confidence /
interpretation notes.

The Style Study is a representation pressure test, not a Style Pack implementation.
Look for repeated real requirements before proposing engine work. Repeated demand may
justify one later bounded addition such as timed harmony, meter/groove, articulation,
polyphony or phrase-level guitar placement. A single awkward fragment does not justify
a framework. Heterogeneous gaps are evidence to keep material flexible rather than
inventing a universal Style schema.

Style Knowledge may propose/select material but never redefine deterministic music
truth. Preserve provenance and distinguish source facts from human/AI interpretation.
Do not build weighted artist generators, automatic style scoring or a copied-lick
catalogue from this research.

Audio Out v0 remains waiting. Role Lens confirms the value of listening-led work but
does not itself require an audio subsystem. After the Style Study, compare Audio Out
against any repeated representation gap exposed by real material. If Audio Out is
chosen, start with the smallest renderer needed by one proven learner action and use
native Web Audio as the baseline; larger libraries/sample assets remain experiments.
Audio In remains later and experimental, stopping first at permission/input level,
onset and stable monophonic pitch while preserving uncertainty in an observation
object. Never turn probabilistic detection into certain performed correctness.

Keep Phrase/Harmony PR 2, meter/groove, articulation, polyphony, broad AI/agent work,
Style runtime and optional GX-10/rig control gated behind a concrete learner/material
need. Follow **learner action → missing deterministic fact → smallest engine addition**.
If existing facts suffice, do not expand Core.

Trello is project navigation; GitHub master proves merged capability, issues/PRs bind
implementation slices, Figma records applicable design approval, and research is
input. Update existing Trello cards; create no parallel planning system. Any future
learner-facing implementation still requires authoritative `npm run verify`, an
exact-head Pages preview where applicable, Arun browser/physical-guitar review and
explicit approval before merge. Do not publish stable/experimental channels or
private evidence without separate approval.

No new capability receives a learner-facing destination by default. Practice Policy
applies only to an explicit Practice experience; Explore and Apply have no global
curriculum gates. ScenarioV1 remains bounded Melody/Motif material, not a universal
workspace schema. Preserve deterministic engine truth, current generator provenance,
answer withholding and the distinction between musical validity, exercise
compliance, audio perception, AI proposals and subjective musical judgment.

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

The Session Evidence recorder, stable ScenarioV1 identity, evidence schema v3 and
local evidence-timeline tooling are bounded validation tools. They may keep ephemeral
in-page interaction evidence and export a user-triggered JSON file with exact
revision/scenario/protocol/deployment metadata. Timeline generation may read those
exports locally, reconcile repeated snapshots sharing one `trialId`, and group them
descriptively by revision/channel/scenario. These tools must not send evidence over
the network, persist learner history in a backend, score performance, infer mastery
or change exercise correctness. `.evidence-local/` is gitignored and is the default
timeline storage location.

Use [`docs/PHYSICAL_VALIDATION_PROTOCOL.md`](docs/PHYSICAL_VALIDATION_PROTOCOL.md)
for real-guitar trials. Automated correctness cannot substitute for the protocol's
unaided attempt, assistance-if-needed, physical-use, transfer and reflection stages.
A physical-validation result may support keep/change/remove/promotion-candidate/
inconclusive, but promotion still requires the separate architecture/capability gate.

PR-preview infrastructure is likewise bounded development tooling. Arun has approved
and enabled the existing GitHub Pages publication path for PR previews. Do not
introduce another external host, publish private evidence or turn previews into
production deployment without further explicit approval. Stable, preview and
experimental identities and publication boundaries are defined in
`docs/DEPLOYMENT_CHANNELS.md`; `preview` is the only automatically published channel.

Permanent boundaries: Ear is instrument-independent (Core + pure Audio contracts).
Learning composes Ear + Guitar for auditory-to-fretboard tasks. Musical queries
expose musical truth only; future evidence/history queries belong to a separate
Learning Query Interface. Musical time, audio seconds and learning wall-clock time
remain separate. See the current architecture for documentation-only extensions.

Scale formulas are structured degree/alteration values. Selected-scale analysis
must preserve written-degree evidence separately from sounding membership; omitted
and repeated formula degrees are explicit data, not errors or implicit choices.
Key analysis remains the existing seven-degree major/natural-minor contract.

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
perception or infer mastery. No generic Practice Engine, curriculum framework,
progression generator or Phase 2E capability is authorized.

The separately authorized Parsimonious Path remains a bounded Lab experiment at
`/voice-leading.html`. Its deterministic candidate enumeration and same-string fret
distance scoring stay local to `lab/`; they are not a generic Core voicing or
voice-leading engine. Preserve the separate harmony-versus-efficiency result,
progressive assistance, physical voice deconstruction, unfamiliar A-major transfer
and ephemeral evidence. Promotion into an engine module requires later evidence and
authorization.

Use `npm run verify` as the authoritative full-repository verification gate. Narrower
scripts may be used for focused diagnosis, but they do not replace the full gate.
See `docs/VERIFY.md`. Stop engine breadth after Phase 2D unless separately authorized.
The exact original handoff is in `references/approved-v0.2-handoff.zip`.

## Historical instructions

The former v0.2 agent instructions are preserved in
[`docs/history/AGENTS_V0_2.md`](docs/history/AGENTS_V0_2.md). They are non-operative
historical context and intentionally no longer share this active instruction file.
`CODEX_KICKOFF.md`, `docs/PRODUCT_SPEC.md` and `docs/V0_2_PLAN.md` are likewise
explicitly marked historical/superseded references.
