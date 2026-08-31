"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export interface BreathingPhase {
  label: string;
  seconds: number;
}

const DEFAULT_PHASES: BreathingPhase[] = [
  { label: "Inhale", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Exhale", seconds: 4 },
  { label: "Hold", seconds: 4 },
];

export function BreathingCircle({
  phases = DEFAULT_PHASES,
  color = "var(--primary)",
  autoStart = false,
}: {
  phases?: BreathingPhase[];
  color?: string;
  autoStart?: boolean;
}) {
  const [running, setRunning] = useState(autoStart);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [scaleUp, setScaleUp] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    const phase = phases[phaseIdx];
    if (phase.label === "Inhale") setScaleUp(true);
    if (phase.label === "Exhale") setScaleUp(false);
    timeout.current = setTimeout(() => setPhaseIdx((i) => (i + 1) % phases.length), phase.seconds * 1000);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [running, phaseIdx, phases]);

  function start() {
    setPhaseIdx(0);
    setScaleUp(phases[0].label === "Inhale");
    setRunning(true);
  }
  function stop() {
    setRunning(false);
    if (timeout.current) clearTimeout(timeout.current);
  }

  const activePhase = phases[phaseIdx];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `${color}33`,
            transform: `scale(${scaleUp ? 1 : 0.6})`,
            transition: running ? `transform ${activePhase?.seconds ?? 1}s ease-in-out` : "none",
          }}
        />
        <div
          className="absolute inset-5 rounded-full"
          style={{
            background: `${color}55`,
            transform: `scale(${scaleUp ? 1 : 0.6})`,
            transition: running ? `transform ${activePhase?.seconds ?? 1}s ease-in-out` : "none",
          }}
        />
        <span className="relative font-display text-base font-semibold text-ink">{running ? activePhase.label : "Ready"}</span>
      </div>
      <button
        onClick={running ? stop : start}
        className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
        style={{ background: color }}
      >
        {running ? <Pause size={15} /> : <Play size={15} />}
        {running ? "Stop" : "Begin"}
      </button>
    </div>
  );
}
