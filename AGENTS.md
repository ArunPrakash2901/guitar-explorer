# AGENTS.md

## Current scope — Role Lens v0 material/action proof

Read [`PROJECT_STATE.md`](PROJECT_STATE.md) first for the current operational focus,
active work, waiting-on-Arun state and decision gate. For machine-readable recovery,
read [`project-state.json`](project-state.json) or run `npm run context`; the snapshot
is validated by the authoritative repository gate. Read
[`docs/AUTONOMY_CONTRACT.md`](docs/AUTONOMY_CONTRACT.md) for what an agent may do
without asking and where explicit approval is required. Then read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) as the current product/architecture
source of truth alongside `docs/LEARNING_MODEL.md`, `docs/DECISIONS.md` and the
current part of `docs/TEST_MATRIX.md` before proposing changes.

The completed developer-leverage and bounded Product Spine slices are standing
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

Those capabilities may be maintained for correctness and reliability, but they do
not authorize a Learning Engine, analytics backend, persistence, scoring, a general
Experience Router or new musical capability. Scenario identity remains Lab/validation
metadata, not a universal workspace schema. The Melody preparation seam remains
Melody-specific; do not generalize it into a complete Experience Router, Practice
Policy, generic Learning Engine, runtime reorganization or UI redesign without a new
explicit issue/scope.

Issue #15 is closed: Arun physically validated and accepted all four legacy Lab
experiences, including PR #37's transfer regression. Preserve the recorded evidence
and do not repeat those trials. Product Spine v1 is also complete: Arun approved the
Figma direction, reviewed exact head `c46d9617a07ddd8e59402332b4311f2746e65f77`
with his guitar/browser, and explicitly approved merge. PR #44 merged as
`239d933e6b70f761a07539f4f34e672d22852922`; Issue #43 closed completed. Its
accepted learner result is that the flow changed how Arun listened, predicted,
noticed and made a musical decision rather than merely following instructions.

**Issue #45 is now the single active learner-facing implementation scope.** Role Lens
v0 must prove that one supplied musical material can support at least two genuinely
different useful learner actions. Use C4 over supplied Am7 → D7 → Gmaj7, with D4
over Bm7 → E7 → Amaj7 as the transfer context, unless a bounded implementation
adjustment preserves the same product question.

Reuse existing Music/Guitar/Phrase/Query/Product Spine capability first. Follow
**learner action → missing deterministic fact → smallest engine addition**. If current
facts suffice, do not expand Core. Prefer ordinary local objects/functions and
activity-local contracts. Do not introduce a universal Exercise Recipe JSON/DSL,
permanent generic Context/Constraint layer, general Learning Engine/router, mastery
system, Audio, Style runtime or AI runtime inside #45. Phrase/Harmony PR 2 remains
uncommissioned unless this exact learner action proves a missing timed-harmony fact
and receives separate scope.

The Role Lens UI may reuse Instrument Desk/Product Spine principles where useful but
must not mechanically copy Harmonic Gravity's PLAY → NOTICE → UNDERSTAND → TRANSFER
stage shape. The proof is about distinct learner actions over the same material, not
a new universal stage machine. Preserve relevant context, withhold answers where
that improves the task, keep subjective listening unscored and preserve accepted
legacy routes.

A 5–10 fragment Style Study is the parallel research track only. It may identify
repeated representation needs such as timed harmony, meter/groove, articulation,
polyphony or phrase placement, but it cannot broaden #45 or create a Style Pack
runtime/schema. Style Knowledge should propose/select material; it does not redefine
deterministic music truth.

Audio Out v0 waits on learner evidence from #45. If later justified, begin with the
smallest renderer needed by one proven learner action and treat Web Audio as the
technical baseline; larger libraries/sample assets remain experiments. Audio In is
later and experimental, stopping first at permission/input level, onset and stable
monophonic pitch while preserving uncertainty in an observation object. Never turn
probabilistic detection into certain performed correctness, polyphonic grading or AI
judgment of style.

Keep broad AI/agent work and optional GX-10/rig control in Research & Later, beneath
a concrete learning need. Trello is project navigation; GitHub master proves merged
capability, issues/PRs bind slices, Figma records applicable design approval, and
research is input. Update existing Trello cards; create no parallel planning system.

Arun has enabled the existing GitHub Pages PR-preview path. Issue #45 must reach the
authoritative `npm run verify`, an exact-head Pages preview, Arun browser/physical-
guitar review and explicit approval before merge. If the supposed multiple learner
actions feel like one exercise with cosmetic variants, stop instead of formalizing a
recipe abstraction. Do not publish stable/experimental channels or private evidence
without separate approval.

No new capability receives a learner-facing destination by default. Practice Policy
applies only to an explicit Practice experience; Explore and Apply have no global
curriculum gates. ScenarioV1 remains bounded Melody/Motif material, not a universal
workspace schema. Preserve deterministic engine truth, current generator provenance,
answer withholding and the distinction between musical validity, exercise
compliance, audio perception and subjective musical judgment.

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