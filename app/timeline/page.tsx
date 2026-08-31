"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { RangeTabs } from "@/components/ui/RangeTabs";
import { TrendChart } from "@/components/ui/Charts";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { buildSeries } from "@/lib/series";
import { type RangeKey } from "@/lib/dates";
import { formatFriendly } from "@/lib/dates";
import { computeTrend, trendSentence, inRange, topEmotions, FIELD_LABELS, type NumericField, sortByDate } from "@/lib/insights";
import { moodFace, EMOTION_META } from "@/lib/mood";
import type { CheckIn } from "@/lib/types";

const FIELD_OPTIONS: { field: NumericField; label: string; color: string }[] = [
  { field: "overallMood", label: "Mood", color: "var(--primary)" },
  { field: "anxiety", label: "Anxiety", color: "var(--warn)" },
  { field: "energy", label: "Energy", color: "var(--good)" },
  { field: "sleepQuality", label: "Sleep", color: "var(--calm)" },
  { field: "socialConnection", label: "Social", color: "var(--good)" },
  { field: "confidence", label: "Confidence", color: "var(--primary)" },
];

const RANGE_LABEL_TEXT: Record<RangeKey, string> = {
  today: "today", "7d": "7 days", "30d": "30 days", "3m": "3 months", "6m": "6 months", "1y": "1 year",
};

export default function TimelinePage() {
  const checkIns = useStore((s) => s.checkIns);
  const [range, setRange] = useState<RangeKey>("30d");
  const [field, setField] = useState<NumericField>("overallMood");
  const [selectedDay, setSelectedDay] = useState<CheckIn | null>(null);

  const series = useMemo(() => buildSeries(checkIns, range, field), [checkIns, range, field]);
  const rangeCheckIns = useMemo(() => inRange(checkIns, range), [checkIns, range]);
  const activeField = FIELD_OPTIONS.find((f) => f.field === field)!;

  const trends = useMemo(
    () => (["overallMood", "anxiety", "energy", "sleepQuality"] as NumericField[]).map((f) => computeTrend(checkIns, f)).filter(Boolean),
    [checkIns]
  );

  const emotions = useMemo(() => topEmotions(rangeCheckIns, 6), [rangeCheckIns]);

  if (checkIns.length === 0) {
    return (
      <div>
        <PageHeader title="Emotional timeline" subtitle="See how your wellbeing changes over time." />
        <EmptyState
          icon={<Sparkles size={20} />}
          title="Nothing to show yet"
          body="Once you check in a few times, your timeline will fill in here."
          action={
            <Link href="/check-in" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
              Check in now
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Emotional timeline" subtitle="No streaks to break, no grades — just your own patterns." />

      <RangeTabs value={range} onChange={setRange} />

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {FIELD_OPTIONS.map((f) => (
            <button
              key={f.field}
              onClick={() => setField(f.field)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                field === f.field ? "bg-primary-soft text-primary" : "bg-surface-raised text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {rangeCheckIns.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">No check-ins in this range yet.</p>
        ) : (
          <TrendChart data={series} color={activeField.color} />
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">What your data shows</p>
        <div className="space-y-2 text-sm text-ink-soft">
          {trends.length ? (
            trends.map((t) => t && <p key={t.field}>{trendSentence(t, "30 days")}</p>)
          ) : (
            <p className="text-ink-faint">Keep checking in — trend sentences appear after about a week of data.</p>
          )}
        </div>
        <Link href="/insights" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
          See pattern discovery <Sparkles size={13} />
        </Link>
      </Card>

      {emotions.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Most common feelings ({RANGE_LABEL_TEXT[range]})</p>
          <div className="flex flex-wrap gap-2">
            {emotions.map((e) => (
              <span key={e.emotion} className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm text-primary">
                {EMOTION_META[e.emotion].emoji} {EMOTION_META[e.emotion].label}
                <span className="text-xs text-primary/70">×{e.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <p className="mb-3 text-sm font-semibold text-ink">Check-ins ({rangeCheckIns.length})</p>
        <div className="divide-y divide-border">
          {sortByDate(rangeCheckIns).reverse().map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedDay(c)}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <span className="text-2xl">{moodFace(c.overallMood).emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{formatFriendly(c.date)}</p>
                <p className="truncate text-xs text-ink-faint">
                  {c.emotions.map((e) => EMOTION_META[e].label).join(", ") || "No emotions tagged"}
                </p>
              </div>
              <span className="text-xs text-ink-faint">Mood {c.overallMood}/10</span>
            </button>
          ))}
        </div>
      </Card>

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? formatFriendly(selectedDay.date) : ""}>
        {selectedDay && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {(["overallMood", "anxiety", "energy", "motivation", "sleepQuality", "socialConnection", "schoolWorkStress", "physicalWellbeing", "confidence"] as NumericField[]).map((f) => (
                <div key={f} className="rounded-xl bg-surface-raised px-3 py-2">
                  <p className="text-xs text-ink-faint">{FIELD_LABELS[f]}</p>
                  <p className="font-semibold text-ink">{selectedDay[f]}/10</p>
                </div>
              ))}
            </div>
            {selectedDay.gratitude && <Field label="Gratitude" value={selectedDay.gratitude} />}
            {selectedDay.wentWell && <Field label="What went well" value={selectedDay.wentWell} />}
            {selectedDay.difficult && <Field label="What was difficult" value={selectedDay.difficult} />}
            {selectedDay.journalNote && <Field label="Journal note" value={selectedDay.journalNote} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className="text-ink-soft">{value}</p>
    </div>
  );
}
