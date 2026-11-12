import { buildScale, formatNote, parseNote } from "./engine/index.js";
import { getCagedPosition, getScalePracticeNotes } from "./progression/caged.js";
import { chordDiagramModel, getPlayableVoicings } from "./progression/voicings.js";
import { generateWorkspace, matchesVoicingFilter, moveWorkspaceChord, replaceWorkspaceChord, toggleChordLock } from "./progression/workspace.js";
import { listProgressionChoices, listProgressionVariants } from "./progression/generator.js";
import { renderChordDiagram } from "./progression-diagram.mjs";
import { renderScaleBoard } from "./progression-fretboard.mjs";
import { listGenerateChoices } from "./progression-selection.mjs";
import { DEFAULT_MIX, ProgressionAudio } from "./progression-audio.mjs";
import { DEFAULT_EXPLORER, snapshotProgression } from "./progression-library.mjs";
import { connectProgressionLibrary } from "./progression-library-view.mjs";
import { connectGrooveEditor } from "./progression-groove-editor.mjs";
import { DEFAULT_RHYTHM_EDIT, groovesForMeter } from "./progression-grooves.mjs";
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
const grooveEditor = connectGrooveEditor(document.querySelector("#rhythm-settings"), (text) => {
  rhythmChanged(text);
  window.dispatchEvent(new Event("progression-changed"));
});
const tempoUnit = document.querySelector("#tempo-unit");
const strumDescription = document.querySelector("#strum-description");
const fretboard = document.querySelector("#fretboard");
const fretboardTitle = document.querySelector("#fretboard-title");
const fretboardDescription = document.querySelector("#fretboard-description");
const fretboardHint = document.querySelector("#fretboard-hint");
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
const zoomAudition = document.querySelector("#chord-zoom-audition");
const zoomStatus = document.querySelector("#chord-zoom-status");
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
let dropTarget = null;
let touchDrag = null;
let dragFrame = null;
let audioStatusTicket = 0;
let audioPending = false;
let loopRequested = false;
let scalePending = false;
let scaleRunning = false;
let scaleMarker = null;

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

function explorerContext() {
  const { tonic, mode } = workspace.context;
  const layer = scaleLayerInput.value;
  const scale = layer === "context" ? workspace.scale : buildScale({ tonic, scaleId: layer });
  const gripQuality = layer === "majorPentatonic" ? "major" : layer === "minorPentatonic" ? "minor"
    : ["major", "lydian", "mixolydian"].includes(mode) ? "major" : mode === "locrian" ? "reference" : "minor";
  const position = boardPosition === "full" ? undefined : getCagedPosition(tonic, boardPosition, gripQuality);
  return { tonic, mode, layer, scale, position, gripQuality };
}

function renderBoard() {
  if (!workspace) return;
  const { tonic, mode, layer, scale, position, gripQuality } = explorerContext();
  const keyChoices = listProgressionChoices(tonic, mode);
  const selectedKeyChord = keyChoices[keyPreviewDegree - 1] ?? keyChoices[0];
  const chord = boardView === "key" ? selectedKeyChord.chord : workspace.cards[selectedCard].slot.chord;
  const root = noteText(formatNote(tonic));
  const scaleName = layer === "context" ? modes[mode] + " scale"
    : layer === "majorPentatonic" ? "major pentatonic" : "minor pentatonic";
  fretboardTitle.textContent = boardView === "scale" ? root + " " + scaleName
    : boardView === "key" ? root + " " + modes[mode] + " key chords"
    : noteText(workspace.cards[selectedCard].slot.symbol) + " chord tones";
  const description = boardView === "scale" ? "Scale degrees across six strings."
    : boardView === "key" ? noteText(selectedKeyChord.symbol) + " · " + selectedKeyChord.romanNumeral + ". Select a diatonic chord to hear its grip."
    : "Chord " + (selectedCard + 1) + " in the " + root + " " + modes[mode] + " progression.";
  const positionDescription = position ? " " + position.family + " form, frets " + position.fromFret + "–" + position.toFret + "." : "";
  const gripDescription = position && boardView === "scale"
    ? gripQuality === "reference" ? " Locrian uses the form as a position reference." : " Outlines mark the tonic grip."
    : "";
  fretboardDescription.textContent = description + positionDescription + gripDescription;
  const highlightHint = boardView === "scale" && fretHighlights.value === "triad" ? " Olive marks the selected chord’s triad."
    : boardView === "scale" && fretHighlights.value === "modal" && layer === "context" && mode !== "major"
      ? " Purple marks the characteristic modal note." : "";
  fretboardHint.textContent = "Play a highlighted note or move with the arrow keys. Red marks the root." + highlightHint;
  scaleLayerControl.hidden = boardView !== "scale";
  document.querySelector("#scale-practice").hidden = boardView !== "scale";
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
    labels: fretLabels.value, highlight: fretHighlights.value, modeName: layer === "context" ? mode : null,
  });
  paintScaleNote();
  window.dispatchEvent(new Event("progression-changed"));
}

