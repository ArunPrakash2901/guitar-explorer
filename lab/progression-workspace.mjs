import { formatNote, parseNote } from "./engine/index.js";
import { chordDiagramModel } from "./progression/voicings.js";
import { cycleChordVoicing, generateWorkspace, toggleChordLock } from "./progression/workspace.js";
import { renderChordDiagram } from "./progression-diagram.mjs";
import { createProgressionAudio, MIN_BPM, MAX_BPM } from "./progression-audio.mjs";

const modes = { major: "major", naturalMinor: "natural minor", mixolydian: "Mixolydian" };
const families = { open: "Open shape", "e-barre": "E-shape barre", "a-barre": "A-shape barre" };
const qualities = { major: "major", minor: "minor", diminished: "diminished", augmented: "augmented" };
const noteText = (value) => value.replaceAll("#", "♯").replaceAll("b", "♭");

const form = document.querySelector("#generate-form");
const tonicInput = document.querySelector("#tonic");
const modeInput = document.querySelector("#mode");
const seedInput = document.querySelector("#seed");
const message = document.querySelector("#form-message");
const contextHeading = document.querySelector("#context-heading");
const scaleNotes = document.querySelector("#scale-notes");
const cardsElement = document.querySelector("#progression-cards");
const tempoInput = document.querySelector("#tempo");
const loopInput = document.querySelector("#loop");
const playButton = document.querySelector("#play-progression");
const stopButton = document.querySelector("#stop-playback");
const playbackStatus = document.querySelector("#playback-status");
let workspace;
let playback = { status: "idle", slot: null };

const audio = createProgressionAudio({
  onState(state) {
    const wasRunning = playback.status !== "idle";
    playback = state;
    renderPlayback();
    if (state.status === "idle") {
      if (wasRunning) playbackStatus.textContent = "Playback stopped.";
    } else if (state.status === "starting" || state.slot === null) {
      playbackStatus.textContent = "Starting playback…";
    } else {
      const { slot } = workspace.cards[state.slot];
      playbackStatus.textContent = "Playing chord " + (state.slot + 1) + ", " + noteText(slot.symbol) + ".";
    }
  },
});

tempoInput.min = String(MIN_BPM);
tempoInput.max = String(MAX_BPM);

function renderedGrips() {
  return workspace?.cards.map(({ voicings, voicingIndex }) => voicings[voicingIndex]?.notes.map(({ semitone }) => semitone)) ?? [];
}

function renderPlayback() {
  const running = playback.status !== "idle";
  const grips = renderedGrips();
  const unsupported = grips.length !== 4 || grips.some((grip) => !grip);
  playButton.disabled = unsupported;
  stopButton.disabled = !running;
  tempoInput.disabled = running;
  loopInput.disabled = running;
  for (const card of cardsElement.querySelectorAll("[data-slot]")) {
    card.classList.toggle("is-playing", Number(card.dataset.slot) === playback.slot);
  }
  if (unsupported && !running) {
    playbackStatus.textContent = "Progression playback needs a guitar grip on all four cards.";
  }
}

