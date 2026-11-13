import { buildChord } from "../engine/core/collections.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { normalizeMusicalTime } from "../engine/core/time.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { findLocations, STANDARD_FRETBOARD } from "../engine/guitar/fretboard.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { getCagedPosition } from "./caged.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
import { spellChordLocation } from "./triads.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";
export const ARPEGGIO_QUALITIES = ["major", "minor", "major7", "minor7", "dominant7"];
export const ARPEGGIO_RHYTHMS = { quarter: 1, eighth: 2, sixteenth: 4, triplet: 3 };
function bestPath(locations, start, end) {
    const ordered = locations.filter(({ semitone }) => (start === undefined || semitone >= start) && (end === undefined || semitone <= end))
        .sort((a, b) => a.semitone - b.semitone || a.stringIndex - b.stringIndex || a.fret - b.fret);
    const paths = [];
    for (const [index, note] of ordered.entries()) {
        let best = start === undefined || note.semitone === start ? { notes: [note], cost: note.fret === 0 ? 0 : .1 } : null;
        for (let prior = 0; prior < index; prior++) {
            const path = paths[prior];
            const previous = ordered[prior];
            const crossing = note.stringIndex - previous.stringIndex;
            // Follow adjacent strings upward and keep stops in the hand position.
            if (!path || note.semitone <= previous.semitone || crossing < 0 || crossing > 2 ||
                (crossing === 0 && note.fret - previous.fret > 4))
                continue;
            const movement = crossing * 2 + Math.abs(note.fret - previous.fret) + (crossing === 2 ? 4 : 0);
            const cost = path.cost + movement;
            if (!best || path.notes.length + 1 > best.notes.length ||
                (path.notes.length + 1 === best.notes.length && cost < best.cost)) {
                best = { notes: [...path.notes, note], cost };
            }
        }
        paths.push(best);
    }
    return paths.filter((path, index) => !!path && (end === undefined || ordered[index].semitone === end))
        .sort((a, b) => b.notes.length - a.notes.length || a.cost - b.cost)[0];
}
export function arpeggioMaterial(root, quality, family, octave) {
    if (!ARPEGGIO_QUALITIES.includes(quality))
        throw new RangeError("Choose an arpeggio quality");
    const chord = buildChord({ root, chordId: quality });
    const position = getCagedPosition(root, family, "reference");
    const locations = findLocations({ board: STANDARD_FRETBOARD,
        pitchClasses: chord.tones.map(({ pitchClass }) => pitchClass),
        fretRange: { minFret: position.fromFret, maxFret: position.toFret },
    }).map((location) => spellChordLocation(chord, location));
    const full = bestPath(locations)?.notes ?? [];
    if (!octave)
        return { chord, position, path: full, octaveAvailable: true };
    const roots = [...new Set(locations.filter(({ tone }) => tone.degree === 1).map(({ semitone }) => semitone))];
    const candidates = roots.filter((pitch) => roots.includes(pitch + 12))
        .map((pitch) => bestPath(locations, pitch, pitch + 12))
        .filter((path) => !!path && path.notes.length === chord.tones.length + 1)
        .sort((a, b) => a.cost - b.cost || a.notes[0].semitone - b.notes[0].semitone);
    return { chord, position, path: candidates[0]?.notes ?? [], octaveAvailable: candidates.length > 0 };
}
export function arpeggioEvents(path, direction, rhythm, loop = false) {
    if (!Object.hasOwn(ARPEGGIO_RHYTHMS, rhythm) || !["up", "down", "both"].includes(direction)) {
        throw new RangeError("Choose an arpeggio direction and rhythm");
    }
    const reverse = [...path].reverse();
    const notes = direction === "up" ? path : direction === "down" ? reverse :
        [...path, ...reverse.slice(1, loop ? -1 : undefined)];
    const division = ARPEGGIO_RHYTHMS[rhythm];
    const duration = normalizeMusicalTime({ numerator: 1, denominator: division });
    return notes.map((note, index) => ({ index, notes: [note],
        onset: normalizeMusicalTime({ numerator: index, denominator: division }), duration }));
}