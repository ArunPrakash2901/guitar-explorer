import { STANDARD_FRETBOARD, formatNote, formatPitch, musicQueries } from "/engine/index.js";
import { createHarmonyPlan, matchesPlannedPosition } from "/harmony-session.mjs";

const $ = (id) => document.getElementById(id);
function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
const catalog = unwrap(musicQueries.getChordCatalog({})).flatMap(({ chords }) => chords);
const plan = createHarmonyPlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex], pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
});
const roleNames = { 1: "root", 3: "third", 5: "fifth", 7: "seventh" };
const state = {};
let fretButtons = [];
function reset() {
  Object.assign(state, {
    stageIndex: 0, lessonIndex: null, roleIndex: 1, earned: [], selected: null,
    solved: false, hinted: false, qualityChoice: "", degreeChoice: "", romanChoice: "",
    reflectionChoice: "", reflection: null,
  });
  for (const input of document.querySelectorAll('input[name="reflection"]')) input.checked = false;
  render();
  $("stage-title").focus();
}
function stage() { return plan.stages[state.stageIndex]; }
function lesson() { return plan.lessons[stage().lessonIndex]; }
function keyName(key) { return `${formatNote(key.tonic)} ${key.mode}`; }
function qualityName(chordId) { return catalog.find(({ id }) => id === chordId).displayName; }
function chordName(chord) { return `${formatNote(chord.root)} ${qualityName(chord.chordId).toLowerCase()}`; }
function feedback(text, kind = "") {
  $("feedback").textContent = text;
  $("feedback").className = kind;
}
function showIdentity(key, entry, physicalLesson = null) {
  const rows = [
    ["Key", keyName(key)], ["Scale degree", String(entry.degree)],
    ["Chord", chordName(entry.chord)],
    ["Spelled tones", entry.chord.tones.map(({ note }) => formatNote(note)).join(" · ")],
    ["Roman identity", entry.romanNumeral.label],
  ];
  if (physicalLesson) {
    const anchor = physicalLesson.tasks[0].plannedLocation.pitch;
    rows.push(["Played intervals", physicalLesson.tasks.map(({ tone, plannedLocation }) => {
      const interval = unwrap(musicQueries.getInterval({ from: anchor, to: plannedLocation.pitch }));
      return `${roleNames[tone.degree]}: ${formatPitch(plannedLocation.pitch)} (${interval.label} from ${formatPitch(anchor)})`;
    }).join(" · ")]);
  }
  const nodes = [];
  for (const [label, value] of rows) {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    nodes.push(dt, dd);
  }
  $("theory-rows").replaceChildren(...nodes);
  $("theory").hidden = false;
}
function option(value, label) {
  const el = document.createElement("option"); el.value = String(value); el.textContent = label; return el;
}
function renderBoard(currentLesson) {
  fretButtons = [];
  const head = document.createElement("tr");
  const corner = document.createElement("th"); corner.textContent = "String"; head.append(corner);
  const row = document.createElement("tr");
  const label = document.createElement("th"); label.scope = "row";
  label.textContent = `${6 - currentLesson.stringIndex} · ${formatPitch(STANDARD_FRETBOARD.tuning.openStrings[currentLesson.stringIndex])}`;
  row.append(label);
  for (let fret = currentLesson.fretWindow.minFret; fret <= currentLesson.fretWindow.maxFret; fret += 1) {
    const th = document.createElement("th"); th.scope = "col"; th.textContent = String(fret); head.append(th);
    const cell = document.createElement("td");
    const button = document.createElement("button");
    const position = { stringIndex: currentLesson.stringIndex, fret };
    const earned = state.earned.find(({ plannedLocation }) => plannedLocation.position.fret === fret);
    button.type = "button"; button.className = earned ? "fret earned" : "fret";
    button.dataset.fret = String(fret);
    button.textContent = earned ? formatNote(earned.tone.note) : "·";
    button.setAttribute("aria-label", `String ${6 - currentLesson.stringIndex}, fret ${fret}${earned ? `, established ${formatNote(earned.tone.note)}` : ""}`);
    button.setAttribute("aria-pressed", "false");
    button.disabled = state.solved;
    button.addEventListener("click", () => {
      if (state.solved) return;
      state.selected = position;
      for (const other of fretButtons) other.setAttribute("aria-pressed", String(other === button));
      feedback(`Committed string ${6 - position.stringIndex}, fret ${fret}. The app will check this position, not whether it was played.`);
    });
    fretButtons.push(button); cell.append(button); row.append(cell);
  }
  const thead = document.createElement("thead"); thead.append(head);
  const tbody = document.createElement("tbody"); tbody.append(row);
  $("board").replaceChildren(thead, tbody);
  $("board-panel").hidden = false;
}

