import {
  STANDARD_FRETBOARD,
  formatNote,
  formatPitch,
  intervalBetweenNotes,
  musicQueries,
  parseNote,
  pitchClass,
} from "/engine/index.js";
import { reflectionNextHidden, resetSessionState, timerSnapshot } from "/session-logic.mjs";

const $ = (id) => document.getElementById(id);

const G_STRING = 3;
const B_STRING = 4;
const MAX_FRET = 12;

const stages = [
  { kind: "orient", title: "Orient the ear", kicker: "Theory becomes a sound before it becomes a fret" },
  { kind: "target", rootName: "A", chordId: "minor", toneIndex: 0, stringIndex: G_STRING, title: "Anchor the tonic", kicker: "One string · one reference" },
  { kind: "target", rootName: "A", chordId: "minor", toneIndex: 1, stringIndex: G_STRING, requireSing: true, title: "Predict the minor third", kicker: "Sing → find → play → explain" },
  { kind: "target", rootName: "A", chordId: "major", toneIndex: 1, stringIndex: G_STRING, requireSing: true, title: "Contrast the major third", kicker: "Change one thing and listen" },
  { kind: "contrast", title: "Hear what the third changes", kicker: "Minimal pair: ♭3 versus 3" },
  { kind: "target", rootName: "A", chordId: "minor", toneIndex: 2, stringIndex: G_STRING, requireSing: true, title: "Add the fifth", kicker: "Complete 1–♭3–5 on one line" },
  { kind: "context", title: "Same C, different job", kicker: "Pitch stays fixed · function changes" },
  { kind: "target", rootName: "D", chordId: "minor", toneIndex: 1, stringIndex: B_STRING, requireSing: true, title: "Transfer the sound to D minor", kicker: "New root · new string · same function" },
  { kind: "target", rootName: "D", chordId: "major", toneIndex: 1, stringIndex: B_STRING, requireSing: true, title: "Contrast again in the new key", kicker: "Prove the sound is not A-specific" },
  { kind: "map", rootName: "D", chordId: "minor", stringIndex: B_STRING, title: "Rebuild D minor by function", kicker: "Retrieve 1 → ♭3 → 5 without a box" },
  { kind: "musicalize", title: "Use the functions in time", kicker: "Play / rest / audiate" },
  { kind: "reflect", title: "Find the weak link", kicker: "Theory, ear, location or context?" },
  { kind: "complete", title: "Session complete", kicker: "Retest later in a new key" },
];

const state = {
  stageIndex: 0,
  selected: null,
  checked: false,
  hintLevel: 0,
  lastWrong: null,
  theoryRevealed: false,
  mapRoleIndex: 0,
  savedMap: [],
  timerRemaining: 35,
  timerDeadlineMs: null,
  timerPhase: "READY",
  timerId: null,
  timerStarted: false,
  timerFinished: false,
  reflection: null,
};

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

function currentStage() {
  return stages[state.stageIndex];
}

function notePc(note) {
  return pitchClass(note);
}

function degreeLabel(tone) {
  const count = Math.abs(tone.alteration);
  const accidental = tone.alteration > 0 ? "#".repeat(count) : tone.alteration < 0 ? "♭".repeat(count) : "";
  return `${accidental}${tone.degree}`;
}

function chord(rootName, chordId) {
  return unwrap(musicQueries.getChord({ root: parseNote(rootName), chordId }));
}

function scale(rootName, scaleId) {
  return unwrap(musicQueries.getScale({ tonic: parseNote(rootName), scaleId }));
}

function targetTone(stage = currentStage()) {
  if (stage.kind === "map") return chord(stage.rootName, stage.chordId).tones[state.mapRoleIndex];
  if (stage.kind !== "target") return null;
  return chord(stage.rootName, stage.chordId).tones[stage.toneIndex];
}

function targetInterval(stage = currentStage()) {
  const tone = targetTone(stage);
  return tone ? intervalBetweenNotes(parseNote(stage.rootName), tone.note) : null;
}

function getLocation(position, rootName) {
  return unwrap(musicQueries.getNoteAtFret({ position, root: parseNote(rootName) }));
}

function positionKey(position) {
  return `${position.stringIndex}:${position.fret}`;
}

