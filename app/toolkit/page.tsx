import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { TOOLS } from "@/lib/toolkit";

export default function ToolkitPage() {
  const categories = [...new Set(TOOLS.map((t) => t.category))];
  return (
    <div>
      <PageHeader title="Toolkit" subtitle="Short, practical tools for everyday moments — not a replacement for therapy, just something to reach for." />
      <div className="space-y-7">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TOOLS.filter((t) => t.category === cat).map((t) => (
                <Link
                  key={t.id}
                  href={`/toolkit/${t.id}`}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-primary/40"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${t.color}22`, color: t.color }}
                  >
                    <t.icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{t.title}</p>
                      <span className="shrink-0 text-xs text-ink-faint">{t.durationLabel}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{t.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
