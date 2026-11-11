import { sections, occurrences } from "./song-study/arrangement.js";
import { studies } from "./song-study/studies.js";
import { positionNotes, prepareExample, quarterPulse } from "./song-study/model.js";
import { createSongAudio } from "./song-audio.mjs";
import { fretDetail, overviewView, workbenchView } from "./song-view.mjs";

const app = document.querySelector("#app");
const audio = createSongAudio();
const storageKey = "guitar-explorer:black-dog:v1";
const defaultRanges = [[0, 7], [5, 12], [10, 17], [15, 24]];
let storageAvailable = true;
let state = readState();
let current;
let range = 0;
let rate = 1;
let pulse = true;
let showTargets = true;
let lastTick = -1;
let playback = 0;

function indexOrZero(value, length) {
  return Number.isInteger(value) && value >= 0 && value < length ? value : 0;
}

function readState() {
  const entries = {};
  let last = null;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    for (const { id } of sections) {
      const saved = stored?.entries?.[id];
      if (!saved) continue;
      const study = indexOrZero(saved.study, studies[id].length);
      entries[id] = {
        study,
        example: indexOrZero(saved.example, studies[id][study].examples.length),
        transposed: saved.transposed === true,
        played: saved.played === true,
        note: typeof saved.note === "string" ? saved.note.slice(0, 1500) : "",
      };
    }
    if (typeof stored?.last?.anchorId === "string") {
      const route = resolveAnchor(stored.last.anchorId);
      if (route.section) last = { sectionId: route.section.id, anchorId: stored.last.anchorId };
    }
  } catch {
    storageAvailable = false;
  }
  return { entries, last };
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    const status = app.querySelector("#storage-status");
    if (status) status.textContent = "Browser storage is unavailable. Notes and guitar attempts will stay in this tab only.";
  }
}

function resolveAnchor(anchor) {
  const occurrence = occurrences.find(({ id }) => id === anchor);
  const section = sections.find(({ id }) => id === (occurrence?.sectionId ?? anchor));
  return { section, occurrence };
}

function openRoute(focus) {
  const anchorId = location.hash.slice(1);
  const { section, occurrence } = resolveAnchor(anchorId);
  current = null;
  if (section) {
    const allStudies = studies[section.id];
    const entry = state.entries[section.id] ??= { study: 0, example: 0, transposed: false, played: false, note: "" };
    if (occurrence?.identity === "e-turnaround" && state.last?.anchorId !== anchorId) {
      const index = allStudies.findIndex((study) => study.examples.some((example) => example.group === 9));
      if (index >= 0 && entry.study !== index) {
        entry.study = index;
        entry.example = 0;
        entry.transposed = false;
      }
    }
    current = { section, occurrence, allStudies, entry };
    state.last = { sectionId: section.id, anchorId };
    saveState();
  }
  range = 0;
  rate = 1;
  pulse = true;
  showTargets = true;
  render({ focus });
  if (focus) window.scrollTo(0, 0);
}

function render({ focus = false, restore, showFacts = false } = {}) {
  stopPlayback();
  if (!current) {
    app.innerHTML = overviewView(state.last, state.entries);
    document.title = "Black Dog · Guitar Explorer";
  } else {
    const { section, allStudies, entry } = current;
    const study = allStudies[entry.study];
    const example = study.examples[entry.example];
    const prepared = prepareExample(example, entry.transposed);
    const preferred = example.fretRange ?? defaultRanges[0];
    const offset = entry.transposed ? Math.min(2, 24 - preferred[1]) : 0;
    const suggested = preferred.map((fret) => fret + offset);
    const ranges = [suggested, ...defaultRanges.filter(([low, high]) => low !== suggested[0] || high !== suggested[1])];
    range = indexOrZero(range, ranges.length);
    const [min, max] = ranges[range];
    const board = prepared.notes.length ? positionNotes(min, max, prepared.context) : [];
    const targets = new Map(showTargets ? prepared.notes.map((note) => [note.semitone, note.name]) : []);
    Object.assign(current, { study, example, prepared, board });
    app.innerHTML = workbenchView({ ...current, range, ranges, targets, rate, pulse, showTargets, storageAvailable, showFacts });
    document.title = section.title + " · Black Dog · Guitar Explorer";
  }
  if (focus) app.focus({ preventScroll: true });
  if (restore) app.querySelector(restore)?.focus({ preventScroll: true });
}

