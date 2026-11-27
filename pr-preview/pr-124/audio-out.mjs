const DEFAULT_LEVEL = 0.12;
const DEFAULT_STRUM_SPREAD = 0.085;
const HARMONICS = Object.freeze([
  Object.freeze({ ratio: 1, type: "triangle", level: 1 }),
  Object.freeze({ ratio: 2, type: "sine", level: 0.24 }),
  Object.freeze({ ratio: 3, type: "sine", level: 0.09 }),
]);

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

function nonNegativeNumber(value, name) {
  finiteNumber(value, name);
  if (value < 0) throw new RangeError(`${name} must be non-negative`);
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
    const gesture = event.gesture ?? (event.pitches.length > 1 ? "strum" : "pluck");
    if (gesture !== "pluck" && gesture !== "strum") throw new RangeError(`event ${index} gesture must be pluck or strum`);
    const direction = event.direction ?? "down";
    if (direction !== "down" && direction !== "up") throw new RangeError(`event ${index} direction must be down or up`);
    const strumSpread = event.strumSpread === undefined
      ? (gesture === "strum" ? DEFAULT_STRUM_SPREAD : 0)
      : nonNegativeNumber(event.strumSpread, `event ${index} strumSpread`);
    if (strumSpread > 0.25) throw new RangeError(`event ${index} strumSpread must be at most 0.25 seconds`);
    return Object.freeze({
      at,
      duration,
      pitches: Object.freeze([...event.pitches]),
      level,
      gesture,
      direction,
      strumSpread,
    });
  }).sort((left, right) => left.at - right.at);

  return Object.freeze(normalized);
}

export function cueDuration(events) {
  return normalizeCue(events).reduce(
    (latest, event) => Math.max(latest, event.at + event.duration + event.strumSpread),
    0,
  );
}

export function pitchFrequency(pitch, toSemitone) {
  if (typeof toSemitone !== "function") throw new TypeError("toSemitone must be a function");
  const semitone = toSemitone(pitch);
  return 440 * (2 ** ((semitone - 69) / 12));
}

export function createAudioOut({
  toSemitone,
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
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

  function disconnectVoice(voice) {
    for (const oscillator of voice.oscillators) {
      try { oscillator.disconnect(); } catch {}
    }
    for (const gain of voice.gains) {
      try { gain.disconnect(); } catch {}
    }
    try { voice.filter?.disconnect(); } catch {}
    try { voice.master.disconnect(); } catch {}
  }

  function stop() {
    if (!activeVoices.length) return 0;
    const now = context?.currentTime ?? 0;
    const voices = activeVoices;
    activeVoices = [];
    for (const voice of voices) {
      for (const oscillator of voice.oscillators) {
        try { oscillator.stop(now); } catch {}
      }
      disconnectVoice(voice);
    }
    return voices.length;
  }

  function schedulePluck(audioContext, pitch, start, duration, level) {
    const frequency = pitchFrequency(pitch, toSemitone);
    const end = start + duration;
    const attack = Math.min(0.008, duration * 0.12);
    const bodyPoint = Math.min(end - 0.01, start + Math.max(attack, duration * 0.22));
    const master = audioContext.createGain();
    master.gain.cancelScheduledValues(start);
    master.gain.setValueAtTime(0, start);
    master.gain.linearRampToValueAtTime(level, start + attack);
    master.gain.linearRampToValueAtTime(level * 0.34, Math.max(start + attack, bodyPoint));
    master.gain.linearRampToValueAtTime(0, end);

    let filter = null;
    if (typeof audioContext.createBiquadFilter === "function") {
      filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      const bright = Math.min(6200, Math.max(2200, frequency * 11));
      const warm = Math.min(3000, Math.max(850, frequency * 3.5));
      filter.frequency.setValueAtTime(bright, start);
      filter.frequency.linearRampToValueAtTime(warm, Math.min(end, start + Math.max(0.08, duration * 0.4)));
      if (filter.Q?.setValueAtTime) filter.Q.setValueAtTime(0.7, start);
      master.connect(filter);
      filter.connect(audioContext.destination);
    } else {
      master.connect(audioContext.destination);
    }

    const oscillators = [];
    const gains = [];
    HARMONICS.forEach((harmonic) => {
      const oscillator = audioContext.createOscillator();
      const harmonicGain = audioContext.createGain();
      oscillator.type = harmonic.type;
      oscillator.frequency.setValueAtTime(frequency * harmonic.ratio, start);
      harmonicGain.gain.setValueAtTime(harmonic.level, start);
      oscillator.connect(harmonicGain);
      harmonicGain.connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
      oscillators.push(oscillator);
      gains.push(harmonicGain);
    });

    return { oscillators, gains, master, filter };
  }

  async function play(events) {
    const cue = normalizeCue(events);
    const audioContext = await ensureContext();
    stop();

    const origin = audioContext.currentTime + 0.03;
    let renderedDuration = 0;
    for (const event of cue) {
      const pitches = event.direction === "up" ? [...event.pitches].reverse() : event.pitches;
      const divisor = Math.max(1, pitches.length - 1);
      const peak = event.level / Math.max(1, Math.sqrt(event.pitches.length));

      pitches.forEach((pitch, index) => {
        const offset = event.gesture === "strum" && pitches.length > 1
          ? event.strumSpread * (index / divisor)
          : 0;
        const start = origin + event.at + offset;
        activeVoices.push(schedulePluck(audioContext, pitch, start, event.duration, peak));
        renderedDuration = Math.max(renderedDuration, event.at + offset + event.duration);
      });
    }

    return Object.freeze({
      durationSeconds: renderedDuration,
      eventCount: cue.length,
      voiceCount: activeVoices.length,
      timbre: "native-plucked-string",
    });
  }

  return Object.freeze({ play, stop, supported });
}
