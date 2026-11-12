import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const preview = process.argv.includes("--preview");
const previewPrefix = "/guitar-explorer/pr-preview/pr-local/";
const staticRoot = resolve(root, ".preview-dist");
const profilePrefix = "guitar-explorer-progression-audio-chrome-";
const profile = await mkdtemp(join(tmpdir(), profilePrefix));
const screenshots = await mkdtemp(join(tmpdir(), "guitar-explorer-progression-audio-screens-"));
const defaultChrome = {
  win32: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
};
const chromePath = process.env.GE_CHROME || defaultChrome[process.platform] || "google-chrome";

function staticServer() {
  const types = new Map([
    [".html", "text/html"], [".css", "text/css"], [".mjs", "text/javascript"], [".js", "text/javascript"], [".ogg", "audio/ogg"], [".wav", "audio/wav"],
  ]);
  return createServer(async (request, response) => {
    const { pathname } = new URL(request.url, "http://localhost");
    if (pathname === "/favicon.ico") return response.writeHead(204).end();
    if (pathname.startsWith(previewPrefix)) {
      const file = resolve(staticRoot, pathname.slice(previewPrefix.length) || "index.html");
      const type = types.get(extname(file));
      if (file.startsWith(staticRoot + sep) && type) {
        try {
          const body = await readFile(file);
          return response.writeHead(200, { "content-type": type + "; charset=utf-8" }).end(body);
        } catch {
          // Missing files return 404.
        }
      }
    }
    return response.writeHead(404).end();
  });
}

async function poll(check, description, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await delay(60);
  }
  throw new Error("Timed out waiting for " + description);
}

const server = preview ? staticServer() : (await import("./serve-lab.mjs")).createLabServer();
let chrome;
let socket;

