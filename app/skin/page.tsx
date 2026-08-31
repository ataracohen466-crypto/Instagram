"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Droplets, Camera, Sparkles, FlaskConical, FileText, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { dayKey, formatFriendly } from "@/lib/dates";
import { Card, PageHeader, EmptyState, SectionHeader } from "@/components/ui/Card";
import { skinTrends, skinLifestyleConnections, skinMentalConnection, routineConsistency } from "@/lib/skinInsights";
import { TrendChart } from "@/components/ui/Charts";
import { buildSkinSeries } from "@/lib/skinSeries";

export default function SkinHubPage() {
  const skinCheckIns = useStore((s) => s.skinCheckIns);
  const checkIns = useStore((s) => s.checkIns);
  const routineLogs = useStore((s) => s.skinRoutineLogs);
  const allExperiments = useStore((s) => s.skinExperiments);
  const experiments = useMemo(() => allExperiments.filter((e) => !e.archived), [allExperiments]);
  const today = dayKey();
  const todayLogged = skinCheckIns.some((c) => c.date === today);

  const trends = useMemo(() => skinTrends(skinCheckIns), [skinCheckIns]);
  const connections = useMemo(() => skinLifestyleConnections(skinCheckIns, checkIns), [skinCheckIns, checkIns]);
  const mentalConnection = useMemo(() => skinMentalConnection(skinCheckIns, checkIns), [skinCheckIns, checkIns]);
  const consistency = useMemo(() => routineConsistency(routineLogs, "30d"), [routineLogs]);
  const clarityChart = useMemo(() => buildSkinSeries(skinCheckIns, "clarity"), [skinCheckIns]);

  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Skin" subtitle="Let's understand your skin — not fix how you look." />

      <Card className="bg-gradient-to-br from-skin-soft to-primary-soft !border-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-ink">{todayLogged ? "Skin check-in logged today" : "Haven't logged your skin today"}</p>
            <p className="text-sm text-ink-soft">Takes under a minute.</p>
          </div>
          <Link href="/skin/checkin" className="shrink-0 rounded-full bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-soft">
            {todayLogged ? "Update" : "Check in"}
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/skin/routine" icon={<Droplets size={18} />} label="Routine" sub={`${consistency.amPct}% / ${consistency.pmPct}%`} />
        <QuickLink href="/skin/photos" icon={<Camera size={18} />} label="Photos" />
        <QuickLink href="/skin/experiments" icon={<FlaskConical size={18} />} label="Experiments" sub={experiments.length ? `${experiments.length} active` : undefined} />
        <QuickLink href="/skin/report" icon={<FileText size={18} />} label="Report" />
      </div>

      {skinCheckIns.length === 0 ? (
        <EmptyState icon={<Sparkles size={20} />} title="Start tracking your skin" body="Check in a few times to see trends, routine consistency, and gentle patterns here." />
      ) : (
        <>
          <Card>
            <SectionHeader title="Clarity trend" subtitle="Last 30 days" />
            <TrendChart data={clarityChart} color="var(--skin)" height={160} />
          </Card>

          <Card>
            <SectionHeader title="Recent trends" />
            <div className="space-y-2 text-sm text-ink-soft">
              {trends.filter((t) => t.field !== "texture").map((t) => (
                <p key={t.field}>• {t.text}</p>
              ))}
            </div>
          </Card>

          {(connections.length > 0 || true) && (
            <Card>
              <SectionHeader title="Skin + lifestyle patterns" />
              {connections.length ? (
                <div className="space-y-2 text-sm text-ink-soft">
                  {connections.map((c) => (
                    <p key={c.id}>• {c.text}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Keep logging both your daily and skin check-ins — patterns will appear here.</p>
              )}
              <p className="mt-2 text-xs text-ink-faint">Patterns in your own data — not medical conclusions.</p>
            </Card>
          )}

          <Card>
            <SectionHeader title="Skin + how you're feeling" />
            <p className="text-sm text-ink-soft">{mentalConnection}</p>
            <button onClick={() => setShowWhy((s) => !s)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
              Why track this together? {showWhy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showWhy && (
              <p className="mt-2 rounded-xl bg-primary-soft p-3 text-xs text-ink-soft">
                Seeing both side by side can help you notice real patterns — like stress and skin both settling down together — without
                assuming one causes the other, and without ever tying your worth to either.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function QuickLink({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface p-3.5 text-center shadow-card">
      <span className="text-skin">{icon}</span>
      <span className="text-xs font-medium text-ink">{label}</span>
      {sub && <span className="text-[10px] text-ink-faint">{sub}</span>}
    </Link>
  );
}
