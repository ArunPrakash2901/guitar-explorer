// One bounded voice-leading probe. Musical identities come from musicQueries;
// enumeration and physical-distance scoring intentionally remain Lab-local.
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const ACTIVE_STRINGS = Object.freeze([2, 3, 4, 5]);

function compareNumbers(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function roleLabel(tone) {
  if (tone.degree === 1) return "root";
  if (tone.degree === 3) return "3rd";
  if (tone.degree === 5) return "5th";
  if (tone.degree === 7 && tone.alteration === -1) return "♭7";
  return `${tone.alteration < 0 ? "♭" : tone.alteration > 0 ? "♯" : ""}${tone.degree}`;
}

function chordSymbol(chord, catalog, formatNote) {
  const metadata = catalog.find(({ id }) => id === chord.chordId);
  if (!metadata) throw new Error(`Chord catalogue omitted ${chord.chordId}`);
  return `${formatNote(chord.root)}${metadata.symbol}`;
}

function requiredPitchClasses(chord) {
  return [...new Set(chord.tones.map(({ pitchClass }) => pitchClass))].sort((a, b) => a - b);
}

function candidateContainsChord(candidate, chord) {
  const required = requiredPitchClasses(chord);
  const present = new Set(candidate.notes.map(({ pitchClass }) => pitchClass));
  return candidate.notes.every(({ pitchClass }) => required.includes(pitchClass))
    && required.every((pitchClass) => present.has(pitchClass));
}

function enumerate(items, index = 0, chosen = [], output = []) {
  if (index === items.length) {
    output.push([...chosen]);
    return output;
  }
  for (const item of items[index]) {
    chosen.push(item);
    enumerate(items, index + 1, chosen, output);
    chosen.pop();
  }
  return output;
}

export function createVoiceLeadingPlan({ getHarmony, getCatalog, findLocations, getNoteAtFret, getInterval, formatNote }) {
  const catalog = getCatalog({}).flatMap(({ chords }) => chords);

  function harmonyChord(harmony, degree) {
    const entry = harmony.degrees.find((item) => item.degree === degree);
    if (!entry) throw new Error(`Harmony query omitted degree ${degree}`);
    return freeze({
      entry,
      chord: entry.chord,
      symbol: chordSymbol(entry.chord, catalog, formatNote),
    });
  }

  function candidates(context, chordRef) {
    const locations = findLocations({
      key: context.key,
      chord: chordRef.chord,
      stringIndices: ACTIVE_STRINGS,
      fretRange: context.fretRange,
      pitchClasses: requiredPitchClasses(chordRef.chord),
    });
    const byString = ACTIVE_STRINGS.map((stringIndex) => locations.filter((item) => item.position.stringIndex === stringIndex));
    if (byString.some((items) => items.length === 0)) throw new Error("No chord-tone location is available on an active string");
    return freeze(enumerate(byString)
      .map((notes) => ({ notes, frets: notes.map(({ position }) => position.fret) }))
      .filter((candidate) => candidateContainsChord(candidate, chordRef.chord))
      .sort((left, right) => compareNumbers(left.frets, right.frets)));
  }

  function toneFor(chord, pitchClass) {
    const tone = chord.tones.find((item) => item.pitchClass === pitchClass);
    if (!tone) throw new Error("A selected pitch has no structural chord tone");
    return tone;
  }

  function describeMovement(previous, next, fromChord, toChord) {
    return freeze(ACTIVE_STRINGS.map((stringIndex, index) => {
      const from = previous.notes[index];
      const to = next.notes[index];
      const delta = to.position.fret - from.position.fret;
      const distance = Math.abs(delta);
      return {
        stringIndex,
        stringNumber: 6 - stringIndex,
        from,
        to,
        fretDelta: delta,
        distance,
        direction: delta === 0 ? "stay" : delta > 0 ? "up" : "down",
        motionKind: distance === 0 ? "common tone" : distance === 1 ? "semitone" : distance === 2 ? "whole step" : `${distance} semitones`,
        interval: getInterval({ from: from.pitch, to: to.pitch }),
        fromRole: roleLabel(toneFor(fromChord.chord, from.pitchClass)),
        toRole: roleLabel(toneFor(toChord.chord, to.pitchClass)),
        fromScaleDegree: from.keyRelation?.degree,
        toScaleDegree: to.keyRelation?.degree,
      };
    }));
  }

  function score(previous, next, fromChord, toChord) {
    const movements = describeMovement(previous, next, fromChord, toChord);
    return {
      movements,
      totalMovement: movements.reduce((sum, item) => sum + item.distance, 0),
      maximumMovement: Math.max(...movements.map(({ distance }) => distance)),
    };
  }

  function rankCandidates(context, previous, fromChord, toChord) {
    return freeze(candidates(context, toChord)
      .map((candidate) => ({ ...candidate, ...score(previous, candidate, fromChord, toChord) }))
      .sort((left, right) => left.totalMovement - right.totalMovement
        || left.maximumMovement - right.maximumMovement
        || compareNumbers(left.frets, right.frets)));
  }

  function chooseStart(context, chordRef, policy) {
    const root = chordRef.chord.tones.find(({ degree }) => degree === 1);
    const third = chordRef.chord.tones.find(({ degree }) => degree === 3);
    if (!root || !third) throw new Error("Starting chord lacks a root or third");
    const filtered = candidates(context, chordRef).filter((candidate) => {
      const bass = candidate.notes[0];
      const repeated = candidate.notes.filter(({ pitchClass }) => pitchClass === policy.duplicate.pitchClass).length;
      return bass.pitchClass === policy.bass.pitchClass && repeated >= 2;
    });
    const ranked = filtered.map((candidate) => {
      const frets = candidate.frets;
      const span = Math.max(...frets) - Math.min(...frets);
      const centreDistance = frets.reduce((sum, fret) => sum + Math.abs(fret - policy.centre), 0);
      return { ...candidate, span, centreDistance };
    }).sort((left, right) => left.span - right.span
      || left.centreDistance - right.centreDistance
      || compareNumbers(left.frets, right.frets));
    if (!ranked[0]) throw new Error("No compact engine-derived starting voicing satisfies the lesson constraints");
    return ranked[0];
  }

  function makeContext(id, tonic, fretRange, centre, transfer) {
    const key = { tonic: { letter: tonic, accidental: 0 }, mode: "major" };
    const triads = getHarmony({ key, chordSize: "triad" });
    const sevenths = getHarmony({ key, chordSize: "seventh" });
    const home = harmonyChord(triads, 1);
    const departure = harmonyChord(triads, 4);
    const dominant = harmonyChord(sevenths, 5);
    const start = chooseStart({ key, fretRange }, home, {
      bass: home.chord.tones[transfer ? 1 : 0],
      duplicate: home.chord.tones[transfer ? 1 : 0],
      centre,
    });
    const context = { id, key, fretRange, home, departure, dominant, start };
    const transitions = [
      { id: `${id}-iv`, fromChord: home, toChord: departure },
      { id: `${id}-v7`, fromChord: departure, toChord: dominant },
      { id: `${id}-i`, fromChord: dominant, toChord: home },
    ];
    return freeze({ ...context, transitions });
  }

  const contexts = freeze({
    g: makeContext("g", "G", { minFret: 2, maxFret: 10 }, 4, false),
    a: makeContext("a", "A", { minFret: 7, maxFret: 14 }, 10, true),
  });

  function noteAt(context, chordRef, stringIndex, fret) {
    return getNoteAtFret({
      key: context.key,
      chord: chordRef.chord,
      stringIndex,
      fret,
    });
  }

  function inspectSelection(context, chordRef, frets) {
    if (!Array.isArray(frets) || frets.length !== ACTIVE_STRINGS.length
      || frets.some((fret) => !Number.isInteger(fret) || fret < context.fretRange.minFret || fret > context.fretRange.maxFret)) {
      throw new Error("Select one in-range integer fret on every active string");
    }
    const notes = ACTIVE_STRINGS.map((stringIndex, index) => noteAt(context, chordRef, stringIndex, frets[index]));
    return { frets: [...frets], notes };
  }

  function evaluate(contextId, transitionIndex, previous, frets) {
    const context = contexts[contextId];
    const transition = context?.transitions[transitionIndex];
    if (!context || !transition) throw new Error("Unknown lesson transition");
    const selected = inspectSelection(context, transition.toChord, frets);
    const required = requiredPitchClasses(transition.toChord.chord);
    const selectedPitchClasses = new Set(selected.notes.map(({ pitchClass }) => pitchClass));
    const nonChordNotes = selected.notes.filter(({ pitchClass }) => !required.includes(pitchClass));
    const missingTones = transition.toChord.chord.tones.filter(({ pitchClass }) => !selectedPitchClasses.has(pitchClass));
    if (nonChordNotes.length > 0 || missingTones.length > 0) {
      return freeze({
        kind: "invalid-chord",
        harmonyCorrect: false,
        efficient: false,
        selected,
        nonChordNotes,
        missingTones,
      });
    }
    const ranking = rankCandidates(context, previous, transition.fromChord, transition.toChord);
    const movement = score(previous, selected, transition.fromChord, transition.toChord);
    const minimumMovement = ranking[0].totalMovement;
    return freeze({
      kind: movement.totalMovement === minimumMovement ? "valid-nearest" : "valid-distant",
      harmonyCorrect: true,
      efficient: movement.totalMovement === minimumMovement,
      selected,
      ...movement,
      minimumMovement,
      nearest: ranking[0],
    });
  }

  function hints(contextId, transitionIndex, previous) {
    const context = contexts[contextId];
    const transition = context?.transitions[transitionIndex];
    if (!context || !transition) throw new Error("Unknown lesson transition");
    const nearest = rankCandidates(context, previous, transition.fromChord, transition.toChord)[0];
    const commonPitchClasses = new Set(transition.fromChord.chord.tones.map(({ pitchClass }) => pitchClass));
    const commonNotes = transition.toChord.chord.tones
      .filter(({ pitchClass }) => commonPitchClasses.has(pitchClass))
      .map(({ note }) => formatNote(note));
    return freeze([
      { level: 1, text: commonNotes.length ? `Common chord tone${commonNotes.length === 1 ? "" : "s"}: ${commonNotes.join(", ")}.` : "These chords share no structural chord tone." },
      { level: 2, text: `Stationary string${nearest.movements.filter(({ distance }) => distance === 0).length === 1 ? "" : "s"}: ${nearest.movements.filter(({ distance }) => distance === 0).map(({ stringNumber }) => stringNumber).join(", ") || "none"}.` },
      { level: 3, text: `Directions: ${nearest.movements.map(({ stringNumber, direction }) => `string ${stringNumber} ${direction}`).join("; ")}.` },
      { level: 4, text: `Nearby voicing: ${nearest.notes.map(({ position, name }) => `string ${6 - position.stringIndex} fret ${position.fret} (${name.replace(/\d+$/, "")})`).join("; ")}.`, voicing: nearest },
    ]);
  }

  const leadingTone = (context) => {
    const from = context.dominant.chord.tones.find(({ degree }) => degree === 3);
    const to = context.home.chord.tones.find(({ degree }) => degree === 1);
    if (!from || !to) throw new Error("The lesson requires the dominant third and tonic root");
    return freeze({ from, to, interval: getInterval({
      from: { note: from.note, octave: 4 },
      to: { note: to.note, octave: 4 },
    }) });
  };

  return freeze({
    activeStrings: ACTIVE_STRINGS,
    contexts,
    leadingTones: { g: leadingTone(contexts.g), a: leadingTone(contexts.a) },
    reflection: {
      connectionOptions: ["More connected", "About the same", "Less connected", "Not sure"],
      strategyOptions: ["Remembering the G-major physical pattern", "Calculating note names", "Looking for common tones", "Looking for the nearest fret", "Hearing where a voice wanted to move", "A mixture of these", "Not sure"],
    },
    evaluate,
    hints,
    rankCandidates,
    describeMovement,
  });
}
