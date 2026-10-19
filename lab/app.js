import {
  SCALE_FORMULAS,
  STANDARD_FRETBOARD,
  formatNote,
  formatPitch,
  intervalBetweenNotes,
  musicQueries,
  parseNote,
  parsePitch,
  pitchClass,
  transposeNote,
} from "/engine/index.js";

const ROOTS = ["C", "G", "D", "A", "E", "B", "F", "Bb", "Eb", "Ab", "Db", "Gb", "F#", "C#"];
const FRET_TARGETS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const INTERVALS = [
  { name: "minor 2nd", label: "m2", interval: { diatonicSteps: 1, semitones: 1 } },
  { name: "major 2nd", label: "M2", interval: { diatonicSteps: 1, semitones: 2 } },
  { name: "minor 3rd", label: "m3", interval: { diatonicSteps: 2, semitones: 3 } },
  { name: "major 3rd", label: "M3", interval: { diatonicSteps: 2, semitones: 4 } },
  { name: "perfect 4th", label: "P4", interval: { diatonicSteps: 3, semitones: 5 } },
  { name: "augmented 4th", label: "A4", interval: { diatonicSteps: 3, semitones: 6 } },
  { name: "perfect 5th", label: "P5", interval: { diatonicSteps: 4, semitones: 7 } },
  { name: "minor 6th", label: "m6", interval: { diatonicSteps: 5, semitones: 8 } },
  { name: "major 6th", label: "M6", interval: { diatonicSteps: 5, semitones: 9 } },
  { name: "minor 7th", label: "m7", interval: { diatonicSteps: 6, semitones: 10 } },
  { name: "major 7th", label: "M7", interval: { diatonicSteps: 6, semitones: 11 } },
];

const SCALE_NAMES = {
  major: "Major",
  naturalMinor: "Natural minor",
  harmonicMinor: "Harmonic minor",
  melodicMinorAscending: "Melodic minor ascending",
  majorPentatonic: "Major pentatonic",
  minorPentatonic: "Minor pentatonic",
  minorBlues: "Minor blues",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  locrian: "Locrian",
};

const $ = (id) => document.getElementById(id);

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

function randomItem(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function sameSpelling(a, b) {
  return a.letter === b.letter && a.accidental === b.accidental;
}

function setFeedback(element, text, kind = "") {
  element.textContent = text;
  element.className = `feedback${kind ? ` ${kind}` : ""}`;
}

function parseAnswer(input) {
  const value = input.value.trim();
  if (!value) throw new Error("Enter a note name first, for example C# or Bb.");
  return parseNote(value);
}

function degreeLabel(tone) {
  const count = Math.abs(tone.alteration);
  const accidental = tone.alteration > 0 ? "#".repeat(count) : tone.alteration < 0 ? "b".repeat(count) : "";
  return `${accidental}${tone.degree}`;
}

function toneSummary(tone) {
  return `${degreeLabel(tone)} (${formatNote(tone.note)})`;
}

function scaleName(scaleId) {
  return SCALE_NAMES[scaleId] ?? scaleId;
}

function noteToPitch(note) {
  return parsePitch(`${formatNote(note)}4`);
}

function relationText(relation) {
  const refs = relation.degreeReferences.length ? relation.degreeReferences.map(toneSummary).join(", ") : "none";
  const matches = relation.matchingTones.length ? relation.matchingTones.map(toneSummary).join(", ") : "none";
  const alteration = relation.alterationFromScale === null
    ? "no unique reference"
    : relation.alterationFromScale === 0
      ? "0 (matches the unique written-degree reference)"
      : `${relation.alterationFromScale > 0 ? "+" : ""}${relation.alterationFromScale}`;
  return [
    `Written interval from tonic: ${relation.interval.label}; written degree: ${relation.degree}.`,
    `Reference status: ${relation.referenceStatus}; degree references: ${refs}.`,
    `Alteration from scale reference: ${alteration}.`,
    `Sounding membership: ${relation.inScale ? "yes" : "no"}; matching scale tones: ${matches}.`,
    `Exact spelling match: ${relation.spellingMatches ? "yes" : "no"}.`,
  ].join("\n");
}

// Tabs
for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => {
    const target = tab.dataset.panel;
    for (const other of document.querySelectorAll(".tab")) {
      other.setAttribute("aria-selected", String(other === tab));
    }
    for (const panel of document.querySelectorAll(".panel")) {
      panel.hidden = panel.id !== `panel-${target}`;
    }
  });
}

// Interval transfer
const intervalRoot = $("interval-root");
const intervalKind = $("interval-kind");
const intervalAnswer = $("interval-answer");
const intervalPrompt = $("interval-prompt");
const intervalFeedback = $("interval-feedback");
const intervalEvidence = $("interval-evidence");

