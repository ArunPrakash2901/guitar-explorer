import { STANDARD_FRETBOARD, formatNote, formatPitch, musicQueries } from "/engine/index.js";
import { createPracticePlan } from "/practice-session.mjs";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
const plan = createPracticePlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD, fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex], pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(musicQueries.getInterval(request)),
  formatNote,
});
const focused = /^\/harmony(?:\.html)?\/?$/.test(location.pathname);
const blockNames = ["Retrieve · about 5–8 minutes", "Current focus · about 15–20 minutes", "Connect · about 5 minutes", "Musicalize · about 5 minutes", "Transfer · about 5 minutes", "Reflect · about 2 minutes"];
const state = {};
let fretButtons = [];

function currentGravity() { return state.block === 1 ? plan.gravitySteps[state.gravityIndex] : null; }
function currentTransfer() { return state.block === 4 ? plan.transfer.steps[state.transferIndex] : null; }
function listeningStep() { return currentGravity() ?? currentTransfer(); }
function keyName(key) { return `${formatNote(key.tonic)} ${key.mode}`; }
function stringName(index) {
  if (index === 5) return "high E";
  if (index === 0) return "low E";
  return formatNote(STANDARD_FRETBOARD.tuning.openStrings[index].note);
}
function locationLabel(note) {
  return `${stringName(note.plannedLocation.position.stringIndex)} string (string ${6 - note.plannedLocation.position.stringIndex}), fret ${note.plannedLocation.position.fret}`;
}
function feedback(text, kind = "") { $("feedback").textContent = text; $("feedback").className = kind; }
function option(value, label) { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; }
function rowList(rows) {
  const dl = document.createElement("dl");
  for (const { label, value } of rows) {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    dl.append(dt, dd);
  }
  return dl;
}
function showTheory(reveal) {
  $("theory-heading").textContent = reveal.heading;
  const children = [rowList(reveal.rows)];
  if (reveal.note) { const note = document.createElement("p"); note.className = "theory-note"; note.textContent = reveal.note; children.push(note); }
  $("theory").replaceChildren(...children);
  $("theory-panel").hidden = false;
}
function sequenceLines(sequence) {
  $("sequence").replaceChildren();
  if (!sequence?.length) return;
  const lines = Array.isArray(sequence[0]) ? sequence : [sequence];
  for (const line of lines) {
    const node = document.createElement("div"); node.className = "sequence-line";
    node.textContent = line.map((chord) => typeof chord === "string" ? chord : chord.symbol).join(" → ");
    $("sequence").append(node);
  }
}
function showMotion(notes) {
  const palette = document.createElement("div"); palette.className = "note-palette";
  for (const note of notes) {
    const card = document.createElement("div"); card.className = "note-card";
    const name = document.createElement("strong"); name.textContent = formatPitch(note.plannedLocation.pitch);
    const position = document.createElement("span"); position.textContent = locationLabel(note);
    card.append(name, position); palette.append(card);
  }
  $("sequence").append(palette);
}
function roleLabel(tone) {
  const sign = tone.alteration > 0 ? "♯" : "♭";
  return `${sign.repeat(Math.abs(tone.alteration))}${tone.degree}`;
}
function warmupTheory(task) {
  showTheory({
    heading: "A familiar relationship, in today's material",
    rows: [
      { label: "Committed target", value: `${formatPitch(task.plannedLocation.pitch)} · ${locationLabel({ plannedLocation: task.plannedLocation })}` },
      { label: "Chord role", value: `${roleLabel(task.tone)} of ${task.chord.symbol}` },
      { label: "Played interval", value: `${task.playedInterval.label}, from ${formatPitch(task.anchor.pitch)} to ${formatPitch(task.plannedLocation.pitch)}` },
    ],
    note: "This only confirms the requested screen location. It does not verify what you sang or played.",
  });
}
function renderWarmupBoard(task) {
  fretButtons = [];
  const header = document.createElement("tr");
  const row = document.createElement("tr");
  const corner = document.createElement("th"); corner.textContent = `${stringName(task.stringIndex)} · string ${6 - task.stringIndex}`; row.append(corner);
  const spacer = document.createElement("th"); spacer.textContent = "Fret"; header.append(spacer);
  for (let fret = task.fretWindow.minFret; fret <= task.fretWindow.maxFret; fret += 1) {
    const th = document.createElement("th"); th.scope = "col"; th.textContent = String(fret); header.append(th);
    const td = document.createElement("td");
    const button = document.createElement("button"); button.type = "button"; button.className = "fret"; button.dataset.fret = String(fret);
    const target = state.warmupRevealed && fret === task.plannedLocation.position.fret;
    button.textContent = target ? formatNote(task.tone.note) : "·";
    button.setAttribute("aria-label", `${stringName(task.stringIndex)} string, fret ${fret}${target ? `, ${formatPitch(task.plannedLocation.pitch)}` : ""}`);
    button.setAttribute("aria-pressed", String(state.selection?.fret === fret));
    button.disabled = state.warmupRevealed;
    button.addEventListener("click", () => {
      if (state.block !== 0 || state.warmupRevealed) return;
      state.selection = { stringIndex: task.stringIndex, fret };
      for (const other of fretButtons) other.setAttribute("aria-pressed", String(other === button));
      feedback(`Committed ${stringName(task.stringIndex)} string, fret ${fret}. Check the location after playing it on your guitar.`);
    });
    fretButtons.push(button); td.append(button); row.append(td);
  }
  const thead = document.createElement("thead"); thead.append(header);
  const tbody = document.createElement("tbody"); tbody.append(row);
  $("board").replaceChildren(thead, tbody); $("board-panel").hidden = false;
}

