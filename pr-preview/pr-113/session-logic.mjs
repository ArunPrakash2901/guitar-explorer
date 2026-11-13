export const PRACTICAL_ROOTS = Object.freeze([
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
]);

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function randomIndex(length, rng) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("Cannot sample an empty collection");
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random source must return a finite value from 0 inclusive to 1 exclusive");
  }
  return Math.floor(value * length);
}

function choose(values, rng) {
  return values[randomIndex(values.length, rng)];
}

function sameRole(left, right) {
  return left.degree === right.degree && left.alteration === right.alteration;
}

function allEntries(catalog) {
  return catalog.flatMap((family) => family.chords);
}

function entryFor(catalog, chordId) {
  const entry = allEntries(catalog).find((candidate) => candidate.id === chordId);
  if (!entry) throw new RangeError(`Chord ${chordId} is not present in the catalogue`);
  return entry;
}

function familyFor(catalog, familyId) {
  const family = catalog.find((candidate) => candidate.id === familyId);
  if (!family) throw new RangeError(`Chord family ${familyId} is not present in the catalogue`);
  return family;
}

export function degreeLabel(tone) {
  const count = Math.abs(tone.alteration);
  const accidental = tone.alteration > 0 ? "♯".repeat(count) : tone.alteration < 0 ? "♭".repeat(count) : "";
  return `${accidental}${tone.degree}`;
}

export function formulaLabel(formula) {
  return formula.map(degreeLabel).join(" · ");
}

export function createSelection(familyId) {
  return freeze({ familyId, chordIds: [] });
}

export function selectFamily(_selection, familyId) {
  return createSelection(familyId);
}

export function toggleChordSelection(selection, chordId, selected) {
  const ids = selection.chordIds.filter((id) => id !== chordId);
  if (selected) ids.push(chordId);
  return freeze({ familyId: selection.familyId, chordIds: ids });
}

export function selectAllInFamily(family) {
  return freeze({ familyId: family.id, chordIds: family.chords.map(({ id }) => id) });
}

export function windowForFret(fret, maxFret = 12, width = 5) {
  if (!Number.isInteger(fret) || !Number.isInteger(maxFret) || !Number.isInteger(width)) {
    throw new TypeError("Fret window values must be integers");
  }
  if (fret < 0 || fret > maxFret || maxFret < 0 || width < 1) {
    throw new RangeError("Fret window values are outside the board");
  }
  const actualWidth = Math.min(width, maxFret + 1);
  const minFret = Math.min(Math.max(0, fret - Math.floor(actualWidth / 2)), maxFret - actualWidth + 1);
  return freeze({ minFret, maxFret: minFret + actualWidth - 1 });
}

function focusToneFor(chord, familyId, rng) {
  const nonRoot = chord.tones.filter((tone) => tone.degree !== 1);
  const compound = nonRoot.filter((tone) => tone.degree > 7);
  if (compound.length) return choose(compound, rng);
  if (familyId === "alteredDominant") {
    const altered = nonRoot.filter((tone) => tone.alteration !== 0 && tone.degree >= 5);
    if (altered.length) return choose(altered, rng);
  }
  return choose(nonRoot, rng);
}

export function reconstructionRoles(chord, focusTone) {
  if (chord.tones.length <= 4) return Object.freeze([...chord.tones]);

  const selected = [];
  const add = (tone) => {
    if (tone && !selected.some((candidate) => sameRole(candidate, tone))) selected.push(tone);
  };
  add(chord.tones.find((tone) => tone.degree === 1));
  add(chord.tones.find((tone) => [2, 3, 4].includes(tone.degree)));
  add(chord.tones.find((tone) => tone.degree === 7));
  add(chord.tones.find((tone) => tone.degree === 6));
  add(focusTone);
  add(chord.tones.find((tone) => tone.alteration !== 0 && tone.degree >= 5));
  for (const tone of chord.tones) {
    if (selected.length >= 4) break;
    add(tone);
  }
  if (focusTone.degree > 7 && !selected.some((tone) => sameRole(tone, focusTone))) {
    selected[selected.length - 1] = focusTone;
  }
  return Object.freeze(selected.slice(0, 4));
}

function locationTask({ rootName, chordId, tone, findLocations, rng, maxFret, stringIndices }) {
  const locations = findLocations({ rootName, chordId, tone, stringIndices });
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new RangeError(`No playable location for ${rootName} ${chordId} role ${degreeLabel(tone)}`);
  }
  const plannedLocation = choose(locations, rng);
  return freeze({
    tone,
    plannedLocation,
    stringIndex: plannedLocation.position.stringIndex,
    fretWindow: windowForFret(plannedLocation.position.fret, maxFret),
  });
}

function contrastFor(selection, primaryChordId, rng) {
  const selectedAlternatives = selection.chordIds.filter((id) => id !== primaryChordId);
  if (selectedAlternatives.length) return choose(selectedAlternatives, rng);
  if (["sus2", "sus4"].includes(primaryChordId)) return "major";
  if (["add9", "minorAdd9"].includes(primaryChordId)) return "sus2";
  return null;
}

