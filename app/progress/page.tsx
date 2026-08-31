"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState, SectionHeader } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { computeGrowthAreas, computeCelebrations, consistentWeekStreak } from "@/lib/insights";

export default function ProgressPage() {
  const checkIns = useStore((s) => s.checkIns);
  const journalEntries = useStore((s) => s.journalEntries);
  const toolkitUses = useStore((s) => s.toolkitUses);
  const goals = useStore((s) => s.goals);

  const distinctHelpful = useMemo(() => new Set(goals.flatMap((g) => g.helpfulThings)).size, [goals]);
  const areas = useMemo(
    () => computeGrowthAreas(checkIns, journalEntries.length, toolkitUses.length, distinctHelpful),
    [checkIns, journalEntries.length, toolkitUses.length, distinctHelpful]
  );
  const celebrations = useMemo(() => computeCelebrations(checkIns, distinctHelpful), [checkIns, distinctHelpful]);
  const streak = consistentWeekStreak(checkIns);

  if (checkIns.length < 3) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="A picture of your growth — not a competition, not a grade." />
        <EmptyState
          icon={<TrendingUp size={20} />}
          title="Your progress dashboard starts here"
          body="Check in a few times and this page will start showing your growth areas."
          action={
            <Link href="/check-in" className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
              Check in
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Progress" subtitle="A picture of your growth — not a competition, not a grade." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Check-ins" value={checkIns.length.toString()} />
        <StatTile label="Consistent weeks" value={streak.toString()} />
        <StatTile label="Journal entries" value={journalEntries.length.toString()} />
        <StatTile label="Toolkit uses" value={toolkitUses.length.toString()} />
      </div>

      {celebrations.length > 0 && (
        <Card>
          <SectionHeader title="Worth celebrating" />
          <div className="space-y-2.5">
            {celebrations.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-ink">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-primary" />
                {c}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionHeader title="Growth areas" subtitle="Based on the last 30 days" />
        {areas.length === 0 ? (
          <p className="text-sm text-ink-faint">Keep checking in — growth areas appear after about a week of data.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-raised p-3.5">
                <ProgressRing value={a.score} size={52} stroke={5} color={ringColor(a.score)}>
                  <span className="text-xs font-bold text-ink">{a.score}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-ink">{a.label}</p>
                    {a.trend === "improving" && <span className="text-xs text-good">↑</span>}
                    {a.trend === "new" && <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">new</span>}
                  </div>
                  <p className="text-xs text-ink-soft">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/reports" className="flex-1 rounded-2xl border border-border bg-surface p-4 text-sm font-medium text-ink shadow-card">
          View your weekly & monthly reports →
        </Link>
        <Link href="/story" className="flex-1 rounded-2xl border border-border bg-surface p-4 text-sm font-medium text-ink shadow-card">
          See your Mental Health Story →
        </Link>
      </div>
    </div>
  );
}

function ringColor(score: number) {
  if (score >= 65) return "var(--good)";
  if (score >= 40) return "var(--primary)";
  return "var(--calm)";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5 text-center shadow-card">
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}
