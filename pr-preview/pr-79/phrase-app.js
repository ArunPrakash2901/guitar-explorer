import { STANDARD_FRETBOARD, formatNote, musicQueries } from "./engine/index.js?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { createFretboard } from "./fretboard-view.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { chordRole, pathConnections } from "./phrase-material.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { getMelodyScenarios, getMotifScenarios } from "./scenario-catalogue.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { resolveScenario } from "./scenario-resolver.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { createMelodyPlan } from "./melody-session.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { createMotifPlan } from "./motif-session.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { generateMelodyScenario, generateDistinctMelodyScenario, getScenarioFingerprint } from "./melody-generator.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { prepareMelodyExperience, prepareDistinctMelodyExperience, createPhraseQueries } from "./melody-experience.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";
import { setScenarioContext } from "./scenario-context.mjs?ge-revision=4f380850e03779b677d274444a409c90cbf769fc";

const $ = (id) => document.getElementById(id);
const queries = createPhraseQueries({ musicQueries, STANDARD_FRETBOARD, formatNote });
const mode = document.body.dataset.probe;
const catalogue = mode === "melody" ? getMelodyScenarios() : getMotifScenarios();
const resolved = mode === "motif" ? new Map(catalogue.map((spec) => [spec.id, resolveScenario(spec, queries)])) : null;
let selectedScenario = catalogue[0];
let material;
let plan;
let practiceSource = "catalogue";
let currentGeneratedSeed = 1001;
let currentGeneratedConfig = null;
let currentGeneratedFingerprint = null;

if (mode === "melody") {
  const initial = prepareMelodyExperience({ source: "catalogue", scenarioId: catalogue[0].id }, { queries });
  selectedScenario = initial.scenario;
  material = initial.resolved;
  plan = initial.plan;
} else {
  material = resolved.get(catalogue[0].id);
  plan = createMotifPlan(material);
}
const state = {};
function reset() {
  Object.assign(state, { index: 0, selections: [], revealed: false, result: null, feedback: "", feedbackKind: "",
    hints: 0, startedAt: Date.now(), evidence: {}, reflection: null });
}
reset();
for (const spec of catalogue) {
  const option = document.createElement("option"); option.value = spec.id; option.textContent = spec.title;
  $("scenario-select").append(option);
}
function describeScenario() {
  if (practiceSource === "catalogue") {
    $("scenario-select").value = selectedScenario.id;
  }
  $("scenario-info").textContent = `${selectedScenario.description} · ${selectedScenario.difficulty} · ${formatNote(selectedScenario.context.key.tonic)} major`;
  setScenarioContext(document, selectedScenario);
}
describeScenario();
function applyPreparedExperience(prepared) {
  selectedScenario = prepared.scenario;
  material = prepared.resolved;
  plan = prepared.plan;
  if (prepared.source === "generated") {
    currentGeneratedConfig = {
      ruleId: prepared.provenance.ruleId,
      difficulty: prepared.provenance.difficulty,
      seed: prepared.provenance.seed,
    };
    currentGeneratedFingerprint = prepared.provenance?.fingerprint || prepared.fingerprint;
    currentGeneratedSeed = prepared.provenance.seed;
    $("generation-feedback").textContent = "";
    $("generation-feedback").hidden = true;
  }
  reset();
  $("reflection").value = "";
  describeScenario();
  render();
}
function startScenario(spec) {
  if (!spec) throw new Error("Unknown approved scenario");
  if (mode === "melody") {
    const prepared = prepareMelodyExperience({ source: "catalogue", scenarioId: spec.id }, { queries });
    applyPreparedExperience(prepared);
  } else {
    if (!resolved.has(spec.id)) throw new Error("Unknown approved scenario");
    selectedScenario = spec; material = resolved.get(spec.id);
    plan = createMotifPlan(material);
    reset(); $("reflection").value = ""; describeScenario(); render();
  }
}
$("start-scenario").addEventListener("click", () => startScenario(catalogue.find(({ id }) => id === $("scenario-select").value)));

