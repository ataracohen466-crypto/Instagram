"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { PostMedia } from "@/lib/types";
import { getMediaUrl } from "@/lib/media";
import { photoUrl } from "@/lib/seed";
import Photo from "./Photo";

/**
 * A post's slides, swiped horizontally.
 *
 * Paging is native scroll-snap rather than a JS drag handler: it keeps the
 * momentum and rubber-banding a phone user expects, and leaves vertical feed
 * scrolling untouched.
 */

function SlideMedia({
  slide,
  active,
  muted,
}: {
  slide: PostMedia;
  active: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(slide.url ?? null);

  useEffect(() => {
    let cancelled = false;
    if (slide.mediaId) {
      getMediaUrl(slide.mediaId).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    } else {
      setUrl(slide.url ?? null);
    }
    return () => {
      cancelled = true;
    };
  }, [slide.mediaId, slide.url]);

  // Only the slide you're looking at plays; the rest rewind and hold.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.play().catch(() => {
        /* autoplay can be refused until the user interacts */
      });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active, url]);

  if (slide.kind === "video") {
    return url ? (
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="h-full w-full bg-ig-bg" />
    );
  }

  return (
    <Photo
      src={url ?? photoUrl(slide.seed ?? slide.id, 1080)}
      seed={slide.seed ?? slide.id}
      className="h-full w-full object-cover"
    />
  );
}

export default function PostMediaCarousel({
  slides,
  onTap,
}: {
  slides: PostMedia[];
  onTap?: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  const multiple = slides.length > 1;
  const showsVideo = slides.some((s) => s.kind === "video");

  // Derive the active slide from scroll position rather than tracking taps,
  // so a flick that lands between slides still reports the one that settled.
  function onScroll() {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === next ? prev : next));
  }

  return (
    <div className="relative aspect-square w-full select-none bg-ig-bg">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onClick={onTap}
        className={`no-scrollbar flex h-full w-full ${
          multiple ? "snap-x snap-mandatory overflow-x-auto" : "overflow-hidden"
        }`}
      >
        {slides.map((slide, i) => (
          <div key={slide.id} className="h-full w-full shrink-0 snap-center">
            <SlideMedia slide={slide} active={i === index} muted={muted} />
          </div>
        ))}
      </div>

      {multiple && (
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">
          {index + 1}/{slides.length}
        </span>
      )}

      {showsVideo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((v) => !v);
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      {multiple && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {slides.map((slide, i) => (
            <span
              key={slide.id}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-ig-blue" : "bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
