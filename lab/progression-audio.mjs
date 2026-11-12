import { selectGuitarAttack } from "./progression-sample-bank.mjs";
import { rhythmPlan, DEFAULT_PATTERN } from "./progression-rhythm.mjs";

/** Acoustic samples and transport scheduled against a single AudioContext. */
export const MIN_BPM = 50;
export const MAX_BPM = 180;
const MAX_GUITAR_VOICES = 64;
const TONE_GAIN_DB = Object.freeze({ natural: 0, warm: -4, bright: 3 });
const LOOKAHEAD_SECONDS = 0.65;
const SCHEDULE_INTERVAL_MS = 100;

function assertBpm(bpm) {
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
    throw new RangeError("Tempo must be between " + MIN_BPM + " and " + MAX_BPM + " BPM");
  }
}

function velocityFor(level) {
  return Math.max(1, Math.min(127, Math.round(112 * level)));
}

function soundingNotes(card) {
  const voicing = card?.voicings?.[card.voicingIndex];
  if (!voicing?.notes?.length) throw new Error("Select a playable guitar grip for every chord");
  const notes = voicing.notes.map(({ semitone, stringIndex }) => Object.freeze({ semitone, stringIndex }));
  if (!notes.every(({ semitone, stringIndex }) =>
    Number.isInteger(semitone) && semitone >= 0 && semitone <= 127 &&
    Number.isInteger(stringIndex) && stringIndex >= 0 && stringIndex < 6)) {
    throw new RangeError("A guitar grip contains an invalid sounded note");
  }
  return Object.freeze(notes);
}

/** Pure tempo/transport facts; never depends on samples or rendering APIs. */
export function planProgressionStrokes(cards, bpm, options = {}) {
  assertBpm(bpm);
  if (!Array.isArray(cards) || cards.length < 2 || cards.length > 8) {
    throw new RangeError("Acoustic playback needs two to eight chord cards");
  }
  const meter = options.meter ?? "4/4";
  const pattern = options.pattern ?? (meter === "4/4" ? "steady" : DEFAULT_PATTERN[meter]);
  const groove = rhythmPlan(meter, pattern, bpm);
  const secondsPerBeat = groove.secondsPerPulse;
  const secondsPerBar = groove.secondsPerBar;
  const strokes = [];
  for (let slotIndex = 0; slotIndex < cards.length; slotIndex += 1) {
    const notes = soundingNotes(cards[slotIndex]);
    for (const [index, event] of groove.strokes.entries()) {
      const untilNext = (groove.strokes[index + 1]?.seconds ?? secondsPerBar) - event.seconds;
      strokes.push(Object.freeze({
        slotIndex,
        beat: event.step / (secondsPerBeat / groove.secondsPerStep),
        step: event.step,
        direction: event.direction,
        level: event.level,
        sustain: Math.min(1.35, Math.max(0.32, untilNext * 1.5)),
        seconds: slotIndex * secondsPerBar + event.seconds,
        notes,
        midis: Object.freeze(notes.map(({ semitone }) => semitone)),
      }));
    }
  }
  return Object.freeze({
    meter, pattern, pulseUnit: groove.pulseUnit,
    bpm, secondsPerBeat, secondsPerBar,
    loopSeconds: cards.length * secondsPerBar,
    strokes: Object.freeze(strokes),
  });
}

export class ProgressionAudio {
  constructor(
    AudioContextType = globalThis.AudioContext ?? globalThis.webkitAudioContext,
    fetchAsset = globalThis.fetch?.bind(globalThis),
  ) {
    this.AudioContextType = AudioContextType;
    this.fetchAsset = fetchAsset;
    this.context = null;
    this.tone = "natural";
    this.guitarBus = null;
    this.toneFilter = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.plan = null;
    this.loopStart = 0;
    this.nextStroke = 0;
    this.interval = null;
    this.voices = new Set();
    this.revision = 0;
    this.playing = false;
  }

  async ensureContext() {
    if (!this.AudioContextType || !this.fetchAsset) {
      throw new Error("Sampled guitar playback needs Web Audio and sample loading");
    }
    if (!this.context) {
      this.context = new this.AudioContextType();
      this.guitarBus = this.context.createGain();
      this.guitarBus.gain.setValueAtTime(0.82, this.context.currentTime);
      this.guitarBus.connect(this.context.destination);
      if (typeof this.context.createBiquadFilter === "function") {
        this.toneFilter = this.context.createBiquadFilter();
        this.toneFilter.type = "highshelf";
        this.toneFilter.frequency.setValueAtTime(2500, this.context.currentTime);
        this.toneFilter.gain.setValueAtTime(TONE_GAIN_DB[this.tone], this.context.currentTime);
        this.toneFilter.connect(this.guitarBus);
      }
    }
    if (this.context.state === "closed") throw new Error("Audio context is closed");
    if (this.context.state !== "running") await this.context.resume();
    return this.context;
  }

  setTone(tone) {
    if (!Object.hasOwn(TONE_GAIN_DB, tone)) throw new RangeError("Choose a guitar tone");
    this.tone = tone;
    this.toneFilter?.gain.setTargetAtTime(TONE_GAIN_DB[tone], this.context.currentTime, 0.02);
  }

