import { chordRole, pathConnections } from "./phrase-material.mjs";

// One teaching procedure over a validated, engine-resolved musical scenario.
export function createMelodyPlan(material) {
  const { main: g, transfer: a, formatNote } = material;
  const { target, arrival } = material.spec.targets;
  const targetRole = target.degree === 3 ? "3rd" : `degree ${target.degree}`;
  const arrivalRole = arrival.degree === 1 ? "root" : arrival.degree === 3 ? "3rd" : `degree ${arrival.degree}`;
  const stringName = target.stringIndex === 5 ? "high E string" : `string ${6 - target.stringIndex}`;
  const stages = [
    { id: "harmony", title: "Establish the harmony", kind: "play", context: g,
      prompt: `Play ${g.chords.map(({ symbol }) => symbol).join(" → ")}. Hear each change, then say where the music seems to settle.`,
      instruction: "Use familiar chord shapes or compact voicings. The app cannot hear your guitar." },
    { id: "target", title: `Land on the ${targetRole}`, kind: "select", context: g, chordIndex: target.chordIndex, answer: g.target,
      prompt: `When ${g.chords[target.chordIndex].symbol} arrives, predict its ${targetRole}. Sing it, locate it on the ${stringName}, play it, then commit a fret.`,
      instruction: "The answer note and fret stay hidden until you check. Try the sound against the chord." },
    { id: "reinterpret", title: "One pitch, changing meaning", kind: "reflect", context: g,
      prompt: "Play the displayed physical pitch after each chord. Does the same note feel identical as the chord changes?",
      instruction: "Choose an impression first. Your listening description is not graded." },
    { id: "trajectory", title: "Aim for the next arrival", kind: "select", context: g, chordIndex: arrival.chordIndex, answer: g.arrival,
      prompt: `Start from the previous ${g.chords[target.chordIndex].symbol} target. As ${g.chords[arrival.chordIndex].symbol} arrives, find its ${arrivalRole} nearby on the ${stringName}.`,
      instruction: "Play both notes in order before committing the second fret. This is a melodic destination, not voicing optimization." },
    { id: "approach", title: "Approach, then arrive", kind: "select", context: g, chordIndex: target.chordIndex, answer: g.approach,
      prompt: `Before the ${g.chords[target.chordIndex].symbol} target, choose the key note one diatonic step below it on the ${stringName}.`,
      instruction: "An approach creates motion toward a target; it need not itself be the chord's stable landing point." },
    { id: "phrase", title: "Play a four-note thought", kind: "phrase", context: g,
      prompt: `Make a four-note line across ${g.chords[target.chordIndex].symbol} → ${g.chords[arrival.chordIndex].symbol}. Hear the final arrival before revealing the example.`,
      instruction: "Play a small phrase ending on the arrival target. Compare your own line with the curated example after committing." },
    { id: "improv", title: "Use the targets in a short pass", kind: "confirm", context: g,
      prompt: `Over ${g.chords.map(({ symbol }) => symbol).join(" → ")}, play at most three notes per chord. Land on the ${g.chords[target.chordIndex].symbol} ${targetRole} and ${g.chords[arrival.chordIndex].symbol} ${arrivalRole}.`,
      instruction: "Choose your connecting notes. Repeat several short passes; confirm only that you tried. The app does not judge sound or artistic quality." },
    { id: "transfer-target", title: `Transfer the ${targetRole}`, kind: "select", context: a, chordIndex: target.chordIndex, answer: a.target,
      prompt: `New key: ${a.chords.map(({ symbol }) => symbol).join(" → ")}. Derive the ${targetRole} of ${a.chords[target.chordIndex].symbol}, then find and play it on the ${stringName}.`,
      instruction: "Use the relationship, not the old fret. The target name and position remain hidden." },
    { id: "transfer-arrival", title: "Transfer the arrival", kind: "select", context: a, chordIndex: arrival.chordIndex, answer: a.arrival,
      prompt: `From your new ${targetRole}, arrive on the ${arrivalRole} of ${a.chords[arrival.chordIndex].symbol}. Sing the movement before selecting the fret.`,
      instruction: "Commit the new location before inspecting its identity or the path." },
    { id: "complete", title: "What changed in your playing?", kind: "complete", context: a,
      prompt: "Did you begin hearing chord changes as destinations? Where did you still calculate?",
      instruction: "These are questions for physical-guitar review, not a mastery judgment." },
  ];

  function evaluate(stage, fret) {
    if (stage.kind !== "select") throw new Error("Only fret-selection stages have objective answers");
    if (!Number.isInteger(fret) || fret < stage.context.boardRange.minFret || fret > stage.context.boardRange.maxFret) return { correct: false, message: "Choose a fret in the shown region." };
    const actual = stage.context.at(stage.chordIndex, target.stringIndex, fret);
    const correct = actual.pitch.note.letter === stage.answer.pitch.note.letter
      && actual.pitch.note.accidental === stage.answer.pitch.note.accidental;
    return { correct, actual,
      message: correct
        ? `${formatNote(actual.pitch.note)} is ${chordRole(actual)} of ${stage.context.chords[stage.chordIndex].symbol}; key degree ${actual.keyRelation.degree}.`
        : `${formatNote(actual.pitch.note)} is ${chordRole(actual)} over ${stage.context.chords[stage.chordIndex].symbol}. Rehear the requested destination and try again.` };
  }

  function explanation(stage) {
    const ctx = stage.context;
    if (stage.id === "harmony") return ctx.chords.map(({ symbol, entry }) =>
      `${symbol}: ${entry.romanNumeral.label} · ${entry.chord.tones.map(({ note }) => formatNote(note)).join("–")}`);
    if (stage.id === "reinterpret") return ctx.sameRoles.map((analysis, index) =>
      `${formatNote(analysis.pitch.note)} over ${ctx.chords[index].symbol}: ${chordRole(analysis)} · ${analysis.chordRelation.interval.label} from its root · key degree ${analysis.keyRelation.degree}`);
    if (stage.id === "phrase") return ctx.phrase.map((location, index) => {
      const chordIndex = index === ctx.phrase.length - 1 ? arrival.chordIndex : target.chordIndex;
      const analysis = ctx.at(chordIndex, location.position.stringIndex, location.position.fret);
      return `${index + 1}. ${formatNote(analysis.pitch.note)} · ${index === 1 ? "approach" : index === 2 || index === 3 ? "target" : "opening"} · ${chordRole(analysis)} over ${ctx.chords[chordIndex].symbol}`;
    });
    if (stage.kind === "select") {
      const analysis = ctx.at(stage.chordIndex, target.stringIndex, stage.answer.position.fret);
      return [`${formatNote(analysis.pitch.note)} · ${chordRole(analysis)} of ${ctx.chords[stage.chordIndex].symbol} · key degree ${analysis.keyRelation.degree}`,
        ...(stage.id === "approach" ? [`This is an approach to ${formatNote(ctx.target.pitch.note)}, the ${chordRole(ctx.at(target.chordIndex, target.stringIndex, ctx.target.position.fret))} target.`] : []),
        ...(stage.id.includes("arrival") || stage.id === "trajectory" ? [`Played target movement: ${ctx.targetMotion.label}.`] : [])];
    }
    return [];
  }

  return { stages, evaluate, explanation,
    phraseConnections: pathConnections(g.phrase),
    targetConnections: (ctx) => pathConnections([ctx.target, ctx.arrival]) };
}
