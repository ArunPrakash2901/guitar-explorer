import { musicQueries, formatNote } from "./engine/index.js";
import { createFretboard } from "./fretboard-view.mjs";
import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs";
import { createSampledGuitar } from "./sampled-guitar.mjs";
import { composeIntervalSession } from "./practice-material.mjs";
import { beginSession, advanceSession, intervalBoard, intervalCue, stringName } from "./practice-plan.mjs";

const $ = (id) => document.getElementById(id);
const audio = createSampledGuitar();
let session = null;
let view = "home";
let nextSeed = 0;
let audioTicket = 0;
const board = createFretboard($("desk-board"), {
  onSelect(position) {
    if (!session || session.stage !== "find") return;
    session = advanceSession(session, { type: "select", position });
    $("task-feedback").textContent = "";
    render();
  },
});

function stopAudio() {
  audioTicket += 1;
  audio.stop();
  $("audio-status").textContent = "Sound stopped. Take your time on the guitar.";
}

function showHome() {
  stopAudio();
  view = "home";
  render();
  $("home-title").focus();
}

function startPractice() {
  stopAudio();
  try {
    const plan = composeIntervalSession({
      quality: $("practice-focus").value, seed: nextSeed,
      availablePositions: STEEL_SAMPLES, queries: musicQueries,
    });
    nextSeed += 1;
    session = beginSession(plan);
    $("audio-status").textContent = "Play first, or hear the root as a reference.";
    view = "practice";
    $("home-error").textContent = "";
    $("task-feedback").textContent = "";
    render();
    $("task-title").focus();
  } catch {
    $("home-error").textContent = "This practice could not be prepared. Try starting again.";
  }
}

function continuePractice() {
  if (!session || session.stage === "complete") return;
  view = "practice";
  render();
  $("task-title").focus();
}

async function audition(pair) {
  if (view !== "practice" || !session || (pair && session.stage === "find")) return;
  stopAudio();
  const ticket = ++audioTicket;
  const material = session.plan.rounds[session.roundIndex].material;
  $("audio-status").textContent = "Loading recorded acoustic guitar…";
  try {
    const result = await audio.play(intervalCue(material, pair));
    if (ticket !== audioTicket || result.cancelled) return;
    $("audio-status").textContent = "Recorded guitar cue started. Repeat it on your guitar, then leave silence.";
  } catch {
    if (ticket !== audioTicket) return;
    $("audio-status").textContent = "The recorded guitar could not load. Tap Hear to retry, or keep practising on your guitar.";
  }
}

