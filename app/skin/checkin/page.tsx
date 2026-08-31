"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Flame, Wind, Sparkle, Layers, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey, formatFriendly } from "@/lib/dates";
import { Card, PageHeader } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { SKIN_CONCERN_AREAS, type SkinConcernArea } from "@/lib/types";

const AREA_LABELS: Record<SkinConcernArea, string> = {
  forehead: "Forehead", cheeks: "Cheeks", chin: "Chin", nose: "Nose",
  jawline: "Jawline", neck: "Neck", back: "Back", other: "Other",
};

export default function SkinCheckInPage() {
  const router = useRouter();
  const skinCheckIns = useStore((s) => s.skinCheckIns);
  const addSkinCheckIn = useStore((s) => s.addSkinCheckIn);
  const today = dayKey();
  const existing = useMemo(() => skinCheckIns.find((c) => c.date === today), [skinCheckIns, today]);

  const [clarity, setClarity] = useState(existing?.clarity ?? 6);
  const [breakouts, setBreakouts] = useState(existing?.breakouts ?? 2);
  const [redness, setRedness] = useState(existing?.redness ?? 2);
  const [dryness, setDryness] = useState(existing?.dryness ?? 3);
  const [oiliness, setOiliness] = useState(existing?.oiliness ?? 3);
  const [irritation, setIrritation] = useState(existing?.irritation ?? 2);
  const [texture, setTexture] = useState(existing?.texture ?? 6);
  const [hydrationFeel, setHydrationFeel] = useState(existing?.hydrationFeel ?? 6);
  const [areas, setAreas] = useState<SkinConcernArea[]>(existing?.areas ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saved, setSaved] = useState(false);

  function toggleArea(a: SkinConcernArea) {
    setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function save() {
    addSkinCheckIn({ date: today, clarity, breakouts, redness, dryness, oiliness, irritation, texture, hydrationFeel, areas, notes: notes || undefined });
    setSaved(true);
    setTimeout(() => router.push("/skin"), 800);
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <PageHeader eyebrow={formatFriendly(today)} title="Skin check-in" subtitle="Less than a minute. This is about understanding patterns, not judging how you look." />

      <Card className="mb-4 divide-y divide-border">
        <Slider label="Overall clarity" icon={<Sparkle size={16} />} value={clarity} onChange={setClarity} color="var(--skin)" lowLabel="Not clear" highLabel="Very clear" />
        <Slider label="Breakouts / blemishes" icon={<Flame size={16} />} value={breakouts} onChange={setBreakouts} color="var(--warn)" lowLabel="None" highLabel="A lot" />
        <Slider label="Redness" icon={<Flame size={16} />} value={redness} onChange={setRedness} color="var(--warn)" lowLabel="None" highLabel="A lot" />
        <Slider label="Dryness" icon={<Wind size={16} />} value={dryness} onChange={setDryness} color="var(--calm)" lowLabel="None" highLabel="Very dry" />
        <Slider label="Oiliness" icon={<Droplets size={16} />} value={oiliness} onChange={setOiliness} color="var(--calm)" lowLabel="None" highLabel="Very oily" />
        <Slider label="Irritation / sensitivity" icon={<Flame size={16} />} value={irritation} onChange={setIrritation} color="var(--warn)" lowLabel="None" highLabel="A lot" />
        <Slider label="Texture" icon={<Layers size={16} />} value={texture} onChange={setTexture} color="var(--skin)" lowLabel="Rough" highLabel="Smooth" />
        <Slider label="Hydration feel" icon={<Droplets size={16} />} value={hydrationFeel} onChange={setHydrationFeel} color="var(--calm)" lowLabel="Tight/dry" highLabel="Hydrated" />
      </Card>

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink">Areas of concern today</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERN_AREAS.map((a) => (
            <button
              key={a}
              onClick={() => toggleArea(a)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                areas.includes(a) ? "border-skin bg-skin-soft text-skin" : "border-border text-ink-soft"
              }`}
            >
              {AREA_LABELS[a]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <label className="mb-1.5 block text-sm font-semibold text-ink">How does your skin feel today?</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes…"
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-skin"
        />
      </Card>

      <button
        onClick={save}
        className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white shadow-glow"
        style={{ background: "var(--skin)" }}
      >
        {saved ? <><Check size={18} /> Saved</> : existing ? "Update check-in" : "Save skin check-in"}
      </button>
    </div>
  );
}
