import { formatNote, getNoteAt, STANDARD_FRETBOARD } from "./engine/index.js?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";
import { degreeLabel } from "./progression-tone-label.mjs?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";

const labels = ["E", "A", "D", "G", "B", "e"];
const pretty = (note) => formatNote(note).replaceAll("#", "♯").replaceAll("b", "♭");

function installKeyboardNavigation(container, rows) {
  const notes = rows.flat();
  let current = notes.find((button) => button.classList.contains("root")) ?? notes[0];
  if (current) current.tabIndex = 0;
  function setCurrent(button) {
    if (current) current.tabIndex = -1;
    current = button;
    current.tabIndex = 0;
  }
  for (const button of notes) button.onfocus = () => setCurrent(button);
  container.onkeydown = (event) => {
    const { target, key } = event;
    if (!target.matches(".fret-note") || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
    const stringIndex = Number(target.dataset.string);
    const fret = Number(target.dataset.fret);
    const row = rows[stringIndex];
    const offset = row.indexOf(target);
    let next;
    if (key === "ArrowLeft") next = row[offset - 1];
    if (key === "ArrowRight") next = row[offset + 1];
    if (key === "Home") next = row[0];
    if (key === "End") next = row.at(-1);
    if (key === "ArrowUp" || key === "ArrowDown") {
      const step = key === "ArrowUp" ? 1 : -1;
      for (let i = stringIndex + step; i >= 0 && i < rows.length && !next; i += step) {
        next = rows[i].reduce((nearest, button) => !nearest ||
          Math.abs(Number(button.dataset.fret) - fret) < Math.abs(Number(nearest.dataset.fret) - fret) ? button : nearest, null);
      }
    }
    event.preventDefault();
    next?.focus();
  };
}

/** Render the selected collection over engine guitar positions. */
export function renderScaleBoard(container, scale, chord, mode, onNote, position, options = {}) {
  const labelMode = options.labels ?? "degrees";
  const highlight = ["root", "triad", "modal"].includes(options.highlight) ? options.highlight : "root";
  const modalDegrees = { dorian: 6, phrygian: 2, lydian: 4, mixolydian: 7, locrian: 5, naturalMinor: 6 };
  const characteristic = modalDegrees[options.modeName] ?? null;
  const triadPitchClasses = new Set(chord.tones.slice(0, 3).map(({ pitchClass }) => pitchClass));
  container.replaceChildren();
  const shown = mode === "chords" ? chord.tones : scale.tones;
  const tones = new Map(shown.map((tone) => [tone.pitchClass, tone]));
  const firstFret = position?.fromFret ?? 0;
  const lastFret = position?.toFret ?? STANDARD_FRETBOARD.maxFret;
  container.style.setProperty("--fret-columns", lastFret - firstFret + 1);
  container.classList.toggle("has-open", firstFret === 0);
  const rows = labels.map(() => []);
  const heading = document.createElement("div");
  heading.className = "fretboard-row";
  const corner = document.createElement("span");
  corner.className = "string-label fret-corner";
  corner.textContent = "String";
  heading.append(corner);
  for (let fret = firstFret; fret <= lastFret; fret++) {
    const item = document.createElement("span");
    item.className = "fret-number";
    item.textContent = fret === 0 ? "Open" : String(fret);
    heading.append(item);
  }
  container.append(heading);

  for (let stringIndex = 5; stringIndex >= 0; stringIndex--) {
    const row = document.createElement("div");
    row.className = "fretboard-row";
    const name = document.createElement("span");
    name.className = "string-label";
    name.textContent = labels[stringIndex];
    row.append(name);
    for (let fret = firstFret; fret <= lastFret; fret++) {
      const cell = document.createElement("div");
      cell.className = "fret-cell";
      const location = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
      const tone = tones.get(location.pitchClass);
      if (tone) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fret-note";
        button.dataset.string = String(stringIndex);
        button.dataset.fret = String(fret);
        button.dataset.semitone = String(location.semitone);
        button.tabIndex = -1;
        const root = location.pitchClass === shown[0].pitchClass;
        const grip = mode === "scale" && position?.gripFrets[stringIndex] === fret;
        button.classList.toggle("root", root);
        button.classList.toggle("grip-tone", grip);
        const triad = mode === "scale" && highlight === "triad" && triadPitchClasses.has(tone.pitchClass) && !root;
        const characteristicTone = mode === "scale" && highlight === "modal" && tone.degree === characteristic && !root;
        button.classList.toggle("triad-tone", triad);
        button.classList.toggle("modal-tone", characteristicTone);
        const degree = degreeLabel(tone);
        const note = pretty(tone.note);
        button.textContent = labelMode === "notes" || (mode === "chords" && labelMode !== "intervals") ? note : degree;
        const stringName = stringIndex === 0 ? "low E" : stringIndex === 5 ? "high E" : labels[stringIndex];
        button.setAttribute("aria-label", note + " on " + stringName + " string, fret " + fret +
          ", degree " + degree + (root ? ", root" : "") + (grip ? ", tonic grip" : "") +
          (triad ? ", selected triad tone" : "") + (characteristicTone ? ", characteristic modal tone" : ""));
        button.title = note + " · " + degree;
        button.addEventListener("click", () => onNote({ stringIndex, semitone: location.semitone, note }));
        rows[stringIndex].push(button);
        cell.append(button);
      }
      row.append(cell);
    }
    container.append(row);
  }
  installKeyboardNavigation(container, rows);
}
