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
  const trimStart = frame.trimStart ?? 0;
  const trimEnd = trimStart + frame.seconds;

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

  // Restart the clip at its trim point each time it becomes the active frame.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;
    if (playing) {
      el.currentTime = trimStart;
      el.play().catch(() => {
        /* autoplay blocked until the user interacts — the poster still shows */
      });
    } else {
      el.pause();
      // Show the trimmed-in frame as the still, not wherever playback left off.
      el.currentTime = trimStart;
    }
  }, [playing, isVideo, url, trimStart]);

  // Loop within the trimmed window rather than the whole source file.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo || !playing) return;
    const onTime = () => {
      if (el.currentTime >= trimEnd || el.currentTime < trimStart - 0.25) {
        el.currentTime = trimStart;
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [isVideo, playing, trimStart, trimEnd]);

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
