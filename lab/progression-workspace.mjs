import { buildScale, formatNote, getNoteAt, parseNote, STANDARD_FRETBOARD } from "./engine/index.js";
import { getCagedPosition } from "./progression/caged.js";
import { chordDiagramModel, getPlayableVoicings } from "./progression/voicings.js";
import { generateWorkspace, matchesVoicingFilter, moveWorkspaceChord, replaceWorkspaceChord, toggleChordLock } from "./progression/workspace.js";
import { listProgressionChoices, listProgressionVariants } from "./progression/generator.js";
import { renderChordDiagram } from "./progression-diagram.mjs";
import { renderScaleBoard } from "./progression-fretboard.mjs";
import { listGenerateChoices } from "./progression-selection.mjs";
import { DEFAULT_MIX, ProgressionAudio } from "./progression-audio.mjs";
import { snapshotProgression } from "./progression-library.mjs";
import { connectProgressionLibrary } from "./progression-library-view.mjs";
import { groovesForMeter } from "./progression-grooves.mjs";
import { rhythmPlan, patternsForMeter, DEFAULT_PATTERN, METERS } from "./progression-rhythm.mjs";

const modes = { major: "major", naturalMinor: "natural minor", dorian: "Dorian", phrygian: "Phrygian", lydian: "Lydian", mixolydian: "Mixolydian", locrian: "Locrian" };
const families = { open: "Open shape", "e-barre": "E-shape barre", "a-barre": "A-shape barre", triad: "Three-string triad", compact: "Compact grip" };
const qualities = { major: "major", minor: "minor", diminished: "diminished", augmented: "augmented",
  major7: "major seventh", dominant7: "dominant seventh", minor7: "minor seventh",
  halfDiminished7: "half diminished seventh", sus2: "suspended second", sus4: "suspended fourth", add9: "add nine" };
const noteText = (value) => value.replaceAll("#", "♯").replaceAll("b", "♭");

const form = document.querySelector("#generate-form");
const advancedSettings = document.querySelector("#advanced-settings");
const quickControls = document.querySelector("#quick-controls");
for (const id of ["tonic", "mode", "style", "meter", "drum-groove", "guitar-tone", "shape-filter", "tempo"]) {
  const field = document.getElementById(id)?.closest(".field");
  if (!field) throw new Error("Missing quick setting: " + id);
  quickControls.append(field);
}
const settingsSwitch = form.querySelector(".settings-switch");
const tonicInput = document.querySelector("#tonic");
const modeInput = document.querySelector("#mode");
const shapeInput = document.querySelector("#shape-filter");
const styleInput = document.querySelector("#style");
const moodInput = document.querySelector("#mood");
const colorInput = document.querySelector("#chord-color");
const toneInput = document.querySelector("#guitar-tone");
const countInput = document.querySelector("#chord-length");
const chordCount = document.querySelector("#chord-count");
const tempoValue = document.querySelector("#tempo-value");
const meterInput = document.querySelector("#meter");
const patternInput = document.querySelector("#strum-pattern");
const grooveInput = document.querySelector("#drum-groove");
const tempoUnit = document.querySelector("#tempo-unit");
const strumDescription = document.querySelector("#strum-description");
const fretboard = document.querySelector("#fretboard");
const fretboardTitle = document.querySelector("#fretboard-title");
const fretboardDescription = document.querySelector("#fretboard-description");
const cagedControls = document.querySelector("#caged-positions");
const scaleLayerInput = document.querySelector("#scale-layer");
const scaleLayerControl = document.querySelector("#scale-layer-control");
const keyChordsGrid = document.querySelector("#key-chords-grid");
const diagramLabels = document.querySelector("#diagram-labels");
const diagramHighlight = document.querySelector("#diagram-highlight");
const fretLabels = document.querySelector("#fretboard-labels");
const fretHighlights = document.querySelector("#fretboard-highlights");
const zoomDialog = document.querySelector("#chord-zoom");
const zoomTitle = document.querySelector("#chord-zoom-title");
const zoomDiagram = document.querySelector("#chord-zoom-diagram");
const zoomCount = document.querySelector("#chord-zoom-count");
const scalePlayMode = document.querySelector("#scale-play-mode");
const scalePlayButton = document.querySelector("#play-scale");
const scaleStopButton = document.querySelector("#stop-scale");
const scaleMessage = document.querySelector("#scale-practice-message");
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
let boardPosition = "full";
let zoomCardIndex = 0;
let keyPreviewDegree = 1;
let dragFromIndex = null;
let audioStatusTicket = 0;
let audioPending = false;
let loopRequested = false;

