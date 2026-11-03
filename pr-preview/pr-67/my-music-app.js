import {
  STANDARD_FRETBOARD,
  formatNote,
  parsePitch,
  toSemitone,
} from "./engine/index.js";
import { createFretboard } from "./fretboard-view.mjs";
import { createAudioOut } from "./audio-out.mjs";
import {
  cantStopPractice,
  evidenceBoundary,
  loadInterestingMaterials,
} from "./interesting-material.mjs";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const stringNames = Object.freeze(["low E", "A", "D", "G", "B", "high e"]);
const audio = createAudioOut({ toSemitone });
let materials = [];
let selected = null;

function physicalStrings() {
  return STANDARD_FRETBOARD.tuning.openStrings
    .map(({ note }, index) => ({
      index,
      label: index === 5 ? "e" : formatNote(note),
    }))
    .reverse();
}

const board = createFretboard($("material-board"));

function neutralBoard(label = "Standard-tuning guitar fretboard, open strings through fret 12.") {
  board.update({
    strings: physicalStrings(),
    activeStringIndices: STANDARD_FRETBOARD.tuning.openStrings.map((_, index) => index),
    fretRange: { minFret: 0, maxFret: 12 },
    positions: [],
    connections: [],
    label,
  });
}
neutralBoard();

function setTheme(theme, { persist = true } = {}) {
  const next = theme === "dark" ? "dark" : "light";
  root.dataset.theme = next;
  $("theme-light").setAttribute("aria-pressed", String(next === "light"));
  $("theme-dark").setAttribute("aria-pressed", String(next === "dark"));
  if (persist) {
    try { localStorage.setItem("guitar-explorer-theme", next); } catch { /* preference only */ }
  }
}

let initialTheme = "light";
try {
  const saved = localStorage.getItem("guitar-explorer-theme");
  if (saved === "light" || saved === "dark") initialTheme = saved;
  else if (globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches) initialTheme = "dark";
} catch { /* use light */ }
setTheme(initialTheme, { persist: false });
$("theme-light").addEventListener("click", () => setTheme("light"));
$("theme-dark").addEventListener("click", () => setTheme("dark"));

function realizationLabel(fragment, realizationId) {
  if (!realizationId) return "not tied to one realization";
  return fragment.realizations.find((item) => item.id === realizationId)?.label ?? realizationId;
}

function sourceLabel(fragment, sourceIds) {
  const labels = sourceIds.map((id) => {
    const source = fragment.sources.find((item) => item.id === id);
    return source?.type?.replaceAll("_", " ") ?? id;
  });
  return labels.join(" + ");
}

function positionText(value) {
  if (value.stringIndex === null || value.fret === null) return "physical position unknown";
  return `${stringNames[value.stringIndex] ?? `string ${value.stringIndex}`} · fret ${value.fret}`;
}

function strokeText(value) {
  const pitched = value.pitched.map((item) => `${stringNames[item.stringIndex] ?? `string ${item.stringIndex}`} fret ${item.fret}`).join(", ");
  const muted = value.mutedStringIndices.map((index) => stringNames[index] ?? `string ${index}`).join(", ");
  return `${pitched || "no pitched string recorded"}${muted ? `; muted: ${muted}` : ""}`;
}

function observationText(observation) {
  switch (observation.kind) {
    case "sounding_pitch":
      return observation.value.pitch ? `Sounding pitch ${observation.value.pitch}` : "Sounding pitch unknown";
    case "physical_position":
      return positionText(observation.value);
    case "string_stroke":
      return `String stroke · ${strokeText(observation.value)}`;
    case "tempo":
      return `Tempo ${observation.value.bpm ?? observation.value}`;
    case "texture":
    case "reported_technique": {
      const text = typeof observation.value === "string"
        ? observation.value
        : observation.value?.text ?? observation.value?.description ?? JSON.stringify(observation.value);
      return `${observation.kind === "texture" ? "Texture" : "Reported technique"} · ${text}`;
    }
    default:
      return observation.kind.replaceAll("_", " ");
  }
}

function appendObservation(list, fragment, observation) {
  const item = document.createElement("li");
  const main = document.createElement("span");
  main.textContent = observationText(observation);
  item.append(main);
  const meta = document.createElement("span");
  meta.className = "evidence-meta";
  meta.textContent = `${observation.status} · ${observation.confidence} confidence · ${realizationLabel(fragment, observation.realizationId)} · ${sourceLabel(fragment, observation.sourceIds)}`;
  item.append(meta);
  list.append(item);
}

function appendUnknown(list, fragment, observation) {
  const item = document.createElement("li");
  item.textContent = observation.unknownReason || observationText(observation);
  const meta = document.createElement("span");
  meta.className = "evidence-meta";
  meta.textContent = `unknown · ${realizationLabel(fragment, observation.realizationId)}`;
  item.append(meta);
  list.append(item);
}

