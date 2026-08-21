"use client";

import { useRef, useState } from "react";
import { Music4, Loader2, Play, Square, BookmarkPlus, Check } from "lucide-react";
import ChordDiagram from "@/components/ChordDiagram";
import TabViewer from "@/components/TabViewer";
import StrumPattern from "@/components/StrumPattern";
import { Metronome } from "@/lib/audio/metronome";
import { useGuitarAI } from "@/lib/store";
import type { SongArrangement } from "@/lib/types";
import { POPULAR_SONGS, type PopularSong } from "@/lib/popularSongs";

const GENRES = ["Any", "Pop", "Rock", "Folk", "Blues", "Jazz", "Country", "Indie"];
const MOODS = ["Any", "Upbeat", "Dreamy", "Melancholic", "Playful", "Intense"];
const DIFFS = ["beginner", "intermediate", "advanced"];

export default function LearnSongPage() {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Any");
  const [mood, setMood] = useState("Any");
  const [difficultyPref, setDifficultyPref] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [arrangement, setArrangement] = useState<SongArrangement | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [version, setVersion] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [slowPct, setSlowPct] = useState(100);
  const [playing, setPlaying] = useState(false);

  const [realSong, setRealSong] = useState<PopularSong | null>(null);
  const [realSlowPct, setRealSlowPct] = useState(100);
  const [realPlaying, setRealPlaying] = useState(false);
  const realMetroRef = useRef<Metronome | null>(null);
  const realCtxRef = useRef<AudioContext | null>(null);

  const addSongLearned = useGuitarAI((s) => s.addSongLearned);
  const songsLearned = useGuitarAI((s) => s.progress.songsLearned);
  const metroRef = useRef<Metronome | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  function pickRealSong(song: PopularSong) {
    realMetroRef.current?.stop();
    realCtxRef.current?.close();
    setRealPlaying(false);
    setRealSlowPct(100);
    setRealSong(song);
  }

  function toggleRealClick() {
    if (!realSong) return;
    if (realPlaying) {
      realMetroRef.current?.stop();
      realCtxRef.current?.close();
      setRealPlaying(false);
      return;
    }
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    realCtxRef.current = ctx;
    const bpm = Math.round((realSong.bpm * realSlowPct) / 100);
    const beats = Number(realSong.timeSignature.split("/")[0]) || 4;
    const metro = new Metronome(ctx, bpm, beats);
    realMetroRef.current = metro;
    metro.start();
    setRealPlaying(true);
  }

  const realLearned = realSong ? songsLearned.includes(realSong.title) : false;

  async function generate() {
    if (!title.trim()) return;
    setLoading(true);
    setArrangement(null);
    try {
      const res = await fetch("/api/ai/song-arrangement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, genre, mood, difficultyPref }),
      });
      const data = await res.json();
      setArrangement(data.arrangement);
      setSource(data.source);
      setSlowPct(100);
    } finally {
      setLoading(false);
    }
  }

  function toggleClick() {
    if (!arrangement) return;
    if (playing) {
      metroRef.current?.stop();
      ctxRef.current?.close();
      setPlaying(false);
      return;
    }
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctxRef.current = ctx;
    const bpm = Math.round((arrangement.bpm * slowPct) / 100);
    const beats = Number(arrangement.timeSignature.split("/")[0]) || 4;
    const metro = new Metronome(ctx, bpm, beats);
    metroRef.current = metro;
    metro.start();
    setPlaying(true);
  }

  const learned = arrangement ? songsLearned.includes(arrangement.title) : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Learn a Song</h1>
        <p className="mt-1 text-ink-300">Pick a song you already know, or describe a vibe for something original.</p>
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold">Songs you already know</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {POPULAR_SONGS.map((s) => (
            <button
              key={s.title}
              onClick={() => pickRealSong(s)}
              className={`rounded-xl border p-3 text-left transition ${
                realSong?.title === s.title ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800/50 hover:border-ink-500"
              }`}
            >
              <div className="font-display text-sm font-semibold text-ink-100">{s.title}</div>
              <div className="mt-0.5 text-xs text-ink-400">
                {s.artist} · {"★".repeat(s.difficulty)}
                {"☆".repeat(5 - s.difficulty)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {realSong && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{realSong.title}</h2>
                <p className="mt-1 text-sm text-ink-300">{realSong.artist}</p>
              </div>
              <button className="btn-secondary shrink-0" onClick={() => addSongLearned(realSong.title)} disabled={realLearned}>
                {realLearned ? <Check size={16} /> : <BookmarkPlus size={16} />}
                {realLearned ? "Learned" : "Mark learned"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-300">
              <span>Difficulty: {"★".repeat(realSong.difficulty)}{"☆".repeat(5 - realSong.difficulty)}</span>
              <span>{realSong.bpm} BPM</span>
              <span>{realSong.timeSignature}</span>
              {realSong.capo > 0 && <span>Capo {realSong.capo}</span>}
            </div>
            <p className="mt-3 text-xs italic text-ink-400">Chords only, no lyrics — play along with the real recording or from memory.</p>
          </div>

          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-400">Slow practice mode</p>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={realSlowPct}
                onChange={(e) => setRealSlowPct(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-24 text-right text-sm text-ink-300">
                {Math.round((realSong.bpm * realSlowPct) / 100)} BPM ({realSlowPct}%)
              </span>
              <button className="btn-secondary" onClick={toggleRealClick}>
                {realPlaying ? <Square size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {realSong.chordsUsed.map((c) => (
              <ChordDiagram key={c} chordId={c} size={96} />
            ))}
          </div>

          <div className="space-y-4">
            {realSong.sections.map((sec) => (
              <div key={sec.name} className="card p-5">
                <h3 className="font-display font-semibold">{sec.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5 text-sm text-ink-300">
                  {sec.chords.map((c, i) => (
                    <span key={i} className="rounded-md bg-ink-700 px-2 py-0.5">{c}</span>
                  ))}
                </div>
                <div className="mt-3">
                  <StrumPattern pattern={sec.strumPattern} />
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <p className="text-sm text-ink-300">💡 {realSong.tip}</p>
          </div>
        </div>
      )}

      <div className="card space-y-4 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gold-400">Or create something original</p>
        <input
          className="input"
          placeholder='e.g. "a slow acoustic love song"'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select className="input" value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className="input" value={difficultyPref} onChange={(e) => setDifficultyPref(e.target.value)}>
            {DIFFS.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full" onClick={generate} disabled={loading || !title.trim()}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Music4 size={18} />}
          {loading ? "Writing your arrangement..." : "Generate original arrangement"}
        </button>
      </div>

      {arrangement && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{arrangement.title}</h2>
                <p className="mt-1 text-xs italic text-ink-400">{arrangement.originalNote}</p>
              </div>
              <button className="btn-secondary shrink-0" onClick={() => addSongLearned(arrangement.title)} disabled={learned}>
                {learned ? <Check size={16} /> : <BookmarkPlus size={16} />}
                {learned ? "Learned" : "Mark learned"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-300">
              <span>Difficulty: {"★".repeat(arrangement.difficulty)}{"☆".repeat(5 - arrangement.difficulty)}</span>
              <span>{arrangement.bpm} BPM</span>
              <span>{arrangement.timeSignature}</span>
              {arrangement.capo > 0 && <span>Capo {arrangement.capo}</span>}
              {source === "fallback" && <span className="text-ink-500">(offline arrangement engine)</span>}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gold-400">Slow practice mode</p>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={slowPct}
                onChange={(e) => setSlowPct(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-24 text-right text-sm text-ink-300">
                {Math.round((arrangement.bpm * slowPct) / 100)} BPM ({slowPct}%)
              </span>
              <button className="btn-secondary" onClick={toggleClick}>
                {playing ? <Square size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {arrangement.chordsUsed.map((c) => (
              <ChordDiagram key={c} chordId={c} size={96} />
            ))}
          </div>

          <div className="space-y-4">
            {arrangement.sections.map((sec) => (
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

          <div className="card p-5">
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVersion(v)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${version === v ? "bg-gold-500/15 text-gold-400" : "text-ink-400"}`}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-300">{arrangement.versions[version]}</p>
          </div>
        </div>
      )}
    </div>
  );
}
