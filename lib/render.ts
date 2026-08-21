"use client";

import { FILTERS, FilterId, TextStyleId, TransitionId } from "./reelTemplates";
import { ReelFrame } from "./reels";
import { getMediaUrl } from "./media";

/**
 * Renders a template's clips into ONE continuous video file.
 *
 * Everything is drawn to a canvas in sequence — filters, transitions and
 * on-screen text are burned in — and captured through MediaRecorder, so the
 * finished reel is a single video rather than a slideshow of separate parts.
 * Audio from each source clip is mixed in at the point it plays.
 *
 * Rendering runs in real time: a 14-second reel takes about 14 seconds.
 */

export const RENDER_WIDTH = 540;
export const RENDER_HEIGHT = 960;

/**
 * WebM first: a browser that can *record* WebM can always decode it back.
 * MP4 is the Safari path, where WebM recording isn't offered.
 */
const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
];

export function renderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    // Older Safari lacks captureStream on canvas.
    typeof document.createElement("canvas").captureStream === "function"
  );
}

/** Never let a stalled element hang the whole export. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

function pickMime(): string | null {
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

/** Draws `src` to fill the canvas, cropping overflow like object-cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  scale = 1,
  dx = 0
) {
  if (!sw || !sh) return;
  const target = RENDER_WIDTH / RENDER_HEIGHT;
  const ratio = sw / sh;

  let w: number, h: number;
  if (ratio > target) {
    h = RENDER_HEIGHT;
    w = h * ratio;
  } else {
    w = RENDER_WIDTH;
    h = w / ratio;
  }
  w *= scale;
  h *= scale;

  ctx.drawImage(
    src,
    (RENDER_WIDTH - w) / 2 + dx,
    (RENDER_HEIGHT - h) / 2,
    w,
    h
  );
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Canvas equivalents of the CSS text styles used during playback. */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyleId,
  alpha: number
) {
  if (!text) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;

  const pad = 48;
  const maxWidth = RENDER_WIDTH - pad * 2;
  let content = text;
  let y = RENDER_HEIGHT / 2;
  let lineHeight = 44;

  switch (style) {
    case "bold-center":
      ctx.font = "800 46px Helvetica, Arial, sans-serif";
      content = text.toUpperCase();
      lineHeight = 50;
      break;
    case "subtitle":
      ctx.font = "600 27px Helvetica, Arial, sans-serif";
      y = RENDER_HEIGHT * 0.62;
      lineHeight = 33;
      break;
    case "handwritten":
      ctx.font = "italic 500 40px Georgia, serif";
      y = RENDER_HEIGHT * 0.22;
      lineHeight = 46;
      break;
    case "counter":
      ctx.font = "900 74px Helvetica, Arial, sans-serif";
      y = RENDER_HEIGHT * 0.2;
      lineHeight = 78;
      break;
    case "minimal-corner":
      ctx.font = "500 21px Helvetica, Arial, sans-serif";
      ctx.textAlign = "left";
      content = text.toUpperCase();
      y = RENDER_HEIGHT * 0.16;
      lineHeight = 26;
      break;
    case "sticker":
      ctx.font = "700 29px Helvetica, Arial, sans-serif";
      y = RENDER_HEIGHT * 0.26;
      lineHeight = 36;
      break;
  }

  const lines = wrap(ctx, content, maxWidth);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    const lineY = startY + i * lineHeight;
    if (style === "sticker") {
      const w = ctx.measureText(line).width;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fff";
      const bx = (RENDER_WIDTH - w) / 2 - 16;
      const by = lineY - lineHeight / 2 - 6;
      ctx.beginPath();
      ctx.roundRect(bx, by, w + 32, lineHeight + 12, 10);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#262626";
      ctx.shadowColor = "transparent";
      ctx.fillText(line, RENDER_WIDTH / 2, lineY);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
    } else if (style === "minimal-corner") {
      ctx.fillText(line, pad, lineY);
    } else {
      ctx.fillText(line, RENDER_WIDTH / 2, lineY);
    }
  });

  ctx.restore();
}

interface LoadedClip {
  frame: ReelFrame;
  video?: HTMLVideoElement;
  image?: HTMLImageElement;
  url?: string;
}

async function loadClip(frame: ReelFrame): Promise<LoadedClip> {
  const url = frame.mediaId
    ? await getMediaUrl(frame.mediaId)
    : frame.imageUrl ?? null;

  if (!url) return { frame };

  if (frame.kind === "video") {
    const video = document.createElement("video");
    // No crossOrigin: these are blob: URLs, and setting it can fail the load.
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await withTimeout(
      new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => resolve();
      }),
      8000
    );
    return { frame, video, url };
  }

  const image = new Image();
  image.src = url;
  await withTimeout(
    new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    }),
    8000
  );
  return { frame, image, url };
}

