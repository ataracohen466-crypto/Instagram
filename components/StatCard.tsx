import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "gold",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: "gold" | "teal" | "coral";
}) {
  const accentColor = { gold: "text-gold-400", teal: "text-teal-400", coral: "text-coral-400" }[accent];
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-300">{label}</span>
        {Icon && <Icon size={16} className={accentColor} />}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-ink-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}