async function playGrip(slotIndex) {
  if (!tempoInput.reportValidity()) return;
  const grips = renderedGrips();
  const bpm = tempoInput.valueAsNumber;
  try {
    if (slotIndex === undefined) {
      if (grips.some((grip) => !grip)) return;
      await audio.playProgression(grips, { bpm, loop: loopInput.checked });
    } else {
      const grip = grips[slotIndex];
      if (grip) await audio.playChord(grip, { slot: slotIndex, bpm });
    }
  } catch (error) {
    playbackStatus.textContent = "Playback unavailable. " + error.message;
  }
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

function renderCard({ slot, voicings, voicingIndex }) {
  const { chord, symbol, romanNumeral, isLocked, slotIndex } = slot;
  const title = noteText(symbol);
  const spokenChord = noteText(formatNote(chord.root)) + " " + qualities[chord.chordId];
  const voicing = voicings[voicingIndex];
  const number = slotIndex + 1;
  const diagram = voicing ? renderChordDiagram(chordDiagramModel(voicing), spokenChord) : "";
  return `<li class="chord-card" data-slot="${slotIndex}" data-chord="${title}">
    <div class="card-heading">
      <div class="card-identity">
        <p class="card-roman">${romanNumeral}</p>
        <h3 aria-label="${spokenChord}">${title}</h3>
      </div>
      <button class="lock-button" type="button" data-action="lock" aria-label="Lock chord ${number}, ${spokenChord}" aria-pressed="${isLocked}">
        ${isLocked ? "Locked" : "Lock"}
      </button>
    </div>
    <p class="chord-tones">${chord.tones.map(({ note }) => noteText(formatNote(note))).join(" · ")}</p>
    ${voicing ? `
      <div class="diagram-wrap" data-voicing="${voicing.id}">${diagram}</div>
      <div class="voicing-nav">
        <button type="button" data-action="voicing" data-step="-1" aria-label="Previous voicing for chord ${number}" ${voicings.length < 2 ? "disabled" : ""}>‹</button>
        <p><strong>${families[voicing.shapeFamily]}</strong><span>${voicingIndex + 1} of ${voicings.length}</span></p>
        <button type="button" data-action="voicing" data-step="1" aria-label="Next voicing for chord ${number}" ${voicings.length < 2 ? "disabled" : ""}>›</button>
      </div>
      <button type="button" class="play-chord" data-action="play-chord" aria-label="Play chord ${number}, ${spokenChord}">Play chord</button>
    ` : `<p class="unsupported">No guitar grip is available for this chord. Its tones are shown above.</p>`}
  </li>`;
}

function renderCards(restoreFocus) {
  cardsElement.innerHTML = workspace.cards.map(renderCard).join("");
  renderPlayback();
  if (restoreFocus) {
    cardsElement.querySelector(restoreFocus)?.focus({ preventScroll: true });
  }
}

function applyGeneration(seed) {
  const result = generateWorkspace({ tonic: parseNote(tonicInput.value), mode: modeInput.value, seed }, workspace);
  if (!result.ok) {
    const keep = workspace ? " The current progression is still available." : "";
    const recovery = result.error.code === "LOCK_OUT_OF_MODE" ? " Unlock that chord or choose another key and mode." : "";
    setMessage(result.error.message + "." + recovery + keep, true);
    return;
  }

  const prior = workspace;
  if (prior) {
    audio.stop();
    playbackStatus.textContent = "One bar per chord in 4/4.";
  }
  workspace = result.data;
  const { context, scale } = workspace;
  const name = noteText(formatNote(context.tonic)) + " " + modes[context.mode];
  const tones = scale.tones.map(({ note }) => noteText(formatNote(note)));
  if (context.mode === "mixolydian") tones[6] += " (♭7)";
  contextHeading.textContent = name;
  scaleNotes.textContent = tones.join(" · ");
  contextHeading.closest("section").hidden = false;
  seedInput.value = String(context.seed);
  renderCards();

  const lockCount = workspace.cards.filter(({ slot }) => slot.isLocked).length;
  const same = prior && workspace.cards.every(({ slot }, i) => slot.symbol === prior.cards[i].slot.symbol);
  const status = lockCount === 4 ? " All four chords are locked."
    : same ? " This seed selected the same chords."
    : lockCount ? ` Kept ${lockCount} locked ${lockCount === 1 ? "chord" : "chords"}.` : "";
  setMessage(`Seed ${seed}.${status}`);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  applyGeneration(seedInput.valueAsNumber);
});

document.querySelector("#regenerate").addEventListener("click", () => {
  if (form.reportValidity()) applyGeneration((seedInput.valueAsNumber + 1) >>> 0);
});

cardsElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const slotIndex = Number(button.closest("[data-slot]").dataset.slot);
  const { action, step } = button.dataset;
  if (action === "lock") {
    workspace = toggleChordLock(workspace, slotIndex);
    renderCards(`[data-slot="${slotIndex}"] [data-action="lock"]`);
    const { slot } = workspace.cards[slotIndex];
    setMessage(`Chord ${slotIndex + 1} ${slot.isLocked ? "locked" : "unlocked"}.`);
  } else if (action === "play-chord") {
    void playGrip(slotIndex);
  } else if (action === "voicing") {
    audio.stop();
    workspace = cycleChordVoicing(workspace, slotIndex, Number(step));
    renderCards(`[data-slot="${slotIndex}"] [data-action="voicing"][data-step="${step}"]`);
    const card = workspace.cards[slotIndex];
    setMessage(`Chord ${slotIndex + 1}, voicing ${card.voicingIndex + 1} of ${card.voicings.length}.`);
  }
});

applyGeneration(seedInput.valueAsNumber);

playButton.addEventListener("click", () => void playGrip());
stopButton.addEventListener("click", () => {
  audio.stop();
  if (!playButton.disabled) playButton.focus();
});
window.addEventListener("pagehide", () => audio.stop());