  async loadAttack(attack) {
    const { sample } = attack;
    if (this.buffers.has(sample.file)) return;
    if (!this.loading.has(sample.file)) {
      const task = (async () => {
        const response = await this.fetchAsset(new URL("./samples/steel/" + sample.file, import.meta.url));
        if (!response.ok) throw new Error("Guitar recording unavailable: " + sample.note);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== sample.bytes) {
          throw new Error("Guitar recording did not match the CC0 sample manifest");
        }
        const buffer = await this.context.decodeAudioData(bytes);
        this.buffers.set(sample.file, buffer);
      })();
      this.loading.set(sample.file, task);
    }
    try { await this.loading.get(sample.file); }
    finally { this.loading.delete(sample.file); }
  }

  async preload(strokes) {
    await this.ensureContext();
    const selected = new Map();
    for (const { notes, level } of strokes) {
      for (const note of notes) {
        const attack = selectGuitarAttack(note, velocityFor(level));
        selected.set(attack.sample.file, attack);
      }
    }
    await Promise.all([...selected.values()].map((attack) => this.loadAttack(attack)));
  }

  scheduleStrum(notes, when, direction = "down", level = 1, sustain = 1.25) {
    const context = this.context;
    const upward = direction === "up";
    const ordered = [...notes].sort((a, b) => upward ? b.stringIndex - a.stringIndex : a.stringIndex - b.stringIndex);
    const spread = upward ? 0.012 : 0.017;
    const peak = 0.45 * Math.sqrt(level / ordered.length);
    for (let index = 0; index < ordered.length; index += 1) {
      const note = ordered[index];
      const attack = selectGuitarAttack(note, velocityFor(level));
      const buffer = this.buffers.get(attack.sample.file);
      if (!buffer) throw new Error("A guitar recording was not loaded before scheduling");
      const at = when + index * spread;
      const duration = Math.min(sustain, buffer.duration / attack.playbackRate);
      if (!Number.isFinite(duration) || duration < 0.06) {
        throw new Error("Guitar recording is too short for this pitch");
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(attack.playbackRate, at);
      gain.gain.setValueAtTime(0.0001, at);
      const accent = peak * (1 - index * 0.035);
      gain.gain.linearRampToValueAtTime(accent, at + 0.003);
      gain.gain.setValueAtTime(accent, at + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      source.connect(gain);
      const panner = context.createStereoPanner?.();
      const output = this.toneFilter ?? this.guitarBus;
      if (panner) {
        panner.pan.setValueAtTime((note.stringIndex - 2.5) * 0.10, at);
        gain.connect(panner);
        panner.connect(output);
      } else {
        gain.connect(output);
      }
      const voice = { source, gain, panner };
      if (this.voices.size >= MAX_GUITAR_VOICES) this.releaseVoice(this.voices.values().next().value, true);
      this.voices.add(voice);
      source.onended = () => this.releaseVoice(voice);
      source.start(at);
      source.stop(at + duration);
    }
  }

  releaseVoice(voice, stop = false) {
    if (!this.voices.delete(voice)) return;
    const { source, gain, panner } = voice;
    source.onended = null;
    if (stop) {
      try { source.stop(); } catch {}
    }
    source.disconnect();
    gain.disconnect();
    panner?.disconnect();
  }

  fillSchedule() {
    if (!this.playing || !this.context || !this.plan) return;
    const { strokes, loopSeconds } = this.plan;
    const floor = this.context.currentTime - 0.02;
    const horizon = this.context.currentTime + LOOKAHEAD_SECONDS;
    if (floor > this.loopStart + loopSeconds) {
      const cycle = Math.floor((floor - this.loopStart) / loopSeconds);
      const offset = floor - this.loopStart - cycle * loopSeconds;
      const next = strokes.findIndex(({ seconds }) => seconds >= offset);
      this.nextStroke = Math.max(this.nextStroke, cycle * strokes.length + (next < 0 ? strokes.length : next));
    }
    let work = 0;
    while (work < 64) {
      const cycle = Math.floor(this.nextStroke / strokes.length);
      const stroke = strokes[this.nextStroke % strokes.length];
      const when = this.loopStart + cycle * loopSeconds + stroke.seconds;
      if (when > horizon) break;
      this.nextStroke += 1;
      work += 1;
      if (when < floor) continue;
      this.scheduleStrum(stroke.notes, when, stroke.direction, stroke.level, stroke.sustain);
    }
  }

  async play(cards, bpm, options = {}) {
    const plan = planProgressionStrokes(cards, bpm, options);
    this.stop();
    const revision = this.revision;
    await this.preload(plan.strokes);
    if (revision !== this.revision) return false;
    this.plan = plan;
    this.loopStart = this.context.currentTime + 0.12;
    this.nextStroke = 0;
    this.playing = true;
    this.fillSchedule();
    this.interval = setInterval(() => this.fillSchedule(), SCHEDULE_INTERVAL_MS);
    return true;
  }

  async audition(card) {
    const notes = soundingNotes(card);
    this.stop();
    const revision = this.revision;
    await this.preload([{ notes, level: 1 }]);
    if (revision !== this.revision) return false;
    this.scheduleStrum(notes, this.context.currentTime + 0.04);
    return true;
  }

  activeSlot() {
    if (!this.playing || !this.context || !this.plan) return null;
    const elapsed = this.context.currentTime - this.loopStart;
    if (elapsed < 0) return null;
    return Math.floor((elapsed % this.plan.loopSeconds) / this.plan.secondsPerBar);
  }

  isPlaying() { return this.playing; }

  isActive() { return this.playing || this.voices.size > 0; }

  stop() {
    this.revision += 1;
    this.playing = false;
    this.plan = null;
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
    for (const voice of this.voices) this.releaseVoice(voice, true);
  }

  async dispose() {
    this.stop();
    if (this.context?.state !== "closed" && this.context) await this.context.close();
    this.context = null;
    this.guitarBus = null;
    this.toneFilter = null;
    this.buffers.clear();
    this.loading.clear();
  }
}
