"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play } from "lucide-react";
import type { SongArrangement } from "@/lib/types";
import { buildLyricTimeline } from "@/lib/lyrics";
import { computeChroma, matchChord } from "@/lib/audio/chroma";
import { Metronome } from "@/lib/audio/metronome";
import ChordDiagram from "@/components/ChordDiagram";

type Phase = "ready" | "playing" | "done";

export default function PlaySong({ song }: { song: SongArrangement }) {
  const { lines, totalMs } = buildLyricTimeline(song);
  const [phase, setPhase] = useState<Phase>("ready");
  const [cursor, setCursor] = useState(-1);
  const [feedback, setFeedback] = useState("Ready when you are.");
  const [error, setError] = useState<string | null>(null);
  const [hitLines, setHitLines] = useState<Record<number, boolean>>({});

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metroRef = useRef<Metronome | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const hitLinesRef = useRef<Record<number, boolean>>({});

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setError(null);
    setHitLines({});
    hitLinesRef.current = {};
    setCursor(-1);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const beats = Number(song.timeSignature.split("/")[0]) || 4;
      const metro = new Metronome(ctx, song.bpm, beats);
      metroRef.current = metro;
      metro.start();

      startRef.current = performance.now();
      setPhase("playing");
      setFeedback("Here we go — follow the highlighted line.");
      tick();
    } catch {
      setError("Microphone access isn't available here, but you can still follow along — press start to scroll the lyrics at tempo.");
      startWithoutMic();
    }
  }

  function startWithoutMic() {
    startRef.current = performance.now();
    setPhase("playing");
    tick();
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    metroRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
  }

  function tick() {
    const el = performance.now() - startRef.current;
    const idx = lines.findIndex((l) => el >= l.startMs && el < l.endMs);
    if (idx !== -1 && idx !== cursor) {
      setCursor(idx);
      lineRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (analyser && ctx && idx !== -1) {
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      const energy = freqData.reduce((a, b) => a + b, 0) / freqData.length;
      if (energy > 6) {
        const chroma = computeChroma(freqData, ctx.sampleRate, analyser.fftSize);
        const match = matchChord(chroma);
        if (match && match.chordId === lines[idx].chordId && match.confidence > 0.7) {
          if (!hitLinesRef.current[idx]) {
            hitLinesRef.current = { ...hitLinesRef.current, [idx]: true };
            setHitLines(hitLinesRef.current);
            setFeedback("Nice — right chord, right line.");
          }
        }
      }
    }

    if (el >= totalMs) {
      stop();
      setPhase("done");
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  const hitCount = Object.keys(hitLines).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm text-ink-200">
          <Mic size={14} className={phase === "playing" ? "text-teal-400" : "text-ink-500"} />
          {feedback}
        </div>
        {phase !== "playing" ? (
          <button className="btn-primary shrink-0" onClick={start}>
            <Play size={16} /> {phase === "done" ? "Play again" : "Play song"}
          </button>
        ) : (
          <button className="btn-secondary shrink-0" onClick={() => { stop(); setPhase("ready"); }}>
            <Square size={16} /> Stop
          </button>
        )}
      </div>

      {error && <p className="text-xs text-coral-400">{error}</p>}

      <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-xl border border-ink-700 bg-ink-950 p-4">
        {lines.map((line, i) => (
          <div
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
              i === cursor ? "bg-gold-500/15" : hitLines[i] ? "opacity-60" : ""
            }`}
          >
            <span className={`w-12 shrink-0 text-center font-mono text-sm font-semibold ${i === cursor ? "text-gold-400" : "text-ink-400"}`}>
              {line.chordId}
            </span>
            <span className={`text-sm ${i === cursor ? "font-medium text-ink-100" : "text-ink-300"}`}>{line.text}</span>
          </div>
        ))}
      </div>

      {phase === "done" && (
        <p className="text-center text-sm text-teal-400">
          All the way through — matched the right chord on {hitCount}/{lines.length} lines.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {Array.from(new Set(lines.map((l) => l.chordId))).map((c) => (
          <ChordDiagram key={c} chordId={c} size={72} />
        ))}
      </div>
    </div>
  );
}
