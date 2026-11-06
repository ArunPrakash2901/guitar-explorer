import { buildChord, buildScale, CHORD_FORMULAS } from "./collections.js?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";
import { assertRecord, MusicError } from "./errors.js?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";
import { validateKey } from "./keys.js?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";
const ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"];
function sameNote(left, right) {
    return left.letter === right.letter && left.accidental === right.accidental;
}
/** Presentation rules for canonical qualities, never a table of harmonized keys. */
function romanDisplay(quality) {
    switch (quality) {
        case "major": return { lowercase: false, suffix: "" };
        case "minor": return { lowercase: true, suffix: "" };
        case "diminished": return { lowercase: true, suffix: "°" };
        case "augmented": return { lowercase: false, suffix: "+" };
        case "major7": return { lowercase: false, suffix: "maj7" };
        case "dominant7": return { lowercase: false, suffix: "7" };
        case "minor7": return { lowercase: true, suffix: "7" };
        case "minorMajor7": return { lowercase: true, suffix: "maj7" };
        case "halfDiminished7": return { lowercase: true, suffix: "ø7" };
        case "diminished7": return { lowercase: true, suffix: "°7" };
        default: throw new Error(`Unsupported quality produced by major/natural-minor harmony: ${quality}`);
    }
}
function romanIdentity(degree, quality) {
    const display = romanDisplay(quality);
    const numeral = ROMAN_DEGREES[degree - 1];
    return Object.freeze({
        degree,
        quality,
        label: `${display.lowercase ? numeral.toLowerCase() : numeral}${display.suffix}`,
    });
}
/**
 * Match both written tones and the declared stack roles. Matching pitch classes
 * alone would lose spelling; matching tone count alone would admit added-tone
 * and sixth chords instead of the requested thirds stack.
 */
function identifyStack(notes, candidateIds) {
    const root = notes[0];
    if (!root)
        throw new Error("A diatonic stack must contain its root");
    let match;
    for (const chordId of candidateIds) {
        const candidate = buildChord({ root, chordId });
        if (!candidate.tones.every((tone, index) => sameNote(tone.note, notes[index])))
            continue;
        if (match)
            throw new Error("A diatonic stack matched multiple canonical chord formulas");
        match = candidate;
    }
    if (!match)
        throw new Error("A diatonic stack has no matching canonical chord formula");
    return match;
}
/** Derive seven triads or sevenths from a major key or its natural-minor collection. */
export function buildDiatonicHarmony(request) {
    assertRecord(request, "Diatonic harmony request");
    validateKey(request.key);
    if (typeof request.chordSize !== "string") {
        throw new MusicError("INVALID_INPUT", "chordSize must be text");
    }
    if (request.chordSize !== "triad" && request.chordSize !== "seventh") {
        throw new MusicError("UNSUPPORTED", "chordSize must be triad or seventh");
    }
    const scale = buildScale({
        tonic: request.key.tonic,
        scaleId: request.key.mode === "major" ? "major" : "naturalMinor",
    });
    const key = Object.freeze({ tonic: scale.tonic, mode: request.key.mode });
    const toneCount = request.chordSize === "triad" ? 3 : 4;
    const candidateIds = Object.keys(CHORD_FORMULAS).filter((id) => {
        const formula = CHORD_FORMULAS[id];
        return formula.length === toneCount && formula.every((tone, index) => tone.degree === 1 + 2 * index);
    });
    const degrees = scale.tones.map((_, index) => {
        const degree = (index + 1);
        const stackedNotes = Array.from({ length: toneCount }, (_, toneIndex) => scale.tones[(index + 2 * toneIndex) % scale.tones.length].note);
        const chord = identifyStack(stackedNotes, candidateIds);
        return Object.freeze({ degree, chord, romanNumeral: romanIdentity(degree, chord.chordId) });
    });
    return Object.freeze({ key, chordSize: request.chordSize, degrees: Object.freeze(degrees) });
}