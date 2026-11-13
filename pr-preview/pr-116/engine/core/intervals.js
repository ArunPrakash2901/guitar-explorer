import { assertInteger, assertRecord, MusicError } from "./errors.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { NATURAL_PITCH_CLASSES, NOTE_LETTERS, toSemitone, validateNote, validatePitch } from "./pitch.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
const MAJOR_PERFECT_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
export function validateInterval(value) {
    assertRecord(value, "Interval");
    assertInteger(value.diatonicSteps, "Interval diatonic steps");
    assertInteger(value.semitones, "Interval semitones");
}
function safeNumber(value, name) {
    const result = Number(value);
    assertInteger(result, name);
    return result;
}
function ordinal(value) {
    const lastTwo = value % 100;
    const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
    return `${value}${suffix}`;
}
function describe(interval, forceAscendingUnison = false) {
    validateInterval(interval);
    const steps = BigInt(interval.diatonicSteps);
    const magnitude = steps < 0n ? -steps : steps;
    const number = safeNumber(magnitude + 1n, "Interval number");
    const simpleIndex = Number(magnitude % 7n);
    const baseline = BigInt(MAJOR_PERFECT_SEMITONES[simpleIndex]) + 12n * (magnitude / 7n);
    const descending = interval.diatonicSteps < 0
        || (!forceAscendingUnison && interval.diatonicSteps === 0 && interval.semitones < 0);
    const directedSemitones = BigInt(interval.semitones) * (descending ? -1n : 1n);
    const alteration = directedSemitones - baseline;
    const perfectClass = simpleIndex === 0 || simpleIndex === 3 || simpleIndex === 4;
    let quality;
    let multiplicity = 0n;
    let qualityLabel;
    if (alteration === 0n) {
        quality = perfectClass ? "perfect" : "major";
        qualityLabel = perfectClass ? "P" : "M";
    }
    else if (!perfectClass && alteration === -1n) {
        quality = "minor";
        qualityLabel = "m";
    }
    else {
        quality = alteration > 0n ? "augmented" : "diminished";
        multiplicity = alteration > 0n ? alteration : perfectClass ? -alteration : -alteration - 1n;
        const symbol = quality === "augmented" ? "A" : "d";
        qualityLabel = multiplicity <= 4n ? symbol.repeat(Number(multiplicity)) : `${symbol}(${multiplicity})`;
    }
    const qualityMultiplicity = safeNumber(multiplicity, "Interval quality multiplicity");
    const direction = interval.diatonicSteps === 0 && interval.semitones === 0
        ? "stationary" : descending ? "descending" : "ascending";
    const qualityName = qualityMultiplicity === 2 ? `Doubly ${quality}`
        : qualityMultiplicity > 2 ? `${qualityMultiplicity}-fold ${quality}`
            : quality[0].toUpperCase() + quality.slice(1);
    return Object.freeze({
        diatonicSteps: interval.diatonicSteps,
        semitones: interval.semitones,
        number,
        quality,
        qualityMultiplicity,
        direction,
        label: `${descending ? "-" : ""}${qualityLabel}${number}`,
        name: `${descending ? "Descending " : ""}${qualityName} ${ordinal(number)}`,
    });
}
export function describeInterval(interval) {
    return describe(interval);
}
export function getIntervalBetweenPitches(from, to) {
    validatePitch(from);
    validatePitch(to);
    const steps = 7n * (BigInt(to.octave) - BigInt(from.octave))
        + BigInt(NOTE_LETTERS.indexOf(to.note.letter) - NOTE_LETTERS.indexOf(from.note.letter));
    const semitones = BigInt(toSemitone(to)) - BigInt(toSemitone(from));
    return describe({
        diatonicSteps: safeNumber(steps, "Interval diatonic steps"),
        semitones: safeNumber(semitones, "Interval semitones"),
    });
}
/** Ascending written span, without collapsing enharmonic or crossed intervals. */
export function intervalBetweenNotes(from, to) {
    validateNote(from);
    validateNote(to);
    const fromIndex = NOTE_LETTERS.indexOf(from.letter);
    const toIndex = NOTE_LETTERS.indexOf(to.letter);
    const diatonicSteps = (toIndex - fromIndex + 7) % 7;
    const octave = toIndex < fromIndex ? 12n : 0n;
    const semitones = BigInt(NATURAL_PITCH_CLASSES[to.letter]) + BigInt(to.accidental) + octave
        - BigInt(NATURAL_PITCH_CLASSES[from.letter]) - BigInt(from.accidental);
    return describe({ diatonicSteps, semitones: safeNumber(semitones, "Interval semitones") }, true);
}
export function transposePitch(pitch, interval) {
    validatePitch(pitch);
    validateInterval(interval);
    const writtenPosition = BigInt(pitch.octave) * 7n + BigInt(NOTE_LETTERS.indexOf(pitch.note.letter))
        + BigInt(interval.diatonicSteps);
    const letterIndex = Number((writtenPosition % 7n + 7n) % 7n);
    const octaveBig = (writtenPosition - BigInt(letterIndex)) / 7n;
    const octave = safeNumber(octaveBig, "Transposed pitch octave");
    const letter = NOTE_LETTERS[letterIndex];
    const sounding = BigInt(toSemitone(pitch)) + BigInt(interval.semitones);
    safeNumber(sounding, "Transposed sounding semitone");
    const accidental = safeNumber(sounding - 12n * (octaveBig + 1n) - BigInt(NATURAL_PITCH_CLASSES[letter]), "Transposed accidental");
    return Object.freeze({ note: Object.freeze({ letter, accidental }), octave });
}
export function transposeNote(note, interval) {
    validateNote(note);
    return transposePitch({ note, octave: 4 }, interval).note;
}
export function negateInterval(interval) {
    validateInterval(interval);
    return Object.freeze({ diatonicSteps: -interval.diatonicSteps || 0, semitones: -interval.semitones || 0 });
}
/** Octave complement. Compound reduction and descending inversion are explicit exclusions. */
export function invertSimpleInterval(interval) {
    validateInterval(interval);
    if (interval.diatonicSteps < 0 || interval.diatonicSteps > 7 || interval.semitones < 0 || interval.semitones > 12) {
        throw new MusicError("INVALID_INPUT", "Inversion requires an ascending simple interval within one octave");
    }
    return describe({ diatonicSteps: 7 - interval.diatonicSteps, semitones: 12 - interval.semitones });
}