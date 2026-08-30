"use client";

import { Volume2, VolumeX } from "lucide-react";

/**
 * "Mute the sound on the video I'm posting."
 *
 * This is a property of the thing you post, not of the person watching it:
 * the app-wide speaker is a live preference a viewer flips whenever they
 * like, whereas this rides along with the video and keeps it silent for
 * everyone, every time.
 */
export default function MuteVideoToggle({
  muted,
  onChange,
  hint,
}: {
  muted: boolean;
  onChange: (muted: boolean) => void;
  /** What the silence means here — the surfaces differ enough to say. */
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-ig-border p-3">
      <button
        type="button"
        onClick={() => onChange(!muted)}
        aria-pressed={muted}
        className="flex w-full items-center gap-2 text-left"
      >
        {muted ? (
          <VolumeX size={15} className="shrink-0 text-ig-blue" />
        ) : (
          <Volume2 size={15} className="shrink-0 text-ig-muted" />
        )}
        <span className="min-w-0 flex-1 text-[13px] font-semibold">
          Mute video sound
        </span>
        <span
          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
            muted ? "bg-ig-blue" : "bg-[#d6d6d6]"
          }`}
        >
          <span
            className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
              muted ? "left-[18px]" : "left-[2px]"
            }`}
          />
        </span>
      </button>
      <p className="mt-1.5 text-[11px] leading-4 text-ig-muted">{hint}</p>
    </div>
  );
}
