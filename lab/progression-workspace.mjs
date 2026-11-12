import { formatNote, parseNote } from "./engine/index.js";
import { chordDiagramModel } from "./progression/voicings.js";
import { generateWorkspace, toggleChordLock } from "./progression/workspace.js";
import { renderChordDiagram } from "./progression-diagram.mjs";
import { renderScaleBoard } from "./progression-fretboard.mjs";
import { resolveGenerateChoice } from "./progression-selection.mjs";
import { ProgressionAudio } from "./progression-audio.mjs";

const modes = { major: "major", naturalMinor: "natural minor", mixolydian: "Mixolydian" };
const families = { open: "Open shape", "e-barre": "E-shape barre", "a-barre": "A-shape barre" };
const qualities = { major: "major", minor: "minor", diminished: "diminished", augmented: "augmented" };
const noteText = (value) => value.replaceAll("#", "♯").replaceAll("b", "♭");

const form = document.querySelector("#generate-form");
const tonicInput = document.querySelector("#tonic");
const modeInput = document.querySelector("#mode");
const shapeInput = document.querySelector("#shape-filter");
const tempoValue = document.querySelector("#tempo-value");
const fretboard = document.querySelector("#fretboard");
const fretboardTitle = document.querySelector("#fretboard-title");
const fretboardDescription = document.querySelector("#fretboard-description");
const message = document.querySelector("#form-message");
const contextHeading = document.querySelector("#context-heading");
const scaleNotes = document.querySelector("#scale-notes");
const cardsElement = document.querySelector("#progression-cards");
const tempoInput = document.querySelector("#tempo");
const playButton = document.querySelector("#play-progression");
const stopButton = document.querySelector("#stop-progression");
const transportMessage = document.querySelector("#transport-message");
const audio = new ProgressionAudio();
let animationFrame = null;
let workspace;
let selectedCard = 0;
let boardView = "scale";
let audioStatusTicket = 0;

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

function randomUint32() {
  return globalThis.crypto?.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 4294967296);
}

function visibleIndices(card) {
  return card.voicings.flatMap((voicing, index) => {
    const filter = shapeInput.value;
    const allowed = filter === "all" || (filter === "open" && voicing.shapeFamily === "open") ||
      (filter === "barre" && voicing.shapeFamily !== "open");
    return allowed ? [index] : [];
  });
}

function visibleCard(card) {
  const indices = visibleIndices(card);
  const index = indices.includes(card.voicingIndex) ? card.voicingIndex : indices[0];
  return index === undefined ? { ...card, voicings: [], voicingIndex: 0 } : {
    ...card, voicings: indices.map((i) => card.voicings[i]), voicingIndex: indices.indexOf(index),
  };
}

function cycleAvailableVoicing(slotIndex, direction) {
  const card = workspace.cards[slotIndex];
  const indices = visibleIndices(card);
  if (indices.length < 2) return;
  const oldIndex = indices.includes(card.voicingIndex) ? card.voicingIndex : indices[0];
  const newIndex = indices[(indices.indexOf(oldIndex) + direction + indices.length) % indices.length];
  workspace = {
    ...workspace,
    cards: workspace.cards.map((entry, index) => index === slotIndex
      ? { ...entry, voicingIndex: newIndex } : entry),
  };
}

function updatePlayAvailability() {
  playButton.disabled = !workspace || workspace.cards.some((card) => visibleIndices(card).length === 0);
}

function renderBoard() {
  if (!workspace) return;
  const scale = workspace.scale;
  const chord = workspace.cards[selectedCard].slot.chord;
  const root = noteText(formatNote(workspace.context.tonic));
  fretboardTitle.textContent = boardView === "scale"
    ? root + " " + modes[workspace.context.mode] + " scale"
    : noteText(workspace.cards[selectedCard].slot.symbol) + " chord tones";
  fretboardDescription.textContent = boardView === "scale"
    ? "Scale degrees across six strings"
    : "Chord " + (selectedCard + 1) + ". Select another chord card to change the highlighted notes.";
  for (const view of ["scale", "chords"]) {
    const button = document.querySelector(view === "scale" ? "#show-scale" : "#show-chords");
    button.classList.toggle("selected", boardView === view);
    button.setAttribute("aria-pressed", String(boardView === view));
  }
  renderScaleBoard(fretboard, scale, chord, boardView, (note) => {
    stopPlayback();
    const ticket = ++audioStatusTicket;
    transportMessage.textContent = "Loading acoustic note…";
    audio.audition({ voicingIndex: 0, voicings: [{ notes: [note] }] }).then((played) => {
      if (played && ticket === audioStatusTicket) transportMessage.textContent = note.note + " sounded.";
    }).catch((problem) => {
      if (ticket === audioStatusTicket) transportMessage.textContent = problem.message;
    });
  });
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
        <button type="button" class="chord-select" data-action="select" aria-label="Show chord ${number} tones: ${spokenChord}">${title}</button>
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
      <button class="audition-button" type="button" data-action="audition" aria-label="Hear chord ${number}, ${spokenChord}">Hear chord</button>
    ` : `<p class="unsupported">No guitar grip is available for this chord. Its tones are shown above.</p>`}
  </li>`;
}

function renderCards(restoreFocus) {
  cardsElement.innerHTML = workspace.cards.map(visibleCard).map(renderCard).join("");
  if (restoreFocus) {
    cardsElement.querySelector(restoreFocus)?.focus({ preventScroll: true });
  }
}

function paintTransport() {
  const active = audio.activeSlot();
  cardsElement.querySelectorAll(".chord-card").forEach((card) => {
    const selected = audio.isPlaying() && Number(card.dataset.slot) === active;
    card.dataset.playing = String(selected);
  });
  stopButton.disabled = !audio.isPlaying();
}