document.querySelector("#show-key-chords").addEventListener("click", () => {
  stopScale();
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

function stopScale() {
  if (scalePending || scaleRunning) stopPlayback();
}

scalePlayButton.addEventListener("click", async () => {
  if (!workspace) return;
  if (scalePending || scaleRunning) {
    stopScale();
    return;
  }
  const mode = scalePlayMode.value;
  if (mode === "all" && boardPosition !== "full") {
    boardPosition = "full";
    fretboard.parentElement.scrollLeft = 0;
    renderBoard();
  }
  const { scale, position } = explorerContext();
  const notes = getScalePracticeNotes(scale, position);
  if (!notes.length) {
    scaleMessage.textContent = "No playable scale notes in this position.";
    return;
  }
  const ticket = beginAudio("Loading scale notes…");
  scalePending = true;
  paintTransport();
  scaleMessage.textContent = "Preparing " + notes.length + " notes.";
  try {
    const started = await audio.playScale(notes, tempoInput.valueAsNumber, { loop: mode === "loop", meter: meterInput.value });
    if (started && ticket === audioStatusTicket) {
      scalePending = false;
      scaleRunning = true;
      scaleMessage.textContent = (mode === "loop" ? "Looping" : "Playing") + " " + notes.length + " scale notes.";
      finishAudio(ticket, scaleMessage.textContent);
    }
  } catch (problem) {
    if (ticket !== audioStatusTicket) return;
    scalePending = false;
    scaleMessage.textContent = problem.message;
    finishAudio(ticket, problem.message);
  }
});
scaleStopButton.addEventListener("click", stopScale);
scalePlayMode.addEventListener("change", () => {
  stopScale();
  window.dispatchEvent(new Event("progression-changed"));
});

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
  return `<li class="chord-card" data-slot="${slotIndex}" data-chord="${title}">
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
      <button type="button" data-action="move" data-step="-1" aria-label="Move chord ${number} earlier" ${slotIndex === 0 ? "disabled" : ""}>←</button>
      <button type="button" data-action="move" data-step="1" aria-label="Move chord ${number} later" ${slotIndex === workspace.cards.length - 1 ? "disabled" : ""}>→</button>
      <span class="drag-handle" draggable="true" aria-hidden="true" title="Drag to reorder">⠿</span>
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
  zoomAudition.disabled = !voicing;
  zoomStatus.textContent = "";
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
  else if (document.activeElement.disabled) zoomAudition.disabled
    ? document.querySelector("#close-chord-zoom").focus() : zoomAudition.focus();
}

zoomAudition.addEventListener("click", () => auditionCard(zoomCardIndex));
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
let zoomTouch = null;
zoomDialog.addEventListener("touchstart", (event) => {
  zoomTouch = event.touches.length === 1 ? event.touches[0] : null;
}, { passive: true });
zoomDialog.addEventListener("touchend", (event) => {
  if (!zoomTouch) return;
  const end = [...event.changedTouches].find((touch) => touch.identifier === zoomTouch.identifier);
  const start = zoomTouch;
  zoomTouch = null;
  if (!end) return;
  const delta = end.clientX - start.clientX;
  if (Math.abs(delta) > 60 && Math.abs(delta) > 1.3 * Math.abs(end.clientY - start.clientY)) {
    openChordZoom(zoomCardIndex + (delta < 0 ? 1 : -1));
  }
}, { passive: true });
zoomDialog.addEventListener("touchcancel", () => { zoomTouch = null; });
for (const control of [diagramLabels, diagramHighlight]) control.addEventListener("change", () => {
  if (!workspace) return;
  renderCards();
  if (zoomDialog.open) openChordZoom(zoomCardIndex);
});

function moveCard(fromIndex, toIndex, direction) {
  if (!workspace || fromIndex === toIndex || toIndex < 0 || toIndex >= workspace.cards.length) return;
  workspace = moveWorkspaceChord(workspace, fromIndex, toIndex);
  if (selectedCard === fromIndex) selectedCard = toIndex;
  else if (fromIndex < selectedCard && selectedCard <= toIndex) selectedCard--;
  else if (toIndex <= selectedCard && selectedCard < fromIndex) selectedCard++;
  showWorkspace(workspace, selectedCard);
  const moved = cardsElement.children[toIndex];
  const preferred = direction && moved.querySelector('[data-action="move"][data-step="' + direction + '"]:enabled');
  (preferred || moved.querySelector(direction ? '[data-action="move"]:enabled' : '[data-action="select"]'))?.focus();
  setMessage("Moved chord " + (fromIndex + 1) + " to position " + (toIndex + 1) + ". Locks and grips were preserved.");
}

function showDropTarget(card) {
  const valid = card && cardsElement.contains(card) && Number(card.dataset.slot) !== dragFromIndex;
  const next = valid ? card : null;
  if (dropTarget === next) return;
  dropTarget?.classList.remove("drop-target");
  dropTarget = next;
  dropTarget?.classList.add("drop-target");
}

function endDrag(commit = false) {
  const from = dragFromIndex;
  const to = dropTarget ? Number(dropTarget.dataset.slot) : null;
  dropTarget?.classList.remove("drop-target");
  dropTarget = null;
  if (from !== null) cardsElement.children[from]?.classList.remove("dragging");
  dragFromIndex = null;
  touchDrag = null;
  if (dragFrame !== null) cancelAnimationFrame(dragFrame);
  dragFrame = null;
  if (commit && from !== null && to !== null) moveCard(from, to);
}

cardsElement.addEventListener("dragstart", (event) => {
  const handle = event.target.closest(".drag-handle");
  if (!handle || touchDrag) {
    event.preventDefault();
    return;
  }
  const card = handle.closest(".chord-card");
  dragFromIndex = Number(card.dataset.slot);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragFromIndex));
  card.classList.add("dragging");
});
cardsElement.addEventListener("dragover", (event) => {
  if (dragFromIndex === null || touchDrag) return;
  showDropTarget(event.target.closest(".chord-card"));
  if (!dropTarget) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});
cardsElement.addEventListener("dragleave", (event) => {
  if (!cardsElement.contains(event.relatedTarget)) showDropTarget(null);
});
cardsElement.addEventListener("drop", (event) => {
  if (dragFromIndex === null || touchDrag) return;
  showDropTarget(event.target.closest(".chord-card"));
  if (dropTarget) event.preventDefault();
  endDrag(true);
});
cardsElement.addEventListener("dragend", () => endDrag());

function trackTouchDrop() {
  if (!touchDrag || dragFromIndex === null) return;
  const { x, y } = touchDrag;
  const edge = 60;
  const speed = y < edge ? -7 : y > innerHeight - edge ? 7 : 0;
  if (speed) window.scrollBy(0, speed);
  showDropTarget(document.elementFromPoint(x, y)?.closest(".chord-card"));
  dragFrame = requestAnimationFrame(trackTouchDrop);
}

cardsElement.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".drag-handle");
  if (!handle || event.pointerType === "mouse" || !event.isPrimary || dragFromIndex !== null) return;
  handle.setPointerCapture(event.pointerId);
  touchDrag = { id: event.pointerId, card: handle.closest(".chord-card"), startX: event.clientX, startY: event.clientY };
});
cardsElement.addEventListener("pointermove", (event) => {
  if (touchDrag?.id !== event.pointerId) return;
  touchDrag.x = event.clientX;
  touchDrag.y = event.clientY;
  if (dragFromIndex === null && Math.hypot(event.clientX - touchDrag.startX, event.clientY - touchDrag.startY) >= 8) {
    dragFromIndex = Number(touchDrag.card.dataset.slot);
    touchDrag.card.classList.add("dragging");
    trackTouchDrop();
  }
});
cardsElement.addEventListener("pointerup", (event) => {
  if (touchDrag?.id !== event.pointerId) return;
  if (dragFromIndex !== null) showDropTarget(document.elementFromPoint(event.clientX, event.clientY)?.closest(".chord-card"));
  endDrag(true);
});
for (const type of ["pointercancel", "lostpointercapture"]) {
  cardsElement.addEventListener(type, (event) => { if (touchDrag?.id === event.pointerId) endDrag(); });
}

function paintScaleNote() {
  const note = audio.activeScaleNote();
  const marker = note && fretboard.querySelector(
    '.fret-note[data-string="' + note.stringIndex + '"][data-semitone="' + note.semitone + '"]');
  if (marker === scaleMarker) return;
  scaleMarker?.classList.remove("scale-playing");
  scaleMarker = marker;
  if (!marker) return;
  marker.classList.add("scale-playing");
  const viewport = fretboard.parentElement;
  const visible = viewport.getBoundingClientRect();
  const bounds = marker.getBoundingClientRect();
  if (bounds.right > visible.right) viewport.scrollLeft += bounds.right - visible.right + 12;
  else if (bounds.left < visible.left) viewport.scrollLeft -= visible.left - bounds.left + 12;
}

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
  paintScaleNote();
  const scaleMode = scalePending || scaleRunning;
  const label = scaleMode ? "Play chords" : playing ? "Pause" : audio.isPaused() ? "Resume" : "Play";
  const text = (playing && !scaleMode ? "Ⅱ " : "▶ ") + label;
  const scaleLabel = scaleMode ? "■ Stop scale" : "▶ Play scale notes";
  if (scalePlayButton.textContent !== scaleLabel) scalePlayButton.textContent = scaleLabel;
  scaleStopButton.disabled = !scaleMode;

  if (playButton.textContent !== text) {
    playButton.textContent = text;
    playButton.setAttribute("aria-label", label + " progression");
  }
  stopButton.disabled = !audioPending && !audio.isActive() && !audio.isPaused();
}

function monitorTransport() {
  paintTransport();
  if (audio.isActive()) animationFrame = requestAnimationFrame(monitorTransport);
  else {
    animationFrame = null;
    if (scaleRunning) {
      scaleRunning = false;
      scaleMessage.textContent = "Scale playback finished.";
      transportMessage.textContent = scaleMessage.textContent;
      paintTransport();
    }
  }
}

function cancelTransportAnimation() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function stopPlayback() {
  audioStatusTicket++;
  audioPending = false;
  loopRequested = false;
  if (scalePending || scaleRunning) scaleMessage.textContent = "Scale playback stopped.";
  scalePending = false;
  scaleRunning = false;
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
  showWorkspace(result.data, Math.min(selectedCard, result.data.cards.length - 1));
  const lockCount = workspace.cards.filter(({ slot }) => slot.isLocked).length;
  setMessage(lockCount
    ? "Kept " + lockCount + " locked " + (lockCount === 1 ? "chord." : "chords.")
    : "New progression. Press Play, or explore the fretboard.");
}

function showWorkspace(next, selected = 0) {
  endDrag();
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
  grooveEditor.update(meterInput.value, grooveInput.value);
  syncQuickTrackButtons();
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
    const enabled = !muted && (track === "guitar" || grooveInput.value !== "off");
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = (track === "drums" ? "Rhythm" : "Chords") + (enabled ? " on" : " off");
    button.title = (enabled ? "Mute " : "Enable ") + track + " accompaniment";
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
    const chooseGroove = track === "drums" && grooveInput.value === "off";
    if (chooseGroove) updateGrooveControls(groovesForMeter(meterInput.value)[1].id);
    control.mute.checked = chooseGroove ? false : !control.mute.checked;
    control.update();
    const text = (track === "drums" ? "Rhythm" : "Chords") + (control.mute.checked ? " muted." : " enabled.");
    if (chooseGroove) rhythmChanged(text);
    else transportMessage.textContent = text;
    window.dispatchEvent(new Event("progression-changed"));
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
grooveInput.addEventListener("change", () => {
  grooveEditor.update(meterInput.value, grooveInput.value);
  syncQuickTrackButtons();
  rhythmChanged("Drum groove updated.");
});

form.addEventListener("change", (event) => {
  if (workspace) window.dispatchEvent(new Event("progression-changed"));
  if (event.target.closest("#chords-settings") && message.classList.contains("is-error")) setMessage("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { applyGeneration(); } catch (problem) { setMessage(problem.message, true); }
});

document.querySelector("#reset-workspace").addEventListener("click", () => {
  stopPlayback();
  workspace = undefined;
  selectedCard = 0;
  restoreExplorer(DEFAULT_EXPLORER);
  advancedSettings.open = false;
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
  grooveEditor.restore(meterInput.value, grooveInput.value, DEFAULT_RHYTHM_EDIT);
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
  if (!button || boardPosition === button.dataset.position) return;
  stopScale();
  boardPosition = button.dataset.position;
  fretboard.parentElement.scrollLeft = 0;
  renderBoard();
});
scaleLayerInput.addEventListener("change", () => { stopScale(); renderBoard(); });

document.querySelector("#show-scale").addEventListener("click", () => {
  boardView = "scale";
  renderBoard();
});
document.querySelector("#show-chords").addEventListener("click", () => {
  stopScale();
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
    auditionCard(slotIndex);
  } else if (action === "zoom") {
    openChordZoom(slotIndex);
  } else if (action === "move") {
    moveCard(slotIndex, slotIndex + Number(step), step);
  } else if (action === "select") {
    stopScale();
    selectedCard = slotIndex;
    boardView = "chords";
    renderCards("[data-slot=\""+slotIndex+"\"] [data-action=\"select\"]");
    renderBoard();
  }
});

async function auditionCard(index) {
  const card = visibleCard(workspace.cards[index]);
  const ticket = beginAudio("Loading acoustic guitar…");
  if (zoomDialog.open) zoomStatus.textContent = "Loading acoustic guitar…";
  try {
    if (!await audio.audition(card)) return;
    const text = "Heard chord " + (index + 1) + " · " + noteText(card.slot.symbol) + ".";
    if (finishAudio(ticket, text) && zoomDialog.open && zoomCardIndex === index) zoomStatus.textContent = text;
  } catch (problem) {
    if (finishAudio(ticket, problem.message) && zoomDialog.open) zoomStatus.textContent = problem.message;
  }
}

async function playLoop() {
  if (!workspace || playButton.disabled) return;
  const ticket = beginAudio("Loading loop recordings…");
  loopRequested = true;
  try {
    const { parts, fill, click } = grooveEditor.read();
    const started = await audio.play(workspace.cards.map(visibleCard), tempoInput.valueAsNumber, {
      meter: meterInput.value, pattern: patternInput.value, groove: grooveInput.value,
      drumParts: parts, fill, click,
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
  if (scalePending || scaleRunning) { void playLoop(); return; }
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
    explorer: { keyDegree: keyPreviewDegree, diagramLabels: diagramLabels.value, diagramHighlight: diagramHighlight.value,
      fretLabels: fretLabels.value, fretHighlights: fretHighlights.value, scaleMode: scalePlayMode.value },
    rhythm: grooveEditor.read(),
  });
  return { workspace, snapshot };
}

function restoreExplorer(settings) {
  keyPreviewDegree = settings.keyDegree;
  diagramLabels.value = settings.diagramLabels;
  diagramHighlight.value = settings.diagramHighlight;
  fretLabels.value = settings.fretLabels;
  fretHighlights.value = settings.fretHighlights;
  scalePlayMode.value = settings.scaleMode;
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
  grooveEditor.restore(preferences.meter, preferences.groove, preferences.rhythm);
  restoreExplorer(preferences.explorer);
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