function beginAudio(text) {
  stopPlayback();
  audioPending = true;
  transportMessage.textContent = text;
  paintTransport();
  return ++audioStatusTicket;
}

function finishAudio(ticket, text) {
  if (ticket !== audioStatusTicket) return false;
  audioPending = false;
  transportMessage.textContent = text;
  monitorTransport();
  return true;
}

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
  return card.voicings.flatMap((voicing, index) => matchesVoicingFilter(voicing, shapeInput.value) ? [index] : []);
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
  const { tonic, mode } = workspace.context;
  const layer = scaleLayerInput.value;
  const scale = layer === "context" ? workspace.scale : buildScale({ tonic, scaleId: layer });
  const keyChoices = listProgressionChoices(tonic, mode);
  const selectedKeyChord = keyChoices[keyPreviewDegree - 1] ?? keyChoices[0];
  const chord = boardView === "key" ? selectedKeyChord.chord : workspace.cards[selectedCard].slot.chord;
  const root = noteText(formatNote(tonic));
  const gripQuality = layer === "majorPentatonic" ? "major" : layer === "minorPentatonic" ? "minor"
    : ["major", "lydian", "mixolydian"].includes(mode) ? "major" : mode === "locrian" ? "reference" : "minor";
  const position = boardPosition === "full" ? undefined : getCagedPosition(tonic, boardPosition, gripQuality);
  const scaleName = layer === "context" ? modes[mode] + " scale"
    : layer === "majorPentatonic" ? "major pentatonic" : "minor pentatonic";
  fretboardTitle.textContent = boardView === "scale" ? root + " " + scaleName
    : boardView === "key" ? root + " " + modes[mode] + " key chords"
    : noteText(workspace.cards[selectedCard].slot.symbol) + " chord tones";
  const description = boardView === "scale" ? "Scale degrees across six strings."
    : boardView === "key" ? "Seven triads harmonized from this scale. Select a chord below to inspect its notes."
    : "Chord " + (selectedCard + 1) + " in the " + root + " " + modes[mode] + " progression.";
  const positionDescription = position ? " " + position.family + " form, frets " + position.fromFret + "–" + position.toFret + "." : "";
  const gripDescription = position && boardView === "scale"
    ? gripQuality === "reference" ? " Locrian uses the form as a position reference." : " Outlines mark the tonic grip."
    : "";
  fretboardDescription.textContent = description + positionDescription + gripDescription;
  scaleLayerControl.hidden = boardView !== "scale";
  keyChordsGrid.hidden = boardView !== "key";
  if (boardView === "key") {
    keyChordsGrid.innerHTML = keyChoices.map((choice) =>
      '<button type="button" data-degree="' + choice.degree +
      '" aria-pressed="' + (choice.degree === keyPreviewDegree) + '">' +
      choice.romanNumeral + ' · ' + noteText(choice.symbol) + '</button>').join("");
  }
  for (const button of cardsElement.querySelectorAll("[data-action=select]")) {
    button.setAttribute("aria-pressed", String(boardView === "chords" && Number(button.closest("[data-slot]").dataset.slot) === selectedCard));
  }
  for (const button of cagedControls.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.position === boardPosition));
  }
  for (const view of ["scale", "key", "chords"]) {
    const button = document.querySelector(view === "scale" ? "#show-scale"
      : view === "key" ? "#show-key-chords" : "#show-chords");
    button.classList.toggle("selected", boardView === view);
    button.setAttribute("aria-pressed", String(boardView === view));
  }
  renderScaleBoard(fretboard, scale, chord, boardView === "scale" ? "scale" : "chords", (note) => {
    const ticket = beginAudio("Loading acoustic note…");
    audio.audition({ voicingIndex: 0, voicings: [{ notes: [note] }] }).then((played) => {
      if (played) finishAudio(ticket, note.note + " sounded.");
    }).catch((problem) => finishAudio(ticket, problem.message));
  }, position, {
    labels: fretLabels.value, highlight: fretHighlights.value, modeName: mode,
  });
}

