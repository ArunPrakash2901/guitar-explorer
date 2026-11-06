import { assertInteger, assertRecord, MusicError } from "./errors.js?ge-revision=0adeacc19454ed0e23f4e065189869d63d838446";
export const NOTE_LETTERS = Object.freeze(["C", "D", "E", "F", "G", "A", "B"]);
export const NATURAL_PITCH_CLASSES = Object.freeze({
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
});
// Numeric accidentals are not limited to doubles. Text still needs a finite
// resource budget so malformed external requests cannot allocate huge strings.
const MAX_ACCIDENTAL_SYMBOLS = 4096;
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export function validateNote(value) {
    assertRecord(value, "Note");
    if (typeof value.letter !== "string" || !Object.hasOwn(NATURAL_PITCH_CLASSES, value.letter)) {
        throw new MusicError("INVALID_INPUT", "Note letter must be A, B, C, D, E, F or G");
    }
    assertInteger(value.accidental, "Note accidental");
}
export function validatePitch(value) {
    assertRecord(value, "Pitch");
    validateNote(value.note);
    assertInteger(value.octave, "Pitch octave");
}
export function mod12(value) {
    assertInteger(value, "Semitone value");
    return ((value % 12 + 12) % 12);
}
export function parseNote(text) {
    if (typeof text !== "string") {
        throw new MusicError("INVALID_INPUT", "Note name must be text");
    }
    if (text.length > MAX_ACCIDENTAL_SYMBOLS + 1) {
        throw new MusicError("UNSUPPORTED", "Note text exceeds the accidental notation budget");
    }
    const match = /^([A-G])([#b♯♭𝄪𝄫]*)$/u.exec(text);
    if (!match) {
        throw new MusicError("INVALID_INPUT", "Use a capital note letter followed by sharps or flats");
    }
    const letter = match[1];
    let accidental = 0;
    let sign = 0;
    for (const symbol of match[2]) {
        const change = symbol === "#" || symbol === "♯" ? 1 : symbol === "𝄪" ? 2 : symbol === "𝄫" ? -2 : -1;
        if (sign !== 0 && Math.sign(change) !== sign) {
            throw new MusicError("INVALID_INPUT", "Do not mix sharps and flats in one note name");
        }
        sign = Math.sign(change);
        accidental += change;
    }
    if (Math.abs(accidental) > MAX_ACCIDENTAL_SYMBOLS) {
        throw new MusicError("UNSUPPORTED", "Note text exceeds the accidental notation budget");
    }
    return Object.freeze({ letter, accidental });
}
export function formatNote(note) {
    validateNote(note);
    if (Math.abs(note.accidental) > MAX_ACCIDENTAL_SYMBOLS) {
        throw new MusicError("UNSUPPORTED", "Accidental is too large to format as repeated symbols");
    }
    return note.letter + (note.accidental < 0 ? "b" : "#").repeat(Math.abs(note.accidental));
}
export function parsePitch(text) {
    if (typeof text !== "string") {
        throw new MusicError("INVALID_INPUT", "Pitch must be text");
    }
    if (text.length > MAX_ACCIDENTAL_SYMBOLS + 32) {
        throw new MusicError("UNSUPPORTED", "Pitch text exceeds the notation budget");
    }
    const match = /^([A-G][#b♯♭𝄪𝄫]*)(-?\d+)$/u.exec(text);
    if (!match) {
        throw new MusicError("INVALID_INPUT", "Pitch must contain a note name and an integer octave, such as C#4");
    }
    const note = parseNote(match[1]);
    const octave = Number(match[2]);
    assertInteger(octave, "Pitch octave");
    return Object.freeze({ note, octave });
}
export function formatPitch(pitch) {
    validatePitch(pitch);
    return `${formatNote(pitch.note)}${pitch.octave}`;
}
export function pitchClass(note) {
    validateNote(note);
    // Reduce before addition: even a safe accidental can overflow when a natural
    // pitch-class offset is added to it directly.
    return mod12(mod12(note.accidental) + NATURAL_PITCH_CLASSES[note.letter]);
}
export function toSemitone(pitch) {
    validatePitch(pitch);
    const semitone = 12n * (BigInt(pitch.octave) + 1n)
        + BigInt(NATURAL_PITCH_CLASSES[pitch.note.letter]) + BigInt(pitch.note.accidental);
    const result = Number(semitone);
    assertInteger(result, "Sounding semitone");
    return result;
}
export function pitchFromSemitone(semitone, preference = "sharps") {
    assertInteger(semitone, "Sounding semitone");
    if (preference !== "sharps" && preference !== "flats") {
        throw new MusicError("INVALID_INPUT", "Spelling preference must be sharps or flats");
    }
    const pc = mod12(semitone);
    const note = parseNote((preference === "sharps" ? SHARP_NAMES : FLAT_NAMES)[pc]);
    // Removing the positive remainder first gives exact floor division for
    // negative semitone numbers as well as the usual MIDI-like range.
    const octave = Number((BigInt(semitone) - BigInt(pc)) / 12n - 1n);
    return Object.freeze({ note, octave });
}