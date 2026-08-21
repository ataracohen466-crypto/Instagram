"use client";

import { useEffect, useRef, useState } from "react";
import { ReelFrame } from "@/lib/reels";
import { getMediaUrl } from "@/lib/media";
import { photoUrl } from "@/lib/seed";
import Photo from "./Photo";

/**
 * Renders one reel clip. Video clips play through a real <video>; photo
 * clips (and reels made before video existed) fall back to an image.
 */
export default function ReelMedia({
  frame,
  playing,
  muted,
  className = "",
  animationClass = "",
}: {
  frame: ReelFrame;
  playing: boolean;
  muted: boolean;
  className?: string;
  animationClass?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(frame.imageUrl ?? null);

  const isVideo = frame.kind === "video" && Boolean(frame.mediaId);

  useEffect(() => {
    let cancelled = false;
    if (!frame.mediaId) {
      setUrl(frame.imageUrl ?? null);
      return;
    }
    getMediaUrl(frame.mediaId).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [frame.mediaId, frame.imageUrl]);

  // Restart the clip each time it becomes the active frame.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    if (playing) {
      el.currentTime = 0;
      el.play().catch(() => {
        /* autoplay blocked until the user interacts — the poster still shows */
      });
    } else {
      el.pause();
    }
  }, [playing, isVideo, url]);

  if (isVideo && url) {
    return (
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        playsInline
        loop
        preload="auto"
        className={`${className} ${playing ? animationClass : ""}`}
      />
    );
  }

  return (
    <Photo
      src={url ?? photoUrl(frame.seed, 1080)}
      seed={frame.seed}
      className={`${className} ${playing ? animationClass : ""}`}
    />
  );
}
