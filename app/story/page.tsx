"use client";

import { useMemo, useState } from "react";
import { Plus, Wand2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { generateStoryMilestones } from "@/lib/story";
import { formatFriendly, dayKey } from "@/lib/dates";
import type { StoryMilestone } from "@/lib/types";

export default function StoryPage() {
  const checkIns = useStore((s) => s.checkIns);
  const allMilestones = useStore((s) => s.storyMilestones);
  const addStoryMilestone = useStore((s) => s.addStoryMilestone);
  const [addOpen, setAddOpen] = useState(false);

  const manualMilestones = useMemo(() => allMilestones.filter((m) => m.kind === "manual"), [allMilestones]);
  const autoMilestones = useMemo(() => generateStoryMilestones(checkIns), [checkIns]);
  const all = useMemo(
    () => [...autoMilestones, ...manualMilestones].sort((a, b) => a.date.localeCompare(b.date)),
    [autoMilestones, manualMilestones]
  );

  if (checkIns.length === 0) {
    return (
      <div>
        <PageHeader title="My Mental Health Story" subtitle="A gentle, chronological look at how you've grown." />
        <EmptyState icon={<Wand2 size={20} />} title="Your story starts with your first check-in" body="Come back after a few weeks of check-ins to see it take shape." />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="My Mental Health Story"
        subtitle="Growth happens gradually — here's yours, month by month."
        action={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
            <Plus size={15} /> Add moment
          </button>
        }
      />

      <div className="relative pl-8">
        <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gradient-to-b from-primary via-calm to-good" />
        <div className="space-y-6">
          {all.map((m) => (
            <div key={m.id} className="relative">
              <div className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-surface">
                <Sparkles size={11} className="text-primary" />
              </div>
              <Card>
                <p className="text-xs font-medium text-ink-faint">{formatFriendly(m.date)}</p>
                <p className="mt-0.5 font-display text-base font-semibold text-ink">{m.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{m.detail}</p>
                {m.kind === "manual" && <span className="mt-2 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary">Your note</span>}
              </Card>
            </div>
          ))}
        </div>
      </div>

      <AddMomentModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addStoryMilestone} />
    </div>
  );
}

function AddMomentModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (m: Omit<StoryMilestone, "id">) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(dayKey());

  function submit() {
    if (!title.trim()) return;
    onAdd({ date, title: title.trim(), detail: detail.trim(), kind: "manual" });
    setTitle("");
    setDetail("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a moment to your story">
      <div className="space-y-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What happened?"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          placeholder="A bit more detail (optional)"
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button onClick={submit} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-ink">
          Add to my story
        </button>
      </div>
    </Modal>
  );
}
