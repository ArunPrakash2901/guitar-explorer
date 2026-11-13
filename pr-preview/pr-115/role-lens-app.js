import { STANDARD_FRETBOARD, formatNote, musicQueries } from "./engine/index.js?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";
import { createFretboard } from "./fretboard-view.mjs?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";
import { createRoleLensMaterial } from "./role-lens-material.mjs?ge-revision=8615044429dcaddc9dd105f438796048a7317c34";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const material = createRoleLensMaterial({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  analyseNotes: (request) => unwrap(musicQueries.analyseNotes(request)),
  findLocations: ({ key, chord, pitch }) => {
    const [analysis] = unwrap(musicQueries.analyseNotes({ notes: [pitch], context: { key } }));
    return unwrap(musicQueries.getFretboardLocations({
      board: STANDARD_FRETBOARD,
      fretRange: { minFret: 0, maxFret: 12 },
      pitchClasses: [analysis.pitchClass],
      context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
    }));
  },
  formatNote,
});

const state = {
  stage: "hear",
  mainPredictions: {},
  mainEnding: null,
  transferPredictions: {},
  transferEnding: null,
  reflection: null,
};

const predictionChoices = [
  { value: "tone", label: "Chord tone" },
  { value: "outside", label: "Not a chord tone" },
  { value: "unsure", label: "Not sure yet" },
];
const reflectionChoices = [
  { value: "heard", label: "I heard the role change more clearly" },
  { value: "found", label: "I found the anchor more deliberately" },
  { value: "created", label: "I made an intentional phrase ending" },
  { value: "again", label: "I need another careful pass" },
];

let anchorBoard;

function keyName(context) { return `${formatNote(context.key.tonic)} ${context.key.mode}`; }
function currentStep() {
  if (state.stage === "hear") return "hear";
  if (["predict", "reveal"].includes(state.stage)) return "role";
  if (["use", "variation"].includes(state.stage)) return "use";
  if (state.stage.startsWith("transfer")) return "transfer";
  return "reflect";
}
function updateSteps() {
  const step = currentStep();
  for (const node of $("role-steps").children) node.className = node.dataset.step === step ? "active" : "";
}
function setButton(id, { text = "", hidden = false, disabled = false } = {}) {
  const button = $(id);
  button.textContent = text;
  button.hidden = hidden;
  button.disabled = disabled;
}
function showOnly(id) {
  for (const panelId of ["hear-panel", "predict-panel", "reveal-panel", "use-panel", "variation-panel", "transfer-panel", "reflection-panel"]) {
    $(panelId).hidden = panelId !== id;
  }
}
function setFeedback(text) { $("feedback").textContent = text; }
function choiceLabel(value) { return predictionChoices.find((choice) => choice.value === value)?.label ?? "No choice"; }

function physicalStrings() {
  return STANDARD_FRETBOARD.tuning.openStrings.map(({ note }, index) => ({
    index,
    label: `${6 - index} · ${index === 5 ? "high " : index === 0 ? "low " : ""}${formatNote(note)}`,
  })).reverse();
}
function stringName(index) {
  return `${6 - index} string`;
}
function anchorBoardModel(context) {
  const positions = context.anchor.locations.map((location) => ({
    ...location.position,
    states: ["destination"],
    primaryLabel: context.anchor.name,
    ariaLabel: `${context.anchor.name}, ${stringName(location.position.stringIndex)}, fret ${location.position.fret}`,
  }));
  return {
    strings: physicalStrings(),
    activeStringIndices: [...new Set(positions.map(({ stringIndex }) => stringIndex))],
    fretRange: { minFret: 0, maxFret: 8 },
    positions,
    connections: [],
    label: `${context.anchor.name} locations used by Role Lens in ${keyName(context)}`,
  };
}
function locationSummary(context) {
  return context.anchor.locations
    .map(({ position }) => `${stringName(position.stringIndex)}, fret ${position.fret}`)
    .join(" · ");
}

function chordCard(chord, anchorName, index) {
  const card = document.createElement("div");
  card.className = "chord-card";
  const step = document.createElement("span");
  step.textContent = `Comparison ${index + 1}`;
  const symbol = document.createElement("strong");
  symbol.textContent = chord.symbol;
  const anchor = document.createElement("b");
  anchor.textContent = `then ${anchorName}`;
  card.append(step, symbol, anchor);
  return card;
}
function renderChordSequence(container, context) {
  container.replaceChildren(...context.chords.map((chord, index) => chordCard(chord, context.anchor.name, index)));
}

