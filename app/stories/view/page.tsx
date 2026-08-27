"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Trash2, Send, Music2, Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";
import { getMediaUrl } from "@/lib/media";
import {
  buildStoryFeed,
  storyThumbUrl,
  musicOffsetFor,
  StoryItem,
} from "@/lib/stories";
import { shareFile, safeFilename, extensionFor, madeOn } from "@/lib/share";

const IMAGE_MS = 5000;

function timeAgo(ms: number): string {
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}

function StoryProgressBars({
  count,
  active,
  progress,
}: {
  count: number;
  active: number;
  progress: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/35">
          <div
            className="h-full bg-white"
            style={{
              width: i < active ? "100%" : i === active ? `${progress * 100}%` : "0%",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function StoryItemMedia({
  item,
  playing,
  onVideoRef,
  onEnded,
  forceMuted,
}: {
  item: StoryItem;
  playing: boolean;
  onVideoRef: (el: HTMLVideoElement | null) => void;
  onEnded: () => void;
  forceMuted: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (item.mediaId) {
      getMediaUrl(item.mediaId).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    } else {
      setUrl(storyThumbUrl(item));
    }
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (item.kind === "video") {
    return (
      /* eslint-disable-next-line jsx-a11y/media-has-caption */
      <video
        ref={onVideoRef}
        src={url ?? undefined}
        autoPlay={playing}
        playsInline
        muted={forceMuted}
        className="h-full w-full object-contain"
        onEnded={onEnded}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url ?? ""} alt="" className="h-full w-full object-cover" />
  );
}

function StoryViewer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startOwner = searchParams.get("owner") ?? "";

  const profile = useApp((s) => s.profile);
  const myStory = useApp((s) => s.myStory);
  const removeStoryItem = useApp((s) => s.removeStoryItem);

  const feed = buildStoryFeed(profile, myStory);
  const startIndex = Math.max(
    0,
    feed.findIndex((e) => e.ownerId === startOwner)
  );

  const [ownerIndex, setOwnerIndex] = useState(startIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const muted = useApp((s) => s.reelsMuted);
  const setMuted = useApp((s) => s.setReelsMuted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const entry = feed[ownerIndex];
  const item = entry?.items[itemIndex];

  function close() {
    router.back();
  }

  async function shareItem(target: StoryItem) {
    if (sharing) return;
    setSharing(true);
    try {
      const url = target.mediaId
        ? await getMediaUrl(target.mediaId)
        : storyThumbUrl(target);
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      const result = await shareFile({
        blob,
        filename: safeFilename(
          "story",
          extensionFor(blob, target.kind === "video" ? "mp4" : "jpg")
        ),
        title: "Story",
      });
      if (result === "downloaded") {
        alert("Saved to your downloads — share it from there.");
      }
    } catch {
      /* nothing to share if the clip can't be read */
    } finally {
      setSharing(false);
    }
  }

  function goToOwner(delta: number) {
    const next = ownerIndex + delta;
    if (next < 0 || next >= feed.length) {
      close();
      return;
    }
    setOwnerIndex(next);
    setItemIndex(0);
    setProgress(0);
  }

  function goToItem(delta: number) {
    if (!entry) return;
    const next = itemIndex + delta;
    if (next < 0) {
      goToOwner(-1);
      return;
    }
    if (next >= entry.items.length) {
      goToOwner(1);
      return;
    }
    setItemIndex(next);
    setProgress(0);
  }

  // Drives the progress bar for the current item and auto-advances it.
  useEffect(() => {
    if (!item || paused) return;
    setProgress(0);
    startedAtRef.current = performance.now();
    const durationMs =
      item.kind === "image" ? IMAGE_MS : Math.max(1000, item.duration * 1000);

    function tick() {
      const elapsed = performance.now() - startedAtRef.current;
      const pct = Math.min(1, elapsed / durationMs);
      setProgress(pct);
      if (pct >= 1) {
        if (item?.kind === "image") goToItem(1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (item.kind === "image") {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // Video items advance on their own "ended" event; this just drives the bar.
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerIndex, itemIndex, paused]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, item]);

  // Decrypt the track behind the current item.
  useEffect(() => {
    let cancelled = false;
    const id = item?.musicMediaId;
    if (!id) {
      setMusicUrl(null);
      return;
    }
    getMediaUrl(id).then((url) => {
      if (!cancelled) setMusicUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item?.musicMediaId]);

  /**
   * Seeks the track to where this item picks up and plays it.
   *
   * Runs on the item index rather than the url so moving between items that
   * share a song re-seeks instead of starting it over.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicUrl || !item?.musicMediaId) return;

    audio.volume = item.musicVolume ?? 0.8;
    const offset = musicOffsetFor(entry?.items ?? [], itemIndex);

    const start = () => {
      // A track shorter than the story wraps rather than falling silent.
      audio.currentTime = audio.duration ? offset % audio.duration : offset;
      if (!paused) audio.play().catch(() => {});
    };

    if (audio.readyState >= 1) start();
    else audio.addEventListener("loadedmetadata", start, { once: true });

    return () => audio.removeEventListener("loadedmetadata", start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl, ownerIndex, itemIndex]);

  // Holding to pause the story should hold the music too.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (paused) audio.pause();
    else if (musicUrl) audio.play().catch(() => {});
  }, [paused, musicUrl]);

  // Keeps the pointer in range when the current owner's item count shrinks
  // (deleting a story item) or the owner's entry disappears entirely.
  useEffect(() => {
    if (entry && itemIndex >= entry.items.length) {
      setItemIndex(Math.max(0, entry.items.length - 1));
    }
  }, [entry, itemIndex]);

  if (!entry || !item) {
    close();
    return null;
  }

  function handleTap(side: "left" | "right") {
    if (side === "left") goToItem(-1);
    else goToItem(1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <StoryItemMedia
          key={item.id}
          item={item}
          playing={!paused}
          onVideoRef={(el) => {
            videoRef.current = el;
          }}
          onEnded={() => goToItem(1)}
          forceMuted={muted || Boolean(item.musicMediaId)}
        />

        {item.musicMediaId && musicUrl && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio
            ref={audioRef}
            src={musicUrl}
            loop
            muted={muted}
            className="hidden"
          />
        )}

        {item.musicTitle && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-6">
            <span className="flex max-w-full items-center gap-1.5 truncate rounded-full bg-black/50 px-3 py-1.5 text-[12px] text-white">
              <Music2 size={13} className="shrink-0" />
              <span className="truncate">{item.musicTitle}</span>
            </span>
          </div>
        )}

        {/* Tap zones */}
        <button
          aria-label="Previous"
          onClick={() => handleTap("left")}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          aria-label="Next"
          onClick={() => handleTap("right")}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          className="absolute inset-y-0 right-0 w-1/3"
        />

        <div className="absolute inset-x-0 top-0 px-3 pt-3">
          <StoryProgressBars
            count={entry.items.length}
            active={itemIndex}
            progress={progress}
          />
          <div className="mt-3 flex items-start justify-between gap-3">
            {/* The name can be long, so the date gets its own line rather than
                competing with it and the controls for one row. */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(entry.avatarSeed)}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {entry.username}
                  </span>
                  <span className="shrink-0 text-xs text-white/70">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
                <p className="truncate text-[11px] leading-tight text-white/75">
                  Made {madeOn(item.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {(item.musicMediaId || item.kind === "video") && (
                <button
                  onClick={() => setMuted(!muted)}
                  aria-label={muted ? "Unmute story" : "Mute story"}
                  className="text-white"
                >
                  {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
              )}
              <button
                onClick={() => shareItem(item)}
                disabled={sharing}
                aria-label="Share story outside the app"
                className="text-white disabled:opacity-50"
              >
                <Send size={19} />
              </button>
              {entry.isMine && (
                <button
                  onClick={() => removeStoryItem(item.id)}
                  aria-label="Delete story item"
                  className="text-white"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={close} aria-label="Close" className="text-white">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoryViewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-black" />}>
      <StoryViewer />
    </Suspense>
  );
}
