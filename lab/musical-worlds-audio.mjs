import { STEEL_SAMPLES } from "./sampled-guitar-manifest.mjs";
import { decodeSteelSample } from "./sampled-guitar.mjs";
import { prepareRolePerformance } from "./role-performance.mjs";
import { positionFromKey, worldChordContexts } from "./musical-worlds-material.mjs";

const STEPS = 16;
const HEADROOM = .08;
const EVENT_TYPES = new Set(["guitar", "chord", "bass", "kick", "snare", "hat", "mute"]);

// One native Web Audio clock for samples, synth bass, percussion and count-in.
// The timer queues the next cycle ahead of its deadline; it does not time notes.
export function createWorldAudio({
  queries, toSemitone,
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  fetchAsset = globalThis.fetch?.bind(globalThis),
  setTimer = globalThis.setInterval?.bind(globalThis),
  clearTimer = globalThis.clearInterval?.bind(globalThis),
} = {}) {
  const manifest = new Map(STEEL_SAMPLES.map(s => [s.stringIndex + ":" + s.fret, s]));
  const cache = new Map();
  const voices = new Set();
  let context, output, meter, meterData, noise, harmony;
  let generation = 0, timer, active, phase = "stopped";

  async function ready() {
    if (typeof AudioContextCtor !== "function") throw new Error("Web Audio is unavailable in this browser.");
    if (!context || context.state === "closed") {
      context = new AudioContextCtor();
      output = context.createGain();
      output.gain.value = .82;
      noise = undefined;
      meter = context.createAnalyser?.();
      if (meter) {
        meter.fftSize = 512;
        meterData = new Float32Array(meter.fftSize);
        output.connect(meter);
        meter.connect(context.destination);
      } else output.connect(context.destination);
    }
    if (context.state !== "running") await context.resume();
    if (context.state !== "running") throw new Error("The browser paused sound. Press Play to retry.");
    return context;
  }
  function sample(key, audio) {
    const entry = manifest.get(key);
    if (!entry) throw new RangeError("No recorded acoustic guitar for " + key);
    if (typeof fetchAsset !== "function") throw new Error("Recording fetch is unavailable.");
    if (!cache.has(key)) {
      const load = decodeSteelSample(entry, audio, fetchAsset).catch(error => {
        cache.delete(key);
        throw error;
      });
      cache.set(key, load);
    }
    return cache.get(key);
  }
  function chordPlacements() {
    if (!harmony) {
      const contexts = worldChordContexts(queries);
      const performance = prepareRolePerformance({ anchor: { position: positionFromKey("4:1") }, contexts },
        { queries, availablePositions: STEEL_SAMPLES });
      harmony = new Map(contexts.map(({ symbol }, i) => [symbol, performance.contexts[i].positions]));
    }
    return harmony;
  }
  function prepare(score) {
    if (!score || !Number.isFinite(score.tempo) || score.tempo < 40 || score.tempo > 220 ||
        !Number.isInteger(score.bars) || score.bars < 1 || score.bars > 16 || !Array.isArray(score.events)) {
      throw new TypeError("Invalid authored score");
    }
    if (!score.events.length) throw new Error("There is no guitar part yet. Add a note or play with the band.");
    return score.events.flatMap(event => {
      if (!EVENT_TYPES.has(event.instrument) || !Number.isInteger(event.step) || event.step < 0 || event.step >= score.bars * STEPS ||
          !Number.isFinite(event.offsetSteps ?? 0) || Math.abs(event.offsetSteps ?? 0) > .5 ||
          !Number.isFinite(event.velocity) || event.velocity <= 0 || event.velocity > 1 ||
          (event.duration !== undefined && (!Number.isFinite(event.duration) || event.duration <= 0 || event.duration > STEPS))) {
        throw new RangeError("An audio event is out of range.");
      }
      if (event.instrument === "chord") {
        const positions = chordPlacements().get(event.chord);
        if (!positions) throw new Error("No recorded voicing for " + event.chord);
        const ordered = event.step % STEPS === 8 ? [...positions].reverse() : positions;
        return ordered.map(({ stringIndex, fret }, i) => ({
          ...event, instrument: "guitar", note: stringIndex + ":" + fret,
          spread: .055 * i / Math.max(1, positions.length - 1),
          velocity: event.velocity / Math.sqrt(positions.length),
        }));
      }
      if (event.instrument === "bass") {
        const result = queries.getNoteAtFret({ position: positionFromKey(event.note) });
        if (!result.ok) throw new Error(result.error.message);
        return [{ ...event, frequency: 440 * 2 ** ((toSemitone(result.data.pitch) - 81) / 12) }];
      }
      return [event];
    });
  }
  function dispose(voice, stop = false) {
    voices.delete(voice);
    voice.source.onended = null;
    if (stop) try { voice.source.stop(context.currentTime); } catch {}
    for (const node of voice.nodes) try { node.disconnect(); } catch {}
  }
  function voice(source, gain, start, end, filter) {
    const tracked = { source, nodes: filter ? [source, filter, gain] : [source, gain] };
    voices.add(tracked);
    source.onended = () => dispose(tracked);
    try {
      if (filter) { source.connect(filter); filter.connect(gain); }
      else source.connect(gain);
      gain.connect(output);
      source.start(start);
      source.stop(end);
    } catch (error) {
      dispose(tracked, true);
      throw error;
    }
  }
  function envelope(gain, start, duration, peak, acoustic = false) {
    const attack = Math.min(.006, duration * .2);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    if (acoustic) {
      // Leave the sample's natural attack and decay audible; release at the
      // authored length so a short interpretation really differs from ringing.
      gain.gain.setValueAtTime(peak, start + Math.max(attack, duration - .065));
      gain.gain.linearRampToValueAtTime(0, start + duration);
    } else gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  }
  function noiseBuffer() {
    if (noise) return noise;
    noise = context.createBuffer(1, Math.floor(context.sampleRate * .32), context.sampleRate);
    const data = noise.getChannelData(0);
    let x = 429496729;
    for (let i = 0; i < data.length; i++) {
      x = (1664525 * x + 1013904223) >>> 0;
      data[i] = x / 2147483648 - 1;
    }
    return noise;
  }
  function render(event, t, stepSeconds, end, buffers) {
    const instrument = event.instrument;
    let duration = instrument === "kick" || instrument === "snare" ? .19
      : instrument === "hat" ? .075 : instrument === "mute" ? .058 : instrument === "click" ? .06
      : (event.duration ?? 2) * stepSeconds;
    duration = Math.min(duration, end - t, instrument === "guitar" ? buffers.get(event.note).duration : Infinity);
    if (duration < .014) return;
    const gain = context.createGain();
    envelope(gain, t, duration, event.velocity, instrument === "guitar" || instrument === "bass");
    if (["bass", "kick", "click"].includes(instrument)) {
      const osc = context.createOscillator();
      osc.type = instrument === "bass" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(event.frequency ?? 122, t);
      if (instrument === "kick") osc.frequency.exponentialRampToValueAtTime(46, t + duration);
      voice(osc, gain, t, t + duration);
    } else {
      const source = context.createBufferSource();
      source.buffer = instrument === "guitar" ? buffers.get(event.note) : noiseBuffer();
      let filter;
      if (instrument !== "guitar") {
        filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = instrument === "hat" ? 5600 : instrument === "mute" ? 2400 : 880;
      }
      voice(source, gain, t, t + duration, filter);
    }
  }
  function release() {
    if (timer !== undefined) clearTimer?.(timer);
    timer = undefined;
    for (const tracked of [...voices]) dispose(tracked, true);
    active = undefined;
  }
  function stop() {
    generation += 1;
    release();
    phase = "stopped";
  }
  function scheduleCycle(run, start) {
    const end = start + run.durationSeconds;
    for (const event of run.events) {
      const ideal = start + Math.max(0, event.step + (event.offsetSteps ?? 0)) * run.stepSeconds + (event.spread ?? 0);
      render(event, Math.max(context.currentTime + .006, ideal), run.stepSeconds, end, run.buffers);
    }
  }
  function tick(run) {
    if (run !== active) return;
    if (context.state !== "running") {
      release();
      phase = "interrupted";
      return;
    }
    const now = context.currentTime;
    if (!run.repeat && now >= run.origin + run.durationSeconds) {
      release();
      phase = "ended";
      return;
    }
    if (!run.repeat) return;
    // A suspended tab may miss a whole boundary. Rejoin on the next cycle
    // instead of dumping old events into a burst on the current beat.
    if (run.next < now - .12) {
      run.next = run.origin + Math.ceil((now - run.origin) / run.durationSeconds) * run.durationSeconds;
    }
    if (now + .24 >= run.next) {
      try {
        scheduleCycle(run, run.next);
        run.next += run.durationSeconds;
      } catch {
        release();
        phase = "interrupted";
      }
    }
  }
  function outputLevel() {
    if (!active || !meter) return 0;
    meter.getFloatTimeDomainData(meterData);
    let peak = 0;
    for (const value of meterData) peak = Math.max(peak, Math.abs(value));
    return Math.min(1, peak);
  }
  function position() {
    if (!active) return { phase, level: 0 };
    const { origin, start, stepSeconds, durationSeconds, bars } = active;
    const elapsed = context.currentTime - origin;
    const level = outputLevel();
    if (elapsed < 0 && active.countIn) return {
      phase: "count-in", beat: Math.max(1, Math.min(4, Math.floor((context.currentTime - start) / (stepSeconds * 4)) + 1)), level,
    };
    const cycle = Math.max(0, Math.floor(elapsed / durationSeconds));
    const step = Math.min(bars * STEPS - 1, Math.floor(Math.max(0, elapsed % durationSeconds) / stepSeconds));
    return { phase: "playing", cycle, bar: Math.floor(step / STEPS), step: step % STEPS, level };
  }

  async function play(score, { repeat = false, countIn = false } = {}) {
    stop();
    const ticket = generation;
    phase = "loading";
    try {
      const events = prepare(score);
      const audio = await ready();
      const keys = [...new Set(events.filter(event => event.instrument === "guitar").map(event => event.note))];
      const buffers = new Map(await Promise.all(keys.map(async key => [key, await sample(key, audio)])));
      if (ticket !== generation) return { cancelled: true };
      if (audio.state !== "running") throw new Error("The browser paused sound. Press Play to retry.");
      for (const buffer of buffers.values()) if (!(buffer.duration > .014)) throw new Error("An acoustic sample decoded without sound.");
      const stepSeconds = 60 / score.tempo / 4;
      const start = audio.currentTime + HEADROOM;
      const origin = start + (countIn ? STEPS * stepSeconds : 0);
      const durationSeconds = score.bars * STEPS * stepSeconds;
      const run = { events, buffers, stepSeconds, start, origin, durationSeconds, bars: score.bars, countIn, repeat,
        next: origin + durationSeconds };
      if (countIn) for (let beat = 0; beat < 4; beat++) {
        render({ instrument: "click", velocity: beat === 0 ? .26 : .17, frequency: beat === 0 ? 930 : 710 },
          start + beat * stepSeconds * 4, stepSeconds, origin, buffers);
      }
      scheduleCycle(run, origin);
      active = run;
      phase = "playing";
      timer = setTimer(() => tick(run), 55);
      return { cancelled: false, durationSeconds, eventCount: score.events.length };
    } catch (error) {
      if (ticket !== generation) return { cancelled: true };
      stop();
      throw error;
    }
  }
  return Object.freeze({ play, stop, position });
}