function appendAlternative(list, alternative) {
  const item = document.createElement("li");
  const options = alternative.options.map((option) => option.description).join(" ↔ ");
  item.textContent = `${alternative.subject}: ${options}`;
  const meta = document.createElement("span");
  meta.className = "evidence-meta";
  meta.textContent = `${alternative.status} alternative set · no winner selected`;
  item.append(meta);
  list.append(item);
}

function renderSources(fragment, boundary) {
  const sourceList = $("source-list");
  sourceList.replaceChildren();
  for (const source of boundary.sources) {
    const item = document.createElement("li");
    const reference = String(source.reference ?? "Source");
    if (/^https?:\/\//.test(reference)) {
      const link = document.createElement("a");
      link.href = reference;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.type.replaceAll("_", " ");
      item.append(link);
    } else {
      item.append(document.createTextNode(reference));
    }
    const meta = document.createElement("span");
    meta.className = "evidence-meta";
    meta.textContent = [source.locator, source.scope, realizationLabel(fragment, source.realizationId)].filter(Boolean).join(" · ");
    item.append(meta);
    sourceList.append(item);
  }

  const interpretationList = $("interpretation-list");
  interpretationList.replaceChildren();
  if (!boundary.interpretations.length) {
    const item = document.createElement("li");
    item.textContent = "No interpretation claim is required for this fragment.";
    interpretationList.append(item);
  }
  for (const interpretation of boundary.interpretations) {
    const item = document.createElement("li");
    item.textContent = interpretation.claim;
    const meta = document.createElement("span");
    meta.className = "evidence-meta";
    meta.textContent = `${interpretation.confidence} confidence · interpretation only · deterministic: no`;
    item.append(meta);
    interpretationList.append(item);
  }
}

function showCantStopCandidates(fragment) {
  const practice = cantStopPractice(fragment);
  board.update({
    strings: physicalStrings(),
    activeStringIndices: STANDARD_FRETBOARD.tuning.openStrings.map((_, index) => index),
    fretRange: { minFret: 0, maxFret: 12 },
    positions: practice.candidates.map((candidate, index) => ({
      stringIndex: candidate.value.stringIndex,
      fret: candidate.value.fret,
      states: ["common"],
      primaryLabel: "D3 candidate",
      secondaryLabel: index === 0 ? "open D" : "A fret 5",
      ariaLabel: `${index === 0 ? "Open D string" : "A string fret 5"} candidate for reported D3; ${candidate.status}, ${candidate.confidence} confidence. Neither candidate is marked correct.`,
    })),
    connections: [],
    label: "Two unresolved physical candidates for the reported D3 in Can’t Stop research. Neither position is marked correct.",
  });
  $("practice-instruction").textContent = "The studio audio supports a D3, but the research does not establish one studio fingering. Play both highlighted candidates: open D and A-string fret 5. Listen for the same pitch, then compare what each position makes physically easy or difficult.";
}

function showCantStopMutedStroke(fragment) {
  const practice = cantStopPractice(fragment);
  const stroke = practice.mutedStroke;
  const pitched = stroke.value.pitched[0];
  board.update({
    strings: physicalStrings(),
    activeStringIndices: stroke.value.pitched.map((item) => item.stringIndex),
    fretRange: { minFret: 0, maxFret: 12 },
    positions: stroke.value.pitched.map((item) => ({
      stringIndex: item.stringIndex,
      fret: item.fret,
      states: ["current"],
      primaryLabel: "pitched",
      secondaryLabel: `${stringNames[item.stringIndex]} fret ${item.fret}`,
      ariaLabel: `Reported pitched string in candidate muted stroke: ${stringNames[item.stringIndex]} fret ${item.fret}. Other reported strings are muted, not pitched.`,
    })),
    connections: [],
    label: "Candidate muted-string stroke from Can’t Stop research. Only the reported pitched string is plotted; muted strings are intentionally not assigned pitches.",
  });
  const muted = stroke.value.mutedStringIndices.map((index) => stringNames[index]).join(", ");
  $("practice-instruction").textContent = `Technique evidence from a candidate realization: ${stringNames[pitched.stringIndex]} fret ${pitched.fret} is the recorded pitched coordinate in this selective fixture, while ${muted} are reported muted. Try striking across the strings while allowing only the intended pitched note to speak. This is technique evidence, not a claim that this exact reconstruction is the studio take.`;
}

function renderPractice(material) {
  const { spec, fragment } = material;
  const isCantStop = spec.id === "JF-CAND-012";
  $("hear-reference").hidden = !isCantStop;
  $("audio-note").hidden = !isCantStop;
  $("cant-stop-actions").hidden = !isCantStop;
  $("physical-reflection").hidden = !isCantStop;
  $("inspection-note").hidden = isCantStop;
  $("transfer-prompt").hidden = true;
  $("reflection-status").textContent = "";
  audio.stop();

  if (isCantStop) {
    showCantStopCandidates(fragment);
    return;
  }

  neutralBoard(`Neutral fretboard while inspecting ${spec.title}. No missing studio position is invented.`);
  $("practice-instruction").textContent = spec.question;
  $("inspection-note").hidden = false;
  $("inspection-note").textContent = spec.id === "JF-CAND-004"
    ? "For v0, Guitar Explorer stops at the evidence boundary here: the live and demonstration realizations are useful references, but they do not prove the studio-master fingering."
    : "For v0, Guitar Explorer keeps the visible music-video voicing separate from the studio master. A later exercise should be added only when a learner action can preserve that distinction.";
}

