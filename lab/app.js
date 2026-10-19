import {
  STANDARD_FRETBOARD,
  formatNote,
  formatPitch,
  musicQueries,
  parseNote,
  pitchClass,
} from "/engine/index.js";

const $ = (id) => document.getElementById(id);

const contexts = [
  { rootName: "A", label: "A minor", minFret: 5, maxFret: 9 },
  { rootName: "D", label: "D minor", minFret: 5, maxFret: 9 },
  { rootName: "C", label: "C minor", minFret: 8, maxFret: 13 },
];

const stages = [
  { kind: "orient", context: 0, title: "Orient", kicker: "Build the relationship before the shape" },
  { kind: "location", context: 0, role: "root", title: "Find the root", kicker: "Guitar first" },
  { kind: "location", context: 0, role: "third", title: "Anticipate the minor third", kicker: "Retrieve, then locate" },
  { kind: "location", context: 0, role: "third", alternate: true, title: "Find another minor third", kicker: "Break the single-location habit" },
  { kind: "location", context: 0, role: "fifth", title: "Add the fifth", kicker: "Construct the triad" },
  { kind: "physical", context: 0, title: "Reconstruct without the screen", kicker: "Play and listen" },
  { kind: "transfer", context: 1, title: "Near transfer: D minor", kicker: "Same window, new root" },
  { kind: "transfer", context: 2, title: "Farther transfer: C minor", kicker: "New root, new region" },
  { kind: "musicalize", context: 2, title: "Use it musically", kicker: "The answer is now a phrase" },
  { kind: "reflect", context: 2, title: "Reflect", kicker: "Diagnose what actually broke" },
  { kind: "complete", context: 2, title: "Session complete", kicker: "Retest later, not immediately" },
];

const roleMeta = {
  root: { label: "1", long: "root", semitones: 0 },
  third: { label: "♭3", long: "minor third", semitones: 3 },
  fifth: { label: "5", long: "perfect fifth", semitones: 7 },
};

const state = {
  stageIndex: 0,
  selected: null,
  checked: false,
  hintLevel: 0,
  firstThirdString: null,
  transferSelections: [],
  transferRoleIndex: 0,
  timerRemaining: 30,
  timerId: null,
  timerStarted: false,
  timerFinished: false,
};

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

function contextAt(index = currentStage().context) {
  return contexts[index];
}

function currentStage() {
  return stages[state.stageIndex];
}

function minorTriad(context) {
  return unwrap(musicQueries.getChord({ root: parseNote(context.rootName), chordId: "minor" }));
}

function roleTone(context, role) {
  const toneIndex = role === "root" ? 0 : role === "third" ? 1 : 2;
  return minorTriad(context).tones[toneIndex];
}

function setFeedback(text, kind = "") {
  const feedback = $("feedback");
  feedback.textContent = text;
  feedback.className = `feedback${kind ? ` ${kind}` : ""}`;
}

function positionKey(position) {
  return `${position.stringIndex}:${position.fret}`;
}

function getLocation(position, rootName) {
  return unwrap(musicQueries.getNoteAtFret({
    position,
    root: parseNote(rootName),
  }));
}

function activeRole(stage = currentStage()) {
  if (stage.kind === "location") return stage.role;
  if (stage.kind === "transfer") return ["root", "third", "fifth"][state.transferRoleIndex];
  return null;
}