document.querySelector("#show-key-chords").addEventListener("click", () => {
  boardView = "key";
  renderBoard();
});
keyChordsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-degree]");
  if (!button || !workspace) return;
  keyPreviewDegree = Number(button.dataset.degree);
  renderBoard();
  keyChordsGrid.querySelector('[data-degree="' + keyPreviewDegree + '"]')?.focus();
  const choice = listProgressionChoices(workspace.context.tonic, workspace.context.mode)[keyPreviewDegree - 1];
  const voicing = getPlayableVoicings(choice.chord)[0];
  if (!voicing) {
    setMessage("The selected chord has no supported guitar grip.", true);
    return;
  }
  const ticket = beginAudio("Loading key chord…");
  audio.audition({ voicingIndex: 0, voicings: [voicing] }).then((played) => {
    if (played) finishAudio(ticket, "Heard " + noteText(choice.symbol) + " from the selected key.");
  }).catch((problem) => finishAudio(ticket, problem.message));
});
for (const control of [fretLabels, fretHighlights]) {
  control.addEventListener("change", () => {
    if (workspace) renderBoard();
  });
}

function chordChoiceValue(degree, chordId) {
  return ["major", "minor", "diminished", "augmented"].includes(chordId) ? String(degree) : degree + ":" + chordId;
}

function renderCard({ slot, voicings, voicingIndex }, choices) {
  const { chord, symbol, romanNumeral, isLocked, slotIndex } = slot;
  const title = noteText(symbol);
  const spokenChord = noteText(formatNote(chord.root)) + " " + qualities[chord.chordId];
  const voicing = voicings[voicingIndex];
  const number = slotIndex + 1;
  const currentChoice = chordChoiceValue(slot.degree, chord.chordId);
  const bass = voicing?.inversion ? " · " + noteText(formatNote(chord.tones[voicing.inversion].note)) + " bass" : "";
  const diagram = voicing ? renderChordDiagram(chordDiagramModel(voicing), spokenChord, {
    chord, voicing, labels: diagramLabels.value, highlight: diagramHighlight.value,
  }) : "";
  return `<li class="chord-card" draggable="true" data-slot="${slotIndex}" data-chord="${title}">
    <div class="card-heading">
      <div class="card-identity">
        <p class="card-roman">${romanNumeral}</p>
        <button type="button" class="chord-select" data-action="select" aria-pressed="${boardView === "chords" && selectedCard === slotIndex}" aria-label="Show chord ${number} tones: ${spokenChord}">${title}</button>
      </div>
      <button class="lock-button" type="button" data-action="lock" aria-label="Lock chord ${number}, ${spokenChord}" aria-pressed="${isLocked}">
        ${isLocked ? "Locked" : "Lock"}
      </button>
    </div>
    <p class="chord-tones">${chord.tones.map(({ note }) => noteText(formatNote(note))).join(" · ")}</p>
    <div class="chord-edit">
      <label for="chord-choice-${slotIndex}">Replace chord</label>
      <select id="chord-choice-${slotIndex}" data-action="replace" aria-label="Replace chord ${number} with another chord in this mode">
        ${choices.filter(({ value, playable }) => playable || value === currentChoice)
          .map((choice) => `<option value="${choice.value}" ${choice.value === currentChoice ? "selected" : ""}>${choice.romanNumeral} · ${noteText(choice.symbol)}</option>`).join("")}
      </select>
    </div>
    ${voicing ? `
      <div class="diagram-wrap" data-voicing="${voicing.id}">${diagram}</div>
      <div class="voicing-nav">
        <button type="button" data-action="voicing" data-step="-1" aria-label="Previous voicing for chord ${number}" ${voicings.length < 2 ? "disabled" : ""}>‹</button>
        <p><strong>${families[voicing.shapeFamily]}${bass}</strong><span>${voicingIndex + 1} of ${voicings.length}</span></p>
        <button type="button" data-action="voicing" data-step="1" aria-label="Next voicing for chord ${number}" ${voicings.length < 2 ? "disabled" : ""}>›</button>
      </div>
      <button class="audition-button" type="button" data-action="audition" aria-label="Hear chord ${number}, ${spokenChord}">Hear chord</button>
    ` : `<p class="unsupported">No guitar grip is available for this chord. Its tones are shown above.</p>`}
    <div class="card-tools" aria-label="Reorder and enlarge chord ${number}">
      <button type="button" data-action="zoom" aria-label="Enlarge chord ${number} diagram">⛶ Expand</button>
      <button type="button" data-action="move" data-step="-1" aria-label="Move chord ${number} left" ${slotIndex === 0 ? "disabled" : ""}>←</button>
      <button type="button" data-action="move" data-step="1" aria-label="Move chord ${number} right" ${slotIndex === workspace.cards.length - 1 ? "disabled" : ""}>→</button>
      <span class="drag-hint" aria-hidden="true">⋮⋮</span>
    </div>
  </li>`;
}

