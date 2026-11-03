# Guitar sound credits — bounded Practice prompts

Source: Meta Open Sound, Meta Steel Guitar, medium velocity (Vel02), OGG web previews.
License: CC0-1.0, copied unchanged in LICENSE.
Upstream: https://github.com/facebookincubator/Meta-open-sound/tree/main/systems/instruments/meta-steel-guitar

Selectively extracted from closed reference PR #58, head 4fb04e52ee1ee702efa937f255911909d6b5bde2. Neither #58 nor its base #56 was reopened or merged.

Productization 1A (#72) used 11 unmodified attacks, 1,005,111 encoded bytes, for major/minor third prompts. Productization 1B (#73) adds only the missing high-E-string fret-2 F#4 attack (46,520 bytes, Git blob 8a46d4455118b1de120f732726f909517349235b) needed to render the supplied D7 voicing.

Practice Depth child #78 adds four unmodified alternate-string attacks from upstream commit 251c0be57d5d1b3242b91f53e0cde62ab1cb42d9. All four were downloaded from the pinned upstream URL and independently checked for OGG header, exact bytes and Git blob hash before inclusion:

| Physical location | Pitch | Bytes | Upstream Git blob |
|---|---|---:|---|
| G string, fret 4 | B3 | 56,417 | 3e97c044c52809eb4dc5d3d77ed60a3f83691094 |
| D string, fret 5 | G3 | 96,456 | 7f400cbeac23558e83e6915830bf261b686d134a |
| B string, fret 5 | E4 | 57,408 | f7fbb91f03da53bfdfe414d73ceef0c0355d7628 |
| G string, fret 5 | C4 | 74,490 | d77560836da5c3ad4283989dddef4fe581e4c69f |

These let the learner hear the same registered pitch at the physical alternate positions used in Stretch. They do not expand Foundation's frets 0–3 material pool. No original recording or license was altered. The minimal new Am7 performance uses the already-recorded E3/A3/C4/G4 tones, with its complete chord membership validated by the engine; it does not need another attack.

The shared renderer now has exactly 16 unmodified attacks, 1,336,402 encoded bytes. File names, upstream Git blob hashes, physical coordinates and byte counts live in sampled-guitar-manifest.mjs and are checked by test-practice-product.mjs. License blob: 0e259d42c996742e9e3cba14c677129b2c1b6311. No pitch shifting, electric/amp timbre or general sampler claim.

Role musical material is prepared from existing engine queries without reading the sample manifest. A separate performance adapter validates curated G 320003, C x32010 and D7 xx0212 placements against engine chord tones, then checks recorded coverage. Missing coverage fails explicitly; it does not silently select different pedagogy or derive theory from sample names.