function renderPredictionRows(container, context, selections, onChoose) {
  const rows = context.chords.map((chord, index) => {
    const row = document.createElement("div");
    row.className = "prediction-row";
    const symbol = document.createElement("strong");
    symbol.textContent = `${chord.symbol} + ${context.anchor.name}`;
    const group = document.createElement("div");
    group.className = "role-choice-group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `${context.anchor.name} over ${chord.symbol}`);
    for (const choice of predictionChoices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "role-choice";
      button.dataset.chordIndex = String(index);
      button.dataset.value = choice.value;
      button.textContent = choice.label;
      button.setAttribute("aria-pressed", String(selections[index] === choice.value));
      button.addEventListener("click", () => onChoose(index, choice.value));
      group.append(button);
    }
    row.append(symbol, group);
    return row;
  });
  container.replaceChildren(...rows);
}

function factRows(context, selections) {
  return context.chords.map((chord, index) => {
    const analysis = context.anchor.analyses[index];
    const relation = analysis.chordRelation;
    const row = document.createElement("div");
    row.className = "fact-row";
    const symbol = document.createElement("strong");
    symbol.textContent = `${context.anchor.name} over ${chord.symbol}`;
    const copy = document.createElement("div");
    copy.className = "fact-copy";
    const predicted = document.createElement("span");
    predicted.textContent = `You chose: ${choiceLabel(selections[index])}`;
    const fact = document.createElement("b");
    fact.textContent = `${relation.interval.label} · ${relation.isChordTone ? "chord tone" : "non-chord tone"}`;
    const note = document.createElement("em");
    note.textContent = relation.isChordTone ? "The pitch belongs to this chord." : "The pitch stays the same while the chord changes underneath it.";
    copy.append(predicted, fact, note);
    row.append(symbol, copy);
    return row;
  });
}

function renderEndingOptions(container, context, selected, onChoose) {
  const buttons = context.endings.map((ending) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ending-option";
    button.dataset.value = ending.name;
    button.setAttribute("aria-pressed", String(selected === ending.name));
    const name = document.createElement("strong");
    name.textContent = ending.name;
    const relation = document.createElement("span");
    relation.textContent = `${ending.interval} of ${context.chords[2].symbol}`;
    button.append(name, relation);
    button.addEventListener("click", () => onChoose(ending.name));
    return button;
  });
  container.replaceChildren(...buttons);
}
function selectedEnding(context, name) { return context.endings.find((ending) => ending.name === name) ?? null; }

