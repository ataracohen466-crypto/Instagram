import type { FilterId, TransitionId } from "./reelTemplates";
import type { ReelFrame } from "./reels";

/**
 * A reel saved mid-edit.
 *
 * Clips, music and voiceover are referenced by media-store id rather than
 * copied in, so a draft stays small no matter how much footage it points at —
 * and reopening one reuses the same encrypted blobs.
 */
export interface ReelDraft {
  id: string;
  templateId: string;
  templateName: string;
  frames: ReelFrame[];
  filter: FilterId;
  transition: TransitionId;
  caption: string;
  musicMediaId?: string;
  musicTitle?: string;
  musicVolume: number;
  musicStart: number;
  musicDuration: number;
  songCredit?: string;
  voiceMediaId?: string;
  voiceVolume: number;
  voiceDuration: number;
  updatedAt: number;
}

/** How many clips a draft has actual footage for. */
export function filledSlots(draft: ReelDraft): number {
  return draft.frames.filter((f) => f.mediaId || f.imageUrl).length;
}

export function draftLength(draft: ReelDraft): number {
  return draft.frames.reduce((n, f) => n + f.seconds, 0);
}
