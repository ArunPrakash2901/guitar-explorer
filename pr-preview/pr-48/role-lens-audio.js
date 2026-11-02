import {
  STANDARD_FRETBOARD,
  formatNote,
  musicQueries,
  toSemitone,
  transposePitch,
} from "./engine/index.js";
import { createRoleLensMaterial } from "./role-lens-material.mjs";
import { createAudioOut } from "./audio-out.mjs";
import { roleLensComparisonCue } from "./audio-cues.mjs";

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

async function playComparison() {
  try {
    const result = await audio.play(roleLensComparisonCue(material.context, transposePitch));
    setStatus(`Playing all three chord + ${material.context.anchor.name} comparisons. Listen for what changes while the anchor stays fixed (${result.durationSeconds.toFixed(1)}s).`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Audio could not start in this browser.");
  }
}

function stopComparison() {
  const stopped = audio.stop();
  setStatus(stopped ? "Audio stopped. Your Role Lens choices are unchanged." : "No app audio is currently sounding.");
}

$("role-audio-play").addEventListener("click", playComparison);
$("role-audio-stop").addEventListener("click", stopComparison);
globalThis.addEventListener?.("pagehide", () => audio.stop());
