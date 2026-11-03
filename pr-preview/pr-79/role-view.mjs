import { roleBoard } from "./role-plan.mjs?ge-revision=f4e4f463a972c3e522b1f45c8654aef5d545c5eb";
import { stringName } from "./practice-plan.mjs?ge-revision=f4e4f463a972c3e522b1f45c8654aef5d545c5eb";

export function renderRoleTask(state, { $, document, board }) {
  const m = state.plan.rounds[state.roundIndex].material;
  const hearing = state.stage === "hear";
  const revealing = state.stage === "reveal";
  const finding = state.stage === "find";
  const using = state.stage === "use";
  $("session-progress").max = 2;
  $("session-progress").value = state.roundIndex;
  $("round-label").textContent = "Round " + (state.roundIndex + 1) + " of 2 · " + state.plan.rounds[state.roundIndex].purpose;
  $("round-purpose").textContent = hearing ? "Listen before labels" : finding ? "Connect sound to a place" : using ? "Same pitch · changing harmony" : "Understand what changed";
  $("task-title").textContent = hearing ? "One pitch. Listen to its surroundings."
    : revealing ? "The pitch stayed. Its role changed."
      : finding ? "Find " + m.anchor.name + " on your guitar." : "Keep the note. Let the chords move.";
  $("task-instruction").textContent = hearing
    ? (state.roundIndex === 0 ? "Hear the chord and anchor together, then record your impression. The same pitch returns in each comparison."
      : "A different anchor and a new context order. Listen afresh before the relationships appear.")
    : revealing ? "Your impressions are kept as you gave them. Now compare the musical relationships."
      : finding ? "Find and play the exact pitch you heard, then mark its position."
        : "Let the app supply the chords while you play one unchanged pitch on your acoustic guitar.";
  $("relationship-title").textContent = "Anchor · " + m.anchor.name;
  $("root-location").textContent = using
    ? m.anchor.name + ": " + stringName((state.selected ?? m.anchor.position).stringIndex) + " string, " + ((state.selected ?? m.anchor.position).fret === 0 ? "open" : "fret " + (state.selected ?? m.anchor.position).fret) + "."
    : "Keep the same registered pitch in your ear.";
  $("target-region").textContent = hearing ? "Comparison " + (state.contextIndex + 1) + " of 3 · " + m.contexts[state.contextIndex].symbol
    : finding ? "Search D, G and B strings, open through fret 2."
      : m.contexts.map((context) => context.symbol).join(" → ");
  $("hear-root").classList.toggle("primary", (hearing && !state.auditioned) || (using && !state.backingAuditioned));
  $("hear-root").textContent = hearing ? "Hear this comparison" : revealing ? "Hear all comparisons" : finding ? "Hear anchor" : "Play changing chords";
  $("hear-pair").hidden = !using;
  $("hear-pair").textContent = using ? "Hear anchor" : "";
  $("board-panel").hidden = !finding && !using;
  $("board-region").textContent = "Open–2 · standard tuning";
  board.update(roleBoard(state));
  $("board-help").textContent = finding ? "String 1 is high E; string 6 is low E. Click a position, or use Tab, arrow keys and Enter."
    : "Keep this pitch fixed for the whole comparison. You can repeat the note as the chords change.";
  $("find-controls").hidden = !finding;
  $("check-position").disabled = !state.selected;
  $("help-reveal").hidden = state.attempts === 0;
  $("selection-label").textContent = state.selected
    ? "Your screen choice: " + stringName(state.selected.stringIndex) + " string, fret " + state.selected.fret + "."
    : "Play " + m.anchor.name + " on your guitar, then mark where you found it.";
  $("reveal-controls").hidden = true;
  for (const id of ["support-label", "reveal-title", "relationship-explanation", "phrase-prompt"]) $(id).textContent = "";
  $("role-controls").hidden = finding;
  $("role-listen").hidden = !hearing;
  $("role-reveal").hidden = !revealing;
  $("role-use").hidden = !using;
  $("role-context-counter").textContent = "Comparison " + (state.contextIndex + 1) + " of 3";
  $("role-context-title").textContent = m.contexts[state.contextIndex].symbol + " + " + m.anchor.name;
  for (const value of ["settled", "tense", "unsure"]) $("role-" + value).checked = state.draft === value;
  $("role-listening-note").textContent = state.auditioned
    ? "Keep the impression you heard. It is not scored."
    : "Use Hear this comparison, then choose your impression. It is not scored.";
  $("role-facts").replaceChildren();
  if (revealing) {
    const cards = m.contexts.map((context, index) => {
      const card = document.createElement("article"); card.className = "role-fact";
      const heading = document.createElement("h3"); heading.textContent = context.symbol + " + " + m.anchor.name;
      const impression = document.createElement("p"); impression.className = "quiet";
      impression.textContent = "Your impression: " + state.impressions[index];
      const interval = document.createElement("p"); interval.textContent = "From the chord root: " + context.relation.interval.name;
      const membership = document.createElement("p");
      membership.textContent = context.relation.isChordTone
        ? m.anchor.name + " is a chord tone of " + context.symbol + "."
        : m.anchor.name + " is a non-chord tone over " + context.symbol + ".";
      const notes = document.createElement("p"); notes.className = "quiet";
      notes.textContent = "The chord contains " + context.noteNames.join(", ") + ".";
      card.append(heading, impression, interval, membership, notes);
      return card;
    });
    $("role-facts").replaceChildren(...cards);
  }
  $("role-use-title").textContent = state.assisted ? "Position shown with help. Now listen through your guitar." : "Your note stays in one place.";
  $("role-use-copy").textContent = "Play " + m.anchor.name + " while the app plays " + m.contexts.map((context) => context.symbol).join(" → ") + ". Two slow strums per chord. Keep the same finger position or open string; repeat the pitch and notice how its place in the harmony feels. Replay if useful.";
  $("role-played").checked = state.played;
  $("role-use-note").textContent = state.backingAuditioned
    ? "Listen again if the difference is subtle. The app checks no guitar performance."
    : "Start Play changing chords, then play your fixed note over the accompaniment.";
  $("role-next").disabled = hearing ? !state.auditioned || !state.draft : using ? !state.backingAuditioned || !state.played : false;
  $("role-next").textContent = hearing ? (state.contextIndex < 2 ? "Keep my impression" : "Reveal the relationships")
    : revealing ? "Find " + m.anchor.name + " on the guitar"
      : state.roundIndex === 0 ? "Try a new anchor" : "Finish session";
}
