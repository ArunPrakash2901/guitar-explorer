import { CHORD_FORMULAS } from "./collections.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
const CHORD_FAMILY_METADATA = Object.freeze([
    Object.freeze({ id: "triads", displayName: "Triads" }),
    Object.freeze({ id: "suspended", displayName: "Suspended" }),
    Object.freeze({ id: "powerOpen", displayName: "Power / Open" }),
    Object.freeze({ id: "sixth", displayName: "Sixth" }),
    Object.freeze({ id: "seventh", displayName: "Seventh" }),
    Object.freeze({ id: "addedTone", displayName: "Added Tone" }),
    Object.freeze({ id: "ninth", displayName: "Ninth" }),
    Object.freeze({ id: "eleventh", displayName: "Eleventh" }),
    Object.freeze({ id: "thirteenth", displayName: "Thirteenth" }),
    Object.freeze({ id: "alteredDominant", displayName: "Altered Dominant" }),
]);
/** Presentation data only. CHORD_FORMULAS is the sole formula declaration. */
export const CHORD_CATALOG_METADATA = Object.freeze([
    Object.freeze({ id: "major", family: "triads", displayName: "Major", symbol: "" }),
    Object.freeze({ id: "minor", family: "triads", displayName: "Minor", symbol: "m" }),
    Object.freeze({ id: "diminished", family: "triads", displayName: "Diminished", symbol: "dim" }),
    Object.freeze({ id: "augmented", family: "triads", displayName: "Augmented", symbol: "aug" }),
    Object.freeze({ id: "sus2", family: "suspended", displayName: "Suspended 2", symbol: "sus2" }),
    Object.freeze({ id: "sus4", family: "suspended", displayName: "Suspended 4", symbol: "sus4" }),
    Object.freeze({ id: "power5", family: "powerOpen", displayName: "Power 5", symbol: "5" }),
    Object.freeze({ id: "major6", family: "sixth", displayName: "Major 6", symbol: "6" }),
    Object.freeze({ id: "minor6", family: "sixth", displayName: "Minor 6", symbol: "m6" }),
    Object.freeze({ id: "major6Add9", family: "sixth", displayName: "Major 6/9", symbol: "6/9" }),
    Object.freeze({ id: "minor6Add9", family: "sixth", displayName: "Minor 6/9", symbol: "m6/9" }),
    Object.freeze({ id: "major7", family: "seventh", displayName: "Major 7", symbol: "maj7" }),
    Object.freeze({ id: "dominant7", family: "seventh", displayName: "Dominant 7", symbol: "7" }),
    Object.freeze({ id: "minor7", family: "seventh", displayName: "Minor 7", symbol: "m7" }),
    Object.freeze({ id: "minorMajor7", family: "seventh", displayName: "Minor Major 7", symbol: "m(maj7)" }),
    Object.freeze({ id: "halfDiminished7", family: "seventh", displayName: "Half-diminished 7", symbol: "m7♭5" }),
    Object.freeze({ id: "diminished7", family: "seventh", displayName: "Diminished 7", symbol: "dim7" }),
    Object.freeze({ id: "augmentedMajor7", family: "seventh", displayName: "Augmented Major 7", symbol: "aug(maj7)" }),
    Object.freeze({ id: "add9", family: "addedTone", displayName: "Add 9", symbol: "add9" }),
    Object.freeze({ id: "minorAdd9", family: "addedTone", displayName: "Minor Add 9", symbol: "m(add9)" }),
    Object.freeze({ id: "add11", family: "addedTone", displayName: "Add 11", symbol: "add11" }),
    Object.freeze({ id: "minorAdd11", family: "addedTone", displayName: "Minor Add 11", symbol: "m(add11)" }),
    Object.freeze({ id: "major9", family: "ninth", displayName: "Major 9", symbol: "maj9" }),
    Object.freeze({ id: "dominant9", family: "ninth", displayName: "Dominant 9", symbol: "9" }),
    Object.freeze({ id: "minor9", family: "ninth", displayName: "Minor 9", symbol: "m9" }),
    Object.freeze({ id: "major11", family: "eleventh", displayName: "Major 11", symbol: "maj11" }),
    Object.freeze({ id: "dominant11", family: "eleventh", displayName: "Dominant 11", symbol: "11" }),
    Object.freeze({ id: "minor11", family: "eleventh", displayName: "Minor 11", symbol: "m11" }),
    Object.freeze({ id: "major13", family: "thirteenth", displayName: "Major 13", symbol: "maj13" }),
    Object.freeze({ id: "dominant13", family: "thirteenth", displayName: "Dominant 13", symbol: "13" }),
    Object.freeze({ id: "minor13", family: "thirteenth", displayName: "Minor 13", symbol: "m13" }),
    Object.freeze({ id: "dominant7Flat5", family: "alteredDominant", displayName: "Dominant 7 Flat 5", symbol: "7♭5" }),
    Object.freeze({ id: "dominant7Sharp5", family: "alteredDominant", displayName: "Dominant 7 Sharp 5", symbol: "7♯5" }),
    Object.freeze({ id: "dominant7Flat9", family: "alteredDominant", displayName: "Dominant 7 Flat 9", symbol: "7♭9" }),
    Object.freeze({ id: "dominant7Sharp9", family: "alteredDominant", displayName: "Dominant 7 Sharp 9", symbol: "7♯9" }),
]);
export function buildChordCatalog() {
    return Object.freeze(CHORD_FAMILY_METADATA.map((family) => {
        const chords = Object.freeze(CHORD_CATALOG_METADATA
            .filter((entry) => entry.family === family.id)
            .map((entry) => Object.freeze({ ...entry, formula: CHORD_FORMULAS[entry.id] })));
        return Object.freeze({ ...family, chords });
    }));
}