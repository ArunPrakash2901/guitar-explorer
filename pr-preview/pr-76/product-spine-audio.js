import {
  STANDARD_FRETBOARD,
  formatNote,
  musicQueries,
  toSemitone,
  transposePitch,
} from "./engine/index.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { createPracticePlan } from "./practice-session.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { createAudioOut } from "./audio-out.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { DEFAULT_AUDIO_BPM, harmonicGravityPromptCue } from "./audio-cues.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const plan = createPracticePlan({
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

const audio = createAudioOut({ toSemitone });

function activeContext() {
  return document.body.dataset.stage?.startsWith("transfer-") ? plan.transfer : plan.context;
}

function setStatus(text) {
  $("product-audio-status").textContent = text;
}

function currentTempo() {
  const bpm = Number($("product-audio-tempo").value);
  return Number.isFinite(bpm) ? bpm : DEFAULT_AUDIO_BPM;
}

function syncTempoLabel() {
  $("product-audio-tempo-value").value = `${currentTempo()} BPM`;
}

async function playPrompt() {
  const context = activeContext();
  const bpm = currentTempo();
  try {
    const result = await audio.play(harmonicGravityPromptCue(context, transposePitch, { bpm }));
    setStatus(`Strumming ${context.chords.home.symbol} → ${context.chords.pressure.symbol} at ${bpm} BPM with the plucked-string voice. After ${result.durationSeconds.toFixed(1)}s, keep the silence and form your own expectation.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Audio could not start in this browser.");
  }
}

function stopPrompt() {
  const stopped = audio.stop();
  setStatus(stopped ? "Audio stopped. Your prediction is unchanged." : "No app audio is currently sounding.");
}

$("product-audio-tempo").addEventListener("input", syncTempoLabel);
$("product-audio-play").addEventListener("click", playPrompt);
$("product-audio-stop").addEventListener("click", stopPrompt);
syncTempoLabel();
globalThis.addEventListener?.("pagehide", () => audio.stop());