function stringNumber(stringIndex) {
  return 6 - stringIndex;
}

function openPitch(stringIndex) {
  return STANDARD_FRETBOARD.tuning.openStrings[stringIndex];
}

function stringLabel(stringIndex) {
  return `${stringNumber(stringIndex)} · ${formatPitch(openPitch(stringIndex))}`;
}

function simpleStringName(stringIndex) {
  return formatNote(openPitch(stringIndex).note);
}

function setFeedback(text, kind = "") {
  const element = $("feedback");
  element.textContent = text;
  element.className = `feedback${kind ? ` ${kind}` : ""}`;
}

function clearLens() {
  const lens = $("lens-content");
  lens.className = "lens-placeholder";
  lens.textContent = "The lens stays deliberately sparse until you act. After a correct commitment or reveal, the same sound is relabeled across theory, fretboard and harmony.";
}

function appendRows(container, rows) {
  const grid = document.createElement("div");
  grid.className = "theory-grid";
  for (const [key, value] of rows) {
    const row = document.createElement("div");
    row.className = "theory-row";
    const keyEl = document.createElement("div");
    keyEl.className = "theory-key";
    keyEl.textContent = key;
    const valueEl = document.createElement("div");
    valueEl.textContent = value;
    row.append(keyEl, valueEl);
    grid.append(row);
  }
  container.replaceChildren(grid);
}

function setTheory(title, rows) {
  $("theory-panel").hidden = false;
  $("theory-title").textContent = title;
  appendRows($("theory-content"), rows);
}

function setLens(rows) {
  const lens = $("lens-content");
  lens.className = "";
  appendRows(lens, rows);
}

