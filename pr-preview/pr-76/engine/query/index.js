import { analysePitch, spellSemitone, validateContext } from "../core/context.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { buildChord, buildScale } from "../core/collections.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { buildChordCatalog } from "../core/chords.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { buildDiatonicHarmony } from "../core/harmony.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { assertRecord, MusicError } from "../core/errors.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { getIntervalBetweenPitches, intervalBetweenNotes, invertSimpleInterval, transposeNote as transposeWrittenNote, transposePitch as transposeRegisteredPitch } from "../core/intervals.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { buildKeyProfile, buildKeySignature, getFifthsRelationships, getRelativeKeyRelationship } from "../core/keys.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { mod12, validateNote } from "../core/pitch.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { buildPhrase, extractPhraseFragment, phraseContour, phraseIntervals, samePhraseContour, samePhraseIntervals, samePhraseRhythm, transposePhrase, } from "../core/phrase.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
import { findLocations, getNoteAt, STANDARD_FRETBOARD } from "../guitar/fretboard.js?ge-revision=e1287e484dd225d35a5c02e04b22b6d4eb47ad99";
function query(request, action) {
    try {
        assertRecord(request, "request");
        return { schemaVersion: 1, ok: true, data: action() };
    }
    catch (error) {
        if (!(error instanceof MusicError))
            throw error;
        return { schemaVersion: 1, ok: false, error: { code: error.code, message: error.message } };
    }
}
export function getInterval(request) {
    return query(request, () => getIntervalBetweenPitches(request.from, request.to));
}
export function getScale(request) {
    return query(request, () => buildScale(request));
}
export function getChord(request) {
    return query(request, () => buildChord(request));
}
export function getChordCatalog(request) {
    return query(request, () => buildChordCatalog());
}
export function getDiatonicHarmony(request) {
    return query(request, () => buildDiatonicHarmony(request));
}
export function getKeySignature(request) {
    return query(request, () => buildKeySignature(request));
}
export function getRelativeKey(request) {
    return query(request, () => getRelativeKeyRelationship(request));
}
export function getFifthsNeighbors(request) {
    return query(request, () => getFifthsRelationships(request));
}
export function getKeyProfile(request) {
    return query(request, () => buildKeyProfile(request));
}
function validateLocationContext(request) {
    if (request.context !== undefined)
        validateContext(request.context);
    if (request.root !== undefined)
        validateNote(request.root);
    if (request.spellingPreference !== undefined && request.spellingPreference !== "sharps" && request.spellingPreference !== "flats") {
        throw new MusicError("INVALID_INPUT", "Spelling preference must be sharps or flats");
    }
}
function annotate(location, request) {
    const spelling = spellSemitone(location.semitone, request.context, request.spellingPreference, request.root);
    const analysis = analysePitch(spelling.pitch, request.context);
    const interval = request.root && intervalBetweenNotes(request.root, spelling.pitch.note);
    return {
        ...location,
        ...analysis,
        spellingSource: spelling.spellingSource,
        alternativeSpellings: spelling.alternativeSpellings,
        ...(request.root && interval ? { rootRelation: {
                root: { letter: request.root.letter, accidental: request.root.accidental }, interval,
                chromaticDistance: mod12(interval.semitones),
            } } : {}),
    };
}
export function getNoteAtFret(request) {
    return query(request, () => {
        validateLocationContext(request);
        return annotate(getNoteAt(request.board === undefined ? STANDARD_FRETBOARD : request.board, request.position), request);
    });
}
export function getFretboardLocations(request) {
    return query(request, () => {
        validateLocationContext(request);
        const locations = findLocations({
            board: request.board === undefined ? STANDARD_FRETBOARD : request.board,
            ...(request.fretRange !== undefined ? { fretRange: request.fretRange } : {}),
            ...(request.stringIndices !== undefined ? { stringIndices: request.stringIndices } : {}),
            ...(request.pitchClasses !== undefined ? { pitchClasses: request.pitchClasses } : {}),
        });
        return locations.map((location) => annotate(location, request));
    });
}
export function analyseNotes(request) {
    return query(request, () => {
        if (!Array.isArray(request.notes))
            throw new MusicError("INVALID_INPUT", "notes must be an array");
        validateContext(request.context);
        return Array.from(request.notes, (pitch) => analysePitch(pitch, request.context));
    });
}
export function transposePitchQuery(request) {
    return query(request, () => transposeRegisteredPitch(request.pitch, request.interval));
}
export function transposeNoteQuery(request) {
    return query(request, () => transposeWrittenNote(request.note, request.interval));
}
export function invertInterval(request) {
    return query(request, () => invertSimpleInterval(request.interval));
}
/** Strict request records apply only to the additive Phrase surface. */
function phraseRequest(request, fields) {
    const record = request;
    for (const field of fields)
        assertRecord(record[field], `request.${field}`);
    for (const key of Reflect.ownKeys(request)) {
        if (typeof key !== "string" || !fields.includes(key)) {
            throw new MusicError("UNSUPPORTED", `request.${String(key)} is not supported`);
        }
    }
}
export function getPhrase(request) {
    return query(request, () => buildPhrase(request));
}
export function getPhraseIntervals(request) {
    return query(request, () => {
        phraseRequest(request, ["phrase"]);
        return phraseIntervals(request.phrase);
    });
}
export function getPhraseContour(request) {
    return query(request, () => {
        phraseRequest(request, ["phrase"]);
        return phraseContour(request.phrase);
    });
}
export function transposePhraseQuery(request) {
    return query(request, () => {
        phraseRequest(request, ["phrase", "interval"]);
        return transposePhrase(request.phrase, request.interval);
    });
}
export function extractPhraseFragmentQuery(request) {
    return query(request, () => {
        phraseRequest(request, ["phrase", "range"]);
        return extractPhraseFragment(request.phrase, request.range);
    });
}
export function comparePhraseIntervals(request) {
    return query(request, () => {
        phraseRequest(request, ["left", "right"]);
        return samePhraseIntervals(request.left, request.right);
    });
}
export function comparePhraseContour(request) {
    return query(request, () => {
        phraseRequest(request, ["left", "right"]);
        return samePhraseContour(request.left, request.right);
    });
}
export function comparePhraseRhythm(request) {
    return query(request, () => {
        phraseRequest(request, ["left", "right"]);
        return samePhraseRhythm(request.left, request.right);
    });
}
/** Musical truth only. Playback and learner state never enter this interface. */
export const musicQueries = Object.freeze({
    getInterval, getScale, getChord, getChordCatalog, getDiatonicHarmony, getKeySignature, getRelativeKey, getFifthsNeighbors, getKeyProfile,
    getNoteAtFret, getFretboardLocations, analyseNotes,
    transposePitch: transposePitchQuery,
    transposeNote: transposeNoteQuery,
    invertInterval,
    getPhrase,
    getPhraseIntervals,
    getPhraseContour,
    transposePhrase: transposePhraseQuery,
    extractPhraseFragment: extractPhraseFragmentQuery,
    comparePhraseIntervals,
    comparePhraseContour,
    comparePhraseRhythm,
});