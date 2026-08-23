"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Mic, Square, CheckCircle2 } from "lucide-react";
import type { GeneratedLesson, PathKey } from "@/lib/curriculum";
import ChordDiagram from "@/components/ChordDiagram";
import NoteStaff from "@/components/NoteStaff";
import TabViewer from "@/components/TabViewer";
import { detectPitch } from "@/lib/audio/pitch";
import { computeChroma, matchChord } from "@/lib/audio/chroma";
import { soundingFrequency, tabAsciiFromNotes } from "@/lib/notation";

function narrate(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}

export default function LessonPlayer({
  lesson,
  path,
  completed,
  onComplete,
}: {
  lesson: GeneratedLesson;
  path: PathKey;
  completed: boolean;
  onComplete: () => void;
}) {
  const targets = path === "chords" ? lesson.targetChords ?? [] : (lesson.targetNotes ?? []).map((n) => `${n.name}${n.octave}`);
  const uniqueChordTargets = Array.from(new Set(lesson.targetChords ?? []));
  const uniqueNoteTargets = dedupeNotes(lesson.targetNotes ?? []);
  const checklistLength = path === "chords" ? uniqueChordTargets.length : uniqueNoteTargets.length;

  const [cursor, setCursor] = useState(0);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState("Press start, then play each item in order.");
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastAdvanceAt = useRef(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursor;

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setCursor(0);
    setPassed(false);
    setError(null);
    setFeedback(checklistLength ? "Listening — play the first one." : "This lesson is a free-practice drill — no single check needed.");
    if (checklistLength === 0) return;
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
      setListening(true);
      loop();
    } catch {
      setError("Microphone access isn't available here — you can still practice by ear and mark this lesson complete yourself.");
    }
  }

  function stop() {
    setListening(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
  }

  function loop() {
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;

    const now = performance.now();

    if (path === "chords") {
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      const energy = freqData.reduce((a, b) => a + b, 0) / freqData.length;
      if (energy > 6 && now - lastAdvanceAt.current > 700) {
        const chroma = computeChroma(freqData, ctx.sampleRate, analyser.fftSize);
        const match = matchChord(chroma);
        const expected = uniqueChordTargets[cursorRef.current];
        if (match && match.chordId === expected && match.confidence > 0.72) {
          lastAdvanceAt.current = now;
          advance();
        } else if (match && match.confidence > 0.5) {
          setFeedback(`Close — that sounded like ${match.chordId}. Aiming for ${expected}.`);
        }
      }
    } else {
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const result = detectPitch(buf, ctx.sampleRate);
      if (result && now - lastAdvanceAt.current > 500) {
        const expected = uniqueNoteTargets[cursorRef.current];
        const targetHz = soundingFrequency(expected.stringIndex, expected.fret);
        const cents = 1200 * Math.log2(result.frequency / targetHz);
        if (Math.abs(cents) < 45) {
          lastAdvanceAt.current = now;
          advance();
        } else if (Math.abs(cents) < 250) {
          setFeedback(cents > 0 ? "A bit sharp — try the fret just below." : "A bit flat — try the fret just above.");
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  function advance() {
    const next = cursorRef.current + 1;
    if (next >= checklistLength) {
      setFeedback("All clear — nice work!");
      setPassed(true);
      stop();
    } else {
      setFeedback("Nice — next one.");
      setCursor(next);
    }
  }

  const tabAscii =
    path === "tabs" && lesson.targetNotes?.length ? tabAsciiFromNotes(lesson.targetNotes.map((n) => ({ stringIndex: n.stringIndex, fret: n.fret }))) : null;

  return (
    <div className="space-y-4 rounded-xl border border-ink-700 bg-ink-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gold-400">{lesson.archetype}</p>
          <h4 className="font-display text-base font-semibold text-ink-100">{lesson.title}</h4>
        </div>
        <button className="btn-secondary shrink-0 !px-3 !py-2" onClick={() => narrate(lesson.instructions)} title="Hear it from your AI teacher">
          <Volume2 size={16} />
        </button>
      </div>

      <p className="text-sm text-ink-300">{lesson.instructions}</p>

      {path === "chords" && lesson.targetChords && lesson.targetChords.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {uniqueChordTargets.map((c) => (
            <ChordDiagram key={c} chordId={c} size={84} />
          ))}
        </div>
      )}

      {path === "notes" && lesson.targetNotes && lesson.targetNotes.length > 0 && (
        <NoteStaff notes={lesson.targetNotes.map((n) => ({ stringIndex: n.stringIndex, fret: n.fret }))} activeIndex={listening ? cursor : undefined} size="sm" />
      )}

      {path === "tabs" && tabAscii && <TabViewer tab={tabAscii} />}

      {checklistLength > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: checklistLength }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < cursor || passed ? "bg-teal-500" : "bg-ink-700"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 px-3 py-2 text-sm text-ink-200">
            <Mic size={14} className={listening ? "text-teal-400" : "text-ink-500"} />
            {feedback}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-coral-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {!listening ? (
          <button className="btn-secondary" onClick={start}>
            <Mic size={16} /> {checklistLength > 0 ? "Start & listen" : "Start"}
          </button>
        ) : (
          <button className="btn-secondary" onClick={stop}>
            <Square size={16} /> Stop
          </button>
        )}
        <button className="btn-primary" onClick={onComplete} disabled={completed}>
          <CheckCircle2 size={16} /> {completed ? "Completed" : passed ? "Nice — mark complete" : "Mark complete"}
        </button>
      </div>
    </div>
  );
}

function dedupeNotes(notes: { stringIndex: number; fret: number; name: string; octave: number }[]) {
  const seen = new Set<string>();
  const out: typeof notes = [];
  for (const n of notes) {
    const key = `${n.stringIndex}-${n.fret}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}