function resetStageInteraction() {
  state.selected = null;
  state.checked = false;
  state.hintLevel = 0;
  state.lastWrong = null;
  state.theoryRevealed = false;
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function setStage(index) {
  const previous = currentStage();
  stopTimer();
  state.stageIndex = Math.max(0, Math.min(index, stages.length - 1));
  resetStageInteraction();
  const next = currentStage();
  if (next.kind === "map" && previous.kind !== "map") {
    state.mapRoleIndex = 0;
    state.savedMap = [];
  }
  if (next.kind !== "musicalize") {
    state.timerRemaining = 35;
    state.timerDeadlineMs = null;
    state.timerPhase = "READY";
    state.timerStarted = false;
    state.timerFinished = false;
  }
  renderStage();
}

function advanceStage() {
  if (state.stageIndex < stages.length - 1) setStage(state.stageIndex + 1);
}

function stageContext(stage) {
  if (stage.kind === "target" || stage.kind === "map") {
    const drone = stage.rootName === "A" ? "open A drone" : "open D drone";
    return `${stage.rootName} center · ${drone} · ${simpleStringName(stage.stringIndex)} string only`;
  }
  if (stage.kind === "contrast") return "A center · open A drone · G string";
  if (stage.kind === "context") return "Static pitch C · changing harmony";
  if (stage.kind === "musicalize") return "D minor · open D drone · B string only";
  if (stage.kind === "reflect") return "Reflection · no score";
  if (stage.kind === "complete") return "Delayed transfer beats same-session repetition";
  return "A center · open A string is the auditory anchor";
}

function stageMaterial(stage) {
  if (stage.kind === "target") {
    const tone = targetTone(stage);
    return `Current simple relationship: ${degreeLabel(tone)} · ${targetInterval(stage).label}`;
  }
  if (stage.kind === "map") return "Material: D minor = 1 · ♭3 · 5";
  if (stage.kind === "contrast") return "Contrast: ♭3 ↔ 3";
  if (stage.kind === "context") return "One pitch: C · several functions";
  if (stage.kind === "musicalize") return "Phrase vocabulary: 1 · ♭3 · 5";
  return "Theory lens: note ↔ interval ↔ degree ↔ chord role ↔ sound ↔ location";
}

function renderStage() {
  const stage = currentStage();
  $("progress-text").textContent = `${state.stageIndex + 1} / ${stages.length}`;
  $("progress-fill").style.width = `${((state.stageIndex + 1) / stages.length) * 100}%`;
  $("stage-kicker").textContent = stage.kicker;
  $("stage-title").textContent = stage.title;
  $("context-label").textContent = stageContext(stage);
  $("material-label").textContent = stageMaterial(stage);

  $("string-section").hidden = true;
  $("theory-panel").hidden = true;
  $("timer-panel").hidden = true;
  $("reflection-panel").hidden = true;
  $("check-button").hidden = true;
  $("hint-button").hidden = true;
  $("reveal-button").hidden = true;
  $("done-button").hidden = true;
  $("next-button").hidden = true;
  $("restart-button").hidden = stage.kind !== "complete";
  clearLens();

  if (stage.kind === "orient") renderOrient();
  if (stage.kind === "target") renderTarget(stage);
  if (stage.kind === "contrast") renderContrast();
  if (stage.kind === "context") renderContextShift();
  if (stage.kind === "map") renderMap(stage);
  if (stage.kind === "musicalize") renderMusicalize();
  if (stage.kind === "reflect") renderReflect();
  if (stage.kind === "complete") renderComplete();
}

function renderOrient() {
  $("stage-prompt").textContent = "Strike the open A string a few times and keep that pitch in your head. Today, every theoretical label must become something you try to hear before you find it.";
  $("stage-instruction").textContent = "You are not practising vocal technique. Singing is only a checkpoint: can you form an auditory target before your fingers move? We will stay on one string so a familiar 2D box cannot do the thinking for you. Degree labels and interval labels below describe the simple relationship to the root; the actual guitar pitches may be separated by one or more octaves from the open-string drone.";
  setFeedback("Say this once: “A is 1. I will hear the relationship, then find it.”");
  $("done-button").hidden = false;
  $("done-button").textContent = "Start with the tonic";
}

function targetPrompt(stage) {
  const tone = targetTone(stage);
  const label = degreeLabel(tone);
  const stringName = simpleStringName(stage.stringIndex);
  if (stage.toneIndex === 0) {
    return `Strike open ${stage.rootName}. On the ${stringName} string, find another ${stage.rootName}. Play it first, then commit the fret you used.`;
  }
  const roleName = stage.toneIndex === 1
    ? `${stage.chordId === "minor" ? "minor" : "major"} third`
    : "perfect fifth";
  return `Keep ${stage.rootName} as the anchor. Before your fingers move, sing the ${label} (${roleName}) you expect. Then find it on the ${stringName} string, play it against the drone, and commit the fret.`;
}

function targetTheoryRows(stage, position) {
  const tone = targetTone(stage);
  const interval = targetInterval(stage);
  const quality = stage.chordId === "minor" ? "minor" : "major";
  const role = degreeLabel(tone);
  const rows = [
    ["Note", formatNote(tone.note)],
    ["Simple interval from root", `${interval.label} · ${role}`],
    ["Chord role", `${role} in ${stage.rootName} ${quality}`],
    ["Fretboard", `${simpleStringName(stage.stringIndex)} string · fret ${position.fret}`],
  ];
  if (stage.toneIndex === 0) rows.push(["Listening job", "Treat this as home. Keep returning to it so the other degrees have a reference."]);
  if (stage.chordId === "minor" && stage.toneIndex === 1) rows.push(["Listening job", "Hear how this third defines the minor quality when contrasted with the natural 3."]);
  if (stage.chordId === "major" && stage.toneIndex === 1) rows.push(["Listening job", "Compare this directly with ♭3. Only one semitone changed, but the chord quality changed."]);
  if (stage.toneIndex === 2) rows.push(["Listening job", "The 5 is shared by the parallel major and minor triads; the third is what changes their quality here."]);
  return rows;
}

function renderTarget(stage) {
  $("string-section").hidden = false;
  $("stage-prompt").textContent = targetPrompt(stage);
  $("stage-instruction").textContent = stage.requireSing
    ? "Do not judge the exercise by whether you eventually found the fret. Notice whether the sound existed in your head before the guitar confirmed it."
    : "Use the physical guitar first. The screen only records the fret after you have played it.";
  $("check-button").hidden = false;
  $("hint-button").hidden = false;
  $("check-button").textContent = "Check committed fret";
  renderStringBoard(stage.stringIndex);

  if (state.checked) {
    const rows = targetTheoryRows(stage, state.selected);
    setFeedback(`Correct. ${formatNote(targetTone(stage).note)} is ${degreeLabel(targetTone(stage))} (${targetInterval(stage).label} as a simple interval) from ${stage.rootName}. Now connect the label to the sound you just heard.`, "good");
    setTheory("Multi-representational theory lens", rows);
    setLens(rows);
    $("next-button").hidden = false;
    $("next-button").textContent = "Continue";
  } else if (state.lastWrong) {
    const wrong = state.lastWrong;
    setFeedback(`You committed ${wrong.note} at fret ${wrong.fret}. Relative to ${stage.rootName}, its simple written relationship is ${wrong.interval}. The target is ${degreeLabel(targetTone(stage))} (${targetInterval(stage).label}). Sing the target again before moving your finger.`, "bad");
  } else {
    setFeedback(stage.requireSing ? "Sing first. Play second. Commit the fret third." : "Play first, then commit the fret you actually used.");
  }
}

function renderContrast() {
  $("stage-prompt").textContent = "Keep the open A string as the drone. Alternate G-string fret 5 (C) and fret 6 (C#). Sing each one before playing it. What changes when only the third moves by one fret?";
  $("stage-instruction").textContent = "Do several slow A→C and A→C# comparisons. Do not rush to the labels. First notice that the two sounds create different chord qualities against the same root; then attach ♭3 / simple m3 and 3 / simple M3 to what you heard.";
  if (!state.theoryRevealed) {
    setFeedback("Say your observation aloud before revealing. The useful part is the contrast, not choosing a button.");
    $("reveal-button").hidden = false;
    $("reveal-button").textContent = "Reveal the contrast lens";
    return;
  }
  const rows = [
    ["A → C", "simple m3 · ♭3 · C is the third of A minor"],
    ["A → C#", "simple M3 · 3 · C# is the third of A major"],
    ["What stayed fixed", "Root A and fifth E"],
    ["What changed", "Only the third: C ↔ C#"],
    ["Theory meaning", "The third distinguishes these parallel minor and major triads."],
  ];
  setFeedback("Now the labels should name a contrast you have already heard, not replace the hearing.", "good");
  setTheory("Minor-third / major-third contrast", rows);
  setLens(rows);
  $("next-button").hidden = false;
  $("next-button").textContent = "Add the fifth";
}

function roleInChord(noteName, rootName, chordId) {
  const note = parseNote(noteName);
  const matching = chord(rootName, chordId).tones.find((tone) => tone.pitchClass === notePc(note));
  return matching ? degreeLabel(matching) : null;
}

function roleInScale(noteName, rootName, scaleId) {
  const note = parseNote(noteName);
  const matching = scale(rootName, scaleId).tones.find((tone) => tone.pitchClass === notePc(note));
  return matching ? degreeLabel(matching) : null;
}

function renderContextTable() {
  const content = $("theory-content");
  const table = document.createElement("table");
  table.className = "context-table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const text of ["Context", "C becomes", "Why it matters"]) {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.append(th);
  }
  head.append(headRow);
  const body = document.createElement("tbody");
  const rows = [
    ["A minor chord", roleInChord("C", "A", "minor"), "Chord tone: the minor third"],
    ["F major chord", roleInChord("C", "F", "major"), "Chord tone: the fifth"],
    ["C major chord", roleInChord("C", "C", "major"), "Chord tone: the root"],
    ["D natural minor", roleInScale("C", "D", "naturalMinor"), "Scale tone: ♭7; C is not in the D-minor triad"],
  ];
  for (const rowValues of rows) {
    const row = document.createElement("tr");
    for (const value of rowValues) {
      const td = document.createElement("td");
      td.textContent = value ?? "outside current triad";
      row.append(td);
    }
    body.append(row);
  }
  table.append(head, body);
  content.replaceChildren(table);
}

