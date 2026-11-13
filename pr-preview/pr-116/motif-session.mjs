import { chordRole, pathConnections } from "./phrase-material.mjs?ge-revision=00581e04556260884131d3feca93b1898bb0b741";

// Rise–return is the current teaching procedure. Its notes and harmonic surface
// are supplied by a validated scenario; no motif pitches live in this module.
export function createMotifPlan(material) {
  const { main: g, transfer: a, getInterval, formatNote, examples, sequence, sourceInterval, sequenceInterval } = material;
  const { target, arrival } = material.spec.targets;
  const cells = material.spec.motif;
  const roleName = (degree) => degree === 1 ? "root" : degree === 3 ? "3rd" : degree === 5 ? "5th" : `degree ${degree}`;
  const stringName = (index) => index === 5 ? "the high E string (string 1)" : `string ${6 - index}`;
  const transferStrings = target.stringIndex === arrival.stringIndex
    ? `both targets on ${stringName(target.stringIndex)}`
    : `the first target on ${stringName(target.stringIndex)} and the arrival on ${stringName(arrival.stringIndex)}`;
  const stages = [
    { id: "source", kind: "play", title: "Play one small idea", context: g,
      prompt: `Over ${g.chords[0].symbol}, play the three-note motif shown. Hear its rise and return.`,
      instruction: "Keep its short–short–long feel. These words are a fixed motif cue, not a rhythm lesson." },
    { id: "identity", kind: "reflect", title: "What makes it recognizable?", context: g,
      prompt: "Which part of that idea would you recognize if the pitches changed: contour, interval, ending, rhythm, or a combination?",
      instruction: "Your perception is ungraded. In this experiment, preserve the short–short–long feel and rise–return contour." },
    { id: "adapt", kind: "adapt", title: "Carry it onto the next chord", context: g, chordIndex: cells.adaptation.chordIndex, upperDegree: cells.adaptation.upperDegree,
      prompt: `Now ${g.chords[cells.adaptation.chordIndex].symbol} arrives. Choose three positions: a chord tone, its ${roleName(cells.adaptation.upperDegree)} above it, then the opening pitch again.`,
      instruction: "Keep the rise–return shape. Play your adaptation before checking its chord relationships." },
    { id: "variation-ending", kind: "ending", title: "Vary only the ending", context: g, chordIndex: 0,
      prompt: `Repeat the opening two notes over ${g.chords[0].symbol}; change only the final note to another chord tone.`,
      instruction: "The original first and middle notes stay fixed. Select and play the new ending." },
    { id: "variation-contour", kind: "adapt", title: "Vary pitches, keep contour", context: g, chordIndex: cells.arrival.chordIndex, upperDegree: cells.arrival.upperDegree,
      prompt: `Over ${g.chords[cells.arrival.chordIndex].symbol}, make a three-note rise–return idea. Aim for the chord's ${roleName(cells.arrival.upperDegree)} at the high point.`,
      instruction: "Keep the short–short–long feel, but change pitches to fit this chord." },
    { id: "variation-repeat", kind: "middle", title: "Change one repeated note", context: g, chordIndex: 0,
      prompt: `Play the original motif twice. In the second pass keep the outer notes and change only the middle to another ${g.chords[0].symbol} chord tone.`,
      instruction: "Select the changed middle note; the first pass remains the reference." },
    { id: "sequence", kind: "sequence", title: "Start the same interval elsewhere", context: g, chordIndex: 0,
      prompt: "Start on the shown new note. Recreate the opening upward interval, then return to the start. Commit the middle note.",
      instruction: "The interval is a musical fact supplied by the engine; this example may contain a non-chord tone." },
    { id: "fragment", kind: "play", title: "Keep a smaller cell", context: g,
      prompt: "Keep only the last two notes of the opening motif. Repeat that fragment over the progression, altering it when the chord asks for a new target.",
      instruction: "Play the cell several times. Development can reuse material instead of inventing another scale run." },
    { id: "response", kind: "response", title: "Answer the motif", context: g, chordIndex: cells.arrival.chordIndex,
      prompt: `Treat the opening motif as a question. Plan one ${g.chords[cells.arrival.chordIndex].symbol} chord-tone destination for a short response, then play a phrase that recalls its contour or fragment.`,
      instruction: "The app checks the planned target only. Whether the answer sounds connected is yours to judge." },
    { id: "improv", kind: "confirm", title: "Develop, then improvise", context: g,
      prompt: `Over ${g.chords.map(({ symbol }) => symbol).join(" → ")}, use the three-note motif for several short passes. Land on the ${g.chords[target.chordIndex].symbol} ${roleName(target.degree)} and ${g.chords[arrival.chordIndex].symbol} ${roleName(arrival.degree)} as harmony changes.`,
      instruction: "Keep recognizable contour and fixed short–short–long feel. Change pitches to suit each chord; the app cannot hear or grade your playing." },
    { id: "transfer", kind: "transfer", title: "Transfer the idea", context: a,
      prompt: `New key: ${a.chords.map(({ symbol }) => symbol).join(" → ")}. Rebuild the ${g.chords[target.chordIndex].symbol} ${roleName(target.degree)} relationship and ${roleName(arrival.degree)} arrival as two planned targets; then adapt your motif around them.`,
      instruction: `Select ${transferStrings} in order. No transposed fret pattern is supplied.` },
    { id: "transfer-adapt", kind: "adapt", title: "Rebuild the motif in the new key", context: a, chordIndex: cells.adaptation.chordIndex, upperDegree: cells.adaptation.upperDegree,
      prompt: `Over ${a.chords[cells.adaptation.chordIndex].symbol}, choose a new three-note rise–return motif: a chord-tone start, the chord's ${roleName(cells.adaptation.upperDegree)} above it, and that same starting pitch again.`,
      instruction: "Keep the original short–short–long feel. Find the starting position yourself, physically play the adaptation, then check its harmonic fit." },
    { id: "complete", kind: "complete", title: "Did the idea survive?", context: a,
      prompt: "Did the passes sound connected? Could you keep the idea while the chords changed, or did you return to scale runs?",
      instruction: "This reflection and the temporary session evidence are descriptive only." },
  ];
  function location(ctx, chordIndex, position) { return ctx.at(chordIndex, position.stringIndex, position.fret); }
  function evaluateAdaptation(stage, positions) {
    if (positions.length !== 3) return { correct: false, message: "Select three notes in order." };
    const notes = positions.map((position) => location(stage.context, stage.chordIndex, position));
    const [first, middle, last] = notes;
    const contour = middle.semitone > first.semitone && middle.semitone > last.semitone && first.semitone === last.semitone;
    const chordFit = notes.every((note) => note.chordRelation?.isChordTone && note.chordRelation.spellingMatches);
    const middleRole = middle.chordRelation?.matchingTones.some(({ degree }) => degree === stage.upperDegree);
    const correct = contour && chordFit && middleRole;
    return { correct, notes, message: correct
      ? `The idea rises to ${formatNote(middle.pitch.note)}, the ${roleName(stage.upperDegree)} of ${stage.context.chords[stage.chordIndex].symbol}, then returns to ${formatNote(first.pitch.note)}.`
      : `Try a repeated chord-tone opening and ending with the current chord's ${roleName(stage.upperDegree)} as a higher middle note. ${notes.map((note) => `${formatNote(note.pitch.note)} (${chordRole(note)})`).join(" → ")}.` };
  }
  function evaluateSingle(stage, position) {
    if (!position) return { correct: false, message: "Select a fret before checking." };
    const note = location(stage.context, stage.chordIndex, position);
    const source = examples.main.source;
    let correct = false;
    if (stage.kind === "ending") correct = note.chordRelation?.isChordTone && note.chordRelation.spellingMatches && note.semitone !== source[2].semitone;
    if (stage.kind === "middle") correct = note.chordRelation?.isChordTone && note.chordRelation.spellingMatches && note.semitone !== source[1].semitone && note.semitone > source[0].semitone;
    if (stage.kind === "response") correct = note.chordRelation?.isChordTone && note.chordRelation.spellingMatches;
    if (stage.kind === "sequence") {
      const interval = getInterval({ from: sequence[0].pitch, to: note.pitch });
      correct = interval.diatonicSteps === sourceInterval.diatonicSteps && interval.semitones === sourceInterval.semitones;
    }
    return { correct: Boolean(correct), note, message: correct
      ? stage.kind === "sequence"
        ? `${formatNote(note.pitch.note)} preserves the opening ${sourceInterval.label} from the new start; it is ${chordRole(note)} over ${stage.context.chords[stage.chordIndex].symbol}.`
        : `${formatNote(note.pitch.note)} · ${chordRole(note)} over ${stage.context.chords[stage.chordIndex].symbol}.`
      : `${formatNote(note.pitch.note)} is ${chordRole(note)} here. Keep the stated single change and try another position.` };
  }
  function evaluateTransfer(positions) {
    if (!Array.isArray(positions) || positions.length !== 2) return { correct: false, message: "Commit both new-key arrivals." };
    if (positions.some((position) => !position || !Number.isInteger(position.stringIndex)
      || !Number.isInteger(position.fret) || !a.boardRange.strings.includes(position.stringIndex)
      || position.fret < a.boardRange.minFret || position.fret > a.boardRange.maxFret)) {
      return { correct: false, message: "Select positions on the active strings within the displayed fret range." };
    }
    const selected = [a.at(target.chordIndex, positions[0].stringIndex, positions[0].fret), a.at(arrival.chordIndex, positions[1].stringIndex, positions[1].fret)];
    const sameNote = (left, right) => left.pitch.note.letter === right.pitch.note.letter
      && left.pitch.note.accidental === right.pitch.note.accidental;
    const onRequiredStrings = positions[0].stringIndex === target.stringIndex && positions[1].stringIndex === arrival.stringIndex;
    const correct = onRequiredStrings && sameNote(selected[0], a.target) && sameNote(selected[1], a.arrival);
    return { correct, selected, message: correct
      ? `${formatNote(selected[0].pitch.note)} (${chordRole(selected[0])}) → ${formatNote(selected[1].pitch.note)} (${chordRole(selected[1])}) in the new key.`
      : !onRequiredStrings ? `The planned notes must also use ${transferStrings}. Try again in the displayed fret range.`
        : `Your planned notes are ${selected.map((note) => formatNote(note.pitch.note)).join(" → ")}. Re-derive the ${roleName(target.degree)}, then the ${roleName(arrival.degree)}.` };
  }
  return { stages, examples, sequence, sourceInterval, sequenceInterval, evaluateAdaptation, evaluateSingle, evaluateTransfer,
    pathConnections };
}
