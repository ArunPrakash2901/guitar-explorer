# Learning Model

This document records learning principles and lessons from earlier experiments.
See [architecture](ARCHITECTURE.md) and [project state](../PROJECT_STATE.md) for
the implemented baseline and current scope.

## Product purpose and learner problem

Guitar Explorer is a **fretboard-first musical reasoning environment** that helps
the guitarist see musical relationships they currently cannot see, hear those
relationships, physically locate them, manipulate them, and reuse them in real
music. It is not primarily a course app.

The learner may memorise scale shapes, pentatonic boxes, CAGED shapes, riffs, licks
and embellishments physically without reliably understanding how to reconstruct
or reuse them in another key, fretboard area, progression or song. The subjective
symptom is feeling “blind” when looking at the fretboard.

Diagram inspection can open that view. Deliberate retrieval and transfer can test
whether the relationship remains available when cues disappear. Both belong in
the product; neither requires every interaction to become a lesson or assessment.

## Three learning intentions from the earlier workspace design

The previous workspace design distinguished three learner questions within a
shared musical context.

| Intention | Learner question | Learning behavior |
|---|---|---|
| **Explore** | What relationships are here? | Reveal, inspect, compare and manipulate notes, chords, roles and regions freely. No curriculum lock or mandatory reveal sequence. |
| **Practice** | Can I retrieve and use this relationship independently? | Apply deliberate constraints, withhold answers, offer support, repeat, remediate and transfer. |
| **Apply** | What can I understand and do with this musical material? | Start from selected material and expose useful chord tones, connections and target-note paths. Broader progression/song input remains future scope. |

These questions can help scope future experiences. Issue #83 will define the
Song Study requirements. [Song Study requirements](https://github.com/ArunPrakash2901/guitar-explorer/issues/83)

## North-star capability

A successful learner should increasingly be able to:

- orient from known fretboard anchors
- name important notes and intervals
- understand chord construction rather than only chord shapes
- see scale degrees and chord tones inside a key
- follow changing harmony without abandoning fretboard orientation
- transfer a relationship or musical idea to another key or position
- improvise with awareness of the chord underneath
- explain what they are playing in useful musical terms

## An iterative musical spiral

Useful experiences connect **hearing → understanding → location → execution →
manipulation → transfer**, returning to earlier steps as the musical question
changes. This is an iterative spiral, not a compulsory sequence or global
prerequisite ladder.

For example, a guitarist may inspect a chord tone, hear and play it on the guitar,
find it in another region, change the chord beneath it, then practice retrieving
its new role. Another guitarist may begin with a progression and work backward
from a sound they want to understand.

The earlier Labs asked the guitarist to supply sound and physical action. They
could check the selected fret data. Direct evidence of what the learner heard,
sang or played would require a separate method. Future visual and audio
presentation should consume the same prepared musical material.

## Principles for explicit Practice

### Assistance should decay within an activity

Practice should make the support level explicit and distinguish assisted from
independent responses. A useful sequence may move from note and interval labels,
to intervals, roots, hidden markers and independent reconstruction. The activity
decides the appropriate sequence; all activities need not share one procedure.
Answers must remain withheld until the activity permits disclosure, including
through hover and accessibility labels.

Explore may reveal all of this information immediately. Removing support is a
Practice mechanism, not a restriction on inspecting musical relationships.

### Recognition and retrieval provide different evidence

Recognising a familiar diagram is easier than retrieving the same information on
a blank fretboard. Practice should distinguish recognition, retrieval,
reconstruction and transfer. No single correct response establishes mastery.

### Use anchors and connect representations

Build navigation around reliable root locations, octaves and interval geometry,
then derive nearby information. Where useful, connect sound, note name,
interval/scale degree and physical location. A displayed shape alone does not
establish improvisational understanding.

### Transfer tests the relationship

A Practice activity intended to establish reusable understanding must include a
transfer opportunity: preserve the intended relationship while changing a key,
root, position or harmonic setting. The activity must state what stays constant
and what varies. Transfer is not a condition for opening Explore or Apply.

### Context changes meaning

Keep the selected key/scale distinct from the changing current chord. The same
pitch may play different chord roles across a progression. Structural facts such
as chord membership and Roman identity must remain distinct from contextual
interpretations such as stability, pressure or expected resolution.

### Mistakes contain musical information

A wrong fret still represents a real musical relationship. Identify it when
useful: “You selected D. Relative to A, that is the perfect 4th.” Distinguish a
musically valid selection from compliance with a specific exercise constraint.
For example, a valid chord can miss a minimum-movement task without being a wrong
chord or poor music.

### Difficulty means independence

Difficulty may increase by removing cues, changing keys or positions, requiring
transfer and introducing moving harmony. Shorter timers are not a substitute for
independence. Practice Policy may adjust these constraints within an explicit
activity; XP, levels, unlock trees and global prerequisite gates are outside this
direction.

## Evidence and its limits

Keep evidence categories distinct when designing or reviewing a learner task.

| Observation | What it supports |
|---|---|
| Objective screen correctness | A selected string/fret or note sequence meets the activity's engine-derived check. |
| Assistance and answer exposure | The conditions under which the selection was made, including hints or revealed labels. |
| Self-report and reflection | What the guitarist says they played, heard, intended or felt. These are not objective performance checks. |
| Future performed/audio evidence | A separately defined observation of actual sound or performance with its own validation. |

Elapsed time can include reading, thinking, guitar action and UI interaction.
It is not a pure measure of retrieval latency. Candidate-generation scores rank
proposed material; they are not learner scores. Neither these scores nor screen
correctness justify mastery inference, automatic advancement or adaptation.

## Research interpretation cautions

The [Musicianship System Design Plan](https://docs.google.com/document/d/1g-JKOfo8XT712UJ-Cahpvx3p2yAaYXa5KiUURfodj_8/edit?usp=drivesdk)
informs the iterative spiral, physical action and constrained creativity. Read it
with these qualifications.

- Singing is a useful Practice mechanism, not an application-wide prerequisite.
- Exact latency thresholds such as 800 ms must not become product rules without
  stronger evidence and an appropriate measurement method.
- Tonal stability is contextual interpretation knowledge, not basic pitch or
  interval truth.
- Minimum movement is an exercise constraint, not a universal measure of musical
  quality.
- Prose research examples never override engine-verified musical facts.
- Develop the Idea historically provided a bounded motif activity. Its implementation
  is recoverable from Git history.

These cautions interpret the report for this product; they do not rewrite the
research report or establish its proposals as implemented capabilities.

## Historical experiments

The retired experiments covered chord retrieval and transfer, harmonic
resolution, same-string movement, melodic targeting and motif variation.
Their observations can inform future work within its approved scope. See
[historical material](history/README.md) for references.
