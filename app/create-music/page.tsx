"use client";

import { useRef, useState } from "react";
import { Sparkles, Loader2, Play, Square } from "lucide-react";
import ChordDiagram from "@/components/ChordDiagram";
import TabViewer from "@/components/TabViewer";
import StrumPattern from "@/components/StrumPattern";
import { Metronome } from "@/lib/audio/metronome";
import type { Composition } from "@/lib/types";

const SUGGESTIONS = [
  "Make me a dreamy beginner guitar song",
  "Write an upbeat folk tune for a road trip",
  "Compose a melancholic fingerstyle piece",
  "Give me a playful pop progression for a summer video",
];

export default function CreateMusicPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const metroRef = useRef<Metronome | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  async function compose() {
    if (!prompt.trim()) return;
    setLoading(true);
    setComposition(null);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setComposition(data.composition);
      setSource(data.source);
    } finally {
      setLoading(false);
    }
  }

  function toggleBacking() {
    if (!composition) return;
    if (playing) {
      metroRef.current?.stop();
      ctxRef.current?.close();
      setPlaying(false);
      return;
    }
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current = ctx;
    const beats = Number(composition.timeSignature.split("/")[0]) || 4;
    const metro = new Metronome(ctx, composition.bpm, beats);
    metroRef.current = metro;
    metro.start();
    setPlaying(true);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Create Music</h1>
        <p className="mt-1 text-ink-300">Describe a song and get a fully original composition — chords, melody shape, tab, and how to practice it.</p>
      </div>

      <div className="card space-y-4 p-5">
        <textarea
          className="input min-h-[100px] resize-none"
          placeholder='e.g. "Make me a dreamy beginner guitar song"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setPrompt(s)} className="rounded-full border border-ink-600 px-3 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400">
              {s}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={compose} disabled={loading || !prompt.trim()}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? "Composing..." : "Compose original song"}
        </button>
      </div>

      {composition && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-display text-xl font-semibold">{composition.title}</h2>
            <p className="mt-1 text-xs italic text-ink-400">{composition.originalNote}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-300">
              <span>Mood: {composition.mood}</span>
              <span>Difficulty: {"★".repeat(composition.difficulty)}{"☆".repeat(5 - composition.difficulty)}</span>
              <span>{composition.bpm} BPM</span>
              <span>{composition.timeSignature}</span>
              {source === "fallback" && <span className="text-ink-500">(offline composition engine)</span>}
            </div>
            <p className="mt-4 text-sm text-ink-300">{composition.melodyDescription}</p>
            <div className="mt-4 flex items-center gap-3">
              <button className="btn-secondary" onClick={toggleBacking}>
                {playing ? <Square size={16} /> : <Play size={16} />}
                {playing ? "Stop backing click" : "Play backing click track"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {composition.chordsUsed.map((c) => (
              <ChordDiagram key={c} chordId={c} size={96} />
            ))}
          </div>

          <div className="space-y-4">
            {composition.sections.map((sec) => (
              <div key={sec.name} className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">{sec.name}</h3>
                  <span className="text-xs text-ink-400">{sec.bars} bars</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-sm text-ink-300">
                  {sec.chords.map((c, i) => (
                    <span key={i} className="rounded-md bg-ink-700 px-2 py-0.5">{c}</span>
                  ))}
                </div>
                <div className="mt-3">
                  <StrumPattern pattern={sec.strumPattern} />
                </div>
                {sec.tab && <div className="mt-3"><TabViewer tab={sec.tab} /></div>}
                {sec.notes && <p className="mt-3 text-sm text-ink-300">💡 {sec.notes}</p>}
              </div>
            ))}
          </div>

          <div className="card space-y-2 p-5 text-sm text-ink-300">
            <p><span className="font-medium text-ink-100">Beginner:</span> {composition.versions.beginner}</p>
            <p><span className="font-medium text-ink-100">Intermediate:</span> {composition.versions.intermediate}</p>
            <p><span className="font-medium text-ink-100">Advanced:</span> {composition.versions.advanced}</p>
          </div>
        </div>
      )}
    </div>
  );
}
