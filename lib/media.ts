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

/**
 * Long clips are encrypted a slice at a time. Whole-file encryption needs the
 * plaintext and the ciphertext in memory at once, so a 500MB video would peak
 * over a gigabyte and take a phone down with it. Chunking holds one slice at
 * a time instead, which is what makes ten-minute uploads survivable.
 */
const CHUNK_BYTES = 4 * 1024 * 1024;

/** Ten minutes, the longest clip the app accepts. */
export const MAX_CLIP_SECONDS = 600;

/** Enough headroom for ten minutes of typical phone video. */
export const MAX_CLIP_BYTES = 512 * 1024 * 1024;

interface EncryptedChunk {
  iv: string;
  data: ArrayBuffer;
}

export interface MediaRecord {
  id: string;
  /** Single-shot payload, written before chunking existed. Still readable. */
  iv?: string;
  data?: ArrayBuffer;
  /** Chunked payload — how everything is written now. */
  chunks?: EncryptedChunk[];
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

/**
 * Reads a clip's duration; works for audio as well as video.
 *
 * A MediaRecorder-produced WebM has no Cues element, so its initial
 * `duration` reads as Infinity/NaN rather than the real length. The
 * standard workaround: seek near the end, which forces the browser to
 * scan the file and resolve the true duration, then seek back to 0.
 */
export function probeDuration(
  file: Blob,
  kind: "video" | "audio" = "video"
): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    // Audio probed through a <video> element stalls on some browsers — most
    // reliably on iOS — so give a track the element it belongs in.
    const el =
      kind === "audio"
        ? document.createElement("audio")
        : document.createElement("video");
    el.preload = "metadata";
    el.muted = true;

    let settled = false;
    const finish = (d: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(overall);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };

    /**
     * A format the browser can't decode often just stalls: no metadata, no
     * error, nothing. Without this the promise never settles and the whole
     * upload hangs with no feedback, so the length is given up on instead.
     */
    const overall = setTimeout(() => finish(0), 12_000);

    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration)) {
        finish(el.duration);
        return;
      }
      // Headerless duration — force a scan by seeking past the true end.
      el.currentTime = 1e9;
      const onSeeked = () => {
        el.removeEventListener("timeupdate", onSeeked);
        const d = Number.isFinite(el.duration) ? el.duration : 0;
        el.currentTime = 0;
        finish(d);
      };
      el.addEventListener("timeupdate", onSeeked);
      // Some browsers never fire timeupdate for this seek; don't hang forever.
      setTimeout(() => {
        el.removeEventListener("timeupdate", onSeeked);
        finish(Number.isFinite(el.duration) ? el.duration : 0);
      }, 3000);
    };
    el.onerror = () => finish(0);
    el.src = url;
  });
}

export async function putMedia(
  blob: Blob,
  kind: "video" | "image" | "audio"
): Promise<MediaRecord> {
  const active = getActive();
  if (!active) throw new Error("Log in before saving media.");
  if (blob.size > MAX_CLIP_BYTES)
    throw new Error(
      `That clip is too large — keep it under ${Math.round(
        MAX_CLIP_BYTES / (1024 * 1024)
      )}MB.`
    );

  const duration =
    kind === "video" || kind === "audio" ? await probeDuration(blob, kind) : 0;

  // A zero here means the duration couldn't be read, not that it's short.
  // Only clips are capped — a backing track can run as long as it likes.
  if (kind === "video" && duration > MAX_CLIP_SECONDS)
    throw new Error(
      `That clip is ${Math.round(duration / 60)} minutes — keep it under ${
        MAX_CLIP_SECONDS / 60
      }.`
    );

  // One slice at a time, so peak memory is a chunk rather than the whole file.
  const chunks: EncryptedChunk[] = [];
  for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
    const slice = blob.slice(offset, Math.min(offset + CHUNK_BYTES, blob.size));
    const iv = randomBytes(12);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      active.key,
      await slice.arrayBuffer()
    );
    chunks.push({ iv: toBase64(iv), data: cipher });
  }

  const record: MediaRecord = {
    id: mediaId(),
    chunks,
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
    let blob: Blob;

    if (record.chunks) {
      // Decrypted slices go straight into a Blob, which the browser can spill
      // to disk — never assembling the whole clip in one buffer.
      const parts: ArrayBuffer[] = [];
      for (const chunk of record.chunks) {
        parts.push(
          await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: fromBase64(chunk.iv) as unknown as BufferSource,
            },
            active.key,
            chunk.data
          )
        );
      }
      blob = new Blob(parts, { type: record.type });
    } else if (record.data && record.iv) {
      const plain = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: fromBase64(record.iv) as unknown as BufferSource,
        },
        active.key,
        record.data
      );
      blob = new Blob([plain], { type: record.type });
    } else {
      return null;
    }

    const url = URL.createObjectURL(blob);
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
