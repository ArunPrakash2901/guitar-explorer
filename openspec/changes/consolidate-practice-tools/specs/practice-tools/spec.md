## ADDED Requirements

### Requirement: Deterministic progression generation
The generator SHALL return identical progression material for identical valid requests and seeds.

#### Scenario: Seed replay
- **WHEN** the same request with seed 123456789 is generated twice
- **THEN** the returned progression values are identical

Evidence candidate: tests/domain/progression.test.ts at #116 head.

### Requirement: Triad geometry
The triad trainer SHALL use one note per selected adjacent string and include all three distinct chord tones with the bass corresponding to the reported inversion.

#### Scenario: C major on an adjacent string set
- **WHEN** a C major shape is selected
- **THEN** the sounding pitch classes are exactly C, E and G and the selected string coordinates agree with the guitar geometry

Evidence candidate: tests/domain/triad-trainer.test.ts; physical fingering requires separate review.

### Requirement: Root-to-root arpeggio
The arpeggio trainer SHALL offer an octave sequence only when the selected CAGED position contains a complete valid root-to-root path.

#### Scenario: Unavailable octave
- **WHEN** no full octave path fits in the selected position
- **THEN** the octave material is marked unavailable and returns an empty path

Evidence candidate: tests/domain/arpeggio-trainer.test.ts; TAB/audio sync requires browser and physical review.
