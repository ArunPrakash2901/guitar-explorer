import { parseNote, parsePitch } from "../engine/core/pitch.js";
import type { ChordId, HarmonicContext } from "../engine/core/types.js";
import { musicQueries } from "../engine/query/index.js";
import { validateResearchFragment } from "./contract.js";
import type { Derivation, ResearchFragment } from "./types.js";

/** Conditional computation only: the supplied context remains an assumption. */
export function derivePosition(
  input: ResearchFragment, observationId: string, assumptionIds: readonly string[], id: string,
): Derivation {
  const fragment = validateResearchFragment(input);
  const observation = fragment.observations.find((o) => o.id === observationId);
  if (observation?.kind !== "physical_position" || observation.value.stringIndex === null || observation.value.fret === null) {
    throw new TypeError("A known physical-position observation is required");
  }
  const selected = assumptionIds.map((ref) => {
    const assumption = fragment.assumptions.find((a) => a.id === ref);
    if (!assumption) throw new TypeError(`Unknown analytical assumption ${ref}`);
    return assumption;
  });
  if (!selected.some((a) => a.kind === "tuning" && a.value === "standard")) {
    throw new TypeError("The standard-tuning assumption is required");
  }
  const key = selected.find((a) => a.kind === "key")?.value as { tonic: string; mode: "major" | "minor" } | undefined;
  const chord = selected.find((a) => a.kind === "chord")?.value as { root: string; chordId: ChordId } | undefined;
  const context: HarmonicContext = {
    ...(key ? { key: { tonic: parseNote(key.tonic), mode: key.mode } } : {}),
    ...(chord ? { currentChord: { root: parseNote(chord.root), chordId: chord.chordId } } : {}),
  };
  const result = musicQueries.getNoteAtFret({
    position: { stringIndex: observation.value.stringIndex, fret: observation.value.fret },
    context,
  });
  if (!result.ok) throw new TypeError(result.error.message);
  return {
    id, observationIds: [observationId], assumptionIds: [...assumptionIds],
    engineQuery: "getNoteAtFret", result: JSON.parse(JSON.stringify(result.data)),
  };
}

/** No interval arithmetic outside the engine; both source pitches stay attributable. */
export function deriveInterval(
  input: ResearchFragment, fromId: string, toId: string, assumptionIds: readonly string[], id: string,
): Derivation {
  const fragment = validateResearchFragment(input);
  const from = fragment.observations.find((o) => o.id === fromId);
  const to = fragment.observations.find((o) => o.id === toId);
  if (from?.kind !== "sounding_pitch" || to?.kind !== "sounding_pitch" || !from.value.pitch || !to.value.pitch) {
    throw new TypeError("Two known sounding-pitch observations are required");
  }
  for (const ref of assumptionIds) if (!fragment.assumptions.some((a) => a.id === ref)) throw new TypeError(`Unknown assumption ${ref}`);
  const result = musicQueries.getInterval({ from: parsePitch(from.value.pitch), to: parsePitch(to.value.pitch) });
  if (!result.ok) throw new TypeError(result.error.message);
  return {
    id, observationIds: [fromId, toId], assumptionIds: [...assumptionIds],
    engineQuery: "getInterval", result: JSON.parse(JSON.stringify(result.data)),
  };
}
