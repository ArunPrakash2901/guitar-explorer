# Physical Validation Protocol

Protocol ID: `guitar-explorer/physical-validation`

Protocol version: **1**

This protocol is the default method for deciding whether a learner-facing Guitar
Explorer experiment is useful on a real guitar. It complements automated correctness
checks; it does not replace them and it does not create a mastery model. Run
`npm run verify` for the software gate; use this protocol for the physical-learning
gate when a real-guitar review is required.

## Purpose

Use one short, focused trial to answer a practical question: did the experience make a
musical relationship easier to perceive, locate, use or transfer without simply giving
the answer away?

The protocol is intentionally descriptive. Hesitation, timing, attempts and hint use
are evidence about friction, not automatic evidence of ability or mastery.

## Before the trial

1. Use the exact revision under review, preferably its PR preview.
2. Choose one experience and note the material and exact revision in your trial notes.
3. Have the physical guitar ready. The browser supplies the musical context and the
   guitar supplies the physical action and sound.
4. Attempt the task before opening answers, theory reveals or hints.

## Trial sequence

### Phase A — unaided attempt

Attempt the task from the prompt using the guitar before requesting assistance.
Record what became available immediately and where you had to calculate, search or
pause.

Do not treat speed alone as success. A slower answer can still reflect good musical
reasoning; the important distinction is whether the relationship is becoming usable
without answer lookup.

### Phase B — assistance only if needed

If the unaided attempt stalls, use the smallest available hint/reveal and retry.
Observe whether assistance narrows the search or explains the relationship, versus
simply exposing the required fret/note/answer.

A reveal that makes the next click easy but teaches nothing transferable is not a
successful assistance design.

### Phase C — physical use

Play the relationship in context, not only as an isolated correct location. Notice
whether fingering, string crossing, register or hand position creates friction that is
different from conceptual confusion.

Physical awkwardness and conceptual uncertainty must remain separate observations.

### Phase D — transfer

Use the experience's transfer step when present. Move the same relationship to the
new key, fretboard area or musical context without first copying the previous answer.

For experiments without a built-in transfer step, make only the smallest equivalent
change already permitted by that experience. Do not invent a broader curriculum test.

### Phase E — reflection and disposition

Record:

- what became easier without looking at answers
- where calculation or hesitation remained
- what was physically awkward rather than conceptually unclear
- whether assistance improved understanding or mainly revealed the answer
- what happened during transfer
- the smallest useful next action

Choose one provisional disposition:

- **Keep as-is**
- **Change or simplify**
- **Remove**
- **Promotion candidate** — still requires the separate architecture/capability gate
- **Inconclusive**

## Historical evidence format

Earlier trials used the Session Evidence recorder. It was retired with the exercise
runtime. Version-3 exports from that runtime recorded:

- evidence schema/version and stable `trialId`
- physical-validation protocol ID/version
- experience/page
- exact preview PR and code revision when available
- deployment channel/label provenance
- active ScenarioV1 ID/source when applicable
- low-risk UI interaction events with elapsed time
- learner-authored reflection fields

Keep learner evidence local until the learner chooses to share it.

## What may be concluded

A focused trial may support statements such as:

- “I found the dominant third without opening the answer on the second pass.”
- “I still calculated the interval name before locating it.”
- “The hint reduced the search area without naming the fret.”
- “The concept transferred to A major, but the new position was physically awkward.”

It may **not** by itself support claims such as:

- mastered / not mastered
- beginner / advanced ability classification
- long-term retention
- generalized ear-training ability
- readiness for a new theory capability

Those require separate evidence or an explicitly authorized future model.

## Completed historical cohort — Issue #15

Issue #15 is closed. Arun's [recorded confirmation](https://github.com/ArunPrakash2901/guitar-explorer/issues/15#issuecomment-6494414657)
accepts all four experiences, including PR #37's transfer regression. Do not repeat
those old trials. The original completion rule below remains the method for the
cohort's historical evidence; new learner-facing behaviour needs its own trial.

### Original completion rule

The original cohort required at least one focused trial per experience with enough
evidence to propose a provisional disposition.

Completing this protocol does not itself authorize Phase 2E, CAGED, audio, a Learning
Engine or any other deferred capability. Issue #16 remains the capability decision
gate.
