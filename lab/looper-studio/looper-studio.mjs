import { LooperAudio, bufferFromTake, scheduleLayers, stopSources } from "./looper-audio.mjs";
import { loopGrid, loopPosition, moveTransport } from "./looper-grid.mjs";
import { PCM_POOL_BLOCKS, encodeWav } from "./looper-pcm.mjs";
import { HeldMidiNotes, decodeMidi, isAkaiInput } from "./looper-midi.mjs";
import { openLooperStore } from "./looper-store.mjs";

const byId = (id) => document.getElementById(id);
const text = (id, value) => {
  const element = byId(id);
  if (element.textContent !== String(value)) element.textContent = value;
};
const audioSelect = byId("audio-device");
const midiSelect = byId("midi-device");
const tempo = byId("tempo");
const bars = byId("bars");
const hasAudio = isSecureContext && typeof AudioContext === "function" && typeof AudioWorkletNode === "function";
const hasInput = hasAudio && typeof navigator.mediaDevices?.getUserMedia === "function";
const hasMidi = isSecureContext && typeof navigator.requestMIDIAccess === "function";
const states = { idle: "Idle", preparing: "Preparing capture", "count-in": "Count-in", recording: "Recording", saving: "Saving", playing: "Playing" };
const takeNames = { base: "Base take", overdub: "Second take" };
const reasons = {
  complete: "Complete", stopped: "Stopped early", "input-ended": "Input disconnected",
  "input-lost": "Input frames stopped", "frame-gap": "Missing frames",
  "buffer-overflow": "Buffer overflow", interrupted: "Interrupted", incomplete: "Incomplete capture",
};

let audio;
let inputSettings;
let connectedChoice;
let captureChannels;
let store;
let takes = [];
let unsaved;
let busy = false;
let state = "idle";
let stopCapture;
let playingSources = [];
let activeGrid;
let activeWindow;
let playbackFrame;
let savedFrames = 0;
let overflowFrames = 0;

const baseTake = () => takes.find((take) => take.slot === "base");
const secondTake = () => takes.find((take) => take.slot === "overdub");
const pending = () => takes.some((take) => take.status === "pending");
const selectedGrid = () => loopGrid(tempo.valueAsNumber, Number(bars.value), audio?.context.sampleRate ?? 48000);

function notice(message, error = false) {
  text("notice", message);
  byId("notice").dataset.error = String(error);
}

function showState() {
  byId("transport-state").dataset.state = state;
  text("transport-state", states[state]);
  text("sample-rate", audio ? audio.context.sampleRate + " Hz" : "—");
  text("device-rate", inputSettings ? inputSettings.sampleRate ? inputSettings.sampleRate + " Hz" : "Unreported" : "—");
  text("input-channels", captureChannels ? captureChannels + " in capture" :
    inputSettings?.channelCount ? inputSettings.channelCount + " reported" : inputSettings ? "Pending capture" : "—");
  text("audio-connection", !hasInput ? "Use Chromium on localhost or HTTPS" :
    inputSettings ? inputSettings.label || "Connected" : "Disconnected");
  text("saved-frames", savedFrames);
  text("overflow-frames", overflowFrames ?? "Unknown");
  const unavailable = busy || state !== "idle";
  const base = baseTake();
  let validGrid = true;
  try {
    const grid = selectedGrid();
    text("region-length", "4/4 · " + (grid.regionFrames / grid.sampleRate).toFixed(3) + " s · one-bar count-in");
  } catch (error) {
    validGrid = false;
    text("region-length", error.message);
  }
  const cannotRecord = unavailable || !store || !audio?.source || connectedChoice !== audioSelect.value || pending() || !!unsaved || !validGrid;
  tempo.disabled = unavailable || !!base;
  bars.disabled = unavailable || !!base;
  audioSelect.disabled = unavailable || !hasInput;
  byId("connect-audio").disabled = unavailable || !hasInput;
  byId("disconnect-audio").disabled = unavailable || !audio?.source;
  byId("record-base").disabled = cannotRecord || !!base;
  byId("record-layer").disabled = cannotRecord || base?.status !== "complete" || !!secondTake();
  byId("play-loop").disabled = unavailable || !hasAudio || base?.status !== "complete" || pending();
  byId("stop").disabled = !(state === "playing" || state === "count-in" || state === "recording");
  byId("unsaved-take").hidden = !unsaved?.report.frames;
  for (const button of byId("takes").querySelectorAll("button")) {
    button.disabled = unavailable || button.dataset.blocked === "true";
  }
}

