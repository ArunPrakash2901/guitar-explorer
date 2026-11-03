import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs?ge-revision=c70c74007e5e75a9789ead40c6c7382eeb951a5e";

const sampleByPosition = new Map(STEEL_SAMPLES.map((sample) => [
  `${sample.stringIndex}:${sample.fret}`, sample,
]));

// Performance events retain the engine-derived pitches and physical positions.
// This adapter selects recorded attacks; it never derives chord or scale truth.
export function sampleAttacks(events) {
  if (!Array.isArray(events) || !events.length) throw new TypeError("Sampled guitar needs performance events");
  return Object.freeze(events.map((event) => {
    if (!Array.isArray(event.positions) || event.positions.length === 0 || event.positions.length !== event.pitches?.length) {
      throw new TypeError("Sampled guitar requires matching string positions and pitches");
    }
    if (!Number.isFinite(event.at) || event.at < 0 || !Number.isFinite(event.duration) || event.duration <= 0) {
      throw new RangeError("Sampled guitar requires finite timing");
    }
    if (!Number.isFinite(event.level) || event.level <= 0 || event.level > 1
        || !["pluck", "strum"].includes(event.gesture) || !["up", "down"].includes(event.direction)
        || !Number.isFinite(event.strumSpread) || event.strumSpread < 0 || event.strumSpread > 0.25) {
      throw new RangeError("Sampled guitar requires bounded level and attack choices");
    }
    const positions = event.direction === "up" ? [...event.positions].reverse() : event.positions;
    const samples = positions.map(({ stringIndex, fret }) => {
      const sample = sampleByPosition.get(`${stringIndex}:${fret}`);
      if (!sample) throw new RangeError(`No acoustic sample for string ${stringIndex} fret ${fret}`);
      return sample;
    });
    return Object.freeze({ event, samples: Object.freeze(samples) });
  }));
}

export function createSampledGuitar({
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  fetchAsset = globalThis.fetch?.bind(globalThis),
} = {}) {
  let context;
  let buffers;
  let loading;
  let voices = [];
  let generation = 0;

  function supported() {
    return typeof AudioContextCtor === "function" && typeof fetchAsset === "function";
  }

  async function ensureContext() {
    if (!supported()) throw new Error("Sampled audio is unavailable in this browser");
    context ??= new AudioContextCtor();
    if (context.state === "suspended") await context.resume();
    return context;
  }

  async function load() {
    if (buffers) return buffers;
    if (!loading) {
      loading = (async () => {
        const audio = await ensureContext();
        const entries = await Promise.all(STEEL_SAMPLES.map(async (sample) => {
          const url = new URL(`./samples/steel/${sample.file}`, import.meta.url);
          const response = await fetchAsset(url);
          if (!response.ok) throw new Error(`Acoustic sample unavailable: ${sample.note} on string ${sample.stringIndex}`);
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength !== sample.bytes) throw new Error(`Acoustic sample size mismatch: ${sample.file}`);
          return [sample.file, await audio.decodeAudioData(bytes)];
        }));
        buffers = new Map(entries);
        return buffers;
      })().catch((error) => { loading = null; throw error; });
    }
    return loading;
  }

  function stopVoices() {
    const active = voices;
    voices = [];
    for (const { source, gain } of active) {
      try { source.stop(context.currentTime); } catch {}
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    }
    return active.length;
  }

  function stop() {
    generation += 1; // Also cancels a pending decode/play request.
    return stopVoices();
  }

  async function play(events) {
    const attacks = sampleAttacks(events);
    const ticket = ++generation;
    const audio = await ensureContext();
    const loaded = await load();
    if (ticket !== generation) return Object.freeze({ cancelled: true });
    stopVoices();
    const origin = audio.currentTime + 0.03;
    let renderedDuration = 0;
    for (const { event, samples } of attacks) {
      const divisor = Math.max(1, samples.length - 1);
      const peak = event.level / Math.max(1, Math.sqrt(samples.length));
      samples.forEach((sample, index) => {
        const offset = event.gesture === "strum" ? event.strumSpread * index / divisor : 0;
        const start = origin + event.at + offset;
        const buffer = loaded.get(sample.file);
        const duration = Math.min(buffer.duration, event.duration + 0.55);
        if (duration <= 0.01) throw new Error(`Acoustic sample is too short: ${sample.file}`);
        const end = start + duration;
        const gain = audio.createGain();
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.006, duration * 0.1));
        gain.gain.linearRampToValueAtTime(peak * 0.7, start + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0, end);
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(audio.destination);
        source.start(start);
        source.stop(end);
        const voice = { source, gain };
        source.onended = () => {
          voices = voices.filter((active) => active !== voice);
          try { source.disconnect(); } catch {}
          try { gain.disconnect(); } catch {}
        };
        voices.push(voice);
        renderedDuration = Math.max(renderedDuration, event.at + offset + duration);
      });
    }
    return Object.freeze({
      durationSeconds: renderedDuration,
      eventCount: attacks.length,
      voiceCount: voices.length,
      timbre: "sampled-steel-acoustic",
    });
  }

  return Object.freeze({ play, stop, supported, load });
}
