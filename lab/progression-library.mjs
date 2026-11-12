import { formatNote, parseNote } from "./engine/index.js";
import { CHORD_SUFFIXES, MOODS, PROGRESSION_COLORS, PROGRESSION_LENGTHS, STYLES } from "./progression/generator.js";
import { CAGED_FAMILIES } from "./progression/caged.js";
import { generateWorkspace, replaceWorkspaceChord } from "./progression/workspace.js";
import { GUITAR_TONES } from "./progression-audio.mjs";
import { DEFAULT_RHYTHM_EDIT, getGrooveGrid, groovesForMeter, validDrumParts } from "./progression-grooves.mjs";
import { METERS, patternsForMeter } from "./progression-rhythm.mjs";
import { MODE_CHOICES, TONIC_CHOICES } from "./progression-selection.mjs";

export const FAVORITES_KEY = "guitar-explorer-progression-favorites-v1";
export const SHARE_PREFIX = "#p=";
const VERSION = 2;
const MAX_TOKEN_LENGTH = 3400;
const MAX_FAVORITES = 24;
export const MAX_FAVORITE_NAME = 48;
export const MAX_COLLECTION_NAME = 32;
export const DEFAULT_EXPLORER = Object.freeze({
  keyDegree: 1, diagramLabels: "fingers", diagramHighlight: "root",
  fretLabels: "degrees", fretHighlights: "root", scaleMode: "once",
});
const modeNames = {
  major: "major", naturalMinor: "natural minor", dorian: "Dorian", phrygian: "Phrygian",
  lydian: "Lydian", mixolydian: "Mixolydian", locrian: "Locrian",
};
const exactInteger = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const bool = (value) => typeof value === "boolean";

function validateSnapshot(input) {
  if (!input || typeof input !== "object") throw new Error("Missing progression state.");
  const { v, k, m, s, c, p } = input;
  if ((v !== 1 && v !== VERSION) || !TONIC_CHOICES.includes(k) || !MODE_CHOICES.includes(m) ||
      !exactInteger(s, 0, 0xffffffff) || !Array.isArray(c) || !PROGRESSION_LENGTHS.includes(c.length) || !p || typeof p !== "object") {
    throw new Error("The progression link has an unsupported version or musical context.");
  }
  const cards = c.map((card) => {
    if (!Array.isArray(card) || card.length !== 4) throw new Error("The progression contains an invalid chord.");
    const [degree, quality, grip, locked] = card;
    if (!exactInteger(degree, 1, 7) || typeof quality !== "string" || !Object.hasOwn(CHORD_SUFFIXES, quality) ||
      typeof grip !== "string" || !/^[A-G][b#]{0,4}:[a-zA-Z0-9]+:[a-z-]+:(?:x|[0-9]{1,2})(?:-(?:x|[0-9]{1,2})){5}$/.test(grip) ||
      !bool(locked)) throw new Error("The progression contains an invalid chord or grip.");
    return [degree, quality, grip, locked];
  });
  const { keyAuto, modeAuto, style, mood, color, shape, bpm, meter, pattern, groove, tone,
    guitar, drums, guitarMuted, drumsMuted, view, position, layer, selected } = p;
  if (!bool(keyAuto) || !bool(modeAuto) || !STYLES.includes(style) || !MOODS.includes(mood) ||
    !PROGRESSION_COLORS.includes(color) || !["all", "open", "barre", "triad"].includes(shape) ||
    !exactInteger(bpm, 50, 180) || typeof meter !== "string" || !Object.hasOwn(METERS, meter) ||
    !patternsForMeter(meter).some(({ id }) => id === pattern) || !groovesForMeter(meter).some(({ id }) => id === groove) ||
    !GUITAR_TONES.includes(tone) || !exactInteger(guitar, 0, 100) || !exactInteger(drums, 0, 100) ||
    !bool(guitarMuted) || !bool(drumsMuted) || !["scale", "chords", "key"].includes(view) ||
    !["full", ...CAGED_FAMILIES].includes(position) || !["context", "majorPentatonic", "minorPentatonic"].includes(layer) ||
    !exactInteger(selected, 0, cards.length - 1)) throw new Error("The progression contains invalid settings.");
  const explorer = v === 1 ? DEFAULT_EXPLORER : p.explorer ?? DEFAULT_EXPLORER;
  const rhythm = v === 1 ? DEFAULT_RHYTHM_EDIT : p.rhythm ?? DEFAULT_RHYTHM_EDIT;
  const { keyDegree, diagramLabels, diagramHighlight, fretLabels, fretHighlights, scaleMode } = explorer;
  if (!exactInteger(keyDegree, 1, 7) || !["fingers", "notes", "intervals", "none"].includes(diagramLabels) ||
      !["none", "root", "triad"].includes(diagramHighlight) || !["degrees", "notes", "intervals"].includes(fretLabels) ||
      !["root", "triad", "modal"].includes(fretHighlights) || !["once", "loop", "all"].includes(scaleMode)) {
    throw new Error("The progression contains invalid explorer settings.");
  }
  const { parts, fill, click } = rhythm;
  if (!bool(fill) || !bool(click) ||
      (parts !== null && (groove === "off" || !validDrumParts(parts, getGrooveGrid(meter, groove).steps)))) {
    throw new Error("The progression contains invalid drum settings.");
  }
  return { v: VERSION, k, m, s, c: cards, p: {
    keyAuto, modeAuto, style, mood, color, shape, bpm, meter, pattern, groove, tone,
    guitar, drums, guitarMuted, drumsMuted, view, position, layer, selected,
    explorer: { keyDegree, diagramLabels, diagramHighlight, fretLabels, fretHighlights, scaleMode },
    rhythm: { parts: parts && [...parts], fill, click },
  } };
}

export function snapshotProgression(workspace, preferences) {
  const { context, cards } = workspace;
  return validateSnapshot({
    v: VERSION, k: formatNote(context.tonic), m: context.mode, s: context.seed, p: preferences,
    c: cards.map(({ slot, voicings, voicingIndex }) =>
      [slot.degree, slot.chord.chordId, voicings[voicingIndex]?.id, slot.isLocked]),
  });
}

export function encodeProgression(snapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(validateSnapshot(snapshot)));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeProgression(token) {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("The progression link has an invalid format.");
  }
  let input;
  try {
    const bytes = Uint8Array.from(atob(token.replaceAll("-", "+").replaceAll("_", "/")), (letter) => letter.charCodeAt(0));
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("The progression link could not be decoded.");
  }
  return validateSnapshot(input);
}

