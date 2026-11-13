// Convert exact quarter-note values once, at the shared Web Audio scheduler boundary.
export function practicePlan(events, bpm, { loop = false, click = false, countIn = false } = {}) {
  const secondsPerBeat = 60 / bpm;
  const seconds = ({ numerator, denominator }) => numerator / denominator * secondsPerBeat;
  const strokes = events.map((event) => ({
    ...event, kind: "practice", seconds: seconds(event.onset),
    direction: "down", level: event.level ?? .8,
    sustain: Math.min(1.25, Math.max(.08, seconds(event.duration) * .94)),
  }));
  const last = strokes.at(-1);
  const lastBeat = (last.seconds + seconds(last.duration)) / secondsPerBeat;
  // With a click, leave the remainder of the bar as a rest so the loop
  // restarts on a full beat and the next click keeps the same phase.
  const total = (loop && click ? Math.ceil((lastBeat - 1e-7) / 4) * 4 : lastBeat) * secondsPerBeat;
  const clickHits = [];
  if (click) {
    for (let beat = 0; beat * secondsPerBeat < total - 1e-7; beat++) {
      clickHits.push({ kind: "click", voice: "hat", level: beat % 4 === 0 ? .9 : .47, seconds: beat * secondsPerBeat });
    }
  }
  return { kind: "practice", repeat: loop, loopSeconds: total, strokes,
    countIn: countIn ? secondsPerBeat * 4 : 0, countInBeat: secondsPerBeat,
    clickHits, events: [...strokes, ...clickHits].sort((a, b) => a.seconds - b.seconds) };
}
