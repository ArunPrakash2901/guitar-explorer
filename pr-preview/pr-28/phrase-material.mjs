// Shared display helpers. Musical material is resolved by scenario-resolver.mjs.
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