function chooseResponse(value) {
  const step = listeningStep();
  if (!step?.choices?.some((choice) => choice.value === value) || (step.afterCommit && state.prediction !== null)) return;
  state.responses[step.id] = value;
  for (const button of $("choices").children) button.setAttribute("aria-pressed", String(button.dataset.value === value));
  feedback("Noted as your listening response. This is not a scored answer; uncertainty is a useful observation.");
  if (!step.afterCommit) $("next").disabled = false;
  else $("commit-prediction").disabled = false;
}
function renderChoices(step) {
  if (!step.choices?.length) return;
  const buttons = step.choices.map((choice) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = choice.label;
    button.dataset.value = choice.value;
    button.setAttribute("aria-pressed", String(state.responses[step.id] === choice.value));
    button.addEventListener("click", () => chooseResponse(choice.value));
    return button;
  });
  $("choices").replaceChildren(...buttons); $("choices-panel").hidden = false;
}
function renderListening(step) {
  $("stage-title").textContent = step.title;
  const committed = step.afterCommit && state.prediction !== null;
  $("prompt").textContent = committed ? step.afterCommit.prompt : step.prompt;
  $("instruction").textContent = committed ? step.afterCommit.instruction : step.instruction;
  sequenceLines(committed ? step.afterCommit.sequence : step.sequence);
  if (step.id === "fixed-note") showMotion([plan.context.sameNote]);
  if (step.id === "melodic-compare") showMotion([plan.context.motion.from, plan.context.motion.to]);
  const transferReveal = state.block === 4 && Boolean(step.reveal);
  if (step.reveal && (!transferReveal || state.transferRevealed)) showTheory(step.reveal);
  if (transferReveal && !state.transferRevealed) {
    $("show-transfer-theory").hidden = false;
    feedback("Play and compare in the new key before revealing its labels. There is no Roman-numeral quiz.");
    return;
  }
  if (committed) {
    const choice = step.choices.find(({ value }) => value === state.prediction);
    feedback(`Your prediction: ${choice.label}. Play the comparison now; the page does not decide whether your expectation was right.`);
    $("confirm-listened").hidden = state.predictionResolved;
    $("next").hidden = !state.predictionResolved;
  } else {
    renderChoices(step);
    if (step.afterCommit) {
      $("commit-prediction").hidden = false;
      $("commit-prediction").disabled = !state.responses[step.id];
      feedback("Make and commit your prediction before touching the next chord. The next playing instruction stays hidden until then.");
    } else {
      $("next").hidden = false; $("next").disabled = Boolean(step.choices?.length && !state.responses[step.id]);
      feedback(step.choices?.length ? "Play and listen first. Choose what you noticed, including unclear if that is honest." : "Take time with your guitar. Continue when you have tried the comparison.");
    }
  }
  $("next").textContent = step.action || "Continue";
}

