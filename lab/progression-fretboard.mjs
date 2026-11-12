import { formatNote, getNoteAt, STANDARD_FRETBOARD } from "./engine/index.js";

const labels = ["E", "A", "D", "G", "B", "e"];
const pretty = (note) => formatNote(note).replaceAll("#", "♯").replaceAll("b", "♭");

/**
 * An original, responsive fretboard built from Music Core and Guitar geometry.
 * No duplicated pitch arithmetic or cached "CAGED" theory tables.
 */
export function renderScaleBoard(container, scale, chord, mode, onNote) {
  container.replaceChildren();
  const shown = mode === "chords" ? chord.tones : scale.tones;
  const tones = new Map(shown.map((tone) => [tone.pitchClass, tone]));
  const heading = document.createElement("div");
  heading.className = "fretboard-row";
  const corner = document.createElement("span");
  corner.className = "string-label fret-corner";
  corner.textContent = "String";
  heading.append(corner);
  for (let fret = 0; fret <= 12; fret++) {
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
    for (let fret = 0; fret <= 12; fret++) {
      const cell = document.createElement("div");
      cell.className = "fret-cell";
      const location = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
      const tone = tones.get(location.pitchClass);
      if (tone) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fret-note";
        if (location.pitchClass === scale.tones[0].pitchClass) button.classList.add("root");
        button.textContent = mode === "chords" ? pretty(tone.note) : (
          scale.scaleId === "mixolydian" && tone.degree === 7 ? "♭7" : String(tone.degree)
        );
        button.setAttribute("aria-label",
          pretty(tone.note) + " on " + labels[stringIndex] + " string, fret " + fret);
        button.addEventListener("click", () => onNote({
          stringIndex, semitone: location.semitone, note: pretty(tone.note),
        }));
        cell.append(button);
      }
      row.append(cell);
    }
    container.append(row);
  }
}