function renderContextShift() {
  $("stage-prompt").textContent = "Keep C fixed at G-string fret 5. Before revealing anything, say what C is relative to four contexts: A minor, F major, C major, and D natural minor.";
  $("stage-instruction").textContent = "Use the guitar. Strum or arpeggiate each chord you know, then play the same C. For D minor, play Dm and then C as a colour tone. The pitch does not move; only its theoretical and perceptual job changes.";
  if (!state.theoryRevealed) {
    setFeedback("Predict the roles aloud first. Calculation is allowed, but notice which ones are immediate and which ones need counting.");
    $("reveal-button").hidden = false;
    $("reveal-button").textContent = "Reveal C's changing functions";
    return;
  }
  $("theory-panel").hidden = false;
  $("theory-title").textContent = "Same pitch, different function";
  renderContextTable();
  const lensRows = [
    ["C over A minor", "♭3"],
    ["C over F major", "5"],
    ["C over C major", "1"],
    ["C in D natural minor", "♭7"],
  ];
  setLens(lensRows);
  setFeedback("This is the multi-representational step: C is not permanently 'the ♭3'. Its function depends on what the music treats as the root and harmony.", "good");
  $("next-button").hidden = false;
  $("next-button").textContent = "Transfer to D minor";
}

function renderMap(stage) {
  $("string-section").hidden = false;
  const tones = chord(stage.rootName, stage.chordId).tones;
  if (state.mapRoleIndex >= tones.length) {
    $("stage-prompt").textContent = "You rebuilt D–F–A as 1–♭3–5 on the B string. Now look at the three functions as one connected map, not three unrelated frets.";
    $("stage-instruction").textContent = "Play D→F→A, then A→F→D. Sing each target just before you strike it. Try to feel the interval/function before remembering the fret numbers.";
    renderStringBoard(stage.stringIndex);
    const rows = state.savedMap.map((item) => [item.label, `${item.note} · ${simpleStringName(stage.stringIndex)} string fret ${item.position.fret}`]);
    setTheory("D-minor functional map", rows);
    setLens(rows);
    setFeedback("Map complete. The point is not the three dots; it is the direct link D↔1, F↔♭3, A↔5, with a sound and location attached to each.", "good");
    $("next-button").hidden = false;
    $("next-button").textContent = "Use it in time";
    return;
  }

  const tone = targetTone(stage);
  const interval = targetInterval(stage);
  $("stage-prompt").textContent = `Current target: ${degreeLabel(tone)} (${interval.label} as a simple interval) of D. Sing it first, find it on the B string, play it against open D, then commit the fret.`;
  $("stage-instruction").textContent = state.mapRoleIndex === 0
    ? "Start from function, not from the D-minor shape. Build the map one role at a time."
    : `Already established: ${state.savedMap.map((item) => item.label).join(" → ")}. Do not let those saved locations mechanically dictate the next one.`;
  $("check-button").hidden = false;
  $("hint-button").hidden = false;
  $("check-button").textContent = `Check ${degreeLabel(tone)}`;
  renderStringBoard(stage.stringIndex);
  setFeedback("Sing → play → commit. The saved labels remain visible only after each role is earned.");
}

