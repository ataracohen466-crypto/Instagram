"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Check, Play, Pause, RotateCcw, Save } from "lucide-react";
import { getTool } from "@/lib/toolkit";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { BreathingCircle } from "@/components/BreathingCircle";

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tool = getTool(params.id);
  const logUse = useStore((s) => s.logToolkitUse);

  useEffect(() => {
    if (tool) logUse(tool.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.id]);

  if (!tool) {
    return (
      <div className="py-16 text-center text-sm text-ink-soft">
        Tool not found. <button onClick={() => router.push("/toolkit")} className="text-primary underline">Back to toolkit</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-10">
      <button onClick={() => router.push("/toolkit")} className="mb-4 flex items-center gap-1 text-sm text-ink-soft">
        <ChevronLeft size={16} /> Toolkit
      </button>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${tool.color}22`, color: tool.color }}>
          <tool.icon size={22} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{tool.title}</h1>
          <p className="text-sm text-ink-soft">{tool.description}</p>
        </div>
      </div>

      {tool.kind === "breathing" && tool.phases && <BreathingTool phases={tool.phases} color={tool.color} />}
      {tool.kind === "steps" && tool.steps && <StepsTool steps={tool.steps} />}
      {tool.kind === "prompts" && tool.prompts && <PromptsTool prompts={tool.prompts} toolId={tool.id} />}
      {tool.kind === "timer" && tool.timerPresets && <TimerTool presets={tool.timerPresets} color={tool.color} />}
    </div>
  );
}

function BreathingTool({ phases, color }: { phases: { label: string; seconds: number }[]; color: string }) {
  return (
    <Card className="flex flex-col items-center gap-6 py-10">
      <BreathingCircle phases={phases} color={color} />
      <p className="text-center text-xs text-ink-faint">{phases.map((p) => `${p.label} ${p.seconds}s`).join(" · ")}</p>
    </Card>
  );
}

function StepsTool({ steps }: { steps: { title: string; body: string }[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <Card key={i} className={done.has(i) ? "opacity-60" : ""}>
          <button
            className="flex w-full items-start gap-3 text-left"
            onClick={() =>
              setDone((prev) => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              })
            }
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                done.has(i) ? "border-good bg-good text-white" : "border-border text-transparent"
              }`}
            >
              <Check size={14} />
            </span>
            <span>
              <p className="font-medium text-ink">{s.title}</p>
              <p className="text-sm text-ink-soft">{s.body}</p>
            </span>
          </button>
        </Card>
      ))}
      {done.size === steps.length && (
        <p className="text-center text-sm font-medium text-good">Nice work — that's the full routine. 🌱</p>
      )}
    </div>
  );
}

function PromptsTool({ prompts, toolId }: { prompts: string[]; toolId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const addJournalEntry = useStore((s) => s.addJournalEntry);

  function save() {
    if (!text.trim()) return;
    addJournalEntry({ date: dayKey(), text: text.trim(), title: selected ?? undefined, tags: [toolId], photoIds: [] });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (!selected) {
    return (
      <div className="space-y-3">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className="w-full rounded-2xl border border-border bg-surface p-4 text-left text-sm font-medium text-ink shadow-card transition hover:border-primary/40"
          >
            {p}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <p className="mb-3 text-sm font-semibold text-ink">{selected}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        autoFocus
        placeholder="Write whatever comes up…"
        className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => setSelected(null)} className="rounded-full border border-border px-4 py-2 text-sm text-ink-soft">
          Back
        </button>
        <button onClick={save} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
          <Save size={14} /> {saved ? "Saved to journal" : "Save to journal"}
        </button>
      </div>
    </Card>
  );
}

function TimerTool({ presets, color }: { presets: number[]; color: string }) {
  const [duration, setDuration] = useState(presets[0]);
  const [remaining, setRemaining] = useState(presets[0]);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  const pct = (remaining / duration) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Card className="flex flex-col items-center gap-6 py-10">
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg width={176} height={176} className="-rotate-90">
          <circle cx={88} cy={88} r={80} stroke="var(--border)" strokeWidth={8} fill="none" />
          <circle
            cx={88}
            cy={88}
            r={80}
            stroke={color}
            strokeWidth={8}
            fill="none"
            strokeDasharray={2 * Math.PI * 80}
            strokeDashoffset={2 * Math.PI * 80 * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="absolute font-display text-2xl font-bold text-ink">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="flex gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => {
              setDuration(p);
              setRemaining(p);
              setRunning(false);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${duration === p ? "bg-primary-soft text-primary" : "bg-surface-raised text-ink-soft"}`}
          >
            {Math.round(p / 60)} min
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-soft"
          style={{ background: color }}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pause" : remaining === duration ? "Start" : "Resume"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(duration);
          }}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-3 text-sm text-ink-soft"
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {remaining === 0 && <p className="text-sm font-medium text-good">Nice — take that with you. 🌤️</p>}
    </Card>
  );
}
