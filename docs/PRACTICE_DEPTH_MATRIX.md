# Practice Depth Matrix

Inspected before implementation for #77 / bounded child #78, against master a1a76f4a2daadf0df80c47231877ef414c60d22d. #75 is closed not-planned for now. The two Foundation flows remain the accepted baseline, not sufficient depth or a mastery claim.

## What exists

The root runtime supplies one board instance, one sampled player, Home/Continue, disclosure and completion. Interval Foundation selects ascending major/minor thirds in frets 0–3, supplies the target string and checks one position. Role Foundation compares one anchor across G/C/D7 before reveal, retrieves one position and supplies changing harmony. Both already include physical use and transfer.

Existing musicQueries supplies registered/directed intervals, chord catalogue/construction, chord-tone degrees, note/context analysis, exact registered location matching and bounded fret/string searches. Fret movement and answer-count constraints are local task policy over those facts. No new engine arithmetic or query API is needed for the selected slice.

## Matrix

| Family | Task / learner action | Independent difficulty axes | Existing engine facts | Audio need | Transfer rule / decision |
|---|---|---|---|---|---|
| Interval | Locate one (Foundation) | Major/minor; root/register; exact-string hint | getInterval, getChord, getFretboardLocations | Original attacks | New register, then new root. Retain unchanged. |
| Interval | Find another route | One fretted target versus two distinct string locations; string-group instead of exact string; frets 0–5 | Registered interval plus exact-pitch locations | Four alternate-string attacks for the same already-recorded pitches | Rebuild the relationship using another route. Selected. |
| Interval | Translate chord role | Interval name withheld; 5th/7th vocabulary; major/dominant versus minor context | getChord tone.degree, contextual getFretboardLocations, getInterval | Existing notes; sampled supplied chord after retrieval | Carry familiar interval reasoning into D7 or Am7. Selected. |
| Interval | Reconstruct the root | Reverse reasoning; new root; one answer among several valid positions | getInterval(candidate, supplied third), getFretboardLocations | Recorded pair, correct physical string attack | New root; keep the third relationship but reverse the search. Selected. |
| Interval | Nearest / minimum movement paths | Distance metric, ties, two-step route constraints | Existing locations/intervals; distance is task policy | Would need additional verified positions for chosen paths | Supported in principle; defer rather than invent a general fingering engine. |
| Interval | Broad fret bands / sixths / arbitrary descending sets | New region, direction and vocabulary | Existing directed interval and location queries | Coverage must be expanded for exact chosen positions | Engine supports it; defer broad audio/material acquisition. |
| Role | Same pitch, changing chords (Foundation) | Anchor, order; three contexts | getChord, analyseNotes, getFretboardLocations | Accepted G/C/D7 mapping | New anchor and role pattern. Retain unchanged. |
| Role | Predict, then hear | Prediction before audition; 2/3 contexts; anchor/physical route | Chord membership and interval facts, never a stability answer | Existing sampled contexts | Compare prediction with own hearing; facts explain context, not whether the feeling was correct. Selected. |
| Role | One chord, changing pitches | A/B comparison; note names shown/withheld; physical retrieval of two pitches | analyseNotes, registered pitches/locations | Accepted notes over one supplied chord | Keep the pair and change harmony; reconstruct how the comparison changes. Selected. |
| Role | Desired role → pitch hunt | Reverse task direction; role vocabulary; register | Chord tone.degree plus locations | Bounded supplied chord and candidate pitches | Engine already supports it. Later child if repeated-session review needs another action. |
| Role | Common tone / tension-to-resolution | Held note changes membership/degree; nearby note movement | Engine proves interval/membership and note identity only | Existing palette can illustrate bounded examples | No automatic stable/tense or functional hierarchy truth. Keep human interpretation separate; broader recipe deferred. |

## Smallest chosen slice

One Home choice, Foundation / Stretch, inside the same runtime. No difficulty page, raw parameter editor, global level, history or adaptive policy.

Interval Stretch orders three connected problems: find another physical route (or avoid open target strings), translate a supplied chord role, then reconstruct a different root from its third. Major/minor focus determines the starting third; chord-role vocabulary broadens to fifths/sevenths. Actual plans vary answer count/physical constraint, string information, information direction, vocabulary and transfer. They do not merely roll another seed.

Role Stretch orders prediction before audition, A/B pitch comparison over one chord, then a comparison transfer to changed harmony. Context count, visible pitch information, comparison direction and physical retrieval vary independently. All predictions, settled/tense/unsure and A/B listening preferences are ungraded. A successful audition request is not proof of hearing; a checkbox is not proof of guitar performance.

For the changed-chord comparison transfer, retain the learner's already-retrieved physical positions while they remain valid. Do not make the learner find the same two pitches again. Keep help provenance, but reset listening/playback/physical-use acknowledgements: the new harmonic context still needs a fresh attempt.

The material generator never imports the sample manifest. Bounded root, pitch and chord requests are pedagogy; engine queries derive every fact and valid answer. The performance adapter checks the prepared material against the existing curated chord placements and recorded coverage, failing explicitly rather than selecting a different answer.

Four additional CC0 attacks are needed only to hear the physical alternatives: B3 on G-string fret 4, G3 on D-string fret 5, E4 on B-string fret 5 and C4 on G-string fret 5. They all lie outside Foundation's 0–3 region, so its material/replay pool is unchanged. No pitch shift, generic sampler, new renderer or synth default.

## Concrete review examples

| Focus | Foundation | First Stretch | Another Stretch |
|---|---|---|---|
| Major intervals | G2 → B2; exact target string; register and root transfer | G3's third in two places → a role from D7 → reconstruct C4 from E4 | A fretted target from C4 → another D7 role → reconstruct G3 from B3 |
| Minor intervals | E/G or A/C third; exact target string | E3's third on two strings → a role from Am7 → reconstruct A3 from C4 | A fretted target from A3 → another Am7 role → reconstruct E3 from G3 |
| Ear/context | One anchor over G/C/D7 → find/play → new anchor | Predict a fixed pitch over 2/3 chords → compare B3/C4 over G → compare that pair over C | New anchor/context count → note labels withheld for comparison → changed-chord transfer |

Exact generated examples and replay coverage are verified in the focused depth tests; these are bounded musical sets, not new-key breadth.

## Deliberately excluded / acceptance boundary

No engine addition, universal recipe DSL, nearest-path engine, broad random generator, full mixed-family composer, Target Landing, mastery/adaptation, looper, songs/Style/tone, AI grading or backend. Other task shapes in the matrix are an inventory, not implementation authorization.

#78 is one reviewable depth slice. #77 remains the product-depth acceptance target and must not close merely because parameters or tests exist. The selected Role extension adds two new directions alongside its retained Foundation action; a desired-role hunt remains available as a separately scoped follow-up if the three-action/repeated-session gate is not yet met. Arun must play multiple sessions of each family and judge whether practice is substantially less primitive before acceptance or a return to Target Landing.

## Review gates

Focused facts/answer/disclosure/audio/state checks, unchanged Foundation replay/client paths, asset hash/provenance checks, full npm run verify, exact-head PR preview, desktop/narrow/light/dark review, then Arun's repeated-session acoustic-guitar review. No learner-facing merge without explicit approval of that head.