function stageProgressText() {
  return `${Math.min(state.stageIndex + 1, stages.length)} / ${stages.length}`;
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function resetInteractionState() {
  state.selected = null;
  state.checked = false;
  state.hintLevel = 0;
}

function setStage(index) {
  stopTimer();
  const previousStage = currentStage();
  state.stageIndex = Math.max(0, Math.min(index, stages.length - 1));
  resetInteractionState();
  const nextStage = currentStage();
  if (nextStage.kind !== "transfer" || previousStage.kind !== "transfer" || previousStage.context !== nextStage.context) {
    state.transferSelections = [];
    state.transferRoleIndex = 0;
  }
  if (currentStage().kind !== "musicalize") {
    state.timerRemaining = 30;
    state.timerStarted = false;
    state.timerFinished = false;
  }
  renderStage();
}

function advanceStage() {
  if (state.stageIndex < stages.length - 1) setStage(state.stageIndex + 1);
}

function selectedLocationInfo() {
  if (!state.selected) return null;
  const context = contextAt();
  return getLocation(state.selected, context.rootName);
}

function targetMatches(position, context, role) {
  const target = roleTone(context, role);
  const location = getLocation(position, context.rootName);
  return location.pitchClass === target.pitchClass;
}

function contextSummary(context) {
  return `${context.label} · frets ${context.minFret}–${context.maxFret}`;
}

function rolePrompt(context, role, alternate = false) {
  if (role === "root") {
    return `Find ${context.rootName} inside frets ${context.minFret}–${context.maxFret}. Play it on the guitar first, then tap the location you used.`;
  }
  if (role === "third" && alternate) {
    return `Find a second ${roleMeta.third.label} on a different string. Play ${context.rootName} → ${roleMeta.third.label}, then commit the new location.`;
  }
  return `Before touching the screen, anticipate the ${roleMeta[role].long} (${roleMeta[role].label}) of ${context.rootName}. Play the relationship, listen, then tap the target location you used.`;
}

function renderStage() {
  const stage = currentStage();
  const context = contextAt();
  $("progress-text").textContent = stageProgressText();
  $("progress-fill").style.width = `${((state.stageIndex + 1) / stages.length) * 100}%`;
  $("stage-kicker").textContent = stage.kicker;
  $("stage-title").textContent = stage.title;
  $("context-label").textContent = contextSummary(context);
  $("material-label").textContent = "Material: 1 · ♭3 · 5";

  $("board-section").hidden = !["location", "transfer"].includes(stage.kind);
  $("hint-button").hidden = !["location", "transfer"].includes(stage.kind);
  $("check-button").hidden = !["location", "transfer"].includes(stage.kind);
  $("next-button").hidden = true;
  $("done-button").hidden = true;
  $("timer-panel").hidden = true;
  $("reflection-panel").hidden = true;
  $("restart-button").hidden = stage.kind !== "complete";

  if (stage.kind === "orient") renderOrient(stage, context);
  if (stage.kind === "location") renderLocationStage(stage, context);
  if (stage.kind === "physical") renderPhysical(stage, context);
  if (stage.kind === "transfer") renderTransfer(stage, context);
  if (stage.kind === "musicalize") renderMusicalize(stage, context);
  if (stage.kind === "reflect") renderReflect(stage, context);
  if (stage.kind === "complete") renderComplete(stage, context);

  renderFretboard(context);
}

function renderOrient(_stage, context) {
  $("stage-prompt").textContent = `Today you are learning one relationship, not a shape: ${context.rootName} minor = 1–♭3–5.`;
  $("stage-instruction").textContent = "Keep the guitar in your hands. The screen gives you a goal and a fret window, but the decisive action happens on the instrument before the screen reveals anything.";
  setFeedback("Say “root, minor third, fifth” once. Do not look for a stored A-minor grip yet.");
  $("done-button").hidden = false;
  $("done-button").textContent = "Start guitar-first session";
}

function renderLocationStage(stage, context) {
  $("stage-prompt").textContent = rolePrompt(context, stage.role, stage.alternate === true);
  $("stage-instruction").textContent = "After you play, decide for yourself whether it sounded like what you intended. Then use the blank fretboard only to record the location you actually used.";
  setFeedback("No answer is visible yet. Play first, then commit one location.");
  $("check-button").textContent = "Check committed location";
}

function renderPhysical(_stage, context) {
  $("stage-prompt").textContent = `Look away from the screen. In ${context.label}, play 1–♭3–5 in any order, then play the three tones one octave higher if you can find them.`;
  $("stage-instruction").textContent = "Do not touch the fretboard graphic. Listen for whether the relationship still feels like a minor triad when you move it.";
  setFeedback("The app cannot hear you yet. This step is deliberately self-evaluated on the physical guitar.");
  $("done-button").hidden = false;
  $("done-button").textContent = "I played and listened";
}

function renderTransfer(_stage, context) {
  const role = activeRole();
  const completed = state.transferRoleIndex;
  $("stage-prompt").textContent = `${context.label}, frets ${context.minFret}–${context.maxFret}. Rebuild 1–♭3–5 from scratch. Current target: ${roleMeta[role].label} (${roleMeta[role].long}).`;
  $("stage-instruction").textContent = completed === 0
    ? "Do not transpose a memorized fingering mechanically. Re-orient to the new root, play the target, then commit its location."
    : `You have already established ${["1", "♭3", "5"].slice(0, completed).join(" → ")}. Now solve the next role without revealing the full triad.`;
  setFeedback(`${completed}/3 roles committed correctly in this context.`);
  $("check-button").textContent = `Check ${roleMeta[role].label}`;
}

function renderMusicalize(_stage, context) {
  $("stage-prompt").textContent = `${context.label}: make music with only 1, ♭3 and 5 for 30 seconds.`;
  $("stage-instruction").textContent = "Start at least one phrase on ♭3. Finish the final phrase on 1. You decide whether it sounds musical; the app is only supplying the constraint.";
  setFeedback("No correctness score. The goal is to turn the relationship into a musical decision in time.");
  $("timer-panel").hidden = false;
  updateTimerDisplay();
}

function renderReflect() {
  $("stage-prompt").textContent = "What broke first when the context changed?";
  $("stage-instruction").textContent = "Choose the failure mode that felt most real. This is reflection, not a score.";
  setFeedback("Your answer is kept only in this browser session and disappears when you reload.");
  $("reflection-panel").hidden = false;
}

function renderComplete() {
  $("stage-prompt").textContent = "Stop here. Do not grind the same solved pattern for another twenty minutes.";
  $("stage-instruction").textContent = "A useful next-session probe is a new minor key and a different fret window before any diagram is shown. That delayed transfer tells us more than today's smooth repetition.";
  setFeedback("Learning Lab v1 ends with a later-test instruction instead of another quiz question.", "good");
}

function renderFretboard(context) {
  const fretboard = $("fretboard");
  const maxDisplayedFret = 13;
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "String";
  header.append(corner);
  for (let fret = 0; fret <= maxDisplayedFret; fret += 1) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = String(fret);
    th.className = fret >= context.minFret && fret <= context.maxFret ? "active-fret" : "outside-fret";
    header.append(th);
  }
  thead.append(header);

  const tbody = document.createElement("tbody");
  STANDARD_FRETBOARD.tuning.openStrings.forEach((openPitch, stringIndex) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.className = "string-name";
    label.textContent = `${6 - stringIndex} · ${formatPitch(openPitch)}`;
    row.append(label);

    for (let fret = 0; fret <= maxDisplayedFret; fret += 1) {
      const cell = document.createElement("td");
      const button = document.createElement("button");
      const active = fret >= context.minFret && fret <= context.maxFret;
      const position = { stringIndex, fret };
      button.type = "button";
      button.className = `fret-cell${active ? "" : " outside"}`;
      button.disabled = !active;
      button.dataset.stringIndex = String(stringIndex);
      button.dataset.fret = String(fret);
      button.setAttribute("aria-label", `String ${6 - stringIndex}, fret ${fret}${active ? "" : ", outside active window"}`);
      if (state.selected && positionKey(state.selected) === positionKey(position)) button.classList.add("selected");
      for (const saved of state.transferSelections) {
        if (positionKey(saved.position) === positionKey(position)) {
          button.classList.add("saved");
          button.textContent = saved.label;
        }
      }
      if (state.checked && state.selected && positionKey(state.selected) === positionKey(position)) {
        const role = activeRole();
        if (role && targetMatches(position, context, role)) {
          const info = getLocation(position, context.rootName);
          button.classList.add("correct");
          button.textContent = formatNote(info.pitch.note);
        }
      }
      button.addEventListener("click", () => {
        if (state.checked) return;
        state.selected = position;
        renderFretboard(context);
        setFeedback(`Committed string ${6 - stringIndex}, fret ${fret}. Play it once more, self-judge, then check.`);
      });
      cell.append(button);
      row.append(cell);
    }
    tbody.append(row);
  });
  fretboard.replaceChildren(thead, tbody);
}

