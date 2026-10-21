// Shared facts for two bounded Lab probes. No progression or phrase engine lives here.
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export function createPhraseMaterial({ getHarmony, getScale, getCatalog, findLocations, getNoteAtFret, getInterval, formatNote }) {
  const catalog = getCatalog({}).flatMap(({ chords }) => chords);
  const boardRange = { minFret: 0, maxFret: 12 };

  function context(tonic) {
    const key = { tonic: { letter: tonic, accidental: 0 }, mode: "major" };
    const harmony = getHarmony({ key, chordSize: "seventh" });
    const scale = getScale({ tonic: key.tonic, scaleId: "major" });
    const chords = [2, 5, 1].map((degree) => {
      const entry = harmony.degrees.find((item) => item.degree === degree);
      const metadata = catalog.find((item) => item.id === entry?.chord.chordId);
      if (!entry || !metadata) throw new Error("Curated progression is absent from harmony or catalogue");
      return { entry, chord: entry.chord, symbol: `${formatNote(entry.chord.root)}${metadata.symbol}` };
    });
    function tone(chordIndex, degree) {
      const result = chords[chordIndex].chord.tones.find((item) => item.degree === degree);
      if (!result) throw new Error("Curated target role is absent from chord");
      return result;
    }
    function scaleTone(degree) {
      const result = scale.tones.find((item) => item.degree === degree);
      if (!result) throw new Error("Curated phrase degree is absent from scale");
      return result;
    }
    function locate(note, stringIndex, preferredFret, chordIndex = 0) {
      const matches = findLocations({ key, chord: chords[chordIndex].chord,
        stringIndices: [stringIndex], fretRange: boardRange, pitchClasses: [note.pitchClass] });
      const result = [...matches].sort((a, b) => Math.abs(a.position.fret - preferredFret) - Math.abs(b.position.fret - preferredFret))[0];
      if (!result) throw new Error("Curated note has no engine-returned physical location");
      return result;
    }
    function at(chordIndex, stringIndex, fret) {
      return getNoteAtFret({ key, chord: chords[chordIndex].chord, stringIndex, fret });
    }
    const target = locate(tone(1, 3), 5, tonic === "G" ? 2 : 4, 1);
    const arrival = locate(tone(2, 1), 5, tonic === "G" ? 3 : 5, 2);
    const samePitch = locate(tone(2, 1), 5, tonic === "G" ? 3 : 5, 2);
    const sameRoles = chords.map((_, index) => at(index, samePitch.position.stringIndex, samePitch.position.fret));
    const approach = locate(scaleTone(6), 5, tonic === "G" ? 0 : 2, 1);
    const phrase = tonic === "G" ? [
      locate(scaleTone(5), 4, 3, 1), locate(scaleTone(6), 5, 0, 1), target, arrival,
    ] : [
      locate(scaleTone(5), 4, 5, 1), locate(scaleTone(6), 5, 2, 1), target, arrival,
    ];
    return { key, harmony, scale, chords, boardRange, target, arrival, samePitch, sameRoles,
      approach, phrase, tone, scaleTone, locate, at,
      targetMotion: getInterval({ from: target.pitch, to: arrival.pitch }) };
  }

  return freeze({ g: context("G"), a: context("A"), formatNote, getInterval });
}

export function chordRole(analysis) {
  const tone = analysis.chordRelation?.matchingTones[0];
  if (!tone) return "outside the chord";
  if (!analysis.chordRelation.spellingMatches) return "enharmonic chord sound (written spelling differs)";
  if (tone.degree === 1) return "root";
  if (tone.degree === 3) return "3rd";
  if (tone.degree === 5) return "5th";
  if (tone.degree === 7) return tone.alteration === -1 ? "♭7" : "major 7th";
  return `degree ${tone.degree}`;
}

export function positionOf(location) { return location.position; }

export function pathConnections(locations) {
  return locations.slice(1).map((location, index) => {
    const from = locations[index].position;
    const to = location.position;
    return { from, to, kind: from.fret === to.fret && from.stringIndex === to.stringIndex
      ? "stationary" : location.semitone > locations[index].semitone ? "up" : "down",
      label: `${index + 1}→${index + 2}` };
  });
}
