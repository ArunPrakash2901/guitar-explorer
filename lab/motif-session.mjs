import { chordRole, pathConnections } from "./phrase-material.mjs";

// One deliberately small motif, its adaptations and a transfer. All note facts
// are resolved through the supplied musical and guitar queries.
export function createMotifPlan(material) {
  const { g, a, getInterval, formatNote } = material;
  function notes(ctx) {
    const source = [ctx.locate(ctx.tone(0, 1), 3, ctx === g ? 2 : 4),
      ctx.locate(ctx.tone(0, 3), 4, ctx === g ? 1 : 3),
      ctx.locate(ctx.tone(0, 1), 3, ctx === g ? 2 : 4)];
    const dominant = [ctx.locate(ctx.tone(1, 1), 4, ctx === g ? 3 : 5, 1),
      ctx.locate(ctx.tone(1, 3), 5, ctx === g ? 2 : 4, 1),
      ctx.locate(ctx.tone(1, 1), 4, ctx === g ? 3 : 5, 1)];
    const arrival = [ctx.locate(ctx.tone(2, 1), 2, ctx === g ? 5 : 7, 2),
      ctx.locate(ctx.tone(2, 3), 3, ctx === g ? 4 : 6, 2),
      ctx.locate(ctx.tone(2, 1), 2, ctx === g ? 5 : 7, 2)];
    return { source, dominant, arrival };
  }
  const examples = { g: notes(g), a: notes(a) };
  const sourceInterval = getInterval({ from: examples.g.source[0].pitch, to: examples.g.source[1].pitch });
  const sequence = [g.locate(g.scaleTone(3), 3, 4), g.locate(g.scaleTone(5), 4, 3), g.locate(g.scaleTone(3), 3, 4)];
  const sequenceInterval = getInterval({ from: sequence[0].pitch, to: sequence[1].pitch });
  if (sourceInterval.diatonicSteps !== sequenceInterval.diatonicSteps || sourceInterval.semitones !== sequenceInterval.semitones) {
    throw new Error("Curated sequence must preserve the original interval");
  }
  const stages = [
    { id: "source", kind: "play", title: "Play one small idea", context: g,
      prompt: `Over ${g.chords[0].symbol}, play the three-note motif shown. Hear its rise and return.`,
      instruction: "Keep its short–short–long feel. These words are a fixed motif cue, not a rhythm lesson." },
    { id: "identity", kind: "reflect", title: "What makes it recognizable?", context: g,
      prompt: "Which part of that idea would you recognize if the pitches changed: contour, interval, ending, rhythm, or a combination?",
      instruction: "Your perception is ungraded. In this experiment, preserve the short–short–long feel and rise–return contour." },
    { id: "adapt", kind: "adapt", title: "Carry it onto the next chord", context: g, chordIndex: 1,
      prompt: `Now ${g.chords[1].symbol} arrives. Choose three positions: a chord tone, its 3rd above it, then the opening pitch again.`,
      instruction: "Keep the rise–return shape. Play your adaptation before checking its chord relationships." },
    { id: "variation-ending", kind: "ending", title: "Vary only the ending", context: g, chordIndex: 0,
      prompt: `Repeat the opening two notes over ${g.chords[0].symbol}; change only the final note to another chord tone.`,
      instruction: "The original first and middle notes stay fixed. Select and play the new ending." },
    { id: "variation-contour", kind: "adapt", title: "Vary pitches, keep contour", context: g, chordIndex: 2,
      prompt: `Over ${g.chords[2].symbol}, make a three-note rise–return idea. Aim for the chord's 3rd at the high point.`,
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
    { id: "response", kind: "response", title: "Answer the motif", context: g, chordIndex: 2,
      prompt: `Treat the opening motif as a question. Plan one ${g.chords[2].symbol} chord-tone destination for a short response, then play a phrase that recalls its contour or fragment.`,
      instruction: "The app checks the planned target only. Whether the answer sounds connected is yours to judge." },
    { id: "improv", kind: "confirm", title: "Develop, then improvise", context: g,
      prompt: `Over ${g.chords.map(({ symbol }) => symbol).join(" → ")}, use the three-note motif for several short passes. Land on the dominant 3rd and tonic root as the harmony changes.`,
      instruction: "Keep recognizable contour and fixed short–short–long feel. Change pitches to suit each chord; the app cannot hear or grade your playing." },
    { id: "transfer", kind: "transfer", title: "Transfer the idea", context: a,
      prompt: `New key: ${a.chords.map(({ symbol }) => symbol).join(" → ")}. Rebuild the dominant 3rd and tonic root as two planned arrivals; then adapt your motif around them.`,
      instruction: "Select each target in order on the high E string. No transposed fret pattern is supplied." },
    { id: "transfer-adapt", kind: "adapt", title: "Rebuild the motif in the new key", context: a, chordIndex: 1,
      prompt: `Over ${a.chords[1].symbol}, choose a new three-note rise–return motif: a chord-tone start, the chord's 3rd above it, and that same starting pitch again.`,
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
    const middleThird = middle.chordRelation?.matchingTones.some(({ degree }) => degree === 3);
    const correct = contour && chordFit && middleThird;
    return { correct, notes, message: correct
      ? `The idea rises to ${formatNote(middle.pitch.note)}, the 3rd of ${stage.context.chords[stage.chordIndex].symbol}, then returns to ${formatNote(first.pitch.note)}.`
      : `Try a repeated chord-tone opening and ending with the current chord's 3rd as a higher middle note. ${notes.map((note) => `${formatNote(note.pitch.note)} (${chordRole(note)})`).join(" → ")}.` };
  }
  function evaluateSingle(stage, position) {
    if (!position) return { correct: false, message: "Select a fret before checking." };
    const note = location(stage.context, stage.chordIndex, position);
    const source = examples.g.source;
    let correct = false;
    if (stage.kind === "ending") correct = note.chordRelation?.spellingMatches && note.semitone !== source[2].semitone;
    if (stage.kind === "middle") correct = note.chordRelation?.spellingMatches && note.semitone !== source[1].semitone && note.semitone > source[0].semitone;
    if (stage.kind === "response") correct = note.chordRelation?.spellingMatches;
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
    if (positions.length !== 2) return { correct: false, message: "Commit both new-key arrivals." };
    const selected = [a.at(1, positions[0].stringIndex, positions[0].fret), a.at(2, positions[1].stringIndex, positions[1].fret)];
    const sameNote = (left, right) => left.pitch.note.letter === right.pitch.note.letter
      && left.pitch.note.accidental === right.pitch.note.accidental;
    const correct = sameNote(selected[0], a.target) && sameNote(selected[1], a.arrival);
    return { correct, selected, message: correct
      ? `${formatNote(selected[0].pitch.note)} (${chordRole(selected[0])}) → ${formatNote(selected[1].pitch.note)} (${chordRole(selected[1])}) in the new key.`
      : `Your planned notes are ${selected.map((note) => formatNote(note.pitch.note)).join(" → ")}. Re-derive the dominant 3rd, then the tonic root.` };
  }
  return { stages, examples, sequence, sourceInterval, sequenceInterval, evaluateAdaptation, evaluateSingle, evaluateTransfer,
    pathConnections };
}
