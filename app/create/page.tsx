"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Sparkles,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { photoUrl } from "@/lib/seed";
import { putMedia } from "@/lib/media";
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
}

export default function CreatePage() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const addPost = useApp((s) => s.addPost);
  const addComment = useApp((s) => s.addComment);

  const fileInput = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [index, setIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [caption, setCaption] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    addPost({
      id: postId,
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      imageSeed: seed,
      media: media.length ? media : undefined,
      caption: caption.trim(),
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
        <p className="text-base font-semibold">New post</p>
        <button
          onClick={share}
          disabled={posting}
          className="text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          {posting ? "Sharing…" : "Share"}
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
