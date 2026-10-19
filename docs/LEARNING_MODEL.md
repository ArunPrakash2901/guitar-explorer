# Learning Model

## Learner problem

The learner can sometimes memorise scale shapes, pentatonic boxes, CAGED shapes, riffs, licks and embellishments physically but does not reliably understand them well enough to reconstruct or reuse them in another key, fretboard area, progression or song.

The subjective symptom is feeling “blind” when looking at the fretboard.

The product therefore must not optimise for diagram exposure. It must optimise for independent reconstruction and transfer.

## North-star capability

A successful learner should increasingly be able to:

- orient from known fretboard anchors
- name important notes and intervals
- understand chord construction rather than only chord shapes
- see scale degrees and chord tones inside a key
- follow changing harmony without abandoning fretboard orientation
- transfer an interval, voicing concept or lick to another key/position
- improvise with awareness of the chord underneath
- explain what they are playing in useful musical terms

## Learning loop

The core loop is:

**See → Understand → Recall → Reconstruct → Transfer → Use in context**

The software should move the learner through this loop rather than leaving them in “See”.

## Design principles

### 1. Assistance must decay

Information shown early should disappear later.

Example progression:

- note + interval visible
- interval only
- roots only
- no markers
- learner builds the structure

### 2. Recognition is not mastery

Recognising a familiar diagram is easier than retrieving the same information on a blank fretboard. Mastery evidence should come primarily from retrieval/reconstruction tasks.

### 3. Use anchors, not 90 isolated facts

The learner should build navigation around reliable root locations, octaves and interval geometry, then derive nearby information.

### 4. Connect four representations

Where useful, exercises should connect:

- sound
- note name
- interval / scale degree
- physical fretboard location

Audio is later scope, but the data model must not make it difficult to add.

### 5. Transfer is mandatory

If the learner succeeds with A major, the system should eventually ask for the same relationship in C, Eb, F# or another position. Transfer tests whether the concept survived removal of the original shape.

### 6. Context changes meaning

A scale is the harmonic landscape. Current chord tones are changing destinations inside it. Harmony mode must make this visible and eventually test it without revealing the targets.

### 7. Mistakes contain information

A wrong fret is still a real musical relationship. Feedback should identify that relationship where useful.

Example:

> You selected D. Relative to A, that is the perfect 4th.

This is more educational than a red “incorrect” state.

### 8. Difficulty means independence

Difficulty increases by removing cues, changing keys/positions, requiring transfer and introducing moving harmony. Time pressure is secondary.

## What the product must avoid

- passive walls of coloured scale dots
- teaching CAGED as five disconnected boxes
- encouraging the belief that “knowing the scale shape” equals improvisation
- excessive feature breadth before transfer/reconstruction is working
- dashboards that measure activity rather than knowledge
- adaptive algorithms before enough trustworthy learning data exists

## Future learning layers

Not part of v0.2, but anticipated by the model:

- ear → interval → fretboard tasks
- lick deconstruction into scale degrees/intervals
- recomposition and transposition of learned ideas
- voice-leading / nearest-target exercises
- spaced retrieval based on demonstrated weaknesses
- personalised mastery map
- constrained improvisation over timed progressions