function render() {
  const current = stage();
  $("progress").textContent = `Step ${state.stageIndex + 1} of ${plan.stages.length}`;
  for (const id of ["board-panel", "quality-panel", "reverse-panel", "reflection", "theory", "check", "hint", "continue", "restart"]) $(id).hidden = true;
  $("theory-rows").replaceChildren();
  $("context").textContent = "Structural identity, not harmonic function";
  $("check").textContent = "Check commitment";
  $("continue").textContent = "Continue";

  if (current.kind === "orient") {
    $("stage-title").textContent = "Establish the key before naming its chords";
    $("context").textContent = "C major · physical guitar first";
    $("prompt").textContent = "Play C, or a C-major chord or arpeggio you already know. Keep C as the key reference. Next, predict a scale degree before looking for its fret.";
    $("instruction").textContent = "For chord construction, take every other note of the key's scale. Play the notes sequentially on one string; no new shape or fingering is required.";
    feedback("Sound the reference on your guitar, then continue. The software cannot verify the performance.");
    $("continue").hidden = false;
    return;
  }
  if (["root", "stack", "quality"].includes(current.kind)) {
    const item = lesson();
    $("context").textContent = `${keyName(item.key)} · degree ${item.entry.degree} · ${item.chordSize}`;
    $("stage-title").textContent = current.kind === "root" ? item.title
      : current.kind === "stack" ? "Build the stack from key notes" : "Name the quality before the Roman label";
    if (current.kind === "root") {
      $("prompt").textContent = `In ${keyName(item.key)}, predict scale degree ${item.entry.degree}. Sing or audiate that pitch, find and play it on string ${6 - item.stringIndex}, then commit its fret.`;
      $("instruction").textContent = current.lessonIndex === 2
        ? "First establish the new key on your guitar. Keep the same degree relationship; the chord root must be found again."
        : "The blank window contains the target. No chord name or Roman answer is shown before your commitment.";
      renderBoard(item);
      $("check").hidden = state.solved; $("hint").hidden = state.solved;
      if (state.solved) {
        feedback(`${formatNote(item.entry.chord.root)} is degree ${item.entry.degree} of ${keyName(item.key)}. Now build its chord from the key's notes.`, "good");
        $("continue").hidden = false;
      } else feedback("Predict → play → commit → check. A deliberate hint is available if you are stuck.");
    }
    if (current.kind === "stack") {
      const task = item.tasks[state.roleIndex];
      $("prompt").textContent = state.solved
        ? "The complete stack is established. Play or arpeggiate these notes together in sequence before naming the quality."
        : `From your established root, construct the chord's ${roleNames[task.tone.degree]} using only notes of ${keyName(item.key)}. Predict and play it on the same string, moving upward in pitch, then commit.`;
      $("instruction").textContent = `Established: ${state.earned.map(({ plannedLocation }) => formatPitch(plannedLocation.pitch)).join(" → ")}. Each new note must be higher than the previous one. Take every other scale note; do not select a memorized chord shape.`;
      renderBoard(item);
      $("check").hidden = state.solved; $("hint").hidden = state.solved;
      if (state.solved) { feedback("Committed notes match the complete engine-derived chord. Your guitar supplies the sound.", "good"); $("continue").hidden = false; }
      else feedback("Add one note at a time. Quality and Roman identity stay hidden until the stack is complete and you identify the quality.");
    }
    if (current.kind === "quality") {
      $("prompt").textContent = "Play the completed chord again, using the notes you just established or any shape you already know. Which chord quality did the scale produce?";
      $("instruction").textContent = `Your committed notes: ${item.entry.chord.tones.map(({ note }) => formatNote(note)).join(" · ")}. Predict the Roman label aloud before checking the quality.`;
      const ids = item.chordSize === "triad" ? ["major", "minor", "diminished", "augmented"]
        : ["major7", "dominant7", "minor7", "halfDiminished7"];
      $("quality").replaceChildren(option("", "Choose a quality"), ...ids.map((id) => option(id, qualityName(id))));
      $("quality").value = state.qualityChoice; $("quality").disabled = state.solved;
      $("quality-panel").hidden = false; $("check").hidden = state.solved;
      if (state.solved) { showIdentity(item.key, item.entry, item); feedback("The Roman label names this chord's degree and quality in the stated key. No harmonic function is being inferred.", "good"); $("continue").hidden = false; }
      else feedback("Identify the quality first. The complete key → degree → chord → Roman connection follows your check.");
    }
    return;
  }
  if (current.kind === "reverse") {
    const item = plan.reverse;
    $("stage-title").textContent = "Reverse the connection";
    $("context").textContent = keyName(item.key);
    $("prompt").textContent = `Play or arpeggiate ${chordName(item.entry.chord)}. In ${keyName(item.key)}, which degree is its root, and what is its Roman identity?`;
    $("instruction").textContent = "Work backward from a known chord. Say the two answers before selecting them; the app checks identity, not the shape you played.";
    $("reverse-degree").replaceChildren(option("", "Choose a degree"), ...Array.from({ length: 7 }, (_, i) => option(i + 1, String(i + 1))));
    $("reverse-roman").replaceChildren(option("", "Choose a Roman label"), ...item.romanChoices.map((label) => option(label, label)));
    $("reverse-degree").value = state.degreeChoice; $("reverse-roman").value = state.romanChoice;
    $("reverse-degree").disabled = state.solved; $("reverse-roman").disabled = state.solved;
    $("reverse-panel").hidden = false; $("check").hidden = state.solved;
    if (state.solved) { showIdentity(item.key, item.entry); feedback("The same identity works in both directions: degree to chord and chord to degree.", "good"); $("continue").hidden = false; }
    else feedback("Both the root degree and Roman label must agree with the stated key.");
    return;
  }
  if (current.kind === "reflect") {
    $("stage-title").textContent = "Reflect on the connection";
    $("prompt").textContent = "Which link needed the most conscious calculation, or was there no clear breakdown?";
    $("instruction").textContent = "This choice stays only on the current page. It is not a mastery assessment.";
    $("reflection").hidden = false;
    for (const input of document.querySelectorAll('input[name="reflection"]')) input.checked = input.value === state.reflectionChoice;
    $("check").textContent = "Record reflection"; $("check").hidden = state.solved;
    $("continue").hidden = !state.solved; $("continue").textContent = "Finish this proof";
    feedback(state.solved ? "Reflection recorded only for this page. No history or score was stored." : "Choose the connection that was slowest, or no clear breakdown.", state.solved ? "good" : "");
    return;
  }
  $("stage-title").textContent = "Harmony proof complete";
  $("prompt").textContent = "You connected a stated key to a scale degree, constructed its chord, named its quality and inspected its Roman identity.";
  $("instruction").textContent = "The next useful question is whether you can reconstruct another degree on your guitar without the screen naming the answer. This page makes no claim about performance quality or lasting mastery.";
  feedback("Stop here or restart with fresh controls. No progression, cadence or functional classification was added.");
  $("restart").hidden = false;
}