for (const root of ROOTS) {
  intervalRoot.add(new Option(root, root));
}
for (const [index, item] of INTERVALS.entries()) {
  intervalKind.add(new Option(`${item.label} — ${item.name}`, String(index)));
}
intervalRoot.value = "A";
intervalKind.value = String(INTERVALS.findIndex((item) => item.label === "m3"));

function currentInterval() {
  return INTERVALS[Number(intervalKind.value)];
}

function updateIntervalPrompt({ clear = true } = {}) {
  const item = currentInterval();
  intervalPrompt.textContent = `From ${intervalRoot.value}, name the ${item.name} (${item.label}).`;
  if (clear) {
    intervalAnswer.value = "";
    setFeedback(intervalFeedback, "Answer first. Enharmonic sound and written spelling are evaluated separately.");
    intervalEvidence.textContent = "No answer checked yet.";
    intervalAnswer.focus();
  }
}

function checkInterval() {
  try {
    const root = parseNote(intervalRoot.value);
    const item = currentInterval();
    const expected = transposeNote(root, item.interval);
    const answer = parseAnswer(intervalAnswer);
    const actualRelation = intervalBetweenNotes(root, answer);
    const exact = sameSpelling(answer, expected);
    const sameSound = pitchClass(answer) === pitchClass(expected);

    if (exact) {
      setFeedback(intervalFeedback, `Correct. ${formatNote(root)} → ${formatNote(expected)} is ${item.label} (${item.name}).`, "good");
    } else if (sameSound) {
      setFeedback(
        intervalFeedback,
        `Sounding pitch is correct, but the spelling changes the musical relationship.\nTarget: ${formatNote(root)} → ${formatNote(expected)} = ${item.label}.\nYou wrote ${formatNote(answer)}, giving the written interval ${actualRelation.label}.`,
        "warn",
      );
    } else {
      setFeedback(
        intervalFeedback,
        `Not yet. ${formatNote(root)} → ${formatNote(answer)} is ${actualRelation.label}; the target is ${item.label}. Try again before revealing.`,
        "bad",
      );
    }

    intervalEvidence.textContent = JSON.stringify({
      root,
      requestedInterval: item.interval,
      expectedNote: expected,
      submittedNote: answer,
      submittedWrittenInterval: actualRelation,
      soundingPitchMatches: sameSound,
      exactSpellingMatches: exact,
    }, null, 2);
  } catch (error) {
    setFeedback(intervalFeedback, error instanceof Error ? error.message : "Could not check that answer.", "bad");
  }
}

$("interval-check").addEventListener("click", checkInterval);
$("interval-reveal").addEventListener("click", () => {
  try {
    const expected = transposeNote(parseNote(intervalRoot.value), currentInterval().interval);
    setFeedback(intervalFeedback, `Answer: ${formatNote(expected)}. Say the relationship aloud, then move it to another root.`, "warn");
  } catch (error) {
    setFeedback(intervalFeedback, error instanceof Error ? error.message : "Could not reveal the answer.", "bad");
  }
});
$("interval-random").addEventListener("click", () => {
  intervalRoot.value = randomItem(ROOTS);
  intervalKind.value = String(Math.floor(Math.random() * INTERVALS.length));
  updateIntervalPrompt();
});
intervalRoot.addEventListener("change", () => updateIntervalPrompt());
intervalKind.addEventListener("change", () => updateIntervalPrompt());
intervalAnswer.addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkInterval();
});

// Scale degree recall + contextual probe
const scaleTonic = $("scale-tonic");
const scaleIdSelect = $("scale-id");
const scaleAnswer = $("scale-answer");
const scalePrompt = $("scale-prompt");
const scaleFeedback = $("scale-feedback");
const scaleProbe = $("scale-probe");
const scaleAnalysis = $("scale-analysis");
let currentScaleTone = null;

for (const root of ROOTS) {
  scaleTonic.add(new Option(root, root));
}
for (const scaleId of Object.keys(SCALE_FORMULAS)) {
  scaleIdSelect.add(new Option(scaleName(scaleId), scaleId));
}
scaleTonic.value = "C";
scaleIdSelect.value = "minorBlues";

function currentScale() {
  return unwrap(musicQueries.getScale({ tonic: parseNote(scaleTonic.value), scaleId: scaleIdSelect.value }));
}

function newScaleQuestion() {
  try {
    const scale = currentScale();
    currentScaleTone = randomItem(scale.tones);
    scalePrompt.textContent = `In ${formatNote(scale.tonic)} ${scaleName(scale.scaleId)}, what note is degree ${degreeLabel(currentScaleTone)}?`;
    scaleAnswer.value = "";
    setFeedback(scaleFeedback, "Use the degree label, not a remembered box shape.");
    scaleAnswer.focus();
  } catch (error) {
    setFeedback(scaleFeedback, error instanceof Error ? error.message : "Could not build that scale.", "bad");
  }
}

