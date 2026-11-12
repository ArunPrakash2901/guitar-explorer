export const MIN_BPM = 40;
export const MAX_BPM = 220;

const TIMER_MS = 25;
const LOOKAHEAD_SECONDS = 0.15;
const START_LEAD_SECONDS = 0.045;
const STRUM_STEP_SECONDS = 0.012;
const CLOCK_ROUNDING_SECONDS = 1e-7;

function copyGrip(semitones) {
  if (!Array.isArray(semitones) || semitones.length < 1 || semitones.length > 6) {
    throw new TypeError("A playable grip needs one to six registered pitches.");
  }
  const pitches = [...semitones];
  if (pitches.some((pitch) => !Number.isInteger(pitch) || pitch < 0 || pitch > 127)) {
    throw new RangeError("Grip pitches must be registered semitones from 0 to 127.");
  }
  return pitches;
}

export function createProgressionAudio({
  onState = () => {},
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  setTimer = (callback, delay) => globalThis.setInterval(callback, delay),
  clearTimer = (timer) => globalThis.clearInterval(timer),
} = {}) {
  let context;
  let current;
  let status = "idle";
  let slot = null;

  function publish(nextStatus, nextSlot = null) {
    if (status === nextStatus && slot === nextSlot) return;
    status = nextStatus;
    slot = nextSlot;
    onState({ status, slot });
  }

  function disconnect(voice) {
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  }

  function cancelRun() {
    const run = current;
    current = undefined;
    if (!run) return;
    if (run.timer !== undefined) clearTimer(run.timer);
    for (const voice of run.voices) {
      voice.oscillator.onended = null;
      try {
        voice.oscillator.stop();
      } catch {
        // The oscillator may already have reached its scheduled end.
      }
      disconnect(voice);
    }
    run.voices.clear();
  }

  function stop() {
    cancelRun();
    publish("idle");
  }

  function scheduleGrip(run, grip, barStart) {
    const duration = Math.min(0.95, run.barSeconds * 0.8);
    const peak = 0.16 / Math.sqrt(grip.pitches.length);
    grip.pitches.forEach((semitone, index) => {
      const when = barStart + index * STRUM_STEP_SECONDS;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const voice = { oscillator, gain };
      run.voices.add(voice);
      oscillator.onended = () => {
        run.voices.delete(voice);
        disconnect(voice);
      };

      oscillator.type = "triangle";
      oscillator.frequency.value = 440 * 2 ** ((semitone - 69) / 12);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(peak, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(when);
      oscillator.stop(when + duration);
    });
  }

  function tick(run) {
    if (current !== run) return;
    const now = context.currentTime;
    const bar = Math.floor((now + CLOCK_ROUNDING_SECONDS - run.origin) / run.barSeconds);
    if (context.state === "closed" || bar >= run.endBar) {
      stop();
      return;
    }

    // A delayed callback skips past attacks. Future bars keep their original clock times.
    const nextInTime = Math.ceil((now - CLOCK_ROUNDING_SECONDS - run.origin) / run.barSeconds);
    run.nextBar = Math.max(run.nextBar, nextInTime);
    for (const scheduled of run.scheduled) {
      if (scheduled < bar) run.scheduled.delete(scheduled);
    }

    while (run.nextBar < run.endBar) {
      const barStart = run.origin + run.nextBar * run.barSeconds;
      if (barStart > now + LOOKAHEAD_SECONDS) break;
      scheduleGrip(run, run.grips[run.nextBar % run.grips.length], barStart);
      run.scheduled.add(run.nextBar);
      run.nextBar++;
    }

    const active = run.scheduled.has(bar) ? run.grips[bar % run.grips.length].slot : null;
    publish("playing", active);
  }

  async function start(grips, bpm, loop) {
    if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
      throw new RangeError("Tempo must be between 40 and 220 BPM.");
    }
    if (typeof loop !== "boolean") throw new TypeError("Loop must be on or off.");
    if (typeof AudioContextCtor !== "function") throw new Error("Web Audio is unavailable in this browser.");

    cancelRun();
    const run = {
      grips,
      barSeconds: 240 / bpm,
      endBar: loop ? Infinity : grips.length,
      nextBar: 0,
      scheduled: new Set(),
      voices: new Set(),
    };
    current = run;
    publish("starting");

    try {
      context ??= new AudioContextCtor();
      if (context.state !== "running") await context.resume();
      if (current !== run) return false;
      if (context.state !== "running") throw new Error("Audio could not start.");
      run.origin = context.currentTime + START_LEAD_SECONDS;
      run.timer = setTimer(() => tick(run), TIMER_MS);
      tick(run);
      return true;
    } catch (error) {
      if (current !== run) return false;
      stop();
      throw error;
    }
  }

  async function playChord(semitones, { slot, bpm } = {}) {
    if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
      throw new RangeError("Chord slot must be an index from 0 to 3.");
    }
    return start([{ slot, pitches: copyGrip(semitones) }], bpm, false);
  }

  async function playProgression(chords, { bpm, loop = false } = {}) {
    if (!Array.isArray(chords) || chords.length !== 4) {
      throw new TypeError("Playback requires four playable grips.");
    }
    const grips = Array.from(chords, (semitones, slot) => ({ slot, pitches: copyGrip(semitones) }));
    return start(grips, bpm, loop);
  }

  return { playChord, playProgression, stop };
}