function handleCheck() {
  const stage = currentStage();
  if (!["location", "transfer"].includes(stage.kind)) return;
  if (!state.selected) {
    setFeedback("Commit one fretboard location after you have played it on the guitar.", "warn");
    return;
  }

  const context = contextAt();
  const role = activeRole();
  const location = selectedLocationInfo();
  const target = roleTone(context, role);
  const alternateViolation = stage.kind === "location"
    && stage.alternate === true
    && state.firstThirdString !== null
    && state.selected.stringIndex === state.firstThirdString;

  if (alternateViolation) {
    state.checked = false;
    setFeedback("That is on the same string as your first ♭3. Keep the pitch target, but solve it on a different string.", "warn");
    state.selected = null;
    renderFretboard(context);
    return;
  }

  if (location.pitchClass !== target.pitchClass) {
    state.checked = false;
    const actual = formatNote(location.pitch.note);
    const relation = location.rootRelation?.interval?.label ?? "another relationship";
    setFeedback(`You committed ${actual}. From ${context.rootName}, that is ${relation}. Target: ${roleMeta[role].label} (${roleMeta[role].long}). Repair it yourself before revealing.`, "bad");
    state.selected = null;
    renderFretboard(context);
    return;
  }

  state.checked = true;
  const actual = formatNote(location.pitch.note);
  const relation = location.rootRelation?.interval?.label ?? roleMeta[role].label;

  if (stage.kind === "location" && stage.role === "third" && stage.alternate !== true) {
    state.firstThirdString = state.selected.stringIndex;
  }

  if (stage.kind === "transfer") {
    state.transferSelections.push({ position: { ...state.selected }, label: roleMeta[role].label });
    state.transferRoleIndex += 1;
    if (state.transferRoleIndex < 3) {
      state.selected = null;
      state.checked = false;
      state.hintLevel = 0;
      renderStage();
      setFeedback(`Correct: ${actual} is ${roleMeta[role].label} from ${context.rootName}. Keep the solved location visible; now reconstruct the next role.`, "good");
      return;
    }
  }

  renderFretboard(context);
  setFeedback(`Correct: ${actual}. ${context.rootName} → ${actual} = ${relation}. Play the relationship once more before moving on.`, "good");
  $("check-button").hidden = true;
  $("hint-button").hidden = true;
  $("next-button").hidden = false;
  $("next-button").textContent = stage.kind === "transfer" ? "Move to next context" : "Continue";
}

