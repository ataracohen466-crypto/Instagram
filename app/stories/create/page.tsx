"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, ImagePlus, Check, Music2 } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { downscale } from "@/lib/image";
import { putMedia } from "@/lib/media";
import CameraRecorder from "@/components/CameraRecorder";

const STORY_ASPECT = 9 / 16;

interface Staged {
  id: string;
  kind: "video" | "image";
  blob: Blob;
  url: string;
}

/**
 * Stages any number of photos/clips — from the gallery or the in-app camera —
 * then encrypts and saves each as its own story item in one tap.
 */
export default function CreateStoryPage() {
  const router = useRouter();
  const addStoryItem = useApp((s) => s.addStoryItem);

  const fileInput = useRef<HTMLInputElement>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Staged[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [musicId, setMusicId] = useState<string | undefined>();
  const [musicTitle, setMusicTitle] = useState("");
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicStart, setMusicStart] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stage(blob: Blob, kind: "video" | "image") {
    setItems((prev) => [
      ...prev,
      { id: uid("staged"), kind, blob, url: URL.createObjectURL(blob) },
    ]);
  }

  function removeStaged(id: string) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || !files.length) return;
    Array.from(files).forEach((file) => {
      stage(file, file.type.startsWith("video/") ? "video" : "image");
    });
  }

  async function pickMusic(file: File | undefined) {
    if (!file) return;
    setMusicError(null);
    setMusicBusy(true);
    try {
      const record = await putMedia(file, "audio");
      setMusicId(record.id);
      setMusicTitle(file.name.replace(/\.[^.]+$/, ""));
      setMusicDuration(record.duration || 0);
      setMusicStart(0);
    } catch (err) {
      setMusicError(
        err instanceof Error ? err.message : "Couldn't use that audio file."
      );
    } finally {
      setMusicBusy(false);
    }
  }

  async function share() {
    if (!items.length || sharing) return;
    setSharing(true);
    setError(null);
    try {
      for (const item of items) {
        if (item.kind === "video") {
          const record = await putMedia(item.blob, "video");
          addStoryItem({
            id: uid("story"),
            kind: "video",
            mediaId: record.id,
            duration: record.duration || 0,
            createdAt: Date.now(),
            musicMediaId: musicId,
            musicTitle: musicTitle || undefined,
            musicStart,
            musicVolume,
          });
        } else {
          const dataUrl = await downscale(item.blob, STORY_ASPECT);
          const jpeg = await (await fetch(dataUrl)).blob();
          const record = await putMedia(jpeg, "image");
          addStoryItem({
            id: uid("story"),
            kind: "image",
            mediaId: record.id,
            duration: 5,
            createdAt: Date.now(),
            musicMediaId: musicId,
            musicTitle: musicTitle || undefined,
            musicStart,
            musicVolume,
          });
        }
      }
      items.forEach((i) => URL.revokeObjectURL(i.url));
      router.push("/");
    } catch {
      setError("Couldn't save your story — try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-110px)] bg-white">
      <div className="flex items-center justify-between border-b border-ig-border px-4 py-3">
        <button onClick={() => router.back()} aria-label="Cancel">
          <X size={24} />
        </button>
        <p className="text-base font-semibold">Add to story</p>
        <button
          onClick={share}
          disabled={!items.length || sharing}
          className="text-sm font-semibold text-ig-blue disabled:opacity-40"
        >
          {sharing ? "Sharing…" : "Share"}
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => setShowCamera(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#efefef] py-2 text-sm font-semibold"
        >
          <Camera size={16} /> Camera
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#efefef] py-2 text-sm font-semibold"
        >
          <ImagePlus size={16} /> Gallery
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = "";
        }}
      />

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
                    setMusicDuration(0);
                    setMusicStart(0);
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

              {musicDuration > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[11px] text-ig-muted">
                    Start
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(musicDuration - 1, 0)}
                    step={0.5}
                    value={Math.min(musicStart, Math.max(musicDuration - 1, 0))}
                    onChange={(e) => setMusicStart(Number(e.target.value))}
                    className="h-1 flex-1 accent-ig-blue"
                  />
                  <span className="w-9 text-right text-[11px] tabular-nums text-ig-muted">
                    {musicStart.toFixed(1)}s
                  </span>
                </div>
              )}

              <p className="mt-1.5 text-[11px] leading-4 text-ig-muted">
                Plays across every item you post now, carrying on from one to
                the next instead of restarting. Videos play muted under it.
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
                Pick an audio file from this device to play over your story.
              </p>
              {musicError && (
                <p className="mt-1.5 text-[11px] text-ig-red">{musicError}</p>
              )}
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-8 py-16 text-center text-sm text-ig-muted">
          <p>Add as many photos or clips as you want.</p>
          <p className="mt-1">Each one becomes its own story item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1 pt-1">
          {items.map((item) => (
            <div key={item.id} className="relative aspect-[9/16] bg-ig-bg">
              {item.kind === "video" ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  src={item.url}
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => removeStaged(item.id)}
                aria-label="Remove"
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
              >
                <X size={14} />
              </button>
              {item.kind === "video" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  Video
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="px-4 pt-4 text-sm text-ig-red">{error}</p>}

      {items.length > 0 && (
        <button
          onClick={share}
          disabled={sharing}
          className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Check size={16} />
          {sharing
            ? "Sharing…"
            : `Share ${items.length} item${items.length > 1 ? "s" : ""} to story`}
        </button>
      )}

      {showCamera && (
        <CameraRecorder
          allowPhoto
          defaultMode="photo"
          onClose={() => setShowCamera(false)}
          onCapture={(blob, kind) => {
            setShowCamera(false);
            stage(blob, kind);
          }}
        />
      )}
    </div>
  );
}
