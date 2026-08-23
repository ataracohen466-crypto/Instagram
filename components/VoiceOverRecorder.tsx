"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mic, Pause, Play, Square, RotateCcw, Check } from "lucide-react";

/**
 * Records narration to lay over a reel.
 *
 * Audio-only getUserMedia, so it never lights the camera, and the same
 * pause/resume trick the camera uses: the paused stretch simply isn't
 * recorded, so stopping yields one continuous take rather than pieces to
 * stitch back together.
 */

type Phase = "idle" | "recording" | "paused" | "reviewing";

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
      return m;
  }
  return "";
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export default function VoiceOverRecorder({
  onCapture,
  onClose,
  /** Shown as the target length so narration can be paced to the reel. */
  reelSeconds,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  reelSeconds: number;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function stopMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopMic();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function tick() {
    setElapsedMs(accumulatedRef.current + (performance.now() - startedAtRef.current));

    // A live meter is the only way to tell the mic is actually picking you up.
    const analyser = analyserRef.current;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
      }
      setLevel(peak);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      }

      chunksRef.current = [];
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        setPreview({ url: URL.createObjectURL(blob), blob });
        setPhase("reviewing");
        stopMic();
      };
      recorderRef.current = rec;
      rec.start(200);

      accumulatedRef.current = 0;
      startedAtRef.current = performance.now();
      setElapsedMs(0);
      setPhase("recording");
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError(
        "Couldn't reach the microphone. Check the browser has mic permission and try again."
      );
    }
  }

  function pauseRecording() {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    accumulatedRef.current += performance.now() - startedAtRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLevel(0);
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

  function retake() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setElapsedMs(0);
    setPhase("idle");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => {
            stopRecording();
            stopMic();
            onClose();
          }}
          aria-label="Close voiceover"
          className="rounded-full bg-white/10 p-2 text-white"
        >
          <X size={22} />
        </button>
        <p className="text-sm font-semibold text-white">Voiceover</p>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 transition-transform"
          style={{ transform: `scale(${1 + level * 0.35})` }}
        >
          <Mic size={44} className="text-white" />
        </div>

        <div className="text-center">
          <p className="text-3xl font-semibold tabular-nums text-white">
            {formatTime(elapsedMs)}
          </p>
          <p className="mt-1 text-[12px] text-white/60">
            reel is {reelSeconds.toFixed(1)}s long
          </p>
          {phase === "paused" && (
            <p className="mt-1 text-[12px] text-white/70">
              paused — press play to keep going
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-black/70 p-3 text-center text-sm text-white">
            {error}
          </p>
        )}

        {phase === "reviewing" && preview && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio src={preview.url} controls className="w-full" />
        )}
      </div>

      <div className="px-6 pb-10">
        {phase === "reviewing" ? (
          <div className="flex items-center justify-between">
            <button
              onClick={retake}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RotateCcw size={16} /> Redo
            </button>
            <button
              onClick={() => preview && onCapture(preview.blob)}
              className="flex items-center gap-1.5 rounded-full bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Check size={16} /> Use voiceover
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            {phase === "idle" && (
              <button
                onClick={startRecording}
                aria-label="Start voiceover"
                className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white"
              >
                <span className="h-[58px] w-[58px] rounded-full bg-red-600" />
              </button>
            )}

            {(phase === "recording" || phase === "paused") && (
              <>
                <button
                  onClick={phase === "recording" ? pauseRecording : resumeRecording}
                  aria-label={
                    phase === "recording" ? "Pause voiceover" : "Resume voiceover"
                  }
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white"
                >
                  {phase === "recording" ? (
                    <Pause size={26} />
                  ) : (
                    <Play size={24} fill="white" />
                  )}
                </button>
                <button
                  onClick={stopRecording}
                  aria-label="Finish voiceover"
                  className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white"
                >
                  <Square size={26} fill="#dc2626" className="text-red-600" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
