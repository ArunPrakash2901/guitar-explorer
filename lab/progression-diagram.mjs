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

export function renderChordDiagram(model, chordLabel) {
  const lastString = firstString + (strings.length - 1) * stringGap;
  const bottom = top + model.fretCount * fretHeight;
  const label = model.strings.map(({ stringIndex, state, fret }) => {
    const name = stringNames[stringIndex] + " string";
    return name + (state === "fretted" ? " fret " + fret : " " + state);
  }).join(", ");
  const description = escapeMarkup(chordLabel + " guitar chord diagram. Starting fret " + model.baseFret + ". " + label + ".");
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
  const markers = model.strings.map(({ stringIndex, state, diagramRow }) => {
    const x = firstString + stringIndex * stringGap;
    if (state === "muted") {
      return `<path class="diagram-muted" d="M ${x - 4} ${markerTop - 4} l 8 8 m 0 -8 l -8 8"/>`;
    }
    if (state === "open") {
      return `<circle class="diagram-open" cx="${x}" cy="${markerTop}" r="4.5"/>`;
    }
    const y = top + (diagramRow - 0.5) * fretHeight;
    return `<circle class="diagram-finger" cx="${x}" cy="${y}" r="5.5"/>`;
  });
  const position = model.baseFret > 1
    ? `<text class="diagram-label" x="${firstString - 11}" y="${top + fretHeight / 2 + 4}" text-anchor="end">${model.baseFret}fr</text>`
    : "";

  return `<svg class="chord-diagram" viewBox="0 0 184 165" width="184" height="165" role="img" aria-label="${description}" xmlns="http://www.w3.org/2000/svg">
    <g aria-hidden="true">
      <rect class="diagram-neck" x="${firstString - 5}" y="${top}" width="${lastString - firstString + 10}" height="${bottom - top}" rx="2"/>
      ${fretLines.join("")}
      ${stringLines.join("")}
      ${markers.join("")}
      ${position}
    </g>
  </svg>`;
}
