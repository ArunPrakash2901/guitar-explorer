import { buildScale, formatNote, parseNote } from "./engine/index.js";
import { getCagedPosition } from "./progression/caged.js";
import { chordDiagramModel, getPlayableVoicings } from "./progression/voicings.js";
import { generateWorkspace, matchesVoicingFilter, replaceWorkspaceChord, toggleChordLock } from "./progression/workspace.js";
import { listProgressionVariants } from "./progression/generator.js";
import { renderChordDiagram } from "./progression-diagram.mjs";
import { renderScaleBoard } from "./progression-fretboard.mjs";
import { listGenerateChoices } from "./progression-selection.mjs";
import { DEFAULT_MIX, ProgressionAudio } from "./progression-audio.mjs";
import { groovesForMeter } from "./progression-grooves.mjs";
import { rhythmPlan, patternsForMeter, DEFAULT_PATTERN, METERS } from "./progression-rhythm.mjs";

const modes = { major: "major", naturalMinor: "natural minor", dorian: "Dorian", phrygian: "Phrygian", lydian: "Lydian", mixolydian: "Mixolydian", locrian: "Locrian" };
const families = { open: "Open shape", "e-barre": "E-shape barre", "a-barre": "A-shape barre", triad: "Three-string triad", compact: "Compact grip" };
const qualities = { major: "major", minor: "minor", diminished: "diminished", augmented: "augmented",
  major7: "major seventh", dominant7: "dominant seventh", minor7: "minor seventh",
  halfDiminished7: "half diminished seventh", sus2: "suspended second", sus4: "suspended fourth", add9: "add nine" };
const noteText = (value) => value.replaceAll("#", "♯").replaceAll("b", "♭");

const form = document.querySelector("#generate-form");
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
  const chord = workspace.cards[selectedCard].slot.chord;
  const root = noteText(formatNote(tonic));
  const gripQuality = layer === "majorPentatonic" ? "major" : layer === "minorPentatonic" ? "minor"
    : ["major", "lydian", "mixolydian"].includes(mode) ? "major" : mode === "locrian" ? "reference" : "minor";
  const position = boardPosition === "full" ? undefined : getCagedPosition(tonic, boardPosition, gripQuality);
  const scaleName = layer === "context" ? modes[mode] + " scale"
    : layer === "majorPentatonic" ? "major pentatonic" : "minor pentatonic";
  fretboardTitle.textContent = boardView === "scale" ? root + " " + scaleName
    : noteText(workspace.cards[selectedCard].slot.symbol) + " chord tones";
  const description = boardView === "scale" ? "Scale degrees across six strings."
    : "Chord " + (selectedCard + 1) + " in the " + root + " " + modes[mode] + " progression.";
  const positionDescription = position ? " " + position.family + " form, frets " + position.fromFret + "–" + position.toFret + "." : "";
  const gripDescription = position && boardView === "scale"
    ? gripQuality === "reference" ? " Locrian uses the form as a position reference." : " Outlines mark the tonic grip."
    : "";
  fretboardDescription.textContent = description + positionDescription + gripDescription;
  scaleLayerControl.hidden = boardView !== "scale";
  for (const button of cardsElement.querySelectorAll("[data-action=select]")) {
    button.setAttribute("aria-pressed", String(boardView === "chords" && Number(button.closest("[data-slot]").dataset.slot) === selectedCard));
  }
  for (const button of cagedControls.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.position === boardPosition));
  }
  for (const view of ["scale", "chords"]) {
    const button = document.querySelector(view === "scale" ? "#show-scale" : "#show-chords");
    button.classList.toggle("selected", boardView === view);
    button.setAttribute("aria-pressed", String(boardView === view));
  }
  renderScaleBoard(fretboard, scale, chord, boardView, (note) => {
    const ticket = beginAudio("Loading acoustic note…");
    audio.audition({ voicingIndex: 0, voicings: [{ notes: [note] }] }).then((played) => {
      if (played) finishAudio(ticket, note.note + " sounded.");
    }).catch((problem) => finishAudio(ticket, problem.message));
  }, position);
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
  const diagram = voicing ? renderChordDiagram(chordDiagramModel(voicing), spokenChord) : "";
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
  if (restoreFocus) {
    cardsElement.querySelector(restoreFocus)?.focus({ preventScroll: true });
  }
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
  stopPlayback();
  workspace = result.data;
  selectedCard = 0;
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
  const lockCount = workspace.cards.filter(({ slot }) => slot.isLocked).length;
  setMessage(lockCount
    ? "Kept " + lockCount + " locked " + (lockCount === 1 ? "chord." : "chords.")
    : "New progression. Press Play, or explore the fretboard.");
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