function renderStringBoard(stringIndex) {
  const board = $("string-board");
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "String";
  header.append(corner);
  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = String(fret);
    header.append(th);
  }
  thead.append(header);

  const tbody = document.createElement("tbody");
  const row = document.createElement("tr");
  const label = document.createElement("th");
  label.scope = "row";
  label.className = "string-name";
  label.textContent = stringLabel(stringIndex);
  row.append(label);

  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    const cell = document.createElement("td");
    const button = document.createElement("button");
    const position = { stringIndex, fret };
    const selected = Boolean(state.selected && positionKey(state.selected) === positionKey(position));
    button.type = "button";
    button.className = "fret-cell";
    button.dataset.stringIndex = String(stringIndex);
    button.dataset.fret = String(fret);
    button.setAttribute("aria-label", `${simpleStringName(stringIndex)} string, fret ${fret}`);
    button.setAttribute("aria-pressed", String(selected));

    if (selected) button.classList.add("selected");
    if (state.lastWrong && state.lastWrong.fret === fret && state.lastWrong.stringIndex === stringIndex) {
      button.classList.add("wrong");
      button.textContent = state.lastWrong.note;
    }
    for (const saved of state.savedMap) {
      if (positionKey(saved.position) === positionKey(position)) {
        button.classList.add("saved");
        button.textContent = saved.label;
      }
    }
    if (state.checked && selected) {
      button.classList.add("correct");
      button.textContent = formatNote(getLocation(position, currentStage().rootName).pitch.note);
    }

    button.addEventListener("click", () => {
      if (state.checked) return;
      state.selected = position;
      state.lastWrong = null;
      renderStringBoard(stringIndex);
      const replacement = board.querySelector(`button[data-string-index="${stringIndex}"][data-fret="${fret}"]`);
      replacement?.focus();
      setFeedback(`Committed ${simpleStringName(stringIndex)} string fret ${fret}. Play it again against the drone, then check.`);
    });
    cell.append(button);
    row.append(cell);
  }
  tbody.append(row);
  board.replaceChildren(thead, tbody);
}

