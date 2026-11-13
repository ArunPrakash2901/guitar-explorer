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
export type ScaleId =
  | "major"
  | "naturalMinor"
  | "harmonicMinor"
  | "melodicMinorAscending"
  | "majorPentatonic"
  | "minorPentatonic"
  | "majorBlues"
  | "minorBlues"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian";
export type ChordId =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "power5"
  | "major6"
  | "minor6"
  | "major6Add9"
  | "minor6Add9"
  | "major7"
  | "dominant7"
  | "minor7"
  | "minorMajor7"
  | "halfDiminished7"
  | "diminished7"
  | "augmentedMajor7"
  | "add9"
  | "minorAdd9"
  | "add11"
  | "minorAdd11"
  | "major9"
  | "dominant9"
  | "minor9"
  | "major11"
  | "dominant11"
  | "minor11"
  | "major13"
  | "dominant13"
  | "minor13"
  | "dominant7Flat5"
  | "dominant7Sharp5"
  | "dominant7Flat9"
  | "dominant7Sharp9";
export type ChordFamilyId =
  | "triads"
  | "suspended"
  | "powerOpen"
  | "sixth"
  | "seventh"
  | "addedTone"
  | "ninth"
  | "eleventh"
  | "thirteenth"
  | "alteredDominant";
export type ChordCatalogMetadata = Readonly<{
  id: ChordId;
  family: ChordFamilyId;
  displayName: string;
  symbol: string;
}>;
export type ChordCatalogEntry = ChordCatalogMetadata & Readonly<{ formula: Formula }>;
export type ChordFamily = Readonly<{
  id: ChordFamilyId;
  displayName: string;
  chords: readonly ChordCatalogEntry[];
}>;
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
