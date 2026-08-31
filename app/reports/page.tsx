"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileBarChart, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState, SectionHeader } from "@/components/ui/Card";
import { buildWeeklyReport, buildMonthlyReport } from "@/lib/reports";
import { weekStartKey, monthKey, dayKey, addDays } from "@/lib/dates";

export default function ReportsPage() {
  const checkIns = useStore((s) => s.checkIns);
  const goals = useStore((s) => s.goals);
  const [tab, setTab] = useState<"weekly" | "monthly">("weekly");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const currentWeekStart = weekStartKey(dayKey(addDays(new Date(), weekOffset * 7)));
  const weekly = useMemo(() => buildWeeklyReport(checkIns, currentWeekStart), [checkIns, currentWeekStart]);

  const now = new Date();
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const month = monthKey(dayKey(targetMonthDate));
  const monthly = useMemo(() => buildMonthlyReport(checkIns, goals, month), [checkIns, goals, month]);

  if (checkIns.length === 0) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Weekly and monthly summaries, written in plain language." />
        <EmptyState icon={<FileBarChart size={20} />} title="No reports yet" body="Check in for a week and your first report will be ready." />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Reports" subtitle="Weekly and monthly summaries, written in plain language." />

      <div className="flex gap-1 rounded-full border border-border bg-surface-raised p-1">
        {(["weekly", "monthly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-medium capitalize transition ${tab === t ? "bg-primary text-primary-ink" : "text-ink-soft"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "weekly" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="rounded-full border border-border p-2"><ChevronLeft size={16} /></button>
            <p className="text-sm font-medium text-ink">Week of {weekly.weekStart} – {weekly.weekEndLabel}</p>
            <button onClick={() => setWeekOffset((o) => Math.min(0, o + 1))} disabled={weekOffset === 0} className="rounded-full border border-border p-2 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>

          <Card>
            <SectionHeader title="Your week" />
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Check-ins" value={`${weekly.checkInCount}/7`} />
              <Stat label="Avg mood" value={weekly.avgMood !== null ? `${weekly.avgMood}/10` : "—"} />
              <Stat label="Top feelings" value={weekly.mostCommonEmotions.join(", ") || "—"} span />
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink-soft">
              {weekly.biggestStressSource && <p>• {weekly.biggestStressSource}</p>}
              <p>• {weekly.sleepTrendText}</p>
              <p>• {weekly.habitTrendText}</p>
              {weekly.biggestImprovement && <p className="text-good">• {weekly.biggestImprovement}</p>}
              {weekly.worthAttention && <p>• {weekly.worthAttention}</p>}
            </div>
            {weekly.positiveMoments.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Positive moments</p>
                <ul className="space-y-1 text-sm text-ink-soft">
                  {weekly.positiveMoments.map((m, i) => <li key={i}>"{m}"</li>)}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="What I learned about myself" />
            <ul className="space-y-2 text-sm text-ink">
              {weekly.whatILearned.map((l, i) => <li key={i}>• {l}</li>)}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Next week" />
            <ul className="space-y-2 text-sm text-ink">
              {weekly.nextWeekSuggestions.map((l, i) => <li key={i}>• {l}</li>)}
            </ul>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setMonthOffset((o) => o - 1)} className="rounded-full border border-border p-2"><ChevronLeft size={16} /></button>
            <p className="text-sm font-medium text-ink">{monthly.monthLabel}</p>
            <button onClick={() => setMonthOffset((o) => Math.min(0, o + 1))} disabled={monthOffset === 0} className="rounded-full border border-border p-2 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>

          <Card>
            <SectionHeader title="This month" />
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Check-ins" value={monthly.checkInCount.toString()} />
              <Stat label="Avg mood" value={monthly.avgMood !== null ? `${monthly.avgMood}/10` : "—"} />
              <Stat label="Goals completed" value={monthly.goalsCompleted.toString()} />
              <Stat label="Goals in progress" value={monthly.goalsInProgress.toString()} />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-primary-soft to-good-soft !border-none">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Look how far you've come</p>
            <p className="mt-2 text-sm font-medium text-ink">{monthly.lookHowFar}</p>
          </Card>

          {monthly.achievements.length > 0 && (
            <Card>
              <SectionHeader title="Achievements" />
              <ul className="space-y-2 text-sm text-ink">
                {monthly.achievements.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </Card>
          )}

          {monthly.mostHelpfulActivities.length > 0 && (
            <Card>
              <SectionHeader title="Most helpful activities" />
              <div className="flex flex-wrap gap-2">
                {monthly.mostHelpfulActivities.map((h) => <span key={h} className="rounded-full bg-good-soft px-3 py-1 text-sm text-good">{h}</span>)}
              </div>
            </Card>
          )}

          {monthly.difficultWeeks.length > 0 && (
            <Card>
              <SectionHeader title="Harder stretches" subtitle="Named gently, not judged" />
              <ul className="space-y-2 text-sm text-ink-soft">
                {monthly.difficultWeeks.map((d, i) => <li key={i}>• {d}</li>)}
              </ul>
            </Card>
          )}

          <Link href="/story" className="block rounded-2xl border border-border bg-surface p-4 text-center text-sm font-medium text-primary shadow-card">
            See your full Mental Health Story →
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}