function transition(event) {
  state = moveTransport(state, event);
  showState();
}

function log(id, message, limit = 12) {
  const list = byId(id);
  const item = document.createElement("li");
  item.textContent = message;
  list.prepend(item);
  if (list.children.length > limit) list.lastElementChild.remove();
}

async function whenIdle(action) {
  if (busy || state !== "idle") return;
  busy = true;
  showState();
  try {
    await action();
  } catch (error) {
    notice(error.message, true);
  } finally {
    busy = false;
    showState();
  }
}

function ensureAudio(sampleRate) {
  if (audio && sampleRate && audio.context.sampleRate !== sampleRate) {
    if (audio.source) throw new Error("Disconnect audio and reconnect to use the saved loop’s sample rate.");
    void audio.context.close().catch(() => {});
    audio = null;
  }
  audio ??= new LooperAudio(sampleRate);
  return audio;
}

async function listAudioInputs() {
  if (!hasInput) return;
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput" && device.deviceId && device.deviceId !== "default");
  const selected = audioSelect.value;
  audioSelect.replaceChildren(new Option("System default", ""), ...devices.map((device, index) =>
    new Option(device.label || "Audio input " + (index + 1), device.deviceId)));
  if (devices.some((device) => device.deviceId === selected)) audioSelect.value = selected;
  showState();
}

function clearInput() {
  audio?.disconnectInput();
  inputSettings = null;
  connectedChoice = null;
  captureChannels = null;
  showState();
}

byId("connect-audio").addEventListener("click", () => void whenIdle(async () => {
  const choice = audioSelect.value;
  const engine = ensureAudio(baseTake()?.sampleRate);
  notice("Waiting for audio permission…");
  try {
    inputSettings = await engine.connectInput(choice, () => {
      if (state === "count-in" || state === "recording") {
        transition("stop");
        stopCapture("input-ended");
      }
      clearInput();
      notice("Audio disconnected. Choose an input and connect again.", true);
    });
  } catch (error) {
    if (!engine.source) clearInput();
    if (error.name === "NotAllowedError") text("audio-permission", "Denied");
    throw new Error("Could not connect audio. Check the browser permission and selected device. " + error.message);
  }
  connectedChoice = choice;
  captureChannels = null;
  text("audio-permission", "Granted");
  notice("Audio connected. Check the input meter before recording.");
  await listAudioInputs();
}));
byId("disconnect-audio").addEventListener("click", () => {
  clearInput();
  notice("Audio disconnected.");
});
audioSelect.addEventListener("change", () => {
  if (audio?.source && audioSelect.value !== connectedChoice) notice("Connect the selected input before recording.");
  showState();
});
if (hasInput) {
  navigator.mediaDevices.addEventListener("devicechange", () => void listAudioInputs().catch(() => {}));
  void listAudioInputs().catch(() => {});
} else {
  text("audio-permission", "Unavailable");
}

function addTakeButton(group, label, action, blocked = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.blocked = String(blocked);
  button.addEventListener("click", () => void whenIdle(action));
  group.append(button);
}

function captureDetails(take) {
  const parts = [];
  if (take.window && take.firstFrame !== null) {
    parts.push("Onset Δ " + (take.firstFrame - take.window.startFrame) + " frames");
  }
  if (take.overflowFrames != null) parts.push("Overflow " + take.overflowFrames + " frames");
  if (take.peakBuffers != null) parts.push("Peak buffers " + take.peakBuffers + "/" + PCM_POOL_BLOCKS);
  if (take.seam) parts.push("Seam step " + take.seam.map((value) => value.toFixed(5)).join(" / "));
  return parts.join(" · ");
}

