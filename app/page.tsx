"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Target, TrendingUp, Droplets } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey, lastNDays, formatFriendly } from "@/lib/dates";
import { moodFace, moodColor } from "@/lib/mood";
import { Card, SectionHeader, EmptyState } from "@/components/ui/Card";
import { WeekBars } from "@/components/ui/Charts";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { computeTrend, trendSentence, computeCelebrations, inRange } from "@/lib/insights";
import { TOOLS } from "@/lib/toolkit";

export default function HomePage() {
  const settings = useStore((s) => s.settings);
  const checkIns = useStore((s) => s.checkIns);
  const goals = useStore((s) => s.goals);
  const journalEntries = useStore((s) => s.journalEntries);
  const addJournalEntry = useStore((s) => s.addJournalEntry);

  const today = dayKey();
  const todayCheckIn = useMemo(() => checkIns.find((c) => c.date === today), [checkIns, today]);
  const week = lastNDays(7);
  const weekData = week.map((d) => {
    const c = checkIns.find((x) => x.date === d);
    return { label: new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" }), value: c ? c.overallMood : null };
  });
  const weekCount = checkIns.filter((c) => week.includes(c.date)).length;

  const moodTrend = computeTrend(checkIns, "overallMood");
  const anxietyTrend = computeTrend(checkIns, "anxiety");
  const distinctHelpful = new Set(goals.flatMap((g) => g.helpfulThings)).size;
  const celebrations = computeCelebrations(checkIns, distinctHelpful);

  const activeGoals = goals.filter((g) => !g.archived).slice(0, 3);

  const [quickNote, setQuickNote] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  function saveQuickNote() {
    if (!quickNote.trim()) return;
    addJournalEntry({ date: today, text: quickNote.trim(), tags: [], photoIds: [] });
    setQuickNote("");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="text-sm text-ink-faint">{formatFriendly(today)}</p>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {settings.displayName ? `Hi, ${settings.displayName}` : "How are you doing?"}
        </h1>
      </div>

      <Card className="bg-gradient-to-br from-primary-soft to-calm-soft !border-none">
        {todayCheckIn ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{moodFace(todayCheckIn.overallMood).emoji}</span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Today's mood</p>
                <p className="font-display text-lg font-semibold text-ink">{moodFace(todayCheckIn.overallMood).label}</p>
              </div>
            </div>
            <Link href="/check-in" className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-soft">
              Edit
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-ink">You haven't checked in today</p>
              <p className="text-sm text-ink-soft">Takes under a minute — sliders, taps, and a couple optional notes.</p>
            </div>
            <Link
              href="/check-in"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-ink shadow-soft"
            >
              Check in <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </Card>

      {celebrations[0] && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-good/30 bg-good-soft px-4 py-3 text-sm font-medium text-good">
          <Sparkles size={16} className="shrink-0" />
          {celebrations[0]}
        </div>
      )}

      <Card>
        <SectionHeader
          title="This week"
          subtitle={`Checked in ${weekCount} of 7 days`}
          action={
            <Link href="/timeline" className="text-sm font-medium text-primary">
              Timeline
            </Link>
          }
        />
        <WeekBars data={weekData.map((d) => ({ label: d.label, value: d.value ?? 0 }))} />
      </Card>

      <Card>
        <SectionHeader title="Current wellness trends" subtitle="No judgment, just patterns" />
        <div className="space-y-2 text-sm text-ink-soft">
          {moodTrend ? <TrendLine positive={moodTrend.improving} text={trendSentence(moodTrend, "30 days")} /> : null}
          {anxietyTrend ? <TrendLine positive={anxietyTrend.improving} text={trendSentence(anxietyTrend, "30 days")} /> : null}
          {!moodTrend && !anxietyTrend && (
            <p className="text-ink-faint">Check in for a couple weeks and trends will start showing up here.</p>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Your goals"
          action={
            <Link href="/goals" className="text-sm font-medium text-primary">
              See all
            </Link>
          }
        />
        {activeGoals.length === 0 ? (
          <EmptyState
            icon={<Target size={20} />}
            title="No goals yet"
            body="Set a gentle goal like sleeping better or journaling more."
            action={
              <Link href="/goals" className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
                Add a goal
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {activeGoals.map((g) => (
              <Link
                key={g.id}
                href="/goals"
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-raised p-3"
              >
                <ProgressRing value={g.progress} size={44} stroke={4.5}>
                  <span className="text-xs font-bold text-ink">{g.progress}%</span>
                </ProgressRing>
                <p className="text-sm font-medium text-ink line-clamp-2">{g.title}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Quick journal"
          action={
            <Link href="/journal" className="text-sm font-medium text-primary">
              Open journal
            </Link>
          }
        />
        <textarea
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          placeholder="Capture a thought before it slips away…"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={saveQuickNote}
            className="rounded-full bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary"
          >
            {justSaved ? "Saved ✓" : "Save entry"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Mental health toolkit"
          action={
            <Link href="/toolkit" className="text-sm font-medium text-primary">
              See all
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOOLS.slice(0, 4).map((t) => (
            <Link
              key={t.id}
              href={`/toolkit/${t.id}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised p-3 text-center"
            >
              <t.icon size={20} className="text-primary" />
              <span className="text-xs font-medium text-ink">{t.title}</span>
            </Link>
          ))}
        </div>
      </Card>

      {settings.skinModuleEnabled && (
        <Link href="/skin" className="flex items-center justify-between rounded-3xl border border-skin/30 bg-skin-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <Droplets size={20} className="text-skin" />
            <div>
              <p className="text-sm font-semibold text-ink">Skin wellness</p>
              <p className="text-xs text-ink-soft">Check in, track your routine, see gentle patterns</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-faint" />
        </Link>
      )}
    </div>
  );
}

function TrendLine({ positive, text }: { positive: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <TrendingUp size={15} className={`mt-0.5 shrink-0 ${positive ? "text-good" : "text-ink-faint"}`} />
      <span>{text}</span>
    </div>
  );
}
