import { STANDARD_FRETBOARD, formatNote } from "/engine/index.js";
import { createFretboard } from "/fretboard-view.mjs";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

function physicalStrings() {
  return STANDARD_FRETBOARD.tuning.openStrings
    .map(({ note }, index) => ({
      index,
      label: index === 5 ? "e" : formatNote(note),
    }))
    .reverse();
}

const board = createFretboard($("desk-board"));
board.update({
  strings: physicalStrings(),
  activeStringIndices: STANDARD_FRETBOARD.tuning.openStrings.map((_, index) => index),
  fretRange: { minFret: 0, maxFret: 12 },
  positions: [],
  connections: [],
  label: "Standard-tuning guitar fretboard, open strings through fret 12. No musical answer is revealed on this Explore desk.",
});

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

const inlayToggle = $("inlay-toggle");
inlayToggle.addEventListener("click", () => {
  const next = inlayToggle.getAttribute("aria-pressed") !== "true";
  inlayToggle.setAttribute("aria-pressed", String(next));
  $("desk-board").classList.toggle("hide-inlays", !next);
});

$("my-music").addEventListener("click", () => {
  const status = $("material-status");
  status.textContent = "My music and Style Pack work are parked for now. Guitar Explorer is prioritising the core Practice and Apply workflows first.";
  status.focus();
});

$("help-button").addEventListener("click", () => {
  const status = $("material-status");
  status.textContent = "Explore relationships, practise them with your guitar, then use Apply to build accompaniment and move toward recording, looping and improvisation.";
  status.focus();
});
