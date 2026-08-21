"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";

const MAX_DIMENSION = 1080;

async function downscale(file: File): Promise<string> {
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

export default function CreatePage() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const addPost = useApp((s) => s.addPost);
  const addComment = useApp((s) => s.addComment);

  const fileInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setImage(await downscale(file));
    } catch {
      setError("That file could not be read. Try a different image.");
    }
  }

  async function suggestCaption() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: caption }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
    } catch {
      setError("Couldn't reach the caption service.");
    } finally {
      setSuggesting(false);
    }
  }

  async function share() {
    if (!profile || posting) return;
    setPosting(true);

    const postId = uid("p");
    const seed = `${profile.username}-${postId}`;

    addPost({
      id: postId,
      authorUsername: profile.username,
      authorAvatarSeed: profile.avatarSeed,
      imageSeed: seed,
      imageUrl: image ?? undefined,
      caption: caption.trim(),
      likedBy: [],
      comments: [],
      createdAt: Date.now(),
      isMine: true,
    });

    router.push("/");

    // The AI accounts react to your post once it's live.
    try {
      const res = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: caption.trim(), count: 3 }),
      });
      const data = await res.json();
      (data.comments ?? []).forEach(
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

      <div className="aspect-square w-full bg-ig-bg">
        {image ? (
          <Photo src={image} seed={image} className="h-full w-full object-cover" />
        ) : (
          <button
            onClick={() => fileInput.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-3 text-ig-muted"
          >
            <ImagePlus size={44} strokeWidth={1.2} />
            <span className="text-sm">Tap to choose a photo</span>
            <span className="text-xs">or share without one</span>
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />

      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => fileInput.current?.click()}
          className="flex-1 rounded-lg bg-[#efefef] py-2 text-sm font-semibold"
        >
          {image ? "Change photo" : "Choose photo"}
        </button>
        <button
          onClick={() =>
            setImage(photoUrl(`${Date.now()}-${Math.random()}`, 1080))
          }
          className="flex-1 rounded-lg bg-[#efefef] py-2 text-sm font-semibold"
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

      {error && (
        <p className="px-4 pt-4 text-sm text-ig-red">{error}</p>
      )}
    </div>
  );
}
