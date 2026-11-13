// Bounded material preparation above musical truth, independent of DOM/audio.
export const MATERIAL_VERSION = 1;
export const PRACTICE_REGION = Object.freeze({ minFret: 0, maxFret: 3 });
const key = ({ stringIndex, fret }) => stringIndex + ":" + fret;
const unwrap = (result) => {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export function intervalMaterials({ quality, availablePositions, queries }) {
  if (!["major", "minor"].includes(quality)) throw new RangeError("Choose major or minor thirds");
  if (!Array.isArray(availablePositions)) throw new TypeError("Explicit sampled-position coverage is required");
  const coverage = new Set(availablePositions.map(key));
  const locations = unwrap(queries.getFretboardLocations({ fretRange: PRACTICE_REGION }));
  const playable = locations.filter((note) => coverage.has(key(note.position)));
  const materials = [];
  for (const root of playable) {
    for (const target of playable) {
      const interval = unwrap(queries.getInterval({ from: root.pitch, to: target.pitch }));
      if (interval.number !== 3 || interval.quality !== quality || interval.direction !== "ascending") continue;
      const chord = unwrap(queries.getChord({ root: root.pitch.note, chordId: quality }));
      const third = chord.tones.find((tone) => tone.degree === 3);
      if (!third || third.pitchClass !== target.pitchClass) throw new Error("Interval/chord query disagreement");
      materials.push(Object.freeze({
        id: quality + ":" + key(root.position) + ">" + key(target.position),
        root, target, interval, chord,
        region: PRACTICE_REGION,
        choices: Object.freeze(locations.filter((note) => note.position.stringIndex === target.position.stringIndex)),
      }));
    }
  }
  return Object.freeze(materials);
}

// One local recipe family, not an exercise language or a second theory engine.
export function composeIntervalSession({ quality, seed, availablePositions, queries }) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("Session seed must be a non-negative safe integer");
  const materials = intervalMaterials({ quality, availablePositions, queries });
  const starts = materials.filter((item) => materials.some((other) =>
    other.root.name !== item.root.name && other.root.pitchClass === item.root.pitchClass));
  if (!starts.length) throw new RangeError("Not enough recorded positions for a register variation");
  const first = starts[seed % starts.length];
  const variation = materials.find((item) =>
    item.root.pitchClass === first.root.pitchClass && item.root.name !== first.root.name);
  const transfers = materials.filter((item) => item.root.pitchClass !== first.root.pitchClass);
  if (!transfers.length) throw new RangeError("Not enough recorded positions for a fresh-root transfer");
  const transfer = transfers[Math.floor(seed / starts.length) % transfers.length];
  return Object.freeze({
    version: MATERIAL_VERSION, seed, family: "interval-hunt", quality,
    rounds: Object.freeze([
      Object.freeze({ purpose: "Find", material: first }),
      Object.freeze({ purpose: "Move", material: variation }),
      Object.freeze({ purpose: "Transfer", material: transfer }),
    ]),
  });
}
