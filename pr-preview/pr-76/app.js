import {
  STANDARD_FRETBOARD,
  formatNote,
  formatPitch,
  musicQueries,
  parseNote,
} from "./engine/index.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import {
  createSelection,
  createSessionPlan,
  degreeLabel,
  formulaLabel,
  reflectionNextHidden,
  resetSessionState,
  selectAllInFamily,
  selectFamily,
  timerSnapshot,
  toggleChordSelection,
} from "./session-logic.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { createFretboard } from "./fretboard-view.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";

const $ = (id) => document.getElementById(id);
const MAX_FRET = 12;
let chordFretboard;

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const catalog = unwrap(musicQueries.getChordCatalog({}));

const state = {
  view: "select",
  selection: createSelection(catalog[0].id),
  plan: null,
  stages: [],
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

function displayNote(name) {
  return name.replaceAll("#", "♯").replaceAll("b", "♭");
}

function chordSymbol(rootName, entry) {
  return `${displayNote(rootName)}${entry.symbol}`;
}

function currentFamily() {
  return catalog.find((family) => family.id === state.selection.familyId);
}

function buildChord(rootName, chordId) {
  return unwrap(musicQueries.getChord({ root: parseNote(rootName), chordId }));
}

function findLocations({ rootName, chordId, tone, stringIndices }) {
  return unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: MAX_FRET },
    ...(stringIndices ? { stringIndices } : {}),
    pitchClasses: [tone.pitchClass],
    root: parseNote(rootName),
    context: { currentChord: { root: parseNote(rootName), chordId } },
  }));
}

function createPlan(previousPlan = null) {
  return createSessionPlan({
    catalog,
    selection: state.selection,
    buildChord,
    findLocations,
    previousPlan,
    maxFret: MAX_FRET,
  });
}

function buildStages(plan) {
  return [
    { kind: "orient", title: "Orient the chord", kicker: "Establish context before searching" },
    { kind: "target", source: "primary", task: plan.primary.focusTask, title: "Predict the focus role", kicker: "Sing → find → play → commit" },
    ...(plan.primary.secondaryTask
      ? [{ kind: "target", source: "primary", task: plan.primary.secondaryTask, title: "Find another structural role", kicker: "Same chord · new relationship" }]
      : []),
    { kind: "map", title: "Reconstruct by function", kicker: "Roles before shapes" },
    { kind: "target", source: "transfer", task: plan.transfer.focusTask, title: "Transfer the same role", kicker: "New root · same formula identity" },
    ...(plan.contrastChordId
      ? [{ kind: "contrast", title: "Contrast the chord identity", kicker: "Change one formula and listen" }]
      : []),
    { kind: "musicalize", title: "Use the selected roles in time", kicker: "Play / rest / audiate" },
    { kind: "reflect", title: "Find the weak link", kicker: "Theory, ear, location or context?" },
    { kind: "complete", title: "Session complete", kicker: "Keep the vocabulary · vary the task" },
  ];
}

function sourceFor(stage) {
  return stage.source === "transfer" ? state.plan.transfer : state.plan.primary;
}

function currentStage() {
  return state.stages[state.stageIndex];
}

function currentTask(stage = currentStage()) {
  if (stage.kind === "map") return state.plan.primary.reconstruction[state.mapRoleIndex] ?? null;
  if (stage.kind === "target") return stage.task;
  return null;
}

function rootSource(stage = currentStage()) {
  return stage.kind === "target" ? sourceFor(stage) : state.plan.primary;
}

function getLocation(position, source) {
  return unwrap(musicQueries.getNoteAtFret({
    board: STANDARD_FRETBOARD,
    position,
    root: parseNote(source.rootName),
    context: { currentChord: { root: parseNote(source.rootName), chordId: source.chordId } },
  }));
}

function playedInterval(anchor, location) {
  return unwrap(musicQueries.getInterval({ from: anchor.pitch, to: location.pitch }));
}

function stringNumber(stringIndex) {
  return STANDARD_FRETBOARD.tuning.openStrings.length - stringIndex;
}

function stringName(stringIndex) {
  const open = STANDARD_FRETBOARD.tuning.openStrings[stringIndex];
  return `string ${stringNumber(stringIndex)} (${formatPitch(open)})`;
}

function setFeedback(text, kind = "") {
  const element = $("feedback");
  element.textContent = text;
  element.className = `feedback${kind ? ` ${kind}` : ""}`;
}

