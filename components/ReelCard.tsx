"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Music2,
  Volume2,
  VolumeX,
  Trash2,
  PencilLine,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Reel, ReelFrame } from "@/lib/reels";
import { draftFromReel } from "@/lib/drafts";
import { Comment } from "@/lib/types";
import { useApp, MY_ID, uid } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import { generateComments } from "@/lib/aiClient";
import { getMediaUrl, putMedia } from "@/lib/media";
import { shareFile, safeFilename, extensionFor, madeOn } from "@/lib/share";
import { renderReel } from "@/lib/render";
import { FILTERS } from "@/lib/reelTemplates";
import ReelMedia from "./ReelMedia";

const FRAME_DURATION = 4200;

/** Overlay text placement/appearance per template text style. */
const TEXT_STYLES: Record<string, string> = {
  "bold-center":
    "inset-x-6 top-1/2 -translate-y-1/2 text-center text-[30px] font-extrabold uppercase leading-[1.1] tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]",
  subtitle:
    "inset-x-6 bottom-[38%] text-center text-[17px] font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]",
  handwritten:
    "inset-x-8 top-[18%] text-center text-[26px] font-medium italic leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
  sticker:
    "inset-x-0 top-[22%] flex justify-center text-[19px] font-bold",
  "minimal-corner":
    "left-5 top-[14%] text-left text-[14px] font-medium uppercase tracking-[0.18em] drop-shadow",
  counter:
    "inset-x-6 top-[16%] text-center text-[44px] font-black tabular-nums leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]",
};

/** Per-frame entry animation for each transition style. */
const TRANSITION_CLASS: Record<string, string> = {
  cut: "",
  fade: "reel-tr-fade",
  zoom: "reel-ken-in",
  slide: "reel-tr-slide",
  flash: "reel-tr-flash",
  whip: "reel-tr-whip",
  blur: "reel-tr-blur",
};

