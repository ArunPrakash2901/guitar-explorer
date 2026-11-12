import { PROGRESSION_LENGTHS } from "./progression/generator.js";
import { selectGuitarAttack } from "./progression-sample-bank.mjs";
import { rhythmPlan, DEFAULT_PATTERN, METERS } from "./progression-rhythm.mjs";
import { drumPlan } from "./progression-grooves.mjs";
import { DRUM_SAMPLES } from "./progression-drum-samples.mjs";

/** Acoustic samples and transport scheduled against a single AudioContext. */
export const MIN_BPM = 50;
export const MAX_BPM = 180;
const MAX_VOICES = 80;
export const DEFAULT_MIX = Object.freeze({ guitar: 0.82, drums: 0.62 });
const DRUM_GAIN = Object.freeze({ kick: 0.58, snare: 0.53, hat: 0.34 });
const TONE_GAIN_DB = Object.freeze({ natural: 0, warm: -4, bright: 3 });
export const GUITAR_TONES = Object.freeze(Object.keys(TONE_GAIN_DB));
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
  if (!Array.isArray(cards) || !PROGRESSION_LENGTHS.includes(cards.length)) {
    throw new RangeError("Acoustic playback needs a supported chord count");
  }
  const meter = options.meter ?? "4/4";
  const pattern = options.pattern ?? (meter === "4/4" ? "steady" : DEFAULT_PATTERN[meter]);
  const groove = rhythmPlan(meter, pattern, bpm);
  const secondsPerBeat = groove.secondsPerPulse;
  const secondsPerBar = groove.secondsPerBar;
  const drumGroove = options.groove ?? "off";
  const drumParts = options.drumParts ?? null;
  const barHits = drumPlan(meter, drumGroove, bpm, { parts: drumParts });
  const fillHits = options.fill ? drumPlan(meter, drumGroove, bpm, { parts: drumParts, fill: true }) : barHits;
  const click = options.click ? Array.from({ length: METERS[meter].pulses }, (_, pulse) => ({
    kind: "click", voice: "hat", level: pulse === 0 ? .95 : .48, seconds: pulse * secondsPerBeat,
  })) : [];
  const strokes = [];
  const drumHits = [];
  const clickHits = [];
  for (let slotIndex = 0; slotIndex < cards.length; slotIndex += 1) {
    const notes = soundingNotes(cards[slotIndex]);
    for (const [index, event] of groove.strokes.entries()) {
      const untilNext = (groove.strokes[index + 1]?.seconds ?? secondsPerBar) - event.seconds;
      strokes.push(Object.freeze({
        kind: "strum", slotIndex,
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
    const endsPhrase = (slotIndex + 1) % 4 === 0 || slotIndex === cards.length - 1;
    for (const hit of endsPhrase ? fillHits : barHits) {
      drumHits.push(Object.freeze({ ...hit, kind: "drum", slotIndex, seconds: slotIndex * secondsPerBar + hit.seconds }));
    }
    for (const hit of click) {
      clickHits.push(Object.freeze({ ...hit, slotIndex, seconds: slotIndex * secondsPerBar + hit.seconds }));
    }
  }
  const events = [...strokes, ...drumHits, ...clickHits].sort((a, b) => a.seconds - b.seconds);
  return Object.freeze({
    kind: "progression", repeat: true,
    meter, pattern, groove: drumGroove, pulseUnit: groove.pulseUnit,
    bpm, secondsPerBeat, secondsPerBar,
    loopSeconds: cards.length * secondsPerBar,
    strokes: Object.freeze(strokes), drumHits: Object.freeze(drumHits),
    clickHits: Object.freeze(clickHits), events: Object.freeze(events),
  });
}


/** Deterministic, time-bounded note-by-note scale sequence on the guitar clock. */
export function planScaleNotes(notes, bpm, { loop = false, meter = "4/4" } = {}) {
  assertBpm(bpm);
  if (!Array.isArray(notes) || notes.length < 1 || notes.length > 96 ||
      !notes.every(({ semitone, stringIndex }) => Number.isInteger(semitone) &&
        semitone >= 0 && semitone <= 127 && Number.isInteger(stringIndex) &&
        stringIndex >= 0 && stringIndex < 6)) {
    throw new RangeError("Scale playback needs 1–96 valid sounded string notes");
  }
  if (!Object.hasOwn(METERS, meter)) throw new RangeError("Choose a scale practice meter");
  const secondsPerNote = (60 / bpm) / METERS[meter].subdivisions;
  const strokes = Object.freeze(notes.map((note, index) => Object.freeze({
    kind: "scale", slotIndex: null, seconds: index * secondsPerNote,
    notes: Object.freeze([{ stringIndex: note.stringIndex, semitone: note.semitone }]),
    level: .8, direction: "down", sustain: Math.min(.9, secondsPerNote * 1.5),
  })));
  return Object.freeze({
    kind: "scale", repeat: Boolean(loop), bpm,
    secondsPerBar: secondsPerNote, loopSeconds: notes.length * secondsPerNote,
    strokes, drumHits: Object.freeze([]), events: strokes,
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
    this.trackBuses = {};
    this.mix = Object.fromEntries(Object.entries(DEFAULT_MIX).map(([track, volume]) => [track, { volume, muted: false }]));
    this.toneFilter = null;
    this.clickOutput = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.plan = null;
    this.loopStart = 0;
    this.transportStartsAt = 0;
    this.nextEvent = 0;
    this.interval = null;
    this.voices = new Set();
    this.revision = 0;
    this.playing = false;
    this.pausedOffset = null;
  }

  async ensureContext() {
    if (!this.AudioContextType || !this.fetchAsset) {
      throw new Error("Sampled guitar playback needs Web Audio and sample loading");
    }
    if (!this.context) {
      this.context = new this.AudioContextType();
      const master = this.context.createDynamicsCompressor?.();
      if (master) {
        master.threshold.value = -12;
        master.knee.value = 14;
        master.ratio.value = 4;
        master.attack.value = 0.003;
        master.release.value = 0.12;
        master.connect(this.context.destination);
      }
      this.clickOutput = master ?? this.context.destination;
      for (const [track, { volume, muted }] of Object.entries(this.mix)) {
        const bus = this.context.createGain();
        bus.gain.setValueAtTime(muted ? 0 : volume, this.context.currentTime);
        bus.connect(master ?? this.context.destination);
        this.trackBuses[track] = bus;
      }
      if (typeof this.context.createBiquadFilter === "function") {
        this.toneFilter = this.context.createBiquadFilter();
        this.toneFilter.type = "highshelf";
        this.toneFilter.frequency.setValueAtTime(2500, this.context.currentTime);
        this.toneFilter.gain.setValueAtTime(TONE_GAIN_DB[this.tone], this.context.currentTime);
        this.toneFilter.connect(this.trackBuses.guitar);
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

  setTrackMix(track, volume, muted) {
    if (!Object.hasOwn(DEFAULT_MIX, track) || !Number.isFinite(volume) || volume < 0 || volume > 1 ||
        typeof muted !== "boolean") throw new RangeError("Choose a track, volume and mute state");
    this.mix[track] = { volume, muted };
    this.trackBuses[track]?.gain.setTargetAtTime(muted ? 0 : volume, this.context.currentTime, 0.015);
  }

  async loadRecording(sample, directory) {
    if (this.buffers.has(sample.file)) return;
    let task = this.loading.get(sample.file);
    if (!task) {
      const context = this.context;
      task = (async () => {
        const response = await this.fetchAsset(new URL("./samples/" + directory + "/" + sample.file, import.meta.url));
        if (!response.ok) throw new Error("Recording unavailable: " + sample.file);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== sample.bytes) {
          throw new Error("Recording did not match the CC0 sample manifest");
        }
        const buffer = await context.decodeAudioData(bytes);
        if (context === this.context) this.buffers.set(sample.file, buffer);
      })();
      this.loading.set(sample.file, task);
    }
    try { await task; }
    finally { if (this.loading.get(sample.file) === task) this.loading.delete(sample.file); }
  }

  async preload(strokes, drumHits = []) {
    await this.ensureContext();
    const selected = new Map();
    for (const { notes, level } of strokes) {
      for (const note of notes) {
        const attack = selectGuitarAttack(note, velocityFor(level));
        selected.set(attack.sample.file, attack.sample);
      }
    }
    const drumVoices = new Set(drumHits.map(({ voice }) => voice));
    await Promise.all([
      ...[...selected.values()].map((sample) => this.loadRecording(sample, "steel")),
      ...[...drumVoices].map((voice) => this.loadRecording(DRUM_SAMPLES[voice], "drums")),
    ]);
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
      const output = this.toneFilter ?? this.trackBuses.guitar;
      if (panner) {
        panner.pan.setValueAtTime((note.stringIndex - 2.5) * 0.10, at);
        gain.connect(panner);
        panner.connect(output);
      } else {
        gain.connect(output);
      }
      this.startVoice({ source, gain, panner }, at, duration);
    }
  }

  scheduleDrum(voice, when, level, click = false) {
    const sample = DRUM_SAMPLES[voice];
    const buffer = this.buffers.get(sample.file);
    if (!buffer) throw new Error("A drum recording was not loaded before scheduling");
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    const duration = click ? Math.min(.065, buffer.duration) : buffer.duration;
    gain.gain.setValueAtTime(DRUM_GAIN[voice] * level, when);
    if (click) gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(gain);
    gain.connect(click ? this.clickOutput : this.trackBuses.drums);
    this.startVoice({ source, gain }, when, duration);
  }

  startVoice(voice, at, duration) {
    if (this.voices.size >= MAX_VOICES) this.releaseVoice(this.voices.values().next().value, true);
    this.voices.add(voice);
    voice.source.onended = () => this.releaseVoice(voice);
    voice.source.start(at);
    voice.source.stop(at + duration);
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
    const { events, loopSeconds } = this.plan;
    const floor = this.context.currentTime - 0.02;
    const horizon = this.context.currentTime + LOOKAHEAD_SECONDS;
    if (floor > this.loopStart) {
      const cycle = Math.floor((floor - this.loopStart) / loopSeconds);
      const offset = floor - this.loopStart - cycle * loopSeconds;
      const next = events.findIndex(({ seconds }) => seconds >= offset);
      this.nextEvent = Math.max(this.nextEvent, cycle * events.length + (next < 0 ? events.length : next));
    }
    if (this.plan.repeat === false && this.nextEvent >= events.length) {
      if (this.context.currentTime >= this.loopStart + loopSeconds + 0.2) {
        this.playing = false;
        this.plan = null;
        if (this.interval !== null) clearInterval(this.interval);
        this.interval = null;
      }
      return;
    }
    let work = 0;
    while (work < 192) {
      if (this.plan.repeat === false && this.nextEvent >= events.length) break;
      const cycle = Math.floor(this.nextEvent / events.length);
      const event = events[this.nextEvent % events.length];
      const when = this.loopStart + cycle * loopSeconds + event.seconds;
      if (when > horizon) break;
      this.nextEvent += 1;
      work += 1;
      if (when < floor) continue;
      if (event.kind === "drum" || event.kind === "click") this.scheduleDrum(event.voice, when, event.level, event.kind === "click");
      else this.scheduleStrum(event.notes, when, event.direction, event.level, event.sustain);
    }
  }

  async play(cards, bpm, options = {}) {
    const plan = planProgressionStrokes(cards, bpm, options);
    this.stop();
    const revision = this.revision;
    await this.preload(plan.strokes, [...plan.drumHits, ...plan.clickHits]);
    if (revision !== this.revision) return false;
    this.startPlan(plan, 0);
    return true;
  }

  async playScale(notes, bpm, options = {}) {
    const plan = planScaleNotes(notes, bpm, options);
    this.stop();
    const revision = this.revision;
    await this.preload(plan.strokes);
    if (revision !== this.revision) return false;
    this.startPlan(plan, 0);
    return true;
  }

  startPlan(plan, offset) {
    this.plan = plan;
    this.transportStartsAt = this.context.currentTime + 0.12;
    this.loopStart = this.transportStartsAt - offset;
    const first = plan.events.findIndex(({ seconds }) => seconds >= offset);
    this.nextEvent = first < 0 ? plan.events.length : first;
    this.pausedOffset = null;
    this.playing = true;
    this.fillSchedule();
    this.interval = setInterval(() => this.fillSchedule(), SCHEDULE_INTERVAL_MS);
  }

  pause() {
    if (!this.playing) return false;
    this.pausedOffset = Math.max(0, this.context.currentTime - this.loopStart) % this.plan.loopSeconds;
    this.revision += 1;
    this.playing = false;
    this.clearSchedule();
    return true;
  }

  async resume() {
    if (!this.isPaused()) return false;
    const revision = ++this.revision;
    await this.ensureContext();
    if (revision !== this.revision) return false;
    this.startPlan(this.plan, this.pausedOffset);
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

  activeScaleNote() {
    if (!this.playing || this.plan?.kind !== "scale" || this.context.currentTime < this.transportStartsAt) return null;
    const elapsed = this.context.currentTime - this.loopStart;
    const { loopSeconds, secondsPerBar, events, repeat } = this.plan;
    if (!repeat && elapsed >= loopSeconds) return null;
    return events[Math.floor((elapsed % loopSeconds) / secondsPerBar)]?.notes[0] ?? null;
  }

  activeSlot() {
    if (!this.playing || !this.context || !this.plan || this.plan.kind === "scale") return null;
    if (this.context.currentTime < this.transportStartsAt) return null;
    const elapsed = this.context.currentTime - this.loopStart;
    return Math.floor((elapsed % this.plan.loopSeconds) / this.plan.secondsPerBar);
  }

  isPlaying() { return this.playing; }

  isPaused() { return this.pausedOffset !== null; }

  isActive() { return this.playing || this.voices.size > 0; }

  stop() {
    this.revision += 1;
    this.playing = false;
    this.plan = null;
    this.pausedOffset = null;
    this.clearSchedule();
  }

  clearSchedule() {
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
    this.trackBuses = {};
    this.toneFilter = null;
    this.clickOutput = null;
    this.buffers.clear();
    this.loading.clear();
  }
}
