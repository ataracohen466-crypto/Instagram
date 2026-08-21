"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BUILT_IN_SONGS } from "@/lib/songs";
import { Metronome } from "@/lib/audio/metronome";
import { OnsetTracker } from "@/lib/audio/onset";
import { computeChroma, matchChord } from "@/lib/audio/chroma";
import { buildChordTimeline, expectedChordAt, analyzePerformance, type ChordSample } from "@/lib/audio/analysis";
import { buildFixRoutine } from "@/lib/routine";
import { useGuitarAI } from "@/lib/store";
import type { FixMyPlayingReport } from "@/lib/types";

type Phase = "pick" | "ready" | "recording" | "analyzing" | "report";

export default function FixMyPlayingPage() {
  const [songIdx, setSongIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("pick");
  const [report, setReport] = useState<FixMyPlayingReport | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const addFixReport = useGuitarAI((s) => s.addFixReport);

  const song = BUILT_IN_SONGS[songIdx];

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metroRef = useRef<Metronome | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const samplesRef = useRef<ChordSample[]>([]);
  const lastSampleAt = useRef(0);
  const onsetTracker = useRef(new OnsetTracker());

  async function record() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const { timeline, totalMs, totalBars, beatsPerBar } = buildChordTimeline(song);
    onsetTracker.current.reset();
    samplesRef.current = [];
    startRef.current = performance.now();

    const beats = beatsPerBar;
    const metro = new Metronome(ctx, song.bpm, beats);
    metroRef.current = metro;
    metro.start();

    setPhase("recording");

    const tick = () => {
      const el = performance.now() - startRef.current;
      setProgressPct(Math.min(100, (el / totalMs) * 100));

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      onsetTracker.current.push(freqData, el);

      if (el - lastSampleAt.current > 300) {
        lastSampleAt.current = el;
        const chroma = computeChroma(freqData, ctx.sampleRate, analyser.fftSize);
        const energy = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        const expected = expectedChordAt(timeline, el);
        if (energy > 6 && expected) {
          const match = matchChord(chroma);
          if (match) samplesRef.current.push({ expected, matched: match.chordId, confidence: match.confidence, atMs: el });
        }
      }

      if (el >= totalMs) {
        finish(totalBars, beatsPerBar);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function finish(totalBars: number, beatsPerBar: number) {
    setPhase("analyzing");
    metroRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();

    const onsetsRelative = onsetTracker.current.onsets;
    const result = analyzePerformance(song, samplesRef.current, onsetsRelative, totalBars, beatsPerBar);

    let summary = "";
    try {
      const res = await fetch("/api/ai/fix-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songTitle: song.title, overallAccuracy: result.overallAccuracy, issues: result.issues }),
      });
      const data = await res.json();
      summary = data.summary;
    } catch {
      summary = "Nice work getting through the whole song — check the report below for what to focus on next.";
    }

    const routine = buildFixRoutine(result.issues.map((i) => i.label), 15);
    const finalReport: FixMyPlayingReport = {
      songTitle: song.title,
      overallAccuracy: result.overallAccuracy,
      timingScore: result.timingScore,
      chordAccuracy: result.chordAccuracy,
      issues: result.issues,
      summary,
      routine,
      createdAt: new Date().toISOString(),
    };
    setReport(finalReport);
    addFixReport(finalReport);
    setPhase("report");
  }

  function stopEarly() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const { totalBars, beatsPerBar } = buildChordTimeline(song);
    finish(totalBars, beatsPerBar);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Fix My Playing</h1>
        <p className="mt-1 text-ink-300">Play a full song along with the click track — we'll analyze your chords and timing in real time.</p>
      </div>

      {phase === "pick" && (
        <div className="space-y-3">
          {BUILT_IN_SONGS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setSongIdx(i)}
              className={`card flex w-full items-center justify-between p-4 text-left ${songIdx === i ? "ring-2 ring-gold-500" : ""}`}
            >
              <div>
                <p className="font-medium text-ink-100">{s.title}</p>
                <p className="text-xs text-ink-400">{s.bpm} BPM · {s.timeSignature} · {s.chordsUsed.join(", ")}</p>
              </div>
              <span>{"★".repeat(s.difficulty)}{"☆".repeat(5 - s.difficulty)}</span>
            </button>
          ))}
          <button className="btn-primary w-full" onClick={() => setPhase("ready")}>
            Use {song.title}
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="card space-y-4 p-6 text-center">
          <h2 className="font-display text-xl font-semibold">{song.title}</h2>
          <p className="text-sm text-ink-300">
            A click track will play at {song.bpm} BPM. Play along on your guitar — we'll listen through your microphone the whole time.
          </p>
          <button className="btn-primary" onClick={record}>
            <Mic size={18} /> Start recording
          </button>
        </div>
      )}

      {phase === "recording" && (
        <div className="card space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 animate-pulse-ring items-center justify-center rounded-full bg-coral-500/20">
            <Mic size={24} className="text-coral-400" />
          </div>
          <p className="text-sm text-ink-300">Listening... play through {song.title}.</p>
          <div className="h-2 w-full rounded-full bg-ink-700">
            <div className="h-2 rounded-full bg-gold-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <button className="btn-secondary" onClick={stopEarly}>
            <Square size={16} /> Stop & analyze
          </button>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Loader2 size={28} className="animate-spin text-gold-400" />
          <p className="text-ink-300">Analyzing your performance...</p>
        </div>
      )}

      {phase === "report" && report && (
        <div className="space-y-5">
          <div className="card p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-400">Session report</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{report.overallAccuracy}% overall</h2>
            <p className="mt-3 text-sm text-ink-200">{report.summary}</p>
          </div>

          <div className="card p-6">
            <h3 className="font-display font-semibold">Biggest areas to improve</h3>
            <div className="mt-3 space-y-3">
              {report.issues.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-teal-400">
                  <CheckCircle2 size={16} /> No major issues detected — great pass!
                </p>
              )}
              {report.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-ink-900/50 p-3">
                  <AlertTriangle
                    size={16}
                    className={`mt-0.5 shrink-0 ${issue.severity === "high" ? "text-coral-400" : issue.severity === "medium" ? "text-gold-400" : "text-ink-400"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-100">
                      {i + 1}. {issue.label} {issue.metric && <span className="text-ink-400">— {issue.metric}</span>}
                    </p>
                    <p className="text-sm text-ink-300">{issue.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-display font-semibold">Your personalized practice routine</h3>
            <div className="mt-3 space-y-2">
              {report.routine.map((ex) => (
                <div key={ex.id} className="rounded-lg bg-ink-900/50 p-3 text-sm">
                  <span className="font-medium text-ink-100">{ex.title}</span> <span className="text-ink-400">· {ex.minutes} min</span>
                  <p className="mt-1 text-ink-300">{ex.instructions}</p>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-secondary w-full" onClick={() => setPhase("pick")}>
            Try another song
          </button>
        </div>
      )}
    </div>
  );
}