function render() {
  const active = session && session.stage !== "complete";
  $("home-view").hidden = view !== "home";
  $("runtime-view").hidden = view !== "practice";
  $("complete-view").hidden = view !== "complete";
  $("nav-home").setAttribute("aria-current", view === "home" ? "page" : "false");
  $("nav-practice").hidden = !active;
  $("nav-practice").setAttribute("aria-current", view === "practice" ? "page" : "false");
  $("continue-practice").hidden = !active;
  $("continue-note").hidden = !active;
  $("start-practice").classList.toggle("primary", !active);
  $("start-practice").textContent = active ? "Start fresh" : "Start practice";
  if (!session) return;
  if (view === "complete") {
    $("complete-relationship").textContent = session.plan.quality === "major" ? "A major third, carried somewhere new" : "A minor third, carried somewhere new";
    const items = session.plan.rounds.map(({ purpose, material }) => {
      const li = document.createElement("li");
      li.textContent = purpose + ": " + material.root.name + " → " + material.target.name;
      return li;
    });
    $("complete-rounds").replaceChildren(...items);
    return;
  }
  if (view !== "practice") return;
  const round = session.plan.rounds[session.roundIndex];
  const m = round.material;
  const reveal = session.stage === "use";
  const quality = session.plan.quality;
  $("round-label").textContent = "Round " + (session.roundIndex + 1) + " of 3 · " + round.purpose;
  $("session-progress").value = session.roundIndex;
  $("task-title").textContent = reveal ? "Hear it. Make a little music." : "Play " + m.root.name + ". Find its " + quality + " third.";
  $("task-instruction").textContent = reveal
    ? "Compare the two notes on your acoustic guitar. Let them ring clearly, one at a time."
    : round.purpose === "Move"
      ? "The root name is familiar; the register has changed. Rebuild the relationship instead of copying the last shape."
      : round.purpose === "Transfer"
        ? "A new root, the same interval. Search before seeing the answer."
        : "Start with the root below. Try the next note on your guitar before marking its position.";
  $("round-purpose").textContent = round.purpose === "Find" ? "Start from an anchor" : round.purpose === "Move" ? "Keep the interval · change register" : "Keep the interval · change root";
  $("relationship-title").textContent = quality === "major" ? "Root → major third" : "Root → minor third";
  $("root-location").textContent = "Root " + m.root.name + ": " + stringName(m.root.position.stringIndex) + " string, " + (m.root.position.fret === 0 ? "open" : "fret " + m.root.position.fret) + ".";
  $("target-region").textContent = reveal
    ? "Third " + m.target.name + ": " + stringName(m.target.position.stringIndex) + " string, " + (m.target.position.fret === 0 ? "open" : "fret " + m.target.position.fret) + "."
    : "Find the third on the " + stringName(m.target.position.stringIndex) + " string, open through fret 3.";
  board.update(intervalBoard(session));
  $("board-help").textContent = reveal
    ? "Just the strings involved, shown in the same physical order. Play the root and third, then make a phrase."
    : "String 1 is high E; string 6 is low E. Choose with a click, or use Tab and the arrow keys, then Enter.";
  $("find-controls").hidden = reveal;
  $("reveal-controls").hidden = !reveal;
  $("hear-pair").hidden = !reveal;
  $("check-position").disabled = !session.selected;
  $("help-reveal").hidden = session.attempts === 0;
  $("selection-label").textContent = session.selected
    ? "Your screen choice: " + stringName(session.selected.stringIndex) + " string, fret " + session.selected.fret + "."
    : "Play the root, then try a third on your guitar. Mark your choice above.";
  if (reveal) {
    $("support-label").textContent = session.assisted ? "Shown with help · now try it physically" : "Position found · now use it";
    $("reveal-title").textContent = m.root.name + " → " + m.target.name + " · " + m.interval.name;
    $("relationship-explanation").textContent = "These notes are " + m.interval.semitones + " semitones apart. " + formatNote(m.target.pitch.note) + " is also the third of the " + formatNote(m.root.pitch.note) + " " + quality + " chord. Hear the root as your point of return.";
    $("phrase-prompt").textContent = "Play " + m.root.name + " → " + m.target.name + " → " + m.root.name + ". Leave silence. Now use those two notes in your own short phrase: repeat a note, change the rhythm, and finish on the root. Spend a minute exploring.";
    $("played-phrase").checked = session.played;
    $("reflection-home").checked = session.reflection === "home";
    $("reflection-exploring").checked = session.reflection === "exploring";
    $("next-round").disabled = !session.played || !session.reflection;
    $("next-round").textContent = session.roundIndex === 0 ? "Try another register" : session.roundIndex === 1 ? "Transfer to a new root" : "Finish session";
  } else {
    // Remove prior round answers even from the hidden DOM/accessibility surface.
    for (const id of ["support-label", "reveal-title", "relationship-explanation", "phrase-prompt"]) $(id).textContent = "";
  }
}

for (const id of ["brand-home", "nav-home", "pause-practice", "finish-home"]) $(id).addEventListener("click", showHome);
for (const id of ["continue-practice", "nav-practice"]) $(id).addEventListener("click", continuePractice);
for (const id of ["start-practice", "another-session"]) $(id).addEventListener("click", startPractice);
$("hear-root").addEventListener("click", () => audition(false));
$("hear-pair").addEventListener("click", () => audition(true));
$("stop-sound").addEventListener("click", stopAudio);
$("check-position").addEventListener("click", () => {
  session = advanceSession(session, { type: "commit" });
  if (session.stage === "use") {
    stopAudio();
    $("task-feedback").textContent = "";
  } else {
    $("task-feedback").textContent = "That screen position does not match this interval yet. Play the root again and try another position, or reveal with help.";
  }
  render();
  if (session.stage === "use") $("task-title").focus();
});
$("help-reveal").addEventListener("click", () => {
  stopAudio();
  session = advanceSession(session, { type: "help" });
  $("task-feedback").textContent = "";
  render();
  $("task-title").focus();
});
$("played-phrase").addEventListener("change", () => {
  session = advanceSession(session, { type: "played", value: $("played-phrase").checked });
  render();
});
for (const id of ["reflection-home", "reflection-exploring"]) $(id).addEventListener("change", () => {
  session = advanceSession(session, { type: "reflect", value: $(id).value });
  render();
});
$("next-round").addEventListener("click", () => {
  const next = advanceSession(session, { type: "next" });
  if (next === session) return;
  stopAudio();
  session = next;
  view = session.stage === "complete" ? "complete" : "practice";
  $("audio-status").textContent = "Play first, or hear the root as a reference.";
  $("task-feedback").textContent = "";
  render();
  $(view === "complete" ? "complete-title" : "task-title").focus();
});
globalThis.addEventListener("pagehide", stopAudio);
render();