function analyseInCurrentScale(note) {
  const [analysis] = unwrap(musicQueries.analyseNotes({
    notes: [noteToPitch(note)],
    context: { activeScale: { tonic: parseNote(scaleTonic.value), scaleId: scaleIdSelect.value } },
  }));
  if (!analysis?.scaleRelation) throw new Error("Scale relation was not returned.");
  return analysis.scaleRelation;
}

function checkScaleDegree() {
  try {
    if (!currentScaleTone) newScaleQuestion();
    const answer = parseAnswer(scaleAnswer);
    const expected = currentScaleTone.note;
    const exact = sameSpelling(answer, expected);
    const sameSound = pitchClass(answer) === pitchClass(expected);
    const relation = analyseInCurrentScale(answer);

    if (exact) {
      setFeedback(
        scaleFeedback,
        `Correct. ${formatNote(expected)} is ${degreeLabel(currentScaleTone)} in ${scaleTonic.value} ${scaleName(scaleIdSelect.value)}.`,
        "good",
      );
    } else if (sameSound) {
      setFeedback(
        scaleFeedback,
        `Same sounding pitch, different written identity. Expected ${formatNote(expected)} for ${degreeLabel(currentScaleTone)}; you wrote ${formatNote(answer)}.\n${relationText(relation)}`,
        "warn",
      );
    } else {
      setFeedback(
        scaleFeedback,
        `Not yet. You wrote ${formatNote(answer)}.\n${relationText(relation)}`,
        "bad",
      );
    }
  } catch (error) {
    setFeedback(scaleFeedback, error instanceof Error ? error.message : "Could not check that answer.", "bad");
  }
}

function analyseProbe() {
  try {
    const note = parseAnswer(scaleProbe);
    const relation = analyseInCurrentScale(note);
    const heading = `${formatNote(note)} against ${scaleTonic.value} ${scaleName(scaleIdSelect.value)}:`;
    setFeedback(scaleAnalysis, `${heading}\n${relationText(relation)}`, relation.inScale ? (relation.spellingMatches ? "good" : "warn") : "bad");
  } catch (error) {
    setFeedback(scaleAnalysis, error instanceof Error ? error.message : "Could not analyse that note.", "bad");
  }
}

$("scale-new").addEventListener("click", newScaleQuestion);
$("scale-check").addEventListener("click", checkScaleDegree);
$("scale-reveal").addEventListener("click", () => {
  try {
    if (!currentScaleTone) newScaleQuestion();
    const scale = currentScale();
    setFeedback(
      scaleFeedback,
      `Answer: ${formatNote(currentScaleTone.note)}.\nFull scale: ${scale.tones.map((tone) => `${degreeLabel(tone)}=${formatNote(tone.note)}`).join("  ·  ")}`,
      "warn",
    );
  } catch (error) {
    setFeedback(scaleFeedback, error instanceof Error ? error.message : "Could not reveal the scale.", "bad");
  }
});
$("scale-analyse").addEventListener("click", analyseProbe);
scaleTonic.addEventListener("change", () => {
  newScaleQuestion();
  setFeedback(scaleAnalysis, "Try a note to inspect its relationship.");
});
scaleIdSelect.addEventListener("change", () => {
  newScaleQuestion();
  setFeedback(scaleAnalysis, "Try a note to inspect its relationship.");
});
scaleAnswer.addEventListener("keydown", (event) => {
  if (event.key === "Enter") checkScaleDegree();
});
scaleProbe.addEventListener("keydown", (event) => {
  if (event.key === "Enter") analyseProbe();
});

// Fretboard retrieval
const fretboard = $("fretboard");
const fretTargetInput = $("fret-target");
const fretPrompt = $("fret-prompt");
const fretFeedback = $("fret-feedback");
let fretTargetNote = parseNote("C");
const selectedPositions = new Set();

function positionKey(stringIndex, fret) {
  return `${stringIndex}:${fret}`;
}

function boardButtons() {
  return [...fretboard.querySelectorAll(".fret-cell")];
}

