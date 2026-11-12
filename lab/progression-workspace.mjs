import { formatNote, parseNote } from "./engine/index.js";
import { chordDiagramModel } from "./progression/voicings.js";
import { cycleChordVoicing, generateWorkspace, toggleChordLock } from "./progression/workspace.js";
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
  audio.stop();
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  paintTransport();
}

function applyGeneration(seed) {
  const result = generateWorkspace({ tonic: parseNote(tonicInput.value), mode: modeInput.value, seed }, workspace);
  if (!result.ok) {
    const keep = workspace ? " The current progression is still available." : "";
    const recovery = result.error.code === "LOCK_OUT_OF_MODE" ? " Unlock that chord or choose another key and mode." : "";
    setMessage(result.error.message + "." + recovery + keep, true);
    return;
  }

  stopPlayback();
  const prior = workspace;
  workspace = result.data;
  playButton.disabled = !workspace.cards.every((card) => card.voicings.length > 0);
  transportMessage.textContent = playButton.disabled
    ? "At least one chord has no supported guitar grip. Playback is unavailable for this progression."
    : "Ready. Play the four-chord loop or use Hear chord on an individual card.";
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
  } else if (action === "voicing") {
    stopPlayback();
    workspace = cycleChordVoicing(workspace, slotIndex, Number(step));
    renderCards(`[data-slot="${slotIndex}"] [data-action="voicing"][data-step="${step}"]`);
    const card = workspace.cards[slotIndex];
    setMessage(`Chord ${slotIndex + 1}, voicing ${card.voicingIndex + 1} of ${card.voicings.length}.`);
  } else if (action === "audition") {
    stopPlayback();
    const card = workspace.cards[slotIndex];
    audio.audition(card).then((played) => {
      if (played) transportMessage.textContent = `Heard chord ${slotIndex + 1}: ${noteText(card.slot.symbol)}.`;
    }).catch((problem) => {
      transportMessage.textContent = problem.message;
    });
  }
});

playButton.addEventListener("click", async () => {
  if (!workspace) return;
  stopPlayback();
  try {
    const started = await audio.play(workspace.cards, tempoInput.valueAsNumber);
    if (!started) return;
    transportMessage.textContent = "Playing four-chord loop. Stop before editing the progression.";
    monitorTransport();
  } catch (problem) {
    transportMessage.textContent = problem.message;
    paintTransport();
  }
});

stopButton.addEventListener("click", () => {
  stopPlayback();
  transportMessage.textContent = "Playback stopped.";
});

window.addEventListener("pagehide", () => stopPlayback());
applyGeneration(seedInput.valueAsNumber);
