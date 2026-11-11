import { buildScale } from "../engine/core/collections.js";
import type { Scale } from "../engine/core/types.js";
import { generateProgression } from "./generator.js";
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

export function generateWorkspace(
  request: Omit<ProgressionRequest, "lockedSlots">,
  previous?: ProgressionWorkspace,
): WorkspaceResult {
  const lockedSlots = previous?.cards.flatMap(({ slot }) => slot.isLocked
    ? [{ slotIndex: slot.slotIndex, root: slot.chord.root, chordId: slot.chord.chordId }]
    : []) ?? [];
  const result = generateProgression({ ...request, lockedSlots });
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
