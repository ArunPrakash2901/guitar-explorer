/**
 * Bounded, original Web Audio guitar-pluck accompaniment for the progression
 * workbench. One AudioContext clock owns every scheduled note and bar boundary.
 * JS timers only refill the schedule horizon, never define musical onset time.
 *
 * This is an intentionally synthetic preview voice, not a sampled-guitar or
 * licensed StrumForge sound. Four chords, 4/4, two downstrokes per bar.
 */
export const MIN_BPM = 50;
export const MAX_BPM = 180;
const BEATS_PER_BAR = 4;
const STRUM_SPREAD_SECONDS = 0.018;
const LOOKAHEAD_SECONDS = 0.6;
const SCHEDULE_INTERVAL_MS = 100;

function assertBpm(bpm) {
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
    throw new RangeError("Tempo must be between " + MIN_BPM + " and " + MAX_BPM + " BPM");
  }
}

function soundingNotes(card) {
  const voice = card?.voicings?.[card.voicingIndex];
  if (!voice?.notes?.length) throw new Error("Select a playable guitar grip for all four chords");
  const midis = voice.notes.map(({ semitone }) => semitone);
  if (!midis.every((note) => Number.isFinite(note) && note >= 0 && note <= 127)) {
    throw new RangeError("A guitar grip contains an invalid MIDI pitch");
  }
  return Object.freeze(midis);
}

/** Pure timing plan, independently testable without an AudioContext. */
export function planProgressionStrokes(cards, bpm) {
  assertBpm(bpm);
  if (!Array.isArray(cards) || cards.length !== 4) {
    throw new RangeError("Audio v0 requires exactly four chord cards");
  }
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * BEATS_PER_BAR;
  const strokes = [];
  for (let slotIndex = 0; slotIndex < cards.length; slotIndex += 1) {
    const midis = soundingNotes(cards[slotIndex]);
    for (const beat of [0, 2]) {
      strokes.push(Object.freeze({
        slotIndex,
        beat,
        seconds: slotIndex * secondsPerBar + beat * secondsPerBeat,
        midis,
      }));
    }
  }
  return Object.freeze({
    bpm,
    secondsPerBeat,
    secondsPerBar,
    loopSeconds: cards.length * secondsPerBar,
    strokes: Object.freeze(strokes),
  });
}

function midiFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export class ProgressionAudio {
  constructor(AudioContextType = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
    this.AudioContextType = AudioContextType;
    this.context = null;
    this.plan = null;
    this.loopStart = 0;
    this.nextStroke = 0;
    this.interval = null;
    this.voices = new Set();
    this.revision = 0;
    this.playing = false;
  }

  async ensureContext() {
    if (!this.AudioContextType) throw new Error("This browser does not support Web Audio");
    if (!this.context) this.context = new this.AudioContextType();
    if (this.context.state === "closed") throw new Error("Audio context is closed");
    if (this.context.state !== "running") await this.context.resume();
    return this.context;
  }

  /** Schedule notes on the AudioContext clock, with a physical strum stagger. */
  scheduleStrum(midis, when) {
    const ctx = this.context;
    for (let index = 0; index < midis.length; index += 1) {
      const at = when + index * STRUM_SPREAD_SECONDS;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(midiFrequency(midis[index]), at);
      const peak = 0.11 / Math.sqrt(midis.length);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.65);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + 0.66);
    }
  }

  fillSchedule() {
    if (!this.playing || !this.context || !this.plan) return;
    const ctx = this.context;
    const { strokes, loopSeconds } = this.plan;
    const floor = ctx.currentTime - 0.02;
    const horizon = ctx.currentTime + LOOKAHEAD_SECONDS;

    // After a suspended/background tab returns, skip the missed cycles instead
    // of spawning an unbounded backlog of notes in the past.
    if (floor > this.loopStart + loopSeconds) {
      const completedLoops = Math.max(0, Math.floor((floor - this.loopStart) / loopSeconds) - 1);
      this.nextStroke = Math.max(this.nextStroke, completedLoops * strokes.length);
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
      this.scheduleStrum(stroke.midis, when);
    }
  }

  async play(cards, bpm) {
    // Validate before interrupting a valid earlier performance.
    const plan = planProgressionStrokes(cards, bpm);
    this.stop();
    const revision = this.revision;
    const ctx = await this.ensureContext();
    if (revision !== this.revision) return false;
    this.plan = plan;
    this.loopStart = ctx.currentTime + 0.1;
    this.nextStroke = 0;
    this.playing = true;
    this.fillSchedule();
    this.interval = setInterval(() => this.fillSchedule(), SCHEDULE_INTERVAL_MS);
    return true;
  }

  async audition(card) {
    const midis = soundingNotes(card);
    this.stop();
    const revision = this.revision;
    const ctx = await this.ensureContext();
    if (revision !== this.revision) return false;
    this.scheduleStrum(midis, ctx.currentTime + 0.04);
    return true;
  }

  activeSlot() {
    if (!this.playing || !this.context || !this.plan) return null;
    const elapsed = this.context.currentTime - this.loopStart;
    if (elapsed < 0) return null;
    return Math.floor((elapsed % this.plan.loopSeconds) / this.plan.secondsPerBar);
  }

  isPlaying() {
    return this.playing;
  }

  stop() {
    this.revision += 1;
    this.playing = false;
    this.plan = null;
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
    for (const oscillator of this.voices) {
      try { oscillator.stop(); } catch { /* A completed oscillator is already stopped. */ }
      try { oscillator.disconnect(); } catch { /* Context may have been closed. */ }
    }
    this.voices.clear();
  }

  async dispose() {
    this.stop();
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.context = null;
  }
}