function renderCards(restoreFocus) {
  const choices = listProgressionVariants(workspace.context.tonic, workspace.context.mode)
    .slice().sort((a, b) => a.degree - b.degree).map((choice) => ({
      ...choice,
      value: chordChoiceValue(choice.degree, choice.chord.chordId),
      playable: getPlayableVoicings(choice.chord).some((grip) => matchesVoicingFilter(grip, shapeInput.value)),
    }));
  cardsElement.innerHTML = workspace.cards.map(visibleCard).map((card) => renderCard(card, choices)).join("");
  window.dispatchEvent(new Event("progression-changed"));
  if (restoreFocus) {
    cardsElement.querySelector(restoreFocus)?.focus({ preventScroll: true });
  }
}

function openChordZoom(index) {
  if (!workspace || index < 0 || index >= workspace.cards.length) return;
  zoomCardIndex = index;
  const card = visibleCard(workspace.cards[index]);
  const voicing = card.voicings[card.voicingIndex];
  zoomTitle.textContent = "Chord " + (index + 1) + " · " + noteText(card.slot.symbol);
  zoomCount.textContent = (index + 1) + " of " + workspace.cards.length;
  zoomDiagram.innerHTML = voicing
    ? renderChordDiagram(chordDiagramModel(voicing),
        noteText(formatNote(card.slot.chord.root)) + " " + qualities[card.slot.chord.chordId], {
          chord: card.slot.chord, voicing,
          labels: diagramLabels.value, highlight: diagramHighlight.value,
        })
    : "<p>No guitar grip for this chord under the current shape filter.</p>";
  document.querySelector("#chord-zoom-prev").disabled = index === 0;
  document.querySelector("#chord-zoom-next").disabled = index === workspace.cards.length - 1;
  if (!zoomDialog.open) zoomDialog.showModal();
}

document.querySelector("#close-chord-zoom").addEventListener("click", () => zoomDialog.close());
document.querySelector("#chord-zoom-prev").addEventListener("click", () => openChordZoom(zoomCardIndex - 1));
document.querySelector("#chord-zoom-next").addEventListener("click", () => openChordZoom(zoomCardIndex + 1));
zoomDialog.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const next = zoomCardIndex + (event.key === "ArrowLeft" ? -1 : 1);
    if (next >= 0 && next < workspace.cards.length) {
      event.preventDefault();
      openChordZoom(next);
    }
  }
});
let zoomTouchX = null;
zoomDialog.addEventListener("touchstart", (event) => {
  zoomTouchX = event.changedTouches[0]?.clientX ?? null;
}, { passive: true });
zoomDialog.addEventListener("touchend", (event) => {
  if (zoomTouchX === null) return;
  const delta = (event.changedTouches[0]?.clientX ?? zoomTouchX) - zoomTouchX;
  zoomTouchX = null;
  if (Math.abs(delta) > 60) {
    const next = zoomCardIndex + (delta < 0 ? 1 : -1);
    if (next >= 0 && next < workspace.cards.length) openChordZoom(next);
  }
}, { passive: true });
for (const control of [diagramLabels, diagramHighlight]) control.addEventListener("change", () => {
  if (!workspace) return;
  renderCards();
  if (zoomDialog.open) openChordZoom(zoomCardIndex);
});