function downloadWav(take, samples, suffix = "") {
  const wav = encodeWav(samples, take.sampleRate, take.channels);
  const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "looper-" + take.slot + suffix + ".wav";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderTakes() {
  const list = byId("takes");
  list.replaceChildren();
  for (const take of [baseTake(), secondTake()].filter(Boolean)) {
    const row = document.createElement("li");
    row.dataset.slot = take.slot;
    row.dataset.status = take.status;
    row.dataset.frames = take.frames;
    const title = document.createElement("strong");
    const status = take.status === "pending" ? "Needs recovery" : reasons[take.reason];
    title.textContent = takeNames[take.slot] + " · " + status;
    const format = document.createElement("p");
    format.textContent = take.frames + " frames · " + take.sampleRate + " Hz · " + take.channels +
      (take.channels === 1 ? " channel" : " channels") + " · " + take.bars + " bars at " + take.bpm + " BPM";
    const details = document.createElement("p");
    details.textContent = captureDetails(take);
    const actions = document.createElement("div");
    actions.className = "actions";
    if (take.status === "pending") {
      details.textContent = "If the recorder is closed, recover the committed frames here.";
      addTakeButton(actions, "Recover saved frames", async () => {
        const recovered = await store.recover(take.id);
        await refreshProject();
        savedFrames = recovered?.frames ?? 0;
        overflowFrames = recovered?.overflowFrames ?? null;
        notice("Recovered " + savedFrames + " saved frames. Download the WAV or discard the partial take.");
      });
    } else {
      if (take.frames) addTakeButton(actions, "Download WAV", async () => {
        const saved = await store.load(take.id);
        downloadWav(saved.take, saved.samples, take.status === "partial" ? "-partial" : "");
      });
      const label = take.status === "partial" ? "Discard partial take" : take.slot === "overdub" ? "Undo second take" : "Remove base";
      addTakeButton(actions, label, async () => {
        await store.remove(take.id);
        await refreshProject();
        savedFrames = takes.at(-1)?.frames ?? 0;
        overflowFrames = takes.at(-1)?.overflowFrames ?? 0;
        notice(takeNames[take.slot] + " removed.");
      }, take.slot === "base" && !!secondTake());
    }
    row.append(title, format, details, actions);
    list.append(row);
  }
}

async function refreshProject() {
  takes = await store.list();
  const base = baseTake();
  if (base) {
    tempo.value = base.bpm;
    bars.value = base.bars;
  }
  text("storage-state", takes.length ? "Saved in this browser." : "No recordings yet. Takes stay in this browser.");
  renderTakes();
  showState();
}

async function startRecording(slot) {
  const engine = audio;
  const grid = selectedGrid();
  await engine.context.resume();
  const baseBuffer = slot === "overdub" ? bufferFromTake(engine.context, await store.load(baseTake().id)) : null;
  activeGrid = grid;
  savedFrames = 0;
  overflowFrames = 0;
  notice("Preparing the audio buffer and local storage…");
  transition("prepare");
  try {
    const result = await engine.record({
      grid, slot, store, baseBuffer,
      onInput: (channels) => {
        captureChannels = channels;
        showState();
      },
      onArmed: (window, stop) => {
        activeWindow = window;
        stopCapture = stop;
        transition("arm");
        notice("Count in for one bar. Recording begins at the next downbeat.");
        log("clock-log", "Count-in frame " + window.countInFrame + " · planned capture " + window.startFrame + "–" + window.endFrame);
      },
      onOnset: () => {
        if (state !== "count-in") return;
        transition("onset");
        notice("Recording " + takeNames[slot].toLowerCase() + "…");
      },
      onSaving: (report) => {
        if (state === "count-in" || state === "recording") transition("stop");
        overflowFrames = report.overflowFrames;
        showState();
      },
      onProgress: (frames) => {
        savedFrames = frames;
        text("saved-frames", savedFrames);
      },
    });
    if (result.type === "unsaved") {
      unsaved = result.report.frames ? result : null;
      overflowFrames = result.report.overflowFrames;
      const recovery = unsaved ? "Export the in-memory WAV or recover the committed prefix." : "Recover the journal and try again.";
      throw new Error("Saving failed. " + recovery + " " + result.error);
    }
    const take = result.take;
    savedFrames = take.frames;
    overflowFrames = take.overflowFrames;
    log("clock-log", "Capture " + take.frames + "/" + take.regionFrames + " frames · " + captureDetails(take));
    notice(take.status === "complete" ? takeNames[slot] + " saved." :
      reasons[take.reason] + ". Saved " + take.frames + " frames as a partial take.", take.status === "partial");
  } finally {
    stopCapture = null;
    activeWindow = null;
    activeGrid = null;
    transition("finish");
    await refreshProject();
  }
}

byId("record-base").addEventListener("click", () => void whenIdle(() => startRecording("base")));
byId("record-layer").addEventListener("click", () => void whenIdle(() => startRecording("overdub")));
byId("play-loop").addEventListener("click", () => void whenIdle(async () => {
  const base = baseTake();
  const engine = ensureAudio(base.sampleRate);
  await engine.context.resume();
  const layers = [base, secondTake()].filter((take) => take?.status === "complete");
  const buffers = await Promise.all(layers.map(async (take) => bufferFromTake(engine.context, await store.load(take.id))));
  activeGrid = loopGrid(base.bpm, base.bars, base.sampleRate);
  playbackFrame = engine.frame + Math.ceil(base.sampleRate * .1);
  playingSources = scheduleLayers(engine.context, engine.mix, buffers, playbackFrame);
  transition("play");
  notice("Playing " + (layers.length === 1 ? "the base take." : "both takes."));
  log("clock-log", layers.length + " layer(s) at frame " + playbackFrame + " · first wrap scheduled at " +
    (playbackFrame + activeGrid.regionFrames) + " · period " + activeGrid.regionFrames + " frames");
}));
byId("stop").addEventListener("click", () => {
  if (state === "playing") {
    stopSources(playingSources);
    playingSources = [];
    activeGrid = null;
    transition("stop");
    notice("Playback stopped.");
  } else if (state === "count-in" || state === "recording") {
    transition("stop");
    stopCapture("stopped");
    notice("Saving the captured prefix…");
  }
});
byId("export-unsaved").addEventListener("click", () => {
  if (unsaved) downloadWav(unsaved.take, new Float32Array(unsaved.buffer), "-unsaved");
});
byId("dismiss-unsaved").addEventListener("click", () => {
  unsaved = null;
  showState();
});
tempo.addEventListener("input", showState);
bars.addEventListener("change", showState);

async function initStorage() {
  try {
    store = await openLooperStore();
    await refreshProject();
    const last = takes.at(-1);
    savedFrames = last?.frames ?? 0;
    overflowFrames = last ? last.overflowFrames ?? null : 0;
    if (pending()) notice("Recover the saved frames of the interrupted take after confirming no other tab is recording.");
  } catch (error) {
    store = null;
    text("storage-state", "Could not open recording storage. Reload to retry. " + error.message);
  }
  showState();
}
void initStorage();

const held = new HeldMidiNotes();
let midiAccess;
let midiInput;
let midiBusy = false;

function clearHeld() {
  text("held-notes", 0);
  return held.releaseAll();
}

function detachMidi() {
  const old = midiInput;
  midiInput = null;
  if (old) {
    old.onmidimessage = null;
    void old.close().catch(() => {});
  }
  return clearHeld();
}

function showMidiInputs() {
  const inputs = Array.from(midiAccess?.inputs.values() ?? []).filter((input) => input.state === "connected");
  const previous = midiSelect.value;
  midiSelect.replaceChildren(new Option("Select an input", ""), ...inputs.map((input) =>
    new Option(input.name || input.manufacturer || "MIDI input", input.id)));
  if (inputs.some((input) => input.id === previous)) midiSelect.value = previous;
  midiSelect.disabled = !inputs.length;
  text("akai-status", inputs.some(isAkaiInput) ? "Detected" : "Not detected");
  if (midiInput && !inputs.some((input) => input.id === midiInput.id)) {
    const cleared = detachMidi();
    text("midi-connection", "Input disconnected");
    log("midi-log", "Input disconnected. Cleared " + cleared + " held note(s).", 24);
  }
}

function showMidiMessage({ data, timeStamp }) {
  const event = decodeMidi(data, timeStamp);
  if (!event) return;
  held.observe(event);
  text("held-notes", held.notes.size);
  const detail = event.type === "control" ? event.name + " " + event.value :
    event.type === "pitch-bend" ? "Pitch bend " + event.value :
    (event.type === "note-on" ? "Note on " : "Note off ") + event.note + " · velocity " + event.velocity;
  log("midi-log", event.timestamp.toFixed(1) + " ms · ch " + event.channel + " · " + detail, 24);
}

midiSelect.addEventListener("change", async () => {
  const id = midiSelect.value;
  detachMidi();
  const input = midiAccess?.inputs.get(id);
  if (!input) {
    text("midi-connection", "No input selected");
    return;
  }
  midiInput = input;
  text("midi-connection", "Opening input…");
  try {
    await input.open();
    if (midiInput !== input) return;
    input.onmidimessage = showMidiMessage;
    text("midi-connection", "Connected");
  } catch (error) {
    if (midiInput !== input) return;
    detachMidi();
    midiSelect.value = "";
    text("midi-connection", "Could not open input. Select it again.");
    log("midi-log", error.message, 24);
  }
});
byId("clear-midi").addEventListener("click", () => {
  log("midi-log", "Cleared " + clearHeld() + " held note(s).", 24);
});
byId("enable-midi").addEventListener("click", async () => {
  if (!hasMidi || midiBusy) return;
  midiBusy = true;
  byId("enable-midi").disabled = true;
  text("midi-permission", "Requesting…");
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    text("midi-permission", "Granted");
    midiAccess.onstatechange = showMidiInputs;
    text("midi-connection", "No input selected");
    byId("clear-midi").disabled = false;
    showMidiInputs();
  } catch (error) {
    text("midi-permission", error.name === "NotAllowedError" || error.name === "SecurityError" ? "Denied" : "Unavailable");
    text("midi-connection", "Check browser permission and retry.");
    log("midi-log", error.message, 24);
  } finally {
    midiBusy = false;
    byId("enable-midi").disabled = !!midiAccess;
  }
});
if (!hasMidi) {
  text("midi-permission", "Unavailable");
  text("midi-connection", "Use Web MIDI in secure Chromium");
  byId("enable-midi").disabled = true;
}

