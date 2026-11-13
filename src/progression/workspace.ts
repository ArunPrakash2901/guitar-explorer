import { buildScale } from "../engine/core/collections.js";
import type { Scale } from "../engine/core/types.js";
import type { ChordId } from "../engine/core/types.js";
import { generateProgression, listProgressionChoices, listProgressionVariants } from "./generator.js";
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

export type VoicingFilter = "all" | "open" | "barre" | "triad";

export function matchesVoicingFilter(voicing: GuitarVoicing, filter: VoicingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "barre") return voicing.shapeFamily === "e-barre" || voicing.shapeFamily === "a-barre";
  return voicing.shapeFamily === filter;
}

export function generateWorkspace(
  request: Omit<ProgressionRequest, "lockedSlots"> & { shapeFilter?: VoicingFilter },
  previous?: ProgressionWorkspace,
): WorkspaceResult {
  const lockedSlots = previous?.cards.flatMap(({ slot }) => slot.isLocked
    ? [{ slotIndex: slot.slotIndex, root: slot.chord.root, chordId: slot.chord.chordId }]
    : []) ?? [];
  const { shapeFilter, ...generation } = request;
  const playableByChord = new Map<string, boolean>();
  const isChordPlayable: ProgressionRequest["isChordPlayable"] = (chord) => {
    const key = chord.tones[0]!.pitchClass + ":" + chord.chordId;
    if (!playableByChord.has(key)) {
      playableByChord.set(key, getPlayableVoicings(chord).some((grip) => matchesVoicingFilter(grip, shapeFilter!)));
    }
    return playableByChord.get(key)!;
  };
  const previousDegrees = generation.previousDegrees ?? (shapeFilter && previous &&
    previous.context.mode === generation.mode && previous.context.tonic.letter === generation.tonic?.letter &&
    previous.context.tonic.accidental === generation.tonic.accidental
    ? previous.cards.map(({ slot }) => slot.degree) : undefined);
  const result = generateProgression({
    ...generation, lockedSlots,
    ...(shapeFilter ? { isChordPlayable } : {}),
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
  workspace: ProgressionWorkspace, slotIndex: number, degree: number, chordId?: ChordId,
): ProgressionWorkspace {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= workspace.cards.length) {
    throw new RangeError("Chord position must be a valid card index");
  }
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
    throw new RangeError("A chord replacement must be scale degree 1 through 7");
  }
  const { tonic, mode } = workspace.context;
  const selected = chordId === undefined ? listProgressionChoices(tonic, mode).find((choice) => choice.degree === degree)
    : listProgressionVariants(tonic, mode).find((choice) => choice.degree === degree && choice.chord.chordId === chordId);
  if (!selected) throw new RangeError("This chord quality is outside the selected key and mode");
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


/**
 * Move a card to a new musical slot without changing its chord, voicing or
 * lock identity. Numbering follows its new position, so hard locks continue
 * to apply to the intended chord after reordering and regeneration.
 */
export function moveWorkspaceChord(
  workspace: ProgressionWorkspace, fromIndex: number, toIndex: number,
): ProgressionWorkspace {
  const count = workspace.cards.length;
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
      fromIndex < 0 || toIndex < 0 || fromIndex >= count || toIndex >= count) {
    throw new RangeError("Chord reorder positions must be valid indices");
  }
  if (fromIndex === toIndex) return workspace;
  const cards = [...workspace.cards];
  const [moved] = cards.splice(fromIndex, 1);
  cards.splice(toIndex, 0, moved!);
  return {
    ...workspace,
    cards: cards.map((card, slotIndex) => ({
      ...card,
      slot: { ...card.slot, slotIndex },
    })),
  };
}