function targetFrets(stage) {
  const target = targetTone(stage);
  const hits = [];
  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    const location = getLocation({ stringIndex: stage.stringIndex, fret }, stage.rootName);
    if (location.pitchClass === target.pitchClass) hits.push(fret);
  }
  return hits;
}

function handleCheck() {
  const stage = currentStage();
  if (!["target", "map"].includes(stage.kind)) return;
  if (!state.selected) {
    setFeedback("Play the target on the guitar first, then commit the fret you used.", "warn");
    return;
  }

  const tone = targetTone(stage);
  const location = getLocation(state.selected, stage.rootName);
  const correct = location.pitchClass === tone.pitchClass;
  if (!correct) {
    const relation = intervalBetweenNotes(parseNote(stage.rootName), location.pitch.note);
    state.lastWrong = {
      fret: state.selected.fret,
      stringIndex: state.selected.stringIndex,
      note: formatNote(location.pitch.note),
      interval: relation.label,
    };
    state.selected = null;
    renderStringBoard(stage.stringIndex);
    setFeedback(`You played ${state.lastWrong.note}, whose simple written relationship to ${stage.rootName} is ${state.lastWrong.interval}. Target: ${degreeLabel(tone)} (${targetInterval(stage).label}). Sing the target again before repairing the fret.`, "bad");
    return;
  }

  if (stage.kind === "map") {
    const saved = {
      position: { ...state.selected },
      label: degreeLabel(tone),
      note: formatNote(tone.note),
    };
    state.savedMap.push(saved);
    state.mapRoleIndex += 1;
    state.selected = null;
    state.lastWrong = null;
    state.hintLevel = 0;
    renderStage();
    return;
  }

  state.checked = true;
  renderStage();
}

function handleHint() {
  const stage = currentStage();
  if (!["target", "map"].includes(stage.kind)) return;
  state.hintLevel += 1;
  const tone = targetTone(stage);
  const interval = targetInterval(stage);
  if (state.hintLevel === 1) {
    setFeedback(`Hint 1: hear the relationship first. The target is ${degreeLabel(tone)} (${interval.label} as a simple interval) from ${stage.rootName}. Use the root as the auditory anchor, not a memorized box.`, "warn");
    return;
  }
  if (state.hintLevel === 2) {
    setFeedback(`Hint 2: the target note name is ${formatNote(tone.note)}. Sing that pitch before searching the ${simpleStringName(stage.stringIndex)} string.`, "warn");
    return;
  }
  const hits = targetFrets(stage);
  setFeedback(`Hint 3: within frets 0–${MAX_FRET}, ${formatNote(tone.note)} occurs at fret ${hits.join(" / ")} on the ${simpleStringName(stage.stringIndex)} string. Play it against the drone before committing.`, "warn");
}

function renderMusicalize() {
  $("stage-prompt").textContent = "Keep open D as the anchor. On the B string, improvise with only D (1), F (♭3) and A (5). The timer alternates PLAY and REST every five seconds.";
  $("stage-instruction").textContent = "During PLAY, make a short phrase and deliberately target a function. During REST, keep your hands still and audiate the next phrase before it happens. Start one PLAY block on ♭3 and make the final note of the last PLAY block the root.";
  const rows = state.savedMap.length
    ? state.savedMap.map((item) => [item.label, `${item.note} · B string fret ${item.position.fret}`])
    : [["1", "D"], ["♭3", "F"], ["5", "A"]];
  setTheory("Phrase vocabulary", rows);
  setLens(rows);
  setFeedback("This stage tests whether theory can guide a phrase in time instead of remaining a static answer.");
  $("timer-panel").hidden = false;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  $("timer-value").textContent = `${state.timerRemaining}s`;
  $("timer-phase").textContent = state.timerPhase;
  if (state.timerFinished) {
    $("timer-start").hidden = true;
    $("timer-next").hidden = false;
    setFeedback("Finished. Before moving on, ask: were you hearing a target function before each PLAY block, or merely moving among three frets?", "good");
  } else {
    $("timer-start").hidden = state.timerStarted;
    $("timer-next").hidden = true;
  }
}

