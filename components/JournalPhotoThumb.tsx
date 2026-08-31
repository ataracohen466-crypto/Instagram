"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getImage } from "@/lib/db";

export function PhotoThumb({ id, onRemove, size = 72 }: { id: string; onRemove?: () => void; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getImage(id).then((d) => alive && setSrc(d ?? null));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="relative shrink-0 overflow-hidden rounded-xl bg-surface-raised" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full shimmer" />
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