function render() {
  for (const id of ["board-panel", "choices-panel", "theory-panel", "reflection-panel", "check-warmup", "reveal-warmup", "commit-prediction", "confirm-listened", "show-transfer-theory", "record-reflection", "next"]) $(id).hidden = true;
  $("theory").replaceChildren(); $("theory-heading").textContent = "";
  $("choices").replaceChildren(); $("sequence").replaceChildren();
  $("next").disabled = false; $("next").textContent = "Continue";
  $("back").disabled = (state.block === (focused ? 1 : 0)) && (focused ? state.gravityIndex === 0 : state.warmupIndex === 0);
  $("replay").hidden = ![0, 1, 4].includes(state.block) || Boolean(listeningStep()?.reveal);
  $("replay").textContent = state.block === 0 ? "Try this retrieval again" : "Repeat this listening step";
  $("context").textContent = `${keyName(state.block === 4 ? plan.transfer.key : plan.context.key)} · familiar chords · your physical guitar`;
  $("block-label").textContent = state.block < 6 ? `${focused ? "Focused session" : `Block ${state.block + 1} of 6`} · ${blockNames[state.block]}` : "Session complete";

  if (state.block === 0) {
    const task = plan.warmups[state.warmupIndex];
    $("stage-title").textContent = `${state.warmupIndex + 1} of ${plan.warmups.length} · ${task.title}`;
    $("prompt").textContent = task.prompt; $("instruction").textContent = task.instruction;
    renderWarmupBoard(task);
    if (state.warmupRevealed) {
      warmupTheory(task); $("next").hidden = false;
      $("next").textContent = state.warmupIndex === plan.warmups.length - 1 ? "Begin the listening focus" : "Next small retrieval";
      feedback("Leave this familiar relationship connected to today's chord material, then move on. This is a short warm-up.");
    } else { $("check-warmup").hidden = false; $("reveal-warmup").hidden = false; feedback("Predict and play first. The target exists in this frozen engine-derived window."); }
  } else if (state.block === 1) renderListening(currentGravity());
  else if (state.block === 2) {
    $("stage-title").textContent = "Let earlier theory explain one thing you heard";
    $("prompt").textContent = plan.connection.prompt; $("instruction").textContent = plan.connection.instruction;
    sequenceLines([plan.context.chords.pressure, plan.context.chords.home]);
    showMotion([plan.connection.from, plan.connection.to]);
    showTheory({ heading: "One small connection", rows: [
      { label: `${formatNote(plan.connection.from.tone.note)} in ${plan.context.chords.pressure.symbol}`, value: `Chord role ${roleLabel(plan.connection.from.tone)}` },
      { label: "Played motion", value: `${formatPitch(plan.connection.from.plannedLocation.pitch)} → ${formatPitch(plan.connection.to.plannedLocation.pitch)} · ${plan.connection.playedInterval.label}` },
    ], note: "These roles and pitches come from the music engine. Listen to their effect in this particular context; this is not a general voice-leading rule." });
    feedback("Play the connection in context rather than solving another chord-construction puzzle.");
    $("next").hidden = false; $("next").textContent = "I tried the connection on my guitar";
  } else if (state.block === 3) {
    $("stage-title").textContent = "Make one melodic decision because the chord changed";
    $("prompt").textContent = plan.musicalize.prompt; $("instruction").textContent = plan.musicalize.instruction;
    sequenceLines(plan.musicalize.sequence); showMotion(plan.musicalize.palette);
    feedback("Repeat slowly at your own pace. Two notes are enough; the aim is a context-aware destination, not a technical solo.");
    $("next").hidden = false; $("next").textContent = "I tried a tiny phrase";
  } else if (state.block === 4) renderListening(currentTransfer());
  else if (state.block === 5) {
    $("stage-title").textContent = "Where was the friction?";
    $("prompt").textContent = "Keep this small. Notice the link that was slowest, or choose no clear breakdown.";
    $("instruction").textContent = "This is your report, not a mastery estimate. It stays only on this page until restart or reload.";
    $("reflection-choice").replaceChildren(option("", "Choose what you noticed"), ...plan.reflectionOptions.map(({ value, label }) => option(value, label)));
    $("immediacy").replaceChildren(option("", "Leave unanswered"), ...plan.immediacyOptions.map(({ value, label }) => option(value, label)));
    $("reflection-choice").value = state.reflectionChoice; $("immediacy").value = state.immediacyChoice;
    $("reflection-panel").hidden = false; $("record-reflection").hidden = Boolean(state.reflection);
    $("next").hidden = !state.reflection; $("next").textContent = "Finish this session";
    feedback(state.reflection ? "Your reflection is held on this page only. Nothing was scored or saved." : "One observation is enough.");
  } else {
    $("stage-title").textContent = "One musical idea, explored from several angles";
    $("context").textContent = "Listening · expectation · one melodic choice · transfer";
    $("prompt").textContent = "You have reached the end of this curated session. Did the same relationship survive the change of key, or did fingering or calculation still get in the way?";
    $("instruction").textContent = "Stop and let the sound settle. A later repetition can test whether the connection feels more immediate. The page cannot establish what you heard or how lasting the learning was.";
    feedback("Restart only if another careful playing pass would be useful. The Chord Lab remains available as a focused tool.");
  }
}

