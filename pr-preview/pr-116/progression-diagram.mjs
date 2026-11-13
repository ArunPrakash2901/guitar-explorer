import { formatNote } from "./engine/index.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { degreeLabel } from "./progression-tone-label.mjs?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
const strings = ["E", "A", "D", "G", "B", "e"];
const stringNames = ["Low E", "A", "D", "G", "B", "High E"];
const firstString = 38;
const stringGap = 22;
const top = 37;
const fretHeight = 24;
const markerTop = 21;

function escapeMarkup(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const displayName = (note) => formatNote(note).replaceAll("#", "♯").replaceAll("b", "♭");

export function renderChordDiagram(model, chordLabel, options = {}) {
  const { labels = "fingers", highlight = "root", chord = null, voicing = null } = options;
  if (!["fingers", "notes", "intervals", "none"].includes(labels) ||
      !["none", "root", "triad"].includes(highlight)) {
    throw new RangeError("Unsupported chord-diagram appearance option");
  }
  function toneAt(stringIndex) {
    const note = voicing?.notes.find((entry) => entry.stringIndex === stringIndex);
    if (!note || !chord) return null;
    const index = chord.tones.findIndex((tone) => tone.pitchClass === note.pitchClass);
    return index < 0 ? null : { ...chord.tones[index], index };
  }
  function dotLabel(stringIndex, finger) {
    if (labels === "none") return "";
    if (labels === "fingers") return finger == null ? "" : String(finger);
    const tone = toneAt(stringIndex);
    if (!tone) return "";
    if (labels === "notes") return displayName(tone.note);
    return degreeLabel(tone);
  }
  const lastString = firstString + (strings.length - 1) * stringGap;
  const bottom = top + model.fretCount * fretHeight;
  const label = model.strings.map(({ stringIndex, state, fret, finger }) => {
    const name = stringNames[stringIndex] + " string";
    return name + (state === "fretted" ? " fret " + fret + (finger == null ? "" : ", finger " + finger) : " " + state);
  }).join(", ");
  const barreDescription = model.barres.map(({ firstString, lastString, finger, fret }) =>
    " Finger " + finger + " barre at fret " + fret + " from " + stringNames[firstString] + " to " + stringNames[lastString] + ".");
  const description = escapeMarkup(chordLabel + " guitar chord diagram. Starting fret " + model.baseFret + ". " + label + "." + barreDescription.join(""));
  const fretLines = Array.from({ length: model.fretCount + 1 }, (_, row) => {
    const y = top + row * fretHeight;
    const type = row === 0 && model.baseFret === 1 ? "diagram-nut" : "diagram-fret";
    return `<line class="${type}" x1="${firstString}" y1="${y}" x2="${lastString}" y2="${y}"/>`;
  });
  const stringLines = strings.map((name, index) => {
    const x = firstString + index * stringGap;
    return `<line class="diagram-string" x1="${x}" y1="${top}" x2="${x}" y2="${bottom}"/>
      <text class="diagram-label" x="${x}" y="${bottom + 18}" text-anchor="middle">${name}</text>`;
  });
  const barres = model.barres.map(({ firstString: from, lastString: to, diagramRow }) => {
    const y = top + (diagramRow - 0.5) * fretHeight;
    return `<line class="diagram-barre" x1="${firstString + from * stringGap}" y1="${y}" x2="${firstString + to * stringGap}" y2="${y}"/>`;
  });
  const markers = model.strings.map(({ stringIndex, state, diagramRow, finger }) => {
    const x = firstString + stringIndex * stringGap;
    const tone = toneAt(stringIndex);
    const dotClass = tone && highlight !== "none" && (
      tone.index === 0 || (highlight === "triad" && tone.index <= 2))
      ? tone.index === 0 ? " diagram-root" : " diagram-triad-tone" : "";
    const text = escapeMarkup(dotLabel(stringIndex, finger));
    if (state === "muted") {
      return `<path class="diagram-muted" d="M ${x - 4} ${markerTop - 4} l 8 8 m 0 -8 l -8 8"/>`;
    }
    if (state === "open") {
      return `<circle class="diagram-open${dotClass}" cx="${x}" cy="${markerTop}" r="4.5"/>
        ${labels !== "fingers" && text ? `<text class="diagram-open-caption" x="${x}" y="${markerTop - 10}" text-anchor="middle">${text}</text>` : ""}`;
    }
    const y = top + (diagramRow - 0.5) * fretHeight;
    return `<circle class="diagram-finger${dotClass}" cx="${x}" cy="${y}" r="8"/>
      ${text ? `<text class="diagram-finger-number" x="${x}" y="${y + 3.4}" text-anchor="middle">${text}</text>` : ""}`;
  });
  const position = model.baseFret > 1
    ? `<text class="diagram-label" x="${firstString - 11}" y="${top + fretHeight / 2 + 4}" text-anchor="end">${model.baseFret}fr</text>`
    : "";

  return `<svg class="chord-diagram" viewBox="0 0 184 165" width="184" height="165" role="img" aria-label="${description}" xmlns="http://www.w3.org/2000/svg">
    <g aria-hidden="true">
      <rect class="diagram-neck" x="${firstString - 5}" y="${top}" width="${lastString - firstString + 10}" height="${bottom - top}" rx="2"/>
      ${fretLines.join("")}
      ${stringLines.join("")}
      ${barres.join("")}
      ${markers.join("")}
      ${position}
    </g>
  </svg>`;
}