function handleHint() {
  const stage = currentStage();
  if (!["location", "transfer"].includes(stage.kind)) return;
  const context = contextAt();
  const role = activeRole();
  const meta = roleMeta[role];
  state.hintLevel += 1;

  if (role === "root") {
    setFeedback(`Anchor hint: the target is the root ${context.rootName}. Use an octave relationship you already know, not random scanning.`, "warn");
    return;
  }

  if (state.hintLevel === 1) {
    setFeedback(`Relational hint: ${meta.label} is ${meta.semitones} semitones from the root. Reconstruct it before asking for the note name.`, "warn");
    return;
  }

  const target = roleTone(context, role);
  setFeedback(`Explicit hint: in ${context.label}, ${meta.label} is ${formatNote(target.note)}. Now find it on the guitar without revealing every location.`, "warn");
}

function updateTimerDisplay() {
  $("timer-value").textContent = `${state.timerRemaining}s`;
  $("timer-start").textContent = state.timerFinished ? "Run again" : state.timerId !== null ? "Pause" : state.timerStarted ? "Resume" : "Start 30 seconds";
  $("timer-next").hidden = !state.timerFinished;
}

function toggleTimer() {
  if (state.timerFinished) {
    state.timerRemaining = 30;
    state.timerFinished = false;
    state.timerStarted = false;
  }
  if (state.timerId !== null) {
    stopTimer();
    updateTimerDisplay();
    return;
  }
  state.timerStarted = true;
  state.timerId = setInterval(() => {
    state.timerRemaining -= 1;
    if (state.timerRemaining <= 0) {
      state.timerRemaining = 0;
      state.timerFinished = true;
      stopTimer();
      setFeedback("Time. Let the phrase end. Did you actually use the three roles as choices rather than run a memorized shape?", "good");
    }
    updateTimerDisplay();
  }, 1000);
  updateTimerDisplay();
}

function submitReflection() {
  const selected = document.querySelector('input[name="breakdown"]:checked');
  if (!selected) {
    setFeedback("Choose the thing that broke first. There is no correct answer here.", "warn");
    return;
  }
  const labels = {
    notes: "note names",
    intervals: "interval relationships",
    locations: "fretboard locations",
    fingers: "finger pattern",
  };
  setFeedback(`Recorded for this session: ${labels[selected.value]}. Next session should probe that weakness before giving you the old visual cues.`, "good");
  $("reflection-next").hidden = false;
}

$("done-button").addEventListener("click", advanceStage);
$("next-button").addEventListener("click", advanceStage);
$("check-button").addEventListener("click", handleCheck);
$("hint-button").addEventListener("click", handleHint);
$("timer-start").addEventListener("click", toggleTimer);
$("timer-next").addEventListener("click", advanceStage);
$("reflection-submit").addEventListener("click", submitReflection);
$("reflection-next").addEventListener("click", advanceStage);
$("restart-button").addEventListener("click", () => {
  state.firstThirdString = null;
  state.transferSelections = [];
  state.transferRoleIndex = 0;
  state.timerRemaining = 30;
  state.timerStarted = false;
  state.timerFinished = false;
  for (const input of document.querySelectorAll('input[name="breakdown"]')) input.checked = false;
  setStage(0);
});

renderStage();