function clearLens() {
  const lens = $("lens-content");
  lens.className = "lens-placeholder";
  lens.textContent = "The theory lens stays sparse until you commit or deliberately reveal a comparison.";
}

function appendRows(container, rows) {
  const grid = document.createElement("div");
  grid.className = "theory-grid";
  for (const [key, value] of rows) {
    const row = document.createElement("div");
    row.className = "theory-row";
    const keyElement = document.createElement("div");
    keyElement.className = "theory-key";
    keyElement.textContent = key;
    const valueElement = document.createElement("div");
    valueElement.textContent = value;
    row.append(keyElement, valueElement);
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

function renderSelector() {
  if (chordFretboard) {
    chordFretboard.destroy();
    chordFretboard = null;
  }
  $("selector-view").hidden = false;
  $("session-view").hidden = true;
  const familyGrid = $("family-grid");
  familyGrid.replaceChildren();
  for (const family of catalog) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "family-button";
    button.textContent = family.displayName;
    button.setAttribute("aria-pressed", String(family.id === state.selection.familyId));
    if (family.id === state.selection.familyId) button.classList.add("selected");
    button.addEventListener("click", () => {
      state.selection = selectFamily(state.selection, family.id);
      renderSelector();
    });
    familyGrid.append(button);
  }

  const family = currentFamily();
  $("quality-heading").textContent = `${family.displayName} qualities`;
  const qualityList = $("quality-list");
  qualityList.replaceChildren();
  for (const entry of family.chords) {
    const label = document.createElement("label");
    label.className = "quality-choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = entry.id;
    input.checked = state.selection.chordIds.includes(entry.id);
    input.addEventListener("change", () => {
      state.selection = toggleChordSelection(state.selection, entry.id, input.checked);
      renderSelector();
    });
    const copy = document.createElement("span");
    const symbol = entry.symbol || "major";
    copy.innerHTML = `<strong>${entry.displayName}</strong><small>${symbol} · ${formulaLabel(entry.formula)}</small>`;
    label.append(input, copy);
    qualityList.append(label);
  }
  const count = state.selection.chordIds.length;
  $("start-session").disabled = count === 0;
  $("selection-feedback").textContent = count
    ? `${count} ${count === 1 ? "quality" : "qualities"} selected. The session will stay inside this vocabulary.`
    : "Select at least one quality.";
}

function startSession(previousPlan = null) {
  stopTimer();
  state.plan = createPlan(previousPlan);
  state.stages = buildStages(state.plan);
  resetSessionState(state);
  state.view = "session";
  $("selector-view").hidden = true;
  $("session-view").hidden = false;
  renderStage();
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
  state.stageIndex = Math.max(0, Math.min(index, state.stages.length - 1));
  resetStageInteraction();
  const next = currentStage();
  if (next.kind === "map" && previous?.kind !== "map") {
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
  if (state.stageIndex < state.stages.length - 1) setStage(state.stageIndex + 1);
}

function stageContext(stage) {
  if (stage.kind === "target") {
    const source = sourceFor(stage);
    return `${chordSymbol(source.rootName, source.entry)} · ${stringName(stage.task.stringIndex)} · frets ${stage.task.fretWindow.minFret}–${stage.task.fretWindow.maxFret}`;
  }
  if (stage.kind === "map") {
    return `${chordSymbol(state.plan.primary.rootName, state.plan.primary.entry)} · ${stringName(state.plan.primary.mapStringIndex)}`;
  }
  if (stage.kind === "contrast") return `${displayNote(state.plan.primary.rootName)} · compare chord formulas`;
  if (stage.kind === "musicalize") return `${chordSymbol(state.plan.primary.rootName, state.plan.primary.entry)} · selected physical roles`;
  if (stage.kind === "reflect") return "Reflection · no score or persistence";
  if (stage.kind === "complete") return `${currentFamily().displayName} · next variation`;
  return chordSymbol(state.plan.primary.rootName, state.plan.primary.entry);
}

function stageMaterial(stage) {
  if (stage.kind === "target") return `Target role: ${degreeLabel(stage.task.tone)} · note and fret stay hidden until action`;
  if (stage.kind === "map") {
    const roles = state.plan.primary.reconstruction.map(({ tone }) => degreeLabel(tone)).join(" · ");
    return `Physical subset: ${roles} · full formula: ${formulaLabel(state.plan.primary.chord.formula)}`;
  }
  if (stage.kind === "contrast") return "Predict what is retained, replaced or altered";
  if (stage.kind === "musicalize") {
    return `Phrase roles: ${state.plan.primary.reconstruction.map(({ tone }) => degreeLabel(tone)).join(" · ")}`;
  }
  return `Complete abstract formula: ${formulaLabel(state.plan.primary.chord.formula)}`;
}

function renderStage() {
  const stage = currentStage();
  $("progress-text").textContent = `${state.stageIndex + 1} / ${state.stages.length}`;
  $("progress-fill").style.width = `${((state.stageIndex + 1) / state.stages.length) * 100}%`;
  $("stage-kicker").textContent = stage.kicker;
  $("stage-title").textContent = stage.title;
  $("context-label").textContent = stageContext(stage);
  $("material-label").textContent = stageMaterial(stage);

  for (const id of ["string-section", "theory-panel", "timer-panel", "reflection-panel"]) $(id).hidden = true;
  for (const id of ["check-button", "hint-button", "reveal-button", "done-button", "next-button", "restart-button", "change-material-button"]) $(id).hidden = true;
  if (stage.kind !== "target" && stage.kind !== "map" && chordFretboard) {
    chordFretboard.destroy();
    chordFretboard = null;
  }
  clearLens();

  if (stage.kind === "orient") renderOrient();
  if (stage.kind === "target") renderTarget(stage);
  if (stage.kind === "map") renderMap();
  if (stage.kind === "contrast") renderContrast();
  if (stage.kind === "musicalize") renderMusicalize();
  if (stage.kind === "reflect") renderReflect();
  if (stage.kind === "complete") renderComplete();
}

function anchorDescription(source) {
  const anchor = source.rootTask.plannedLocation;
  return `${anchor.name} at ${stringName(anchor.position.stringIndex)}, fret ${anchor.position.fret}`;
}

function renderOrient() {
  const primary = state.plan.primary;
  $("stage-prompt").textContent = `Establish ${chordSymbol(primary.rootName, primary.entry)} on the physical guitar. Play the root anchor ${anchorDescription(primary)} and let the complete formula become one chord identity.`;
  $("stage-instruction").textContent = "The formula is an abstract chord identity, not a required guitar voicing. Sing the root, play the anchor, then arpeggiate any familiar version of the chord if you know one.";
  setFeedback("The next stage hides the target note and fret. Hear the requested role before searching.");
  $("done-button").hidden = false;
  $("done-button").textContent = "Begin role search";
}

function revealRows(source, task, location) {
  const played = playedInterval(source.rootTask.plannedLocation, location);
  return [
    ["Note", formatNote(task.tone.note)],
    ["Chord role", degreeLabel(task.tone)],
    ["Canonical formula interval", task.tone.interval.label],
    ["Played interval from anchor", `${source.rootTask.plannedLocation.name} → ${location.name}: ${played.label}`],
    ["Chord membership", `yes · ${chordSymbol(source.rootName, source.entry)}`],
    ["Fretboard", `${stringName(location.position.stringIndex)}, fret ${location.position.fret}`],
  ];
}

function renderTarget(stage) {
  const source = sourceFor(stage);
  const task = stage.task;
  $("string-section").hidden = false;
  $("stage-prompt").textContent = `Play the root anchor ${anchorDescription(source)}. Before touching the target area, sing or imagine role ${degreeLabel(task.tone)}. Then find it on ${stringName(task.stringIndex)} within frets ${task.fretWindow.minFret}–${task.fretWindow.maxFret}, play it, and commit the fret.`;
  $("stage-instruction").textContent = "The chord role and its canonical formula interval are abstract facts. After you commit, the reveal separately reports the registered interval your two physical locations actually sounded.";
  $("check-button").hidden = false;
  $("hint-button").hidden = false;
  renderStringBoard(task, source);

  if (state.checked) {
    const location = getLocation(state.selected, source);
    const rows = revealRows(source, task, location);
    setFeedback(`Correct. ${formatNote(task.tone.note)} is role ${degreeLabel(task.tone)} in ${chordSymbol(source.rootName, source.entry)}.`, "good");
    setTheory("Role, formula and played interval", rows);
    setLens(rows);
    $("next-button").hidden = false;
    $("next-button").textContent = stage.source === "transfer" ? "Continue to contrast or musical use" : "Continue";
  } else if (!state.lastWrong) {
    setFeedback("Sing or imagine first. Play second. Commit the fret third.");
  }
}

function renderMap() {
  const primary = state.plan.primary;
  const tasks = primary.reconstruction;
  if (state.mapRoleIndex >= tasks.length) {
    $("stage-prompt").textContent = `You reconstructed the selected physical roles of ${chordSymbol(primary.rootName, primary.entry)}. The engine still retains the complete abstract formula ${formulaLabel(primary.chord.formula)}.`;
    $("stage-instruction").textContent = primary.chord.tones.length > 4
      ? "This session deliberately mapped a bounded structural subset instead of forcing the complete extended chord onto one string."
      : "Play the saved roles forward and backward, naming each role before the fret.";
    const rows = state.savedMap.map((item) => [
      degreeLabel(item.task.tone),
      `${formatNote(item.task.tone.note)} · ${stringName(item.location.position.stringIndex)}, fret ${item.location.position.fret}`,
    ]);
    setTheory("Earned physical map", rows);
    setLens(rows);
    setFeedback("Map complete. The labels describe functions you located and played, not a stored guitar shape.", "good");
    $("next-button").hidden = false;
    $("next-button").textContent = "Transfer the focus role";
    return;
  }

  const task = tasks[state.mapRoleIndex];
  $("string-section").hidden = false;
  $("stage-prompt").textContent = `Reconstruction role ${state.mapRoleIndex + 1} of ${tasks.length}: sing or imagine ${degreeLabel(task.tone)}, find it on ${stringName(task.stringIndex)} within frets ${task.fretWindow.minFret}–${task.fretWindow.maxFret}, play it, then commit.`;
  $("stage-instruction").textContent = state.savedMap.length
    ? `Already earned: ${state.savedMap.map(({ task: saved }) => degreeLabel(saved.tone)).join(" → ")}. Retrieve the next role independently.`
    : "Start from formula role, not a memorized chord shape.";
  $("check-button").hidden = false;
  $("hint-button").hidden = false;
  renderStringBoard(task, primary);
  setFeedback("The complete formula stays visible above; only this bounded physical subset is required.");
}

function roleKey(tone) {
  return `${tone.degree}:${tone.alteration}`;
}

function renderContrast() {
  const primary = state.plan.primary;
  const contrastEntry = catalog.flatMap(({ chords }) => chords).find(({ id }) => id === state.plan.contrastChordId);
  const contrast = buildChord(primary.rootName, state.plan.contrastChordId);
  $("stage-prompt").textContent = `On the guitar, compare ${chordSymbol(primary.rootName, primary.entry)} with ${chordSymbol(primary.rootName, contrastEntry)}. Predict which roles are shared and which change before revealing the formulas.`;
  $("stage-instruction").textContent = "The comparator is a bounded theory contrast. Random targets and transfer remain inside the qualities you selected.";
  if (!state.theoryRevealed) {
    setFeedback("Play or arpeggiate both identities first. Say what you think changed.");
    $("reveal-button").hidden = false;
    $("reveal-button").textContent = "Reveal formula contrast";
    return;
  }
  const primaryKeys = new Set(primary.chord.tones.map(roleKey));
  const contrastKeys = new Set(contrast.tones.map(roleKey));
  const shared = primary.chord.tones.filter((tone) => contrastKeys.has(roleKey(tone))).map(degreeLabel);
  const onlyPrimary = primary.chord.tones.filter((tone) => !contrastKeys.has(roleKey(tone))).map(degreeLabel);
  const onlyContrast = contrast.tones.filter((tone) => !primaryKeys.has(roleKey(tone))).map(degreeLabel);
  const rows = [
    [chordSymbol(primary.rootName, primary.entry), formulaLabel(primary.chord.formula)],
    [chordSymbol(primary.rootName, contrastEntry), formulaLabel(contrast.formula)],
    ["Shared roles", shared.join(" · ") || "none"],
    ["Only in first", onlyPrimary.join(" · ") || "none"],
    ["Only in comparator", onlyContrast.join(" · ") || "none"],
  ];
  setTheory("Engine-derived formula contrast", rows);
  setLens(rows);
  setFeedback("Attach these labels to the difference you just played and heard.", "good");
  $("next-button").hidden = false;
  $("next-button").textContent = "Use the selected chord in time";
}

function positionKey(position) {
  return `${position.stringIndex}:${position.fret}`;
}

function renderStringBoard(task, source) {
  chordFretboard ??= createFretboard($("string-board"), { onSelect(position) {
    if (state.checked) return;
    state.selected = position;
    state.lastWrong = null;
    const stage = currentStage();
    renderStringBoard(currentTask(), stage.kind === "map" ? state.plan.primary : sourceFor(stage));
    chordFretboard.focusPosition(position);
    setFeedback(`Committed ${stringName(position.stringIndex)}, fret ${position.fret}. Play it again against the root anchor, then check.`);
  } });
  const positions = [];
  for (let fret = task.fretWindow.minFret; fret <= task.fretWindow.maxFret; fret += 1) {
    const position = { stringIndex: task.stringIndex, fret };
    const selected = Boolean(state.selected && positionKey(state.selected) === positionKey(position));
    const states = [];
    let primaryLabel;
    let secondaryLabel;
    if (state.lastWrong && positionKey(state.lastWrong.position) === positionKey(position)) {
      states.push("incorrect");
      primaryLabel = state.lastWrong.location.name;
    }
    for (const saved of currentStage().kind === "map" ? state.savedMap : []) {
      if (positionKey(saved.position) === positionKey(position)) {
        states.push("current");
        primaryLabel = degreeLabel(saved.task.tone);
        secondaryLabel = formatNote(saved.task.tone.note);
      }
    }
    if (state.checked && selected) {
      states.push("correct");
      primaryLabel = getLocation(position, source).name;
      secondaryLabel = degreeLabel(task.tone);
    }
    positions.push({ ...position, selectable: !state.checked, selected, states,
      ...(primaryLabel ? { primaryLabel } : {}), ...(secondaryLabel ? { secondaryLabel } : {}),
      ariaLabel: `${stringName(task.stringIndex)}, fret ${fret}${primaryLabel ? `, ${primaryLabel}` : ""}${secondaryLabel ? `, ${secondaryLabel}` : ""}`,
    });
  }
  chordFretboard.update({
    strings: STANDARD_FRETBOARD.tuning.openStrings.map(({ note }, index) => ({ index,
      label: `${6 - index} · ${index === 5 ? "high " : index === 0 ? "low " : ""}${formatNote(note)}`,
    })).reverse(),
    activeStringIndices: [task.stringIndex], fretRange: task.fretWindow, positions, connections: [],
    label: `Focus · ${stringName(task.stringIndex)} · frets ${task.fretWindow.minFret}–${task.fretWindow.maxFret}`,
  });
}

function wrongFeedback(source, task, location) {
  const played = playedInterval(source.rootTask.plannedLocation, location);
  const matches = location.chordRelation?.matchingTones ?? [];
  if (matches.length) {
    const roles = matches.map(degreeLabel).join(" / ");
    return `You played ${location.name}, role ${roles} in ${chordSymbol(source.rootName, source.entry)}. From the physical root anchor, the played interval was ${played.label}. Target: ${degreeLabel(task.tone)}.`;
  }
  return `You played ${location.name}, outside ${chordSymbol(source.rootName, source.entry)}. From the physical root anchor, the played interval was ${played.label}. Target: role ${degreeLabel(task.tone)}.`;
}

function handleCheck() {
  const stage = currentStage();
  if (!["target", "map"].includes(stage.kind)) return;
  if (!state.selected) {
    setFeedback("Play the target on the guitar first, then commit the fret you used.", "warn");
    return;
  }
  const task = currentTask(stage);
  const source = rootSource(stage);
  const location = getLocation(state.selected, source);
  if (location.pitchClass !== task.tone.pitchClass) {
    state.lastWrong = { position: { ...state.selected }, location };
    state.selected = null;
    renderStringBoard(task, source);
    setFeedback(wrongFeedback(source, task, location), "bad");
    return;
  }

  if (stage.kind === "map") {
    state.savedMap.push({ task, position: { ...state.selected }, location });
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
  const task = currentTask(stage);
  const source = rootSource(stage);
  state.hintLevel += 1;
  if (state.hintLevel === 1) {
    setFeedback(`Hint 1: role ${degreeLabel(task.tone)} has canonical formula interval ${task.tone.interval.label}. This does not claim that your chosen physical pitches sound that registered interval.`, "warn");
    return;
  }
  if (state.hintLevel === 2) {
    setFeedback(`Hint 2: the chord spelling for this role is ${formatNote(task.tone.note)}. Sing it before searching.`, "warn");
    return;
  }
  const hits = findLocations({
    rootName: source.rootName,
    chordId: source.chordId,
    tone: task.tone,
    stringIndices: [task.stringIndex],
  }).filter(({ position }) => position.fret >= task.fretWindow.minFret && position.fret <= task.fretWindow.maxFret);
  setFeedback(`Hint 3: valid fret in this planned window: ${hits.map(({ position }) => position.fret).join(" / ")}. Play before committing.`, "warn");
}

function renderMusicalize() {
  const primary = state.plan.primary;
  const roles = primary.reconstruction.map(({ tone }) => degreeLabel(tone)).join(" · ");
  $("stage-prompt").textContent = `Use only the selected physical roles of ${chordSymbol(primary.rootName, primary.entry)}: ${roles}. Deliberately land on ${degreeLabel(primary.focusTask.tone)}.`;
  $("stage-instruction").textContent = "During PLAY, make a short phrase on the physical guitar. During REST, keep your hands still and audiate the next role before playing. The complete abstract chord may contain additional roles not mapped in this session.";
  const rows = state.savedMap.length
    ? state.savedMap.map((item) => [degreeLabel(item.task.tone), `${item.location.name} · ${stringName(item.location.position.stringIndex)}, fret ${item.location.position.fret}`])
    : primary.reconstruction.map(({ tone }) => [degreeLabel(tone), formatNote(tone.note)]);
  setTheory("Session phrase vocabulary", rows);
  setLens(rows);
  setFeedback("This stage tests whether the formula roles can guide a physical phrase rather than remain static labels.");
  $("timer-panel").hidden = false;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  $("timer-value").textContent = `${state.timerRemaining}s`;
  $("timer-phase").textContent = state.timerPhase;
  if (state.timerFinished) {
    $("timer-start").hidden = true;
    $("timer-next").hidden = false;
    setFeedback("Finished. Were you hearing a target role before each PLAY block, or moving among stored frets?", "good");
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
  $("stage-prompt").textContent = "Which connection failed first when the chord became harder?";
  $("stage-instruction").textContent = "Choose the most accurate failure mode or no clear breakdown. This remains session-only reflection, not a mastery score.";
  setFeedback(state.reflection ? `Recorded: ${state.reflection}.` : "Choose one. The answer disappears when the page reloads.");
  $("reflection-panel").hidden = false;
  $("reflection-next").hidden = reflectionNextHidden(state.reflection);
}

function renderComplete() {
  const primary = state.plan.primary;
  $("stage-prompt").textContent = `You completed one ${currentFamily().displayName.toLowerCase()} variation with ${chordSymbol(primary.rootName, primary.entry)}.`;
  $("stage-instruction").textContent = "Create a new variation to keep the same selected vocabulary while changing valid roots, roles and fretboard constraints, or return to material selection.";
  const rows = [
    ["Selected vocabulary", state.selection.chordIds.join(", ")],
    ["Practised chord", chordSymbol(primary.rootName, primary.entry)],
    ["Focus role", degreeLabel(primary.focusTask.tone)],
    ["Transfer", chordSymbol(state.plan.transfer.rootName, state.plan.transfer.entry)],
    ["Complete formula", formulaLabel(primary.chord.formula)],
  ];
  setTheory("Session summary", rows);
  setLens(rows);
  setFeedback("The musical truth came from the engine; the evidence came from your physical search and playing.", "good");
  $("restart-button").hidden = false;
  $("restart-button").textContent = "New variation";
  $("change-material-button").hidden = false;
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
    context: "the role became confusing when the chord or root changed",
    none: "no clear breakdown",
  };
  state.reflection = labels[selected.value];
  setFeedback(`Recorded for this session only: ${state.reflection}.`, "good");
  $("reflection-next").hidden = reflectionNextHidden(state.reflection);
}

$("select-all").addEventListener("click", () => {
  state.selection = selectAllInFamily(currentFamily());
  renderSelector();
});
$("clear-all").addEventListener("click", () => {
  state.selection = createSelection(state.selection.familyId);
  renderSelector();
});
$("start-session").addEventListener("click", () => startSession());
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
  const previousPlan = state.plan;
  for (const input of document.querySelectorAll('input[name="breakdown"]')) input.checked = false;
  startSession(previousPlan);
});
$("change-material-button").addEventListener("click", () => {
  stopTimer();
  resetSessionState(state);
  state.view = "select";
  state.plan = null;
  state.stages = [];
  for (const input of document.querySelectorAll('input[name="breakdown"]')) input.checked = false;
  renderSelector();
});

renderSelector();