function loadGenerated(ruleId, difficulty, seed) {
  const actualRule = ruleId || ($("rule-select") && $("rule-select").value) || "rule-dominant-third";
  const actualDiff = difficulty || ($("difficulty-select") && $("difficulty-select").value) || "introductory";
  const prepared = prepareMelodyExperience({
    source: "generated",
    ruleId: actualRule,
    difficulty: actualDiff,
    seed,
  }, { queries, generateMelodyScenario });
  applyPreparedExperience(prepared);
}
if (mode === "melody" && $("source-generated")) {
  $("source-catalogue").addEventListener("click", () => {
    practiceSource = "catalogue";
    $("source-catalogue").classList.add("active");
    $("source-catalogue").setAttribute("aria-selected", "true");
    $("source-generated").classList.remove("active");
    $("source-generated").setAttribute("aria-selected", "false");
    $("catalogue-controls").hidden = false;
    $("generated-controls").hidden = true;
    startScenario(selectedScenario.id.startsWith("gen-") ? catalogue[0] : selectedScenario);
  });
  $("source-generated").addEventListener("click", () => {
    practiceSource = "generated";
    $("source-generated").classList.add("active");
    $("source-generated").setAttribute("aria-selected", "true");
    $("source-catalogue").classList.remove("active");
    $("source-catalogue").setAttribute("aria-selected", "false");
    $("catalogue-controls").hidden = true;
    $("generated-controls").hidden = false;
    loadGenerated($("rule-select").value, $("difficulty-select").value, currentGeneratedSeed);
  });
  $("generate-scenario").addEventListener("click", () => {
    currentGeneratedSeed = Math.floor(Math.random() * 100000) + 1;
    loadGenerated($("rule-select").value, $("difficulty-select").value, currentGeneratedSeed);
  });
  $("generate-another").addEventListener("click", () => {
    const ruleId = ($("rule-select") && $("rule-select").value) || currentGeneratedConfig?.ruleId || "rule-dominant-third";
    const difficulty = ($("difficulty-select") && $("difficulty-select").value) || currentGeneratedConfig?.difficulty || "introductory";
    try {
      const prepared = prepareDistinctMelodyExperience({
        ruleId,
        difficulty,
        currentSeed: currentGeneratedSeed,
        currentFingerprint: currentGeneratedFingerprint,
      }, { queries, generateDistinctMelodyScenario });
      applyPreparedExperience(prepared);
    } catch {
      $("generation-feedback").textContent = "No different scenario was found within the search limit. Your current scenario is unchanged. Retry Generate another, or change focus or difficulty.";
      $("generation-feedback").hidden = false;
    }
  });
  $("replay-scenario").addEventListener("click", () => {
    if (currentGeneratedConfig) {
      loadGenerated(currentGeneratedConfig.ruleId, currentGeneratedConfig.difficulty, currentGeneratedConfig.seed);
    }
  });
}
$("surprise-scenario").addEventListener("click", () => {
  const choices = catalogue.filter(({ id }) => id !== selectedScenario.id);
  startScenario(choices[Math.floor(Math.random() * choices.length)] ?? catalogue[0]);
});
const board = createFretboard($("board"), { onSelect(position) {
  if (state.revealed) return;
  const stage = current();
  const limit = mode === "motif" && stage.kind === "adapt" ? 3 : mode === "motif" && stage.kind === "transfer" ? 2 : 1;
  state.selections = limit === 1 ? [position] : state.selections.length < limit ? [...state.selections, position] : [position];
  state.feedback = ""; state.feedbackKind = "";
  render(); board.focusPosition(position);
} });
function current() { return plan.stages[state.index]; }
function stageEvidence() { return state.evidence[current().id] ??= { attempts: 0, hints: 0, elapsedSeconds: null, correct: false, selectedPositions: [] }; }
function stringLabel(index) {
  const open = STANDARD_FRETBOARD.tuning.openStrings[index];
  return `String ${6 - index} (${index === 5 ? "high " : index === 0 ? "low " : ""}${formatNote(open.note)})`;
}
function strings() { return STANDARD_FRETBOARD.tuning.openStrings.map((_, index) => ({ index, label: stringLabel(index) })).reverse(); }
function isSelect(stage) { return stage.kind === "select" || ["adapt", "ending", "middle", "sequence", "response", "transfer"].includes(stage.kind); }
function setFeedback(message = "", kind = "") { state.feedback = message; state.feedbackKind = kind; $("feedback").textContent = message; $("feedback").className = `feedback${kind ? ` ${kind}` : ""}`; }
function clearReveal() { $("explanation").hidden = true; $("explanation-list").replaceChildren(); }
function addExplanation(lines) {
  $("explanation-list").replaceChildren();
  for (const line of lines) { const li = document.createElement("li"); li.textContent = line; $("explanation-list").append(li); }
  $("explanation").hidden = lines.length === 0;
}
function stageLines(stage) {
  if (mode === "melody") return plan.explanation(stage);
  const g = material.main;
  const shown = plan.examples.main;
  if (stage.id === "source" || stage.id === "identity") return [
    `${shown.source.map((note) => formatNote(note.pitch.note)).join(" → ")} · ${plan.sourceInterval.label} up, then return; short–short–long feel.`,
    ...shown.source.map((note, index) => `${index + 1}. ${formatNote(note.pitch.note)} · ${chordRole(g.at(0, note.position.stringIndex, note.position.fret))} of ${g.chords[0].symbol}`),
  ];
  if (stage.id === "fragment") return [`Last-two-note fragment: ${shown.source.slice(1).map((note) => formatNote(note.pitch.note)).join(" → ")}. Repeat and adapt it over changing harmony.`];
  if (stage.id === "sequence") return [
    `Original upward interval: ${plan.sourceInterval.label}. New start: ${formatNote(plan.sequence[0].pitch.note)}; same interval reaches ${formatNote(plan.sequence[1].pitch.note)}.`,
    `This is an intervallic sequence example; its notes need not all be ${g.chords[0].symbol} chord tones.`,
  ];
  if (stage.id === "improv") return ["Your passes are unverified. Ask whether the motif remained recognizable while the targets followed the chords."];
  if (stage.id === "transfer") return [`New-key targets: ${state.result.selected.map((note) => `${formatNote(note.pitch.note)} · ${chordRole(note)}`).join(" → ")}. Rebuild the motif around those roles.`];
  if (stage.id === "complete") return ["Attempts and hints were local to this page. Only physical playing can test whether the phrase felt connected."];
  if (state.result?.notes) return [
    `${state.result.notes.map((note) => `${formatNote(note.pitch.note)} (${chordRole(note)})`).join(" → ")} over ${stage.context.chords[stage.chordIndex].symbol}.`,
    `Opening idea: ${shown.source.map((note) => formatNote(note.pitch.note)).join(" → ")}. Pitches changed while the rise–return contour and short–short–long cue remained.`,
  ];
  if (state.result?.note) return [`${formatNote(state.result.note.pitch.note)} is ${chordRole(state.result.note)} over ${stage.context.chords[stage.chordIndex].symbol}. The expressive success of the variation is yours to hear.`];
  return [];
}
function annotatedBoard(stage) {
  const ctx = stage.context;
  const active = ctx.boardRange.strings;
  const range = { minFret: ctx.boardRange.minFret, maxFret: ctx.boardRange.maxFret };
  const positions = new Map();
  for (const index of active) for (let fret = range.minFret; fret <= range.maxFret; fret += 1) {
    const selectedSteps = state.selections.flatMap((item, step) => item.stringIndex === index && item.fret === fret ? [step + 1] : []);
    positions.set(`${index}:${fret}`, { stringIndex: index, fret, selectable: isSelect(stage) && !state.revealed &&
      (mode === "motif" || index === material.spec.targets.target.stringIndex), selected: selectedSteps.length > 0,
      states: [], primaryLabel: selectedSteps.length ? selectedSteps.join(",") : "",
      ariaLabel: `${stringLabel(index)}, fret ${fret}${selectedSteps.length ? `, planned step ${selectedSteps.join(" and ")}` : ""}` });
  }
  function mark(location, label, role = "", states = []) {
    const item = positions.get(`${location.position.stringIndex}:${location.position.fret}`);
    if (!item) return;
    item.primaryLabel = label; item.secondaryLabel = role; item.states = [...new Set([...item.states, ...states])];
    item.ariaLabel = `${stringLabel(item.stringIndex)}, fret ${item.fret}, ${label}${role ? `, ${role}` : ""}`;
  }
  if (mode === "melody") {
    if (stage.id === "reinterpret") mark(ctx.samePitch, formatNote(ctx.samePitch.pitch.note), "same pitch", ["source"]);
    if (["trajectory", "approach", "phrase", "improv", "transfer-arrival"].includes(stage.id)) {
      mark(ctx.target, formatNote(ctx.target.pitch.note), "previous target", ["source"]);
    }
    if (stage.id === "improv") mark(ctx.arrival, formatNote(ctx.arrival.pitch.note), "arrival", ["destination"]);
    if (state.revealed && stage.kind === "select") mark(stage.answer, formatNote(stage.answer.pitch.note),
      stage.id === "approach" ? "approach" : chordRole(ctx.at(stage.chordIndex, material.spec.targets.target.stringIndex, stage.answer.position.fret)), ["correct", "destination"]);
    if (state.revealed && stage.id === "phrase") for (const [index, note] of ctx.phrase.entries()) mark(note,
      `${index + 1} ${formatNote(note.pitch.note)}`, index === 1 ? "approach" : index > 1 ? "target" : "opening", ["current"]);
  } else {
    const original = plan.examples.main.source;
    if (["source", "identity", "adapt", "variation-ending", "variation-repeat", "sequence", "fragment", "response", "improv"].includes(stage.id)) {
      const sourceNotes = stage.id === "fragment" ? original.slice(1) : stage.id === "variation-ending" ? original.slice(0, 2) : stage.id === "variation-repeat" ? [original[0], original[2]] : stage.id === "sequence" ? [plan.sequence[0]] : original;
      for (const [index, note] of sourceNotes.entries()) mark(note, formatNote(note.pitch.note), state.revealed && stage.id === "source" ? chordRole(ctx.at(0, note.position.stringIndex, note.position.fret)) : "source", ["source"]);
    }
    if (state.revealed && stage.id === "variation-contour") for (const [index, note] of plan.examples.main.arrival.entries()) mark(note, `${index + 1} ${formatNote(note.pitch.note)}`, "example", ["current"]);
    if (state.revealed && state.result?.notes) for (const [index, note] of state.result.notes.entries()) mark(note, `${index + 1} ${formatNote(note.pitch.note)}`, chordRole(note), ["destination"]);
    if (state.revealed && state.result?.note) mark(state.result.note, formatNote(state.result.note.pitch.note), chordRole(state.result.note), ["destination"]);
    if (state.revealed && state.result?.selected) for (const [index, note] of state.result.selected.entries()) mark(note, `${index + 1} ${formatNote(note.pitch.note)}`, chordRole(note), ["destination"]);
  }
  const path = mode === "melody" && state.revealed && stage.id === "phrase" ? ctx.phrase
    : mode === "melody" && state.revealed && ["trajectory", "transfer-arrival"].includes(stage.id) ? [ctx.target, ctx.arrival]
      : mode === "motif" && state.revealed && state.result?.notes ? state.result.notes
        : mode === "motif" && stage.id === "source" ? plan.examples.main.source
          : mode === "motif" && stage.id === "fragment" ? plan.examples.main.source.slice(1) : [];
  board.update({ strings: strings(), activeStringIndices: active, fretRange: range,
    positions: [...positions.values()], connections: pathConnections(path),
    label: `${mode === "melody" ? "Melodic target" : "Motif"} fretboard; arrow keys move between available positions` });
}
function render() {
  const stage = current();
  $("progress-text").textContent = `${state.index + 1} of ${plan.stages.length}`;
  $("progress-fill").style.width = `${(state.index + 1) * 100 / plan.stages.length}%`;
  $("stage-kicker").textContent = stage.id.replaceAll("-", " ");
  $("stage-title").textContent = stage.title;
  $("prompt").textContent = stage.prompt;
  $("instruction").textContent = stage.instruction;
  $("context").textContent = `${formatNote(stage.context.key.tonic)} ${stage.context.key.mode} · ${stage.context.chords.map(({ symbol }) => symbol).join(" → ")}`;
  $("back").disabled = state.index === 0;
  $("board-panel").hidden = stage.kind === "complete" || mode === "melody" && stage.kind === "play" && stage.id === "harmony";
  if (!$("board-panel").hidden) {
    $("board-context").textContent = state.revealed ? "The fretboard now explains the committed relationship." :
      isSelect(stage) ? "Select the planned fret positions in order. Note and role labels stay hidden until a correct check." :
        "Play on your guitar. The visible notes are the given material, not a scored answer.";
    annotatedBoard(stage);
  } else board.update({ strings: strings(), activeStringIndices: [], fretRange: { minFret: 0, maxFret: 0 }, positions: [], connections: [] });
  $("check").hidden = !isSelect(stage) || state.revealed;
  $("hint").hidden = !isSelect(stage) || state.revealed;
  $("act").hidden = isSelect(stage) || state.revealed || stage.kind === "complete";
  $("act").textContent = stage.kind === "reflect" ? "Keep my impression" : stage.kind === "confirm" ? "I tried the constrained passes" : "I played this on guitar";
  $("next").hidden = !state.revealed || stage.kind === "complete";
  $("reflection-panel").hidden = !(stage.kind === "reflect" || mode === "motif" && stage.id === "response" && state.revealed);
  if (state.revealed) addExplanation(stageLines(stage)); else clearReveal();
  setFeedback(state.feedback, state.feedbackKind);
  if (stage.kind === "complete") {
    const attempts = Object.values(state.evidence).reduce((sum, item) => sum + item.attempts, 0);
    const hints = Object.values(state.evidence).reduce((sum, item) => sum + item.hints, 0);
    addExplanation([`This session: ${attempts} checked attempts, ${hints} hints. Evidence is temporary and does not establish mastery.`, ...stageLines(stage)]);
  }
}
function advance() {
  if (state.index >= plan.stages.length - 1) return;
  state.index += 1; state.selections = []; state.revealed = false; state.result = null;
  state.feedback = ""; state.feedbackKind = ""; state.hints = 0; state.startedAt = Date.now(); state.reflection = null;
  $("reflection").value = ""; render();
}
function resetStep() {
  state.selections = []; state.revealed = false; state.result = null; state.feedback = "";
  state.feedbackKind = ""; state.hints = 0; state.startedAt = Date.now(); state.reflection = null;
  $("reflection").value = ""; render();
}
$("check").addEventListener("click", () => {
  const stage = current();
  if (!state.selections.length) { setFeedback("Select a fret before checking.", "warn"); return; }
  const result = mode === "melody" ? plan.evaluate(stage, state.selections[0].fret)
    : stage.kind === "adapt" ? plan.evaluateAdaptation(stage, state.selections)
      : stage.kind === "transfer" ? plan.evaluateTransfer(state.selections)
        : plan.evaluateSingle(stage, state.selections[0]);
  const evidence = stageEvidence(); evidence.attempts += 1;
  evidence.correct = result.correct;
  evidence.selectedPositions = state.selections.map(({ stringIndex, fret }) => ({ stringIndex, fret }));
  state.result = result; state.revealed = result.correct;
  if (result.correct) evidence.elapsedSeconds = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
  setFeedback(result.message, result.correct ? "good" : "bad"); render();
});
$("hint").addEventListener("click", () => {
  stageEvidence().hints += 1; state.hints += 1;
  setFeedback(state.hints === 1 ? "Sing the destination against the current chord before counting frets." :
    mode === "melody" ? "Use the chord root as your reference; the high E string contains the target in this bounded region." :
      `Keep the original rise–return contour. At a chord change, make the high note the current chord's ${current().upperDegree === 5 ? "5th" : "3rd"}.`, "warn");
});
$("act").addEventListener("click", () => {
  const stage = current();
  if (stage.kind === "reflect" && !$("reflection").value) { setFeedback("Choose an impression before continuing. It is not scored.", "warn"); return; }
  state.reflection = stage.kind === "reflect" ? $("reflection").value : null;
  if (state.reflection) stageEvidence().reflection = state.reflection;
  state.revealed = true;
  stageEvidence().elapsedSeconds = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
  setFeedback(stage.kind === "reflect" ? "Your impression is recorded in memory only; no response is graded." :
    "Your physical playing is self-confirmed; the app did not listen or score it.", "good"); render();
});
$("next").addEventListener("click", () => {
  if (mode === "motif" && current().id === "response" && !$("reflection").value) {
    setFeedback("Describe whether your response felt connected before continuing. This is not graded.", "warn"); return;
  }
  if (mode === "motif" && current().id === "response") {
    state.reflection = $("reflection").value;
    stageEvidence().reflection = state.reflection;
  }
  advance();
});
$("back").addEventListener("click", () => { if (state.index > 0) { state.index -= 1; resetStep(); } });
$("replay").addEventListener("click", resetStep);
$("restart").addEventListener("click", () => { reset(); $("reflection").value = ""; render(); });
render();
