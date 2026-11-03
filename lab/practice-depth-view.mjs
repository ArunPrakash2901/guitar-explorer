import { depthBoard } from "./practice-depth-plan.mjs";
import { depthPositionKey as key } from "./practice-depth-material.mjs";
import { stringName } from "./practice-plan.mjs";

const ordinal = (n) => n === 5 ? "5th" : "7th";
const place = (n) => n.name + ": " + stringName(n.position.stringIndex) + " string, " + (n.position.fret ? "fret " + n.position.fret : "open");
const feel = (v) => ({ a: "A felt more settled", b: "B felt more settled", same: "No clear difference", unsure: "Unsure" })[v] ?? v;

export function renderDepthTask(s, { $, document, board, formatNote }) {
  const round = s.plan.rounds[s.roundIndex], m = round.material;
  const ear = s.plan.family === "role-ear", predicting = s.stage === "predict", hearing = s.stage === "hear";
  const revealing = s.stage === "reveal", finding = s.stage === "find", using = s.stage === "use";
  const required = m.groups.reduce((sum, g) => sum + g.required, 0);
  const labels = m.anchors?.map((n, i) => (m.named || revealing || finding || using) ? String.fromCharCode(65 + i) + " · " + n.name : "Pitch " + String.fromCharCode(65 + i));
  const comparisons = m.comparisons;
  const current = comparisons?.[s.comparisonIndex];
  $("session-progress").max = s.plan.rounds.length;
  $("session-progress").value = s.roundIndex;
  $("round-label").textContent = "Stretch · " + (s.roundIndex + 1) + " of " + s.plan.rounds.length + " · " + round.purpose;
  $("round-purpose").textContent = round.purpose;
  $("role-controls").hidden = true;
  $("role-facts").replaceChildren();
  for (const id of ["role-context-title", "role-context-counter", "role-use-title", "role-use-copy", "role-listening-note"]) $(id).textContent = "";
  $("reveal-controls").hidden = true;
  for (const id of ["support-label", "reveal-title", "relationship-explanation", "phrase-prompt"]) $(id).textContent = "";
  $("board-panel").hidden = !finding && !using;
  $("board-region").textContent = "Open–5 · standard tuning";
  board.update(depthBoard(s));
  $("board-help").textContent = finding ? "Choose " + required + (required === 1 ? " position" : " positions") + ". Click or use Tab, arrows and Enter. Select again to remove a choice."
    : "Play these notes on your guitar. Change the rhythm, leave silence, and listen.";
  $("find-controls").hidden = !finding;
  $("check-position").disabled = !s.selectedPositions.length;
  $("check-position").textContent = required === 1 ? "Check this position" : "Check these positions";
  $("help-reveal").hidden = s.attempts === 0;
  $("selection-label").textContent = s.selectedPositions.length
    ? s.selectedPositions.length + " selected: " + s.selectedPositions.map((p) => stringName(p.stringIndex) + " string, fret " + p.fret).join("; ") + "."
    : "Find and play the " + (ear ? "heard pitches" : m.kind === "reverse" ? "missing root" : "relationship") + " before marking " + (required === 1 ? "a position." : "your positions.");
  $("hear-root").disabled = predicting;
  $("hear-root").classList.toggle("primary", ear && ((hearing && !s.auditioned) || (using && !s.backingAuditioned)));
  $("hear-pair").hidden = !using;
  $("hear-pair").textContent = ear ? "Hear pitches alone" : "Hear the relationship";
  $("hear-root").textContent = predicting ? "Commit your prediction first" : ear
    ? finding ? "Hear the pitches" : using ? m.kind === "predict" ? "Play changing chords" : "Play the fixed chord" : "Hear the comparison"
    : m.kind === "chord-role" ? "Hear the chord" : "Hear the given note";
  if (ear) {
    $("task-title").textContent = predicting ? "Before you hear it, make a prediction."
      : hearing ? m.kind === "compare" ? "One chord. Two possible endings." : "Now hear the pitch in context."
        : revealing ? "Compare your hearing with the musical facts."
          : finding ? "Find the pitches you heard."
            : m.kind === "predict" ? "Keep your note. Hear the harmony move." : "Give both notes a place in a phrase.";
    $("task-instruction").textContent = predicting ? "You know the pitch and the next chord. Predict its feeling, then listen. No prediction is scored."
      : hearing ? m.kind === "compare" ? (s.roundIndex === 2 ? "Keep the same two pitches; the chord has changed. Listen again before choosing a preference." : "Listen to A, then B over the same chord. Which feels more settled to you?")
        : "Keep what you actually heard, even if it differs from your prediction."
        : revealing ? "These facts describe the supplied chord. They do not mark your impression right or wrong."
          : finding ? "Locate and play the exact registered pitches, then mark them. The answer locations are still hidden."
            : "Use the supplied harmony while you play. Take time to repeat the comparison on your acoustic guitar.";
    $("relationship-title").textContent = m.kind === "predict" ? "Anchor · " + m.anchors[0].name : labels.join(" / ");
    $("root-location").textContent = using ? s.selectedPositions.map((p) => place(m.groups.flatMap((g) => g.locations).find((n) => key(n.position) === key(p)))).join(". ")
      : m.kind === "compare" ? "Same chord · " + comparisons[0].context.symbol : "Keep the exact same pitch and octave.";
    $("target-region").textContent = finding ? "Search D, G, B and high E strings, open through fret 5."
      : m.kind === "predict" && (predicting || hearing) ? "Context " + (s.comparisonIndex + 1) + " of " + comparisons.length + " · " + current.context.symbol
        : m.kind === "compare" && !using ? "First A, then B · one chord throughout." : [...new Set(comparisons.map((c) => c.context.symbol))].join(" → ");
  } else {
    $("task-title").textContent = using ? "Use the relationship you reconstructed."
      : m.kind === "routes" ? m.frettedOnly ? "Find a fretted " + m.interval.name.toLowerCase() + "." : "Find this third on two strings."
        : m.kind === "chord-role" ? "Find the " + ordinal(m.role) + " of " + m.context.symbol + "."
          : m.source.name + " is the third. Find its root.";
    $("task-instruction").textContent = using ? "Turn the retrieved notes into a short phrase. Change the rhythm and finish deliberately."
      : m.kind === "routes" ? (m.frettedOnly ? "Your target must be fretted. The supplied root may be open. Search the string group rather than following an exact-string hint."
        : "Find the same third on two strings. Match the exact pitch and octave; keep the root fixed while you rebuild the route.")
        : m.kind === "chord-role" ? "Translate the chord role into a sound and a place. The interval name and target pitch appear after your attempt."
          : "This time the third is given. Find a root below it that makes the stated interval. A familiar relationship, searched in reverse.";
    $("relationship-title").textContent = m.kind === "chord-role" ? m.context.symbol + " · " + ordinal(m.role) : m.interval.name;
    $("root-location").textContent = "Given " + place(m.source) + ".";
    $("target-region").textContent = finding ? "D, G, B and high E strings · " + (m.frettedOnly ? "fretted targets only" : "open through fret 5") + ". Mark " + required + (required === 1 ? " valid position." : " positions on different strings.")
      : s.selectedPositions.map((p) => place(m.groups.flatMap((g) => g.locations).find((n) => key(n.position) === key(p)))).join(". ");
  }
  $("depth-controls").hidden = finding;
  $("depth-question").hidden = !predicting && !hearing;
  $("depth-feeling").hidden = m.kind === "compare";
  $("depth-comparison").hidden = m.kind !== "compare";
  $("depth-feeling-legend").textContent = predicting ? "How do you predict the anchor will feel?" : "How did it actually feel to you?";
  for (const v of ["settled", "tense", "unsure"]) $("depth-" + v).checked = s.draft === v;
  for (const v of ["a", "b", "same", "unsure"]) $("depth-compare-" + v).checked = s.draft === v;
  $("depth-question-title").textContent = m.kind === "compare" ? labels.join(" → ")
    : ear ? m.anchors[0].name + " over " + current.context.symbol : "";
  $("depth-question-note").textContent = predicting ? "Commit before audition. Choose Unsure if you cannot imagine it yet; you will hear it next."
    : hearing && m.kind === "predict" ? "Your prediction: " + s.predictions[s.comparisonIndex] + ". Keep your own listening response."
      : "The first pitch is A; after a pause comes B. Your preference has no right or wrong answer.";
  $("depth-reveal").hidden = !revealing && !(using && !ear);
  $("depth-facts").replaceChildren();
  if (revealing || (using && !ear)) {
    const cards = ear ? comparisons.map((c, i) => {
      const article = document.createElement("article"); article.className = "role-fact";
      const h = document.createElement("h3"); h.textContent = (m.kind === "compare" ? String.fromCharCode(65 + i) + " · " : "") + c.anchor.name + " over " + c.context.symbol;
      const fact = document.createElement("p"); fact.textContent = c.relation.interval.name + " from the chord root; " + (c.relation.isChordTone ? "chord tone." : "non-chord tone.");
      const notes = document.createElement("p"); notes.className = "quiet"; notes.textContent = "Chord notes: " + c.context.chord.tones.map((n) => formatNote(n.note)).join(", ") + ".";
      const response = document.createElement("p"); response.className = "quiet";
      response.textContent = m.kind === "predict" ? "Your prediction: " + s.predictions[i] + "; your hearing: " + s.impressions[i] + "." : "Your comparison: " + feel(s.impressions[0]) + ".";
      article.append(h, fact, notes, response); return article;
    }) : [(() => {
      const p = document.createElement("p"); p.textContent = m.root.name + " → " + m.target.name + " · " + m.interval.name + ". "
        + (m.kind === "chord-role" ? "The target is the " + ordinal(m.role) + " of " + m.context.symbol + "." : "The registered interval stays the same when you use another physical route."); return p;
    })()];
    $("depth-facts").replaceChildren(...cards);
  }
  $("depth-use").hidden = !using;
  $("depth-use-title").textContent = s.assisted ? "Shown with help. Now use it on your guitar." : "Make the relationship audible.";
  $("depth-use-copy").textContent = !using ? "" : ear
    ? m.kind === "predict" ? "Play " + m.anchors[0].name + " without moving to another pitch while the app changes the chords. Repeat it, leave silence, and notice the changing context."
      : "Over the app's fixed " + comparisons[0].context.symbol + " chord, play " + m.anchors[0].name + ", then " + m.anchors[1].name + ". Make a short phrase, leave a pause, then choose your own ending."
        + (s.roundIndex === 2 ? " You heard this same pair over " + s.plan.rounds[1].material.comparisons[0].context.symbol + ". Does your ending choice change with the new chord?" : "")
    : m.kind === "routes" && required === 2 ? "Play the given root, then the third at each of your two positions. It is the same exact pitch on different strings. Use both routes in a short phrase."
      : m.kind === "chord-role" ? "Hear the supplied chord, then play its target tone. Leave silence and answer with a short phrase that returns to the target."
        : "Play the reconstructed root and third, then return to the root. Leave silence. Make your own short phrase from this relationship.";
  $("depth-played").checked = s.played;
  $("depth-reflect-clearer").checked = s.reflection === "clearer";
  $("depth-reflect-exploring").checked = s.reflection === "exploring";
  $("depth-use-note").textContent = ear && !s.backingAuditioned ? "Start the supplied harmony, then play your retrieved notes over it." : "Your reflection is ungraded. Replay and take the time you need.";
  $("depth-next").disabled = predicting ? !s.draft : hearing ? !s.draft || !s.auditioned : using ? !s.played || !s.reflection || (ear && !s.backingAuditioned) : false;
  $("depth-next").textContent = predicting ? "Keep prediction · then listen" : hearing ? m.kind === "predict" && s.comparisonIndex < comparisons.length - 1 ? "Keep hearing · next context" : "Keep response · reveal facts"
    : revealing ? "Find and play the pitches" : s.roundIndex === s.plan.rounds.length - 1 ? "Finish session" : "Try the next musical problem";
}
