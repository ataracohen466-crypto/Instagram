"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, FlaskConical, Archive } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useStore } from "@/lib/store";
import { dayKey, parseDayKey, formatFriendly } from "@/lib/dates";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { SkinExperiment } from "@/lib/types";

const MILESTONES = [
  { label: "Before", days: 0 },
  { label: "Started", days: 0 },
  { label: "Week 1", days: 7 },
  { label: "Week 2", days: 14 },
  { label: "Week 4", days: 28 },
  { label: "Week 8", days: 56 },
];

export default function SkinExperimentsPage() {
  const experiments = useStore((s) => s.skinExperiments);
  const archiveSkinExperiment = useStore((s) => s.archiveSkinExperiment);
  const [addOpen, setAddOpen] = useState(false);

  const active = experiments.filter((e) => !e.archived);
  const archived = experiments.filter((e) => e.archived);

  return (
    <div className="pb-10">
      <Link href="/skin" className="mb-4 flex items-center gap-1 text-sm text-ink-soft"><ChevronLeft size={16} /> Skin</Link>
      <PageHeader
        title="Skin experiments"
        subtitle="Skincare changes take time — this tracks the timeline so you're not expecting overnight results."
        action={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--skin)" }}>
            <Plus size={15} /> New
          </button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={20} />}
          title="No experiments yet"
          body="When you start, stop, or change a product, log it here to see a realistic before/after timeline."
          action={
            <button onClick={() => setAddOpen(true)} className="mt-1 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--skin)" }}>
              Start one
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {active.map((e) => (
            <ExperimentCard key={e.id} experiment={e} onArchive={() => archiveSkinExperiment(e.id, true)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Archived</p>
          <div className="space-y-3 opacity-60">
            {archived.map((e) => (
              <ExperimentCard key={e.id} experiment={e} />
            ))}
          </div>
        </div>
      )}

      <AddExperimentModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ExperimentCard({ experiment, onArchive }: { experiment: SkinExperiment; onArchive?: () => void }) {
  const daysSince = differenceInCalendarDays(new Date(), parseDayKey(experiment.startDate));
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-medium text-ink">{experiment.productName}</p>
          <p className="text-xs text-ink-faint">
            {experiment.changeType === "started" ? "Started" : experiment.changeType === "stopped" ? "Stopped" : "Changed"} {formatFriendly(experiment.startDate)}
          </p>
        </div>
        {onArchive && (
          <button onClick={onArchive} className="text-ink-faint"><Archive size={15} /></button>
        )}
      </div>
      <div className="relative flex justify-between">
        <div className="absolute left-0 right-0 top-2.5 h-0.5 bg-border" />
        {MILESTONES.slice(1).map((m, i) => {
          const reached = daysSince >= m.days;
          return (
            <div key={i} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={`h-5 w-5 rounded-full border-2 ${reached ? "border-skin bg-skin" : "border-border bg-surface"}`} />
              <span className={`text-[10px] ${reached ? "font-medium text-skin" : "text-ink-faint"}`}>{m.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        {daysSince < 7
          ? "Too early to expect visible changes — most products take 2–8 weeks."
          : daysSince < 28
          ? "Still early days — many products take a full month to show their effect."
          : "You're far enough in that any pattern in your skin check-ins is worth a look."}
      </p>
      {experiment.notes && <p className="mt-2 text-sm text-ink-soft">{experiment.notes}</p>}
    </Card>
  );
}

function AddExperimentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addSkinExperiment = useStore((s) => s.addSkinExperiment);
  const [productName, setProductName] = useState("");
  const [changeType, setChangeType] = useState<SkinExperiment["changeType"]>("started");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!productName.trim()) return;
    addSkinExperiment({ productName: productName.trim(), changeType, startDate: dayKey(), notes: notes || undefined });
    setProductName("");
    setNotes("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New skin experiment">
      <div className="space-y-4">
        <input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Product or routine change"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-skin"
        />
        <div className="flex gap-2">
          {(["started", "stopped", "changed"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setChangeType(c)}
              className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${changeType === c ? "border-skin bg-skin-soft text-skin" : "border-border text-ink-soft"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes (optional)"
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-skin"
        />
        <button onClick={submit} className="w-full rounded-full py-3 text-sm font-semibold text-white" style={{ background: "var(--skin)" }}>
          Start tracking
        </button>
      </div>
    </Modal>
  );
}
