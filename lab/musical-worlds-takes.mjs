// Optional short microphone takes. This never drives the backing clock,
// captures nothing without a click, and keeps all bytes in this tab.
export function createWorldTake({
  mediaDevices = globalThis.navigator?.mediaDevices,
  Recorder = globalThis.MediaRecorder,
  Player = globalThis.Audio,
  makeUrl = blob => URL.createObjectURL(blob),
  freeUrl = url => URL.revokeObjectURL(url),
  startLimit = callback => setTimeout(callback, 30_000),
  clearLimit = id => clearTimeout(id),
  onChange = () => {},
} = {}) {
  const supported = typeof mediaDevices?.getUserMedia === "function" && typeof Recorder === "function";
  const ready = supported ? "Optional: record a short take to listen back."
    : "Recording needs a secure browser page with microphone support. You can still play along.";
  const releaseTracks = stream => stream?.getTracks().forEach(track => track.stop());
  let generation = 0, phase = "idle", take, clip, replay, message = ready;
  const snapshot = () => ({ supported, phase, clip, message, replaying: Boolean(replay) });
  const update = (text) => { message = text; onChange(snapshot()); };

  function finish(current) {
    if (take !== current) return;
    releaseTracks(current.stream);
    clearLimit(current.limit);
    take = undefined;
    phase = "idle";
    if (!current.chunks.length) {
      update("No sound was captured. You can try another take.");
      return;
    }
    const type = current.recorder.mimeType || current.chunks[0].type || "audio/webm";
    const next = makeUrl(new Blob(current.chunks, { type }));
    stopReplay();
    if (clip) freeUrl(clip.url);
    clip = { url: next, name: "guitar-explorer-take." + (type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm") };
    update("Your take is ready to replay or save.");
  }
  function fail(current, text) {
    if (take !== current) return;
    clearLimit(current.limit);
    take = undefined;
    phase = "idle";
    releaseTracks(current.stream);
    update(text);
  }
  async function start() {
    if (!supported || phase !== "idle") return;
    stopReplay();
    const ticket = ++generation;
    phase = "pending";
    update("Waiting for microphone permission…");
    let stream;
    try {
      stream = await mediaDevices.getUserMedia({ audio: true });
      if (ticket !== generation) { releaseTracks(stream); return; }
      const recorder = new Recorder(stream);
      const current = { recorder, stream, chunks: [], limit: undefined };
      take = current;
      recorder.ondataavailable = event => { if (event.data.size) current.chunks.push(event.data); };
      recorder.onstop = () => finish(current);
      recorder.onerror = () => fail(current, "Recording stopped unexpectedly. Try another take.");
      recorder.start();
      phase = "recording";
      current.limit = startLimit(stop);
      update("Recording for up to 30 seconds. Use headphones to keep the backing out of your take.");
    } catch (error) {
      releaseTracks(stream);
      if (ticket !== generation) return;
      if (take) clearLimit(take.limit);
      take = undefined;
      phase = "idle";
      update(error?.name === "NotAllowedError" ? "Microphone access was declined. You can still play along."
        : "The microphone could not start. Check your input device, or keep playing without recording.");
    }
  }
  function stop() {
    generation += 1;
    if (phase === "pending") {
      phase = "idle";
      update("Recording cancelled.");
    } else if (take && phase === "recording") {
      const current = take;
      clearLimit(current.limit);
      phase = "saving";
      update("Finishing your take…");
      try { current.recorder.stop(); }
      catch { fail(current, "The take could not be saved."); }
      finally { releaseTracks(current.stream); }
    }
  }
  function stopReplay() {
    if (!replay) return;
    const player = replay;
    replay = undefined;
    player.pause();
    update("Replay stopped.");
  }
  async function play() {
    if (!clip || phase !== "idle") return;
    stopReplay();
    let player;
    try {
      player = new Player(clip.url);
      replay = player;
      player.onended = () => {
        if (replay !== player) return;
        replay = undefined;
        update("Replay finished.");
      };
      update("Replaying your take.");
      await player.play();
    } catch {
      if (replay !== player) return;
      replay = undefined;
      update("The recording could not be replayed.");
    }
  }
  return Object.freeze({ start, stop, play, stopReplay, snapshot });
}