export interface RenderOptions {
  frames: ReelFrame[];
  filter: FilterId;
  transition: TransitionId;
  textStyle: TextStyleId;
  /** Background music, mixed under the clip audio for the whole reel. */
  musicMediaId?: string;
  /** 0-1. Clip audio ducks as this rises. */
  musicVolume?: number;
  /** Seconds into the track where playback starts — picks which part plays. */
  musicStart?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  duration: number;
}

export async function renderReel({
  frames,
  filter,
  transition,
  textStyle,
  musicMediaId,
  musicVolume = 0.65,
  musicStart = 0,
  onProgress,
  signal,
}: RenderOptions): Promise<RenderResult> {
  const usable = frames.filter((f) => f.mediaId || f.imageUrl);
  if (usable.length === 0) throw new Error("Add at least one clip first.");

  const mime = pickMime();
  if (!renderSupported() || !mime)
    throw new Error("This browser can't export video.");

  const canvas = document.createElement("canvas");
  canvas.width = RENDER_WIDTH;
  canvas.height = RENDER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  const clips = await loadClipsInOrder(usable);
  const totalMs = usable.reduce((n, f) => n + f.seconds * 1000, 0);

  // Mix each clip's audio into one track so the export keeps sound.
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = AudioCtor ? new AudioCtor() : null;
  const audioDest = audioCtx?.createMediaStreamDestination() ?? null;

  /**
   * Audio is decoded up front and scheduled on the AudioContext timeline
   * rather than routed from the <video> elements. Element routing forces the
   * clips to play unmuted, which iOS blocks outside a user gesture — this
   * way every clip can stay muted (always autoplayable) and the sound still
   * lands in the export at the right moment.
   */
  const schedule: {
    buffer: AudioBuffer;
    at: number;
    length: number;
    trimStart: number;
  }[] = [];
  let music: AudioBuffer | null = null;

  if (audioCtx && audioDest && musicMediaId) {
    try {
      const url = await getMediaUrl(musicMediaId);
      if (url) {
        const bytes = await (await fetch(url)).arrayBuffer();
        music = await audioCtx.decodeAudioData(bytes);
      }
    } catch {
      /* unreadable music file — the reel still renders, just without it */
    }
  }

  if (audioCtx && audioDest) {
    let offset = 0;
    for (const clip of clips) {
      const seconds = clip.frame.seconds;
      if (clip.video && clip.url) {
        try {
          const bytes = await (await fetch(clip.url)).arrayBuffer();
          const buffer = await audioCtx.decodeAudioData(bytes);
          schedule.push({
            buffer,
            at: offset,
            length: seconds,
            trimStart: clip.frame.trimStart ?? 0,
          });
        } catch {
          /* silent clip — image, or a video with no decodable audio track */
        }
      }
      offset += seconds;
    }
  }

  const stream = canvas.captureStream(30);
  // Only attach audio when a clip actually has some: an always-silent track
  // can stall the encoder and yield an empty file.
  if ((schedule.length > 0 || music) && audioDest) {
    if (audioCtx?.state === "suspended") await audioCtx.resume();
    audioDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start(200);

  if ((schedule.length > 0 || music) && audioCtx && audioDest) {
    const t0 = audioCtx.currentTime + 0.05;
    const totalSeconds = totalMs / 1000;

    // Clip audio ducks under the music so a backing track stays audible.
    const clipGain = audioCtx.createGain();
    clipGain.gain.value = music ? 1 - musicVolume * 0.7 : 1;
    clipGain.connect(audioDest);

    for (const item of schedule) {
      const node = audioCtx.createBufferSource();
      node.buffer = item.buffer;
      node.connect(clipGain);
      // Start at the same point the video was trimmed to, and stop with it.
      const available = Math.max(item.buffer.duration - item.trimStart, 0);
      node.start(t0 + item.at, item.trimStart, Math.min(item.length, available));
    }

    if (music) {
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = musicVolume;
      musicGain.connect(audioDest);

      const node = audioCtx.createBufferSource();
      node.buffer = music;
      const startAt = Math.min(musicStart, Math.max(music.duration - 0.1, 0));
      const remaining = music.duration - startAt;
      // Loop a short track so it covers the whole reel.
      node.loop = remaining < totalSeconds;
      if (node.loop) {
        node.loopStart = startAt;
        node.loopEnd = music.duration;
      }
      node.connect(musicGain);
      node.start(t0, startAt, node.loop ? totalSeconds : Math.min(totalSeconds, remaining));

      // Fade the last second so it doesn't cut off abruptly.
      const fadeAt = t0 + Math.max(totalSeconds - 1, 0);
      musicGain.gain.setValueAtTime(musicVolume, fadeAt);
      musicGain.gain.linearRampToValueAtTime(0.0001, t0 + totalSeconds);
    }
  }

  const startedAt = performance.now();

  try {
    for (let i = 0; i < clips.length; i++) {
      if (signal?.aborted) break;
      await withTimeout(
        playClip(ctx, clips[i], {
        filter,
        transition,
        textStyle,
        isFirst: i === 0,
        onTick: () => {
          const elapsed = performance.now() - startedAt;
          onProgress?.(Math.min(elapsed / totalMs, 0.999));
        },
          signal,
        }),
        clips[i].frame.seconds * 1000 + 5000
      );
    }
  } finally {
    recorder.stop();
    clips.forEach((c) => c.video?.pause());
  }

  const blob = (await withTimeout(finished, 8000)) as Blob | void;
  if (!blob || !(blob instanceof Blob) || blob.size === 0)
    throw new Error("The encoder produced no video.");
  await audioCtx?.close().catch(() => {});
  onProgress?.(1);

  return { blob, duration: totalMs / 1000 };
}

async function loadClipsInOrder(frames: ReelFrame[]): Promise<LoadedClip[]> {
  const out: LoadedClip[] = [];
  for (const f of frames) out.push(await loadClip(f));
  return out;
}

interface PlayOptions {
  filter: FilterId;
  transition: TransitionId;
  textStyle: TextStyleId;
  isFirst: boolean;
  onTick: () => void;
  signal?: AbortSignal;
}

function playClip(
  ctx: CanvasRenderingContext2D,
  clip: LoadedClip,
  { filter, transition, textStyle, isFirst, onTick, signal }: PlayOptions
): Promise<void> {
  return new Promise((resolve) => {
    const durationMs = clip.frame.seconds * 1000;
    const started = performance.now();
    const filterCss = FILTERS[filter] ?? "none";

    const trimStart = clip.frame.trimStart ?? 0;

    if (clip.video) {
      clip.video.currentTime = trimStart;
      clip.video.loop = true;
      clip.video.muted = true;
      clip.video.play().catch(() => {});
    }

    const step = () => {
      const now = performance.now();
      const elapsed = now - started;
      const t = Math.min(elapsed / durationMs, 1);

      // Keep playback inside the trimmed window even if it's shorter than
      // the source clip's own loop point.
      if (clip.video) {
        const windowEnd = trimStart + clip.frame.seconds;
        if (clip.video.currentTime >= windowEnd || clip.video.currentTime < trimStart - 0.25) {
          clip.video.currentTime = trimStart;
        }
      }

      if (signal?.aborted) {
        resolve();
        return;
      }

      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);

      // Entry effect for this clip, matching the playback transitions.
      let alpha = 1;
      let scale = 1;
      let dx = 0;
      let extraFilter = "";
      const entry = Math.min(elapsed / 450, 1);

      if (!isFirst || transition === "zoom") {
        switch (transition) {
          case "fade":
            alpha = entry;
            break;
          case "zoom":
            scale = 1 + 0.16 * t;
            break;
          case "slide":
            dx = (1 - entry) * RENDER_WIDTH * 0.16;
            alpha = 0.3 + 0.7 * entry;
            break;
          case "flash":
            alpha = 1;
            extraFilter = entry < 1 ? ` brightness(${1 + (1 - entry) * 2})` : "";
            scale = 1 + 0.05 * t;
            break;
          case "whip":
            dx = (1 - entry) * RENDER_WIDTH * 0.32;
            alpha = entry;
            scale = 1 + 0.04 * t;
            break;
          case "blur":
            extraFilter = entry < 1 ? ` blur(${(1 - entry) * 14}px)` : "";
            scale = 1 + 0.05 * t;
            break;
        }
      }

      ctx.globalAlpha = alpha;
      ctx.filter = `${filterCss === "none" ? "" : filterCss}${extraFilter}`.trim() || "none";

      if (clip.video && clip.video.videoWidth) {
        drawCover(
          ctx,
          clip.video,
          clip.video.videoWidth,
          clip.video.videoHeight,
          scale,
          dx
        );
      } else if (clip.image && clip.image.naturalWidth) {
        drawCover(
          ctx,
          clip.image,
          clip.image.naturalWidth,
          clip.image.naturalHeight,
          scale,
          dx
        );
      }
      ctx.restore();

      // The gradient the feed shows over every reel, so text stays readable.
      const grad = ctx.createLinearGradient(0, RENDER_HEIGHT * 0.55, 0, RENDER_HEIGHT);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, RENDER_HEIGHT * 0.55, RENDER_WIDTH, RENDER_HEIGHT * 0.45);

      drawText(ctx, clip.frame.text, textStyle, Math.min(entry, 1));
      onTick();

      if (elapsed >= durationMs) {
        clip.video?.pause();
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });
}
