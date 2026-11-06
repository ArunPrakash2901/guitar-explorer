# Musical Worlds

Musical Worlds gives the guitarist seven different jobs inside Instrument Desk. Start by listening or playing along. Open the part editor only when changing a written part helps the musical decision. The accepted Interval Hunt and Role Ear sessions are still available from Home; their session state survives a visit to Worlds.

## Play the seven worlds

| World | Try it with your guitar | Listen for the consequence |
|---|---|---|
| The band's empty space | Start **Play with the band**. Answer a bass accent once with open B or G, then leave a gap. Hear your edited part with the band and alone. | Move one note into the gap between bass attacks. Try the same supporting role in Room to breathe. |
| Inside the groove | Play pitched notes and lightly muted strokes on one string. In the optional editor, move one accent and replay. | Keep the rhythm and hear how one stronger offbeat changes the pocket. Move that right-hand pattern to another backing. |
| The missing musician | Hear the original in bars 1 and 3. Play in the gap, then sketch or perform your own answer. | Alternate the authored lead, the gap, and your reconstruction. Try a different ending before looking at the source frets. |
| Harmony detective | Hear C4 against G, C, D7 and G. Use **Play over the chords** and repeat C at fret 1 on the B string. | Keep the backing and try B on the open string. Compare the two endings on the last G. Reveal the engine's explanation after playing or hearing the comparison. |
| Musical dialogue | Start **Play call and reply live**. Listen in bars 1 and 3; answer in bars 2 and 4. | Change your response's timing on the next pass. Write one reply and hear it between the calls, then try another backing and its different call. |
| A phrase becomes a piece | Hear the piece, then play the A/B parts over the backing. Give B a different ending. | Compare AABA and ABAB. Hear the same A return at a different point in the harmony. |
| The same notes, four voices | Hear the plain phrase and an interpretation. Play the same frets with a different attack, length or placement. | Try the same touch on the phrase in another backing. Judge whether it says something different to you. |

Repeat is on by default. Play-along has a four-beat count-in, and the current bar and beat follow the audio clock. Stop cancels active and pending sound. Switch arrangements to change the backing and the authored references while keeping your own part. The optional editor supports rests, notes, muted strokes, accents, longer notes and one undo per part. An edit is heard when you audition again.

## Boundaries and reuse

- Music Engine supplies pitch, chord construction and contextual relationships. Existing validated G/C/D7 guitar placements are reused for actual sampled chord playback; the backing is separate from those facts. Band and Groove leave the guitar space open over bass and drums.
- The arrangement score, sound rendering and interaction remain separate. The ensemble uses one AudioContext clock, existing verified CC0 steel recordings with the shared decoder, and original synth bass/percussion. No new sample assets or engine API.
- An optional take captures up to 30 seconds after a microphone click. It stays in the tab unless saved to the device. Leaving the workbench stops the mic and audio, including permission requests that complete late. A take is for listening, with no scoring or timing correction.
- Three authored 4/4 arrangements, small registered fretboard regions and one-bar edit patterns bound the material. Four-bar form is intentional. Muted strokes are percussive approximations. There is no song import, broad style catalogue, multitrack editing, automated grading or precise recording looper.
- PR #79 is rejected, separate and unmerged. #81 uses the accepted sample set and has no dependency on #79. Both diffs touch the Instrument Desk, Practice regression, preview wiring and operational state; any future integration would need an explicit scope and conflict review.

## Verify and review

Use Node 22.17 or newer on the PR's exact commit:

1. Run npm ci, then npm run verify. This includes accepted Practice and legacy regressions, musical score differences, sampled voicing preparation, count-in/repeat and stop, load failure/retry, and local-take lifecycle.
2. Run npm run lab and open its loopback URL for an independent local review. Use the GitHub Pages exact-head PR preview when Actions has published it. Do not publish to stable for review.
3. Try the seven actions above with a real guitar. Compare before and after, and ask whether each activity makes you listen or play differently. Prefer headphones when making an optional take.

Browser QA can verify live output from the audio graph, layout and interactions. Your speakers, touch, timing, musical judgement and transfer need real listening and playing. Keep the PR draft until explicit approval of the reviewed head.
