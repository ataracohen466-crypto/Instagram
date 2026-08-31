"use client";

import { RANGE_LABELS, type RangeKey } from "@/lib/dates";

const ORDER: RangeKey[] = ["today", "7d", "30d", "3m", "6m", "1y"];

export function RangeTabs({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-full border border-border bg-surface-raised p-1">
      {ORDER.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            value === r ? "bg-primary text-primary-ink shadow-soft" : "text-ink-soft hover:text-ink"
          }`}
        >
          {RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