function moveCard(fromIndex, toIndex) {
  if (!workspace || fromIndex === toIndex) return;
  stopPlayback();
  workspace = moveWorkspaceChord(workspace, fromIndex, toIndex);
  if (selectedCard === fromIndex) selectedCard = toIndex;
  else if (fromIndex < selectedCard && selectedCard <= toIndex) selectedCard--;
  else if (toIndex <= selectedCard && selectedCard < fromIndex) selectedCard++;
  showWorkspace(workspace, selectedCard);
  setMessage("Moved chord " + (fromIndex + 1) + " to position " + (toIndex + 1) + ". Locks and grips were preserved.");
}

cardsElement.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".chord-card");
  if (!card) return;
  dragFromIndex = Number(card.dataset.slot);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragFromIndex));
  card.classList.add("dragging");
});
cardsElement.addEventListener("dragover", (event) => {
  if (dragFromIndex !== null && event.target.closest(".chord-card")) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
});
cardsElement.addEventListener("drop", (event) => {
  if (dragFromIndex === null) return;
  const card = event.target.closest(".chord-card");
  if (!card) return;
  event.preventDefault();
  const from = dragFromIndex;
  dragFromIndex = null;
  moveCard(from, Number(card.dataset.slot));
});
cardsElement.addEventListener("dragend", () => {
  dragFromIndex = null;
  cardsElement.querySelectorAll(".dragging").forEach((card) => card.classList.remove("dragging"));
});

function paintTransport() {
  const active = audio.activeSlot();
  const playing = audio.isPlaying();
  cardsElement.querySelectorAll(".chord-card").forEach((card) => {
    const selected = playing && Number(card.dataset.slot) === active;
    if (card.dataset.playing === String(selected)) return;
    card.dataset.playing = String(selected);
    if (selected) card.setAttribute("aria-current", "step");
    else card.removeAttribute("aria-current");
  });
  const label = playing ? "Pause" : audio.isPaused() ? "Resume" : "Play";
  const text = (playing ? "Ⅱ " : "▶ ") + label;
  if (playButton.textContent !== text) {
    playButton.textContent = text;
    playButton.setAttribute("aria-label", label + " progression");
  }
  stopButton.disabled = !audioPending && !audio.isActive() && !audio.isPaused();
}

function monitorTransport() {
  paintTransport();
  if (audio.isActive()) animationFrame = requestAnimationFrame(monitorTransport);
  else animationFrame = null;
}

function cancelTransportAnimation() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function stopPlayback() {
  audioStatusTicket++;
  audioPending = false;
  loopRequested = false;
  audio.stop();
  cancelTransportAnimation();
  paintTransport();
}

function applyGeneration() {
  const locks = workspace?.cards.filter(({ slot }) => slot.isLocked).length ?? 0;
  const previous = workspace ? {
    tonic: formatNote(workspace.context.tonic),
    mode: workspace.context.mode,
  } : null;
  const choices = listGenerateChoices({
    keyChoice: tonicInput.value, modeChoice: modeInput.value, lockedCount: locks, previous, randomUint32,
  });
  let result;
  for (const choice of choices) {
    result = generateWorkspace({
      tonic: parseNote(choice.tonic), mode: choice.mode, seed: choice.seed,
      length: Number(countInput.value), style: styleInput.value, mood: moodInput.value,
      shapeFilter: shapeInput.value, color: colorInput.value,
    }, workspace);
    if (result.ok || locks || result.error.code !== "NO_PLAYABLE_CHORDS") break;
  }
  if (!result.ok) {
    const recovery = result.error.code === "LOCK_OUT_OF_MODE"
      ? " Unlock that chord or choose another key and mode." : "";
    setMessage(result.error.message + "." + recovery + " Your current progression is still available.", true);
    return;
  }
  showWorkspace(result.data);
  const lockCount = workspace.cards.filter(({ slot }) => slot.isLocked).length;
  setMessage(lockCount
    ? "Kept " + lockCount + " locked " + (lockCount === 1 ? "chord." : "chords.")
    : "New progression. Press Play, or explore the fretboard.");
}

