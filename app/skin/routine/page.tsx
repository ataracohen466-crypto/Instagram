"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Sun, Moon, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey, formatShort } from "@/lib/dates";
import { Card, PageHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { routineConsistency } from "@/lib/skinInsights";
import type { SkinProduct } from "@/lib/types";

const CATEGORY_LABELS: Record<SkinProduct["category"], string> = {
  cleanser: "Cleanser", moisturizer: "Moisturizer", sunscreen: "Sunscreen", treatment: "Treatment", other: "Other",
};

export default function SkinRoutinePage() {
  const products = useStore((s) => s.skinProducts);
  const logs = useStore((s) => s.skinRoutineLogs);
  const logSkinRoutine = useStore((s) => s.logSkinRoutine);
  const stopSkinProduct = useStore((s) => s.stopSkinProduct);
  const deleteSkinProduct = useStore((s) => s.deleteSkinProduct);
  const addSkinExperiment = useStore((s) => s.addSkinExperiment);

  const today = dayKey();
  const todayLog = logs.find((l) => l.date === today);
  const [addOpen, setAddOpen] = useState(false);

  const active = products.filter((p) => !p.stoppedAt);
  const amProducts = active.filter((p) => p.routine === "am" || p.routine === "both");
  const pmProducts = active.filter((p) => p.routine === "pm" || p.routine === "both");

  const consistency = useMemo(() => routineConsistency(logs, "30d"), [logs]);

  return (
    <div className="pb-10">
      <Link href="/skin" className="mb-4 flex items-center gap-1 text-sm text-ink-soft"><ChevronLeft size={16} /> Skin</Link>
      <PageHeader title="Skincare routine" subtitle="Track your AM/PM routine and how consistent it's been." />

      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-ink">Today</p>
        <div className="grid grid-cols-2 gap-3">
          <RoutineToggle
            icon={<Sun size={16} />}
            label="Morning"
            done={!!todayLog?.amDone}
            onToggle={() => logSkinRoutine(today, { amDone: !todayLog?.amDone })}
          />
          <RoutineToggle
            icon={<Moon size={16} />}
            label="Evening"
            done={!!todayLog?.pmDone}
            onToggle={() => logSkinRoutine(today, { pmDone: !todayLog?.pmDone })}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <p className="mb-1 text-sm font-semibold text-ink">Consistency (30 days)</p>
        <div className="mt-2 flex gap-4 text-sm">
          <div>
            <p className="font-display text-xl font-bold text-ink">{consistency.amPct}%</p>
            <p className="text-xs text-ink-faint">AM routine</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-ink">{consistency.pmPct}%</p>
            <p className="text-xs text-ink-faint">PM routine</p>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Your products</p>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-full bg-skin-soft px-3 py-1.5 text-sm font-medium text-skin">
          <Plus size={14} /> Add product
        </button>
      </div>

      <ProductGroup title="AM" products={amProducts} onStop={stopSkinProduct} onDelete={deleteSkinProduct} onExperiment={addSkinExperiment} />
      <ProductGroup title="PM" products={pmProducts} onStop={stopSkinProduct} onDelete={deleteSkinProduct} onExperiment={addSkinExperiment} />

      {products.some((p) => p.stoppedAt) && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Stopped</p>
          {products.filter((p) => p.stoppedAt).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm text-ink-faint">
              <span>{p.name}</span>
              <button onClick={() => deleteSkinProduct(p.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function RoutineToggle({ icon, label, done, onToggle }: { icon: React.ReactNode; label: string; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${done ? "border-skin bg-skin-soft" : "border-border bg-surface-raised"}`}
    >
      <span className={done ? "text-skin" : "text-ink-faint"}>{icon}</span>
      <span className={`text-sm font-medium ${done ? "text-skin" : "text-ink-soft"}`}>{label}</span>
      {done && <Check size={14} className="text-skin" />}
    </button>
  );
}

function ProductGroup({
  title,
  products,
  onStop,
  onDelete,
  onExperiment,
}: {
  title: string;
  products: SkinProduct[];
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onExperiment: ReturnType<typeof useStore.getState>["addSkinExperiment"];
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title} routine</p>
      {products.length === 0 ? (
        <p className="text-sm text-ink-faint">No products added yet.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} className="flex items-center justify-between !p-3.5">
              <div>
                <p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-ink-faint">{CATEGORY_LABELS[p.category]} · since {formatShort(new Date(p.startedAt).toISOString().slice(0, 10))}</p>
              </div>
              <button
                onClick={() => {
                  onStop(p.id);
                  onExperiment({ productName: p.name, changeType: "stopped", startDate: dayKey(), notes: undefined });
                }}
                className="text-xs font-medium text-warn"
              >
                Stop
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addSkinProduct = useStore((s) => s.addSkinProduct);
  const addSkinExperiment = useStore((s) => s.addSkinExperiment);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkinProduct["category"]>("cleanser");
  const [routine, setRoutine] = useState<SkinProduct["routine"]>("am");
  const [logExperiment, setLogExperiment] = useState(true);

  function submit() {
    if (!name.trim()) return;
    addSkinProduct({ name: name.trim(), category, routine });
    if (logExperiment) {
      addSkinExperiment({ productName: name.trim(), changeType: "started", startDate: dayKey(), notes: undefined });
    }
    setName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a product">
      <div className="space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-skin"
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Category</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as SkinProduct["category"][]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${category === c ? "border-skin bg-skin-soft text-skin" : "border-border text-ink-soft"}`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Routine</label>
          <div className="flex gap-2">
            {(["am", "pm", "both"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoutine(r)}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium uppercase ${routine === r ? "border-skin bg-skin-soft text-skin" : "border-border text-ink-soft"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={logExperiment} onChange={(e) => setLogExperiment(e.target.checked)} className="accent-skin" />
          Start a Skin Experiment to track how this goes over time
        </label>
        <button onClick={submit} className="w-full rounded-full py-3 text-sm font-semibold text-white" style={{ background: "var(--skin)" }}>
          Add product
        </button>
      </div>
    </Modal>
  );
}
