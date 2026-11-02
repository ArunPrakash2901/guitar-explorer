const LOOPER_STATES = Object.freeze([
  "idle",
  "ready",
  "count-in",
  "recording",
  "captured",
  "playing",
  "looping",
]);

const TRANSITIONS = Object.freeze({
  idle: Object.freeze({ permission: "ready" }),
  ready: Object.freeze({ countIn: "count-in", reset: "ready" }),
  "count-in": Object.freeze({ record: "recording", cancel: "ready" }),
  recording: Object.freeze({ capture: "captured" }),
  captured: Object.freeze({ play: "playing", loop: "looping", rerecord: "ready", reset: "ready" }),
  playing: Object.freeze({ stop: "captured", ended: "captured", loop: "looping", rerecord: "ready" }),
  looping: Object.freeze({ stop: "captured", play: "playing", rerecord: "ready" }),
});

function finiteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function integerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function normalizeCaptureSpec({
  bpm,
  countInBeats = 4,
  recordDurationSeconds,
  contextLabel = "",
} = {}) {
  integerInRange(bpm, 30, 240, "bpm");
  integerInRange(countInBeats, 1, 8, "countInBeats");
  finiteNumber(recordDurationSeconds, "recordDurationSeconds");
  if (recordDurationSeconds < 1 || recordDurationSeconds > 180) {
    throw new RangeError("recordDurationSeconds must be between 1 and 180 seconds");
  }
  if (typeof contextLabel !== "string" || contextLabel.length > 160) {
    throw new TypeError("contextLabel must be a string up to 160 characters");
  }

  return Object.freeze({
    bpm,
    countInBeats,
    recordDurationSeconds,
    contextLabel,
  });
}

export function captureTimeline(spec) {
  const normalized = normalizeCaptureSpec(spec);
  const secondsPerBeat = 60 / normalized.bpm;
  const countInSeconds = normalized.countInBeats * secondsPerBeat;
  return Object.freeze({
    secondsPerBeat,
    countInSeconds,
    recordStartSeconds: countInSeconds,
    recordEndSeconds: countInSeconds + normalized.recordDurationSeconds,
    totalSeconds: countInSeconds + normalized.recordDurationSeconds,
  });
}

export function createLooperLifecycle(initialState = "idle") {
  if (!LOOPER_STATES.includes(initialState)) {
    throw new RangeError(`Unknown looper state: ${initialState}`);
  }

  let state = initialState;

  function transition(event) {
    const next = TRANSITIONS[state]?.[event];
    if (!next) throw new Error(`Cannot ${event} while looper is ${state}`);
    state = next;
    return state;
  }

  function resetToReady() {
    state = state === "idle" ? "idle" : "ready";
    return state;
  }

  return Object.freeze({
    get state() { return state; },
    transition,
    resetToReady,
  });
}