try {
  await once(server.listen(0, "127.0.0.1"), "listening");
  const origin = "http://127.0.0.1:" + server.address().port;
  const page = origin + (preview ? previewPrefix : "/");
  chrome = spawn(chromePath, [
    "--headless=new", "--remote-debugging-port=0", "--no-first-run", "--disable-extensions",
    "--disable-background-networking", "--no-default-browser-check", "--mute-audio",
    "--user-data-dir=" + profile, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  await once(chrome, "spawn");
  const port = await poll(async () => {
    try { return (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(/\r?\n/, 1)[0]; }
    catch { return false; }
  }, "Chrome DevTools port");
  const targets = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  const target = targets.find(({ type }) => type === "page");
  assert.ok(target);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, "open");

  const pending = new Map();
  const exceptions = [];
  let nextId = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  function cdp(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolveCommand, rejectCommand) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectCommand(new Error("CDP timeout: " + method));
      }, 9000);
      pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) rejectCommand(new Error(message.error.message));
        else resolveCommand(message.result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }

  async function waitFor(expression, description) {
    return poll(async () => {
      try { return await evaluate(expression); }
      catch (error) {
        if (/Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(error.message)) return false;
        throw error;
      }
    }, description);
  }

  function css(selector) { return "document.querySelector(" + JSON.stringify(selector) + ")"; }

  async function setValue(selector, value) {
    assert.ok(await evaluate("(() => { const el = " + css(selector) + "; el.value = " + JSON.stringify(value) +
      "; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()"));
  }

  async function press(selector, key) {
    assert.equal(await evaluate("(() => { const el = " + css(selector) + "; el.focus(); return document.activeElement === el; })()"), true, selector);
    const code = key === " " ? "Space" : key;
    const windowsVirtualKeyCode = { " ": 32, Enter: 13, ArrowLeft: 37, ArrowRight: 39, End: 35, Escape: 27 }[key];
    const event = { key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode };
    await cdp("Input.dispatchKeyEvent", { ...event, type: "rawKeyDown" });
    if (key === "Enter") await cdp("Input.dispatchKeyEvent", { ...event, type: "char", text: "\r", unmodifiedText: "\r" });
    await cdp("Input.dispatchKeyEvent", { ...event, type: "keyUp" });
  }

  async function screenshot(name) {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    await writeFile(join(screenshots, name + ".png"), Buffer.from(data, "base64"));
  }

  const viewport = (width, height, mobile) => cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile,
  });

  async function touchGesture(start, end, beforeRelease) {
    await cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await cdp("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (const fraction of [.25, .5, .75, 1]) {
      const x = start.x + (end.x - start.x) * fraction;
      const y = start.y + (end.y - start.y) * fraction;
      await cdp("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }
    if (beforeRelease) await beforeRelease();
    await cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp("Emulation.setTouchEmulationEnabled", { enabled: false });
  }

  await cdp("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.seed = 23;
    const realRandom = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) => array instanceof Uint32Array && array.length === 1
      ? (array[0] = window.seed++, array)
      : realRandom(array);
    const networkFetch = fetch.bind(window);
    window.waitForSamples = false;
    window.sampleWaiters = [];
    window.sampleRequests = [];
    window.releaseSamples = () => {
      window.waitForSamples = false;
      window.sampleWaiters.splice(0).forEach((resolve) => resolve());
    };
    window.fetch = async (request, ...args) => {
      const response = await networkFetch(request, ...args);
      if (/\\.(ogg|wav)(?:\\?|$)/.test(String(request))) {
        window.sampleRequests.push({ path: new URL(request, location.href).pathname, ok: response.ok });
        if (window.waitForSamples) await new Promise((resolve) => window.sampleWaiters.push(resolve));
      }
      return response;
    };
    window.events = [];
    window.audioClocks = new Set();
    window.mixerTargets = [];
    const setTarget = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, time, constant) {
      if (constant === .015) window.mixerTargets.push(value);
      return setTarget.call(this, value, time, constant);
    };
    const realStart = AudioBufferSourceNode.prototype.start;
    const realStop = AudioBufferSourceNode.prototype.stop;
    let sourceId = 0;
    AudioBufferSourceNode.prototype.start = function (at) {
      const result = realStart.call(this, at);
      this.smokeId = ++sourceId;
      window.audioClocks.add(this.context);
      window.events.push({ action: "start", id: this.smokeId, at, rate: this.playbackRate.value, clock: this.context.currentTime, duration: this.buffer.duration });
      return result;
    };
    AudioBufferSourceNode.prototype.stop = function (at) {
      const result = realStop.call(this, at);
      window.events.push({ action: "stop", id: this.smokeId, at: at ?? 0, clock: this.context.currentTime });
      return result;
    };
  ` });
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await viewport(1380, 900, false);
  await cdp("Page.navigate", { url: page });
  await waitFor("document.querySelectorAll('[data-slot]').length === 4", "four chord cards");
  assert.equal(await evaluate("document.querySelector('#tonic').value"), "all");
  assert.equal(await evaluate("document.querySelector('#mode').value"), "auto");
  assert.equal(await evaluate("!!document.querySelector('#seed')"), false);
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelectorAll('[data-slot] .chord-diagram').length"), 4);
  assert.equal(await evaluate("document.querySelector('#play-progression').disabled"), false);
  assert.equal(await evaluate("document.querySelector('nav a[href$=\"instrument-desk.html\"]').textContent"), "Instrument Desk");
  const desk = await fetch(origin + (preview ? previewPrefix : "/") + "instrument-desk.html");
  assert.ok(desk.ok && (await desk.text()).includes("instrument-desk-app.js"));
  await evaluate("window.scrollTo(0, 0)");
  await screenshot("desktop-default");
  assert.equal(await evaluate("document.querySelectorAll('#quick-controls > .field').length"), 8);
  assert.equal(await evaluate("document.querySelector('#quick-favorite').getAttribute('aria-pressed')"), "false");
  assert.equal(await evaluate("document.querySelector('#quick-drums').getAttribute('aria-pressed')"), "false");
  await press("#quick-drums", " ");
  assert.equal(await evaluate("document.querySelector('#drum-groove').value"), "pop-backbeat");
  assert.equal(await evaluate("document.querySelector('#quick-drums').getAttribute('aria-pressed')"), "true");
  await press("#quick-drums", " ");
  assert.equal(await evaluate("document.querySelector('#drums-mute').checked"), true);
  await press("#quick-drums", " ");
  assert.equal(await evaluate("document.querySelector('#drums-mute').checked"), false);
  await setValue("#drum-groove", "off");
  await press("#quick-favorite", " ");
  assert.equal(await evaluate("document.querySelector('#quick-favorite').getAttribute('aria-pressed')"), "true");
  await press("#quick-favorite", " ");
  assert.equal(await evaluate("document.querySelectorAll('#favorites li').length"), 0);
  await press("[data-slot='0'] [data-action=zoom]", " ");
  assert.equal(await evaluate("document.querySelector('#chord-zoom').open"), true);
  await press("#chord-zoom-next", " ");
  assert.match(await evaluate("document.querySelector('#chord-zoom-count').textContent"), /2 of 4/);
  await press("#chord-zoom-next", "ArrowLeft");
  assert.equal(await evaluate("document.querySelector('#chord-zoom-count').textContent"), "1 of 4");
  await press("#close-chord-zoom", " ");
  assert.equal(await evaluate("document.querySelector('#chord-zoom').open"), false);
  const firstBeforeMove = await evaluate("document.querySelector('[data-slot=\\\"0\\\"]').dataset.chord");
  await press("[data-slot='0'] [data-action=move][data-step='1']", " ");
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"]').dataset.chord"), firstBeforeMove);
  await press("[data-slot='1'] [data-action=move][data-step='-1']", " ");
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"0\\\"]').dataset.chord"), firstBeforeMove);
  const nativeDrop = await evaluate(`(() => {
    const cards = document.querySelectorAll(".chord-card");
    const transfer = new DataTransfer();
    cards[0].querySelector(".drag-handle").dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    cards[1].dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    const highlighted = cards[1].classList.contains("drop-target");
    cards[1].dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    return highlighted;
  })()`);
  assert.equal(nativeDrop, true);
  assert.equal(await evaluate("document.querySelectorAll('.chord-card')[1].dataset.chord"), firstBeforeMove);
  assert.equal(await evaluate("document.activeElement.closest('[data-slot]').dataset.slot"), "1");
  await press("[data-slot='1'] [data-action=move][data-step='-1']", " ");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Move chord 1 later");
  await press("#show-key-chords", " ");
  assert.equal(await evaluate("document.querySelector('#key-chords-grid').hidden"), false);
  assert.equal(await evaluate("document.querySelectorAll('#key-chords-grid button').length"), 7);
  await press("#key-chords-grid button[data-degree='5']", " ");
  await press("#show-scale", " ");
  await setValue("#fretboard-labels", "notes");
  assert.ok(await evaluate("!!document.querySelector('.fret-note') && document.querySelector('.fret-note').textContent.length > 0"));
  await setValue("#fretboard-labels", "degrees");

  if (preview && process.env.GE_EXPECTED_REVISION) {
    assert.equal(await evaluate("document.querySelector('meta[name=guitar-explorer-revision]').content"), process.env.GE_EXPECTED_REVISION);
  }
  const startsBeforeCancel = await evaluate("window.events.filter(({action}) => action === 'start').length");
  await evaluate("window.waitForSamples = true");
  await press("#play-progression", " ");
  await waitFor("window.sampleWaiters.length > 0", "guitar sample in flight");
  assert.equal(await evaluate("document.querySelector('#stop-progression').disabled"), false);
  await press("#stop-progression", " ");
  await evaluate("window.releaseSamples()");
  await delay(350);
  assert.equal(await evaluate("window.events.filter(({action}) => action === 'start').length"), startsBeforeCancel, "Stop invalidates pending sample playback");

  await setValue("#tonic", "Db");
  await setValue("#mode", "mixolydian");
  await evaluate("window.seed = 23");
  await press("#generate", "Enter");
  assert.match(await evaluate("document.querySelector('#context-heading').textContent"), /D♭ Mixolydian/);
  assert.match(await evaluate("document.querySelector('#scale-notes').textContent"), /C♭/);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-slot]')].map(card => card.dataset.chord)"), ["D♭", "A♭m", "G♭", "D♭"]);
  await viewport(1600, 1000, false);
  await evaluate("window.scrollTo(0, 0)");
  await screenshot("comparison-1600");
  await viewport(1380, 900, false);
  await press("[data-slot='1'] [data-action=zoom]", " ");
  await screenshot("chord-diagram");
  await press("#chord-zoom-audition", " ");
  await waitFor("document.querySelector('#chord-zoom-status').textContent.includes('A♭m')", "enlarged chord audition");
  const zoomPoint = await evaluate(`(() => {
    const box = document.querySelector('#chord-zoom').getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`);
  await touchGesture({ x: zoomPoint.x + 90, y: zoomPoint.y }, { x: zoomPoint.x - 90, y: zoomPoint.y });
  assert.equal(await evaluate("document.querySelector('#chord-zoom-count').textContent"), "3 of 4");
  await press("#close-chord-zoom", " ");
  await viewport(390, 844, true);
  await press("[data-slot='0'] [data-action=select]", " ");
  await press("[data-slot='0'] [data-action=lock]", " ");
  await press("[data-slot='0'] [data-action=voicing][data-step='1']", " ");
  const movedGrip = await evaluate("document.querySelector('[data-slot=\"0\"] .diagram-wrap').dataset.voicing");
  const touchPoints = await evaluate(`(() => {
    const [first, second] = document.querySelectorAll('.chord-card');
    const handle = first.querySelector('.drag-handle');
    handle.scrollIntoView({ block: 'center' });
    const a = handle.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    return [{ x: a.left + a.width / 2, y: a.top + a.height / 2 }, { x: b.left + b.width / 2, y: b.top + 35 }];
  })()`);
  await touchGesture(...touchPoints, () => waitFor("!!document.querySelector('[data-slot=\"1\"].drop-target')", "touch drop feedback"));
  assert.equal(await evaluate("document.querySelector('[data-slot=\"1\"] .diagram-wrap').dataset.voicing"), movedGrip);
  assert.equal(await evaluate("document.querySelector('[data-slot=\"1\"] [data-action=lock]').getAttribute('aria-pressed')"), "true");
  assert.equal(await evaluate("document.querySelector('[data-slot=\"1\"] [data-action=select]').getAttribute('aria-pressed')"), "true");
  await press("[data-slot='1'] [data-action=move][data-step='-1']", " ");
  await press("[data-slot='0'] [data-action=lock]", " ");
  await viewport(1380, 900, false);
  await press("#show-key-chords", " ");
  await press("#key-chords-grid [data-degree='7']", " ");
  assert.match(await evaluate("document.querySelector('#fretboard-description').textContent"), /C♭.*♭VII/);
  await setValue("#fretboard-labels", "intervals");
  assert.equal(await evaluate("document.querySelector('.fret-note.root').textContent"), "1");
  await screenshot("key-chords");
  await setValue("#fretboard-labels", "degrees");
  await press("#show-scale", " ");
  await setValue("#fretboard-highlights", "modal");
  assert.ok(await evaluate("[...document.querySelectorAll('.modal-tone')].length > 0 && [...document.querySelectorAll('.modal-tone')].every(note => note.getAttribute('aria-label').startsWith('C♭'))"));
  await setValue("#scale-layer", "majorPentatonic");
  assert.equal(await evaluate("document.querySelectorAll('.modal-tone').length"), 0);
  await setValue("#scale-layer", "context");
  await setValue("#fretboard-highlights", "root");
  await setValue("#tempo", "180");
  await press('[data-position="E"]', " ");
  await press("#play-scale", " ");
  await waitFor("!!document.querySelector('.scale-playing')", "visible scale note from Once");
  await screenshot("caged-playback");
  await waitFor("document.querySelector('#scale-practice-message').textContent.includes('finished')", "one-shot scale completion");
  assert.equal(await evaluate("!!document.querySelector('.scale-playing')"), false);
  await setValue("#scale-play-mode", "loop");
  await press("#play-scale", " ");
  await waitFor("document.querySelector('#scale-practice-message').textContent.includes('Looping')", "looped scale");
  await press("#stop-scale", " ");
  assert.match(await evaluate("document.querySelector('#scale-practice-message').textContent"), /stopped/);
  await setValue("#scale-play-mode", "all");
  await press("#play-scale", " ");
  await waitFor("!!document.querySelector('.scale-playing')", "visible full-board note from All");
  assert.equal(await evaluate("document.querySelector('#caged-positions [aria-pressed=true]').dataset.position"), "full");
  await press("#stop-scale", " ");
  assert.equal(await evaluate("document.querySelector('.scale-playing') === null"), true);
  await setValue("#tempo", "92");
  await press("[data-slot='1'] [data-action=select]", " ");
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"] [data-action=select]').getAttribute('aria-pressed')"), "true");
  assert.ok(await evaluate("[...document.querySelectorAll('.fret-note.root')].every(button => button.getAttribute('aria-label').startsWith(document.querySelector('[data-slot=\\\"1\\\"] .chord-tones').textContent.split(' · ')[0]))"));
  await setValue("[data-slot='1'] [data-action=replace]", "4");
  const locked = await evaluate("document.querySelector('[data-slot=\\\"1\\\"]').dataset.chord");
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"] [data-action=lock]').getAttribute('aria-pressed')"), "true");
  await press("[data-slot='1'] [data-action=voicing][data-step='1']", " ");
  const chosenGrip = await evaluate("document.querySelector('[data-slot=\\\"1\\\"] .diagram-wrap').dataset.voicing");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"]').dataset.chord"), locked);
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"] .diagram-wrap').dataset.voicing"), chosenGrip);
  await setValue("#tonic", "C");
  await setValue("#mode", "major");
  await press("#generate", "Enter");
  assert.match(await evaluate("document.querySelector('#form-message').textContent"), /locked.*outside|locked.*context/i);
  assert.equal(await evaluate("document.querySelector('[data-slot=\\\"1\\\"]').dataset.chord"), locked);
  await setValue("#tonic", "Db");
  await setValue("#mode", "mixolydian");
  await evaluate("document.querySelector('#advanced-settings').open = true");
  await press("[data-settings=rhythm]", " ");
  assert.ok(await evaluate("!document.querySelector('#rhythm-settings').hidden && document.querySelector('#chords-settings').hidden"));
  await setValue("#meter", "6/8");
  assert.match(await evaluate("document.querySelector('#tempo-unit').textContent"), /dotted-quarter/);
  await press("#play-progression", " ");
  await waitFor("document.querySelector('[data-playing=\\\"true\\\"]') && window.events.some(({action}) => action === 'start')", "sampled six-eight playback and highlight");
  assert.ok(await evaluate("window.sampleRequests.length > 0 && window.sampleRequests.every(({ok}) => ok)"));
  await setValue("#guitar-tone", "warm");
  assert.ok(await evaluate("!!document.querySelector('[data-playing=true]')"));
  await setValue("#drum-groove", "six-eight-sway");
  await waitFor("window.sampleRequests.filter(({path,ok}) => ok && path.includes('/samples/drums/')).length === 3", "three recorded drum sounds");
  await waitFor("document.querySelector('#transport-message').textContent.includes('Playing loop')", "live groove restart");
  assert.equal(await evaluate("window.audioClocks.size"), 1);
  assert.ok(await evaluate("window.events.some((event) => event.action === 'start' && Math.abs(event.duration - .44) < .005 && window.events.some((other) => other.action === 'start' && other.at === event.at && other.duration > .5))"));
  await setValue("#meter", "3/4");
  await waitFor("document.querySelector('#transport-message').textContent.includes('Playing loop')", "live meter restart");
  assert.equal(await evaluate("document.querySelector('#drum-groove').value"), "folk-waltz");
  await setValue("#tempo", "138");
  await waitFor("document.querySelector('#transport-message').textContent.includes('Playing loop')", "live tempo restart");
  await press(".drum-editor > summary", " ");
  assert.equal(await evaluate("document.querySelectorAll('#drum-grid button').length"), 18);
  const editedStep = "#drum-grid [data-part=kick][data-step='1']";
  assert.equal(await evaluate(css(editedStep) + ".getAttribute('aria-pressed')"), "false");
  await press(editedStep, " ");
  assert.equal(await evaluate(css(editedStep) + ".getAttribute('aria-pressed')"), "true");
  await waitFor("document.querySelector('#transport-message').textContent.includes('Playing loop')", "edited live pattern");
  await press("#drum-fill", " ");
  await press("#metronome-click", " ");
  await waitFor("window.events.some(start => start.action === 'start' && Math.abs(start.duration - .23) < .005 && window.events.some(stop => stop.action === 'stop' && stop.id === start.id && Math.abs(stop.at - start.at - .065) < .001))", "recorded metronome click");
  assert.equal(await evaluate("window.audioClocks.size"), 1);
  await press("#quick-drums", " ");
  assert.equal(await evaluate("document.querySelector('#drums-mute').checked"), true);
  assert.equal(await evaluate("window.mixerTargets.at(-1)"), 0);
  await press("#quick-drums", " ");
  assert.equal(await evaluate("window.mixerTargets.at(-1)"), .62);
  await press("#quick-guitar", " ");
  assert.equal(await evaluate("document.querySelector('#guitar-mute').checked"), true);
  assert.equal(await evaluate("window.mixerTargets.at(-1)"), 0);
  await press("#quick-guitar", " ");
  assert.equal(await evaluate("window.mixerTargets.at(-1)"), .82);
  assert.equal(await evaluate("window.audioClocks.size"), 1);
  await press("#play-progression", " ");
  assert.equal(await evaluate("document.querySelector('#play-progression').getAttribute('aria-label')"), "Resume progression");
  assert.equal(await evaluate("document.querySelector('#transport-message').textContent"), "Paused.");
  await press("#play-progression", " ");
  await waitFor("document.querySelector('#play-progression').getAttribute('aria-label') === 'Pause progression'", "resumed transport");
  await screenshot("rhythm-controls");
  await screenshot("desktop-playback");
  await press("#stop-progression", " ");
  assert.equal(await evaluate("!!document.querySelector('[data-playing=\\\"true\\\"]')"), false);

  await press("[data-settings=chords]", " ");
  await setValue("#chord-length", "16");
  await setValue("#style", "jazz");
  await setValue("#mood", "tense");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelectorAll('[data-slot]').length"), 16);
  assert.equal(await evaluate("document.querySelector('#chord-count').textContent"), "16 chords");
  await press("#quick-favorite", " ");
  assert.equal(await evaluate("document.querySelector('#quick-favorite').getAttribute('aria-pressed')"), "true");
  await press("#quick-favorite", " ");
  await press("#play-progression", " ");
  await waitFor("document.querySelector('#transport-message').textContent.includes('16 chords')", "sixteen-chord playback");
  await press("#stop-progression", " ");
  await press("[data-slot='15'] [data-action=lock]", " ");
  await setValue("#chord-length", "12");
  await press("#generate", "Enter");
  assert.match(await evaluate("document.querySelector('#form-message').textContent"), /unlock chord 16/i);
  assert.equal(await evaluate("document.querySelectorAll('[data-slot]').length"), 16);
  await press("[data-slot='15'] [data-action=lock]", " ");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelectorAll('[data-slot]').length"), 12);
  await press("#play-progression", " ");
  await waitFor("document.querySelector('#transport-message').textContent.includes('12 chords')", "twelve-chord playback");
  await press("#stop-progression", " ");
  await setValue("#chord-length", "2");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelectorAll('[data-slot]').length"), 2);
  await press("#play-progression", " ");
  await waitFor("document.querySelector('#transport-message').textContent.includes('2 chords')", "short loop playback");
  await press("#stop-progression", " ");

  await press("#reset-workspace", " ");
  await setValue("#tonic", "B");
  await setValue("#mode", "locrian");
  await press("#generate", "Enter");
  assert.match(await evaluate("document.querySelector('#context-heading').textContent"), /B Locrian/);
  assert.equal(await evaluate("document.querySelector('[data-slot]').dataset.chord"), "Bdim");
  assert.ok(await evaluate("document.querySelectorAll('[data-slot=\"0\"] .diagram-finger-number').length >= 3"));
  await press("[data-slot='0'] [data-action=lock]", " ");
  await setValue("#chord-color", "sevenths");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelector('[data-slot]').dataset.chord"), "Bdim");
  assert.ok(await evaluate("[...document.querySelectorAll('[data-slot]')].slice(1).some((card) => card.dataset.chord.includes('7'))"));

  await press("#reset-workspace", " ");
  await setValue("#tonic", "C");
  await setValue("#mode", "major");
  await press("#generate", "Enter");
  assert.equal(await evaluate("document.querySelectorAll('.fret-number').length"), 16);
  for (const form of ["C", "A", "G", "E", "D"]) {
    await press('[data-position="' + form + '"]', " ");
    assert.ok(await evaluate("document.querySelectorAll('.fret-number').length <= 6"));
    assert.ok(await evaluate("document.querySelectorAll('.grip-tone').length >= 4"));
  }
  await press('[data-position="A"]', " ");
  assert.match(await evaluate("document.querySelector('#fretboard-description').textContent"), /A form, frets 2–6/);
  await setValue("#scale-layer", "majorPentatonic");
  assert.match(await evaluate("document.querySelector('#fretboard-title').textContent"), /C major pentatonic/);
  assert.equal(await evaluate("document.querySelectorAll('.fret-note[tabindex=\"0\"]').length"), 1);
  const startingFret = await evaluate("document.querySelector('.fret-note[tabindex=\"0\"]').dataset.fret");
  await press('.fret-note[tabindex="0"]', "End");
  assert.notEqual(await evaluate("document.activeElement.dataset.fret"), startingFret);
  assert.equal(await evaluate("document.activeElement.classList.contains('fret-note') && document.activeElement.tabIndex === 0"), true);
  await press("#show-chords", " ");
  assert.ok(await evaluate("document.querySelector('#scale-layer-control').hidden"));
  assert.ok(await evaluate("!!document.querySelector('.fret-note.root')"));

  await setValue("[data-slot='1'] [data-action=replace]", "1:add9");
  await press("[data-slot='1'] [data-action=voicing][data-step='1']", " ");
  await press("#advanced-settings > summary", " ");
  await press("[data-settings=rhythm]", " ");
  await setValue("#meter", "6/8");
  await setValue("#drum-groove", "six-eight-drive");
  await setValue("#guitar-tone", "warm");
  const savedState = "JSON.stringify({cards:[...document.querySelectorAll('[data-slot]')].map(card=>[card.dataset.chord,card.querySelector('.diagram-wrap').dataset.voicing,card.querySelector('[data-action=lock]').getAttribute('aria-pressed')]),settings:['#meter','#drum-groove','#guitar-tone'].map(selector=>document.querySelector(selector).value),form:document.querySelector('#caged-positions [aria-pressed=true]').dataset.position})";
  const original = await evaluate(savedState);
  await evaluate("document.querySelector('#library-drawer').open = true");
  await press("#save-favorite", " ");
  assert.equal(await evaluate("document.querySelectorAll('#favorites li').length"), 1);
  await press("#reset-workspace", " ");
  await press("#favorites li button:first-child", " ");
  assert.equal(await evaluate(savedState), original);
  await press("#copy-progression", " ");
  await waitFor("document.querySelector('#library-status').textContent === 'Progression text copied.'", "native text copy");
  assert.match(await evaluate("navigator.clipboard.readText()"), /Cadd9 \(locked\)/);
  await press("#share-progression", " ");
  await waitFor("document.querySelector('#library-status').textContent === 'Share link copied.'", "native share link copy");
  const shareLink = await evaluate("navigator.clipboard.readText()");
  assert.ok(new URL(shareLink).hash.startsWith("#p="));
  assert.ok(shareLink.length < 1600);
  await cdp("Page.navigate", { url: shareLink });
  await waitFor("document.querySelector('#library-status')?.textContent === 'Shared progression restored.'", "shared state restoration");
  assert.equal(await evaluate(savedState), original);
  await evaluate("location.hash = 'p=%'");
  await waitFor("document.querySelector('#library-status').textContent.includes('invalid format')", "invalid hash notice");
  assert.equal(await evaluate(savedState), original);
  assert.equal(await evaluate("document.querySelectorAll('#favorites li').length"), 1);
  await evaluate("document.querySelector('#library-drawer').open = true");
  await press("#favorites li button:last-child", " ");
  assert.equal(await evaluate("document.querySelectorAll('#favorites li').length"), 0);

  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  for (const [width, height, name] of [[390, 844, "mobile"], [320, 740, "mobile-320"], [844, 390, "landscape"]]) {
    await viewport(width, height, true);
    await waitFor("innerWidth === " + width, name);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), name + " avoids page overflow");
    await press('[data-position="A"]', " ");
    assert.ok(await evaluate("(() => { const board = document.querySelector('.fretboard-scroll'); return board.scrollWidth <= board.clientWidth + 1; })()"));
    await evaluate("document.querySelector('.fretboard-panel').scrollIntoView()");
    await screenshot(name + "-caged");
    await press('[data-position="full"]', " ");
    if (width <= 390) {
      assert.ok(await evaluate("(() => { const board = document.querySelector('.fretboard-scroll'); return board.scrollWidth > board.clientWidth; })()"));
    }
    await evaluate("window.scrollTo(0, 0)");
    await screenshot(name);
  }
  assert.deepEqual(exceptions, []);
  console.log("Chrome progression integration passed at " + page);
  console.log("Screenshots: " + screenshots);

} finally {
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const exit = once(chrome, "exit").catch(() => {});
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: 0, method: "Browser.close" }));
      await Promise.race([exit, delay(2000, undefined, { ref: false })]);
    }
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill();
    await Promise.race([exit, delay(2000, undefined, { ref: false })]);
  }
  socket?.close();
  server.closeAllConnections();
  if (server.listening) {
    const close = once(server, "close");
    server.close();
    await close;
  }
  if (dirname(profile) === resolve(tmpdir()) && basename(profile).startsWith(profilePrefix)) {
    await rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  }
}