function showWorkspace(next, selected = 0) {
  stopPlayback();
  if (zoomDialog.open) zoomDialog.close();
  workspace = next;
  selectedCard = selected;
  updatePlayAvailability();
  transportMessage.textContent = playButton.disabled
    ? "Some chords have no matching shape. Try All playable shapes to enable playback."
    : "Ready. Play the progression, or tap a chord to hear it.";
  const { context, scale } = workspace;
  contextHeading.textContent = noteText(formatNote(context.tonic)) + " " + modes[context.mode];
  scaleNotes.textContent = scale.tones.map(({ note }) => noteText(formatNote(note))).join(" · ");
  chordCount.textContent = workspace.cards.length + " chords";
  renderCards();
  renderBoard();
}

function showSettings(view) {
  for (const button of settingsSwitch.querySelectorAll("button[data-settings]")) {
    const selected = button.dataset.settings === view;
    button.setAttribute("aria-pressed", String(selected));
    document.getElementById(button.getAttribute("aria-controls")).hidden = !selected;
  }
}
settingsSwitch.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-settings]");
  if (button) showSettings(button.dataset.settings);
});

function updatePatternControls(preferred = patternInput.value) {
  const choices = patternsForMeter(meterInput.value);
  patternInput.replaceChildren(...choices.map((pattern) => {
    const option = document.createElement("option");
    option.value = pattern.id;
    option.textContent = pattern.name;
    return option;
  }));
  patternInput.value = choices.some((pattern) => pattern.id === preferred) ? preferred : DEFAULT_PATTERN[meterInput.value];
  tempoUnit.textContent = METERS[meterInput.value].pulseUnit === "dotted-quarter"
    ? "(dotted-quarter BPM)" : "(quarter BPM)";
  const pattern = rhythmPlan(meterInput.value, patternInput.value, tempoInput.valueAsNumber);
  const directions = new Map(pattern.strokes.map(({ step, direction }) => [step, direction === "up" ? "↑" : "↓"]));
  strumDescription.textContent = Array.from({ length: pattern.stepsPerBar }, (_, step) => directions.get(step) ?? "·").join(" ") +
    "  (↓ down, ↑ up, · rest)";
}

function updateGrooveControls(preferred = grooveInput.value) {
  const grooves = groovesForMeter(meterInput.value);
  grooveInput.replaceChildren(...grooves.map(({ id, name }) => new Option(name, id)));
  grooveInput.value = !preferred ? "off"
    : grooves.some(({ id }) => id === preferred) ? preferred : grooves[1].id;
}

function rhythmChanged(text) {
  if (loopRequested) {
    void playLoop();
  } else {
    stopPlayback();
    transportMessage.textContent = text;
  }
}

function syncQuickTrackButtons() {
  for (const [track, selector] of [["drums", "#quick-drums"], ["guitar", "#quick-guitar"]]) {
    const button = document.querySelector(selector);
    const muted = document.querySelector("#" + track + "-mute").checked;
    button.setAttribute("aria-pressed", String(!muted));
    button.textContent = (track === "drums" ? "Rhythm" : "Chords") + (muted ? " off" : " on");
    button.title = (muted ? "Enable " : "Mute ") + track + " accompaniment";
  }
}

const trackControls = Object.keys(DEFAULT_MIX).map((track) => {
  const volume = document.querySelector("#" + track + "-volume");
  const mute = document.querySelector("#" + track + "-mute");
  const value = document.querySelector("#" + track + "-volume-value");
  const update = () => {
    value.textContent = volume.value + "%";
    audio.setTrackMix(track, volume.valueAsNumber / 100, mute.checked);
    syncQuickTrackButtons();
  };
  volume.addEventListener("input", update);
  mute.addEventListener("change", update);
  return { track, volume, mute, update };
});

for (const [track, selector] of [["drums", "#quick-drums"], ["guitar", "#quick-guitar"]]) {
  document.querySelector(selector).addEventListener("click", () => {
    const control = trackControls.find((candidate) => candidate.track === track);
    control.mute.checked = !control.mute.checked;
    control.update();
    transportMessage.textContent = (track === "drums" ? "Rhythm" : "Chords") +
      (control.mute.checked ? " muted." : " enabled.");
  });
}
document.querySelector("#quick-mix").addEventListener("click", () => {
  advancedSettings.open = true;
  showSettings("rhythm");
  document.querySelector("#guitar-volume").focus();
});
syncQuickTrackButtons();
toneInput.addEventListener("change", () => audio.setTone(toneInput.value));

