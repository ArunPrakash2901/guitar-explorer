import { assertRecord, MusicError } from "./errors.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { describeInterval, transposeNote } from "./intervals.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
import { pitchClass, validateNote } from "./pitch.js?ge-revision=72d035b994510ff9f5662f42758107c3c7a42f5e";
function formula(tones) {
    return Object.freeze(tones.map(([degree, alteration]) => Object.freeze({ degree, alteration })));
}
export const SCALE_FORMULAS = Object.freeze({
    major: formula([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0]]),
    naturalMinor: formula([[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, -1], [7, -1]]),
    harmonicMinor: formula([[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, -1], [7, 0]]),
    melodicMinorAscending: formula([[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, 0], [7, 0]]),
    majorPentatonic: formula([[1, 0], [2, 0], [3, 0], [5, 0], [6, 0]]),
    minorPentatonic: formula([[1, 0], [3, -1], [4, 0], [5, 0], [7, -1]]),
    minorBlues: formula([[1, 0], [3, -1], [4, 0], [5, -1], [5, 0], [7, -1]]),
    dorian: formula([[1, 0], [2, 0], [3, -1], [4, 0], [5, 0], [6, 0], [7, -1]]),
    phrygian: formula([[1, 0], [2, -1], [3, -1], [4, 0], [5, 0], [6, -1], [7, -1]]),
    lydian: formula([[1, 0], [2, 0], [3, 0], [4, 1], [5, 0], [6, 0], [7, 0]]),
    mixolydian: formula([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, -1]]),
    locrian: formula([[1, 0], [2, -1], [3, -1], [4, 0], [5, -1], [6, -1], [7, -1]]),
});
export const CHORD_FORMULAS = Object.freeze({
    major: formula([[1, 0], [3, 0], [5, 0]]),
    minor: formula([[1, 0], [3, -1], [5, 0]]),
    diminished: formula([[1, 0], [3, -1], [5, -1]]),
    augmented: formula([[1, 0], [3, 0], [5, 1]]),
    sus2: formula([[1, 0], [2, 0], [5, 0]]),
    sus4: formula([[1, 0], [4, 0], [5, 0]]),
    power5: formula([[1, 0], [5, 0]]),
    major6: formula([[1, 0], [3, 0], [5, 0], [6, 0]]),
    minor6: formula([[1, 0], [3, -1], [5, 0], [6, 0]]),
    major6Add9: formula([[1, 0], [3, 0], [5, 0], [6, 0], [9, 0]]),
    minor6Add9: formula([[1, 0], [3, -1], [5, 0], [6, 0], [9, 0]]),
    major7: formula([[1, 0], [3, 0], [5, 0], [7, 0]]),
    dominant7: formula([[1, 0], [3, 0], [5, 0], [7, -1]]),
    minor7: formula([[1, 0], [3, -1], [5, 0], [7, -1]]),
    minorMajor7: formula([[1, 0], [3, -1], [5, 0], [7, 0]]),
    halfDiminished7: formula([[1, 0], [3, -1], [5, -1], [7, -1]]),
    diminished7: formula([[1, 0], [3, -1], [5, -1], [7, -2]]),
    augmentedMajor7: formula([[1, 0], [3, 0], [5, 1], [7, 0]]),
    add9: formula([[1, 0], [3, 0], [5, 0], [9, 0]]),
    minorAdd9: formula([[1, 0], [3, -1], [5, 0], [9, 0]]),
    add11: formula([[1, 0], [3, 0], [5, 0], [11, 0]]),
    minorAdd11: formula([[1, 0], [3, -1], [5, 0], [11, 0]]),
    major9: formula([[1, 0], [3, 0], [5, 0], [7, 0], [9, 0]]),
    dominant9: formula([[1, 0], [3, 0], [5, 0], [7, -1], [9, 0]]),
    minor9: formula([[1, 0], [3, -1], [5, 0], [7, -1], [9, 0]]),
    major11: formula([[1, 0], [3, 0], [5, 0], [7, 0], [9, 0], [11, 0]]),
    dominant11: formula([[1, 0], [3, 0], [5, 0], [7, -1], [9, 0], [11, 0]]),
    minor11: formula([[1, 0], [3, -1], [5, 0], [7, -1], [9, 0], [11, 0]]),
    major13: formula([[1, 0], [3, 0], [5, 0], [7, 0], [9, 0], [11, 0], [13, 0]]),
    dominant13: formula([[1, 0], [3, 0], [5, 0], [7, -1], [9, 0], [11, 0], [13, 0]]),
    minor13: formula([[1, 0], [3, -1], [5, 0], [7, -1], [9, 0], [11, 0], [13, 0]]),
    dominant7Flat5: formula([[1, 0], [3, 0], [5, -1], [7, -1]]),
    dominant7Sharp5: formula([[1, 0], [3, 0], [5, 1], [7, -1]]),
    dominant7Flat9: formula([[1, 0], [3, 0], [5, 0], [7, -1], [9, -1]]),
    dominant7Sharp9: formula([[1, 0], [3, 0], [5, 0], [7, -1], [9, 1]]),
});
const BASELINE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
function buildTone(root, tone) {
    const diatonicSteps = tone.degree - 1;
    const interval = describeInterval({
        diatonicSteps,
        semitones: BASELINE_SEMITONES[diatonicSteps % 7] + 12 * Math.floor(diatonicSteps / 7) + tone.alteration,
    });
    const note = transposeNote(root, interval);
    return Object.freeze({ ...tone, note, pitchClass: pitchClass(note), interval });
}
export function buildScale(spec) {
    assertRecord(spec, "Scale specification");
    validateNote(spec.tonic);
    if (typeof spec.scaleId !== "string") {
        throw new MusicError("INVALID_INPUT", "Scale ID must be text");
    }
    if (!Object.hasOwn(SCALE_FORMULAS, spec.scaleId)) {
        throw new MusicError("UNSUPPORTED", `Unsupported scale ID: ${spec.scaleId}`);
    }
    const tonic = Object.freeze({ letter: spec.tonic.letter, accidental: spec.tonic.accidental });
    const scaleFormula = SCALE_FORMULAS[spec.scaleId];
    return Object.freeze({
        tonic,
        scaleId: spec.scaleId,
        formula: scaleFormula,
        tones: Object.freeze(scaleFormula.map((tone) => buildTone(tonic, tone))),
    });
}
export function buildChord(spec) {
    assertRecord(spec, "Chord specification");
    validateNote(spec.root);
    if (typeof spec.chordId !== "string") {
        throw new MusicError("INVALID_INPUT", "Chord ID must be text");
    }
    if (!Object.hasOwn(CHORD_FORMULAS, spec.chordId)) {
        throw new MusicError("UNSUPPORTED", `Unsupported chord ID: ${spec.chordId}`);
    }
    const root = Object.freeze({ letter: spec.root.letter, accidental: spec.root.accidental });
    const chordFormula = CHORD_FORMULAS[spec.chordId];
    return Object.freeze({
        root,
        chordId: spec.chordId,
        formula: chordFormula,
        tones: Object.freeze(chordFormula.map((tone) => buildTone(root, tone))),
    });
}