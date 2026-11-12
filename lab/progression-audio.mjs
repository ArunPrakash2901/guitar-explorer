import { selectGuitarAttack } from "./progression-sample-bank.mjs";
import { rhythmPlan, DEFAULT_PATTERN } from "./progression-rhythm.mjs";

/**
 * Four-chord, 4/4 acoustic playback. Uses Guitar Explorer's existing CC0 steel
 * guitar recordings with controlled pitch-shifting; no oscillator voice.
 * All note onsets are scheduled against the AudioContext clock.
 */
export const MIN_BPM = 50;
export const MAX_BPM = 180;
const STRUM_SPREAD_SECONDS = 0.025;
const LOOKAHEAD_SECONDS = 0.65;
const SCHEDULE_INTERVAL_MS = 100;

function assertBpm(bpm) {
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
    throw new RangeError("Tempo must be between " + MIN_BPM + " and " + MAX_BPM + " BPM");
  }
}

function soundingNotes(card) {
  const voicing = card?.voicings?.[card.voicingIndex];
  if (!voicing?.notes?.length) throw new Error("Select a playable guitar grip for all four chords");
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
  if (!Array.isArray(cards) || cards.length !== 4) {
    throw new RangeError("Acoustic playback requires exactly four chord cards");
  }
  const meter = options.meter ?? "4/4";
  const pattern = options.pattern ?? (meter === "4/4" ? "steady" : DEFAULT_PATTERN[meter]);
  const groove = rhythmPlan(meter, pattern, bpm);
  const secondsPerBeat = groove.secondsPerPulse;
  const secondsPerBar = groove.secondsPerBar;
  const strokes = [];
  for (let slotIndex = 0; slotIndex < cards.length; slotIndex += 1) {
    const notes = soundingNotes(cards[slotIndex]);
    for (const event of groove.strokes) {
      strokes.push(Object.freeze({
        slotIndex,
        beat: event.step / (secondsPerBeat / groove.secondsPerStep),
        step: event.step,
        direction: event.direction,
        level: event.level,
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
    if (!this.context) this.context = new this.AudioContextType();
    if (this.context.state === "closed") throw new Error("Audio context is closed");
    if (this.context.state !== "running") await this.context.resume();
    return this.context;
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
          throw new Error("Guitar recording did not match the existing CC0 sample manifest");
        }
        const buffer = await this.context.decodeAudioData(bytes);
        this.buffers.set(sample.file, buffer);
      })();
      this.loading.set(sample.file, task);
    }
    try { await this.loading.get(sample.file); }
    finally { this.loading.delete(sample.file); }
  }

  async preload(notes) {
    await this.ensureContext();
    const selected = new Map(notes.map((note) => {
      const attack = selectGuitarAttack(note);
      return [attack.sample.file, attack];
    }));
    await Promise.all([...selected.values()].map((attack) => this.loadAttack(attack)));
  }

  scheduleStrum(notes, when, direction = "down", level = 1) {
    const context = this.context;
    const ordered = direction === "up" ? [...notes].reverse() : notes;
    const peak = (0.65 * level) / Math.max(1, Math.sqrt(ordered.length));
    for (let index = 0; index < ordered.length; index += 1) {
      const attack = selectGuitarAttack(ordered[index]);
      const buffer = this.buffers.get(attack.sample.file);
      if (!buffer) throw new Error("A guitar recording was not loaded before scheduling");
      const at = when + index * STRUM_SPREAD_SECONDS;
      const duration = Math.min(0.95, buffer.duration / attack.playbackRate);
      if (!Number.isFinite(duration) || duration < 0.06) {
        throw new Error("Guitar recording is too short for this pitch");
      }
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(attack.playbackRate, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      source.connect(gain);
      gain.connect(context.destination);
      const voice = { source, gain };
      this.voices.add(voice);
      source.onended = () => {
        this.voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start(at);
      source.stop(at + duration);
    }
  }

  fillSchedule() {
    if (!this.playing || !this.context || !this.plan) return;
    const { strokes, loopSeconds } = this.plan;
    const floor = this.context.currentTime - 0.02;
    const horizon = this.context.currentTime + LOOKAHEAD_SECONDS;
    if (floor > this.loopStart + loopSeconds) {
      const skippedLoops = Math.max(0, Math.floor((floor - this.loopStart) / loopSeconds) - 1);
      this.nextStroke = Math.max(this.nextStroke, skippedLoops * strokes.length);
    }
    let work = 0;
    while (work < 32) {
      const cycle = Math.floor(this.nextStroke / strokes.length);
      const stroke = strokes[this.nextStroke % strokes.length];
      const when = this.loopStart + cycle * loopSeconds + stroke.seconds;
      if (when > horizon) break;
      this.nextStroke += 1;
      work += 1;
      if (when < floor) continue;
      this.scheduleStrum(stroke.notes, when, stroke.direction, stroke.level);
    }
  }

  async play(cards, bpm, options = {}) {
    const plan = planProgressionStrokes(cards, bpm, options);
    this.stop();
    const revision = this.revision;
    await this.preload(plan.strokes.flatMap(({ notes }) => notes));
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
    await this.preload(notes);
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

  stop() {
    this.revision += 1;
    this.playing = false;
    this.plan = null;
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
    for (const { source, gain } of this.voices) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    }
    this.voices.clear();
  }

  async dispose() {
    this.stop();
    if (this.context?.state !== "closed" && this.context) await this.context.close();
    this.context = null;
    this.buffers.clear();
    this.loading.clear();
  }
}
