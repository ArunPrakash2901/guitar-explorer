import {
  STANDARD_FRETBOARD,
  formatNote,
  musicQueries,
} from "/engine/index.js";
import { createPracticePlan } from "/practice-session.mjs";
import {
  ACCOMPANIMENT_PRESETS,
  accompanimentDurationSeconds,
  createAccompanimentPlan,
} from "/accompaniment-plan.mjs";
import {
  captureTimeline,
  createLooperLifecycle,
  normalizeCaptureSpec,
} from "/looper-runtime.mjs";

const $ = (id) => document.getElementById(id);
const actionGlyph = Object.freeze({ down: "↓", up: "↑", rest: "·" });

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const practice = createPracticePlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex],
    pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(musicQueries.getInterval(request)),
  formatNote,
});

const progression = Object.freeze([
  practice.context.chords.home,
  practice.context.chords.departure,
  practice.context.chords.pressure,
  practice.context.chords.home,
]);

function parseCsvNumbers(value, fallback) {
  if (!value) return [...fallback];
  const parsed = value.split(",").map((item) => Number(item));
  return parsed.length === fallback.length && parsed.every(Number.isFinite) ? parsed : [...fallback];
}

function parsePattern(value) {
  if (!value) return [...ACCOMPANIMENT_PRESETS.open.pattern];
  const parsed = value.split(");");
  return parsed.length === 8 ? parsed : [...ACCOMPANIMENT_PRESETS.open.pattern];
}

function planFromUrl() {
  const params = new URLSearchParams(location.search);
  const bpm = Number(params.get("bpm")) || 84;
  const barsPerChord = parseCsvNumbers(params.get("bars"), progression.map(() => 1));
  const rawPattern = params.get("pattern");
  const pattern = rawPattern ? rawPattern.split(",") : [...ACCOMPANIMENT_PRESETS.open.pattern];

  try {
    return createAccompanimentPlan({ progression, bpm, barsPerChord, pattern });
  } catch {
    return createAccompanimentPlan({ progression, bpm: 84, barsPerChord: progression.map(() => 1), pattern: ACCOMPANIMENT_PRESETS.open.pattern });
  }
}

const plan = planFromUrl();
const progressionLabel = progression.map(({ symbol }) => symbol).join(" → ");
const captureSpec = normalizeCaptureSpec({
  bpm: plan.bpm,
  countInBeats: 4,
  recordDurationSeconds: accompanimentDurationSeconds(plan),
  contextLabel: progressionLabel,
});
const timeline = captureTimeline(captureSpec);
const lifecycle = createLooperLifecycle();

let stream = null;
let recorder = null;
let chunks = [];
let takeUrl = null;
let autoStopTimer = null;
let countInToken = 0;
let clickContext = null;

function setInputStatus(text) {
  $("input-status").textContent = text;
}

function setRecordStatus(text) {
  $("record-status").textContent = text;
}

function setTakeStatus(text) {
  $("take-status").textContent = text;
}

function setCount(text, recording = false) {
  $("count-display").textContent = text;
  $("count-display").classList.toggle("is-recording", recording);
}

function stopStream() {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
  stream = null;
}

function revokeTake() {
  const audio = $("take-audio");
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (takeUrl) URL.revokeObjectURL(takeUrl);
  takeUrl = null;
  $("take-panel").hidden = true;
  $("improv-panel").hidden = true;
  $("record-again").disabled = true;
}

function mediaRecorderOptions() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  const mimeType = candidates.find((candidate) => globalThis.MediaRecorder?.isTypeSupported?.(candidate));
  return mimeType ? { mimeType } : undefined;
}

