import {
  STANDARD_FRETBOARD,
  formatNote,
  musicQueries,
  toSemitone,
  transposePitch,
} from "/engine/index.js";
import { createPracticePlan } from "/practice-session.mjs";
import { createAudioOut } from "/audio-out.mjs";
import {
  ACCOMPANIMENT_ACTIONS,
  ACCOMPANIMENT_PRESETS,
  ACCOMPANIMENT_SUBDIVISIONS,
  accompanimentDurationSeconds,
  buildAccompanimentCue,
  createAccompanimentPlan,
} from "/accompaniment-plan.mjs";

const $ = (id) => document.getElementById(id);

function unwrap(result) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

const practice = createPracticePlan({
  getHarmony: (request) => unwrap(musicQueries.getDiatonicHarmony(request)),
  getCatalog: () => unwrap(musicQueries.getChordCatalog({})),
  findLocations: ({ key, chord, stringIndex, pitchClass }) => unwrap(musicQueries.getFretboardLocations({
    board: STANDARD_FRETBOARD,
    fretRange: { minFret: 0, maxFret: 15 },
    stringIndices: [stringIndex],
    pitchClasses: [pitchClass],
    context: { key, currentChord: { root: chord.root, chordId: chord.chordId } },
  })),
  getInterval: (request) => unwrap(musicQueries.getInterval(request)),
  formatNote,
});

const progression = Object.freeze([
  practice.context.chords.home,
  practice.context.chords.departure,
  practice.context.chords.pressure,
  practice.context.chords.home,
]);

const audio = createAudioOut({ toSemitone });
let pattern = [...ACCOMPANIMENT_PRESETS.open.pattern];
let barsPerChord = progression.map(() => 1);

const actionGlyph = Object.freeze({ down: "↓", up: "↑", rest: "·" });
const actionLabel = Object.freeze({ down: "down strum", up: "up strum", rest: "rest" });

function bpm() {
  return Number($("accompaniment-tempo").value);
}

function currentPlan() {
  return createAccompanimentPlan({ progression, bpm: bpm(), barsPerChord, pattern });
}

function setStatus(text) {
  $("accompaniment-status").textContent = text;
}

function renderProgressionControls() {
  const root = $("progression-controls");
  root.replaceChildren();
  progression.forEach((chord, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "chord-control";
    wrapper.innerHTML = `<strong>${chord.symbol}</strong><span>Bars for this chord</span>`;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `${chord.symbol} bars, position ${index + 1}`);
    for (let value = 1; value <= 4; value += 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = `${value} ${value === 1 ? "bar" : "bars"}`;
      option.selected = barsPerChord[index] === value;
      select.append(option);
    }
    select.addEventListener("change", () => {
      barsPerChord = barsPerChord.map((bars, itemIndex) => itemIndex === index ? Number(select.value) : bars);
      audio.stop();
      updateSummary();
    });
    wrapper.append(select);
    root.append(wrapper);
  });
  $("progression-heading").textContent = progression.map(({ symbol }) => symbol).join(" → ");
}

function renderPattern() {
  const grid = $("pattern-grid");
  grid.replaceChildren();
  pattern.forEach((action, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pattern-slot";
    button.dataset.slot = String(index);
    button.setAttribute("aria-label", `${ACCOMPANIMENT_SUBDIVISIONS[index]}: ${actionLabel[action]}`);
    const count = document.createElement("span");
    count.className = "pattern-count";
    count.textContent = ACCOMPANIMENT_SUBDIVISIONS[index];
    const glyph = document.createElement("span");
    glyph.className = "pattern-action";
    glyph.textContent = actionGlyph[action];
    button.append(count, glyph);
    button.addEventListener("click", () => {
      const nextIndex = (ACCOMPANIMENT_ACTIONS.indexOf(pattern[index]) + 1) % ACCOMPANIMENT_ACTIONS.length;
      pattern[index] = ACCOMPANIMENT_ACTIONS[nextIndex];
      if (pattern.every((item) => item === "rest")) pattern[index] = "down";
      audio.stop();
      renderPattern();
      updateSummary();
    });
    grid.append(button);
  });
  $("pattern-readable").textContent = pattern.map((action) => actionGlyph[action]).join("  ");
}

function updateSummary() {
  const plan = currentPlan();
  const duration = accompanimentDurationSeconds(plan);
  $("tempo-output").textContent = `${plan.bpm} BPM`;
  setStatus(`Ready · ${plan.barsPerChord.join(" / ")} bars · about ${duration.toFixed(1)} seconds.`);
}

function applyPreset(id) {
  const preset = ACCOMPANIMENT_PRESETS[id];
  if (!preset) return;
  pattern = [...preset.pattern];
  audio.stop();
  renderPattern();
  updateSummary();
}

async function playAccompaniment() {
  try {
    const plan = currentPlan();
    const cue = buildAccompanimentCue(plan, transposePitch);
    const result = await audio.play(cue);
    setStatus(`Playing ${progression.map(({ symbol }) => symbol).join(" → ")} at ${plan.bpm} BPM · ${result.eventCount} strums · ${result.durationSeconds.toFixed(1)}s rendered.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Accompaniment could not start in this browser.");
  }
}

function stopAccompaniment() {
  const stopped = audio.stop();
  setStatus(stopped ? "Audio stopped. Keep the same plan and play it yourself." : "No accompaniment is currently sounding.");
}

$("accompaniment-tempo").addEventListener("input", () => {
  audio.stop();
  updateSummary();
});

for (const button of document.querySelectorAll("[data-preset]")) {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
}

$("accompaniment-play").addEventListener("click", playAccompaniment);
$("accompaniment-stop").addEventListener("click", stopAccompaniment);
globalThis.addEventListener?.("pagehide", () => audio.stop());

renderProgressionControls();
renderPattern();
updateSummary();
