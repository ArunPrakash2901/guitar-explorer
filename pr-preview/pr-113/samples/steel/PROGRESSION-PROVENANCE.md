# Progression acoustic guitar recordings

The progression sampler uses unmodified Meta Open Sound steel-string guitar OGG recordings from [Meta's instrument release](https://github.com/facebookincubator/Meta-open-sound/tree/251c0be57d5d1b3242b91f53e0cde62ab1cb42d9/systems/instruments/meta-steel-guitar). The instrument uses CC0-1.0. The upstream license has Git blob ID `0e259d42c996742e9e3cba14c677129b2c1b6311` and is included in LICENSE.

The progression manifest identifies 90 attacks at frets 0, 4, 8, 12 and 15 across all six strings and the three recorded velocity layers. Each entry records its physical position, encoded byte count and upstream Git blob ID. The sampler also uses the existing medium-layer attacks shared with Practice where they are closer to the target fret. Runtime selection stays on the sounded string and shifts pitch by at most two semitones over the supported 0–15 fret range.

The pinned release has one take per string, fret and velocity. Upstrokes and downstrokes use that recording bank with different onset order, timing and emphasis. The tone selector adjusts EQ on those recordings.
