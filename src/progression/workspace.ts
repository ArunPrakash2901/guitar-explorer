import { buildScale } from "../engine/core/collections.js";
import type { Scale } from "../engine/core/types.js";
import { MusicError } from "../engine/core/errors.js";
import { generateProgression, listProgressionChoices } from "./generator.js";
import type { GeneratedProgression, ProgressionRequest, ProgressionResult, ProgressionSlot } from "./generator.js";
import { getPlayableVoicings } from "./voicings.js";
import type { GuitarVoicing } from "./voicings.js";

export type WorkspaceCard = Readonly<{
  slot: ProgressionSlot;
  voicings: readonly GuitarVoicing[];
  voicingIndex: number;
}>;

export type ProgressionWorkspace = Readonly<{
  context: Pick<GeneratedProgression, "tonic" | "mode" | "seed" | "selection">;
  scale: Scale;
  cards: readonly WorkspaceCard[];
}>;

type WorkspaceResult = Readonly<{ ok: true; data: ProgressionWorkspace }> | Extract<ProgressionResult, { ok: false }>;

export type VoicingFilter = "all" | "open" | "barre";

export function matchesVoicingFilter(voicing: GuitarVoicing, filter: VoicingFilter): boolean {
  return filter === "all" || (filter === "open" ? voicing.shapeFamily === "open" : voicing.shapeFamily !== "open");
}

export function generateWorkspace(
  request: Omit<ProgressionRequest, "lockedSlots"> & { shapeFilter?: VoicingFilter },
  previous?: ProgressionWorkspace,
): WorkspaceResult {
  const lockedSlots = previous?.cards.flatMap(({ slot }) => slot.isLocked
    ? [{ slotIndex: slot.slotIndex, root: slot.chord.root, chordId: slot.chord.chordId }]
    : []) ?? [];
  const { shapeFilter, ...generation } = request;
  let allowedDegrees = generation.allowedDegrees;
  if (shapeFilter) {
    try {
      allowedDegrees = listProgressionChoices(generation.tonic, generation.mode)
        .filter(({ degree, chord }) => (allowedDegrees === undefined || allowedDegrees.includes(degree))
          && getPlayableVoicings(chord).some((voicing) => matchesVoicingFilter(voicing, shapeFilter)))
        .map(({ degree }) => degree);
    } catch (problem) {
      if (!(problem instanceof MusicError)) throw problem;
      // The generator reports the same invalid context through its public result.
    }
  }
  const previousDegrees = generation.previousDegrees ?? (shapeFilter && previous &&
    previous.context.mode === generation.mode && previous.context.tonic.letter === generation.tonic?.letter &&
    previous.context.tonic.accidental === generation.tonic.accidental
    ? previous.cards.map(({ slot }) => slot.degree) : undefined);
  const result = generateProgression({
    ...generation, lockedSlots,
    ...(allowedDegrees === undefined ? {} : { allowedDegrees }),
    ...(previousDegrees === undefined ? {} : { previousDegrees }),
  });
  if (!result.ok) return result;

  const { slots, ...context } = result.data;
  const scale = buildScale({ tonic: context.tonic, scaleId: context.mode });
  const cards = slots.map((slot): WorkspaceCard => {
    const voicings = getPlayableVoicings(slot.chord);
    const prior = previous?.cards[slot.slotIndex];
    const previousId = prior?.voicings[prior.voicingIndex]?.id;
    const voicingIndex = Math.max(0, voicings.findIndex(({ id }) => id === previousId));
    return { slot, voicings, voicingIndex };
  });
  return { ok: true, data: { context, scale, cards } };
}

export function toggleChordLock(workspace: ProgressionWorkspace, slotIndex: number): ProgressionWorkspace {
  return {
    ...workspace,
    cards: workspace.cards.map((card) => card.slot.slotIndex === slotIndex
      ? { ...card, slot: { ...card.slot, isLocked: !card.slot.isLocked } }
      : card),
  };
}

export function cycleChordVoicing(workspace: ProgressionWorkspace, slotIndex: number, direction: -1 | 1): ProgressionWorkspace {
  return {
    ...workspace,
    cards: workspace.cards.map((card) => {
      const count = card.voicings.length;
      if (card.slot.slotIndex !== slotIndex || count < 2) return card;
      return { ...card, voicingIndex: (card.voicingIndex + direction + count) % count };
    }),
  };
}


/**
 * An intentional chord substitution becomes a hard lock. Existing generation
 * can therefore preserve it across regenerate without new engine state rules.
 * All chord facts are imported from the same choices as the generator.
 */
export function replaceWorkspaceChord(
  workspace: ProgressionWorkspace, slotIndex: number, degree: number,
): ProgressionWorkspace {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= workspace.cards.length) {
    throw new RangeError("Chord position must be a valid card index");
  }
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
    throw new RangeError("A chord replacement must be scale degree 1 through 7");
  }
  const selected = listProgressionChoices(workspace.context.tonic, workspace.context.mode)[degree - 1]!;
  const current = workspace.cards[slotIndex]!;
  const voicings = getPlayableVoicings(selected.chord);
  const previousId = current.voicings[current.voicingIndex]?.id;
  const voicingIndex = Math.max(0, voicings.findIndex(({ id }) => id === previousId));
  const replacement: WorkspaceCard = {
    slot: {
      slotIndex,
      degree: selected.degree,
      chord: selected.chord,
      symbol: selected.symbol,
      romanNumeral: selected.romanNumeral,
      isLocked: true,
    },
    voicings,
    voicingIndex,
  };
  return { ...workspace, cards: workspace.cards.map((card, index) =>
    index === slotIndex ? replacement : card) };
}
