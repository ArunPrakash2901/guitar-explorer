import { assertInteger, assertRecord, MusicError } from "./errors.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { buildChord, buildScale } from "./collections.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { intervalBetweenNotes } from "./intervals.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { validateKey } from "./keys.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
import { formatPitch, NATURAL_PITCH_CLASSES, pitchClass, pitchFromSemitone, toSemitone, validateNote, validatePitch } from "./pitch.js?ge-revision=ee2a3d42ae11bf8d1906c4775b7d967d78be93d2";
export function validateContext(value) {
    assertRecord(value, "context");
    if (value.key !== undefined)
        validateKey(value.key);
    if (value.activeScale !== undefined)
        buildScale(value.activeScale);
    if (value.currentChord !== undefined)
        buildChord(value.currentChord);
}
function sameSpelling(a, b) {
    return a.letter === b.letter && a.accidental === b.accidental;
}
/** Only domain fields leave the engine, even when JS callers supply extra data. */
function copyNote(note) {
    return { letter: note.letter, accidental: note.accidental };
}
/** Key analysis intentionally retains the seven-degree major/natural-minor contract. */
function keyDegreeRelationship(tonic, note, tones) {
    const interval = intervalBetweenNotes(tonic, note);
    const degree = interval.diatonicSteps + 1;
    const references = tones.filter((tone) => tone.degree === degree);
    if (references.length !== 1)
        throw new Error("Key reference collection must declare each degree exactly once");
    const reference = references[0];
    const alteration = note.accidental - reference.note.accidental;
    assertInteger(alteration, "contextual alteration");
    return {
        degree,
        alteration,
        member: tones.some((tone) => tone.pitchClass === pitchClass(note)),
        spellingMatches: tones.some((tone) => sameSpelling(tone.note, note)),
        interval,
    };
}
/** Selected scales may omit a written degree or declare more than one reference for it. */
function scaleDegreeRelationship(tonic, note, tones) {
    const interval = intervalBetweenNotes(tonic, note);
    const degree = interval.diatonicSteps + 1;
    const degreeReferences = Object.freeze(tones.filter((tone) => tone.degree === degree));
    const matchingTones = Object.freeze(tones.filter((tone) => tone.pitchClass === pitchClass(note)));
    const referenceStatus = degreeReferences.length === 0
        ? "omitted"
        : degreeReferences.length === 1
            ? "single"
            : "multiple";
    let alteration = null;
    if (degreeReferences.length === 1) {
        alteration = note.accidental - degreeReferences[0].note.accidental;
        assertInteger(alteration, "contextual alteration");
    }
    return {
        degree,
        referenceStatus,
        degreeReferences,
        alteration,
        matchingTones,
        member: matchingTones.length > 0,
        spellingMatches: matchingTones.some((tone) => sameSpelling(tone.note, note)),
        interval,
    };
}
/** Preserve the supplied spelling; membership compares sound, while degree uses letters. */
export function analysePitch(pitch, context = {}) {
    validatePitch(pitch);
    validateContext(context);
    const pc = pitchClass(pitch.note);
    const key = context.key;
    const keyScale = key && buildScale({ tonic: key.tonic, scaleId: key.mode === "minor" ? "naturalMinor" : "major" });
    const scale = context.activeScale && buildScale(context.activeScale);
    const chord = context.currentChord && buildChord(context.currentChord);
    const keyDegree = keyScale && keyDegreeRelationship(keyScale.tonic, pitch.note, keyScale.tones);
    const scaleDegree = scale && scaleDegreeRelationship(scale.tonic, pitch.note, scale.tones);
    const chordMatches = chord?.tones.filter((tone) => tone.pitchClass === pc);
    return {
        pitch: { note: copyNote(pitch.note), octave: pitch.octave },
        name: formatPitch(pitch),
        semitone: toSemitone(pitch),
        pitchClass: pc,
        ...(key && keyDegree ? { keyRelation: {
                tonic: copyNote(key.tonic), mode: key.mode,
                degree: keyDegree.degree, alterationFromKey: keyDegree.alteration,
                inKey: keyDegree.member, spellingMatches: keyDegree.spellingMatches, interval: keyDegree.interval,
            } } : {}),
        ...(scale && scaleDegree ? { scaleRelation: {
                tonic: copyNote(scale.tonic), scaleId: scale.scaleId,
                degree: scaleDegree.degree,
                referenceStatus: scaleDegree.referenceStatus,
                degreeReferences: scaleDegree.degreeReferences,
                alterationFromScale: scaleDegree.alteration,
                matchingTones: scaleDegree.matchingTones,
                inScale: scaleDegree.member,
                spellingMatches: scaleDegree.spellingMatches,
                interval: scaleDegree.interval,
            } } : {}),
        ...(chord && chordMatches ? { chordRelation: {
                root: copyNote(chord.root), chordId: chord.chordId,
                interval: intervalBetweenNotes(chord.root, pitch.note),
                isChordTone: chordMatches.length > 0,
                spellingMatches: chordMatches.some((tone) => sameSpelling(tone.note, pitch.note)),
                matchingTones: chordMatches,
            } } : {}),
    };
}
/** Explicit matching root, then chord, selected scale, key, then display fallback. */
export function spellSemitone(semitone, context = {}, preference = "sharps", root) {
    assertInteger(semitone, "semitone");
    validateContext(context);
    if (preference !== "sharps" && preference !== "flats") {
        throw new MusicError("INVALID_INPUT", "Spelling preference must be sharps or flats");
    }
    if (root !== undefined)
        validateNote(root);
    const fallback = pitchFromSemitone(semitone, preference);
    const pc = pitchClass(fallback.note);
    const candidates = [];
    if (root && pitchClass(root) === pc)
        candidates.push({ note: root, source: "root" });
    if (context.currentChord) {
        for (const tone of buildChord(context.currentChord).tones) {
            if (tone.pitchClass === pc)
                candidates.push({ note: tone.note, source: "chord" });
        }
    }
    if (context.activeScale) {
        for (const tone of buildScale(context.activeScale).tones) {
            if (tone.pitchClass === pc)
                candidates.push({ note: tone.note, source: "scale" });
        }
    }
    if (context.key) {
        const scale = buildScale({ tonic: context.key.tonic, scaleId: context.key.mode === "minor" ? "naturalMinor" : "major" });
        for (const tone of scale.tones) {
            if (tone.pitchClass === pc)
                candidates.push({ note: tone.note, source: "key" });
        }
    }
    const unique = candidates.filter((candidate, i) => candidates.findIndex((other) => sameSpelling(other.note, candidate.note)) === i);
    const first = unique[0];
    if (!first)
        return { pitch: fallback, spellingSource: "fallback", alternativeSpellings: [] };
    const writtenBase = BigInt(NATURAL_PITCH_CLASSES[first.note.letter]) + BigInt(first.note.accidental);
    const octaveDistance = BigInt(semitone) - writtenBase;
    if (octaveDistance % 12n !== 0n)
        throw new Error("Contextual spelling does not match sounding pitch");
    const octave = Number(octaveDistance / 12n - 1n);
    assertInteger(octave, "contextually spelled octave");
    const pitch = { note: copyNote(first.note), octave };
    validatePitch(pitch);
    return {
        pitch,
        spellingSource: first.source,
        alternativeSpellings: unique.slice(1).map(({ note }) => copyNote(note)),
    };
}