function setAudioStatus(text, playing) {
  const status = app.querySelector("#audio-status");
  if (!status) return;
  status.textContent = text;
  app.querySelector("[data-action=stop]").disabled = !playing;
}

function highlightTick(tick) {
  if (tick === lastTick) return;
  for (const cell of app.querySelectorAll(".is-playing")) cell.classList.remove("is-playing");
  if (tick >= 0) {
    for (const cell of app.querySelectorAll('[data-tick="' + tick + '"]')) cell.classList.add("is-playing");
  }
  lastTick = tick;
}

function stopPlayback() {
  playback++;
  audio.stop();
  highlightTick(-1);
  setAudioStatus("Synthesized study audio.", false);
}

async function playSound(events, duration, bpm, label, followRhythm = false) {
  const request = ++playback;
  highlightTick(-1);
  setAudioStatus(label, true);
  try {
    await audio.play(events, duration, {
      bpm,
      onTick: followRhythm ? highlightTick : undefined,
      onEnd: () => {
        highlightTick(-1);
        setAudioStatus("Playback finished.", false);
      },
    });
  } catch {
    if (request === playback) {
      setAudioStatus("Audio is unavailable. Try again or use the recording link and your guitar.", false);
    }
  }
}

function selectFret(button) {
  const [stringIndex, fret] = button.dataset.fret.split(":").map(Number);
  const note = current.board.find(({ position }) => position.stringIndex === stringIndex && position.fret === fret);
  app.querySelector('.fret-note[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
  app.querySelector('.fret-note[tabindex="0"]')?.setAttribute("tabindex", "-1");
  button.tabIndex = 0;
  button.setAttribute("aria-pressed", "true");
  app.querySelector("#fret-detail").innerHTML = fretDetail(note);
  void playSound([{ at: 0, length: 2, semitones: [note.semitone] }], 2, 120, "Auditioning " + note.name + ".");
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !current) return;
  const { action, fret, study, example } = button.dataset;
  const { entry, prepared } = current;
  const showFacts = app.querySelector("[data-facts]")?.open;
  if (study !== undefined) {
    entry.study = Number(study);
    entry.example = 0;
    entry.transposed = false;
    range = 0;
    saveState();
    render({ restore: '[data-study="' + study + '"]' });
  } else if (example !== undefined) {
    entry.example = Number(example);
    range = 0;
    saveState();
    render({ showFacts, restore: '[data-example="' + example + '"]' });
  } else if (action === "transpose") {
    entry.transposed = !entry.transposed;
    saveState();
    render({ showFacts, restore: "[data-action=transpose]" });
  } else if (action === "toggle-targets") {
    showTargets = !showTargets;
    render({ showFacts, restore: "[data-action=toggle-targets]" });
  } else if (action === "play") {
    const { beats, bpm = 92, label } = current.example;
    const events = pulse && beats ? [...prepared.events, ...quarterPulse(prepared.duration, beats)] : prepared.events;
    void playSound(events, prepared.duration, bpm * rate, "Playing " + label + ".", Boolean(beats));
  } else if (action === "stop") {
    stopPlayback();
    app.querySelector("[data-action=play]").focus();
  } else if (fret !== undefined) {
    selectFret(button);
  }
});

app.addEventListener("keydown", (event) => {
  const button = event.target.closest(".fret-note");
  if (!button) return;
  const movement = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
  if (!movement) return;
  event.preventDefault();
  const [string, fret] = button.dataset.fret.split(":").map(Number);
  const target = app.querySelector('[data-fret="' + (string + movement[0]) + ":" + (fret + movement[1]) + '"]');
  if (target) {
    button.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
  }
});

app.addEventListener("change", ({ target }) => {
  if (!current) return;
  if (target.id === "fret-range") {
    range = Number(target.value);
    render({ showFacts: app.querySelector("[data-facts]")?.open, restore: "#fret-range" });
  } else if (target.id === "tempo") {
    rate = Number(target.value);
    stopPlayback();
  } else if (target.id === "with-pulse") {
    pulse = target.checked;
    stopPlayback();
  } else if (target.id === "played-guitar") {
    current.entry.played = target.checked;
    saveState();
  }
});

app.addEventListener("input", ({ target }) => {
  if (target.id === "reflection-note" && current) {
    current.entry.note = target.value;
    saveState();
  }
});

document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  app.focus();
});

window.addEventListener("hashchange", () => openRoute(true));
window.addEventListener("pagehide", stopPlayback);
openRoute(false);