function resetBoardMarks({ clearSelection = false } = {}) {
  if (clearSelection) selectedPositions.clear();
  for (const button of boardButtons()) {
    button.classList.remove("correct", "wrong", "revealed");
    button.textContent = "";
    const key = positionKey(Number(button.dataset.stringIndex), Number(button.dataset.fret));
    const selected = selectedPositions.has(key);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function renderFretboard() {
  const header = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "String";
  header.append(corner);
  for (let fret = 0; fret <= 12; fret += 1) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = String(fret);
    header.append(th);
  }
  const thead = document.createElement("thead");
  thead.append(header);

  const tbody = document.createElement("tbody");
  STANDARD_FRETBOARD.tuning.openStrings.forEach((openPitch, stringIndex) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.className = "string-name";
    label.textContent = `${6 - stringIndex} · ${formatPitch(openPitch)}`;
    row.append(label);

    for (let fret = 0; fret <= 12; fret += 1) {
      const cell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fret-cell";
      button.dataset.stringIndex = String(stringIndex);
      button.dataset.fret = String(fret);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `String ${6 - stringIndex}, fret ${fret}`);
      button.addEventListener("click", () => {
        resetBoardMarks();
        const key = positionKey(stringIndex, fret);
        if (selectedPositions.has(key)) selectedPositions.delete(key);
        else selectedPositions.add(key);
        button.classList.toggle("selected", selectedPositions.has(key));
        button.setAttribute("aria-pressed", String(selectedPositions.has(key)));
      });
      cell.append(button);
      row.append(cell);
    }
    tbody.append(row);
  });

  fretboard.replaceChildren(thead, tbody);
}

function setFretTarget(value = fretTargetInput.value) {
  try {
    fretTargetNote = parseNote(value.trim());
    fretTargetInput.value = formatNote(fretTargetNote);
    resetBoardMarks({ clearSelection: true });
    fretPrompt.textContent = `Find every ${formatNote(fretTargetNote)} from fret 0 through 12.`;
    setFeedback(fretFeedback, "Click every place you think the target note occurs.");
  } catch (error) {
    setFeedback(fretFeedback, error instanceof Error ? error.message : "Could not set that target note.", "bad");
  }
}

function correctFretKeys() {
  const locations = unwrap(musicQueries.getFretboardLocations({
    fretRange: { minFret: 0, maxFret: 12 },
    pitchClasses: [pitchClass(fretTargetNote)],
  }));
  return new Set(locations.map(({ position }) => positionKey(position.stringIndex, position.fret)));
}

function checkFretboard() {
  try {
    resetBoardMarks();
    const correct = correctFretKeys();
    let correctSelected = 0;
    let wrongSelected = 0;

    for (const button of boardButtons()) {
      const key = positionKey(Number(button.dataset.stringIndex), Number(button.dataset.fret));
      if (!selectedPositions.has(key)) continue;
      if (correct.has(key)) {
        correctSelected += 1;
        button.classList.add("correct");
      } else {
        wrongSelected += 1;
        button.classList.add("wrong");
      }
    }

    const missing = correct.size - correctSelected;
    if (wrongSelected === 0 && missing === 0) {
      setFeedback(fretFeedback, `Correct. You found all ${correct.size} occurrences of ${formatNote(fretTargetNote)}.`, "good");
    } else {
      setFeedback(
        fretFeedback,
        `${correctSelected} correct selection${correctSelected === 1 ? "" : "s"}; ${wrongSelected} wrong; ${missing} still missing. Search by note relationships rather than scanning randomly.`,
        wrongSelected > 0 ? "bad" : "warn",
      );
    }
  } catch (error) {
    setFeedback(fretFeedback, error instanceof Error ? error.message : "Could not check the fretboard.", "bad");
  }
}

function revealFretboard() {
  try {
    const correct = correctFretKeys();
    for (const button of boardButtons()) {
      const stringIndex = Number(button.dataset.stringIndex);
      const fret = Number(button.dataset.fret);
      const key = positionKey(stringIndex, fret);
      if (!correct.has(key)) continue;
      const location = unwrap(musicQueries.getNoteAtFret({
        position: { stringIndex, fret },
        root: fretTargetNote,
      }));
      button.classList.add("revealed");
      button.textContent = formatNote(location.pitch.note);
    }
    setFeedback(fretFeedback, `Revealed ${correct.size} target locations. Before moving on, say the string and fret for each one aloud.`, "warn");
  } catch (error) {
    setFeedback(fretFeedback, error instanceof Error ? error.message : "Could not reveal the fretboard.", "bad");
  }
}

renderFretboard();
setFretTarget("C");
$("fret-set").addEventListener("click", () => setFretTarget());
$("fret-random").addEventListener("click", () => setFretTarget(randomItem(FRET_TARGETS)));
$("fret-check").addEventListener("click", checkFretboard);
$("fret-reveal").addEventListener("click", revealFretboard);
$("fret-clear").addEventListener("click", () => {
  resetBoardMarks({ clearSelection: true });
  setFeedback(fretFeedback, "Selections cleared. Try again from memory.");
});
fretTargetInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") setFretTarget();
});

updateIntervalPrompt({ clear: false });
newScaleQuestion();