meterInput.addEventListener("change", () => {
  updatePatternControls("");
  updateGrooveControls();
  rhythmChanged("Meter updated.");
});
patternInput.addEventListener("change", () => {
  updatePatternControls();
  rhythmChanged("Strum pattern updated.");
});
grooveInput.addEventListener("change", () => rhythmChanged("Drum groove updated."));

form.addEventListener("change", (event) => {
  if (event.target.closest("#chords-settings") && message.classList.contains("is-error")) setMessage("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { applyGeneration(); } catch (problem) { setMessage(problem.message, true); }
});

document.querySelector("#reset-workspace").addEventListener("click", () => {
  stopPlayback();
  workspace = undefined;
  showSettings("chords");
  tonicInput.value = "all";
  modeInput.value = "auto";
  shapeInput.value = "all";
  styleInput.value = "auto";
  moodInput.value = "any";
  colorInput.value = "triads";
  toneInput.value = "natural";
  audio.setTone("natural");
  countInput.value = "4";
  boardPosition = "full";
  boardView = "scale";
  scaleLayerInput.value = "context";
  meterInput.value = "4/4";
  tempoInput.value = "92";
  tempoValue.textContent = "92 BPM";
  updatePatternControls("");
  updateGrooveControls("off");
  for (const { track, volume, mute, update } of trackControls) {
    volume.value = String(Math.round(DEFAULT_MIX[track] * 100));
    mute.checked = false;
    update();
  }
  applyGeneration();
});

shapeInput.addEventListener("change", () => {
  stopPlayback();
  if (!workspace) return;
  renderCards();
  updatePlayAvailability();
  transportMessage.textContent = playButton.disabled
    ? "This shape filter excludes at least one chord. Try All playable shapes."
    : "Chord shapes updated.";
});

tempoInput.addEventListener("input", () => {
  tempoValue.textContent = tempoInput.value + " BPM";
});
tempoInput.addEventListener("change", () => rhythmChanged("Tempo updated."));

cagedControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-position]");
  if (!button) return;
  boardPosition = button.dataset.position;
  fretboard.parentElement.scrollLeft = 0;
  renderBoard();
});
scaleLayerInput.addEventListener("change", renderBoard);

document.querySelector("#show-scale").addEventListener("click", () => {
  boardView = "scale";
  renderBoard();
});
document.querySelector("#show-chords").addEventListener("click", () => {
  boardView = "chords";
  renderBoard();
});

cardsElement.addEventListener("change", (event) => {
  const select = event.target.closest('select[data-action="replace"]');
  if (!select || !workspace) return;
  const slotIndex = Number(select.closest("[data-slot]").dataset.slot);
  try {
    stopPlayback();
    const [degree, chordId] = select.value.split(":");
    workspace = replaceWorkspaceChord(workspace, slotIndex, Number(degree), chordId);
    selectedCard = slotIndex;
    boardView = "chords";
    renderCards('[data-slot="' + slotIndex + '"] [data-action="replace"]');
    renderBoard();
    updatePlayAvailability();
    const replaced = workspace.cards[slotIndex].slot;
    setMessage("Chord " + (slotIndex + 1) + " replaced with " + noteText(replaced.symbol) +
      ". It is locked, so the next Generate preserves it.");
    transportMessage.textContent = playButton.disabled
      ? "This chord has no playable guitar grip under the selected shape filter."
      : "Chord updated. Ready to play.";
  } catch (problem) {
    setMessage(problem.message, true);
  }
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
    const card = visibleCard(workspace.cards[slotIndex]);
    transportMessage.textContent = "Voicing updated. Ready to play.";
    setMessage(`Chord ${slotIndex + 1}, voicing ${card.voicingIndex + 1} of ${card.voicings.length}.`);
  } else if (action === "audition") {
    const card = visibleCard(workspace.cards[slotIndex]);
    const ticket = beginAudio("Loading acoustic guitar…");
    audio.audition(card).then((played) => {
      if (played) finishAudio(ticket, `Heard chord ${slotIndex + 1}: ${noteText(card.slot.symbol)}.`);
    }).catch((problem) => finishAudio(ticket, problem.message));
  } else if (action === "zoom") {
    openChordZoom(slotIndex);
  } else if (action === "move") {
    moveCard(slotIndex, slotIndex + Number(step));
    cardsElement.querySelector('[data-slot="' + (slotIndex + Number(step)) + '"] [data-action="move"][data-step="' + step + '"]')?.focus();
  } else if (action === "select") {
    selectedCard = slotIndex;
    boardView = "chords";
    renderCards("[data-slot=\""+slotIndex+"\"] [data-action=\"select\"]");
    renderBoard();
  }
});

