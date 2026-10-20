// Fixed lesson content, not an exercise framework. All answers and positions come from queries.
const LESSONS = Object.freeze([
  Object.freeze({ tonic: "C", degree: 4, chordSize: "triad", stringIndex: 1, title: "Find degree 4" }),
  Object.freeze({ tonic: "C", degree: 2, chordSize: "triad", stringIndex: 3, title: "Reconstruct degree 2" }),
  Object.freeze({ tonic: "G", degree: 4, chordSize: "triad", stringIndex: 4, title: "Transfer degree 4" }),
  Object.freeze({ tonic: "C", degree: 5, chordSize: "seventh", stringIndex: 2, title: "Extend the stack to a seventh" }),
]);

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function createHarmonyPlan({ getHarmony, findLocations }) {
  const lessons = LESSONS.map((spec) => {
    const key = { tonic: { letter: spec.tonic, accidental: 0 }, mode: "major" };
    const harmony = getHarmony({ key, chordSize: spec.chordSize });
    const entry = harmony.degrees.find(({ degree }) => degree === spec.degree);
    if (!entry) throw new Error("The harmony query did not return the requested degree");
    const locations = entry.chord.tones.map((tone) => findLocations({
      key, chord: entry.chord, stringIndex: spec.stringIndex, pitchClass: tone.pitchClass,
    }));
    const rootCandidates = locations[0];
    let tasks;
    for (const anchor of rootCandidates) {
      const candidates = entry.chord.tones.map((tone, index) => {
        const plannedLocation = locations[index].find(({ semitone }) =>
          semitone === anchor.semitone + tone.interval.semitones);
        return plannedLocation ? { tone, plannedLocation } : null;
      });
      if (candidates.every(Boolean)) { tasks = candidates; break; }
    }
    if (!tasks) throw new Error("No complete ascending single-string stack fits this lesson");
    const min = Math.min(...tasks.map(({ plannedLocation }) => plannedLocation.position.fret));
    const max = Math.max(...tasks.map(({ plannedLocation }) => plannedLocation.position.fret));
    return {
      key, entry, chordSize: spec.chordSize, title: spec.title, stringIndex: spec.stringIndex,
      fretWindow: { minFret: Math.max(0, min - 2), maxFret: Math.min(15, max + 2) }, tasks,
    };
  });
  const reverseHarmony = getHarmony({ key: lessons[0].key, chordSize: "triad" });
  const reverse = {
    key: lessons[0].key,
    entry: reverseHarmony.degrees.find(({ degree }) => degree === 6),
    romanChoices: reverseHarmony.degrees.map(({ romanNumeral }) => romanNumeral.label),
  };
  if (!reverse.entry) throw new Error("The reverse lesson requires degree 6");
  const stages = [{ kind: "orient" }];
  for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    if (lessonIndex === 2) stages.push({ kind: "reverse" });
    for (const kind of ["root", "stack", "quality"]) stages.push({ kind, lessonIndex });
  }
  stages.push({ kind: "reflect" }, { kind: "complete" });
  return freeze({ lessons, reverse, stages });
}

export function matchesPlannedPosition(task, position) {
  return Boolean(position && task
    && position.stringIndex === task.plannedLocation.position.stringIndex
    && position.fret === task.plannedLocation.position.fret);
}
