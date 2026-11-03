import { musicQueries, formatNote } from "/engine/index.js";
import { createFretboard } from "/fretboard-view.mjs";
import { STEEL_SAMPLES } from "/sampled-guitar-manifest.mjs";
import { createSampledGuitar } from "/sampled-guitar.mjs";
import { composeIntervalSession } from "/practice-material.mjs";
import { beginSession, advanceSession, intervalBoard, intervalCue, stringName } from "/practice-plan.mjs";

import { composeRoleSession } from "/role-material.mjs";
import { prepareRolePerformance, roleCue } from "/role-performance.mjs";
import { beginRoleSession, advanceRoleSession } from "/role-plan.mjs";
import { renderRoleTask } from "/role-view.mjs";
import { composeIntervalDepth, composeRoleDepth } from "/practice-depth-material.mjs";
import { beginDepthSession, advanceDepthSession } from "/practice-depth-plan.mjs";
import { prepareDepthPerformance, depthCue } from "/practice-depth-audio.mjs";
import { renderDepthTask } from "/practice-depth-view.mjs";

const $ = (id) => document.getElementById(id);
const audio = createSampledGuitar();
let session = null;
let view = "home";
let nextSeed = 0;
let audioTicket = 0;
let rolePerformances = null;
let depthPerformances = null;
const isRole = () => session?.plan.family === "role-ear";
const isStretch = () => session?.plan.challenge === "stretch";
const board = createFretboard($("desk-board"), {
  onSelect(position) {
    if (!session || session.stage !== "find") return;
    session = isStretch() ? advanceDepthSession(session, { type: "select", position }) : isRole() ? advanceRoleSession(session, { type: "select", position }) : advanceSession(session, { type: "select", position });
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
    const role = $("practice-focus").value === "role";
    const stretch = $("practice-challenge").value === "stretch";
    const plan = stretch ? (role ? composeRoleDepth({ seed: nextSeed, queries: musicQueries, formatNote }) : composeIntervalDepth({ quality: $("practice-focus").value, seed: nextSeed, queries: musicQueries, formatNote }))
      : role ? composeRoleSession({ seed: nextSeed, queries: musicQueries, formatNote }) : composeIntervalSession({
      quality: $("practice-focus").value, seed: nextSeed,
      availablePositions: STEEL_SAMPLES, queries: musicQueries,
    });
    const performances = role && !stretch ? plan.rounds.map(({ material }) => prepareRolePerformance(material, { queries: musicQueries, availablePositions: STEEL_SAMPLES })) : null;
    const depth = stretch ? prepareDepthPerformance(plan, { queries: musicQueries, availablePositions: STEEL_SAMPLES }) : null;
    nextSeed += 1;
    session = stretch ? beginDepthSession(plan) : role ? beginRoleSession(plan) : beginSession(plan);
    rolePerformances = performances;
    depthPerformances = depth;
    $("audio-status").textContent = stretch && role ? "Make a prediction before audition. Unsure is a valid response." : role ? "Hear the chord with its anchor, then keep your impression." : "Play first, or hear the root as a reference.";
    view = "practice";
    $("home-error").textContent = "";
    $("task-feedback").textContent = "";
    $("complete-rounds").replaceChildren();
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
  if (isStretch() && session.stage === "predict") return;
  stopAudio();
  const ticket = ++audioTicket;
  const material = session.plan.rounds[session.roundIndex].material;
  const role = isRole();
  const stretch = isStretch();
  const mode = stretch ? role && session.stage === "use" && !pair ? "depth-backing" : role && session.stage === "hear" ? "depth-hear" : null
    : role ? (session.stage === "hear" ? "context" : session.stage === "reveal" ? "comparisons" : session.stage === "find" || pair ? "anchor" : "backing") : null;
  const cue = stretch ? depthCue(session, depthPerformances[session.roundIndex], pair) : role ? roleCue(material, rolePerformances[session.roundIndex], mode, session.contextIndex) : intervalCue(material, pair);
  $("audio-status").textContent = "Loading recorded acoustic guitar…";
  try {
    const result = await audio.play(cue);
    if (ticket !== audioTicket || result.cancelled) return;
    if (["context", "backing", "depth-hear", "depth-backing"].includes(mode)) {
      session = stretch ? advanceDepthSession(session, { type: "audition" }) : advanceRoleSession(session, { type: "audition" });
      render();
    }
    $("audio-status").textContent = mode === "depth-backing" ? "Sampled harmony started. Play your retrieved pitches over it."
      : mode === "backing"
      ? "Changing chords started. Two strums each; keep playing your same anchor pitch."
      : role ? "Recorded guitar cue started. Listen, then take your time on the guitar." : "Recorded guitar cue started. Repeat it on your guitar, then leave silence.";
  } catch {
    if (ticket !== audioTicket) return;
    $("audio-status").textContent = "The recorded guitar could not load. Tap Hear to retry, or keep practising on your guitar.";
  }
}

function renderHomeFocus() {
  const role = $("practice-focus").value === "role";
  const stretch = $("practice-challenge").value === "stretch";
  $("focus-major-option").textContent = stretch ? "Major intervals & chord tones" : "Major thirds";
  $("focus-minor-option").textContent = stretch ? "Minor intervals & chord tones" : "Minor thirds";
  $("focus-role-option").textContent = stretch ? "Ear & harmonic context" : "One pitch, changing chords";
  $("focus-kicker").textContent = role ? "Ear + context" : "Fretboard + theory";
  $("focus-title").textContent = role ? "Hear a note change roles" : "Get to know your thirds";
  $("home-intro").textContent = role ? "Keep a pitch in your ear while the harmony changes. Then find it on your acoustic guitar and hear the change through your own playing."
    : "Hear it, locate it on your acoustic guitar, then carry it to a new root. A small region. Time to listen.";
  $("focus-description").textContent = role ? "One anchor, three chord contexts. Notice how it feels before the labels appear, then play the same note over changing chords."
    : "Find two notes that belong together. Use them in a phrase, move register, then find the same relationship from a different root.";
  $("session-length").textContent = role ? "2 rounds · about 6–8 minutes · hear, play and transfer" : "3 rounds · about 6–8 minutes · open strings to fret 3";
  for (const [i, title, copy] of role ? [
    [1, "Hear", "Listen and commit your impressions before seeing musical labels."],
    [2, "Play", "Locate the anchor. Keep it fixed while the app changes the chords."],
    [3, "Transfer", "Try another anchor and context order. Listen afresh."],
  ] : [
    [1, "Find", "Start from one root. Search before the answer appears."],
    [2, "Move", "Keep the interval. Play it in a different register."],
    [3, "Transfer", "Change the root. Turn the same relationship into a phrase."],
  ]) {
    $("outline-" + i + "-title").textContent = title;
    $("outline-" + i + "-copy").textContent = copy;
  }
  if (stretch) {
    $("focus-title").textContent = role ? "Predict. Compare. Hear a new context." : "One relationship. Different problems.";
    $("focus-description").textContent = role ? "Predict before sound, compare two pitches over one chord, then carry the comparison into changed harmony."
      : "Find another physical route, read a chord role, then reconstruct a root from its third. Search before the answers appear.";
    $("home-intro").textContent = "Stretch a familiar relationship through a different musical problem. Bring your acoustic guitar; take the time to listen and play.";
    $("session-length").textContent = "3 connected challenges · about 10–15 minutes · open through fret 5";
    for (const [i, title, copy] of role ? [[1, "Predict", "Commit an expectation, then compare it with your hearing."], [2, "Compare", "Keep the chord. Hear two different pitches."], [3, "Transfer", "Keep the pitches. Change their surroundings."]]
      : [[1, "Navigate", "Rebuild the interval using another physical route."], [2, "Read", "Translate a chord role into a note on your guitar."], [3, "Reverse", "Start from the third and reconstruct its root."]]) {
      $("outline-" + i + "-title").textContent = title; $("outline-" + i + "-copy").textContent = copy;
    }
  }
  if (session && session.stage !== "complete") {
    const pausedFocus = isStretch() ? "Stretch " + (isRole() ? "ear practice" : session.plan.quality + " interval practice")
      : isRole() ? "ear practice" : session.plan.quality === "minor" ? "minor thirds" : "major thirds";
    $("continue-practice").textContent = "Continue " + pausedFocus;
    $("continue-note").textContent = "Continue resumes your paused " + pausedFocus + ". Start fresh uses the selected focus and challenge, replacing that session. Reloading starts fresh.";
  }
}

function render() {
  renderHomeFocus();
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
    if (isStretch()) {
      $("complete-title").textContent = "Different questions. Connected music.";
      $("complete-intro").textContent = "You reached the end of three connected musical problems. Repeat a phrase you liked with the screen out of sight.";
      $("complete-relationship").textContent = isRole() ? "Prediction, comparison and a changed context" : "Routes, chord roles and a search in reverse";
      $("complete-next-copy").textContent = "Another Stretch session changes the material and the constraints. Foundation remains available whenever you want a smaller step.";
      $("complete-rounds").replaceChildren(...session.plan.rounds.map(({ purpose, material: m }) => {
        const li = document.createElement("li"); li.textContent = purpose + ": " + (isRole() ? m.anchors.map((n) => n.name).join(" / ") + " over " + [...new Set(m.comparisons.map((c) => c.context.symbol))].join(" → ") : m.root.name + " → " + m.target.name); return li;
      }));
      return;
    }
    $("complete-title").replaceChildren(isRole() ? "One pitch." : "One relationship.", document.createElement("br"), isRole() ? "Different roles." : "More than one place.");
    $("complete-intro").textContent = isRole()
      ? "You compared two anchors against changing harmony, then put the comparison on your guitar. Keep noticing how the same pitch feels in different surroundings."
      : "You reached the end of this practice. Keep one short phrase you liked, and play it once more with the screen out of sight.";
    $("complete-relationship").textContent = isRole() ? "Hearing and context, connected to your guitar" : session.plan.quality === "major" ? "A major third, carried somewhere new" : "A minor third, carried somewhere new";
    $("complete-next-copy").textContent = isRole() ? "Your next session changes the anchor and comparison order. Keep listening before labels."
      : "Your next session changes the starting material and keeps the same small steps: find, hear, use and transfer.";
    const items = session.plan.rounds.map(({ purpose, material }) => {
      const li = document.createElement("li");
      li.textContent = isRole() ? purpose + ": " + material.anchor.name + " over " + material.contexts.map((context) => context.symbol).join(" → ")
        : purpose + ": " + material.root.name + " → " + material.target.name;
      return li;
    });
    $("complete-rounds").replaceChildren(...items);
    return;
  }
  if (view !== "practice") return;
  if (isStretch()) {
    renderDepthTask(session, { $, document, board, formatNote });
    return;
  }
  $("depth-controls").hidden = true;
  $("depth-facts").replaceChildren();
  for (const id of ["depth-question-title", "depth-question-note", "depth-use-copy"]) $(id).textContent = "";
  $("hear-root").disabled = false;
  $("check-position").textContent = "Check this position";
  if (isRole()) {
    renderRoleTask(session, { $, document, board });
    return;
  }
  $("role-controls").hidden = true;
  $("role-facts").replaceChildren();
  $("board-panel").hidden = false;
  $("board-region").textContent = "Open–3 · standard tuning";
  $("hear-root").textContent = "Hear root";
  $("hear-root").classList.remove("primary");
  $("hear-pair").textContent = "Hear root → third → root";
  $("session-progress").max = 3;
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
  session = isStretch() ? advanceDepthSession(session, { type: "commit-position" }) : isRole() ? advanceRoleSession(session, { type: "commit-position" }) : advanceSession(session, { type: "commit" });
  if (session.stage === "use") {
    stopAudio();
    $("task-feedback").textContent = "";
  } else {
    $("task-feedback").textContent = isStretch() ? "Those choices do not yet complete this challenge. Check the required count and constraint, try another route, or reveal with help."
      : isRole() ? "That screen position is not this registered anchor yet. Listen again and try another position, or reveal with help."
      : "That screen position does not match this interval yet. Play the root again and try another position, or reveal with help.";
  }
  render();
  if (session.stage === "use") $("task-title").focus();
});
$("help-reveal").addEventListener("click", () => {
  stopAudio();
  session = isStretch() ? advanceDepthSession(session, { type: "help" }) : isRole() ? advanceRoleSession(session, { type: "help" }) : advanceSession(session, { type: "help" });
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
$("practice-focus").addEventListener("change", renderHomeFocus);
$("practice-challenge").addEventListener("change", renderHomeFocus);
for (const v of ["settled", "tense", "unsure"]) $("depth-" + v).addEventListener("change", () => {
  if (!isStretch()) return;
  session = advanceDepthSession(session, { type: "response", value: v }); render();
});
for (const v of ["a", "b", "same", "unsure"]) $("depth-compare-" + v).addEventListener("change", () => {
  if (!isStretch()) return;
  session = advanceDepthSession(session, { type: "response", value: v }); render();
});
$("depth-played").addEventListener("change", () => {
  if (!isStretch()) return;
  session = advanceDepthSession(session, { type: "played", value: $("depth-played").checked }); render();
});
for (const v of ["clearer", "exploring"]) $("depth-reflect-" + v).addEventListener("change", () => {
  if (!isStretch()) return;
  session = advanceDepthSession(session, { type: "reflect", value: v }); render();
});
$("depth-next").addEventListener("click", () => {
  if (!isStretch()) return;
  const next = advanceDepthSession(session, { type: ["predict", "hear"].includes(session.stage) ? "commit-response" : "next" });
  if (next === session) return;
  stopAudio(); session = next;
  view = session.stage === "complete" ? "complete" : "practice";
  $("task-feedback").textContent = "";
  render(); $(view === "complete" ? "complete-title" : "task-title").focus();
});
for (const value of ["settled", "tense", "unsure"]) $("role-" + value).addEventListener("change", () => {
  if (!isRole()) return;
  session = advanceRoleSession(session, { type: "impression", value });
  render();
});
$("role-played").addEventListener("change", () => {
  if (!isRole()) return;
  session = advanceRoleSession(session, { type: "played", value: $("role-played").checked });
  render();
});
$("role-next").addEventListener("click", () => {
  if (!isRole()) return;
  const next = advanceRoleSession(session, { type: session.stage === "hear" ? "commit-impression" : "next" });
  if (next === session) return;
  stopAudio();
  session = next;
  view = session.stage === "complete" ? "complete" : "practice";
  $("task-feedback").textContent = "";
  $("audio-status").textContent = "Choose the guitar reference when you are ready.";
  render();
  $(view === "complete" ? "complete-title" : "task-title").focus();
});
globalThis.addEventListener("pagehide", stopAudio);
render();
