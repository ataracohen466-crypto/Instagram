"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Radio } from "lucide-react";
import { detectPitch, nearestOpenString } from "@/lib/audio/pitch";
import { frequencyToNote } from "@/lib/chords";
import { computeChroma, matchChord } from "@/lib/audio/chroma";
import { CHORDS } from "@/lib/chords";
import ChordDiagram from "@/components/ChordDiagram";

type Mode = "tuner" | "chord";

export default function LiveCoachPage() {
  const [mode, setMode] = useState<Mode>("tuner");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState<{ note: string; cents: number; frequency: number } | null>(null);
  const [chordGuess, setChordGuess] = useState<{ chordId: string; confidence: number } | null>(null);
  const [message, setMessage] = useState("Play a note or chord to begin.");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMessageAt = useRef(0);

  async function start() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);
      loop();
    } catch {
      setError("Couldn't access the microphone. Check your browser permissions and try again.");
    }
  }

  function stop() {
    setListening(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    setNote(null);
    setChordGuess(null);
    setMessage("Play a note or chord to begin.");
  }

  function loop() {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;

    if (mode === "tuner") {
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const result = detectPitch(buf, ctx.sampleRate);
      if (result) {
        const { note: n, cents, octave } = frequencyToNote(result.frequency);
        setNote({ note: `${n}${octave}`, cents, frequency: result.frequency });
        maybeSpeak(tunerMessage(cents));
      }
    } else {
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      const chroma = computeChroma(freqData, ctx.sampleRate, analyser.fftSize);
      const energy = freqData.reduce((a, b) => a + b, 0) / freqData.length;
      if (energy > 6) {
        const match = matchChord(chroma);
        if (match) {
          setChordGuess(match);
          maybeSpeak(chordMessage(match));
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  function maybeSpeak(text: string | null) {
    if (!text) return;
    const now = performance.now();
    if (now - lastMessageAt.current < 900) return;
    lastMessageAt.current = now;
    setMessage(text);
  }

  function tunerMessage(cents: number): string {
    if (Math.abs(cents) < 6) return "Good — right in tune.";
    if (cents > 0) return cents > 25 ? "Quite sharp — loosen the string a little." : "A touch sharp.";
    return cents < -25 ? "Quite flat — tighten the string a little." : "A touch flat.";
  }

  function chordMessage(match: { chordId: string; confidence: number }): string {
    if (match.confidence > 0.9) return `${match.chordId} — clean and clear. Nice!`;
    if (match.confidence > 0.75) return `${match.chordId} is almost there — check every string is ringing.`;
    return "Getting close — try pressing a little firmer, right behind the fret.";
  }

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (listening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      loop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const cents = note?.cents ?? 0;
  const needlePercent = Math.max(-50, Math.min(50, cents)) + 50;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Live Coach</h1>
        <p className="mt-1 text-ink-300">Real microphone listening — play a note or strum a chord and get instant feedback.</p>
      </div>

      <div className="flex gap-2">
        <button
          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${mode === "tuner" ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-ink-600 text-ink-300"}`}
          onClick={() => setMode("tuner")}
        >
          Single note / tuner
        </button>
        <button
          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${mode === "chord" ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-ink-600 text-ink-300"}`}
          onClick={() => setMode("chord")}
        >
          Chord check
        </button>
      </div>

      <div className="card flex flex-col items-center gap-6 p-8">
        {mode === "tuner" ? (
          <>
            <div className="font-display text-5xl font-semibold text-ink-100">{note?.note ?? "—"}</div>
            <div className="relative h-3 w-full max-w-xs rounded-full bg-ink-700">
              <div className="absolute inset-y-0 left-1/2 w-px bg-ink-400" />
              <div
                className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-ink-950 transition-all ${
                  Math.abs(cents) < 6 ? "bg-teal-400" : "bg-gold-500"
                }`}
                style={{ left: `calc(${needlePercent}% - 12px)` }}
              />
            </div>
            {note && (
              <p className="text-xs text-ink-400">Nearest open string: {nearestOpenString(note.frequency).name}</p>
            )}
          </>
        ) : (
          <>
            <div className="font-display text-5xl font-semibold text-ink-100">{chordGuess?.chordId ?? "—"}</div>
            {chordGuess && CHORDS[chordGuess.chordId] && <ChordDiagram chordId={chordGuess.chordId} size={110} />}
            {chordGuess && (
              <div className="h-2 w-full max-w-xs rounded-full bg-ink-700">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: `${Math.round(chordGuess.confidence * 100)}%` }} />
              </div>
            )}
          </>
        )}

        <div className="flex min-h-[2.5rem] items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-center text-sm font-medium text-ink-200">
          <Radio size={14} className={listening ? "text-teal-400" : "text-ink-500"} />
          {message}
        </div>

        {error && <p className="text-sm text-coral-400">{error}</p>}

        {!listening ? (
          <button className="btn-primary" onClick={start}>
            <Mic size={18} /> Start listening
          </button>
        ) : (
          <button className="btn-secondary" onClick={stop}>
            <Square size={16} /> Stop
          </button>
        )}
      </div>

      <p className="text-center text-xs text-ink-500">
        Audio is analyzed live in your browser using pitch and chroma detection — nothing is recorded or uploaded.
      </p>
    </div>
  );
}
