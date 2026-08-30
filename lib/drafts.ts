import type { FilterId, TransitionId } from "./reelTemplates";
import type { Reel, ReelFrame } from "./reels";
import { uid } from "./seed";

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
  /** Optional: drafts saved before offsets existed simply start at 0. */
  voiceStart?: number;
  /** Silences the clips' own sound in the export. */
  clipsMuted?: boolean;
  updatedAt: number;
}

/** How many clips a draft has actual footage for. */
export function filledSlots(draft: ReelDraft): number {
  return draft.frames.filter((f) => f.mediaId || f.imageUrl).length;
}

export function draftLength(draft: ReelDraft): number {
  return draft.frames.reduce((n, f) => n + f.seconds, 0);
}

/**
 * Turns a published reel back into an editable draft.
 *
 * Unsharing shouldn't cost you the edit, so everything the editor needs comes
 * back: clips and their trims, look, caption, music and narration. The
 * exported video itself is dropped — sharing again re-renders it from these.
 */
export function draftFromReel(reel: Reel): ReelDraft | null {
  if (!reel.templateId || !reel.frames) return null;
  return {
    id: uid("draft"),
    templateId: reel.templateId,
    templateName: reel.templateName ?? reel.templateId,
    frames: reel.frames,
    filter: reel.filter ?? "none",
    transition: reel.transition ?? "fade",
    caption: reel.caption ?? "",
    musicMediaId: reel.musicMediaId,
    musicTitle: reel.musicTitle,
    musicVolume: 0.65,
    musicStart: 0,
    musicDuration: 0,
    songCredit: reel.songCredit,
    voiceMediaId: reel.voiceMediaId,
    voiceVolume: reel.voiceVolume ?? 1,
    voiceDuration: 0,
    voiceStart: reel.voiceStart ?? 0,
    clipsMuted: reel.clipsMuted,
    updatedAt: Date.now(),
  };
}
