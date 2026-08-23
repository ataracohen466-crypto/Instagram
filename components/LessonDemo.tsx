"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, ArrowRight, RotateCcw } from "lucide-react";
import type { GeneratedLesson, PathKey } from "@/lib/curriculum";
import ChordDiagram from "@/components/ChordDiagram";
import NoteStaff from "@/components/NoteStaff";
import { STRING_NAMES } from "@/lib/notation";

function speak(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  window.speechSynthesis.speak(utter);
  return () => window.speechSynthesis.cancel();
}

function parseStrumPattern(instructions: string): string[] {
  const match = instructions.match(/"([DU ]+)"/);
  const pattern = (match ? match[1] : "D D D D").split(" ").filter(Boolean);
  return pattern.length ? pattern : ["D"];
}

/** A short, silent "watch this" demo — animated finger/fretboard placement and
 * strum timing, narrated by the AI teacher — that plays before the hands-on
 * mic-checked practice segment. There's no real video generation available,
 * so this is a live, in-browser animated walkthrough rather than a video file. */
export default function LessonDemo({ lesson, path, onStartPractice }: { lesson: GeneratedLesson; path: PathKey; onStartPractice: () => void }) {
  const chordTargets = Array.from(new Set(lesson.targetChords ?? []));
  const noteTargets = lesson.targetNotes ?? [];
  const items = path === "chords" ? chordTargets : noteTargets;
  const strumPattern = parseStrumPattern(lesson.instructions);

  const [itemIdx, setItemIdx] = useState(0);
  const [beatIdx, setBeatIdx] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [narrating, setNarrating] = useState(true);
  const beatCountRef = useRef(0);

  useEffect(() => {
    setItemIdx(0);
    setBeatIdx(0);
    setCycle(0);
    beatCountRef.current = 0;
    setNarrating(true);
    const cancel = speak(lesson.instructions, () => setNarrating(false));
    return cancel;
  }, [lesson.id, lesson.instructions]);

  useEffect(() => {
    const msPerBeat = Math.max(220, Math.round(60000 / Math.max(40, lesson.tempo)));
    const id = setInterval(() => {
      beatCountRef.current += 1;
      const beat = beatCountRef.current;
      setBeatIdx(beat % strumPattern.length);
      if (items.length > 0 && beat % strumPattern.length === 0) {
        setItemIdx((i) => {
          const next = (i + 1) % items.length;
          if (next === 0) setCycle((c) => c + 1);
          return next;
        });
      }
    }, msPerBeat);
    return () => clearInterval(id);
  }, [lesson.tempo, strumPattern.length, items.length]);

  const currentChord = path === "chords" ? chordTargets[itemIdx] : null;
  const currentNote = path !== "chords" ? noteTargets[itemIdx % Math.max(1, noteTargets.length)] : null;

  return (
    <div className="space-y-4 rounded-xl border border-ink-700 bg-ink-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-teal-400">
          <span className={`h-1.5 w-1.5 rounded-full bg-teal-400 ${narrating ? "animate-pulse" : "opacity-40"}`} />
          Watch: AI teacher demo
        </div>
        <button
          className="btn-secondary shrink-0 !px-3 !py-2"
          onClick={() => {
            beatCountRef.current = 0;
            setItemIdx(0);
            setBeatIdx(0);
            setNarrating(true);
            speak(lesson.instructions, () => setNarrating(false));
          }}
          title="Replay the demo"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <p className="text-sm text-ink-300">{lesson.instructions}</p>

      <div className="flex flex-col items-center gap-4 rounded-lg bg-ink-900/70 py-6">
        {path === "chords" && currentChord && (
          <div key={`${currentChord}-${itemIdx}`} className="animate-rise">
            <ChordDiagram chordId={currentChord} size={160} />
          </div>
        )}

        {path !== "chords" && currentNote && (
          <>
            <NoteStaff notes={[{ stringIndex: currentNote.stringIndex, fret: currentNote.fret }]} activeIndex={0} size="md" />
            <div key={`${currentNote.stringIndex}-${currentNote.fret}-${itemIdx}`} className="animate-rise font-display text-lg font-semibold text-gold-400">
              {STRING_NAMES[currentNote.stringIndex]} string · fret {currentNote.fret} · {currentNote.name}
              {currentNote.octave}
            </div>
          </>
        )}

        {items.length > 1 && (
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === itemIdx ? "bg-teal-400" : "bg-ink-700"}`} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {strumPattern.map((s, i) => (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-semibold transition-all ${
                i === beatIdx ? "scale-110 bg-gold-500 text-ink-950" : "bg-ink-800 text-ink-400"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink-500">{cycle > 0 ? `Loop ${cycle + 1}` : "Watch the timing, then you'll play it yourself"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" onClick={() => speak(lesson.instructions, () => setNarrating(false))} title="Hear it again">
          <Volume2 size={16} /> Replay narration
        </button>
        <button className="btn-primary" onClick={onStartPractice}>
          Start practice <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
