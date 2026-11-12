import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { CHECKPOINT_FRAMES, encodeWav, PCM_POOL_BLOCKS } from "../lab/looper-studio/looper-pcm.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const defaultChrome = {
  win32: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
};
const prefix = "guitar-explorer-looper-chrome-";
const scratch = await mkdtemp(join(tmpdir(), prefix));
const output = await mkdtemp(join(tmpdir(), "guitar-explorer-looper-evidence-"));
let chrome;
let lab;
let socket;

async function poll(check, name, timeout = 7000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const value = await check();
    if (value) return value;
    await delay(50);
  }
  throw new Error("Timed out waiting for " + name);
}

try {
  lab = spawn(process.execPath, ["scripts/serve-lab.mjs"], {
    cwd: root, env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"], windowsHide: true,
  });
  let stdout = "";
  lab.stdout.on("data", (data) => { stdout += data.toString(); });
  await once(lab, "spawn");
  const origin = await poll(() => stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0], "the Lab server");
  const page = origin + "/looper-studio/";
  const home = await fetch(origin);
  assert.ok(home.ok && (await home.text()).includes("instrument-desk-app.js"));
  const response = await fetch(page);
  assert.ok(response.ok && !(await response.text()).includes("session-evidence.mjs"));
  assert.equal(response.headers.has("cross-origin-opener-policy"), false);
  assert.equal(response.headers.has("cross-origin-embedder-policy"), false);

  const wave = join(scratch, "synthetic-microphone.wav");
  const rate = 48000;
  const signal = Float32Array.from({ length: 2 * rate }, (_, frame) =>
    0.32 * Math.sin(2 * Math.PI * 247.5 * frame / rate) +
    0.09 * Math.sin(2 * Math.PI * 553 * frame / rate));
  await writeFile(wave, new Uint8Array(encodeWav(signal, rate, 1)));

  chrome = spawn(process.env.GE_CHROME || defaultChrome[process.platform] || "google-chrome", [
    "--headless=new", "--remote-debugging-port=0", "--no-first-run", "--disable-extensions", "--mute-audio",
    "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-audio-capture=" + wave,
    "--user-data-dir=" + scratch, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  await once(chrome, "spawn");
  const port = await poll(async () => {
    try { return (await readFile(join(scratch, "DevToolsActivePort"), "utf8")).split(/\r?\n/)[0]; }
    catch { return false; }
  }, "Chrome DevTools port");
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const target = targets.find(({ type }) => type === "page");
  assert.ok(target);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");

  let nextId = 0;
  const commands = new Map();
  const exceptions = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (message.id && commands.has(message.id)) {
      commands.get(message.id)(message);
      commands.delete(message.id);
    }
  });

  function cdp(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolveCommand, reject) => {
      const timer = setTimeout(() => {
        commands.delete(id);
        reject(new Error("CDP timeout: " + method));
      }, 10000);
      commands.set(id, ({ error, result }) => {
        clearTimeout(timer);
        if (error) reject(new Error(error.message));
        else resolveCommand(result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(fn, ...args) {
    const expression = "(" + fn.toString() + ")(" + args.map((arg) => JSON.stringify(arg)).join(",") + ")";
    const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }

  async function waitFor(fn, description, timeout, ...args) {
    return poll(async () => {
      try { return await evaluate(fn, ...args); }
      catch (error) {
        if (/Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(error.message)) return false;
        throw error;
      }
    }, description, timeout);
  }

  async function click(selector) {
    await waitFor((query) => {
      const element = document.querySelector(query);
      return element && !element.disabled;
    }, "enabled control " + selector, 6000, selector);
    const point = await evaluate((query) => {
      const el = document.querySelector(query);
      if (!el || el.disabled) throw new Error("Unavailable: " + query + " · " + document.querySelector("#notice").textContent);
      el.scrollIntoView({ block: "center" });
      const bounds = el.getBoundingClientRect();
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }, selector);
    await cdp("Input.dispatchMouseEvent", { ...point, button: "left", clickCount: 1, type: "mousePressed" });
    await cdp("Input.dispatchMouseEvent", { ...point, button: "left", clickCount: 1, type: "mouseReleased" });
  }

  async function setValue(selector, value) {
    await evaluate((query, next) => {
      const el = document.querySelector(query);
      el.value = next;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, selector, value);
  }

  const stateIs = (state) => document.querySelector("#transport-state")?.dataset.state === state;
  const slotIs = (slot, status) => document.querySelector('[data-slot="' + slot + '"]')?.dataset.status === status;
  const waitSlot = (slot, status, timeout) => waitFor(slotIs, slot + " " + status, timeout, slot, status);

  async function readTakes() {
    return evaluate(async () => {
      const { openLooperStore } = await import(new URL("looper-store.mjs", location.href));
      const store = await openLooperStore();
      try {
        return await Promise.all((await store.list()).map(async (take) => {
          if (take.status === "pending") return take;
          const { samples } = await store.load(take.id);
          const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", samples.buffer));
          return { ...take, hash: [...digest].map((n) => n.toString(16).padStart(2, "0")).join(""),
            hasSignal: samples.some((sample) => Math.abs(sample) > 0.01) };
        }));
      } finally {
        store.close();
      }
    });
  }

  function checkCapture(take, seconds) {
    assert.equal(take.status, "complete");
    assert.equal(take.frames, take.sampleRate * seconds);
    assert.equal(take.frames, take.capturedFrames);
    assert.equal(take.window.endFrame - take.window.startFrame, take.frames);
    assert.equal(take.firstFrame - take.window.startFrame, 0);
    assert.equal(take.overflowFrames, 0);
    assert.equal(take.gapFrames, 0);
    assert.ok(take.peakBuffers > 0 && take.peakBuffers <= PCM_POOL_BLOCKS);
    assert.ok(take.hasSignal);
    console.log(JSON.stringify({
      slot: take.slot, seconds, sampleRate: take.sampleRate, channels: take.channels, frames: take.frames,
      onsetDelta: take.firstFrame - take.window.startFrame, overflow: take.overflowFrames,
      peakBuffers: take.peakBuffers, seam: take.seam,
    }));
  }

  async function connect() {
    await click("#connect-audio");
    await waitFor(() => document.querySelector("#audio-permission").textContent === "Granted" &&
      document.querySelector("#input-level").value > 0.01, "connected synthetic microphone and live meter");
  }

  async function startTake(button) {
    await click(button);
    await waitFor(stateIs, "one-bar count-in", 8000, "count-in");
    await waitFor(stateIs, "capture onset", 9000, "recording");
  }

  async function reload() {
    const previous = await evaluate(() => performance.timeOrigin);
    await cdp("Page.reload");
    await waitFor((before) => performance.timeOrigin > before && document.querySelector("#storage-state")?.textContent !== "Opening local storage…",
      "new page and reloaded storage", 8000, previous);
  }

  console.log((await cdp("Browser.getVersion")).product);
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: output });
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1320, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "(" + (() => {
    const input = {
      id: "fixture-akai", name: "MPK mini test fixture", manufacturer: "Akai", state: "connected",
      async open() { return this; }, async close() { return this; },
    };
    const access = { inputs: new Map([[input.id, input]]) };
    window.midiProbe = {
      requests: [],
      send(bytes, timeStamp) { input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp }); },
      disconnect() { input.state = "disconnected"; access.onstatechange?.({ port: input }); },
    };
    Object.defineProperty(navigator, "requestMIDIAccess", { value: async (options) => {
      window.midiProbe.requests.push(options);
      if (window.midiProbe.requests.length === 1) throw new DOMException("Fixture denied MIDI", "NotAllowedError");
      return access;
    } });
    const start = AudioBufferSourceNode.prototype.start;
    window.looperStarts = [];
    AudioBufferSourceNode.prototype.start = function (when, ...rest) {
      window.looperStarts.push({ frame: Math.round(when * this.context.sampleRate), length: this.buffer.length, loop: this.loop });
      return start.call(this, when, ...rest);
    };
  }).toString() + ")()" });
  await cdp("Page.navigate", { url: page });
  await waitFor(() => document.querySelector("#storage-state")?.textContent.startsWith("No recordings"), "empty project");
  assert.equal(await evaluate(() => isSecureContext && !crossOriginIsolated), true);

  await click("#enable-midi");
  await waitFor(() => document.querySelector("#midi-permission").textContent === "Denied", "MIDI permission denial");
  await click("#enable-midi");
  await waitFor(() => document.querySelector("#akai-status").textContent === "Detected", "Akai MIDI fixture detection");
  assert.deepEqual(await evaluate(() => window.midiProbe.requests), [{ sysex: false }, { sysex: false }]);
  await setValue("#midi-device", "fixture-akai");
  await waitFor(() => document.querySelector("#midi-connection").textContent === "Connected", "MIDI input selection");
  await evaluate(() => {
    midiProbe.send([0x99, 42, 87], 37.25);
    midiProbe.send([0x92, 60, 71], 40.5);
    midiProbe.send([0x92, 60, 0], 41);
    midiProbe.send([0xb9, 64, 127], 42);
  });
  assert.equal(await evaluate(() => document.querySelector("#held-notes").textContent), "1");
  assert.match(await evaluate(() => document.querySelector("#midi-log").textContent), /37\.3 ms · ch 10 · Note on 42 · velocity 87/);
  assert.match(await evaluate(() => document.querySelector("#midi-log").textContent), /Sustain 127/);
  await evaluate(() => midiProbe.disconnect());
  assert.equal(await evaluate(() => document.querySelector("#held-notes").textContent), "0");
  assert.match(await evaluate(() => document.querySelector("#midi-log").textContent), /Cleared 1 held note/);
  console.log("Synthetic MIDI permission, device selection, messages and disconnect passed.");

  await connect();
  await setValue("#tempo", "240");
  await startTake("#record-base");
  await waitFor((frames) => Number(document.querySelector("#saved-frames").textContent) >= frames, "first durable checkpoint", 5000, CHECKPOINT_FRAMES);
  await evaluate(() => {
    const until = performance.now() + 420;
    while (performance.now() < until) {}
  });
  await waitSlot("base", "complete");
  const [base] = await readTakes();
  checkCapture(base, 4);
  assert.equal(base.window.startFrame - base.window.countInFrame, base.sampleRate);
  assert.deepEqual(await evaluate(() => looperStarts.slice(0, 4).map((start) => start.frame)),
    Array.from({ length: 4 }, (_, beat) => base.window.countInFrame + Math.round(beat * base.sampleRate / 4)));

  await click('[data-slot="base"] button:first-child');
  const exported = join(output, "looper-base.wav");
  const wav = await poll(async () => {
    try { return await readFile(exported); } catch { return false; }
  }, "base WAV download");
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(22), base.channels);
  assert.equal(wav.readUInt32LE(24), base.sampleRate);
  assert.equal(wav.readUInt32LE(40), base.frames * base.channels * 2);

  await startTake("#record-layer");
  await waitSlot("overdub", "complete");
  const layered = await readTakes();
  const layer = layered.find((take) => take.slot === "overdub");
  checkCapture(layer, 4);
  assert.equal(layered.find((take) => take.slot === "base").hash, base.hash);
  assert.equal(await evaluate(() => looperStarts.at(-1).frame), layer.window.startFrame);

  await click("#play-loop");
  await waitFor(stateIs, "playing two takes", 5000, "playing");
  assert.match(await evaluate(() => document.querySelector("#notice").textContent), /both takes/);
  const scheduled = await evaluate(() => looperStarts.slice(-2));
  assert.equal(scheduled[0].frame, scheduled[1].frame);
  assert.ok(scheduled.every(({ length, loop }) => length === base.frames && loop));
  await waitFor(() => document.querySelector("#transport-position").textContent.startsWith("Bar 4"), "approaching the first wrap");
  await waitFor(() => document.querySelector("#transport-position").textContent === "Bar 1 · beat 1", "live transport wrap");
  await evaluate(() => scrollTo(0, 0));
  const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(join(output, "looper-studio.png"), Buffer.from(screenshot.data, "base64"));
  await click("#stop");
  await waitFor(stateIs, "stopped playback", 5000, "idle");

  const rendered = await evaluate(async () => {
    const { bufferFromTake, scheduleLayers } = await import(new URL("looper-audio.mjs", location.href));
    const offline = new OfflineAudioContext(1, 19, 48000);
    const take = { sampleRate: 48000, frames: 4, channels: 1 };
    const buffers = [Float32Array.of(.2, .4, .6, .8), Float32Array.of(.1, .1, .1, .1)]
      .map((samples) => bufferFromTake(offline, { take, samples }));
    scheduleLayers(offline, offline.destination, buffers, 3);
    return [...(await offline.startRendering()).getChannelData(0)];
  });
  assert.ok(rendered.every((sample, frame) =>
    Math.abs(sample - (frame < 3 ? 0 : [.3, .5, .7, .9][(frame - 3) % 4])) < 0.00001));
  console.log("Offline Web Audio rendered both layers from frame 3 and wrapped at frames 7, 11 and 15.");

  await reload();
  await waitSlot("overdub", "complete");
  await click('[data-slot="overdub"] button:last-child');
  await waitFor(() => !document.querySelector('[data-slot="overdub"]'), "undo of the second take");
  assert.equal((await readTakes())[0].hash, base.hash);
  await click("#play-loop");
  await waitFor(stateIs, "restart from saved base", 5000, "playing");
  assert.match(await evaluate(() => document.querySelector("#notice").textContent), /base take/);
  await click("#stop");

  await connect();
  await startTake("#record-layer");
  await waitFor((frames) => Number(document.querySelector("#saved-frames").textContent) >= frames, "checkpoint before Stop", 5000, CHECKPOINT_FRAMES);
  await click("#stop");
  await waitSlot("overdub", "partial");
  let partial = (await readTakes()).find((take) => take.slot === "overdub");
  assert.equal(partial.reason, "stopped");
  assert.ok(partial.frames >= CHECKPOINT_FRAMES && partial.frames < base.frames && partial.hasSignal);
  console.log("Stop saved a partial take of " + partial.frames + " frames.");
  await click('[data-slot="overdub"] button:last-child');

  await startTake("#record-layer");
  const beforeReload = await waitFor((frames) => {
    const saved = Number(document.querySelector("#saved-frames").textContent);
    return saved >= frames && saved;
  }, "checkpoint before interruption", 6000, 2 * CHECKPOINT_FRAMES);
  await reload();
  await waitSlot("overdub", "pending");
  await click('[data-slot="overdub"] button');
  await waitSlot("overdub", "partial");
  const recovered = await readTakes();
  partial = recovered.find((take) => take.slot === "overdub");
  assert.equal(partial.reason, "interrupted");
  assert.equal(partial.capturedFrames, null);
  assert.ok(partial.frames >= beforeReload && partial.frames < base.frames && partial.hasSignal);
  assert.equal(recovered.find((take) => take.slot === "base").hash, base.hash);
  console.log("Reload recovery retained " + partial.frames + " committed frames.");
  await click('[data-slot="overdub"] button:last-child');
  await click('[data-slot="base"] button:last-child');
  await waitFor(() => !document.querySelector('[data-slot="base"]'), "empty recording project");

  await setValue("#bars", "8");
  await setValue("#tempo", "63");
  assert.match(await evaluate(() => document.querySelector("#region-length").textContent), /exceeds 30 seconds/);
  assert.equal(await evaluate(() => document.querySelector("#record-base").disabled), true);
  await setValue("#tempo", "64");
  await connect();
  await startTake("#record-base");
  await waitSlot("base", "complete", 39000);
  checkCapture((await readTakes())[0], 30);

  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await waitFor(() => innerWidth === 390, "narrow viewport");
  assert.ok(await evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.deepEqual(exceptions, []);
  console.log("Looper Studio Chromium acceptance passed.");
  console.log("Screenshot and synthetic WAV: " + output);
} finally {
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = once(chrome, "exit").catch(() => {});
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: 0, method: "Browser.close" }));
      await Promise.race([exited, delay(2000, undefined, { ref: false })]);
    }
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill();
    await Promise.race([exited, delay(2000, undefined, { ref: false })]);
  }
  socket?.close();
  lab?.kill();
  if (resolve(dirname(scratch)) === resolve(tmpdir()) && basename(scratch).startsWith(prefix)) {
    await rm(scratch, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  }
}