async function listInputs(selectedId = "") {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
  const select = $("input-device");
  select.replaceChildren();
  if (!inputs.length) {
    const option = document.createElement("option");
    option.textContent = "Default audio input";
    option.value = "";
    select.append(option);
  } else {
    inputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Audio input ${index + 1}`;
      option.selected = device.deviceId === selectedId;
      select.append(option);
    });
  }
  select.disabled = false;
}

async function acquireInput(deviceId = "") {
  if (!navigator.mediaDevices?.getUserMedia || typeof globalThis.MediaRecorder !== "function") {
    throw new Error("This browser does not support local microphone recording.");
  }

  const constraints = deviceId
    ? { audio: { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
    : { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };

  const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
  stopStream();
  stream = nextStream;
  if (lifecycle.state === "idle") lifecycle.transition("permission");
  else lifecycle.resetToReady();

  await listInputs(deviceId);
  $("record-start").disabled = false;
  $("capture-stop").disabled = true;
  setInputStatus("Input ready. Audio remains local to this browser tab and is not analysed or uploaded.");
  setRecordStatus(`Ready for a ${captureSpec.countInBeats}-beat count-in and ${captureSpec.recordDurationSeconds.toFixed(1)}s take.`);
  setCount("Ready");
}

async function ensureClickContext() {
  const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;
  clickContext ??= new AudioContextCtor();
  if (clickContext.state === "suspended") await clickContext.resume();
  return clickContext;
}

async function playCountClick(accent = false) {
  const context = await ensureClickContext();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(accent ? 1200 : 820, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.13 : 0.085, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.065);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function finishCapture() {
  if (!chunks.length) {
    lifecycle.resetToReady();
    setRecordStatus("No audio data was captured. Try recording again.");
    setCount("Ready");
    $("record-start").disabled = false;
    $("capture-stop").disabled = true;
    return;
  }

  const type = recorder?.mimeType || chunks[0]?.type || "audio/webm";
  const blob = new Blob(chunks, { type });
  revokeTake();
  takeUrl = URL.createObjectURL(blob);
  const audio = $("take-audio");
  audio.src = takeUrl;
  audio.loop = false;
  lifecycle.transition("capture");
  $("take-panel").hidden = false;
  $("improv-panel").hidden = false;
  $("record-again").disabled = false;
  $("record-start").disabled = false;
  $("capture-stop").disabled = true;
  setCount("Take ready");
  setRecordStatus("Capture complete. Listen once or loop it, then improvise over your own rhythm.");
  setTakeStatus("Take ready. No analysis or grading has been performed.");
}

function beginRecorder() {
  if (!stream) throw new Error("Enable an audio input first.");
  chunks = [];
  const options = mediaRecorderOptions();
  recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) chunks.push(event.data);
  });
  recorder.addEventListener("stop", finishCapture, { once: true });
  recorder.start();
  lifecycle.transition("record");
  $("capture-stop").disabled = false;
  setCount("RECORDING", true);
  setRecordStatus(`Recording one ${progressionLabel} pass · ${captureSpec.recordDurationSeconds.toFixed(1)}s.`);
  autoStopTimer = setTimeout(() => {
    if (recorder?.state === "recording") recorder.stop();
  }, Math.round(captureSpec.recordDurationSeconds * 1000));
}

async function startCountInAndRecord() {
  if (!stream) {
    setRecordStatus("Enable an audio input first.");
    return;
  }

  if (["captured", "playing", "looping"].includes(lifecycle.state)) {
    if (["playing", "looping"].includes(lifecycle.state)) stopTakePlayback();
    lifecycle.transition("rerecord");
    revokeTake();
  }

  lifecycle.transition("countIn");
  countInToken += 1;
  const token = countInToken;
  $("record-start").disabled = true;
  $("capture-stop").disabled = false;
  setRecordStatus(`Count in: ${captureSpec.countInBeats} beats at ${captureSpec.bpm} BPM.`);

  const beatMs = timeline.secondsPerBeat * 1000;
  for (let beat = 1; beat <= captureSpec.countInBeats; beat += 1) {
    if (token !== countInToken || lifecycle.state !== "count-in") return;
    setCount(String(beat));
    await playCountClick(beat === 1);
    await delay(beatMs);
  }

  if (token !== countInToken || lifecycle.state !== "count-in") return;
  beginRecorder();
}

function stopOrCancelCapture() {
  if (lifecycle.state === "count-in") {
    countInToken += 1;
    lifecycle.transition("cancel");
    $("record-start").disabled = false;
    $("capture-stop").disabled = true;
    setCount("Ready");
    setRecordStatus("Count-in cancelled. Ready when you are.");
    return;
  }

  if (lifecycle.state === "recording" && recorder?.state === "recording") {
    clearTimeout(autoStopTimer);
    recorder.stop();
  }
}

async function playTake(loop) {
  if (!takeUrl) return;
  const audio = $("take-audio");
  if (lifecycle.state === "playing" || lifecycle.state === "looping") {
    audio.pause();
    audio.currentTime = 0;
    lifecycle.transition("stop");
  }
  lifecycle.transition(loop ? "loop" : "play");
  audio.loop = loop;
  audio.currentTime = 0;
  await audio.play();
  setTakeStatus(loop ? "Looping your take. Pick up the guitar and improvise." : "Playing your take once.");
}

function stopTakePlayback() {
  if (!takeUrl) return;
  const audio = $("take-audio");
  audio.pause();
  audio.currentTime = 0;
  if (lifecycle.state === "playing" || lifecycle.state === "looping") lifecycle.transition("stop");
  setTakeStatus("Playback stopped. Your take remains available locally.");
}

function discardAndReady() {
  countInToken += 1;
  clearTimeout(autoStopTimer);
  if (recorder?.state === "recording") recorder.stop();
  if (["playing", "looping"].includes(lifecycle.state)) stopTakePlayback();
  if (lifecycle.state === "captured") lifecycle.transition("rerecord");
  revokeTake();
  lifecycle.resetToReady();
  setCount("Ready");
  setRecordStatus(`Ready for another ${captureSpec.recordDurationSeconds.toFixed(1)}s take.`);
}

function renderPlan() {
  $("capture-plan-heading").textContent = progressionLabel;
  $("capture-tempo").textContent = `${plan.bpm} BPM`;
  $("capture-bars").textContent = plan.barsPerChord.join(" / ");
  $("capture-pattern").textContent = plan.pattern.map((action) => actionGlyph[action]).join(" ");
  $("capture-length").textContent = `${captureSpec.recordDurationSeconds.toFixed(1)}s`;
  $("capture-summary").textContent = `${captureSpec.countInBeats}-beat count-in · ${(timeline.totalSeconds).toFixed(1)}s including count-in.`;

  const fromName = formatNote(practice.context.motion.from.tone.note);
  const toName = formatNote(practice.context.motion.to.tone.note);
  $("improv-prompt").textContent = `Start with only ${fromName} and ${toName}. Let ${fromName} appear over ${practice.context.chords.pressure.symbol}, then aim for ${toName} when ${practice.context.chords.home.symbol} returns. Once that feels deliberate, add one note of your choice.`;
}

$("enable-input").addEventListener("click", async () => {
  try {
    await acquireInput($("input-device").value);
  } catch (error) {
    setInputStatus(error instanceof Error ? error.message : "Microphone permission could not be started.");
  }
});

$("input-device").addEventListener("change", async () => {
  try {
    await acquireInput($("input-device").value);
  } catch (error) {
    setInputStatus(error instanceof Error ? error.message : "The selected input could not be opened.");
  }
});

$("record-start").addEventListener("click", () => {
  startCountInAndRecord().catch((error) => {
    lifecycle.resetToReady();
    $("record-start").disabled = false;
    $("capture-stop").disabled = true;
    setCount("Ready");
    setRecordStatus(error instanceof Error ? error.message : "Recording could not start.");
  });
});
$("capture-stop").addEventListener("click", stopOrCancelCapture);
$("record-again").addEventListener("click", discardAndReady);
$("take-play").addEventListener("click", () => playTake(false));
$("take-loop").addEventListener("click", () => playTake(true));
$("take-stop").addEventListener("click", stopTakePlayback);

$("take-audio").addEventListener("ended", () => {
  if (lifecycle.state === "playing") {
    lifecycle.transition("ended");
    setTakeStatus("Playback finished. Loop it when you are ready to improvise.");
  }
});

globalThis.addEventListener?.("pagehide", () => {
  countInToken += 1;
  clearTimeout(autoStopTimer);
  stopTakePlayback();
  stopStream();
  if (takeUrl) URL.revokeObjectURL(takeUrl);
  clickContext?.close?.();
});

renderPlan();
