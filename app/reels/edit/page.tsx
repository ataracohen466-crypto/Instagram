"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ImagePlus,
  Play,
  Square,
  Sparkles,
  X,
  Video,
  Camera,
  Music2,
} from "lucide-react";
import {
  getTemplate,
  FILTERS,
  FilterId,
  TransitionId,
  templateDuration,
} from "@/lib/reelTemplates";
import { ReelFrame } from "@/lib/reels";
import { useApp, uid } from "@/lib/store";
import { photoUrl } from "@/lib/seed";
import { downscale } from "@/lib/image";
import { putMedia } from "@/lib/media";
import { renderReel, renderSupported } from "@/lib/render";
import ReelMedia from "@/components/ReelMedia";
import { generateCaption } from "@/lib/aiClient";
import Photo from "@/components/Photo";

const FILTER_ORDER: FilterId[] = [
  "none",
  "warm",
  "cool",
  "film",
  "bw",
  "vivid",
  "fade",
  "moody",
  "golden",
  "dreamy",
];

const TRANSITIONS: TransitionId[] = [
  "cut",
  "fade",
  "zoom",
  "slide",
  "flash",
  "whip",
  "blur",
];

const TRANSITION_CLASS: Record<string, string> = {
  cut: "",
  fade: "reel-tr-fade",
  zoom: "reel-ken-in",
  slide: "reel-tr-slide",
  flash: "reel-tr-flash",
  whip: "reel-tr-whip",
  blur: "reel-tr-blur",
};

const TEXT_STYLES: Record<string, string> = {
  "bold-center":
    "inset-x-4 top-1/2 -translate-y-1/2 text-center text-[20px] font-extrabold uppercase leading-[1.1] drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]",
  subtitle:
    "inset-x-4 bottom-[16%] text-center text-[13px] font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]",
  handwritten:
    "inset-x-5 top-[18%] text-center text-[18px] font-medium italic leading-tight drop-shadow",
  sticker: "inset-x-0 top-[22%] flex justify-center text-[13px] font-bold",
  "minimal-corner":
    "left-3 top-[13%] text-left text-[10px] font-medium uppercase tracking-[0.18em] drop-shadow",
  counter:
    "inset-x-4 top-[15%] text-center text-[30px] font-black tabular-nums leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]",
};

