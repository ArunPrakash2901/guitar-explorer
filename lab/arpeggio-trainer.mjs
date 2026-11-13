import { parseNote, formatPitch } from "./engine/index.js";
import { ARPEGGIO_QUALITIES, arpeggioMaterial, arpeggioEvents } from "./progression/arpeggios.js";
import { CAGED_FAMILIES } from "./progression/caged.js";
import { renderScaleBoard } from "./progression-fretboard.mjs";
import { degreeLabel } from "./progression-tone-label.mjs";
import { chordName, initChordInputs, noteName, practiceTransport } from "./trainer-ui.mjs";

const byId = (id) => document.getElementById(id);
const root = byId("trainer-root");
const quality = byId("trainer-quality");
const tempo = byId("trainer-tempo");
const play = byId("trainer-play");
const board = byId("trainer-board");
const tab = byId("arpeggio-tab");
const positionButtons = [...document.querySelectorAll("#caged-positions button")];
const roleNames = { 1: "Root", 3: "Third", 5: "Fifth", 7: "Seventh" };
const stringLabels = ["E", "A", "D", "G", "B", "e"];
const check = (name) => byId("arpeggio-" + name).checked;
let family = "C";
let material;
let events = [];
let cycling = false;
const transport = practiceTransport({
  play, stop: byId("trainer-stop"), status: byId("trainer-status"), pauseable: true,
  highlight(event) {
    board.querySelector(".scale-playing")?.classList.remove("scale-playing");
    tab.querySelector(".tab-current")?.classList.remove("tab-current");
    if (!event) return;
    const [{ stringIndex, fret }] = event.notes;
    board.querySelector(`[data-string="${stringIndex}"][data-fret="${fret}"]`)?.classList.add("scale-playing");
    const cursor = tab.querySelector(`[data-index="${event.index}"]`);
    if (cursor) {
      cursor.classList.add("tab-current");
      const x = Number(cursor.dataset.x);
      if (x < tab.scrollLeft + 28 || x > tab.scrollLeft + tab.clientWidth - 36) {
        tab.scrollLeft = Math.max(0, x - tab.clientWidth / 2);
      }
    }
  },
  onFinish() {
    if (!cycling) return;
    for (let offset = 1; offset <= CAGED_FAMILIES.length; offset++) {
      const next = CAGED_FAMILIES[(CAGED_FAMILIES.indexOf(family) + offset) % CAGED_FAMILIES.length];
      if (!readMaterial(next).path.length) continue;
      if (!check("loop") && next === startingFamily) {
        cycling = false;
        break;
      }
      family = next;
      render();
      start(false);
      break;
    }
  },
});

function readMaterial(position = family) {
  return arpeggioMaterial(parseNote(root.value), quality.value, position, byId("arpeggio-range").value === "octave");
}

function renderTab() {
  tab.scrollLeft = 0;
  const left = 38;
  const spacing = 35;
  const width = Math.max(240, left + events.length * spacing + 8);
  const strings = stringLabels.map((label, index) => {
    const y = 28 + (5 - index) * 22;
    return `<text x="16" y="${y + 4}" text-anchor="middle">${label}</text><line x1="28" y1="${y}" x2="${width - 8}" y2="${y}"/>`;
  }).join("");
  const marks = events.map(({ index, notes: [note], onset }) => {
    const { fret, stringIndex, tone } = note;
    const x = left + (index + .5) * spacing;
    const y = 28 + (5 - stringIndex) * 22;
    const beat = onset.numerator / onset.denominator;
    const bar = Number.isInteger(beat) && beat % 4 === 0;
    const label = formatPitch(note.pitch) + ", string " + (6 - stringIndex) + ", fret " + fret;
    return `${bar ? `<line class="tab-bar" x1="${x - spacing / 2}" x2="${x - spacing / 2}" y1="28" y2="138"/>` : ""}
      <g class="tab-note" data-index="${index}" data-x="${x}" data-string="${stringIndex}" data-fret="${fret}" data-role="${roleNames[tone.degree].toLowerCase()}">
        <title>${label}</title><rect x="${x - 13}" y="${y - 10}" width="26" height="20" rx="4"/>
        <text x="${x}" y="${y + 5}" text-anchor="middle">${fret}</text>
        <text class="tab-role" x="${x}" y="166" text-anchor="middle">${degreeLabel(tone)}</text>
      </g>`;
  }).join("");
  tab.innerHTML = events.length ? `<svg class="trainer-tab" width="${width}" height="181" role="img" aria-label="${chordName(material.chord)} ${family} shape tablature" xmlns="http://www.w3.org/2000/svg">${strings}${marks}</svg>` : "";
  byId("tab-position").textContent = family + " shape" + (events.length ? " · " + events.length + " notes" : "");
}

function render() {
  material = readMaterial();
  events = arpeggioEvents(material.path, byId("arpeggio-direction").value, byId("arpeggio-rhythm").value, check("loop") && !check("cycle"));
  for (const button of positionButtons) button.setAttribute("aria-pressed", String(button.dataset.position === family));
  byId("trainer-board-heading").textContent = chordName(material.chord) + " · " + family + " shape";
  byId("arpeggio-roles").textContent = material.chord.tones.map((tone) =>
    roleNames[tone.degree] + " " + noteName(tone.note) + " (" + degreeLabel(tone) + ")").join(" · ");
  byId("arpeggio-range-note").textContent = material.octaveAvailable ? "" : "No complete root-to-root octave in this position. Choose another shape or use Full shape.";
  const markers = new Map(material.path.map(({ stringIndex, fret, tone }) => [stringIndex + ":" + fret,
    { label: degreeLabel(tone), role: roleNames[tone.degree].toLowerCase() }]));
  renderScaleBoard(board, null, material.chord, "chords", (note) => {
    cycling = false;
    void transport.start([{ notes: [note], onset: { numerator: 0, denominator: 1 }, duration: { numerator: 1, denominator: 1 } }], Number(tempo.value));
  }, material.position, { markers });
  renderTab();
  play.disabled = events.length === 0;
}

let startingFamily;
function start(first = true) {
  if (!events.length) return;
  if (first) {
    cycling = check("cycle");
    startingFamily = family;
  }
  void transport.start(events, Number(tempo.value), { loop: check("loop") && !cycling, click: check("click"), countIn: first && check("count-in") });
}
function refresh() {
  cycling = false;
  transport.reset();
  render();
}
play.addEventListener("click", () => {
  if (transport.active) transport.toggle();
  else start();
});
byId("trainer-stop").addEventListener("click", () => { cycling = false; });
for (const button of positionButtons) button.addEventListener("click", () => {
  family = button.dataset.position;
  refresh();
});
for (const control of [root, quality, byId("arpeggio-range"), byId("arpeggio-direction"), byId("arpeggio-rhythm"),
  byId("arpeggio-count-in"), byId("arpeggio-click"), byId("arpeggio-loop"), byId("arpeggio-cycle")]) {
  control.addEventListener("change", refresh);
}
tempo.addEventListener("input", () => {
  byId("trainer-bpm").textContent = tempo.value + " BPM";
  refresh();
});
initChordInputs(root, quality, ARPEGGIO_QUALITIES);
render();
