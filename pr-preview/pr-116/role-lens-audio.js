import {
  STANDARD_FRETBOARD,
  formatNote,
  musicQueries,
  toSemitone,
  transposePitch,
} from "./engine/index.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { createRoleLensMaterial } from "./role-lens-material.mjs?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { createAudioOut } from "./audio-out.mjs?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import {
  DEFAULT_AUDIO_BPM,
  roleLensComparisonCue,
  singlePitchCue,
} from "./audio-cues.mjs?ge-revision=00581e04556260884131d3feca93b1898bb0b741";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const material = createRoleLensMaterial({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  analyseNotes: (request) => unwrap(musicQueries.analyseNotes(request)),
  findLocations: ({ key, chord, pitch }) => {
    const [analysis] = unwrap(musicQueries.analyseNotes({ notes: [pitch], context: { key } }));
    return unwrap(musicQueries.getFretboardLocations({
      board: STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 8 },
      pitchClasses: [analysis.pitchClass],
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    }));
  },
  formatNote,
});

const audio = createAudioOut({ toSemitone });

function setStatus(text) {
  $("role-audio-status").textContent = text;
}

function currentTempo() {
  const bpm = Number($("role-audio-tempo").value);
  return Number.isFinite(bpm) ? bpm : DEFAULT_AUDIO_BPM;
}

function syncTempoLabel() {
  $("role-audio-tempo-value").value = `${currentTempo()} BPM`;
}

async function playAnchor() {
  const bpm = currentTempo();
  try {
    await audio.play(singlePitchCue(material.context.anchor.pitch, { bpm }));
    setStatus(`Plucking the fixed anchor ${material.context.anchor.name} at ${bpm} BPM. Keep that pitch in your ear before comparing the chords.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Audio could not start in this browser.");
  }
}

async function playComparison() {
  const bpm = currentTempo();
  try {
    const result = await audio.play(roleLensComparisonCue(material.context, transposePitch, { bpm }));
    setStatus(`Strumming all three chord + ${material.context.anchor.name} comparisons at ${bpm} BPM. Listen for what changes while the anchor stays fixed (${result.durationSeconds.toFixed(1)}s).`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Audio could not start in this browser.");
  }
}

function stopComparison() {
  const stopped = audio.stop();
  setStatus(stopped ? "Audio stopped. Your Role Lens choices are unchanged." : "No app audio is currently sounding.");
}

$("role-audio-tempo").addEventListener("input", syncTempoLabel);
$("role-audio-anchor").addEventListener("click", playAnchor);
$("role-audio-play").addEventListener("click", playComparison);
$("role-audio-stop").addEventListener("click", stopComparison);
syncTempoLabel();
globalThis.addEventListener?.("pagehide", () => audio.stop());