export default function ReelCard({ reel }: { reel: Reel }) {
  const profile = useApp((s) => s.profile);
  const toggleReelLike = useApp((s) => s.toggleReelLike);
  const addReelComment = useApp((s) => s.addReelComment);
  const deleteReel = useApp((s) => s.deleteReel);
  const saveDraft = useApp((s) => s.saveDraft);
  // Shared so unmuting one reel keeps sound on as you scroll to the next.
  const muted = useApp((s) => s.reelsMuted);
  const setReelsMuted = useApp((s) => s.setReelsMuted);
  const router = useRouter();
  const setReelVideo = useApp((s) => s.setReelVideo);

  const containerRef = useRef<HTMLDivElement>(null);
  const personaVideo = useRef<HTMLVideoElement>(null);
  const lastTap = useRef(0);

  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [frame, setFrame] = useState(0);
  const [burst, setBurst] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [combining, setCombining] = useState(false);
  const [combinePct, setCombinePct] = useState(0);
  const [combineError, setCombineError] = useState<string | null>(null);

  const liked = reel.likedBy.includes(MY_ID);
  const likeCount = reel.likedBy.length;

  // Template reels carry explicit frames; seeded persona reels use frameSeeds.
  // Memoised so an unrelated re-render (a like, a new comment) can't restart
  // the playback timer partway through the current clip.
  const frames: ReelFrame[] = useMemo(
    () =>
      reel.frames?.length
        ? reel.frames
        : reel.frameSeeds.map((seed) => ({
            seed,
            seconds: FRAME_DURATION / 1000,
            text: "",
          })),
    [reel.frames, reel.frameSeeds]
  );

  const frameCount = frames.length;
  const current = frames[Math.min(frame, frameCount - 1)];
  const filterCss = FILTERS[reel.filter ?? "none"] ?? "none";
  const transitionClass =
    TRANSITION_CLASS[reel.transition ?? "zoom"] ?? "reel-ken-in";
  const textClass =
    TEXT_STYLES[reel.textStyle ?? "minimal-corner"] ?? TEXT_STYLES["minimal-corner"];

  // Decrypt the exported reel once, then play it like any other video.
  useEffect(() => {
    let cancelled = false;
    if (!reel.videoMediaId) return;
    getMediaUrl(reel.videoMediaId).then((url) => {
      if (!cancelled) setRenderedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [reel.videoMediaId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Each frame holds for its own duration, so template pacing is respected.
  useEffect(() => {
    if (reel.videoMediaId || reel.videoSrc || !active || paused || frameCount < 2)
      return;
    const hold = (frames[frame % frameCount]?.seconds ?? 4) * 1000;
    const id = setTimeout(() => setFrame((f) => (f + 1) % frameCount), hold);
    return () => clearTimeout(id);
  }, [active, paused, frame, frameCount, frames, reel.videoSrc, reel.videoMediaId]);

  // Restart from the top whenever a reel scrolls back into view, and drop
  // any manual pause so the next reel doesn't inherit it.
  useEffect(() => {
    if (!active) {
      setFrame(0);
      setPaused(false);
    }
  }, [active]);

  // Only the visible persona clip plays, so scrolling stays cheap.
  useEffect(() => {
    const el = personaVideo.current;
    if (!el) return;
    if (active && !paused) el.play().catch(() => {});
    else el.pause();

    const onTime = () => {
      if (el.duration) setProgress(el.currentTime / el.duration);
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [active, paused, reel.videoSrc, renderedUrl]);

  /** Back to the first frame, playing, wherever it had got to. */
  function restart() {
    const el = personaVideo.current;
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
    setFrame(0);
    setProgress(0);
    setPaused(false);
  }

  async function shareOut() {
    if (sharing) return;
    setSharing(true);
    try {
      const url = renderedUrl ?? reel.videoSrc ?? null;
      if (!url) {
        alert("Combine this reel into a video first, then share it.");
        return;
      }
      const blob = await (await fetch(url)).blob();
      const name = safeFilename(
        reel.caption || reel.templateName || "reel",
        extensionFor(blob, "mp4")
      );
      const result = await shareFile({
        blob,
        filename: name,
        title: reel.caption || "Reel",
        text: reel.caption || undefined,
      });
      if (result === "downloaded") {
        alert("Saved to your downloads — share it from there.");
      } else if (result === "unavailable") {
        alert("This browser can't share or save that file.");
      }
    } catch {
      alert("Couldn't prepare that reel for sharing.");
    } finally {
      setSharing(false);
    }
  }

  const needsCombining = Boolean(
    reel.isMine && !reel.videoMediaId && reel.frames?.some((f) => f.mediaId || f.imageUrl)
  );

  async function combine() {
    if (!reel.frames || combining) return;
    setCombining(true);
    setCombineError(null);
    try {
      const { blob, duration } = await renderReel({
        frames: reel.frames,
        filter: reel.filter ?? "none",
        transition: reel.transition ?? "fade",
        textStyle: reel.textStyle ?? "minimal-corner",
        onProgress: setCombinePct,
      });
      const record = await putMedia(blob, "video");
      setReelVideo(reel.id, record.id, duration);
    } catch (err) {
      setCombineError(
        err instanceof Error ? err.message : "Couldn't combine the clips."
      );
    } finally {
      setCombining(false);
    }
  }

  function like() {
    if (!liked) toggleReelLike(reel.id);
    setBurst(true);
    setTimeout(() => setBurst(false), 900);
  }

  function onTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) like();
    lastTap.current = now;
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text || !profile) return;

    addReelComment(reel.id, {
      id: uid("rc"),
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      text,
      createdAt: Date.now(),
      isMe: true,
    });
    setDraft("");

    setReplying(true);
    try {
      const replies = await generateComments(
        `${reel.caption}\n\n${profile.username} just commented: "${text}"`,
        1,
        [reel.authorUsername]
      );
      const reply = replies[0];
      if (reply) {
        addReelComment(reel.id, {
          id: uid("rc"),
          authorUsername: reply.username,
          authorAvatarSeed: reply.avatarSeed,
          text: reply.text,
          createdAt: Date.now(),
        });
      }
    } catch {
      // Comment is already saved either way.
    } finally {
      setReplying(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
    >
      {reel.videoMediaId ? (
        // Exported template reels are a single continuous video.
        <video
          ref={personaVideo}
          src={renderedUrl ?? undefined}
          muted={muted}
          playsInline
          loop
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : reel.videoSrc ? (
        // The AI personas' reels are real video files.
        <video
          ref={personaVideo}
          muted={muted}
          playsInline
          loop
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: filterCss }}
        >
          {/* WebM first for browsers built without H.264; MP4 covers phones. */}
          <source src={reel.videoSrc.replace(/\.mp4$/, ".webm")} type="video/webm" />
          <source src={reel.videoSrc} type="video/mp4" />
        </video>
      ) : (
        frames.map((f, i) => (
          <div
            key={`${f.seed}-${i}-${i === frame ? "on" : "off"}`}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === frame ? "opacity-100" : "opacity-0"
            }`}
            style={{ filter: filterCss }}
          >
            <ReelMedia
              frame={f}
              playing={active && i === frame}
              muted={muted}
              className="h-full w-full object-cover"
              animationClass={transitionClass}
            />
          </div>
        ))
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Overlay text per clip. Exported reels already have it burned in. */}
      {!reel.videoMediaId && current?.text && (
        <div
          key={`text-${frame}`}
          className={`pointer-events-none absolute z-[5] text-white reel-tr-fade ${textClass}`}
        >
          {reel.textStyle === "sticker" ? (
            <span className="rounded-lg bg-white px-3 py-1.5 text-ig-text shadow-lg">
              {current.text}
            </span>
          ) : (
            current.text
          )}
        </div>
      )}

      {/* Progress segments, one per frame */}
      {(reel.videoMediaId || reel.videoSrc) && (
        <div className="pointer-events-none absolute inset-x-3 top-[52px] z-10 h-[2px] rounded-full bg-white/35">
          <span
            className="block h-full rounded-full bg-white"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {!reel.videoMediaId && !reel.videoSrc && frameCount > 1 && (
        <div className="pointer-events-none absolute inset-x-3 top-[52px] z-10 flex gap-1">
          {frames.map((_, i) => (
            <span
              key={i}
              className={`h-[2px] flex-1 rounded-full ${
                i <= frame ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
      )}

      <div onClick={onTap} className="absolute inset-0" />

      {burst && (
        <Heart
          size={110}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-heart-pop text-white drop-shadow-lg"
          fill="white"
        />
      )}

      <div className="absolute right-3 top-[62px] z-10 flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setReelsMuted(!muted);
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="rounded-full bg-black/30 p-1.5 text-white"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPaused((v) => !v);
          }}
          aria-label={paused ? "Play reel" : "Pause reel"}
          className="rounded-full bg-black/30 p-1.5 text-white"
        >
          {paused ? <Play size={16} fill="white" /> : <Pause size={16} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            restart();
          }}
          aria-label="Restart reel"
          className="rounded-full bg-black/30 p-1.5 text-white"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {paused && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
          <span className="rounded-full bg-black/45 p-5">
            <Play size={40} fill="white" className="text-white" />
          </span>
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute bottom-[104px] right-3 z-10 flex flex-col items-center gap-5 text-white">
        <button onClick={like} className="flex flex-col items-center gap-1">
          <Heart
            size={28}
            className={liked ? "text-ig-red" : "text-white"}
            fill={liked ? "currentColor" : "none"}
          />
          <span className="text-[11px] font-semibold drop-shadow">
            {likeCount.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle size={27} />
          <span className="text-[11px] font-semibold drop-shadow">
            {reel.comments.length}
          </span>
        </button>
        <button
          onClick={shareOut}
          disabled={sharing}
          aria-label="Share reel outside the app"
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <Send size={25} />
        </button>
        {reel.isMine ? (
          <>
            {reel.templateId && reel.frames && (
              <button
                onClick={() => {
                  const draft = draftFromReel(reel);
                  if (!draft) return;
                  saveDraft(draft);
                  deleteReel(reel.id);
                  router.push(
                    `/reels/edit?t=${encodeURIComponent(
                      draft.templateId
                    )}&d=${encodeURIComponent(draft.id)}`
                  );
                }}
                aria-label="Unshare and edit reel"
              >
                <PencilLine size={24} />
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Delete this reel?")) deleteReel(reel.id);
              }}
              aria-label="Delete reel"
            >
              <Trash2 size={24} />
            </button>
          </>
        ) : (
          <button aria-label="Save">
            <Bookmark size={25} />
          </button>
        )}
        <div className="h-7 w-7 overflow-hidden rounded-md border border-white/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(reel.authorAvatarSeed)}
            alt=""
            className="h-full w-full animate-[spin_6s_linear_infinite] object-cover"
          />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[66px] pr-16 text-white">
        <Link
          href={`/profile?u=${encodeURIComponent(reel.authorUsername)}`}
          className="flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(reel.authorAvatarSeed)}
            alt=""
            className="h-8 w-8 rounded-full border border-white/70"
          />
          <span className="text-[14px] font-semibold">{reel.authorUsername}</span>
          {!reel.isMine && (
            <span className="rounded border border-white/70 px-2 py-0.5 text-[11px] font-semibold">
              Follow
            </span>
          )}
        </Link>
        {reel.templateName && (
          <p className="mt-1 text-[11px] text-white/70">
            Template · {reel.templateName}
          </p>
        )}

        {/* Reels made before the single-video export, or where it failed. */}
        {needsCombining && (
          <button
            onClick={combine}
            disabled={combining}
            className="pointer-events-auto mt-2 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur disabled:opacity-60"
          >
            {combining
              ? `Combining… ${Math.round(combinePct * 100)}%`
              : "Combine into one video"}
          </button>
        )}
        {combineError && (
          <p className="mt-1.5 text-[11px] text-white/80">{combineError}</p>
        )}
        <p className="mt-2 text-[13px] leading-[17px]">{reel.caption}</p>
        <p className="mt-1 text-[11px] text-white/70">Made {madeOn(reel.createdAt)}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/90">
          <Music2 size={13} /> {reel.songCredit || reel.audioLabel}
        </p>
      </div>

      {showComments && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-black/40"
          onClick={() => setShowComments(false)}
        >
          <div
            className="max-h-[70%] w-full overflow-y-auto rounded-t-2xl bg-white text-ig-text"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 border-b border-ig-border bg-white px-4 py-3 text-center text-sm font-semibold">
              {reel.comments.length} comments
            </div>
            <div className="space-y-3 px-4 py-3">
              {reel.comments.map((c: Comment) => (
                <div key={c.id} className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(c.authorAvatarSeed)}
                    alt=""
                    className="mt-0.5 h-7 w-7 rounded-full"
                  />
                  <p className="text-[13px] leading-[18px]">
                    <span className="font-semibold">{c.authorUsername}</span>{" "}
                    {c.text}
                  </p>
                </div>
              ))}
              {replying && (
                <p className="flex items-center gap-1 text-ig-muted">
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-ig-muted" />
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitComment();
              }}
              className="sticky bottom-0 flex items-center gap-2 border-t border-ig-border bg-white px-4 py-2.5"
            >
              {profile && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl(profile.avatarSeed)}
                  alt=""
                  className="h-7 w-7 rounded-full"
                />
              )}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:text-ig-muted"
              />
              {draft.trim() && (
                <button
                  type="submit"
                  className="text-[14px] font-semibold text-ig-blue"
                >
                  Post
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