export function createSessionPlan({
  catalog,
  selection,
  buildChord,
  findLocations,
  rng = Math.random,
  roots = PRACTICAL_ROOTS,
  maxFret = 12,
  previousPlan = null,
}) {
  const family = familyFor(catalog, selection.familyId);
  if (!Array.isArray(selection.chordIds) || selection.chordIds.length === 0) {
    throw new RangeError("Select at least one chord quality");
  }
  const allowed = new Set(family.chords.map(({ id }) => id));
  if (selection.chordIds.some((id) => !allowed.has(id))) {
    throw new RangeError("Every selected chord must belong to the selected family");
  }

  const primaryChordId = choose(selection.chordIds, rng);
  const rootCandidates = previousPlan && roots.length > 1
    ? roots.filter((root) => root !== previousPlan.primary.rootName)
    : roots;
  const rootName = choose(rootCandidates, rng);
  const chord = buildChord(rootName, primaryChordId);
  const entry = entryFor(catalog, primaryChordId);
  const focusTone = focusToneFor(chord, family.id, rng);
  const focusTask = locationTask({ rootName, chordId: primaryChordId, tone: focusTone, findLocations, rng, maxFret });
  const rootTask = locationTask({ rootName, chordId: primaryChordId, tone: chord.tones[0], findLocations, rng, maxFret });

  const secondaryCandidates = chord.tones.length <= 4
    ? chord.tones.filter((tone) => tone.degree !== 1 && !sameRole(tone, focusTone))
    : [];
  const secondaryTone = secondaryCandidates.length ? choose(secondaryCandidates, rng) : null;
  const secondaryTask = secondaryTone
    ? locationTask({ rootName, chordId: primaryChordId, tone: secondaryTone, findLocations, rng, maxFret })
    : null;

  const mapStringIndex = focusTask.stringIndex;
  const reconstruction = reconstructionRoles(chord, focusTone).map((tone) => locationTask({
    rootName,
    chordId: primaryChordId,
    tone,
    findLocations,
    rng,
    maxFret,
    stringIndices: [mapStringIndex],
  }));

  const transferRoots = roots.filter((root) => root !== rootName);
  const transferRootName = choose(transferRoots.length ? transferRoots : roots, rng);
  const transferChord = buildChord(transferRootName, primaryChordId);
  const transferTone = transferChord.tones.find((tone) => sameRole(tone, focusTone));
  if (!transferTone) throw new Error("Transfer chord does not preserve the selected formula role");
  const transferTask = locationTask({
    rootName: transferRootName,
    chordId: primaryChordId,
    tone: transferTone,
    findLocations,
    rng,
    maxFret,
  });
  const transferRootTask = locationTask({
    rootName: transferRootName,
    chordId: primaryChordId,
    tone: transferChord.tones[0],
    findLocations,
    rng,
    maxFret,
  });

  return freeze({
    selection: { familyId: selection.familyId, chordIds: [...selection.chordIds] },
    primary: {
      rootName,
      chordId: primaryChordId,
      familyId: family.id,
      entry,
      chord,
      rootTask,
      focusTask,
      secondaryTask,
      reconstruction,
      mapStringIndex,
    },
    transfer: {
      rootName: transferRootName,
      chordId: primaryChordId,
      entry,
      chord: transferChord,
      rootTask: transferRootTask,
      focusTask: transferTask,
    },
    contrastChordId: contrastFor(selection, primaryChordId, rng),
  });
}

export function resetSessionState(state) {
  state.stageIndex = 0;
  state.mapRoleIndex = 0;
  state.savedMap = [];
  state.timerRemaining = 35;
  state.timerDeadlineMs = null;
  state.timerPhase = "READY";
  state.timerStarted = false;
  state.timerFinished = false;
  state.reflection = null;
  state.selected = null;
  state.checked = false;
  state.hintLevel = 0;
  state.lastWrong = null;
  state.theoryRevealed = false;
  return state;
}

export function reflectionNextHidden(reflection) {
  return reflection === null;
}

export function timerSnapshot(deadlineMs, nowMs, totalSeconds = 35, blockSeconds = 5) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) {
    throw new TypeError("timerSnapshot requires finite deadline and current times");
  }
  if (totalSeconds <= 0 || blockSeconds <= 0) {
    throw new RangeError("timerSnapshot requires positive durations");
  }

  const totalMs = totalSeconds * 1000;
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const remaining = Math.ceil(remainingMs / 1000);
  const finished = remainingMs === 0;
  const elapsedMs = Math.max(0, totalMs - remainingMs);
  const blockIndex = Math.floor(elapsedMs / (blockSeconds * 1000));
  const phase = finished ? "DONE" : blockIndex % 2 === 0 ? "PLAY" : "REST";

  return { remaining, finished, phase };
}