async function playLoop() {
  if (!workspace || playButton.disabled) return;
  const ticket = beginAudio("Loading loop recordings…");
  loopRequested = true;
  try {
    const started = await audio.play(workspace.cards.map(visibleCard), tempoInput.valueAsNumber, {
      meter: meterInput.value, pattern: patternInput.value, groove: grooveInput.value,
    });
    if (started) finishAudio(ticket, "Playing loop · " + workspace.cards.length + " chords.");
  } catch (problem) {
    if (finishAudio(ticket, problem.message)) loopRequested = false;
  }
}

async function resumeLoop() {
  audioPending = true;
  loopRequested = true;
  const ticket = ++audioStatusTicket;
  try {
    const resumed = await audio.resume();
    if (resumed) finishAudio(ticket, "Playing loop · " + workspace.cards.length + " chords.");
  } catch (problem) {
    if (finishAudio(ticket, problem.message)) loopRequested = false;
  }
}

playButton.addEventListener("click", () => {
  if (audio.pause()) {
    loopRequested = false;
    cancelTransportAnimation();
    paintTransport();
    transportMessage.textContent = "Paused.";
  } else if (audio.isPaused()) {
    void resumeLoop();
  } else {
    void playLoop();
  }
});

stopButton.addEventListener("click", () => {
  stopPlayback();
  transportMessage.textContent = "Playback stopped.";
});

function captureProgression() {
  const mix = Object.fromEntries(trackControls.flatMap(({ track, volume, mute }) =>
    [[track, volume.valueAsNumber], [track + "Muted", mute.checked]]));
  const cards = workspace.cards.map((card) => {
    const visible = visibleCard(card);
    return visible.voicings.length ? visible : card;
  });
  const snapshot = snapshotProgression({ ...workspace, cards }, {
    keyAuto: tonicInput.value === "all", modeAuto: modeInput.value === "auto",
    style: styleInput.value, mood: moodInput.value, color: colorInput.value, shape: shapeInput.value,
    bpm: tempoInput.valueAsNumber, meter: meterInput.value, pattern: patternInput.value,
    groove: grooveInput.value, tone: toneInput.value, ...mix,
    view: boardView, position: boardPosition, layer: scaleLayerInput.value, selected: selectedCard,
  });
  return { workspace, snapshot };
}

function restoreSavedProgression({ workspace: saved, preferences }, { focus }) {
  tonicInput.value = preferences.keyAuto ? "all" : formatNote(saved.context.tonic);
  modeInput.value = preferences.modeAuto ? "auto" : saved.context.mode;
  countInput.value = String(saved.cards.length);
  styleInput.value = preferences.style;
  moodInput.value = preferences.mood;
  colorInput.value = preferences.color;
  shapeInput.value = preferences.shape;
  meterInput.value = preferences.meter;
  tempoInput.value = String(preferences.bpm);
  tempoValue.textContent = preferences.bpm + " BPM";
  updatePatternControls(preferences.pattern);
  updateGrooveControls(preferences.groove);
  toneInput.value = preferences.tone;
  audio.setTone(preferences.tone);
  for (const { track, volume, mute, update } of trackControls) {
    volume.value = String(preferences[track]);
    mute.checked = preferences[track + "Muted"];
    update();
  }
  boardView = preferences.view;
  boardPosition = preferences.position;
  scaleLayerInput.value = preferences.layer;
  fretboard.parentElement.scrollLeft = 0;
  showWorkspace(saved, preferences.selected);
  setMessage("");
  if (focus) contextHeading.focus();
}

document.addEventListener("visibilitychange", () => { if (!document.hidden) audio.fillSchedule(); });
window.addEventListener("pagehide", () => stopPlayback());
updatePatternControls("");
updateGrooveControls("off");
const shared = connectProgressionLibrary({ capture: captureProgression, restore: restoreSavedProgression });
if (!shared) applyGeneration();
