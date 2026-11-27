# Looper Studio foundation

The local diagnostic page records one base take and one independent overdub against a fixed 4/4 grid. Both takes can play together from the same frame. Undo removes the overdub and its checkpoints, leaving the base audio intact.

## Run the diagnostic

With Node 22.17 or newer, run `npm ci` and `npm run lab`. Open [Looper Studio](http://127.0.0.1:4173/looper-studio/) in Chromium on Windows 11. Use the Lab port printed by the server if it differs. The page is served by the local Lab and excluded from the static publication builds.

1. Select an audio input and click **Connect audio**. Confirm the permission, device-reported format, AudioContext rate and input meter. Use headphones to keep playback out of a microphone recording.
2. Choose four bars and a tempo, then click **Record base**. Four clicks count in the take. The frame window ends automatically on the grid. **Stop** during capture saves the available prefix as a partial take.
3. Choose **Record second take**. The base starts at the new take’s downbeat. Use **Play loop**, **Stop**, and **Play loop** again to hear both layers. **Undo second take** returns playback to the base.
4. Use **Download WAV** for either take. The standard WAV is signed 16-bit PCM with the captured channel count, sample rate and frame length. The original Float32 audio remains in local storage.
5. Click **Enable MIDI**, then select an input. Play notes and move a controller to see receipt time, channel, note or controller value and velocity. Use **Clear held notes** if a key release was missed.

## Audio and timing

| Files | Responsibility |
|---|---|
| `looper-grid.mjs` | Integer musical beats, fixed 2-, 4- or 8-bar regions and their conversion to AudioContext frames. It rounds each beat offset from the start and repeats one integer frame length. |
| `looper-audio.mjs` | Connects the selected input and owns a single clock for each run. Schedules count-in clicks and AudioBuffer sources with absolute frame targets. The input meter uses the analyser mix. The input has no audible monitor. |
| `looper-capture-worklet.mjs`, `looper-pcm.mjs` | Takes the intersection of the render quantum and planned frame window. Copies mono or stereo PCM into reusable transfer buffers and reports onset, gaps and pool exhaustion. |
| `looper-capture-worker.mjs`, `looper-store.mjs` | Recycles buffers independently of the UI, assembles PCM and commits checkpoints and take metadata to IndexedDB. |
| `looper-midi.mjs`, `looper-studio.mjs` | Decodes standard MIDI input, tracks held notes, and presents the device, transport and recovery controls. |

The earlier [Looper v0 PR](https://github.com/ArunPrakash2901/guitar-explorer/pull/54) supplied interaction ideas for permissions, count-in and a local take. This capture path uses AudioWorklet `currentFrame` and native AudioBuffer scheduling. Existing accompaniment and progression players have their own render lifecycles. This diagnostic shares their use of the AudioContext clock and has no dependency on either player or the guitar sample bank. [Web Audio specification](https://webaudio.github.io/web-audio-api/)

The page accepts 40–240 whole-number BPM, 8–96 kHz AudioContext rates and one or two capture channels. Regions are capped at 30 seconds. For a 30-second run, set eight bars and 64 BPM. Each take stores its musical grid, sample rate, channel count, target window, first captured frame and exact frame count. AudioContext frame indices are diagnostic coordinates for that run. Playback uses the saved region length and starts both source nodes at the same scheduled frame.

The capture onset delta measures where the Worklet started copying delivered input. It does not measure the delay from the guitar input to the browser or from the browser to the speakers. The recorded seam step is the absolute difference between the last and first sample on each channel, in normalized amplitude. Playback uses the raw edges, so a large step can click. The page reports the scheduled playback wrap separately from the measured PCM seam. MIDI timestamps use the performance clock and are shown as received.

## Local storage and recovery

The Worker receives 1,024-frame blocks from a pool of 16 transferable buffers. Stereo transfer buffers take 128 KiB and span about 341 ms of audio at 48 kHz. The Worker recycles each block after copying it into a bounded preallocated PCM array. A stalled consumer exhausts the pool after 16,384 frames if none return. Capture ends on the first affected render quantum and counts the frames rejected in that quantum. The rest of the scheduled region is intentionally left uncaptured.

A pending record exists before the count-in. Each transaction commits both the PCM checkpoint and its updated frame count. A capture becomes loopable only when it has the entire contiguous region and zero onset, gap and overflow errors. A stopped or interrupted take remains separate from the loop. After reloading, use **Recover saved frames** once the old recorder is closed. Recovery restores the last committed prefix and leaves any uncommitted tail out of the take. If a storage write fails during a live capture, the page can offer the Worker’s PCM as an in-memory WAV. Download it before closing the tab.

Checkpoint batches are 16,384 frames plus a final shorter batch. The POC stores at most two takes on the current browser origin. At its maximum format this is about 46 MB of PCM for two takes, before storage overhead. The browser can evict site data. Keep the same host and port when reopening a project and export WAVs you want to keep. [IndexedDB transactions](https://www.w3.org/TR/IndexedDB-3/#transaction-construct)

The transfer pool is the current baseline. Compare SharedArrayBuffer only if real-device runs repeatedly drop frames or show sustained high buffer occupancy. A comparison needs a scoped secure host with cross-origin isolation and the same capture, load and storage conditions. A site-wide header change is outside this proof. [Chrome AudioWorklet design patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern/)

## Verification

Run `npm run verify` for the repository gate, including the Looper Studio unit tests. Run `npm run test:looper:browser` for the separate Chromium acceptance test. Set `GE_CHROME` if Chrome is installed in a different location.

The browser test starts the real Lab server on an unused loopback port and uses a generated WAV as a fake microphone. It checks two four-bar passes, a 420 ms UI-thread stall, exact loop rendering across multiple wraps, WAV headers, stop and restart, undo, reload recovery and a 30-second pass. It verifies that stored base PCM stays byte-for-byte identical after the overdub and undo. A fixture tests standard MIDI request options, denial and retry, notes, controller input and disconnect. Those runs do not exercise physical USB devices.

## Hardware trial on Windows 11

- **Behringer UMC22.** Select the interface and confirm the reported and captured channel counts. Play a sustained note and then short attacks. Listen to the count-in and the base and second take together. Inspect the onset delta, overflow count and seam step. Repeat at 64 BPM over eight bars and test stopping early. Export both WAVs and check that the instrument channel is present. Listen to the seam and playback restart. Record electrical round-trip measurements separately before drawing a conclusion about compensation.
- **Akai MPK mini.** Grant standard MIDI access in a secure Chromium context, select the detected controller and test keys, pads and knobs. Record the channels and note numbers the device actually sends. Disconnect with a note held, check that the held count clears, reconnect and select the device again. MIDI is diagnostic input in this proof. [Web MIDI specification](https://www.w3.org/TR/webmidi/) · [Chromium permission behavior](https://developer.chrome.com/blog/web-midi-permission-prompt)
