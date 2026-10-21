import { STANDARD_FRETBOARD, formatNote, musicQueries } from "/engine/index.js";
import { createVoiceLeadingPlan } from "/voice-leading-session.mjs";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const plan = createVoiceLeadingPlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: (request) => unwrap(musicQueries.getChordCatalog(request)),
  findLocations: ({ key, chord, stringIndices, fretRange, pitchClasses }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    stringIndices,
    fretRange,
    pitchClasses,
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getNoteAtFret: ({ key, chord, stringIndex, fret }) => unwrap(musicQueries.getNoteAtFret({
    board: STANDARD_FRETBOARD,
    position: { stringIndex, fret },
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(musicQueries.getInterval(request)),
  formatNote,
});

const stages = [
  { kind: "start", contextId: "g" },
  { kind: "build", contextId: "g", transitionIndex: 0 },
  { kind: "build", contextId: "g", transitionIndex: 1 },
  { kind: "build", contextId: "g", transitionIndex: 2 },
  { kind: "deconstruct", contextId: "g" },
  { kind: "full", contextId: "g" },
  { kind: "start", contextId: "a" },
  { kind: "build", contextId: "a", transitionIndex: 0 },
  { kind: "build", contextId: "a", transitionIndex: 1 },
  { kind: "build", contextId: "a", transitionIndex: 2 },
  { kind: "reflection" },
  { kind: "complete" },
];

const state = {};
function resetState() {
  Object.assign(state, {
    stageIndex: 0,
    selections: {},
    solved: false,
    hintLevel: 0,
    result: null,
    paths: { g: [plan.contexts.g.start], a: [plan.contexts.a.start] },
    evidence: {
      g: [0, 1, 2].map(() => ({ attempts: 0, invalid: 0, distant: 0, assistance: 0, elapsedSeconds: null })),
      a: [0, 1, 2].map(() => ({ attempts: 0, invalid: 0, distant: 0, assistance: 0, elapsedSeconds: null })),
    },
    stageStartedAt: Date.now(),
    reflection: null,
  });
}
resetState();

function stage() { return stages[state.stageIndex]; }
function context() { return plan.contexts[stage().contextId]; }
function stripOctave(name) { return name.replace(/-?\d+$/, ""); }
function stringLabel(stringIndex) {
  const open = formatNote(STANDARD_FRETBOARD.tuning.openStrings[stringIndex].note);
  return `String ${6 - stringIndex} (${stringIndex === 5 ? "high " : ""}${open})`;
}
function clear(element) { element.replaceChildren(); }
function setFeedback(text = "", kind = "") {
  $("feedback").textContent = text;
  $("feedback").className = `feedback${kind ? ` ${kind}` : ""}`;
}
function hidePanels() {
  for (const id of ["board-panel", "starting-panel", "movement-panel", "deconstruct-panel", "reflection-panel", "completion-panel", "status-panel", "hint-panel"]) $(id).hidden = true;
  for (const id of ["check", "hint", "continue", "start-played", "full-played", "save-reflection"]) $(id).hidden = true;
}
function roleText(note, chord) {
  const tone = chord.chord.tones.find(({ pitchClass }) => pitchClass === note.pitchClass);
  if (!tone) return "non-chord tone";
  if (tone.degree === 1) return "root (1)";
  if (tone.degree === 3) return "3rd (3)";
  if (tone.degree === 5) return "5th (5)";
  if (tone.degree === 7 && tone.alteration === -1) return "minor 7th (♭7)";
  return `degree ${tone.degree}`;
}
function addRow(parent, left, right, className = "") {
  const row = document.createElement("div"); row.className = `data-row ${className}`.trim();
  const label = document.createElement("strong"); label.textContent = left;
  const value = document.createElement("span"); value.textContent = right;
  row.append(label, value); parent.append(row);
}
function progress() {
  $("progress-text").textContent = `${state.stageIndex + 1} of ${stages.length}`;
  $("progress-fill").style.width = `${((state.stageIndex + 1) / stages.length) * 100}%`;
}
function describeVoicing(voicing, chord) {
  clear($("starting-notes"));
  const counts = new Map();
  for (const note of voicing.notes) counts.set(note.pitchClass, (counts.get(note.pitchClass) ?? 0) + 1);
  for (const note of voicing.notes) {
    const duplicated = counts.get(note.pitchClass) > 1 ? " · duplicated" : "";
    addRow($("starting-notes"), stringLabel(note.position.stringIndex), `fret ${note.position.fret} · ${stripOctave(note.name)} · ${roleText(note, chord)}${duplicated}`);
  }
}

function renderStart() {
  const ctx = context();
  $("stage-kicker").textContent = ctx.id === "g" ? "Establish the starting voicing" : "Transfer · new key and position";
  $("stage-title").textContent = `${ctx.home.symbol} on strings 4–3–2–1`;
  $("prompt").textContent = ctx.id === "g"
    ? "Play this compact G-major voicing. Notice each chord tone before you treat it as a shape."
    : "Play this compact first-inversion A-major voicing. The position is unfamiliar on purpose; carry the movement rule, not the G fret pattern.";
  $("instruction").textContent = "Say the note names and roles, play the chord, then commit that you physically played it.";
  $("starting-panel").hidden = false;
  describeVoicing(ctx.start, ctx.home);
  $("start-played").hidden = false;
}

function boardButton(stringIndex, fret) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "fret-choice";
  button.dataset.stringIndex = String(stringIndex);
  button.dataset.fret = String(fret);
  button.textContent = String(fret);
  button.setAttribute("aria-label", `${stringLabel(stringIndex)}, fret ${fret}`);
  button.setAttribute("aria-pressed", state.selections[stringIndex] === fret ? "true" : "false");
  if (state.selections[stringIndex] === fret) button.classList?.add?.("selected");
  button.addEventListener("click", () => {
    state.selections[stringIndex] = fret;
    state.result = null;
    state.solved = false;
    setFeedback();
    render();
    const selected = [...$("board").children].flatMap((row) => [...row.children]).find((item) => item.dataset?.stringIndex === String(stringIndex) && item.dataset?.fret === String(fret));
    selected?.focus();
  });
  return button;
}

function renderBoard() {
  const ctx = context();
  clear($("board"));
  for (const stringIndex of plan.activeStrings) {
    const row = document.createElement("div"); row.className = "string-row";
    const label = document.createElement("span"); label.className = "string-label"; label.textContent = stringLabel(stringIndex);
    row.append(label);
    for (let fret = ctx.fretRange.minFret; fret <= ctx.fretRange.maxFret; fret += 1) row.append(boardButton(stringIndex, fret));
    $("board").append(row);
  }
}

function renderStatus() {
  const result = state.result;
  if (!result) return;
  $("status-panel").hidden = false;
  if (result.kind === "invalid-chord") {
    $("harmony-status").textContent = "Harmony: incorrect";
    $("efficiency-status").textContent = "Voice-leading constraint: not assessed";
    const actual = result.selected.notes.map(({ name }) => stripOctave(name)).join("–");
    const missing = result.missingTones.map(({ note }) => formatNote(note)).join(", ");
    $("status-detail").textContent = `You built ${actual}. Missing required tone${result.missingTones.length === 1 ? "" : "s"}: ${missing || "none"}.`;
    return;
  }
  $("harmony-status").textContent = "Harmony: correct";
  $("efficiency-status").textContent = result.efficient
    ? "Voice-leading constraint: satisfied"
    : "Voice-leading constraint: not yet satisfied";
  $("status-detail").textContent = result.efficient
    ? `Total movement: ${result.totalMovement} frets, the minimum available from the voicing you played.`
    : `This valid chord moves ${result.totalMovement} frets in total; a ${result.minimumMovement}-fret connection is available. Keep the voices closer and try again.`;
}

function renderMovements(result) {
  if (!result?.efficient) return;
  $("movement-panel").hidden = false;
  clear($("movements"));
  for (const movement of result.movements) {
    const degrees = movement.fromScaleDegree && movement.toScaleDegree
      ? ` · key degrees ${movement.fromScaleDegree} → ${movement.toScaleDegree}` : "";
    addRow($("movements"), `String ${movement.stringNumber}`,
      `${stripOctave(movement.from.name)} → ${stripOctave(movement.to.name)} · ${movement.motionKind} · ${movement.fromRole} → ${movement.toRole}${degrees}`,
      movement.distance <= 1 ? "important-motion" : "");
  }
  if (stage().contextId === "g" && stage().transitionIndex === 2) {
    const leadingTone = result.movements.find(({ fromScaleDegree, toScaleDegree }) => fromScaleDegree === 7 && toScaleDegree === 1);
    const seventh = result.movements.find(({ fromScaleDegree, toScaleDegree }) => fromScaleDegree === 4 && toScaleDegree === 3);
    $("movement-heading").textContent = "The central resolution, voice by voice";
    $("movement-note").textContent = `${stripOctave(leadingTone.from.name)}, scale degree ${leadingTone.fromScaleDegree} and the ${leadingTone.fromRole} of ${context().dominant.symbol}, rises to ${stripOctave(leadingTone.to.name)}, scale degree ${leadingTone.toScaleDegree} and the ${context().home.symbol} ${leadingTone.toRole}. ${stripOctave(seventh.from.name)}, scale degree ${seventh.fromScaleDegree} and ${context().dominant.symbol}’s ${seventh.fromRole}, falls to ${stripOctave(seventh.to.name)}, scale degree ${seventh.toScaleDegree} and ${context().home.symbol}’s ${seventh.toRole}. These are specific physical voices inside the resolution you already hear.`;
  } else if (stage().contextId === "a" && stage().transitionIndex === 2) {
    const leadingTone = result.movements.find(({ fromScaleDegree, toScaleDegree }) => fromScaleDegree === 7 && toScaleDegree === 1);
    $("movement-heading").textContent = "The relationship survived the key change";
    $("movement-note").textContent = `Find ${stripOctave(leadingTone.from.name)} → ${stripOctave(leadingTone.to.name)} in your chosen voices: scale degree ${leadingTone.fromScaleDegree} rises to ${leadingTone.toScaleDegree}, and the ${leadingTone.fromRole} of ${context().dominant.symbol} resolves to the ${leadingTone.toRole} of ${context().home.symbol}.`;
  } else {
    $("movement-heading").textContent = "Your chord contains small melodic lines";
    $("movement-note").textContent = "Replay the chord change slowly, then isolate any one row as a melody.";
  }
}

function renderHints() {
  if (state.hintLevel === 0) return;
  const currentStage = stage();
  const ctx = context();
  const previous = state.paths[ctx.id][currentStage.transitionIndex];
  const available = plan.hints(ctx.id, currentStage.transitionIndex, previous).slice(0, state.hintLevel);
  $("hint-panel").hidden = false;
  clear($("hint-list"));
  for (const hint of available) {
    const item = document.createElement("li"); item.textContent = hint.text; $("hint-list").append(item);
  }
}

function renderBuild() {
  const currentStage = stage();
  const ctx = context();
  const transition = ctx.transitions[currentStage.transitionIndex];
  $("stage-kicker").textContent = `${ctx.id.toUpperCase()} major · ${transition.fromChord.entry.romanNumeral.label} → ${transition.toChord.entry.romanNumeral.label}`;
  $("stage-title").textContent = `Build the nearest ${transition.toChord.symbol}`;
  $("prompt").textContent = currentStage.transitionIndex === 2 && ctx.id === "g"
    ? `Play ${transition.fromChord.symbol}, stop, inspect each note, predict its closest path into ${transition.toChord.symbol}, then commit one fret per string.`
    : `Keep your hand in this area. Build ${transition.toChord.symbol} from ${transition.fromChord.symbol} using the closest valid notes; do not jump to a memorized shape.`;
  $("instruction").textContent = "Select one fret on each active string, physically play the result, then check it. Chord identity and movement are assessed separately.";
  $("board-panel").hidden = false;
  renderBoard();
  $("check").hidden = state.solved;
  $("hint").hidden = state.solved || state.hintLevel >= 4;
  $("continue").hidden = !state.solved;
  renderStatus();
  renderMovements(state.result);
  renderHints();
}

function voiceLine(path, voiceIndex) {
  return path.map(({ notes }) => stripOctave(notes[voiceIndex].name)).join(" → ");
}
function renderDeconstruct() {
  const ctx = context(); const path = state.paths[ctx.id];
  $("stage-kicker").textContent = "Deconstruct the progression";
  $("stage-title").textContent = "Play two voices as melodies";
  $("prompt").textContent = "Ignore the block chords. Play each line alone across G → C → D7 → G, using the exact frets you chose.";
  $("instruction").textContent = "The progression contains several tiny melodies happening simultaneously. Play both displayed lines before continuing.";
  $("deconstruct-panel").hidden = false;
  $("voice-one-label").textContent = `${stringLabel(plan.activeStrings[0])}: ${voiceLine(path, 0)}`;
  $("voice-two-label").textContent = `${stringLabel(plan.activeStrings[1])}: ${voiceLine(path, 1)}`;
  $("continue").hidden = false;
  $("continue").disabled = !$("voice-one-played").checked || !$("voice-two-played").checked;
}
function renderFull() {
  $("stage-kicker").textContent = "Reassemble the voices";
  $("stage-title").textContent = "Play the full progression again";
  $("prompt").textContent = "Play G → C → D7 → G as block chords, while listening for the two individual lines you just isolated.";
  $("instruction").textContent = "Keep the same four voicings. Let the small lines remain audible inside the chords.";
  $("full-played").hidden = false;
}
function renderReflection() {
  $("stage-kicker").textContent = "Reflect and retrieve";
  $("stage-title").textContent = "What transferred?";
  $("prompt").textContent = "Report what you noticed, then answer two theory questions from the movement you physically played.";
  $("instruction").textContent = "The first two responses are descriptive and are not graded. Theory retrieval is checked against the engine-derived resolution.";
  $("reflection-panel").hidden = false;
  $("save-reflection").hidden = false;
}
function renderComplete() {
  $("stage-kicker").textContent = "Session evidence";
  $("stage-title").textContent = "The bounded experiment is complete";
  $("prompt").textContent = "This session records attempts and assistance only. It makes no mastery claim.";
  $("instruction").textContent = "Use the evidence with your physical experience to decide whether nearby voices made harmony easier to understand.";
  $("completion-panel").hidden = false;
  clear($("evidence"));
  for (const contextId of ["g", "a"]) {
    const values = state.evidence[contextId];
    addRow($("evidence"), `${contextId.toUpperCase()} progression`,
      `${values.reduce((sum, item) => sum + item.attempts, 0)} attempts · ${values.reduce((sum, item) => sum + item.invalid, 0)} invalid · ${values.reduce((sum, item) => sum + item.distant, 0)} valid but distant · ${values.reduce((sum, item) => sum + item.assistance, 0)} assisted reveals`);
  }
}

function render() {
  hidePanels(); progress(); setFeedback(state.result ? $("feedback").textContent : "", state.result?.kind === "invalid-chord" ? "bad" : state.result?.kind === "valid-distant" ? "warn" : state.result?.kind === "valid-nearest" ? "good" : "");
  $("back").disabled = state.stageIndex === 0;
  $("replay").disabled = stage().kind === "complete";
  $("continue").disabled = false;
  if (stage().kind === "start") renderStart();
  else if (stage().kind === "build") renderBuild();
  else if (stage().kind === "deconstruct") renderDeconstruct();
  else if (stage().kind === "full") renderFull();
  else if (stage().kind === "reflection") renderReflection();
  else renderComplete();
}

function advance() {
  if (state.stageIndex < stages.length - 1) state.stageIndex += 1;
  state.selections = {}; state.solved = false; state.hintLevel = 0; state.result = null; state.stageStartedAt = Date.now();
  setFeedback(); render();
}
function currentEvidence() { const current = stage(); return state.evidence[current.contextId][current.transitionIndex]; }

$("start-played").addEventListener("click", advance);
$("full-played").addEventListener("click", advance);
$("continue").addEventListener("click", advance);
$("check").addEventListener("click", () => {
  if (Object.keys(state.selections).length !== plan.activeStrings.length) {
    setFeedback("Select one fret on every active string before checking.", "bad"); return;
  }
  const current = stage(); const ctx = context(); const evidence = currentEvidence();
  evidence.attempts += 1;
  const frets = plan.activeStrings.map((stringIndex) => state.selections[stringIndex]);
  state.result = plan.evaluate(ctx.id, current.transitionIndex, state.paths[ctx.id][current.transitionIndex], frets);
  if (state.result.kind === "invalid-chord") {
    evidence.invalid += 1;
    setFeedback(`Those notes do not form ${ctx.transitions[current.transitionIndex].toChord.symbol}. Inspect the harmony feedback and revise one voice at a time.`, "bad");
  } else if (state.result.kind === "valid-distant") {
    evidence.distant += 1;
    setFeedback(`That is a valid ${ctx.transitions[current.transitionIndex].toChord.symbol}. The voice-leading constraint is still open; find a smaller total movement.`, "warn");
  } else {
    state.solved = true;
    evidence.elapsedSeconds = Math.max(0, Math.round((Date.now() - state.stageStartedAt) / 1000));
    state.paths[ctx.id][current.transitionIndex + 1] = state.result.selected;
    setFeedback("Harmony and minimum-movement constraint both satisfied. Play the change, then trace each voice below.", "good");
  }
  render();
});
$("hint").addEventListener("click", () => {
  const evidence = currentEvidence();
  if (state.hintLevel === 0) evidence.assistance += 1;
  state.hintLevel = Math.min(4, state.hintLevel + 1);
  state.selections = {}; state.result = null; state.solved = false;
  setFeedback(state.hintLevel === 4 ? "Assisted reveal: play the displayed nearby voicing before continuing." : `Hint ${state.hintLevel} added. Rebuild the chord from the musical clue.`, "warn");
  if (state.hintLevel === 4) {
    const current = stage(); const ctx = context();
    const reveal = plan.hints(ctx.id, current.transitionIndex, state.paths[ctx.id][current.transitionIndex])[3].voicing;
    state.result = { kind: "valid-nearest", harmonyCorrect: true, efficient: true, selected: reveal, movements: reveal.movements, totalMovement: reveal.totalMovement, minimumMovement: reveal.totalMovement };
    state.solved = true;
    state.paths[ctx.id][current.transitionIndex + 1] = reveal;
    evidence.elapsedSeconds = Math.max(0, Math.round((Date.now() - state.stageStartedAt) / 1000));
  }
  render();
});
$("back").addEventListener("click", () => {
  if (state.stageIndex === 0) return;
  const leaving = stage();
  if (leaving.kind === "build") state.paths[leaving.contextId].length = leaving.transitionIndex + 1;
  state.stageIndex -= 1;
  const target = stage();
  if (target.kind === "build") state.paths[target.contextId].length = target.transitionIndex + 1;
  state.selections = {}; state.solved = false; state.hintLevel = 0; state.result = null; state.stageStartedAt = Date.now();
  setFeedback(); render();
});
$("replay").addEventListener("click", () => {
  const current = stage();
  if (current.kind === "build") state.paths[current.contextId].length = current.transitionIndex + 1;
  state.selections = {}; state.solved = false; state.hintLevel = 0; state.result = null; state.stageStartedAt = Date.now();
  $("voice-one-played").checked = false; $("voice-two-played").checked = false;
  setFeedback("This step has been reset. Commit again before any answer is shown."); render();
});
$("restart").addEventListener("click", () => {
  resetState(); $("voice-one-played").checked = false; $("voice-two-played").checked = false;
  $("connection").value = ""; $("strategy").value = ""; $("degree-answer").value = ""; $("role-answer").value = "";
  setFeedback(); render();
});
for (const id of ["voice-one-played", "voice-two-played"]) $(id).addEventListener("change", render);
$("save-reflection").addEventListener("click", () => {
  const answers = { connection: $("connection").value, strategy: $("strategy").value, degree: $("degree-answer").value, role: $("role-answer").value };
  if (Object.values(answers).some((value) => !value)) { setFeedback("Complete both reflections and both theory retrievals.", "bad"); return; }
  const gResolution = plan.describeMovement(state.paths.g[2], state.paths.g[3], plan.contexts.g.dominant, plan.contexts.g.home);
  const leading = gResolution.find(({ fromScaleDegree, toScaleDegree }) => fromScaleDegree === 7 && toScaleDegree === 1);
  const degreeCorrect = answers.degree === `${leading.fromScaleDegree}-${leading.toScaleDegree}`;
  const roleCorrect = answers.role === leading.fromRole;
  state.reflection = { ...answers, degreeCorrect, roleCorrect };
  setFeedback(`Reflection recorded. Theory retrieval: scale degrees ${degreeCorrect ? "correct" : `review ${leading.fromScaleDegree} → ${leading.toScaleDegree}`}; chord role ${roleCorrect ? "correct" : `review ${leading.fromRole}`}.`, degreeCorrect && roleCorrect ? "good" : "warn");
  $("save-reflection").hidden = true;
  $("continue").hidden = false;
});

render();
