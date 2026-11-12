export const LOOP_BARS = Object.freeze([2, 4, 8]);
export const BEATS_PER_BAR = 4;
export const MAX_TAKE_SECONDS = 30;

export function loopGrid(bpm, bars, sampleRate) {
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 240) {
    throw new RangeError("Choose a whole-number tempo from 40 to 240 BPM.");
  }
  if (!LOOP_BARS.includes(bars)) throw new RangeError("Choose 2, 4 or 8 bars.");
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) {
    throw new RangeError("Recording supports AudioContext rates from 8 to 96 kHz.");
  }
  const beats = bars * BEATS_PER_BAR;
  const beatFrames = Array.from({ length: beats + 1 }, (_, beat) => Math.round(beat * 60 * sampleRate / bpm));
  const regionFrames = beatFrames[beats];
  if (regionFrames > MAX_TAKE_SECONDS * sampleRate) {
    throw new RangeError("The loop exceeds 30 seconds. Increase the tempo or choose fewer bars.");
  }
  return { bpm, meter: "4/4", bars, beats, sampleRate, beatFrames, regionFrames };
}

export function captureWindow(grid, clockFrame) {
  const countInFrame = clockFrame + Math.ceil(grid.sampleRate * 0.15);
  const startFrame = countInFrame + grid.beatFrames[BEATS_PER_BAR];
  return { countInFrame, startFrame, endFrame: startFrame + grid.regionFrames };
}

export function loopPosition(grid, elapsedFrames) {
  const frame = Math.max(0, elapsedFrames);
  const cycle = Math.floor(frame / grid.regionFrames);
  const withinLoop = frame % grid.regionFrames;
  const beat = grid.beatFrames.findIndex((boundary) => boundary > withinLoop) - 1;
  return { cycle, bar: 1 + Math.floor(beat / BEATS_PER_BAR), beat: 1 + beat % BEATS_PER_BAR };
}

const transportEvents = {
  idle: { prepare: "preparing", play: "playing" },
  preparing: { arm: "count-in", finish: "idle" },
  "count-in": { onset: "recording", stop: "saving", finish: "idle" },
  recording: { stop: "saving", finish: "idle" },
  saving: { finish: "idle" },
  playing: { stop: "idle" },
};

export function moveTransport(state, event) {
  const next = transportEvents[state]?.[event];
  if (!next) throw new Error("Cannot " + event + " while transport is " + state + ".");
  return next;
}