function check() {
  const current = stage();
  if (state.solved) return;
  if (current.kind === "root" || current.kind === "stack") {
    const item = lesson();
    const task = item.tasks[current.kind === "root" ? 0 : state.roleIndex];
    if (!state.selected) { feedback("Play first, then select the fret you used.", "warn"); return; }
    if (!matchesPlannedPosition(task, state.selected)) {
      const location = unwrap(musicQueries.getNoteAtFret({ position: state.selected, context: { key: item.key } }));
      feedback(`Committed ${location.name}. It does not match the requested ${current.kind === "root" ? "key degree" : "chord role"} in this ascending stack. Return to the key reference, predict again, and repair the note.`, "bad");
      return;
    }
    state.earned.push(task); state.selected = null;
    if (current.kind === "root") state.solved = true;
    else { state.roleIndex += 1; state.solved = state.roleIndex === item.tasks.length; }
    render();
    if (state.solved) $("continue").focus(); else $("stage-title").focus();
    return;
  }
  if (current.kind === "quality") {
    state.qualityChoice = $("quality").value;
    if (!state.qualityChoice) { feedback("Choose a quality after playing the stack.", "warn"); return; }
    if (state.qualityChoice !== lesson().entry.chord.chordId) { feedback("That quality does not match the chord derived from this key. Replay your root, third and remaining tones, compare their distances, then try again.", "bad"); return; }
  } else if (current.kind === "reverse") {
    state.degreeChoice = $("reverse-degree").value; state.romanChoice = $("reverse-roman").value;
    if (!state.degreeChoice || !state.romanChoice) { feedback("Choose both the root degree and Roman label.", "warn"); return; }
    if (Number(state.degreeChoice) !== plan.reverse.entry.degree || state.romanChoice !== plan.reverse.entry.romanNumeral.label) { feedback("Those two identities do not both match the chord in the stated key. Return to the key reference and count the chord root's degree.", "bad"); return; }
  } else if (current.kind === "reflect") {
    const selected = document.querySelector('input[name="reflection"]:checked');
    if (!selected) { feedback("Choose a connection, including no clear breakdown if appropriate.", "warn"); return; }
    state.reflectionChoice = selected.value; state.reflection = selected.value;
  } else return;
  state.solved = true; render(); $("continue").focus();
}

$("check").addEventListener("click", check);
$("hint").addEventListener("click", () => {
  if (state.solved || !["root", "stack"].includes(stage().kind)) return;
  const task = lesson().tasks[stage().kind === "root" ? 0 : state.roleIndex];
  state.hinted = true;
  feedback(`Assisted note-name reveal: ${formatNote(task.tone.note)}. Form the sound, then find and play it yourself. The fret remains hidden.`, "warn");
});
$("continue").addEventListener("click", () => {
  if (stage().kind !== "orient" && !state.solved) return;
  if (state.stageIndex >= plan.stages.length - 1) return;
  state.stageIndex += 1; state.selected = null; state.solved = false; state.hinted = false;
  state.qualityChoice = ""; state.degreeChoice = ""; state.romanChoice = "";
  if (stage().kind === "root") { state.lessonIndex = stage().lessonIndex; state.roleIndex = 1; state.earned = []; }
  render(); $("stage-title").focus();
});
for (const input of document.querySelectorAll('input[name="reflection"]')) input.addEventListener("change", () => {
  state.reflectionChoice = input.value; state.reflection = null; state.solved = false;
  $("continue").hidden = true; $("check").hidden = false;
  feedback("Record the current reflection before finishing.");
});
$("restart").addEventListener("click", reset);
reset();