function renderMaterial(material) {
  selected = material;
  const { spec, fragment } = material;
  const boundary = evidenceBoundary(fragment);

  $("material-id").textContent = spec.id;
  $("material-title").textContent = spec.title;
  $("material-subtitle").textContent = spec.subtitle;
  $("material-question").textContent = spec.question;
  $("material-badge").textContent = spec.interactive ? "Practice-ready fragment" : "Inspect evidence";

  const supportedList = $("supported-list");
  supportedList.replaceChildren();
  const supported = boundary.supported.filter((item) => item.status !== "contested");
  for (const observation of supported) appendObservation(supportedList, fragment, observation);
  if (!supported.length) {
    const item = document.createElement("li");
    item.textContent = "No bounded source-supported observation is surfaced in this v0 view.";
    supportedList.append(item);
  }

  const uncertainList = $("uncertain-list");
  uncertainList.replaceChildren();
  for (const observation of boundary.unknown) appendUnknown(uncertainList, fragment, observation);
  for (const observation of boundary.contested) appendObservation(uncertainList, fragment, observation);
  for (const alternative of boundary.alternatives) appendAlternative(uncertainList, alternative);
  if (!boundary.unknown.length && !boundary.contested.length && !boundary.alternatives.length) {
    const item = document.createElement("li");
    item.textContent = "No unresolved item is recorded in this selective fixture.";
    uncertainList.append(item);
  }

  renderSources(fragment, boundary);
  renderPractice(material);

  for (const button of document.querySelectorAll(".material-choice")) {
    button.setAttribute("aria-pressed", String(button.dataset.materialId === spec.id));
  }
}

function renderMaterialList() {
  const list = $("material-list");
  list.replaceChildren();
  for (const material of materials) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "material-choice";
    button.dataset.materialId = material.spec.id;
    button.setAttribute("aria-pressed", "false");

    const title = document.createElement("strong");
    title.textContent = material.spec.title;
    const subtitle = document.createElement("span");
    subtitle.textContent = material.spec.subtitle;
    const action = document.createElement("small");
    action.textContent = material.spec.interactive ? "Play a real fretboard question" : "Inspect what is known / unknown";
    button.append(title, subtitle, action);
    button.addEventListener("click", () => renderMaterial(material));
    list.append(button);
  }
}

$("show-candidates").addEventListener("click", () => {
  if (selected?.spec.id === "JF-CAND-012") showCantStopCandidates(selected.fragment);
});

$("show-muted-stroke").addEventListener("click", () => {
  if (selected?.spec.id === "JF-CAND-012") showCantStopMutedStroke(selected.fragment);
});

$("hear-reference").addEventListener("click", async () => {
  if (selected?.spec.id !== "JF-CAND-012") return;
  try {
    await audio.play([{ at: 0, duration: 0.9, pitches: [parsePitch("D3")], gesture: "pluck", level: 0.14 }]);
    $("reflection-status").textContent = "Neutral D3 reference played. Match that pitch on both highlighted positions with your guitar.";
  } catch (error) {
    $("reflection-status").textContent = error instanceof Error ? error.message : "Audio reference could not play.";
  }
});

for (const button of document.querySelectorAll("[data-reflection]")) {
  button.addEventListener("click", () => {
    const choice = button.dataset.reflection;
    $("reflection-status").textContent = choice === "open-d"
      ? "Practice note: open D feels more useful to you here. Guitar Explorer is not claiming that this was the studio fingering."
      : choice === "a-five"
        ? "Practice note: A-string fret 5 feels more useful to you here. Guitar Explorer is not claiming that this was the studio fingering."
        : "No choice recorded. Keeping the alternatives unresolved is a valid result.";
    $("transfer-prompt").hidden = false;
  });
}

globalThis.addEventListener?.("pagehide", () => audio.stop());

try {
  materials = await loadInterestingMaterials();
  $("material-count").textContent = String(materials.length);
  renderMaterialList();
  renderMaterial(materials.find((item) => item.spec.id === "JF-CAND-012") ?? materials[0]);
} catch (error) {
  $("material-title").textContent = "Material could not load";
  $("material-question").textContent = error instanceof Error ? error.message : "Unknown material-loading error";
  $("supported-list").replaceChildren();
  $("uncertain-list").replaceChildren();
  $("source-list").replaceChildren();
  $("interpretation-list").replaceChildren();
  $("material-practice").hidden = true;
}