function updatePatternControls(resetPattern = false) {
  const old = resetPattern ? null : patternInput.value;
  const choices = patternsForMeter(meterInput.value);
  patternInput.replaceChildren(...choices.map((pattern) => {
    const option = document.createElement("option");
    option.value = pattern.id;
    option.textContent = pattern.name;
    return option;
  }));
  patternInput.value = choices.some((pattern) => pattern.id === old) ? old : DEFAULT_PATTERN[meterInput.value];
  tempoUnit.textContent = METERS[meterInput.value].pulseUnit === "dotted-quarter"
    ? "(dotted-quarter BPM)" : "(quarter BPM)";
  const pattern = rhythmPlan(meterInput.value, patternInput.value, tempoInput.valueAsNumber);
  const directions = new Map(pattern.strokes.map(({ step, direction }) => [step, direction === "up" ? "↑" : "↓"]));
  strumDescription.textContent = Array.from({ length: pattern.stepsPerBar }, (_, step) => directions.get(step) ?? "·").join(" ") +
    "  (↓ down, ↑ up, · rest)";
}

function updateGrooveControls({ reset = false } = {}) {
  const previous = grooveInput.value;
  const grooves = groovesForMeter(meterInput.value);
  grooveInput.replaceChildren(...grooves.map(({ id, name }) => new Option(name, id)));
  grooveInput.value = reset || !previous ? "off"
    : grooves.some(({ id }) => id === previous) ? previous : grooves[1].id;
}

function rhythmChanged(text) {
  if (loopRequested) {
    void playLoop();
  } else {
    stopPlayback();
    transportMessage.textContent = text;
  }
}

const trackControls = Object.keys(DEFAULT_MIX).map((track) => {
  const volume = document.querySelector("#" + track + "-volume");
  const mute = document.querySelector("#" + track + "-mute");
  const value = document.querySelector("#" + track + "-volume-value");
  const update = () => {
    value.textContent = volume.value + "%";
    audio.setTrackMix(track, volume.valueAsNumber / 100, mute.checked);
  };
  volume.addEventListener("input", update);
  mute.addEventListener("change", update);
  return { track, volume, mute, update };
});

toneInput.addEventListener("change", () => audio.setTone(toneInput.value));

meterInput.addEventListener("change", () => {
  updatePatternControls(true);
  updateGrooveControls();
  rhythmChanged("Meter updated.");
});
patternInput.addEventListener("change", () => {
  updatePatternControls();
  rhythmChanged("Strum pattern updated.");
});
grooveInput.addEventListener("change", () => rhythmChanged("Drum groove updated."));

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
  updatePatternControls(true);
  updateGrooveControls({ reset: true });
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
    setMessage(`Chord ${slotIndex + 1}, voicing ${card.voicingIndex + 1} of ${card.voicings.length}.`);
  } else if (action === "audition") {
    const card = visibleCard(workspace.cards[slotIndex]);
    const ticket = beginAudio("Loading acoustic guitar…");
    audio.audition(card).then((played) => {
      if (played) finishAudio(ticket, `Heard chord ${slotIndex + 1}: ${noteText(card.slot.symbol)}.`);
    }).catch((problem) => finishAudio(ticket, problem.message));
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

document.addEventListener("visibilitychange", () => { if (!document.hidden) audio.fillSchedule(); });
window.addEventListener("pagehide", () => stopPlayback());
updatePatternControls(true);
updateGrooveControls({ reset: true });
applyGeneration();
