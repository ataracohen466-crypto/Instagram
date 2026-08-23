"use client";

import { useState } from "react";
import { Film, Mic, Presentation } from "lucide-react";
import Studio, { StudioKind } from "@/components/Studio";
import { cx } from "@/lib/utils";

const OPTIONS: { kind: StudioKind; label: string; icon: typeof Mic }[] = [
  { kind: "podcast", label: "Podcast", icon: Mic },
  { kind: "slides", label: "Slides", icon: Presentation },
  { kind: "video", label: "Video", icon: Film },
];

/** The three Studio entry points, used on Home, the notes list and note detail. */
export default function StudioButtons({
  noteId,
  className,
}: {
  noteId: string;
  className?: string;
}) {
  const [open, setOpen] = useState<StudioKind | null>(null);

  return (
    <>
      <div className={cx("grid grid-cols-3 gap-2", className)}>
        {OPTIONS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => setOpen(kind)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-surface-line bg-white px-2 py-3 text-xs font-semibold text-ink-soft transition hover:bg-surface-sunk"
          >
            <Icon size={17} className="text-brand-600" />
            {label}
          </button>
        ))}
      </div>
      {open && (
        <Studio noteId={noteId} kind={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
