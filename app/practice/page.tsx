"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, PartyPopper } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import { buildRoutine } from "@/lib/routine";
import type { PracticeExercise } from "@/lib/types";

const DURATIONS = [5, 10, 15, 20, 30, 45];

export default function PracticePage() {
  const progress = useGuitarAI((s) => s.progress);
  const profile = useGuitarAI((s) => s.profile);
  const logPractice = useGuitarAI((s) => s.logPractice);
  const addChordReps = useGuitarAI((s) => s.addChordReps);

  const [minutes, setMinutes] = useState(profile.minutesPerDay || 15);
  const [phase, setPhase] = useState<"pick" | "session" | "done">("pick");
  const [routine, setRoutine] = useState<PracticeExercise[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (phase !== "session") return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, secondsLeft]);

  function start() {
    const built = buildRoutine(minutes, progress);
    setRoutine(built);
    setChecked({});
    setSecondsLeft(minutes * 60);
    setPhase("session");
  }

  function finish() {
    for (const ex of routine) {
      if (checked[ex.id]) ex.targetChords?.forEach((c) => addChordReps(c, 5));
    }
    logPractice(minutes, routine[0]?.kind ?? "mixed");
    setPhase("done");
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const doneCount = Object.values(checked).filter(Boolean).length;

  const totalRoutineMinutes = useMemo(() => routine.reduce((a, e) => a + e.minutes, 0), [routine]);

  if (phase === "pick") {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Practice</h1>
          <p className="mt-1 text-ink-300">How much time do you have? We'll build the session for you.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DURATIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`rounded-xl border px-4 py-4 text-center font-medium transition ${
                minutes === m ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-ink-600 bg-ink-900 text-ink-200 hover:border-ink-500"
              }`}
            >
              {m}<span className="block text-xs text-ink-400">min</span>
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={start}>
          Build my {minutes}-minute session
        </button>
      </div>
    );
  }

  if (phase === "session") {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <div className="card flex items-center justify-between p-5">
          <div className="flex items-center gap-2 text-ink-200">
            <Clock size={18} className="text-gold-400" />
            <span className="font-display text-2xl font-semibold tabular-nums">{mm}:{ss}</span>
          </div>
          <span className="text-sm text-ink-400">{doneCount}/{routine.length} done</span>
        </div>

        <div className="space-y-3">
          {routine.map((ex) => (
            <label
              key={ex.id}
              className={`card flex cursor-pointer items-start gap-3 p-4 transition ${checked[ex.id] ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[#e8a93d]"
                checked={!!checked[ex.id]}
                onChange={(e) => setChecked({ ...checked, [ex.id]: e.target.checked })}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink-100">{ex.title}</span>
                  <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-300">{ex.minutes} min</span>
                </div>
                <p className="mt-1 text-sm text-ink-300">{ex.instructions}</p>
              </div>
            </label>
          ))}
        </div>

        <p className="text-center text-xs text-ink-500">Planned {totalRoutineMinutes} min, based on your recent weak spots.</p>

        <button className="btn-primary w-full" onClick={finish}>
          Finish session
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
        <PartyPopper size={28} />
      </div>
      <h1 className="font-display text-2xl font-semibold">Nice work!</h1>
      <p className="text-ink-300">
        You practiced for {minutes} minutes and completed {doneCount} of {routine.length} exercises. That's a real step
        forward — see you tomorrow.
      </p>
      <div className="flex justify-center gap-3">
        <button className="btn-secondary" onClick={() => setPhase("pick")}>
          Practice again
        </button>
        <a className="btn-primary" href="/progress">
          <Check size={18} /> View progress
        </a>
      </div>
    </div>
  );
}
