function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function pitch(letter, accidental, octave) {
  return { note: { letter, accidental }, octave };
}

function samePitch(left, right) {
  return left.octave === right.octave
    && left.note.letter === right.note.letter
    && left.note.accidental === right.note.accidental;
}

export function createRoleLensMaterial({ getHarmony, getCatalog, analyseNotes, findLocations, formatNote }) {
  const catalog = getCatalog({}).flatMap(({ chords }) => chords);

  function chordReference(entry) {
    const metadata = catalog.find(({ id }) => id === entry.chord.chordId);
    if (!metadata) throw new Error("Role Lens requires chord catalogue metadata for its supplied harmony");
    return freeze({ entry, symbol: `${formatNote(entry.chord.root)}${metadata.symbol}` });
  }

  function analyse(anchor, key, chord) {
    const [analysis] = analyseNotes({
      notes: [anchor],
      context: { key, currentChord: { root: chord.entry.chord.root, chordId: chord.entry.chord.chordId } },
    });
    if (!analysis?.chordRelation) throw new Error("Role Lens requires chord-relative note analysis");
    return analysis;
  }

  function locate(anchor, key, chord) {
    return findLocations({ key, chord: chord.entry.chord, pitch: anchor })
      .filter(({ pitch: found }) => samePitch(found, anchor))
      .filter(({ position }) => position.fret <= 8);
  }

  function endingOption(target, key, chord) {
    const analysis = analyse(target, key, chord);
    if (!analysis.chordRelation.isChordTone) throw new Error("Role Lens ending options must be chord tones");
    return freeze({
      pitch: target,
      name: analysis.name,
      interval: analysis.chordRelation.interval.label,
      locations: locate(target, key, chord),
    });
  }

  function contextFor({ tonic, anchor, endings }) {
    const key = { tonic: { letter: tonic, accidental: 0 }, mode: "major" };
    const harmony = getHarmony({ key, chordSize: "seventh" });
    const degree = (number) => {
      const entry = harmony.degrees.find((item) => item.degree === number);
      if (!entry) throw new Error(`Role Lens requires scale degree ${number}`);
      return chordReference(entry);
    };
    const chords = freeze([degree(2), degree(5), degree(1)]);
    const analyses = freeze(chords.map((chord) => analyse(anchor, key, chord)));
    const anchorLocations = freeze(locate(anchor, key, chords[2]));
    const endingOptions = freeze(endings.map((target) => endingOption(target, key, chords[2])));
    return freeze({
      key,
      chords,
      anchor: {
        pitch: anchor,
        name: analyses[0].name,
        analyses,
        locations: anchorLocations,
      },
      endings: endingOptions,
    });
  }

  return freeze({
    context: contextFor({
      tonic: "G",
      anchor: pitch("C", 0, 4),
      endings: [pitch("B", 0, 3), pitch("D", 0, 4), pitch("G", 0, 4)],
    }),
    transfer: contextFor({
      tonic: "A",
      anchor: pitch("D", 0, 4),
      endings: [pitch("C", 1, 4), pitch("E", 0, 4), pitch("A", 0, 4)],
    }),
  });
}
