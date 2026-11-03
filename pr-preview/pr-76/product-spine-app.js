import { STANDARD_FRETBOARD, formatNote, musicQueries } from "./engine/index.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { createPracticePlan } from "./practice-session.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { createFretboard } from "./fretboard-view.mjs?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const plan = createPracticePlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex],
    pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(musicQueries.getInterval(request)),
  formatNote,
});

const state = {
  mode: "desk",
  stage: "play",
  started: false,
  mainSelection: null,
  mainPrediction: null,
  mainCompared: false,
  phraseChoice: null,
  transferSelection: null,
  transferPrediction: null,
  transferCompared: false,
  reflection: null,
};

const responseChoices = [
  { value: "stop", label: "Stop here" },
  { value: "return", label: "Return home" },
  { value: "elsewhere", label: "Go somewhere else" },
];
const reflectionChoices = [
  { value: "clearer", label: "The return became easier to hear" },
  { value: "calculated", label: "I still had to calculate the notes" },
  { value: "fingering", label: "Fingering got in the way" },
  { value: "another", label: "I need another careful pass" },
];

let deskFretboard;
let relationshipFretboard;

function keyName(key) { return `${formatNote(key.tonic)} ${key.mode}`; }
function physicalStrings() {
  return STANDARD_FRETBOARD.tuning.openStrings.map(({ note }, index) => ({
    index,
    label: `${6 - index} · ${index === 5 ? "high " : index === 0 ? "low " : ""}${formatNote(note)}`,
  })).reverse();
}
function motionNames(context) {
  return {
    from: formatNote(context.motion.from.tone.note),
    to: formatNote(context.motion.to.tone.note),
  };
}
function isTransferStage(stage = state.stage) { return stage.startsWith("transfer-") || stage === "reflect" || stage === "complete"; }
function activeContext() { return isTransferStage() ? plan.transfer : plan.context; }
function currentMoment() {
  if (["play"].includes(state.stage)) return "play";
  if (["notice", "compare"].includes(state.stage)) return "notice";
  if (["understand", "phrase"].includes(state.stage)) return "understand";
  if (isTransferStage()) return "transfer";
  return null;
}
function setFeedback(text) { $("feedback").textContent = text; }
function setButton(id, { text = "", hidden = false, disabled = false } = {}) {
  const button = $(id);
  button.textContent = text;
  button.hidden = hidden;
  button.disabled = disabled;
}
function showOnly(...ids) {
  for (const id of ["desk-panel", "focus-panel", "response-panel", "relationship-panel", "phrase-panel", "context-change-panel", "reflection-panel"]) {
    $(id).hidden = !ids.includes(id);
  }
}
function setNormalHeader(normal) {
  $("intent-nav").hidden = !normal;
  $("focus-label").hidden = normal;
  $("return-desk").hidden = normal;
}
function updateIntent() {
  $("intent-explore").setAttribute("aria-pressed", String(state.mode === "desk"));
  $("intent-practice").setAttribute("aria-pressed", String(state.mode === "practice"));
}
function updateMoments() {
  const moment = currentMoment();
  $("practice-moments").hidden = state.mode !== "practice" || ["play", "transfer-play"].includes(state.stage);
  for (const node of $("practice-moments").children) node.className = node.dataset.moment === moment ? "active" : "";
}
function updateSharedHeader() {
  const context = state.mode === "desk" ? activeContext() : activeContext();
  $("key-label").textContent = keyName(context.key);
  updateIntent();
  updateMoments();
}