function renderHear() {
  const context = material.context;
  showOnly("hear-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · same physical pitch`;
  $("stage-title").textContent = "Keep one pitch fixed while the chords move";
  $("stage-lead").textContent = `Hear ${context.anchor.name} against three supplied chords before asking what it is called.`;
  renderChordSequence($("hear-sequence"), context);
  $("anchor-instruction").textContent = `Use the same ${context.anchor.name} each time.`;
  setFeedback("Do not chase a scale shape. Compare the consequence of one unchanged pitch.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "I compared all three" });
}

function renderPredict() {
  const context = material.context;
  showOnly("predict-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · committed role guess`;
  $("stage-title").textContent = "What changed if the pitch did not?";
  $("stage-lead").textContent = "Make one small theoretical prediction for each chord. No exact interval label is visible yet.";
  renderPredictionRows($("role-predictions"), context, state.mainPredictions, (index, value) => {
    state.mainPredictions[index] = value;
    render();
  });
  const complete = context.chords.every((_, index) => state.mainPredictions[index]);
  setFeedback(complete ? "All three guesses are selected. Commit them before opening the engine facts." : "Select one response for every chord. 'Not sure yet' is a valid committed observation.");
  setButton("secondary-action", { text: "Hear the three again", hidden: false });
  setButton("primary-action", { text: "Commit all three", disabled: !complete });
}

function renderReveal() {
  const context = material.context;
  showOnly("reveal-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · engine-derived roles`;
  $("stage-title").textContent = "Now name what your ear compared";
  $("stage-lead").textContent = "The engine describes the objective chord relationship after your committed attempt.";
  $("role-facts").replaceChildren(...factRows(context, state.mainPredictions));
  anchorBoard ??= createFretboard($("anchor-board"));
  anchorBoard.update(anchorBoardModel(context));
  $("location-note").textContent = `Search first, then compare the two registered locations for ${context.anchor.name}: ${locationSummary(context)}.`;
  setFeedback("This reveal names the relationship; it does not grade whether you heard it well.");
  setButton("secondary-action", { text: "Hear the comparison again", hidden: false });
  setButton("primary-action", { text: "Use the same material" });
}

function renderUse() {
  const context = material.context;
  showOnly("use-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · deliberate ending`;
  $("stage-title").textContent = "Stop identifying. Make a tiny musical decision.";
  $("stage-lead").textContent = `Keep ${context.anchor.name} as your anchor somewhere in a two- or three-note idea, then choose where to land when ${context.chords[2].symbol} arrives.`;
  $("use-instruction").textContent = `Play over ${context.chords.map(({ symbol }) => symbol).join(" → ")}. Ordering and repetition are yours. The ending is the one declared constraint.`;
  renderEndingOptions($("ending-options"), context, state.mainEnding, (name) => {
    state.mainEnding = name;
    render();
  });
  const ending = selectedEnding(context, state.mainEnding);
  $("ending-detail").hidden = !ending;
  if (ending) {
    $("ending-detail").textContent = `${ending.name} is ${ending.interval} of ${context.chords[2].symbol}. Play your phrase and make that ending intentional, not automatic.`;
  }
  setFeedback(ending ? "Your ending is declared. The app does not choose the rhythm, expression or exact route for you." : "Choose any supplied final chord tone. These are musical options, not right/wrong answers.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "I played my phrase", disabled: !ending });
}

function renderVariation() {
  const context = material.context;
  const ending = selectedEnding(context, state.mainEnding);
  showOnly("variation-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · same constraint, new phrase`;
  $("stage-title").textContent = "Change the phrase without losing the decision";
  $("stage-lead").textContent = "This is a second act of creation, not another identification question.";
  $("variation-instruction").textContent = `Play another tiny idea. Keep ${context.anchor.name} available as the anchor and still land on ${ending.name} when ${context.chords[2].symbol} arrives.`;
  $("variation-keep").textContent = `${context.anchor.name} anchor + ${ending.name} ending`;
  setFeedback("If the second phrase changes only because the screen told you what to press, the experiment has failed. Make a real musical variation.");
  setButton("secondary-action", { text: "Choose another ending", hidden: false });
  setButton("primary-action", { text: "I varied it deliberately" });
}

function makeTransferSection(title, body) {
  const section = document.createElement("div");
  section.className = "transfer-copy";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = body;
  section.append(heading, paragraph);
  return section;
}

function renderTransferHear() {
  const context = material.transfer;
  showOnly("transfer-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · fresh surface`;
  $("stage-title").textContent = "Reconstruct the relationship in A major";
  $("stage-lead").textContent = "Do not copy the old fret shape. Find the new anchor and repeat the listening comparison.";
  const section = makeTransferSection("Hear first", `Use the same ${context.anchor.name} against all three chords. Try to find it on a different string or position from the place you used for C4.`);
  const sequence = document.createElement("div");
  sequence.className = "chord-sequence";
  renderChordSequence(sequence, context);
  section.append(sequence);
  $("transfer-content").replaceChildren(section);
  setFeedback("The note names changed; the relationship pattern has not been revealed yet.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "I compared the transfer" });
}

function renderTransferPredict() {
  const context = material.transfer;
  showOnly("transfer-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · fresh role guess`;
  $("stage-title").textContent = "Predict again without copying the old labels";
  $("stage-lead").textContent = "Commit whether the new anchor belongs to each chord before revealing the exact intervals.";
  const section = makeTransferSection("Transfer prediction", "Use what you heard, not a memorized G-major answer table.");
  const rows = document.createElement("div");
  rows.className = "role-predictions";
  renderPredictionRows(rows, context, state.transferPredictions, (index, value) => {
    state.transferPredictions[index] = value;
    render();
  });
  section.append(rows);
  $("transfer-content").replaceChildren(section);
  const complete = context.chords.every((_, index) => state.transferPredictions[index]);
  setFeedback(complete ? "The transfer guesses are ready to commit." : "Choose one response for all three transfer chords.");
  setButton("secondary-action", { text: "Hear the transfer again", hidden: false });
  setButton("primary-action", { text: "Commit transfer guesses", disabled: !complete });
}

function renderTransferReveal() {
  const context = material.transfer;
  showOnly("transfer-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · reconstructed roles`;
  $("stage-title").textContent = "Check whether the relationship survived the key change";
  $("stage-lead").textContent = "The same role pattern appears under new note and chord names.";
  const section = makeTransferSection("Engine facts after your attempt", `Registered ${context.anchor.name} locations: ${locationSummary(context)}. Reconstruct one rather than copying C4's physical place.`);
  const facts = document.createElement("div");
  facts.className = "role-facts transfer-facts";
  facts.append(...factRows(context, state.transferPredictions));
  const board = document.createElement("div");
  board.className = "board-slot role-board";
  section.append(facts, board);
  $("transfer-content").replaceChildren(section);
  createFretboard(board).update(anchorBoardModel(context));
  setFeedback("The engine validates these relationships. Your ear and physical reconstruction remain the learning evidence.");
  setButton("secondary-action", { text: "Hear the transfer again", hidden: false });
  setButton("primary-action", { text: "Make a fresh A-major ending" });
}

function renderTransferCreate() {
  const context = material.transfer;
  showOnly("transfer-panel");
  $("key-label").textContent = keyName(context);
  $("context-label").textContent = `${context.anchor.name} · fresh phrase choice`;
  $("stage-title").textContent = "Use the transferred material, not the old fingering";
  $("stage-lead").textContent = `Make another two- or three-note idea over ${context.chords.map(({ symbol }) => symbol).join(" → ")}. Keep ${context.anchor.name} available and choose a deliberate final chord tone.`;
  const section = makeTransferSection("Choose the new ending", `Find ${context.anchor.name} on a different string/position where practical, then let the phrase land deliberately on ${context.chords[2].symbol}.`);
  const endings = document.createElement("div");
  endings.className = "ending-options";
  renderEndingOptions(endings, context, state.transferEnding, (name) => {
    state.transferEnding = name;
    render();
  });
  section.append(endings);
  const ending = selectedEnding(context, state.transferEnding);
  if (ending) {
    const detail = document.createElement("div");
    detail.className = "instruction-card";
    detail.textContent = `${ending.name} is ${ending.interval} of ${context.chords[2].symbol}. Play a fresh route to it; do not transpose finger motions mechanically.`;
    section.append(detail);
  }
  $("transfer-content").replaceChildren(section);
  setFeedback(ending ? "The relationship transferred. The phrase itself is still your musical decision." : "Choose a new final chord tone before playing the transfer phrase.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "I played the transfer phrase", disabled: !ending });
}

function renderReflect() {
  showOnly("reflection-panel");
  $("key-label").textContent = "G major → A major";
  $("context-label").textContent = "Role Lens · reflection";
  $("stage-title").textContent = "Did one material actually become different musical work?";
  $("stage-lead").textContent = "Report what changed after hearing roles, making a phrase decision and reconstructing the relationship in a new key.";
  const buttons = reflectionChoices.map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reflection-option";
    button.dataset.value = choice.value;
    button.textContent = choice.label;
    button.setAttribute("aria-pressed", String(state.reflection === choice.value));
    button.addEventListener("click", () => {
      state.reflection = choice.value;
      render();
    });
    return button;
  });
  $("reflection-options").replaceChildren(...buttons);
  setFeedback(state.reflection ? "Your observation is selected. It is descriptive evidence, not a score." : "Choose the closest description, including another pass if the relationship is still unclear.");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "Finish Role Lens", disabled: !state.reflection });
}

function renderComplete() {
  showOnly("reflection-panel");
  $("key-label").textContent = "G major → A major";
  $("context-label").textContent = "Role Lens · complete";
  $("stage-title").textContent = "The proof is complete; mastery is not claimed";
  $("stage-lead").textContent = "You used the same material first to notice a changing role and then to create a deliberate phrase ending, before reconstructing it in a new key.";
  $("reflection-heading").textContent = "Keep the evidence small";
  $("reflection-options").replaceChildren();
  setFeedback("The next decision belongs to physical review: did these feel like genuinely different useful learner actions?");
  setButton("secondary-action", { hidden: true });
  setButton("primary-action", { text: "Return to Instrument Desk" });
}

function render() {
  updateSteps();
  if (state.stage === "hear") renderHear();
  else if (state.stage === "predict") renderPredict();
  else if (state.stage === "reveal") renderReveal();
  else if (state.stage === "use") renderUse();
  else if (state.stage === "variation") renderVariation();
  else if (state.stage === "transfer-hear") renderTransferHear();
  else if (state.stage === "transfer-predict") renderTransferPredict();
  else if (state.stage === "transfer-reveal") renderTransferReveal();
  else if (state.stage === "transfer-create") renderTransferCreate();
  else if (state.stage === "reflect") renderReflect();
  else renderComplete();
}

$("secondary-action").addEventListener("click", () => {
  if (state.stage === "predict" || state.stage === "reveal") state.stage = "hear";
  else if (state.stage === "variation") state.stage = "use";
  else if (["transfer-predict", "transfer-reveal"].includes(state.stage)) state.stage = "transfer-hear";
  render();
});

$("primary-action").addEventListener("click", () => {
  if (state.stage === "hear") state.stage = "predict";
  else if (state.stage === "predict") state.stage = "reveal";
  else if (state.stage === "reveal") state.stage = "use";
  else if (state.stage === "use") state.stage = "variation";
  else if (state.stage === "variation") state.stage = "transfer-hear";
  else if (state.stage === "transfer-hear") state.stage = "transfer-predict";
  else if (state.stage === "transfer-predict") state.stage = "transfer-reveal";
  else if (state.stage === "transfer-reveal") state.stage = "transfer-create";
  else if (state.stage === "transfer-create") state.stage = "reflect";
  else if (state.stage === "reflect") state.stage = "complete";
  else if (typeof location !== "undefined") location.href = "/product-spine.html";
  render();
});

render();
