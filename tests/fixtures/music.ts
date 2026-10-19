/** Fixed musical references from the v0.2 prototype and written test matrix. */
export const majorScales = [
  { tonic: "C", notes: ["C", "D", "E", "F", "G", "A", "B"] },
  { tonic: "A", notes: ["A", "B", "C#", "D", "E", "F#", "G#"] },
  { tonic: "Bb", notes: ["Bb", "C", "D", "Eb", "F", "G", "A"] },
  { tonic: "Eb", notes: ["Eb", "F", "G", "Ab", "Bb", "C", "D"] },
  { tonic: "F#", notes: ["F#", "G#", "A#", "B", "C#", "D#", "E#"] },
  { tonic: "C#", notes: ["C#", "D#", "E#", "F#", "G#", "A#", "B#"] },
  { tonic: "G#", notes: ["G#", "A#", "B#", "C#", "D#", "E#", "F##"] },
] as const;

export const majorTriads = [
  { root: "C", notes: ["C", "E", "G"] },
  { root: "A", notes: ["A", "C#", "E"] },
  { root: "Bb", notes: ["Bb", "D", "F"] },
  { root: "Eb", notes: ["Eb", "G", "Bb"] },
  { root: "F#", notes: ["F#", "A#", "C#"] },
  { root: "C#", notes: ["C#", "E#", "G#"] },
] as const;

/** Distinguishing spellings is essential even when chromatic distances agree. */
export const spelledIntervals = [
  { from: "A3", to: "A3", steps: 0, semitones: 0, number: 1, quality: "perfect" },
  { from: "A3", to: "C4", steps: 2, semitones: 3, number: 3, quality: "minor" },
  { from: "A3", to: "C#4", steps: 2, semitones: 4, number: 3, quality: "major" },
  { from: "A3", to: "D4", steps: 3, semitones: 5, number: 4, quality: "perfect" },
  { from: "A3", to: "E4", steps: 4, semitones: 7, number: 5, quality: "perfect" },
  { from: "C4", to: "B4", steps: 6, semitones: 11, number: 7, quality: "major" },
  { from: "C4", to: "F#4", steps: 3, semitones: 6, number: 4, quality: "augmented" },
  { from: "C4", to: "Gb4", steps: 4, semitones: 6, number: 5, quality: "diminished" },
  { from: "A3", to: "B#3", steps: 1, semitones: 3, number: 2, quality: "augmented" },
  { from: "C4", to: "C5", steps: 7, semitones: 12, number: 8, quality: "perfect" },
  { from: "C4", to: "D5", steps: 8, semitones: 14, number: 9, quality: "major" },
  { from: "E4", to: "C4", steps: -2, semitones: -4, number: 3, quality: "major" },
  { from: "C5", to: "C4", steps: -7, semitones: -12, number: 8, quality: "perfect" },
] as const;
