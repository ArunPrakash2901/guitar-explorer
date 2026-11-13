import { formatNote, parseNote, pitchClass } from "../engine/core/pitch.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { getNoteAt, STANDARD_FRETBOARD } from "../engine/guitar/fretboard.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
const x = null;
// Finger numbers are proposed positions from index (1) through pinky (4).
// A repeated number at the same fret denotes a full or partial barre.
const OPEN_GRIPS = [
    ["C", "major", [[x, 3, 2, 0, 1, 0], [x, 3, 2, x, 1, x]]],
    ["A", "major", [[x, 0, 2, 2, 2, 0], [x, x, 1, 2, 3, x]]],
    ["G", "major", [[3, 2, 0, 0, 0, 3], [2, 1, x, x, x, 3]]],
    ["E", "major", [[0, 2, 2, 1, 0, 0], [x, 2, 3, 1, x, x]]],
    ["D", "major", [[x, x, 0, 2, 3, 2], [x, x, x, 1, 3, 2]]],
    ["A", "minor", [[x, 0, 2, 2, 1, 0], [x, x, 2, 3, 1, x]]],
    ["E", "minor", [[0, 2, 2, 0, 0, 0], [x, 2, 3, x, x, x]]],
    ["D", "minor", [[x, x, 0, 2, 3, 1], [x, x, x, 2, 3, 1]]],
    ["C", "major7", [[x, 3, 2, 0, 0, 0], [x, 3, 2, x, x, x]]],
    ["A", "major7", [[x, 0, 2, 1, 2, 0], [x, x, 2, 1, 3, x]]],
    ["E", "major7", [[0, 2, 1, 1, 0, 0], [x, 3, 1, 2, x, x]]],
    ["D", "major7", [[x, x, 0, 2, 2, 2], [x, x, x, 1, 1, 1]]],
    ["G", "dominant7", [[3, 2, 0, 0, 0, 1], [3, 2, x, x, x, 1]]],
    ["C", "dominant7", [[x, 3, 2, 3, 1, 0], [x, 3, 2, 4, 1, x]]],
    ["A", "dominant7", [[x, 0, 2, 0, 2, 0], [x, x, 2, x, 3, x]]],
    ["E", "dominant7", [[0, 2, 0, 1, 0, 0], [x, 2, x, 1, x, x]]],
    ["D", "dominant7", [[x, x, 0, 2, 1, 2], [x, x, x, 2, 1, 3]]],
    ["A", "minor7", [[x, 0, 2, 0, 1, 0], [x, x, 2, x, 1, x]]],
    ["E", "minor7", [[0, 2, 0, 0, 0, 0], [x, 2, x, x, x, x]]],
    ["D", "minor7", [[x, x, 0, 2, 1, 1], [x, x, x, 2, 1, 1]]],
    ["A", "sus2", [[x, 0, 2, 2, 0, 0], [x, x, 1, 2, x, x]]],
    ["D", "sus2", [[x, x, 0, 2, 3, 0], [x, x, x, 1, 3, x]]],
    ["A", "sus4", [[x, 0, 2, 2, 3, 0], [x, x, 1, 2, 3, x]]],
    ["E", "sus4", [[0, 2, 2, 2, 0, 0], [x, 2, 3, 4, x, x]]],
    ["D", "sus4", [[x, x, 0, 2, 3, 3], [x, x, x, 1, 3, 4]]],
    ["A", "dominant7Sus4", [[x, 0, 2, 0, 3, 0], [x, x, 1, x, 3, x]]],
    ["C", "add9", [[x, 3, 2, 0, 3, 3], [x, 2, 1, x, 3, 4]]],
    ["G", "add9", [[3, 2, 0, 2, 0, 3], [3, 1, x, 2, x, 4]]],
    ["A", "add9", [[x, 0, 2, 4, 2, 0], [x, x, 1, 4, 2, x]]],
];
// Offsets from the lowest fretted position. The reference root string can
// be above the bass on inverted grips.
const MOVABLE_GRIPS = [
    ["major", "e-barre", 0, [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]]],
    ["minor", "e-barre", 0, [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]]],
    ["major", "a-barre", 1, [[x, 0, 2, 2, 2, 0], [x, 1, 3, 3, 3, 1]]],
    ["minor", "a-barre", 1, [[x, 0, 2, 2, 1, 0], [x, 1, 3, 4, 2, 1]]],
    ["major7", "e-barre", 0, [[0, 2, 1, 1, 0, 0], [1, 4, 2, 3, 1, 1]]],
    ["major7", "a-barre", 1, [[x, 0, 2, 1, 2, 0], [x, 1, 3, 2, 4, 1]]],
    ["dominant7", "e-barre", 0, [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]]],
    ["dominant7", "a-barre", 1, [[x, 0, 2, 0, 2, 0], [x, 1, 3, 1, 4, 1]]],
    ["minor7", "e-barre", 0, [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]]],
    ["minor7", "a-barre", 1, [[x, 0, 2, 0, 1, 0], [x, 1, 3, 1, 2, 1]]],
    ["sus2", "a-barre", 1, [[x, 0, 2, 2, 0, 0], [x, 1, 3, 4, 1, 1]]],
    ["sus4", "a-barre", 1, [[x, 0, 2, 2, 3, 0], [x, 1, 3, 3, 4, 1]]],
    ["sus4", "e-barre", 0, [[0, 2, 2, 2, 0, 0], [1, 3, 3, 3, 1, 1]]],
    ["dominant7Sus4", "a-barre", 1, [[x, 0, 2, 0, 3, 0], [x, 1, 3, 1, 4, 1]]],
    ["diminished", "compact", 1, [[x, 0, 1, 2, 1, x], [x, 1, 2, 4, 3, x]]],
    ["halfDiminished7", "compact", 1, [[x, 0, 1, 0, 1, x], [x, 1, 3, 2, 4, x]]],
    ["diminished7", "compact", 1, [[x, 1, 2, 0, 2, x], [x, 2, 3, 1, 4, x]]],
    ["add9", "compact", 1, [[x, 3, 2, 0, 3, x], [x, 3, 2, 1, 4, x]]],
    ["augmented", "compact", 3, [[x, x, x, 1, 1, 0], [x, x, x, 2, 3, 1]]],
    ["augmented", "compact", 1, [[x, 2, 1, 0, x, x], [x, 3, 2, 1, x, x]]],
    ["minorMajor7", "compact", 1, [[x, 0, 2, 1, 1, x], [x, 1, 4, 2, 3, x]]],
    ["augmentedMajor7", "compact", 0, [[0, x, 1, 1, 1, x], [1, x, 2, 3, 4, x]]],
    ["major6", "compact", 3, [[x, x, 0, 0, 0, 0], [x, x, 1, 1, 1, 1]]],
    ["minor6", "compact", 3, [[x, x, 1, 1, 0, 1], [x, x, 2, 3, 1, 4]]],
    ["major6Add9", "compact", 3, [[x, 0, 0, 0, 0, 0], [x, 1, 1, 1, 1, 1]]],
    ["minor6Add9", "compact", 2, [[1, x, 0, 2, 0, 0], [2, x, 1, 4, 1, 1]]],
    ["minorAdd9", "compact", 3, [[x, 1, 1, 1, 0, x], [x, 2, 3, 4, 1, x]]],
    ["add11", "compact", 0, [[0, 0, x, 1, 0, x], [1, 2, x, 4, 3, x]]],
    ["minorAdd11", "compact", 1, [[x, 0, 0, x, 1, 0], [x, 1, 2, x, 4, 3]]],
    ["major9", "compact", 3, [[x, 0, 0, 0, 0, 2], [x, 1, 1, 1, 1, 3]]],
    ["dominant9", "compact", 0, [[1, 0, 1, 0, 1, x], [2, 1, 3, 1, 4, x]]],
    ["minor9", "compact", 2, [[0, 0, 0, x, 1, 1], [1, 1, 1, x, 3, 4]]],
    ["major7Sharp11", "compact", 1, [[x, 0, 1, 1, 2, 0], [x, 1, 2, 3, 4, 1]]],
    ["dominant7Flat5", "compact", 0, [[0, 1, 0, 1, x, x], [1, 3, 2, 4, x, x]]],
    ["dominant7Sharp5", "compact", 0, [[0, x, 0, 1, 1, x], [1, x, 2, 3, 4, x]]],
    ["major", "triad", 2, [[x, x, 2, 1, 0, x], [x, x, 3, 2, 1, x]]],
    ["minor", "triad", 2, [[x, x, 2, 0, 0, x], [x, x, 3, 1, 1, x]]],
    ["major", "triad", 5, [[x, x, x, 1, 0, 0], [x, x, x, 2, 1, 1]]],
    ["minor", "triad", 5, [[x, x, x, 0, 0, 0], [x, x, x, 1, 1, 1]]],
    ["major", "triad", 4, [[x, x, x, 0, 1, 0], [x, x, x, 1, 2, 1]]],
    ["minor", "triad", 4, [[x, x, x, 1, 2, 0], [x, x, x, 2, 3, 1]]],
];
// Compact extended grips retain root, third, seventh and the named extension.
const SHELL_GRIPS = [
    ["major11", "compact", 0, [[0, 0, 1, 1, x, x], [1, 2, 3, 4, x, x]]],
    ["dominant11", "compact", 0, [[0, 0, 0, 1, x, x], [1, 1, 1, 3, x, x]]],
    ["minor11", "compact", 0, [[0, 0, 0, 0, x, x], [1, 1, 1, 1, x, x]]],
    ["major13", "compact", 1, [[x, 0, x, 1, 2, 2], [x, 1, x, 2, 3, 4]]],
    ["dominant13", "compact", 1, [[x, 0, x, 0, 2, 2], [x, 1, x, 2, 3, 4]]],
    ["minor13", "compact", 1, [[x, 0, x, 0, 1, 2], [x, 1, x, 2, 3, 4]]],
    ["dominant7Flat9", "compact", 1, [[x, 1, 0, 1, 0, x], [x, 3, 1, 4, 2, x]]],
    ["dominant7Sharp9", "compact", 1, [[x, 1, 0, 1, 2, x], [x, 2, 1, 3, 4, x]]],
];
function construct(chord, family, frets, fingers, shell = false) {
    const expected = new Set(chord.tones.map(({ pitchClass }) => pitchClass));
    const notes = [];
    for (const [stringIndex, fret] of frets.entries()) {
        if (fret === null)
            continue;
        if (fret < 0 || fret > STANDARD_FRETBOARD.maxFret)
            return null;
        const { pitchClass, semitone } = getNoteAt(STANDARD_FRETBOARD, { stringIndex, fret });
        if (!expected.has(pitchClass))
            return null;
        notes.push(Object.freeze({ stringIndex, fret, semitone, pitchClass }));
    }
    const sounded = new Set(notes.map(({ pitchClass }) => pitchClass));
    const required = shell ? [1, 3, 7, chord.tones.at(-1).degree] : chord.tones.map(({ degree }) => degree);
    if (!chord.tones.filter(({ degree }) => required.includes(degree)).every(({ pitchClass }) => sounded.has(pitchClass)))
        return null;
    const stopped = notes.filter(({ fret }) => fret > 0).map(({ fret }) => fret);
    const lowestFret = Math.min(...stopped);
    const highestFret = Math.max(...stopped);
    if (highestFret > (family === "open" ? 4 : lowestFret + 3))
        return null;
    if (frets.some((fret, index) => (fret !== null && fret > 0) !== (fingers[index] !== null)))
        return null;
    const barres = [];
    for (const finger of [1, 2, 3, 4]) {
        const strings = fingers.flatMap((assigned, index) => assigned === finger ? [index] : []);
        if (strings.length < 2)
            continue;
        const firstString = strings[0];
        const lastString = strings.at(-1);
        const fret = frets[firstString];
        if (strings.some((index) => frets[index] !== fret) ||
            frets.slice(firstString, lastString + 1).some((other) => other === null || other < fret))
            return null;
        barres.push(Object.freeze({ fret, finger, firstString, lastString }));
    }
    const bassPitchClass = notes.reduce((lowest, note) => note.semitone < lowest.semitone ? note : lowest).pitchClass;
    return Object.freeze({
        id: [formatNote(chord.root), chord.chordId, family, frets.map((fret) => fret ?? "x").join("-")].join(":"),
        shapeFamily: family,
        frets: Object.freeze([...frets]),
        fingers: Object.freeze([...fingers]),
        barres: Object.freeze(barres),
        notes: Object.freeze(notes),
        bassPitchClass,
        inversion: chord.tones.findIndex(({ pitchClass }) => pitchClass === bassPitchClass),
        lowestFret,
        highestFret,
    });
}
export function getPlayableVoicings(chord) {
    const rootClass = pitchClass(chord.root);
    const candidates = OPEN_GRIPS
        .filter(([root, quality]) => quality === chord.chordId && pitchClass(parseNote(root)) === rootClass)
        .map(([, , [frets, fingers]]) => construct(chord, "open", frets, fingers));
    const definitions = [...MOVABLE_GRIPS, ...SHELL_GRIPS].filter(([quality]) => quality === chord.chordId);
    const alternatives = [];
    for (let fret = 1; fret <= 12; fret += 1) {
        for (const definition of definitions) {
            const [, family, rootString, [offsets, fingers]] = definition;
            const position = getNoteAt(STANDARD_FRETBOARD, { stringIndex: rootString, fret: fret + offsets[rootString] });
            if (position.pitchClass !== rootClass)
                continue;
            const frets = offsets.map((offset) => offset === null ? null : fret + offset);
            const voicing = construct(chord, family, frets, fingers, SHELL_GRIPS.includes(definition));
            if (family === "triad")
                alternatives.push(voicing);
            else
                candidates.push(voicing);
        }
    }
    return Object.freeze([...candidates, ...alternatives].filter((grip) => grip !== null));
}
export function chordDiagramModel(voicing) {
    const baseFret = voicing.shapeFamily === "open" ? 1 : Math.max(1, voicing.lowestFret);
    if (voicing.highestFret > baseFret + 3)
        throw new RangeError("A voicing exceeds the four-fret diagram window");
    const strings = voicing.frets.map((fret, stringIndex) => Object.freeze({
        stringIndex,
        fret,
        finger: voicing.fingers[stringIndex],
        state: fret === null ? "muted" : fret === 0 ? "open" : "fretted",
        diagramRow: fret === null || fret === 0 ? null : fret - baseFret + 1,
    }));
    const barres = voicing.barres.map((barre) => Object.freeze({ ...barre, diagramRow: barre.fret - baseFret + 1 }));
    return Object.freeze({ baseFret, fretCount: 4, strings: Object.freeze(strings), barres: Object.freeze(barres) });
}