function resetInteraction() {
  state.selection = null; state.warmupRevealed = false; state.prediction = null; state.predictionResolved = false; state.transferRevealed = false;
  const step = listeningStep(); if (step) delete state.responses[step.id];
}
function canAdvance() {
  if (state.block === 0) return state.warmupRevealed;
  const step = listeningStep();
  if (step) {
    if (state.block === 4 && step.reveal) return state.transferRevealed;
    if (step.afterCommit) return state.prediction !== null && state.predictionResolved;
    return !step.choices?.length || Boolean(state.responses[step.id]);
  }
  if (state.block === 5) return Boolean(state.reflection);
  return state.block === 2 || state.block === 3;
}
function advance() {
  if (!canAdvance()) return;
  if (state.block === 0 && state.warmupIndex < plan.warmups.length - 1) state.warmupIndex += 1;
  else if (state.block === 1 && state.gravityIndex < plan.gravitySteps.length - 1) state.gravityIndex += 1;
  else if (state.block === 4 && state.transferIndex < plan.transfer.steps.length - 1) state.transferIndex += 1;
  else state.block += 1;
  resetInteraction(); render(); $("stage-title").focus();
}
function goBack() {
  if ($( "back").disabled) return;
  if (state.block === 0) state.warmupIndex -= 1;
  else if (state.block === 1 && state.gravityIndex > 0) state.gravityIndex -= 1;
  else if (state.block === 4 && state.transferIndex > 0) state.transferIndex -= 1;
  else {
    state.block -= 1;
    if (state.block === 0) state.warmupIndex = plan.warmups.length - 1;
    if (state.block === 1) state.gravityIndex = plan.gravitySteps.length - 1;
    if (state.block === 4) state.transferIndex = plan.transfer.steps.length - 1;
    if (state.block === 5) state.reflection = null;
  }
  resetInteraction(); render(); $("stage-title").focus();
}
function checkWarmup() {
  if (state.block !== 0 || state.warmupRevealed) return;
  if (!state.selection) { feedback("Play first, then commit the fret you used.", "warn"); return; }
  const task = plan.warmups[state.warmupIndex];
  if (state.selection.stringIndex !== task.plannedLocation.position.stringIndex || state.selection.fret !== task.plannedLocation.position.fret) {
    const selected = unwrap(musicQueries.getNoteAtFret({ position: state.selection, context: { key: task.key } }));
    feedback(`Your screen commitment was ${selected.name}. It does not match this retrieval target. Play and compare again, or deliberately reveal the target.`, "warn"); return;
  }
  state.warmupRevealed = true; render(); $("next").focus();
}
function revealWarmup() {
  if (state.block !== 0 || state.warmupRevealed) return;
  state.selection = null; state.warmupRevealed = true;
  render(); feedback("Assisted reveal. Play the relationship before continuing; no retrieval success is being claimed.", "warn"); $("next").focus();
}
function commitPrediction() {
  const step = listeningStep();
  if (!step?.afterCommit || state.prediction !== null || !step.choices.some(({ value }) => value === state.responses[step.id])) return;
  state.prediction = state.responses[step.id]; render(); $("stage-title").focus();
}
function confirmListened() {
  if (!listeningStep()?.afterCommit || state.prediction === null || state.predictionResolved) return;
  state.predictionResolved = true; render(); $("next").focus();
}
function revealTransfer() {
  if (state.block !== 4 || !currentTransfer()?.reveal || state.transferRevealed) return;
  state.transferRevealed = true; render(); $("stage-title").focus();
}
function recordReflection() {
  if (state.block !== 5) return;
  const friction = $("reflection-choice").value; const immediacy = $("immediacy").value;
  if (!plan.reflectionOptions.some(({ value }) => value === friction)) { feedback("Choose one observation, including no clear breakdown if appropriate.", "warn"); return; }
  if (immediacy && !plan.immediacyOptions.some(({ value }) => value === immediacy)) return;
  state.reflectionChoice = friction; state.immediacyChoice = immediacy;
  state.reflection = { friction, immediacy: immediacy || null };
  render(); $("next").focus();
}
function restart() {
  Object.assign(state, { block: focused ? 1 : 0, warmupIndex: 0, gravityIndex: 0, transferIndex: 0,
    selection: null, warmupRevealed: false, responses: {}, prediction: null, predictionResolved: false,
    transferRevealed: false, reflectionChoice: "", immediacyChoice: "", reflection: null });
  render(); $("stage-title").focus();
}
$("next").addEventListener("click", advance);
$("back").addEventListener("click", goBack);
$("restart").addEventListener("click", restart);
$("replay").addEventListener("click", () => { if (state.block !== 0 && (!listeningStep() || listeningStep().reveal)) return; resetInteraction(); render(); $("stage-title").focus(); });
$("check-warmup").addEventListener("click", checkWarmup);
$("reveal-warmup").addEventListener("click", revealWarmup);
$("commit-prediction").addEventListener("click", commitPrediction);
$("confirm-listened").addEventListener("click", confirmListened);
$("show-transfer-theory").addEventListener("click", revealTransfer);
$("record-reflection").addEventListener("click", recordReflection);
for (const id of ["reflection-choice", "immediacy"]) $(id).addEventListener("change", () => {
  if (state.block !== 5) return;
  state.reflectionChoice = $("reflection-choice").value; state.immediacyChoice = $("immediacy").value; state.reflection = null;
  $("next").hidden = true; $("record-reflection").hidden = false; feedback("Keep the changed reflection before finishing.");
});
$("page-title").textContent = focused ? "Harmonic Gravity · listen before labels" : "One musical idea, several connected angles";
$("session-duration").textContent = focused ? "About 30–45 minutes with your guitar. This focused route skips the brief retrieval; the listening material is shared with Practice Session." : "About 35–50 minutes with your guitar. The six connected blocks are estimates, not timed drills.";
document.title = focused ? "Guitar Explorer · Harmonic Gravity" : "Guitar Explorer · Practice Session";
restart();