function fretboardModel(context, { desk = false } = {}) {
  const from = context.motion.from;
  const to = context.motion.to;
  const fromName = formatNote(from.tone.note);
  const toName = formatNote(to.tone.note);
  const positions = desk ? [{
    ...to.plannedLocation.position,
    states: ["destination"],
    primaryLabel: toName,
    ariaLabel: `${toName}, high E string, fret ${to.plannedLocation.position.fret}`,
  }] : [
    {
      ...from.plannedLocation.position,
      states: ["source"],
      primaryLabel: fromName,
      ariaLabel: `${fromName}, high E string, fret ${from.plannedLocation.position.fret}, source note`,
    },
    {
      ...to.plannedLocation.position,
      states: ["destination"],
      primaryLabel: toName,
      ariaLabel: `${toName}, high E string, fret ${to.plannedLocation.position.fret}, destination note`,
    },
  ];
  return {
    strings: physicalStrings(),
    activeStringIndices: desk ? [] : [5],
    fretRange: { minFret: 0, maxFret: 5 },
    positions,
    connections: desk ? [] : [{
      from: from.plannedLocation.position,
      to: to.plannedLocation.position,
      kind: "up",
      label: `${context.motion.playedInterval.label} · one fret`,
      emphasis: true,
    }],
    label: desk
      ? `${keyName(context.key)} reference on the guitar fretboard`
      : `${keyName(context.key)} ${fromName} to ${toName} relationship on the high E string`,
  };
}
function renderDeskBoard() {
  const context = activeContext();
  deskFretboard ??= createFretboard($("desk-board"));
  deskFretboard.update(fretboardModel(context, { desk: true }));
}
function renderRelationshipBoard(context) {
  relationshipFretboard ??= createFretboard($("relationship-board"));
  relationshipFretboard.update(fretboardModel(context));
  const { from, to } = motionNames(context);
  const pressure = context.chords.pressure.symbol;
  const home = context.chords.home.symbol;
  $("relationship-line-1").textContent = `${from} is the third of ${pressure}.`;
  $("relationship-line-2").textContent = `${to} is the root of ${home}.`;
  $("relationship-line-3").textContent = "One fret up.";
}

function renderOptionButtons(container, choices, selected, className, onChoose) {
  const buttons = choices.map(({ value, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.value = value;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(selected === value));
    button.addEventListener("click", () => onChoose(value));
    return button;
  });
  container.replaceChildren(...buttons);
}

