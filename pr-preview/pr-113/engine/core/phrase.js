import { assertRecord, MusicError } from "./errors.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { getIntervalBetweenPitches, transposePitch, validateInterval } from "./intervals.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { toSemitone, validatePitch } from "./pitch.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
import { addMusicalTime, compareMusicalTime, MAX_TEMPORAL_EVENTS, normalizeMusicalTime, sameMusicalTime, subtractMusicalTime, ZERO_MUSICAL_TIME, } from "./time.js?ge-revision=70e25e7d6fc3ffe9e7d9a3e2967fc1532ba41d85";
function atPath(path, action) {
    try {
        return action();
    }
    catch (error) {
        if (!(error instanceof MusicError))
            throw error;
        throw new MusicError(error.code, `${path}: ${error.message}`);
    }
}
function knownFields(value, fields, path) {
    for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string" || !fields.includes(key)) {
            throw new MusicError("UNSUPPORTED", `${path}.${String(key)} is not supported`);
        }
    }
}
function nonnegative(value, path) {
    const time = atPath(path, () => normalizeMusicalTime(value));
    if (time.numerator < 0)
        throw new MusicError("INVALID_INPUT", `${path} must be nonnegative`);
    return time;
}
/** Copy and validate every local event before checking chronological relations. */
export function buildPhrase(input) {
    assertRecord(input, "Phrase");
    assertRecord(input.duration, "Phrase.duration");
    if (!Array.isArray(input.events))
        throw new MusicError("INVALID_INPUT", "Phrase.events must be an array");
    knownFields(input, ["duration", "events"], "Phrase");
    if (input.events.length > MAX_TEMPORAL_EVENTS) {
        throw new MusicError("UNSUPPORTED", `Phrase.events exceeds the ${MAX_TEMPORAL_EVENTS}-event budget`);
    }
    const duration = nonnegative(input.duration, "Phrase.duration");
    const events = [];
    const ends = [];
    for (let index = 0; index < input.events.length; index++) {
        const path = `Phrase.events[${index}]`;
        if (!Object.hasOwn(input.events, index))
            throw new MusicError("INVALID_INPUT", `${path} must not be a sparse entry`);
        const event = input.events[index];
        assertRecord(event, path);
        assertRecord(event.pitch, `${path}.pitch`);
        assertRecord(event.onset, `${path}.onset`);
        assertRecord(event.duration, `${path}.duration`);
        knownFields(event, ["pitch", "onset", "duration"], path);
        const pitch = atPath(`${path}.pitch`, () => {
            validatePitch(event.pitch);
            toSemitone(event.pitch);
            return Object.freeze({
                note: Object.freeze({ letter: event.pitch.note.letter, accidental: event.pitch.note.accidental }),
                octave: event.pitch.octave,
            });
        });
        const onset = nonnegative(event.onset, `${path}.onset`);
        const length = nonnegative(event.duration, `${path}.duration`);
        if (length.numerator === 0)
            throw new MusicError("INVALID_INPUT", `${path}.duration must be positive`);
        const end = atPath(`${path}.end`, () => addMusicalTime(onset, length));
        if (compareMusicalTime(end, duration) > 0) {
            throw new MusicError("INVALID_INPUT", `${path}.end exceeds Phrase.duration`);
        }
        events.push(Object.freeze({ pitch, onset, duration: length }));
        ends.push(end);
    }
    for (let index = 1; index < events.length; index++) {
        const current = events[index];
        if (compareMusicalTime(current.onset, events[index - 1].onset) < 0) {
            throw new MusicError("INVALID_INPUT", `Phrase.events[${index}].onset is out of chronological order`);
        }
        if (compareMusicalTime(current.onset, ends[index - 1]) < 0) {
            throw new MusicError("UNSUPPORTED", `Phrase.events[${index}].onset overlaps the previous event; v1 is monophonic`);
        }
    }
    return Object.freeze({ duration, events: Object.freeze(events) });
}
function intervalsOf(phrase) {
    return Object.freeze(phrase.events.slice(1).map((event, index) => atPath(`Phrase.events[${index + 1}].pitch`, () => getIntervalBetweenPitches(phrase.events[index].pitch, event.pitch))));
}
function contourOf(phrase) {
    return Object.freeze(phrase.events.slice(1).map((event, index) => {
        const from = toSemitone(phrase.events[index].pitch);
        const to = toSemitone(event.pitch);
        return to > from ? "ascending" : to < from ? "descending" : "stationary";
    }));
}
export function phraseIntervals(phrase) {
    return intervalsOf(buildPhrase(phrase));
}
/** Sounding direction, intentionally independent of written interval direction. */
export function phraseContour(phrase) {
    return contourOf(buildPhrase(phrase));
}
export function transposePhrase(phrase, interval) {
    const source = buildPhrase(phrase);
    atPath("interval", () => validateInterval(interval));
    return buildPhrase({
        duration: source.duration,
        events: source.events.map((event, index) => ({
            ...event,
            pitch: atPath(`Phrase.events[${index}].pitch`, () => transposePitch(event.pitch, interval)),
        })),
    });
}
export function samePhraseIntervals(left, right) {
    const a = buildPhrase(left);
    const b = buildPhrase(right);
    if (a.events.length !== b.events.length)
        return false;
    const aIntervals = intervalsOf(a);
    const bIntervals = intervalsOf(b);
    return aIntervals.every((interval, index) => interval.diatonicSteps === bIntervals[index].diatonicSteps
        && interval.semitones === bIntervals[index].semitones);
}
export function samePhraseContour(left, right) {
    const a = buildPhrase(left);
    const b = buildPhrase(right);
    if (a.events.length !== b.events.length)
        return false;
    const aContour = contourOf(a);
    const bContour = contourOf(b);
    return aContour.every((direction, index) => direction === bContour[index]);
}
export function samePhraseRhythm(left, right) {
    const a = buildPhrase(left);
    const b = buildPhrase(right);
    return a.events.length === b.events.length && sameMusicalTime(a.duration, b.duration)
        && a.events.every((event, index) => sameMusicalTime(event.onset, b.events[index].onset)
            && sameMusicalTime(event.duration, b.events[index].duration));
}
/** Half-open logical crop; a clipped sounding note is not a newly performed attack. */
export function extractPhraseFragment(phrase, range) {
    const source = buildPhrase(phrase);
    assertRecord(range, "range");
    assertRecord(range.onset, "range.onset");
    assertRecord(range.duration, "range.duration");
    knownFields(range, ["onset", "duration"], "range");
    const onset = nonnegative(range.onset, "range.onset");
    const duration = nonnegative(range.duration, "range.duration");
    const end = atPath("range.end", () => addMusicalTime(onset, duration));
    if (compareMusicalTime(end, source.duration) > 0) {
        throw new MusicError("INVALID_INPUT", "range.end exceeds Phrase.duration");
    }
    const events = [];
    const sourceEventIndices = [];
    let clippedAtStart = false;
    let clippedAtEnd = false;
    if (compareMusicalTime(duration, ZERO_MUSICAL_TIME) > 0) {
        for (const [index, event] of source.events.entries()) {
            const eventEnd = addMusicalTime(event.onset, event.duration);
            const start = compareMusicalTime(event.onset, onset) < 0 ? onset : event.onset;
            const stop = compareMusicalTime(eventEnd, end) > 0 ? end : eventEnd;
            if (compareMusicalTime(start, stop) >= 0)
                continue;
            events.push({
                pitch: event.pitch,
                onset: atPath(`fragment.events[${index}].onset`, () => subtractMusicalTime(start, onset)),
                duration: atPath(`fragment.events[${index}].duration`, () => subtractMusicalTime(stop, start)),
            });
            sourceEventIndices.push(index);
            if (compareMusicalTime(event.onset, onset) < 0)
                clippedAtStart = true;
            if (compareMusicalTime(eventEnd, end) > 0)
                clippedAtEnd = true;
        }
    }
    return Object.freeze({
        phrase: buildPhrase({ duration, events }),
        sourceEventIndices: Object.freeze(sourceEventIndices),
        clippedAtStart,
        clippedAtEnd,
    });
}