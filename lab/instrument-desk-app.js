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
  else if (matchMedia?.("(prefers-color-scheme: dark)")?.matches) initialTheme = "dark";
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
  status.textContent = "My music is the next material-entry step. The Frusciante research contract is under review, so this Desk does not pretend song import is available yet.";
  status.focus();
});

$("help-button").addEventListener("click", () => {
  const status = $("material-status");
  status.textContent = "Choose a musical question below. Each card opens an already working Guitar Explorer experience; your guitar remains the main instrument.";
  status.focus();
});