function renderDesk() {
  setNormalHeader(true);
  showOnly("desk-panel");
  const context = activeContext();
  const name = motionNames(context).to;
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = `${keyName(context.key)} · ${name} reference`;
  $("stage-title").textContent = "Hear the pull back home";
  $("stage-lead").textContent = "";
  $("desk-note").textContent = state.started
    ? "Your practice context is still here. Inspect freely, then resume when your guitar is ready."
    : "Inspect freely, then choose deliberate Practice when you want to retrieve and use the relationship.";
  renderDeskBoard();
  setFeedback(state.started ? "Practice is paused at the Instrument Desk; no progress or prediction was discarded." : "Explore is open. Nothing here is a prerequisite gate.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: state.started ? "Resume this comparison" : "Practise this comparison" });
  updateSharedHeader();
}

function renderFocus({ transfer = false } = {}) {
  setNormalHeader(false);
  showOnly("focus-panel");
  const context = transfer ? plan.transfer : plan.context;
  $("focus-label").textContent = "Practice · Harmonic Gravity";
  $("experience-label").textContent = "PLAY · Focus";
  $("context-label").textContent = "";
  $("stage-title").textContent = "";
  $("stage-lead").textContent = "";
  $("focus-prompt").textContent = transfer ? "Predict again before the next chord" : "Predict before the next chord";
  $("focus-cue").textContent = `${context.chords.home.symbol} → ${context.chords.pressure.symbol} → silence`;
  $("focus-instruction").textContent = "Play. Stop. Leave real silence. Form an expectation before trying an ending.";
  setFeedback("Only the current musical cue stays visible while you play.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: transfer ? "I'm ready to predict in A major" : "I'm ready to predict" });
  updateSharedHeader();
}

function renderNotice({ transfer = false } = {}) {
  setNormalHeader(true);
  showOnly("response-panel");
  const context = transfer ? plan.transfer : plan.context;
  const selected = transfer ? state.transferSelection : state.mainSelection;
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = `${keyName(context.key)} · stopped on ${context.chords.pressure.symbol}`;
  $("stage-title").textContent = "What do you expect next?";
  $("stage-lead").textContent = "";
  $("response-heading").textContent = "What do you expect next?";
  renderOptionButtons($("response-options"), responseChoices, selected, "response-option", (value) => {
    if (transfer) state.transferSelection = value;
    else state.mainSelection = value;
    render();
  });
  setFeedback(selected ? "Your expectation is selected but not committed yet." : "Select an expectation after listening. No choice is graded correct or wrong.");
  setButton("secondary-action", { text: "Compare again", hidden: false });
  setButton("primary-action", { text: "Commit my prediction", disabled: !selected });
  updateSharedHeader();
}

function renderCompare({ transfer = false } = {}) {
  setNormalHeader(true);
  showOnly("focus-panel");
  const context = transfer ? plan.transfer : plan.context;
  const prediction = transfer ? state.transferPrediction : state.mainPrediction;
  const label = responseChoices.find(({ value }) => value === prediction)?.label ?? "your prediction";
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = `${keyName(context.key)} · committed prediction`;
  $("stage-title").textContent = "Now test the ending";
  $("stage-lead").textContent = `You predicted: ${label}. The app does not mark that prediction right or wrong.`;
  $("focus-prompt").textContent = "Play the ending before opening any labels";
  $("focus-cue").textContent = `${context.chords.pressure.symbol} → ${context.chords.home.symbol}`;
  $("focus-instruction").textContent = "Listen to the consequence. Compare it with the expectation you committed.";
  setFeedback("Theory and target-note labels remain hidden until you confirm the physical comparison.");
  setButton("secondary-action", { text: "Compare again from silence", hidden: false });
  setButton("primary-action", { text: "I played and listened" });
  updateSharedHeader();
}

function renderUnderstand({ transfer = false } = {}) {
  setNormalHeader(true);
  showOnly("relationship-panel");
  const context = transfer ? plan.transfer : plan.context;
  const names = motionNames(context);
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = `${keyName(context.key)} · ${context.chords.pressure.symbol} → ${context.chords.home.symbol} · high E, frets ${context.motion.from.plannedLocation.position.fret}–${context.motion.to.plannedLocation.position.fret}`;
  $("stage-title").textContent = transfer ? "The relationship survived new names" : "One small connection";
  $("stage-lead").textContent = transfer
    ? `You made a fresh prediction in ${keyName(context.key)} before seeing ${names.from} → ${names.to}.`
    : "Roles appear after the physical and melodic comparison.";
  renderRelationshipBoard(context);
  setFeedback("The chord roles and locations are engine-derived facts. The sense of home belongs to this listening comparison.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: transfer ? "Reflect on the connection" : "Use these two notes" });
  updateSharedHeader();
}

function renderPhrase() {
  setNormalHeader(true);
  showOnly("phrase-panel");
  const { from, to } = motionNames(plan.context);
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = `G major · ${plan.context.chords.pressure.symbol} → ${plan.context.chords.home.symbol} · two-note palette`;
  $("stage-title").textContent = "Make one small musical decision";
  $("stage-lead").textContent = `Use ${from} and ${to}; let ${to} become the destination when ${plan.context.chords.home.symbol} returns.`;
  $("phrase-instruction").textContent = `Play ${plan.context.chords.home.symbol} → ${plan.context.chords.departure.symbol} → ${plan.context.chords.pressure.symbol} → ${plan.context.chords.home.symbol}. Choose a tiny phrase, leave space, and make the final ${to} deliberate.`;
  const choices = [
    { value: "answer", label: `${from} → ${to} · direct answer` },
    { value: "turn", label: `${to} → ${from} → ${to} · small turn` },
  ];
  renderOptionButtons($("phrase-options"), choices, state.phraseChoice, "phrase-option", (value) => { state.phraseChoice = value; render(); });
  setFeedback(state.phraseChoice ? "Play the chosen phrase against the chord change before continuing." : "Choose a small constraint. This is not a best-phrase contest.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "I played this tiny phrase", disabled: !state.phraseChoice });
  updateSharedHeader();
}

function renderTransferSetup() {
  setNormalHeader(true);
  showOnly("context-change-panel");
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = "Current context · G major";
  $("stage-title").textContent = "Same question, new key";
  $("stage-lead").textContent = "Establish the new home. Compare, then predict again.";
  setFeedback("Keep the original answer out of view. Try the comparison before opening the new labels.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "Start A-major transfer" });
  updateSharedHeader();
}

function transferredPhrase() {
  const { from, to } = motionNames(plan.transfer);
  return state.phraseChoice === "turn" ? `${to} → ${from} → ${to}` : `${from} → ${to}`;
}
function renderTransferUnderstand() {
  renderUnderstand({ transfer: true });
  $("stage-lead").textContent = `Your earlier tiny phrase maps to ${transferredPhrase()}. Play it once in the new context before reflecting.`;
}

function renderReflection() {
  setNormalHeader(true);
  showOnly("reflection-panel");
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = "A-major transfer · reflection";
  $("stage-title").textContent = "Did the relationship transfer?";
  $("stage-lead").textContent = "Keep the judgment tied to what you just heard and played.";
  renderOptionButtons($("reflection-options"), reflectionChoices, state.reflection, "reflection-option", (value) => { state.reflection = value; render(); });
  setFeedback(state.reflection ? "Reflection held on this page only. Nothing has been scored." : "One observation is enough.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "Finish this pass", disabled: !state.reflection });
  updateSharedHeader();
}

function renderComplete() {
  setNormalHeader(true);
  showOnly();
  $("experience-label").textContent = "Harmonic Gravity";
  $("context-label").textContent = "G major → A major · one relationship transferred";
  $("stage-title").textContent = "One relationship, heard and reused";
  $("stage-lead").textContent = `You predicted an ending, connected it to ${motionNames(plan.context).from} → ${motionNames(plan.context).to}, used it in a tiny phrase, then rebuilt the relationship as ${motionNames(plan.transfer).from} → ${motionNames(plan.transfer).to}.`;
  setFeedback("This completion records no mastery claim. Another pass is useful only if it answers a real playing question.");
  setButton("secondary-action", { text: "Restart practice", hidden: false });
  setButton("primary-action", { text: "Return to Instrument Desk" });
  updateSharedHeader();
}

function renderPractice() {
  switch (state.stage) {
    case "play": renderFocus(); break;
    case "notice": renderNotice(); break;
    case "compare": renderCompare(); break;
    case "understand": renderUnderstand(); break;
    case "phrase": renderPhrase(); break;
    case "transfer-setup": renderTransferSetup(); break;
    case "transfer-play": renderFocus({ transfer: true }); break;
    case "transfer-notice": renderNotice({ transfer: true }); break;
    case "transfer-compare": renderCompare({ transfer: true }); break;
    case "transfer-understand": renderTransferUnderstand(); break;
    case "reflect": renderReflection(); break;
    case "complete": renderComplete(); break;
    default: throw new Error(`Unknown Product Spine stage: ${state.stage}`);
  }
}

function render() {
  document.body.dataset.mode = state.mode;
  document.body.dataset.stage = state.stage;
  if (state.mode === "desk") renderDesk();
  else renderPractice();
}

function enterPractice() {
  state.started = true;
  state.mode = "practice";
  render();
  $("stage-title").focus();
}
function returnToDesk() {
  state.mode = "desk";
  render();
  $("stage-title").focus();
}
function resetPractice() {
  Object.assign(state, {
    mode: "practice",
    stage: "play",
    started: true,
    mainSelection: null,
    mainPrediction: null,
    mainCompared: false,
    phraseChoice: null,
    transferSelection: null,
    transferPrediction: null,
    transferCompared: false,
    reflection: null,
  });
  render();
  $("stage-title").focus();
}
function choosePrimary() {
  if (state.mode === "desk") return enterPractice();
  switch (state.stage) {
    case "play": state.stage = "notice"; break;
    case "notice":
      if (!state.mainSelection) return;
      state.mainPrediction = state.mainSelection; state.stage = "compare"; break;
    case "compare": state.mainCompared = true; state.stage = "understand"; break;
    case "understand": state.stage = "phrase"; break;
    case "phrase": if (!state.phraseChoice) return; state.stage = "transfer-setup"; break;
    case "transfer-setup": state.stage = "transfer-play"; break;
    case "transfer-play": state.stage = "transfer-notice"; break;
    case "transfer-notice":
      if (!state.transferSelection) return;
      state.transferPrediction = state.transferSelection; state.stage = "transfer-compare"; break;
    case "transfer-compare": state.transferCompared = true; state.stage = "transfer-understand"; break;
    case "transfer-understand": state.stage = "reflect"; break;
    case "reflect": if (!state.reflection) return; state.stage = "complete"; break;
    case "complete": return returnToDesk();
    default: return;
  }
  render();
  $("stage-title").focus();
}
function chooseSecondary() {
  if (state.stage === "notice") state.stage = "play";
  else if (state.stage === "compare") state.stage = "play";
  else if (state.stage === "transfer-notice") state.stage = "transfer-play";
  else if (state.stage === "transfer-compare") state.stage = "transfer-play";
  else if (state.stage === "complete") return resetPractice();
  else return;
  render();
  $("stage-title").focus();
}

$("primary-action").addEventListener("click", choosePrimary);
$("secondary-action").addEventListener("click", chooseSecondary);
$("return-desk").addEventListener("click", returnToDesk);
$("intent-explore").addEventListener("click", returnToDesk);
$("intent-practice").addEventListener("click", enterPractice);
$("question-harmonic").addEventListener("click", () => { state.mode = "desk"; render(); });

render();
