const MIDI_A4 = 69;

export function createSongAudio() {
  let context;
  let active = [];
  let frame = 0;
  let run = 0;

  function stop() {
    run++;
    cancelAnimationFrame(frame);
    for (const source of active) source.stop();
    active = [];
  }

  function sound(when, length, hz, gainValue, type = "triangle") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainValue, when + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      active = active.filter((source) => source !== oscillator);
    };
    active.push(oscillator);
    oscillator.start(when);
    oscillator.stop(when + length + 0.02);
  }

  async function play(events, duration, { bpm, onTick, onEnd }) {
    stop();
    const request = run;
    if (!globalThis.AudioContext) throw new Error("This browser does not support Web Audio.");
    context ??= new AudioContext();
    await context.resume();
    if (request !== run) return;
    if (context.state !== "running") throw new Error("Audio could not start.");
    const step = 30 / bpm;
    const start = context.currentTime + 0.035;
    for (const { at, length, semitones, click, gain = 1 } of events) {
      const when = start + at * step;
      if (click === "accent") sound(when, 0.075, 1400, 0.11, "sine");
      if (click === "pulse") sound(when, 0.065, 790, 0.075, "sine");
      if (click === "muted") sound(when, 0.045, 132, 0.085, "square");
      for (const semitone of semitones) {
        const frequency = 440 * 2 ** ((semitone - MIDI_A4) / 12);
        sound(when, Math.max(0.07, length * step * 0.9), frequency, gain * 0.18 / Math.sqrt(semitones.length));
      }
    }
    function followClock() {
      const tick = Math.floor((context.currentTime - start) / step);
      if (tick < duration) {
        onTick?.(tick);
        frame = requestAnimationFrame(followClock);
      } else {
        onEnd?.();
      }
    }
    followClock();
  }

  return { play, stop };
}
