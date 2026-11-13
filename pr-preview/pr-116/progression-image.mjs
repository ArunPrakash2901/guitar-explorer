import { formatNote } from "./engine/index.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { chordDiagramModel } from "./progression/voicings.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { renderChordDiagram } from "./progression-diagram.mjs?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { describeProgression } from "./progression-library.mjs?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";

const diagramStyles = `
  text { font-family: system-ui, sans-serif; }
  .diagram-neck { fill: #5a3c29; }
  .diagram-string { stroke: #eee0c8; stroke-width: .8; }
  .diagram-fret { stroke: #c2aa87; }
  .diagram-nut { stroke: #f5e6c7; stroke-width: 2.3; }
  .diagram-barre { stroke: #e9d2a8; stroke-width: 12; stroke-linecap: round; }
  .diagram-finger { fill: #f6e3bd; stroke: #5a3c29; }
  .diagram-root { fill: #a43d32; }
  .diagram-triad-tone { fill: #a6ad72; }
  .diagram-finger-number { fill: #37251c; font-weight: bold; font-size: 10px; }
  .diagram-root + .diagram-finger-number { fill: white; }
  .diagram-open, .diagram-muted { fill: none; stroke: #3b2f25; stroke-width: 1.75; }
  .diagram-open.diagram-root { stroke: #a43d32; stroke-width: 2.5; }
  .diagram-open.diagram-triad-tone { stroke: #68743d; stroke-width: 2.5; }
  .diagram-label { fill: #51483c; font-size: 10px; font-weight: bold; }
  .diagram-open-caption { fill: #37251c; font-size: 8px; font-weight: bold; }
`;

const pretty = (note) => note.replaceAll("#", "♯").replaceAll("b", "♭");

async function chordImage(card, appearance) {
  const voicing = card.voicings[card.voicingIndex];
  if (!voicing) return null;
  const svg = renderChordDiagram(chordDiagramModel(voicing), pretty(card.slot.symbol), {
    chord: card.slot.chord, voicing, labels: appearance.diagramLabels, highlight: appearance.diagramHighlight,
  });
  const image = new Image();
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    svg.replace(/^(<svg[^>]+>)/, "$1<style>" + diagramStyles + "</style>"),
  );
  await image.decode();
  return image;
}

export async function downloadProgressionImage(workspace, snapshot) {
  const { cards, context } = workspace;
  const columns = Math.min(4, cards.length);
  const rows = Math.ceil(cards.length / columns);
  const width = 256;
  const height = 241;
  const gutter = 16;
  const heading = 82;
  const canvas = document.createElement("canvas");
  canvas.width = columns * (width + gutter) + gutter;
  canvas.height = heading + rows * (height + gutter) + gutter;
  const paint = canvas.getContext("2d");
  if (!paint) throw new Error("Image export is unavailable in this browser.");

  paint.fillStyle = "#f1ece1";
  paint.fillRect(0, 0, canvas.width, canvas.height);
  paint.fillStyle = "#294b37";
  paint.font = "bold 31px Georgia, serif";
  paint.fillText(describeProgression(snapshot), gutter + 6, 38);
  paint.fillStyle = "#655b4d";
  paint.font = "14px system-ui, sans-serif";
  paint.fillText("Guitar Explorer  ·  " + snapshot.p.meter + "  ·  " + snapshot.p.bpm + " BPM", gutter + 6, 64);

  const diagrams = await Promise.all(cards.map((card) => chordImage(card, snapshot.p.explorer)));
  for (const [index, { slot }] of cards.entries()) {
    const x = gutter + index % columns * (width + gutter);
    const y = heading + Math.floor(index / columns) * (height + gutter);
    paint.beginPath();
    paint.roundRect(x, y, width, height, 13);
    paint.fillStyle = "#fffcf6";
    paint.fill();
    paint.fillStyle = "#74583e";
    paint.font = "bold 14px system-ui, sans-serif";
    paint.fillText(slot.romanNumeral, x + 15, y + 23);
    paint.fillStyle = "#252419";
    paint.font = "bold 27px Georgia, serif";
    paint.fillText(pretty(slot.symbol), x + 15, y + 54);
    if (diagrams[index]) paint.drawImage(diagrams[index], x + 30, y + 59, 196, 176);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The progression image could not be generated.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guitar-explorer-" + formatNote(context.tonic) + "-" + context.mode + ".png";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