export function restoreProgression(snapshot) {
  const { k, m, s, c, p } = validateSnapshot(snapshot);
  const result = generateWorkspace({ tonic: parseNote(k), mode: m, seed: s, length: c.length });
  if (!result.ok) throw new Error(result.error.message);
  let workspace = result.data;
  for (const [index, [degree, quality]] of c.entries()) {
    workspace = replaceWorkspaceChord(workspace, index, degree, quality);
  }
  const cards = workspace.cards.map((card, index) => {
    const [, , grip, isLocked] = c[index];
    const voicingIndex = card.voicings.findIndex(({ id }) => id === grip);
    if (voicingIndex < 0) throw new Error("A saved guitar grip is unavailable in this version.");
    return { ...card, voicingIndex, slot: { ...card.slot, isLocked } };
  });
  return { workspace: { ...workspace, cards }, preferences: p };
}

export function describeProgression(snapshot) {
  return snapshot.k.replaceAll("#", "♯").replaceAll("b", "♭") + " " + modeNames[snapshot.m] + " · " + snapshot.c.length + " chords";
}

export function progressionText(workspace, preferences) {
  const { tonic, mode } = workspace.context;
  const pretty = (note) => note.replaceAll("#", "♯").replaceAll("b", "♭");
  const pulse = preferences.meter === "6/8" ? "dotted-quarter" : "quarter-note";
  const header = pretty(formatNote(tonic)) + " " + modeNames[mode] + " · " + preferences.meter +
    " · " + preferences.bpm + " " + pulse + " BPM";
  const chords = workspace.cards.map(({ slot }) =>
    slot.romanNumeral + " " + pretty(slot.symbol) + (slot.isLocked ? " (locked)" : "")).join(" | ");
  return [header, chords].join("\n");
}

export function readFavorites(storage) {
  const raw = storage.getItem(FAVORITES_KEY);
  if (!raw || raw.length > MAX_FAVORITES * (MAX_TOKEN_LENGTH + 360)) return [];
  let values;
  try { values = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(values)) return [];
  const tokens = [];
  for (const stored of values.slice(0, MAX_FAVORITES)) {
    try {
      const snapshot = decodeProgression(typeof stored === "string" ? stored : stored?.token);
      const token = encodeProgression(snapshot);
      if (!tokens.some((entry) => entry.token === token)) {
        tokens.push({ token, snapshot,
          name: validFavoriteLabel(stored?.name, MAX_FAVORITE_NAME) ?? "",
          collection: validFavoriteLabel(stored?.collection, MAX_COLLECTION_NAME) ?? "",
        });
      }
    } catch {
      // A malformed stored entry does not hide the other favorites.
    }
  }
  return tokens;
}

function validFavoriteLabel(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(text) ? text : null;
}

function writeFavorites(storage, entries) {
  storage.setItem(FAVORITES_KEY, JSON.stringify(entries.map(({ token, name, collection }) => ({ token, name, collection }))));
}

export function saveFavorite(storage, token) {
  const snapshot = decodeProgression(token);
  token = encodeProgression(snapshot);
  const entries = readFavorites(storage);
  const previous = entries.find((entry) => entry.token === token);
  if (!previous && entries.length >= MAX_FAVORITES) throw new Error("Delete a favorite before saving another.");
  writeFavorites(storage, [previous ?? { token, name: "", collection: "" }, ...entries.filter((entry) => entry.token !== token)]);
}

export function updateFavorite(storage, token, { name, collection }) {
  const newName = validFavoriteLabel(name, MAX_FAVORITE_NAME);
  const newCollection = validFavoriteLabel(collection, MAX_COLLECTION_NAME);
  if (newName === null || newCollection === null) throw new Error("Use a shorter favorite name or collection.");
  token = encodeProgression(decodeProgression(token));
  const entries = readFavorites(storage);
  const entry = entries.find((item) => item.token === token);
  if (!entry) throw new Error("This favorite is no longer saved.");
  entry.name = newName;
  entry.collection = newCollection;
  writeFavorites(storage, entries);
}

export function deleteFavorite(storage, token) {
  token = encodeProgression(decodeProgression(token));
  writeFavorites(storage, readFavorites(storage).filter((entry) => entry.token !== token));
}
