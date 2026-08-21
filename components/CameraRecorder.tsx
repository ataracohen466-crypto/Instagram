"use client";

import { useEffect, useRef, useState } from "react";
import { X, Pause, Play, RotateCcw, Check, RefreshCw } from "lucide-react";

/**
 * A real in-app camera: getUserMedia for the live feed, MediaRecorder for
 * capture. MediaRecorder's own pause()/resume() is what makes "pause and
 * keep filming" possible — the paused interval is simply not recorded, and
 * stop() still yields one continuous clip, not separate segments to stitch.
 *
 * A file-picker Record button can only launch the OS camera app, which
 * offers no way to expose a pause control — this component exists because
 * that control has to run inside our own page.
 */

type Phase = "idle" | "recording" | "paused" | "reviewing";
type Mode = "video" | "photo";

function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
      return m;
  }
  return "";
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CameraRecorder({
  onCapture,
  onClose,
  allowPhoto = true,
  defaultMode = "video",
}: {
  onCapture: (blob: Blob, kind: "video" | "image") => void;
  onClose: () => void;
  allowPhoto?: boolean;
  defaultMode?: Mode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [canFlip, setCanFlip] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; kind: "video" | "image"; blob: Blob } | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera(nextFacing: "user" | "environment" = facing) {
    setError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
      } catch {
        /* device enumeration is best-effort */
      }
    } catch {
      setError(
        "Couldn't reach the camera. Check the browser has camera permission and try again."
      );
    }
  }

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function tick() {
    setElapsedMs(accumulatedRef.current + (performance.now() - startedAtRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(
      streamRef.current,
      mime ? { mimeType: mime } : undefined
    );
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      setPreview({ url: URL.createObjectURL(blob), kind: "video", blob });
      setPhase("reviewing");
    };
    recorderRef.current = rec;
    rec.start(200);
    accumulatedRef.current = 0;
    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setPhase("recording");
    rafRef.current = requestAnimationFrame(tick);
  }

  function pauseRecording() {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    accumulatedRef.current += performance.now() - startedAtRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPhase("paused");
  }

  function resumeRecording() {
    if (recorderRef.current?.state !== "paused") return;
    recorderRef.current.resume();
    startedAtRef.current = performance.now();
    setPhase("recording");
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopRecording() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreview({ url: URL.createObjectURL(blob), kind: "image", blob });
        setPhase("reviewing");
      },
      "image/jpeg",
      0.9
    );
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPhase("idle");
    startCamera();
  }

  function usePhoto() {
    if (preview) onCapture(preview.blob, preview.kind);
  }

  function flipCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    startCamera(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Live feed / review */}
      <div className="relative flex-1 overflow-hidden">
        {phase === "reviewing" && preview ? (
          preview.kind === "video" ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              src={preview.url}
              autoPlay
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className={`h-full w-full object-cover ${
              facing === "user" ? "-scale-x-100" : ""
            }`}
          />
        )}

        {error && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-black/70 p-4 text-center text-sm text-white">
            {error}
          </div>
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close camera"
            className="rounded-full bg-black/40 p-2 text-white"
          >
            <X size={22} />
          </button>

          {(phase === "recording" || phase === "paused") && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[13px] font-semibold text-white">
              <span
                className={`h-2 w-2 rounded-full bg-red-500 ${
                  phase === "recording" ? "animate-pulse" : ""
                }`}
              />
              {formatTime(elapsedMs)}
              {phase === "paused" && " · paused"}
            </span>
          )}

          {phase === "idle" && canFlip ? (
            <button
              onClick={flipCamera}
              aria-label="Flip camera"
              className="rounded-full bg-black/40 p-2 text-white"
            >
              <RefreshCw size={20} />
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black px-6 pb-8 pt-5">
        {phase === "reviewing" ? (
          <div className="flex items-center justify-between">
            <button
              onClick={retake}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RotateCcw size={16} /> Retake
            </button>
            <button
              onClick={usePhoto}
              className="flex items-center gap-1.5 rounded-full bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Check size={16} /> Use this
            </button>
          </div>
        ) : (
          <>
            {allowPhoto && phase === "idle" && (
              <div className="mb-4 flex justify-center gap-1.5">
                <button
                  onClick={() => setMode("photo")}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold ${
                    mode === "photo" ? "bg-white text-black" : "bg-white/15 text-white"
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setMode("video")}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold ${
                    mode === "video" ? "bg-white text-black" : "bg-white/15 text-white"
                  }`}
                >
                  Video
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-8">
              {phase === "idle" && (
                <button
                  onClick={mode === "photo" ? takePhoto : startRecording}
                  aria-label={mode === "photo" ? "Take photo" : "Start recording"}
                  className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white"
                >
                  <span
                    className={
                      mode === "photo"
                        ? "h-[58px] w-[58px] rounded-full bg-white"
                        : "h-[58px] w-[58px] rounded-full bg-red-600"
                    }
                  />
                </button>
              )}

              {phase === "recording" && (
                <>
                  <button
                    onClick={pauseRecording}
                    aria-label="Pause recording"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white"
                  >
                    <Pause size={26} />
                  </button>
                  <button
                    onClick={stopRecording}
                    aria-label="Stop recording"
                    className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white"
                  >
                    <span className="h-7 w-7 rounded-md bg-red-600" />
                  </button>
                </>
              )}

              {phase === "paused" && (
                <>
                  <button
                    onClick={resumeRecording}
                    aria-label="Resume recording"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white"
                  >
                    <Play size={24} fill="white" />
                  </button>
                  <button
                    onClick={stopRecording}
                    aria-label="Finish recording"
                    className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white"
                  >
                    <span className="h-7 w-7 rounded-md bg-red-600" />
                  </button>
                </>
              )}
            </div>

            {phase === "recording" && (
              <p className="mt-3 text-center text-[12px] text-white/70">
                Pause any time — filming picks back up as one clip.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