function Editor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = getTemplate(searchParams.get("t") ?? "");

  const profile = useApp((s) => s.profile);
  const addReel = useApp((s) => s.addReel);

  const [frames, setFrames] = useState<ReelFrame[]>([]);
  const [filter, setFilter] = useState<FilterId>("none");
  const [transition, setTransition] = useState<TransitionId>("fade");
  const [caption, setCaption] = useState("");
  const [activeSlot, setActiveSlot] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [exportPct, setExportPct] = useState(0);
  const [musicId, setMusicId] = useState<string | undefined>();
  const [musicTitle, setMusicTitle] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.65);
  const [songCredit, setSongCredit] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);

  // Seed editor state from the chosen template.
  useEffect(() => {
    if (!template) return;
    setFrames(
      template.slots.map((slot, i) => ({
        seed: `${template.id}-${i}`,
        seconds: slot.seconds,
        text: slot.text,
      }))
    );
    setFilter(template.filter);
    setTransition(template.transition);
    setCaption(template.slots[0]?.text ? "" : "");
  }, [template]);

  // Preview playback.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const hold = (frames[previewFrame % frames.length]?.seconds ?? 2) * 1000;
    const id = setTimeout(() => {
      setPreviewFrame((f) => {
        const next = f + 1;
        if (next >= frames.length) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, hold);
    return () => clearTimeout(id);
  }, [playing, previewFrame, frames]);

  if (!template) {
    return (
      <div className="px-8 py-20 text-center">
        <p className="text-sm text-ig-muted">That template doesn&apos;t exist.</p>
        <Link href="/reels/templates" className="mt-3 block text-sm font-semibold text-ig-blue">
          Browse templates
        </Link>
      </div>
    );
  }

  async function pickClip(file: File | undefined, index: number) {
    if (!file) return;
    setError(null);
    setBusySlot(index);
    try {
      if (file.type.startsWith("video/")) {
        const record = await putMedia(file, "video");
        setFrames((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  mediaId: record.id,
                  kind: "video",
                  imageUrl: undefined,
                  // Adopt the clip's own length, capped to keep reels snappy.
                  seconds: record.duration
                    ? Math.min(Math.max(record.duration, 1), 15)
                    : f.seconds,
                }
              : f
          )
        );
      } else {
        const dataUrl = await downscale(file, 9 / 16);
        const blob = await (await fetch(dataUrl)).blob();
        const record = await putMedia(blob, "image");
        setFrames((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, mediaId: record.id, kind: "image", imageUrl: undefined }
              : f
          )
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That file could not be read."
      );
    } finally {
      setBusySlot(null);
    }
  }

  async function pickMusic(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const record = await putMedia(file, "audio");
      setMusicId(record.id);
      setMusicTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That audio file could not be read."
      );
    }
  }

  function setSlotText(index: number, text: string) {
    setFrames((prev) => prev.map((f, i) => (i === index ? { ...f, text } : f)));
  }

  function setSlotSeconds(index: number, seconds: number) {
    setFrames((prev) =>
      prev.map((f, i) => (i === index ? { ...f, seconds } : f))
    );
  }

  async function suggestCaption() {
    setSuggesting(true);
    try {
      const hint = `${template!.name}: ${frames.map((f) => f.text).filter(Boolean).join(", ")}`;
      const text = await generateCaption(hint);
      if (text) setCaption(text);
    } catch {
      setError("Couldn't reach the caption service.");
    } finally {
      setSuggesting(false);
    }
  }

  async function share() {
    if (!profile || sharing) return;
    setSharing(true);
    setError(null);
    setPlaying(false);

    const used = frames.filter((f) => f.mediaId || f.imageUrl);

    const base = {
      id: uid("r"),
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      frameSeeds: frames.map((f) => f.seed),
      frames,
      caption: caption.trim() || template!.name,
      audioLabel: songCredit.trim()
        ? songCredit.trim()
        : musicTitle
          ? `${profile.username} · ${musicTitle}`
          : `${profile.username} · ${template!.audioLabel}`,
      likedBy: [],
      comments: [],
      createdAt: Date.now(),
      templateId: template!.id,
      templateName: template!.name,
      transition,
      filter,
      textStyle: template!.textStyle,
      musicMediaId: musicId,
      musicTitle: musicTitle || undefined,
      songCredit: songCredit.trim() || undefined,
      isMine: true,
    };

    try {
      // Flatten the clips into one continuous video.
      const { blob, duration } = await renderReel({
        frames: used,
        filter,
        transition,
        textStyle: template!.textStyle,
        musicMediaId: musicId,
        musicVolume,
        onProgress: setExportPct,
      });

      const record = await putMedia(blob, "video");
      addReel({ ...base, videoMediaId: record.id, durationSeconds: duration });
    } catch (err) {
      // Without a working encoder the reel still posts, just clip by clip.
      console.error("Reel export failed", err);
      addReel(base);
      setError(
        "Couldn't combine the clips into one video on this browser — posted as separate clips instead."
      );
    }

    router.push("/reels");
  }

  const filled = frames.filter((f) => f.mediaId || f.imageUrl).length;
  const preview = frames[Math.min(previewFrame, frames.length - 1)];
  const textClass =
    TEXT_STYLES[template.textStyle] ?? TEXT_STYLES["minimal-corner"];

  return (
    <div className="min-h-screen bg-white pb-28">
      <header className="sticky top-0 z-40 border-b border-ig-border bg-white">
        <div className="mx-auto flex h-[54px] w-full max-w-[470px] items-center gap-3 px-4">
          <Link href="/reels/templates" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{template.name}</p>
            <p className="text-[11px] leading-3 text-ig-muted">
              {frames.length} clips · {Math.round(templateDuration(template))}s
            </p>
          </div>
          <button
            onClick={share}
            disabled={filled === 0 || sharing}
            className="rounded-lg bg-ig-blue px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {sharing ? `${Math.round(exportPct * 100)}%` : "Share"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[470px] px-4">
        {/* Preview */}
        <div className="mt-4 flex gap-3">
          <div
            className="relative aspect-[9/16] w-[150px] shrink-0 overflow-hidden rounded-xl bg-black"
            style={{ filter: FILTERS[filter] }}
          >
            {preview && (preview.mediaId || preview.imageUrl) ? (
              <ReelMedia
                key={`p-${previewFrame}-${playing}`}
                frame={preview}
                playing={playing}
                muted={false}
                className="h-full w-full object-cover"
                animationClass={TRANSITION_CLASS[transition]}
              />
            ) : (
              <Photo
                key={`ph-${previewFrame}`}
                src={photoUrl(preview?.seed ?? template.id, 720)}
                seed={preview?.seed ?? template.id}
                className="h-full w-full object-cover opacity-60"
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {preview?.text && (
              <div className={`pointer-events-none absolute text-white ${textClass}`}>
                {template.textStyle === "sticker" ? (
                  <span className="rounded bg-white px-2 py-1 text-ig-text">
                    {preview.text}
                  </span>
                ) : (
                  preview.text
                )}
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-1.5 top-1.5 flex gap-0.5">
              {frames.map((_, i) => (
                <span
                  key={i}
                  className={`h-[2px] flex-1 rounded-full ${
                    i <= previewFrame ? "bg-white" : "bg-white/35"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[13px] text-ig-muted">{template.description}</p>
            <button
              onClick={() => {
                setPreviewFrame(0);
                setPlaying((p) => !p);
              }}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#efefef] px-3 py-2 text-[13px] font-semibold"
            >
              {playing ? <Square size={14} /> : <Play size={14} />}
              {playing ? "Stop" : "Preview"}
            </button>
            <p className="mt-3 text-[12px] text-ig-muted">
              {filled} of {frames.length} clips added
            </p>
            {filled === 0 && (
              <p className="mt-1 text-[12px] text-ig-muted">
                Add at least one photo to share.
              </p>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-ig-red">{error}</p>}

        {/* Look controls */}
        <p className="mt-6 text-[13px] font-semibold">Filter</p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {FILTER_ORDER.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ${
                filter === f ? "bg-ig-text text-white" : "bg-[#efefef]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold">Transition</p>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {TRANSITIONS.map((tr) => (
            <button
              key={tr}
              onClick={() => setTransition(tr)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ${
                transition === tr ? "bg-ig-text text-white" : "bg-[#efefef]"
              }`}
            >
              {tr}
            </button>
          ))}
        </div>

        {/* Clips */}
        <p className="mt-6 text-[13px] font-semibold">Clips</p>
        <div className="mt-2 space-y-2.5">
          {frames.map((f, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-xl border border-ig-border p-2.5"
            >
              <div className="shrink-0">
              <button
                onClick={() => {
                  setActiveSlot(i);
                  setPreviewFrame(i);
                  fileInput.current?.click();
                }}
                className="relative block aspect-[9/16] w-[54px] overflow-hidden rounded-lg bg-ig-bg"
              >
                {busySlot === i ? (
                  <span className="flex h-full w-full items-center justify-center text-[9px] text-ig-muted">
                    …
                  </span>
                ) : f.mediaId || f.imageUrl ? (
                  <>
                    <ReelMedia
                      frame={f}
                      playing={false}
                      muted
                      className="h-full w-full object-cover"
                    />
                    {f.kind === "video" && (
                      <span className="absolute bottom-0.5 right-0.5 text-white drop-shadow">
                        <Video size={11} />
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ig-muted">
                    <ImagePlus size={18} />
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveSlot(i);
                  setPreviewFrame(i);
                  cameraInput.current?.click();
                }}
                className="mt-1 flex w-[54px] items-center justify-center gap-1 rounded-md bg-[#efefef] py-1 text-[9px] font-semibold text-ig-text"
              >
                <Camera size={10} /> Record
              </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-ig-muted">
                    {i + 1}. {template.slots[i]?.label ?? "Clip"}
                  </p>
                  {(f.mediaId || f.imageUrl) && (
                    <button
                      onClick={() =>
                        setFrames((prev) =>
                          prev.map((x, xi) =>
                            xi === i
                              ? { ...x, imageUrl: undefined, mediaId: undefined, kind: undefined }
                              : x
                          )
                        )
                      }
                      aria-label="Remove photo"
                      className="text-ig-muted"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <input
                  value={f.text}
                  onChange={(e) => setSlotText(i, e.target.value)}
                  placeholder="Add text on screen…"
                  className="mt-1 w-full rounded-md bg-[#efefef] px-2 py-1.5 text-[13px] outline-none placeholder:text-ig-muted"
                />

                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={0.2}
                    value={f.seconds}
                    onChange={(e) => setSlotSeconds(i, Number(e.target.value))}
                    className="h-1 flex-1 accent-ig-blue"
                  />
                  <span className="w-9 text-right text-[11px] tabular-nums text-ig-muted">
                    {f.seconds.toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Music */}
        <p className="mt-6 text-[13px] font-semibold">Music</p>
        <div className="mt-2 rounded-xl border border-ig-border p-3">
          {musicId ? (
            <>
              <div className="flex items-center gap-2">
                <Music2 size={15} className="shrink-0 text-ig-muted" />
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {musicTitle}
                </p>
                <button
                  onClick={() => {
                    setMusicId(undefined);
                    setMusicTitle("");
                  }}
                  aria-label="Remove music"
                  className="text-ig-muted"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] text-ig-muted">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="h-1 flex-1 accent-ig-blue"
                />
                <span className="w-8 text-right text-[11px] tabular-nums text-ig-muted">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-ig-muted">
                Mixed into the exported video. Your clips duck underneath it.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => musicInput.current?.click()}
                className="flex items-center gap-2 text-[13px] font-semibold text-ig-blue"
              >
                <Music2 size={15} /> Add background music
              </button>
              <p className="mt-1.5 text-[11px] text-ig-muted">
                Pick an audio file from this device. It loops to fill the reel
                and fades out at the end.
              </p>
            </>
          )}
        </div>

        {/* Song credit */}
        <p className="mt-5 text-[13px] font-semibold">Song credit</p>
        <div className="mt-2 rounded-xl border border-ig-border p-3">
          <input
            value={songCredit}
            onChange={(e) => setSongCredit(e.target.value)}
            placeholder="Song title · Artist"
            className="w-full rounded-lg bg-[#efefef] px-3 py-2 text-[13px] outline-none placeholder:text-ig-muted"
          />
          <p className="mt-2 text-[11px] leading-4 text-ig-muted">
            Shows on the reel like a music credit. It&apos;s a label only —
            no audio plays for it. Use background music above for that.
          </p>
        </div>

        {/* Caption */}
        <p className="mt-6 text-[13px] font-semibold">Caption</p>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          placeholder="Write a caption…"
          className="mt-2 w-full resize-none rounded-lg border border-ig-border px-3 py-2 text-[14px] outline-none placeholder:text-ig-muted"
        />
        <button
          onClick={suggestCaption}
          disabled={suggesting}
          className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ig-blue disabled:opacity-50"
        >
          <Sparkles size={14} />
          {suggesting ? "Writing…" : "Write one for me"}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(e) => {
          pickClip(e.target.files?.[0], activeSlot);
          e.target.value = "";
        }}
      />

      <input
        ref={musicInput}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          pickMusic(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* `capture` asks the phone for its camera rather than the library. */}
      <input
        ref={cameraInput}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pickClip(e.target.files?.[0], activeSlot);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function EditReelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Editor />
    </Suspense>
  );
}