async function watchPermission(query, id) {
  try {
    const permission = await navigator.permissions.query(query);
    const update = () => {
      const connected = id === "audio-permission" ? !!audio?.source : !!midiAccess;
      if (!connected || permission.state === "denied") {
        text(id, permission.state[0].toUpperCase() + permission.state.slice(1));
      }
      if (id === "midi-permission" && permission.state === "denied" && midiAccess) {
        detachMidi();
        midiAccess.onstatechange = null;
        midiAccess = null;
        showMidiInputs();
        byId("clear-midi").disabled = true;
        byId("enable-midi").disabled = false;
        text("midi-connection", "MIDI permission was revoked.");
      }
    };
    permission.addEventListener("change", update);
    update();
  } catch {
    // Older implementations report permission from the explicit request.
  }
}
if (hasInput) void watchPermission({ name: "microphone" }, "audio-permission");
if (hasMidi) void watchPermission({ name: "midi", sysex: false }, "midi-permission");

let lastMeter = 0;
function displayClock(now) {
  if (now - lastMeter >= 66) {
    const level = audio?.level() ?? 0;
    byId("input-level").value = level;
    text("level-db", level > 0 ? (20 * Math.log10(level)).toFixed(1) + " dBFS" : "−∞ dBFS");
    let position = "—";
    if (state === "count-in" && activeWindow) {
      const beat = loopPosition(activeGrid, audio.frame - activeWindow.countInFrame).beat;
      position = "Count-in · beat " + beat;
    } else if (state === "recording" || state === "playing") {
      const offset = state === "playing" ? playbackFrame : activeWindow.startFrame;
      const point = loopPosition(activeGrid, audio.frame - offset);
      position = "Bar " + point.bar + " · beat " + point.beat;
    }
    text("transport-position", position);
    lastMeter = now;
  }
  requestAnimationFrame(displayClock);
}
showState();
requestAnimationFrame(displayClock);