function monitorTransport() {
  paintTransport();
  if (audio.isPlaying()) animationFrame = requestAnimationFrame(monitorTransport);
  else animationFrame = null;
}

function stopPlayback() {
  audioStatusTicket++;
  audio.stop();
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  paintTransport();
}

function applyGeneration() {
  const locks = workspace?.cards.filter(({ slot }) => slot.isLocked).length ?? 0;
  const previous = workspace ? {
    tonic: formatNote(workspace.context.tonic),
    mode: workspace.context.mode,
  } : null;
  const attempts = shapeInput.value === "open" && !locks && tonicInput.value === "all" ? 80 : 1;
  let result;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const choice = resolveGenerateChoice({
      keyChoice: tonicInput.value,
      modeChoice: modeInput.value,
      lockedCount: locks,
      previous,
      randomUint32,
    });
    result = generateWorkspace({
      tonic: parseNote(choice.tonic), mode: choice.mode, seed: choice.seed,
    }, workspace);
    if (!result.ok || shapeInput.value !== "open") break;
    if (result.data.cards.every((card) => card.voicings.some((v) => v.shapeFamily === "open"))) break;
  }
  if (!result.ok) {
    const recovery = result.error.code === "LOCK_OUT_OF_MODE"
      ? " Unlock that chord or choose another key and mode." : "";
    setMessage(result.error.message + "." + recovery + " Your current progression is still available.", true);
    return;
  }
  stopPlayback();
  workspace = result.data;
  selectedCard = 0;
  updatePlayAvailability();
  transportMessage.textContent = playButton.disabled
    ? "Some chords have no matching shape. Try Open and barre to enable playback."
    : "Ready. Play the progression, or tap a chord to hear it.";
  const { context, scale } = workspace;
  contextHeading.textContent = noteText(formatNote(context.tonic)) + " " + modes[context.mode];
  scaleNotes.textContent = scale.tones.map(({ note }) => noteText(formatNote(note))).join(" · ");
  renderCards();
  renderBoard();
  const lockCount = workspace.cards.filter(({ slot }) => slot.isLocked).length;
  setMessage(lockCount
    ? "Kept " + lockCount + " locked " + (lockCount === 1 ? "chord." : "chords.")
    : "New progression. Press Play, or explore the fretboard.");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { applyGeneration(); } catch (problem) { setMessage(problem.message, true); }
});

document.querySelector("#reset-workspace").addEventListener("click", () => {
  stopPlayback();
  workspace = undefined;
  tonicInput.value = "all";
  modeInput.value = "auto";
  shapeInput.value = "all";
  tempoInput.value = "92";
  tempoValue.textContent = "92 BPM";
  applyGeneration();
});

shapeInput.addEventListener("change", () => {
  stopPlayback();
  if (!workspace) return;
  renderCards();
  updatePlayAvailability();
  transportMessage.textContent = playButton.disabled
    ? "This shape filter excludes at least one chord. Try Open and barre."
    : "Chord shapes updated.";
});

tempoInput.addEventListener("input", () => {
  tempoValue.textContent = tempoInput.value + " BPM";
  if (audio.isPlaying()) {
    stopPlayback();
    transportMessage.textContent = "Tempo changed. Press Play to restart the loop.";
  }
});

document.querySelector("#show-scale").addEventListener("click", () => {
  boardView = "scale";
  renderBoard();
});
document.querySelector("#show-chords").addEventListener("click", () => {
  boardView = "chords";
  renderBoard();
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
  } else if (action === "voicing") {
    stopPlayback();
    cycleAvailableVoicing(slotIndex, Number(step));
    renderCards(`[data-slot="${slotIndex}"] [data-action="voicing"][data-step="${step}"]`);
    const card = workspace.cards[slotIndex];
    setMessage(`Chord ${slotIndex + 1}, voicing ${card.voicingIndex + 1} of ${card.voicings.length}.`);
  } else if (action === "audition") {
    stopPlayback();
    const card = visibleCard(workspace.cards[slotIndex]);
    const ticket = ++audioStatusTicket;
    transportMessage.textContent = "Loading acoustic guitar…";
    audio.audition(card).then((played) => {
      if (played && ticket === audioStatusTicket) transportMessage.textContent = `Heard chord ${slotIndex + 1}: ${noteText(card.slot.symbol)}.`;
    }).catch((problem) => {
      if (ticket === audioStatusTicket) transportMessage.textContent = problem.message;
    });
  } else if (action === "select") {
    selectedCard = slotIndex;
    boardView = "chords";
    renderCards("[data-slot=\""+slotIndex+"\"] [data-action=\"select\"]");
    renderBoard();
  }
});

playButton.addEventListener("click", async () => {
  if (!workspace) return;
  stopPlayback();
  const ticket = ++audioStatusTicket;
  transportMessage.textContent = "Loading acoustic guitar…";
  try {
    const started = await audio.play(workspace.cards.map(visibleCard), tempoInput.valueAsNumber);
    if (!started || ticket !== audioStatusTicket) return;
    transportMessage.textContent = "Playing four-chord loop. Stop before editing the progression.";
    monitorTransport();
  } catch (problem) {
    if (ticket === audioStatusTicket) transportMessage.textContent = problem.message;
    paintTransport();
  }
});

stopButton.addEventListener("click", () => {
  stopPlayback();
  transportMessage.textContent = "Playback stopped.";
});

window.addEventListener("pagehide", () => stopPlayback());
applyGeneration();
