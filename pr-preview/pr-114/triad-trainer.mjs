import { parseNote } from "./engine/index.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { TRIAD_QUALITIES, triadShapes } from "./progression/triads.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { chordDiagramModel } from "./progression/voicings.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { renderChordDiagram } from "./progression-diagram.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { renderScaleBoard } from "./progression-fretboard.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { degreeLabel } from "./progression-tone-label.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { chordName, initChordInputs, noteName, practiceTransport, stringNames } from "./trainer-ui.mjs?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";

const byId = (id) => document.getElementById(id);
const root = byId("trainer-root");
const quality = byId("trainer-quality");
const stringSet = byId("string-set");
const mode = byId("triad-playback");
const labels = byId("trainer-labels");
const tempo = byId("trainer-tempo");
const play = byId("trainer-play");
const cards = byId("triad-shapes");
const board = byId("trainer-board");
const visible = new Set();
const inversionNames = ["Root position", "First inversion", "Second inversion"];
const roleNames = { 1: "Root", 3: "Third", 5: "Fifth" };
let material;
const transport = practiceTransport({
  play, stop: byId("trainer-stop"), status: byId("trainer-status"),
  highlight(event) {
    cards.querySelector(".trainer-active")?.classList.remove("trainer-active");
    if (event?.shapeId) cards.querySelector(`[data-shape="${event.shapeId}"]`)?.classList.add("trainer-active");
    board.querySelectorAll(".scale-playing").forEach((button) => button.classList.remove("scale-playing"));
    for (const { stringIndex, fret } of event?.notes ?? []) {
      board.querySelector(`[data-string="${stringIndex}"][data-fret="${fret}"]`)?.classList.add("scale-playing");
    }
  },
});

const whole = (numerator) => ({ numerator, denominator: 1 });
function playShapes(shapes) {
  const strum = mode.value === "strum";
  const events = shapes.flatMap((shape, index) => strum
    ? [{ shapeId: shape.id, notes: shape.notes, onset: whole(index * 2), duration: whole(2) }]
    : shape.notes.map((note, slot) => ({ shapeId: shape.id, notes: [note],
      onset: { numerator: index * 4 + slot, denominator: 2 }, duration: { numerator: slot === 2 ? 2 : 1, denominator: 2 } })));
  if (events.length) void transport.start(events, Number(tempo.value));
}

function renderBoard() {
  const markers = new Map();
  for (const shape of material.shapes.filter(({ id }) => visible.has(id))) {
    for (const note of shape.notes) {
      const finger = shape.voicing.fingers[note.stringIndex];
      const label = labels.value === "fingers" ? String(finger ?? "O") :
        labels.value === "intervals" ? degreeLabel(note.tone) : noteName(note.tone.note);
      markers.set(note.stringIndex + ":" + note.fret, { label, role: roleNames[note.tone.degree].toLowerCase() });
    }
  }
  renderScaleBoard(board, null, material.chord, "chords", (note) => {
    void transport.start([{ notes: [note], onset: whole(0), duration: whole(1) }], Number(tempo.value));
  }, undefined, { markers });
  renderMovement();
}

function renderMovement() {
  const movement = byId("interval-movement");
  movement.hidden = !byId("show-movement").checked;
  if (movement.hidden) return;
  const shapes = material.shapes.filter(({ id }) => visible.has(id));
  movement.replaceChildren(...material.chord.tones.map((tone) => {
    const row = document.createElement("p");
    const steps = shapes.map(({ notes }) => notes.find(({ tone: played }) => played.degree === tone.degree))
      .map(({ stringIndex, fret }) => "s" + (6 - stringIndex) + " f" + fret);
    row.textContent = roleNames[tone.degree] + " " + noteName(tone.note) + " · " + (steps.join(" → ") || "No shapes shown");
    return row;
  }));
}

function renderCards() {
  const symbol = chordName(material.chord);
  cards.innerHTML = material.shapes.map((shape) => {
    const inversion = inversionNames[shape.inversion];
    const diagram = renderChordDiagram(chordDiagramModel(shape.voicing), symbol + " " + inversion,
      { chord: material.chord, voicing: shape, labels: labels.value });
    const coordinates = shape.notes.map(({ tone, stringIndex, fret }) =>
      `<li><strong>${noteName(tone.note)}</strong> ${roleNames[tone.degree]} · ${stringNames[stringIndex]} ${fret ? "fret " + fret : "open"}</li>`);
    return `<li class="chord-card trainer-card" data-shape="${shape.id}">
      <h3>${symbol}</h3><p class="inversion">${inversion}</p>
      <div class="diagram-wrap">${diagram}</div>
      <ul class="shape-tones">${coordinates.join("")}</ul>
      <div class="trainer-card-actions">
        <button type="button" class="audition-button" data-audition aria-label="Hear ${symbol} ${inversion} at fret ${shape.position}">▶ Hear</button>
        <label><input type="checkbox" data-visibility ${visible.has(shape.id) ? "checked" : ""}> Show on fretboard</label>
      </div>
    </li>`;
  }).join("");
}

function refresh() {
  transport.reset();
  material = triadShapes(parseNote(root.value), quality.value, Number(stringSet.value));
  visible.clear();
  for (const { id } of material.shapes) visible.add(id);
  byId("triad-heading").textContent = chordName(material.chord) + " · " + material.chord.tones.map(({ note }) => noteName(note)).join(" · ");
  byId("shape-note").textContent = [
    material.shapes.length < 4 ? "Found " + material.shapes.length + " shapes within the first 15 frets and the hand-span limit." : "",
    labels.value === "fingers" ? "Finger numbers are suggestions to try on your guitar." : "",
  ].filter(Boolean).join(" ");
  renderCards();
  renderBoard();
}
cards.addEventListener("click", (event) => {
  if (!event.target.closest("[data-audition]")) return;
  const { shape: id } = event.target.closest("[data-shape]").dataset;
  playShapes(material.shapes.filter((shape) => shape.id === id));
});
cards.addEventListener("change", (event) => {
  if (!event.target.matches("[data-visibility]")) return;
  const { shape: id } = event.target.closest("[data-shape]").dataset;
  if (event.target.checked) visible.add(id);
  else visible.delete(id);
  renderBoard();
});
play.addEventListener("click", () => playShapes(material.shapes));
for (const input of [root, quality, stringSet]) input.addEventListener("change", refresh);
labels.addEventListener("change", () => {
  transport.reset();
  byId("shape-note").textContent = labels.value === "fingers" ? "Finger numbers are suggestions to try on your guitar." :
    material.shapes.length < 4 ? "Found " + material.shapes.length + " shapes within the first 15 frets and the hand-span limit." : "";
  renderCards();
  renderBoard();
});
mode.addEventListener("change", () => transport.reset());
tempo.addEventListener("input", () => {
  byId("trainer-bpm").textContent = tempo.value + " BPM";
  transport.reset();
});
byId("show-movement").addEventListener("change", renderMovement);

initChordInputs(root, quality, TRIAD_QUALITIES);
refresh();
