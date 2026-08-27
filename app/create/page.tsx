"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ImagePlus,
  Sparkles,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  Music2,
} from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { photoUrl } from "@/lib/seed";
import { putMedia, getMediaUrl } from "@/lib/media";
import { postSlides } from "@/lib/postMedia";
import { photoUrl as stockPhotoUrl } from "@/lib/seed";
import { PostMedia } from "@/lib/types";
import Photo from "@/components/Photo";
import CameraRecorder from "@/components/CameraRecorder";
import { generateCaption, generateComments } from "@/lib/aiClient";

const MAX_DIMENSION = 1080;
/** Instagram's own carousel ceiling, and plenty for a phone to hold. */
const MAX_SLIDES = 10;

async function downscale(file: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that image."));
    el.src = dataUrl;
  });

  const side = Math.min(img.width, img.height);
  const size = Math.min(side, MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  // Center-crop to a square, the way the real app frames a feed photo.
  ctx.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** A slide being composed, before it's encrypted and saved on share. */
interface Draft {
  id: string;
  kind: "image" | "video";
  /** Shown in the composer; an object URL for blobs, or a remote/stock URL. */
  previewUrl: string;
  /** Present for anything picked or filmed; absent for a "Surprise me" pick. */
  blob?: Blob;
  /** Set for stock picks, which need no encrypting. */
  stockSeed?: string;
  /** Already in the media store — reused as-is when re-sharing an edit. */
  existingMediaId?: string;
}

function Composer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const profile = useApp((s) => s.profile);
  const addPost = useApp((s) => s.addPost);
  const addComment = useApp((s) => s.addComment);
  const posts = useApp((s) => s.posts);
  const updatePost = useApp((s) => s.updatePost);
  const editing = editId ? posts.find((p) => p.id === editId) : undefined;

  const fileInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [index, setIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [caption, setCaption] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [musicId, setMusicId] = useState<string | undefined>();
  const [musicTitle, setMusicTitle] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  // Pull an unshared post back into the composer exactly as it was.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!editing || loadedRef.current) return;
    loadedRef.current = true;
    setCaption(editing.caption);
    setMusicId(editing.musicMediaId);
    setMusicTitle(editing.musicTitle ?? "");
    setMusicVolume(editing.musicVolume ?? 0.8);
    (async () => {
      const slides = postSlides(editing);
      const restored: Draft[] = [];
      for (const slide of slides) {
        if (slide.mediaId) {
          const url = await getMediaUrl(slide.mediaId);
          if (url)
            restored.push({
              id: slide.id,
              kind: slide.kind,
              previewUrl: url,
              existingMediaId: slide.mediaId,
            });
        } else if (slide.url) {
          restored.push({ id: slide.id, kind: slide.kind, previewUrl: slide.url });
        } else if (slide.seed) {
          restored.push({
            id: slide.id,
            kind: "image",
            previewUrl: stockPhotoUrl(slide.seed, 1080),
            stockSeed: slide.seed,
          });
        }
      }
      setDrafts(restored);
      setIndex(0);
    })();
  }, [editing]);

  const current = drafts[index];
  const room = MAX_SLIDES - drafts.length;

  function addDrafts(next: Draft[]) {
    if (!next.length) return;
    setDrafts((prev) => {
      const merged = [...prev, ...next].slice(0, MAX_SLIDES);
      // Land on the first of whatever was just added.
      setIndex(Math.min(prev.length, merged.length - 1));
      return merged;
    });
  }

  function onPickFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);

    const picked = Array.from(files);
    if (picked.length > room) {
      setError(`A post holds ${MAX_SLIDES} items — the extras were skipped.`);
    }

    addDrafts(
      picked.slice(0, room).map((file) => ({
        id: uid("slide"),
        kind: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
        previewUrl: URL.createObjectURL(file),
        blob: file,
      }))
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => {
      const found = prev.find((d) => d.id === id);
      if (found?.blob) URL.revokeObjectURL(found.previewUrl);
      const next = prev.filter((d) => d.id !== id);
      setIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  }

  function move(delta: number) {
    setDrafts((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      setIndex(to);
      return next;
    });
  }

  function addStock() {
    if (!room) return;
    const seed = `${Date.now()}-${Math.random()}`;
    addDrafts([
      {
        id: uid("slide"),
        kind: "image",
        previewUrl: photoUrl(seed, 1080),
        stockSeed: seed,
      },
    ]);
  }

  async function pickMusic(file: File | undefined) {
    if (!file) return;
    setMusicError(null);
    setMusicBusy(true);
    try {
      const record = await putMedia(file, "audio");
      setMusicId(record.id);
      setMusicTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setMusicError(
        err instanceof Error ? err.message : "Couldn't use that audio file."
      );
    } finally {
      setMusicBusy(false);
    }
  }

  async function suggestCaption() {
    setSuggesting(true);
    try {
      const suggested = await generateCaption(caption);
      if (suggested) setCaption(suggested);
    } catch {
      setError("Couldn't reach the caption service.");
    } finally {
      setSuggesting(false);
    }
  }

  /** Encrypts each slide into the media store; stock picks stay as seeds. */
  async function buildMedia(): Promise<PostMedia[]> {
    const out: PostMedia[] = [];
    for (const draft of drafts) {
      if (draft.stockSeed) {
        out.push({ id: draft.id, kind: "image", seed: draft.stockSeed });
        continue;
      }
      if (draft.existingMediaId) {
        out.push({
          id: draft.id,
          kind: draft.kind,
          mediaId: draft.existingMediaId,
        });
        continue;
      }
      if (!draft.blob) continue;

      if (draft.kind === "video") {
        const record = await putMedia(draft.blob, "video");
        out.push({ id: draft.id, kind: "video", mediaId: record.id });
      } else {
        const dataUrl = await downscale(draft.blob);
        const jpeg = await (await fetch(dataUrl)).blob();
        const record = await putMedia(jpeg, "image");
        out.push({ id: draft.id, kind: "image", mediaId: record.id });
      }
    }
    return out;
  }

  async function share() {
    if (!profile || posting) return;
    setPosting(true);
    setError(null);

    const postId = uid("p");
    const seed = `${profile.username}-${postId}`;

    let media: PostMedia[] = [];
    try {
      media = await buildMedia();
    } catch {
      setError("Couldn't save that media. Try fewer or smaller files.");
      setPosting(false);
      return;
    }

    if (editing) {
      // Re-sharing an edit keeps the post's likes and comments, and puts it
      // back on the feed.
      updatePost(editing.id, {
        media: media.length ? media : undefined,
        caption: caption.trim(),
        musicMediaId: musicId,
        musicTitle: musicTitle || undefined,
        musicVolume,
        archived: false,
      });
      router.push("/");
      return;
    }

    addPost({
      id: postId,
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      imageSeed: seed,
      media: media.length ? media : undefined,
      caption: caption.trim(),
      musicMediaId: musicId,
      musicTitle: musicTitle || undefined,
      musicVolume,
      likedBy: [],
      comments: [],
      createdAt: Date.now(),
      isMine: true,
    });

    router.push("/");

    // The AI accounts react to your post once it's live.
    try {
      const generated = await generateComments(caption.trim(), 3);
      generated.forEach(
        (
          c: { username: string; avatarSeed: string; text: string },
          i: number
        ) => {
          setTimeout(() => {
            addComment(postId, {
              id: uid("c"),
              authorUsername: c.username,
              authorAvatarSeed: c.avatarSeed,
              text: c.text,
              createdAt: Date.now(),
            });
          }, 1200 + i * 2200);
        }
      );
    } catch {
      // Post is already published; reactions are best-effort.
    }
  }

  return (
    <div className="min-h-[calc(100vh-110px)] bg-white">
      <div className="flex items-center justify-between border-b border-ig-border px-4 py-3">
        <button onClick={() => router.back()} aria-label="Cancel">
          <X size={24} />
        </button>
        <p className="text-base font-semibold">
          {editing ? "Edit post" : "New post"}
        </p>
        <button
          onClick={share}
          disabled={posting}
          className="text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          {posting ? "Sharing…" : editing ? "Share again" : "Share"}
        </button>
      </div>

      <div className="relative aspect-square w-full bg-ig-bg">
        {current ? (
          <>
            {current.kind === "video" ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                key={current.id}
                src={current.previewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <Photo
                src={current.previewUrl}
                seed={current.id}
                className="h-full w-full object-cover"
              />
            )}

            {drafts.length > 1 && (
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold text-white">
                {index + 1}/{drafts.length}
              </span>
            )}

            <button
              onClick={() => removeDraft(current.id)}
              aria-label="Remove this item"
              className="absolute left-3 top-3 rounded-full bg-black/60 p-1.5 text-white"
            >
              <X size={16} />
            </button>

            {drafts.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  aria-label="Previous item"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() =>
                    setIndex((i) => Math.min(drafts.length - 1, i + 1))
                  }
                  disabled={index === drafts.length - 1}
                  aria-label="Next item"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </>
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-3 text-ig-muted"
          >
            <ImagePlus size={44} strokeWidth={1.2} />
            <span className="text-sm">Tap to choose photos or videos</span>
            <span className="text-xs">pick as many as {MAX_SLIDES}</span>
          </button>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-3">
          {drafts.map((draft, i) => (
            <button
              key={draft.id}
              onClick={() => setIndex(i)}
              aria-label={`Item ${i + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${
                i === index ? "border-ig-blue" : "border-transparent"
              }`}
            >
              {draft.kind === "video" ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video src={draft.previewUrl} muted className="h-full w-full object-cover" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={draft.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              {draft.kind === "video" && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {drafts.length > 1 && (
        <div className="flex gap-2 px-4 pt-2">
          <button
            onClick={() => move(-1)}
            disabled={index === 0}
            className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-[12px] font-semibold disabled:opacity-40"
          >
            Move left
          </button>
          <button
            onClick={() => move(1)}
            disabled={index === drafts.length - 1}
            className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-[12px] font-semibold disabled:opacity-40"
          >
            Move right
          </button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => fileInput.current?.click()}
          disabled={!room}
          className="flex-1 rounded-lg bg-[#efefef] py-2 text-sm font-semibold disabled:opacity-40"
        >
          {drafts.length ? "Add more" : "Choose"}
        </button>
        <button
          onClick={() => setShowCamera(true)}
          disabled={!room}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#efefef] py-2 text-sm font-semibold disabled:opacity-40"
        >
          <Camera size={16} /> Camera
        </button>
        <button
          onClick={addStock}
          disabled={!room}
          className="flex-1 rounded-lg bg-[#efefef] py-2 text-sm font-semibold disabled:opacity-40"
        >
          Surprise me
        </button>
      </div>

      <input
        ref={musicInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.aif,.aiff,.caf,.weba"
        hidden
        onChange={(e) => {
          pickMusic(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="px-4 pb-1">
        <div className="rounded-xl border border-ig-border p-3">
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
                <span className="w-12 shrink-0 text-[11px] text-ig-muted">
                  Volume
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="h-1 flex-1 accent-ig-blue"
                />
                <span className="w-9 text-right text-[11px] tabular-nums text-ig-muted">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-4 text-ig-muted">
                Plays while the post is on screen. Tap the speaker on the post
                to hear it — the feed starts muted.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => musicInput.current?.click()}
                disabled={musicBusy}
                className="flex items-center gap-2 text-[13px] font-semibold text-ig-blue disabled:opacity-50"
              >
                <Music2 size={15} /> {musicBusy ? "Adding music…" : "Add music"}
              </button>
              <p className="mt-1.5 text-[11px] leading-4 text-ig-muted">
                Pick an audio file from this device to play over this post.
              </p>
              {musicError && (
                <p className="mt-1.5 text-[11px] text-ig-red">{musicError}</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          rows={4}
          className="w-full resize-none border-b border-ig-border py-2 text-[14px] outline-none placeholder:text-ig-muted"
        />
        <button
          onClick={suggestCaption}
          disabled={suggesting}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          <Sparkles size={16} />
          {suggesting ? "Writing…" : "Write it for me"}
        </button>
      </div>

      {error && <p className="px-4 pt-4 text-sm text-ig-red">{error}</p>}

      {showCamera && (
        <CameraRecorder
          allowPhoto
          defaultMode="photo"
          onClose={() => setShowCamera(false)}
          onCapture={(blob, kind) => {
            setShowCamera(false);
            addDrafts([
              {
                id: uid("slide"),
                kind: kind === "video" ? "video" : "image",
                previewUrl: URL.createObjectURL(blob),
                blob,
              },
            ]);
          }}
        />
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Composer />
    </Suspense>
  );
}
