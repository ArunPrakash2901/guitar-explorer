# Architecture and Product Decisions

## D001 — Build a web/PWA, not a native mobile app

Reason: one codebase works on phone, desktop and tablet; the learning interactions are well suited to browser SVG/touch; offline installation can be added without native-store overhead.

## D002 — React + TypeScript + Vite for production

Reason: enough structure for a long-lived interactive learning product while remaining lightweight. TypeScript is especially valuable for separating pitch, spelling, interval, exercise and UI concepts.

## D003 — SVG fretboard

Reason: precise scalable geometry, touch/click hit regions and layered marker rendering are easier to reason about than a canvas for this product.

## D004 — No backend in v0.2

Reason: the main risk is pedagogical usefulness, not cloud architecture. Local IndexedDB is enough to validate the learning loop.

## D005 — Raw learning evidence before mastery scores

Reason: premature scoring can create false confidence. Store attempts first; infer mastery only after enough real usage data exists.

## D006 — Private GitHub repository during active build

Reason: clean Codex workflow and freedom to refactor. Publication can happen when the product has a stable identity and correct musical behaviour.

## D007 — Keep the current dark visual language

Reason: it already provides a focused, instrument-like interface. v0.2 should improve usability, not spend engineering time on a gratuitous redesign.

## D008 — Behavioural prototype is disposable

Reason: `prototype/` proves interaction ideas quickly. Production code should not inherit its all-in-one DOM architecture.

## D009 — Foundation kernel supersedes the legacy UI-first kickoff

The user approved one TypeScript package under src/engine/{core,guitar,query}.
React/Vite remains the eventual UI direction; CAGED and progressions are later work.
Current scope and stop conditions are in ENGINE_PHASE1.md.

## D010 — Ear is instrument-independent

Ear will depend on Core and pure Audio contracts. Learning composes Ear + Guitar
for hear → identify → find. No direct Ear → Guitar dependency is allowed.

## D011 — Separate time and learner-query extension points

Future meter/beats/duration/subdivision/harmonic rhythm belong to a pure musical
time domain distinct from Audio seconds and Learning wall-clock time. Musical
queries remain learner-independent; evidence/history will use a separate Learning
Query Interface. Both extension points are documentation-only in Phase 1.

## D012 — Bounded source-only kernel

Default board is standard tuning through fret 15; callers supply other tunings and
fret limits. Enumeration has a 10000-position budget before pitch filtering. Only
working Phase 1 operations are exported. The original prototype remains standalone
and its exact original archive is preserved under references/.
