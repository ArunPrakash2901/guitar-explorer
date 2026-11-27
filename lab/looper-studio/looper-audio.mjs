import { BEATS_PER_BAR, captureWindow } from "./looper-grid.mjs";

function deadline(promise, milliseconds, message) {
  let timer;
  const expiry = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer));
}

export function bufferFromTake(context, { take, samples }) {
  if (context.sampleRate !== take.sampleRate || samples.length !== take.frames * take.channels) {
    throw new Error("The audio clock or PCM does not match this take.");
  }
  const buffer = context.createBuffer(take.channels, take.frames, take.sampleRate);
  for (let channel = 0; channel < take.channels; channel++) {
    const output = buffer.getChannelData(channel);
    for (let frame = 0; frame < take.frames; frame++) output[frame] = samples[frame * take.channels + channel];
  }
  return buffer;
}

export function scheduleLayers(context, destination, buffers, startFrame, loop = true) {
  const sources = [];
  try {
    for (const buffer of buffers) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.loopEnd = buffer.duration;
      source.connect(destination);
      sources.push(source);
      source.start(startFrame / context.sampleRate);
    }
    return sources;
  } catch (error) {
    stopSources(sources);
    throw error;
  }
}

export function stopSources(sources) {
  for (const source of sources) {
    try { source.stop(); } catch {}
    source.disconnect();
  }
}

function clickBuffer(context, accent) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.round(rate * .045), rate);
  const samples = buffer.getChannelData(0);
  const frequency = accent ? 1450 : 950;
  for (let frame = 0; frame < samples.length; frame++) {
    const time = frame / rate;
    samples[frame] = .14 * Math.sin(2 * Math.PI * frequency * time) *
      Math.min(1, time / .002) * (1 - frame / samples.length) ** 2;
  }
  return buffer;
}

export class LooperAudio {
  constructor(sampleRate) {
    this.context = new AudioContext(sampleRate ? { sampleRate } : {});
    this.silent = this.context.createGain();
    this.silent.gain.value = 0;
    this.silent.connect(this.context.destination);
    this.mix = this.context.createGain();
    this.mix.gain.value = .45;
    this.mix.connect(this.context.destination);
  }

  get frame() {
    return Math.round(this.context.currentTime * this.context.sampleRate);
  }

  async connectInput(deviceId, onEnded) {
    await this.context.resume();
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2, max: 2 } };
    if (deviceId) audio.deviceId = { exact: deviceId };
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
    this.disconnectInput();
    try {
      const source = this.context.createMediaStreamSource(stream);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(this.silent);
      this.stream = stream;
      this.source = source;
      this.analyser = analyser;
      this.meterSamples = new Float32Array(analyser.fftSize);
    } catch (error) {
      for (const track of stream.getTracks()) track.stop();
      throw error;
    }
    const track = stream.getAudioTracks()[0];
    track.addEventListener("ended", () => {
      if (this.stream !== stream) return;
      this.disconnectInput();
      onEnded();
    }, { once: true });
    return { label: track.label, ...track.getSettings() };
  }

  disconnectInput() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.source = null;
    this.stream = null;
    this.analyser = null;
  }

  level() {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.meterSamples);
    let peak = 0;
    for (const value of this.meterSamples) peak = Math.max(peak, Math.abs(value));
    return peak;
  }

  async record({ grid, slot, store, baseBuffer, onInput, onArmed, onOnset, onSaving, onProgress }) {
    const input = this.source;
    const context = this.context;
    if (!input) throw new Error("Connect an audio input first.");
    this.worklet ??= context.audioWorklet.addModule(new URL("./looper-capture-worklet.mjs", import.meta.url));
    try {
      await deadline(this.worklet, 6000, "The capture worklet did not load. Reconnect the input and try again.");
    } catch (error) {
      this.worklet = null;
      throw error;
    }

    const node = new AudioWorkletNode(context, "looper-capture", { outputChannelCount: [1] });
    const inputReady = Promise.withResolvers();
    const poolReady = Promise.withResolvers();
    const outcome = Promise.withResolvers();
    const failed = Promise.withResolvers();
    failed.promise.catch(() => {});
    const wait = (promise, ms, message) => deadline(Promise.race([promise, failed.promise]), ms, message);
    const sources = [];
    let worker;
    let take;
    let report;
    node.port.onmessage = ({ data }) => {
      if (data.type === "input") inputReady.resolve(data.channels);
      if (data.type === "ready") poolReady.resolve();
      if (data.type === "onset") onOnset(data.firstFrame);
      if (data.type === "finished") onSaving(data);
    };
    node.onprocessorerror = () => failed.reject(new Error("The audio processor stopped unexpectedly."));

    try {
      if (this.source !== input) throw new Error("The audio input disconnected before capture.");
      input.connect(node);
      node.connect(this.silent);
      const channels = await wait(inputReady.promise, 6000, "No audio frames arrived. Reconnect the input and try again.");
      onInput(channels);
      take = await store.reserve(grid, channels, slot);
      worker = new Worker(new URL("./looper-capture-worker.mjs", import.meta.url), { type: "module" });
      worker.onerror = (event) => {
        event.preventDefault();
        failed.reject(new Error(event.message || "The recording worker stopped unexpectedly."));
      };
      worker.onmessage = ({ data }) => {
        if (data.type === "error") failed.reject(new Error(data.error));
        if (data.type === "progress") onProgress(data.frames);
        if (data.type === "take" || data.type === "unsaved") outcome.resolve(data);
      };
      const channel = new MessageChannel();
      node.port.postMessage({ type: "connect", port: channel.port1 }, [channel.port1]);
      worker.postMessage({ port: channel.port2, take }, [channel.port2]);
      await wait(poolReady.promise, 6000, "The worker did not prepare its PCM buffers.");
      if (this.source !== input) throw new Error("The audio input disconnected before the count-in.");
      this.clicks ??= [clickBuffer(context, true), clickBuffer(context, false)];
      const window = captureWindow(grid, this.frame);
      for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
        const click = this.clicks[beat === 0 ? 0 : 1];
        sources.push(...scheduleLayers(context, context.destination, [click],
          window.countInFrame + grid.beatFrames[beat], false));
      }
      if (baseBuffer) sources.push(...scheduleLayers(context, this.mix, [baseBuffer], window.startFrame, false));
      node.port.postMessage({ type: "arm", window });
      onArmed(window, (reason) => {
        stopSources(sources);
        sources.length = 0;
        node.port.postMessage({ type: "stop", reason });
      });
      report = await wait(outcome.promise, (window.endFrame - window.countInFrame) / grid.sampleRate * 1000 + 8000,
        "Capture did not finish. The saved checkpoints can be recovered.");
    } finally {
      stopSources(sources);
      try { input.disconnect(node); } catch {}
      node.disconnect();
      node.port.close();
      worker?.terminate();
      if (take && report?.type !== "take") {
        try {
          await store.recover(take.id);
        } catch (error) {
          if (report) report.error += " Recovery also failed: " + error.message;
          // A pending journal can still be recovered after a refresh.
        }
      }
    }
    return report;
  }
}
