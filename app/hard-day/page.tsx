"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, Globe, Wind, Leaf, NotebookPen, HeartHandshake, ShieldAlert } from "lucide-react";
import { EmotionPicker } from "@/components/ui/EmotionPicker";
import { BreathingCircle } from "@/components/BreathingCircle";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/dates";
import { CRISIS_RESOURCES, type Emotion } from "@/lib/types";

export default function HardDayPage() {
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [note, setNote] = useState("");
  const [reachOut, setReachOut] = useState("");
  const [savedNote, setSavedNote] = useState(false);
  const addJournalEntry = useStore((s) => s.addJournalEntry);

  function saveThought() {
    if (!note.trim() && emotions.length === 0) return;
    addJournalEntry({
      date: dayKey(),
      text: note.trim() || "(Logged feelings during a hard moment.)",
      mood: undefined,
      tags: ["hard-day", ...emotions],
      photoIds: [],
    });
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 1800);
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Having a hard day</h1>
        <p className="mt-1 text-sm text-ink-soft">You don't have to fix anything right now. Let's just take this one step at a time.</p>
      </div>

      <Card className="border-warn/30 bg-warn-soft">
        <div className="flex items-start gap-2.5">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-semibold text-ink">In immediate danger, or thinking about suicide or self-harm?</p>
            <p className="mt-1 text-sm text-ink-soft">Please reach out right now — you deserve real, immediate support.</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {CRISIS_RESOURCES.map((r) => (
            <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-sm">
              {r.name.includes("Text") ? <MessageCircle size={15} className="shrink-0 text-warn" /> : r.name.includes("Find") ? <Globe size={15} className="shrink-0 text-warn" /> : <Phone size={15} className="shrink-0 text-warn" />}
              <div>
                <p className="font-medium text-ink">{r.name}</p>
                <p className="text-ink-soft">{r.detail}</p>
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-ink-faint">If you or someone else is in danger right now, call your local emergency number.</p>
        </div>
      </Card>

      <Card className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold text-ink">Step 1 — Let's slow down for a second</p>
        <BreathingCircle color="var(--calm)" />
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Step 2 — What are you feeling right now?</p>
        <EmotionPicker value={emotions} onChange={setEmotions} max={4} />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="If you want to say more, write it here — it stays private, just on this device."
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={saveThought} className="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary">
            {savedNote ? "Saved ✓" : "Save privately"}
          </button>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Step 3 — A few things that might help</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <ToolLink href="/toolkit/grounding-54321" icon={<Leaf size={18} />} label="Ground yourself" />
          <ToolLink href="/toolkit/box-breathing" icon={<Wind size={18} />} label="Breathe" />
          <ToolLink href="/toolkit/journaling-prompts" icon={<NotebookPen size={18} />} label="Write it out" />
        </div>
      </Card>

      <Card>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <HeartHandshake size={16} className="text-primary" /> Step 4 — Is there someone you trust you could reach out to?
        </p>
        <p className="mb-3 text-sm text-ink-soft">
          A friend, family member, teacher, coach, or counselor. You don't have to go through this alone — talking to
          a real person often helps more than anything an app can offer.
        </p>
        <input
          value={reachOut}
          onChange={(e) => setReachOut(e.target.value)}
          placeholder="Who could you reach out to? (just for you, not saved anywhere)"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
      </Card>

      <p className="text-center text-xs text-ink-faint">
        Bloom is a self-awareness tool, not a therapist and not a crisis service. If things feel like too much,
        please talk to a real person — a trusted adult, a counselor, or one of the resources above.
      </p>

      <Link href="/" className="block text-center text-sm font-medium text-primary">
        Back to home
      </Link>
    </div>
  );
}

function ToolLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised p-3 text-center text-xs font-medium text-ink">
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
