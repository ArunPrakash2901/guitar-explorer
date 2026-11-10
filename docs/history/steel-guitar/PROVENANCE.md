# Guitar sound credits for the retired Practice prompts

Source: Meta Open Sound, Meta Steel Guitar, medium velocity (Vel02), OGG web previews.
License: CC0-1.0. The [original license](LICENSE) is preserved here.
Upstream: https://github.com/facebookincubator/Meta-open-sound/tree/main/systems/instruments/meta-steel-guitar

Selectively extracted from closed reference PR #58, head 4fb04e52ee1ee702efa937f255911909d6b5bde2. Neither #58 nor its base #56 was reopened or merged.

Productization 1A (#72) used 11 unmodified attacks, 1,005,111 encoded bytes, for major/minor third prompts. Productization 1B (#73) adds only the missing high-E-string fret-2 F#4 attack (46,520 bytes, Git blob 8a46d4455118b1de120f732726f909517349235b) needed to render the supplied D7 voicing.

The retired renderer used 12 unmodified attacks totaling 1,051,631 encoded bytes. The [manifest](https://github.com/ArunPrakash2901/guitar-explorer/blob/a1a76f4a2daadf0df80c47231877ef414c60d22d/lab/sampled-guitar-manifest.mjs) records filenames, upstream Git blob hashes, physical coordinates and byte counts. The [original test](https://github.com/ArunPrakash2901/guitar-explorer/blob/a1a76f4a2daadf0df80c47231877ef414c60d22d/scripts/test-practice-product.mjs) checks those records. License blob: 0e259d42c996742e9e3cba14c677129b2c1b6311. No pitch shifting, electric/amp timbre or general sampler claim.

Role musical material is prepared from existing engine queries without reading the sample manifest. A separate performance adapter validates curated G 320003, C x32010 and D7 xx0212 placements against engine chord tones, then checks recorded coverage. Missing coverage fails explicitly; it does not silently select different pedagogy or derive theory from sample names.
