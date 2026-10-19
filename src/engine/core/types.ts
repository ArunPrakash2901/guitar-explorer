/** Sounding identity, written identity and register are deliberately separate. */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type NoteLetter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type NoteName = Readonly<{ letter: NoteLetter; accidental: number }>;
export type Pitch = Readonly<{ note: NoteName; octave: number }>;
export type Interval = Readonly<{ diatonicSteps: number; semitones: number }>;
export type IntervalQuality = "perfect" | "major" | "minor" | "augmented" | "diminished";
export type IntervalInfo = Interval & Readonly<{
  number: number;
  quality: IntervalQuality;
  qualityMultiplicity: number;
  direction: "ascending" | "descending" | "stationary";
  label: string;
  name: string;
}>;
/** Degree alterations use major/perfect intervals, independently of key mode. */
export type FormulaTone = Readonly<{ degree: number; alteration: number }>;
export type Formula = readonly FormulaTone[];
export type ScaleId = "major" | "naturalMinor";
export type ChordId = "major" | "minor" | "diminished" | "augmented";
export type ScaleSpec = Readonly<{ tonic: NoteName; scaleId: ScaleId }>;
export type ChordSpec = Readonly<{ root: NoteName; chordId: ChordId }>;
export type Tone = FormulaTone & Readonly<{
  note: NoteName;
  pitchClass: PitchClass;
  interval: IntervalInfo;
}>;
export type Scale = ScaleSpec & Readonly<{ formula: Formula; tones: readonly Tone[] }>;
export type Chord = ChordSpec & Readonly<{ formula: Formula; tones: readonly Tone[] }>;
export type Key = Readonly<{ tonic: NoteName; mode: "major" | "minor" }>;
export type HarmonicContext = Readonly<{
  key?: Key;
  activeScale?: ScaleSpec;
  currentChord?: ChordSpec;
}>;
export type SpellingPreference = "sharps" | "flats";
