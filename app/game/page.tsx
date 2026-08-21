"use client";

import { useRef, useState } from "react";
import { Mic, Trophy, Flame, Target } from "lucide-react";
import { BUILT_IN_SONGS } from "@/lib/songs";
import { OnsetTracker } from "@/lib/audio/onset";
import { computeChroma, matchChord } from "@/lib/audio/chroma";
import { buildChordTimeline } from "@/lib/audio/analysis";
import { useGuitarAI, usePersonalRecord } from "@/lib/store";
import type { GameScore } from "@/lib/types";

interface GameNote {
  id: number;
  chordId: string;
  targetMs: number;
  judged: boolean;
  result?: "perfect" | "good" | "miss";
}

const TRAVEL_MS = 1800;
const HIT_WINDOW_MS = 320;

type Phase = "pick" | "ready" | "playing" | "done";

export default function GamePage() {
  const [songIdx, setSongIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("pick");
  const [notes, setNotes] = useState<GameNote[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [finalScore, setFinalScore] = useState<GameScore | null>(null);

  const song = BUILT_IN_SONGS[songIdx];
  const addGameScore = useGuitarAI((s) => s.addGameScore);
  const personalBest = usePersonalRecord();

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const notesRef = useRef<GameNote[]>([]);
  const onsetTracker = useRef(new OnsetTracker());
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const durationRef = useRef(0);

  async function start() {
    const { timeline, totalMs } = buildChordTimeline(song);
    const gameNotes: GameNote[] = timeline.map((w, i) => ({ id: i, chordId: w.chordId, targetMs: w.startMs + 200, judged: false }));
    notesRef.current = gameNotes;
    setNotes(gameNotes);
    durationRef.current = totalMs;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    setStreak(0);
    setBestStreak(0);
    setFeedback("");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;
    onsetTracker.current.reset();

    startRef.current = performance.now();
    setPhase("playing");
    tick();
  }

  function judgeNote(note: GameNote, offsetMs: number, chordCorrect: boolean) {
    const abs = Math.abs(offsetMs);
    let result: GameNote["result"];
    if (abs <= 120 && chordCorrect) result = "perfect";
    else if (abs <= HIT_WINDOW_MS && chordCorrect) result = "good";
    else result = "miss";

    note.judged = true;
    note.result = result;

    if (result === "miss") {
      streakRef.current = 0;
      setFeedback(chordCorrect ? "A little off the beat — stay locked to the rhythm." : `Not quite — that's a ${note.chordId}.`);
    } else {
      streakRef.current += 1;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setFeedback(result === "perfect" ? "Perfect!" : "Nice, right on time.");
    }
    setStreak(streakRef.current);
    setBestStreak(bestStreakRef.current);
    setNotes([...notesRef.current]);
  }

  function tick() {
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;
    const el = performance.now() - startRef.current;
    setElapsed(el);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const onsetDetected = onsetTracker.current.push(freqData, el);

    if (onsetDetected) {
      const candidates = notesRef.current.filter((n) => !n.judged && Math.abs(n.targetMs - el) <= HIT_WINDOW_MS);
      candidates.sort((a, b) => Math.abs(a.targetMs - el) - Math.abs(b.targetMs - el));
      const note = candidates[0];
      if (note) {
        const chroma = computeChroma(freqData, ctx.sampleRate, analyser.fftSize);
        const match = matchChord(chroma);
        const chordCorrect = match?.chordId === note.chordId;
        judgeNote(note, el - note.targetMs, chordCorrect);
      }
    }

    // Auto-miss notes whose window has passed.
    for (const n of notesRef.current) {
      if (!n.judged && el - n.targetMs > HIT_WINDOW_MS) {
        n.judged = true;
        n.result = "miss";
        streakRef.current = 0;
      }
    }

    if (el >= durationRef.current + 500) {
      endGame();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function endGame() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();

    const total = notesRef.current.length;
    const hits = notesRef.current.filter((n) => n.result === "perfect" || n.result === "good").length;
    const accuracy = total ? Math.round((hits / total) * 100) : 0;
    const perfects = notesRef.current.filter((n) => n.result === "perfect").length;
    const timingAccuracy = hits ? Math.round((perfects / hits) * 100) : 0;

    const score: GameScore = {
      date: new Date().toISOString(),
      songTitle: song.title,
      accuracy,
      timingAccuracy,
      bestStreak: bestStreakRef.current,
      notesHit: hits,
      notesTotal: total,
    };
    setFinalScore(score);
    addGameScore(score);
    setPhase("done");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Guitar Game</h1>
          <p className="mt-1 text-ink-300">Play the right chord, right on the beat.</p>
        </div>
        {personalBest && (
          <div className="flex items-center gap-1.5 text-sm text-gold-400">
            <Trophy size={16} /> Best {personalBest.accuracy}%
          </div>
        )}
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
                <p className="text-xs text-ink-400">{s.bpm} BPM · {s.chordsUsed.join(", ")}</p>
              </div>
              <span>{"★".repeat(s.difficulty)}{"☆".repeat(5 - s.difficulty)}</span>
            </button>
          ))}
          <button className="btn-primary w-full" onClick={() => setPhase("ready")}>
            Play {song.title}
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="card space-y-4 p-6 text-center">
          <h2 className="font-display text-xl font-semibold">{song.title}</h2>
          <p className="text-sm text-ink-300">
            Chords will scroll toward the hit line — strum the chord shown just as it arrives. We listen through your mic for both timing and the chord itself.
          </p>
          <button className="btn-primary" onClick={start}>
            <Mic size={18} /> Start game
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-coral-400">
              <Flame size={16} /> Streak {streak}
            </span>
            <span className="text-ink-400">{feedback}</span>
            <span className="flex items-center gap-1.5 text-teal-400">
              <Target size={16} /> Best {bestStreak}
            </span>
          </div>

          <div className="relative h-40 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
            <div className="absolute inset-y-0 left-6 w-1 rounded bg-gold-500" />
            {notes.map((n) => {
              const percent = ((elapsed - (n.targetMs - TRAVEL_MS)) / TRAVEL_MS) * 100;
              if (percent < -5 || percent > 108) return null;
              const leftPct = 100 - percent;
              const color =
                n.result === "perfect" ? "bg-teal-500 text-ink-950" : n.result === "good" ? "bg-gold-500 text-ink-950" : n.result === "miss" ? "bg-ink-700 text-ink-400 line-through" : "bg-ink-700 text-ink-100";
              return (
                <div
                  key={n.id}
                  className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-sm font-bold shadow-soft ${color}`}
                  style={{ left: `${leftPct}%` }}
                >
                  {n.chordId}
                </div>
              );
            })}
          </div>

          <div className="h-2 w-full rounded-full bg-ink-700">
            <div className="h-2 rounded-full bg-gold-500 transition-all" style={{ width: `${Math.min(100, (elapsed / durationRef.current) * 100)}%` }} />
          </div>
        </div>
      )}

      {phase === "done" && finalScore && (
        <div className="card space-y-4 p-6 text-center">
          <Trophy size={32} className="mx-auto text-gold-400" />
          <h2 className="font-display text-2xl font-semibold">{finalScore.accuracy}% accuracy</h2>
          <div className="flex justify-center gap-6 text-sm text-ink-300">
            <span>Timing: {finalScore.timingAccuracy}%</span>
            <span>Best streak: {finalScore.bestStreak}</span>
            <span>{finalScore.notesHit}/{finalScore.notesTotal} chords</span>
          </div>
          <div className="flex justify-center gap-3">
            <button className="btn-secondary" onClick={() => setPhase("pick")}>
              Choose another song
            </button>
            <button className="btn-primary" onClick={start}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
