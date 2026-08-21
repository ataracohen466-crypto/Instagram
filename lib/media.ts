"use client";

import { fromBase64, randomBytes, toBase64 } from "./crypto";
import { DB_NAME, DB_VERSION, getActive } from "./vault";

/**
 * Encrypted media store for user video and photos.
 *
 * Video is far too large to base64 into the JSON vault, so clips live as
 * their own encrypted records and the reel only keeps an id. They get the
 * same AES-GCM key as the rest of the account, so a locked vault means
 * unreadable clips.
 */

const MEDIA = "media";

/** Refuses anything a phone would struggle to hold in memory to decrypt. */
export const MAX_CLIP_BYTES = 60 * 1024 * 1024;

export interface MediaRecord {
  id: string;
  iv: string;
  data: ArrayBuffer;
  type: string;
  kind: "video" | "image" | "audio";
  duration: number;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEDIA))
        db.createObjectStore(MEDIA, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(MEDIA, mode);
        const req = run(t.objectStore(MEDIA));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

/** Object URLs are cached so a clip is only decrypted once per session. */
const urlCache = new Map<string, string>();

export function mediaId(): string {
  return `m_${Date.now().toString(36)}_${toBase64(randomBytes(6)).replace(
    /[^a-z0-9]/gi,
    ""
  )}`;
}

/** Reads a clip's duration; works for audio as well as video. */
export function probeDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

export async function putMedia(
  blob: Blob,
  kind: "video" | "image" | "audio"
): Promise<MediaRecord> {
  const active = getActive();
  if (!active) throw new Error("Log in before saving media.");
  if (blob.size > MAX_CLIP_BYTES)
    throw new Error("That clip is too large — keep it under 60MB.");

  const duration =
    kind === "video" || kind === "audio" ? await probeDuration(blob) : 0;
  const iv = randomBytes(12);
  const plain = await blob.arrayBuffer();

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    active.key,
    plain
  );

  const record: MediaRecord = {
    id: mediaId(),
    iv: toBase64(iv),
    data: cipher,
    type:
      blob.type ||
      (kind === "video"
        ? "video/mp4"
        : kind === "audio"
          ? "audio/mpeg"
          : "image/jpeg"),
    kind,
    duration,
    createdAt: Date.now(),
  };

  await tx("readwrite", (s) => s.put(record));
  // Seed the cache so the editor can show it immediately without a round trip.
  urlCache.set(record.id, URL.createObjectURL(blob));
  return record;
}

export async function getMediaUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const active = getActive();
  if (!active) return null;

  const record = await tx<MediaRecord | undefined>("readonly", (s) => s.get(id));
  if (!record) return null;

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(record.iv) as unknown as BufferSource },
      active.key,
      record.data
    );
    const url = URL.createObjectURL(new Blob([plain], { type: record.type }));
    urlCache.set(id, url);
    return url;
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await tx("readwrite", (s) => s.delete(id));
}

/** Called on logout so one account's decrypted clips are not left in memory. */
export function clearMediaCache(): void {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}
