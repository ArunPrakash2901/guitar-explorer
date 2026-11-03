# Product Surface Consolidation v0

Issue #68 turns the accepted warm Instrument Desk direction into a coherent product surface beyond the home screen.

## Product intentions

- **Explore** — inspect musical context and fretboard relationships.
- **Practice** — hear, predict, find, play and transfer a relationship. Harmonic Gravity and Role Lens are the first consolidated Practice surfaces.
- **Apply** — make music with accepted capabilities. Accompaniment v1 is the first consolidated Apply surface.

The intent model is product navigation, not a course sequence.

## This slice

- preserves the accepted Harmonic Gravity and Role Lens state machines;
- replaces their dark/blue experiment styling with the approved warm semantic system and shared Light/Dark preference;
- enables Apply from the Instrument Desk and Practice surfaces;
- keeps Accompaniment v1 harmony/rhythm behavior unchanged while presenting it as a musical Apply workspace;
- shows the intended Accompaniment → Record → Loop → Improvise product handoff;
- marks Record/Loop as planned, not implemented.

## Looper boundary

Closed PR #54 remains UX evidence only. Product Surface Consolidation v0 does **not** ship MediaRecorder/JS-timer looping.

The implementation gate remains:

`AudioContext clock → count-in → AudioWorklet fixed-frame PCM capture → AudioBuffer loop`

No DAW, multitrack transport, automatic correction, audio grading, upload or transcription is authorized here.

## Deferred surfaces

Melody Over Harmony and Parsimonious Path remain reachable legacy learner surfaces in this bounded v0. New learner families such as Target Navigation should enter only after the product shell is coherent enough to receive them.

Style Pack / `My music…` product work is parked.
