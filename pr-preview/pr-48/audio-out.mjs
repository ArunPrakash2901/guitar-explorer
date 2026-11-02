const DEFAULT_LEVEL = 0.12;
const DEFAULT_WAVEFORM = "triangle";

function finiteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function positiveNumber(value, name) {
  finiteNumber(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
  return value;
}

export function registerChord(chord, rootOctave, transposePitch) {
  if (!chord || !Array.isArray(chord.tones)) throw new TypeError("registerChord requires an engine chord");
  if (!Number.isInteger(rootOctave)) throw new TypeError("rootOctave must be an integer");
  if (typeof transposePitch !== "function") throw new TypeError("transposePitch must be a function");
  const root = Object.freeze({ note: chord.root, octave: rootOctave });
  return Object.freeze(chord.tones.map((tone) => transposePitch(root, tone.interval)));
}

export function normalizeCue(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError("Audio cue requires at least one event");
  }

  const normalized = events.map((event, index) => {
    if (!event || typeof event !== "object") throw new TypeError(`Audio event ${index} must be an object`);
    const at = finiteNumber(event.at ?? 0, `event ${index} at`);
    if (at < 0) throw new RangeError(`event ${index} at must be non-negative`);
    const duration = positiveNumber(event.duration, `event ${index} duration`);
    if (!Array.isArray(event.pitches) || event.pitches.length === 0) {
      throw new TypeError(`event ${index} requires at least one registered pitch`);
    }
    const level = event.level === undefined ? DEFAULT_LEVEL : finiteNumber(event.level, `event ${index} level`);
    if (level <= 0 || level > 1) throw new RangeError(`event ${index} level must be in (0, 1]`);
    return Object.freeze({
      at,
      duration,
      pitches: Object.freeze([...event.pitches]),
      level,
    });
  }).sort((left, right) => left.at - right.at);

  return Object.freeze(normalized);
}

export function cueDuration(events) {
  return normalizeCue(events).reduce((latest, event) => Math.max(latest, event.at + event.duration), 0);
}

export function pitchFrequency(pitch, toSemitone) {
  if (typeof toSemitone !== "function") throw new TypeError("toSemitone must be a function");
  const semitone = toSemitone(pitch);
  return 440 * (2 ** ((semitone - 69) / 12));
}

export function createAudioOut({
  toSemitone,
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  waveform = DEFAULT_WAVEFORM,
} = {}) {
  if (typeof toSemitone !== "function") throw new TypeError("createAudioOut requires toSemitone");

  let context = null;
  let activeVoices = [];

  function supported() {
    return typeof AudioContextCtor === "function";
  }

  async function ensureContext() {
    if (!supported()) throw new Error("Web Audio is unavailable in this browser");
    context ??= new AudioContextCtor();
    if (context.state === "suspended" && typeof context.resume === "function") {
      await context.resume();
    }
    return context;
  }

  function stop() {
    if (!activeVoices.length) return 0;
    const now = context?.currentTime ?? 0;
    const voices = activeVoices;
    activeVoices = [];
    for (const { oscillator, gain } of voices) {
      try { oscillator.stop(now); } catch {}
      try { oscillator.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    }
    return voices.length;
  }

  async function play(events) {
    const cue = normalizeCue(events);
    const audioContext = await ensureContext();
    stop();

    const origin = audioContext.currentTime + 0.03;
    let voiceCount = 0;
    for (const event of cue) {
      const start = origin + event.at;
      const end = start + event.duration;
      const attack = Math.min(0.025, event.duration * 0.25);
      const release = Math.min(0.12, event.duration * 0.35);
      const releaseStart = Math.max(start + attack, end - release);
      const peak = event.level / Math.max(1, Math.sqrt(event.pitches.length));

      for (const pitch of event.pitches) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(pitchFrequency(pitch, toSemitone), start);
        gain.gain.cancelScheduledValues(start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + attack);
        gain.gain.setValueAtTime(peak, releaseStart);
        gain.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
        activeVoices.push({ oscillator, gain });
        voiceCount += 1;
      }
    }

    return Object.freeze({
      durationSeconds: cue.reduce((latest, event) => Math.max(latest, event.at + event.duration), 0),
      eventCount: cue.length,
      voiceCount,
    });
  }

  return Object.freeze({ play, stop, supported });
}
