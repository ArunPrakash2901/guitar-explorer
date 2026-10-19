export function resetSessionState(state) {
  state.stageIndex = 0;
  state.mapRoleIndex = 0;
  state.savedMap = [];
  state.timerRemaining = 35;
  state.timerDeadlineMs = null;
  state.timerPhase = "READY";
  state.timerStarted = false;
  state.timerFinished = false;
  state.reflection = null;
  state.selected = null;
  state.checked = false;
  state.hintLevel = 0;
  state.lastWrong = null;
  state.theoryRevealed = false;
  return state;
}

export function reflectionNextHidden(reflection) {
  return reflection === null;
}

export function timerSnapshot(deadlineMs, nowMs, totalSeconds = 35, blockSeconds = 5) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) {
    throw new TypeError("timerSnapshot requires finite deadline and current times");
  }
  if (totalSeconds <= 0 || blockSeconds <= 0) {
    throw new RangeError("timerSnapshot requires positive durations");
  }

  const totalMs = totalSeconds * 1000;
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const remaining = Math.ceil(remainingMs / 1000);
  const finished = remainingMs === 0;
  const elapsedMs = Math.max(0, totalMs - remainingMs);
  const blockIndex = Math.floor(elapsedMs / (blockSeconds * 1000));
  const phase = finished ? "DONE" : blockIndex % 2 === 0 ? "PLAY" : "REST";

  return { remaining, finished, phase };
}