function syncTimer(nowMs = performance.now()) {
  if (!state.timerStarted || state.timerDeadlineMs === null) return;
  const snapshot = timerSnapshot(state.timerDeadlineMs, nowMs);
  state.timerRemaining = snapshot.remaining;
  state.timerFinished = snapshot.finished;
  state.timerPhase = snapshot.phase;
  if (state.timerFinished) stopTimer();
  updateTimerDisplay();
}

function startTimer() {
  if (state.timerStarted || state.timerFinished) return;
  state.timerStarted = true;
  state.timerDeadlineMs = performance.now() + 35_000;
  state.timerPhase = "PLAY";
  syncTimer();
  state.timerId = setInterval(() => syncTimer(), 100);
}

function renderReflect() {
  $("stage-prompt").textContent = "Which connection failed first when the session became harder?";
  $("stage-instruction").textContent = "Pick the most accurate failure mode, or choose no clear breakdown. We are not creating a mastery score; this is simply evidence about what the next session should stress.";
  setFeedback(state.reflection ? `Recorded: ${state.reflection}.` : "Choose one. The answer disappears when the page reloads.");
  $("reflection-panel").hidden = false;
  $("reflection-next").hidden = reflectionNextHidden(state.reflection);
}

function renderComplete() {
  $("stage-prompt").textContent = "Stop here. The next useful test is not another repetition of A or D minor.";
  $("stage-instruction").textContent = "On a later session, use a new minor key and another single string. The first question should again be auditory: can you sing the target function before your fingers search for it? Delayed transfer will tell us whether today's links survived.";
  setFeedback("Learning Lab v2 ends after theory, ear, fretboard, harmonic context and phrase use have all touched the same small set of relationships.", "good");
  const rows = [
    ["What you trained", "A sound before a fret"],
    ["Core contrast", "♭3 ↔ 3"],
    ["Context shift", "One pitch under changing harmonic roles"],
    ["Transfer", "A minor → D minor"],
    ["Application", "1 / ♭3 / 5 in timed phrases"],
  ];
  setTheory("Session integration", rows);
  setLens(rows);
}

function handleReflectionSubmit() {
  const selected = document.querySelector('input[name="breakdown"]:checked');
  if (!selected) {
    setFeedback("Choose the failure mode that felt most true, or choose no clear breakdown.", "warn");
    return;
  }
  const labels = {
    calculation: "theory was still calculation-heavy",
    audiation: "the label was known but the sound was not available before playing",
    location: "the sound was available but the fretboard location was slow",
    shape: "a familiar shape took over",
    context: "the same note became confusing when harmony changed",
    none: "no clear breakdown",
  };
  state.reflection = labels[selected.value];
  setFeedback(`Recorded for this session only: ${state.reflection}.`, "good");
  $("reflection-next").hidden = reflectionNextHidden(state.reflection);
}

$("check-button").addEventListener("click", handleCheck);
$("hint-button").addEventListener("click", handleHint);
$("reveal-button").addEventListener("click", () => {
  state.theoryRevealed = true;
  renderStage();
});
$("done-button").addEventListener("click", advanceStage);
$("next-button").addEventListener("click", advanceStage);
$("timer-start").addEventListener("click", startTimer);
$("timer-next").addEventListener("click", advanceStage);
$("reflection-submit").addEventListener("click", handleReflectionSubmit);
$("reflection-next").addEventListener("click", advanceStage);
$("restart-button").addEventListener("click", () => {
  stopTimer();
  resetSessionState(state);
  for (const input of document.querySelectorAll('input[name="breakdown"]')) input.checked = false;
  renderStage();
});

renderStage();
