"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, Rocket, Moon, Users, Briefcase, HeartPulse, Star, CloudRain,
  ChevronDown, ChevronUp, Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey, formatFriendly } from "@/lib/dates";
import { MoodPicker } from "@/components/ui/MoodPicker";
import { EmotionPicker } from "@/components/ui/EmotionPicker";
import { Slider } from "@/components/ui/Slider";
import { Card, PageHeader } from "@/components/ui/Card";
import { LIFESTYLE_META } from "@/lib/mood";
import { LIFESTYLE_FACTORS, type Emotion, type LifestyleFactor } from "@/lib/types";
import { pickReflectionPrompt } from "@/lib/reflection";
import { inRange } from "@/lib/insights";

export default function CheckInPage() {
  const router = useRouter();
  const checkIns = useStore((s) => s.checkIns);
  const upsertCheckIn = useStore((s) => s.upsertCheckIn);
  const today = dayKey();
  const existing = useMemo(() => checkIns.find((c) => c.date === today), [checkIns, today]);

  const [overallMood, setOverallMood] = useState(existing?.overallMood ?? 5);
  const [emotions, setEmotions] = useState<Emotion[]>(existing?.emotions ?? []);
  const [anxiety, setAnxiety] = useState(existing?.anxiety ?? 5);
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [motivation, setMotivation] = useState(existing?.motivation ?? 5);
  const [sleepQuality, setSleepQuality] = useState(existing?.sleepQuality ?? 5);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours?.toString() ?? "");
  const [socialConnection, setSocialConnection] = useState(existing?.socialConnection ?? 5);
  const [schoolWorkStress, setSchoolWorkStress] = useState(existing?.schoolWorkStress ?? 5);
  const [physicalWellbeing, setPhysicalWellbeing] = useState(existing?.physicalWellbeing ?? 5);
  const [confidence, setConfidence] = useState(existing?.confidence ?? 5);
  const [lifestyle, setLifestyle] = useState<Partial<Record<LifestyleFactor, boolean>>>(existing?.lifestyle ?? {});

  const [gratitude, setGratitude] = useState(existing?.gratitude ?? "");
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [difficult, setDifficult] = useState(existing?.difficult ?? "");
  const [expanded, setExpanded] = useState(false);
  const [journalNote, setJournalNote] = useState(existing?.journalNote ?? "");
  const [saved, setSaved] = useState(false);

  const prompt = useMemo(() => existing?.reflectionPrompt ?? pickReflectionPrompt(inRange(checkIns, "30d")), [existing, checkIns]);
  const [reflectionAnswer, setReflectionAnswer] = useState(existing?.reflectionAnswer ?? "");

  function toggleLifestyle(f: LifestyleFactor) {
    setLifestyle((prev) => ({ ...prev, [f]: !prev[f] }));
  }

  function save() {
    upsertCheckIn({
      date: today,
      overallMood,
      emotions,
      anxiety,
      energy,
      motivation,
      sleepQuality,
      sleepHours: sleepHours ? Number(sleepHours) : undefined,
      socialConnection,
      schoolWorkStress,
      physicalWellbeing,
      confidence,
      lifestyle,
      gratitude: gratitude || undefined,
      wentWell: wentWell || undefined,
      difficult: difficult || undefined,
      journalNote: journalNote || undefined,
      reflectionPrompt: prompt,
      reflectionAnswer: reflectionAnswer || undefined,
    });
    setSaved(true);
    setTimeout(() => router.push("/"), 900);
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <PageHeader eyebrow={formatFriendly(today)} title={existing ? "Update today's check-in" : "How are you doing today?"} subtitle="Quick taps and sliders — takes under a minute. Everything is optional except your overall mood." />

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink">Overall mood</p>
        <MoodPicker value={overallMood} onChange={setOverallMood} />
      </Card>

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink">What are you feeling? <span className="font-normal text-ink-faint">(pick up to 5)</span></p>
        <EmotionPicker value={emotions} onChange={setEmotions} />
      </Card>

      <Card className="mb-4 divide-y divide-border">
        <Slider label="Anxiety / stress" icon={<CloudRain size={16} />} value={anxiety} onChange={setAnxiety} color="var(--warn)" lowLabel="Very calm" highLabel="Very anxious" />
        <Slider label="Energy" icon={<Zap size={16} />} value={energy} onChange={setEnergy} color="var(--good)" lowLabel="Drained" highLabel="Energized" />
        <Slider label="Motivation" icon={<Rocket size={16} />} value={motivation} onChange={setMotivation} color="var(--primary)" lowLabel="Low" highLabel="High" />
        <div>
          <Slider label="Sleep quality" icon={<Moon size={16} />} value={sleepQuality} onChange={setSleepQuality} color="var(--calm)" lowLabel="Poor" highLabel="Great" />
          <div className="mt-1 flex items-center gap-2">
            <label className="text-xs text-ink-faint">Hours slept (optional)</label>
            <input
              type="number"
              min={0}
              max={16}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="7.5"
              className="w-20 rounded-lg border border-border bg-surface-raised px-2 py-1 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
        </div>
        <Slider label="Social connection" icon={<Users size={16} />} value={socialConnection} onChange={setSocialConnection} color="var(--good)" lowLabel="Isolated" highLabel="Connected" />
        <Slider label="School / work stress" icon={<Briefcase size={16} />} value={schoolWorkStress} onChange={setSchoolWorkStress} color="var(--warn)" lowLabel="Manageable" highLabel="Overwhelming" />
        <Slider label="Physical wellbeing" icon={<HeartPulse size={16} />} value={physicalWellbeing} onChange={setPhysicalWellbeing} color="var(--good)" lowLabel="Not great" highLabel="Feeling good" />
        <Slider label="Confidence / self-esteem" icon={<Star size={16} />} value={confidence} onChange={setConfidence} color="var(--primary)" lowLabel="Low" highLabel="High" />
      </Card>

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink">Anything from today worth noting?</p>
        <div className="flex flex-wrap gap-2">
          {LIFESTYLE_FACTORS.map((f) => {
            const meta = LIFESTYLE_META[f];
            const active = !!lifestyle[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleLifestyle(f)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface-raised text-ink-soft"
                }`}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4 space-y-3">
        <TextField label="🙏 Gratitude / a positive moment" value={gratitude} onChange={setGratitude} placeholder="Something good, big or small…" />
        <TextField label="✅ What went well today" value={wentWell} onChange={setWentWell} placeholder="Optional" />
        <TextField label="⚡ What was difficult today" value={difficult} onChange={setDifficult} placeholder="Optional — no judgment here" />
      </Card>

      <Card className="mb-4">
        <p className="mb-2 text-sm font-semibold text-ink">{prompt}</p>
        <textarea
          value={reflectionAnswer}
          onChange={(e) => setReflectionAnswer(e.target.value)}
          rows={2}
          placeholder="Optional"
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
      </Card>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink-soft"
      >
        Add a longer journal entry
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <Card className="mb-4">
          <textarea
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            rows={6}
            placeholder="Write as much or as little as you want…"
            className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </Card>
      )}

      <button
        onClick={save}
        disabled={saved}
        className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-ink shadow-glow transition hover:opacity-90 active:scale-[0.99] md:static"
      >
        {saved ? (
          <>
            <Check size={18} /> Saved
          </>
        ) : existing ? (
          "Update check-in"
        ) : (
          "Save today's check-in"
        )}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
    </div>
  );
}
