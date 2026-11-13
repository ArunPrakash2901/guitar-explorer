import { buildChord } from "../engine/core/collections.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { toSemitone } from "../engine/core/pitch.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
import { findLocations, STANDARD_FRETBOARD } from "../engine/guitar/fretboard.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";
export const TRIAD_QUALITIES = ["major", "minor", "diminished", "augmented"];
export const STRING_SETS = [1, 2, 3, 4];
export function spellChordLocation(chord, location) {
    const tone = chord.tones.find(({ pitchClass }) => pitchClass === location.pitchClass);
    if (!tone)
        throw new Error("Guitar location must sound a chord tone");
    const octave = (location.semitone - toSemitone({ note: tone.note, octave: 0 })) / 12;
    return { ...location.position, semitone: location.semitone, pitchClass: location.pitchClass,
        pitch: { note: tone.note, octave }, tone };
}
export function triadShapes(root, quality, topString) {
    if (!TRIAD_QUALITIES.includes(quality) || !STRING_SETS.includes(topString)) {
        throw new RangeError("Choose a triad quality and one of the four string sets");
    }
    const chord = buildChord({ root, chordId: quality });
    const topIndex = 6 - topString;
    const stringIndices = [topIndex - 2, topIndex - 1, topIndex];
    const locations = findLocations({ board: STANDARD_FRETBOARD, stringIndices,
        pitchClasses: chord.tones.map(({ pitchClass }) => pitchClass),
    }).map((location) => spellChordLocation(chord, location));
    const [low, middle, high] = stringIndices.map((index) => locations.filter(({ stringIndex }) => stringIndex === index));
    const shapes = [];
    for (const bass of low) {
        for (const inner of middle) {
            for (const treble of high) {
                const notes = [bass, inner, treble];
                if (new Set(notes.map(({ tone }) => tone.degree)).size !== 3 ||
                    bass.semitone >= inner.semitone || inner.semitone >= treble.semitone)
                    continue;
                const stopped = notes.map(({ fret }) => fret).filter(Boolean);
                const lowestFret = stopped.length ? Math.min(...stopped) : 1;
                const highestFret = stopped.length ? Math.max(...stopped) : 1;
                const span = highestFret - lowestFret;
                if (span > 3 || (notes.some(({ fret }) => fret === 0) && highestFret > 4))
                    continue;
                const fingers = Array.from({ length: 6 }, () => null);
                const frets = Array.from({ length: 6 }, () => null);
                // Use separate fingers on each stopped string, in fret then string order.
                // These are proposals for the player to try, including on same-fret pairs.
                const fingerNumbers = [1, 2, 3];
                notes.filter(({ fret }) => fret > 0).sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex)
                    .forEach(({ stringIndex }, index) => { fingers[stringIndex] = fingerNumbers[index]; });
                for (const { stringIndex, fret } of notes)
                    frets[stringIndex] = fret;
                const inversion = chord.tones.indexOf(bass.tone);
                shapes.push({ id: notes.map(({ fret }) => fret).join("-"), notes, inversion,
                    voicing: { shapeFamily: "triad", frets, fingers, barres: [], lowestFret, highestFret },
                    position: Math.min(...notes.map(({ fret }) => fret)), span });
            }
        }
    }
    // For duplicate bass positions prefer the smaller reach before moving up the neck.
    shapes.sort((a, b) => a.span - b.span || a.position - b.position);
    const bassFrets = new Set();
    const connected = shapes.filter(({ notes: [bass] }) => {
        if (bassFrets.has(bass.fret))
            return false;
        bassFrets.add(bass.fret);
        return true;
    });
    connected.sort((a, b) => a.position - b.position || a.notes[0].fret - b.notes[0].fret);
    return { chord, shapes: connected.slice(0, 4) };
}