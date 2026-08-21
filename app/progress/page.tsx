"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Award,
  BarChart3,
  CalendarDays,
  Flame,
  Loader2,
  Settings2,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import SubjectPicker from "@/components/SubjectPicker";
import {
  Card,
  EmptyState,
  MASTERY_LABEL,
  MasteryDot,
  PageHeader,
  Pill,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { masteryFor, planFor, useStore } from "@/lib/store";
import { refreshPlan } from "@/lib/pipeline";
import * as api from "@/lib/api";
import { subjectIcon } from "@/lib/icons";
import { CramPlan, MasteryStatus } from "@/lib/types";
import { cx, daysUntil, formatDay, isoDay, xpProgress } from "@/lib/utils";

type Tab = "mastery" | "plan" | "cram" | "you";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "mastery", label: "Mastery", icon: BarChart3 },
  { key: "plan", label: "Study plan", icon: CalendarDays },
  { key: "cram", label: "Cram mode", icon: Zap },
  { key: "you", label: "You", icon: Award },
];

export default function ProgressPage() {
  const hydrated = useStore((s) => s.hydrated);
  const [tab, setTab] = useState<Tab>("mastery");

  if (!hydrated) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Progress"
        subtitle="What you know, what's shaky, and what to do about it."
      />

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cx("chip shrink-0", tab === key && "chip-active")}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "mastery" && <MasteryTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "cram" && <CramTab />}
      {tab === "you" && <YouTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const ORDER: MasteryStatus[] = ["needs-review", "learning", "mastered"];

function MasteryTab() {
  const state = useStore((s) => s);
  const subjects = state.subjects;

  const anyMastery = state.mastery.length > 0;

  if (!anyMastery) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No mastery data yet"
        body="Take a quiz, review some flashcards or teach a concept back — TutorAI works out what you know from how you actually perform, not from what you tell it."
        action={
          <Link href="/practice" className="btn-primary">
            Start practising
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {subjects.map((subject) => {
        const topics = masteryFor(state, subject.id);
        if (topics.length === 0) return null;
        const Icon = subjectIcon(subject.icon);
        const counts = {
          mastered: topics.filter((t) => t.status === "mastered").length,
          learning: topics.filter((t) => t.status === "learning").length,
          "needs-review": topics.filter((t) => t.status === "needs-review").length,
        };
        const pctMastered = Math.round(
          (counts.mastered / topics.length) * 100
        );

        return (
          <div key={subject.id}>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <Icon size={12} style={{ color: subject.color }} />
                {subject.name}
              </span>
            </SectionTitle>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {pctMastered}% mastered
                </span>
                <span className="flex gap-2 text-[11px] text-ink-muted">
                  <span>🟢 {counts.mastered}</span>
                  <span>🟡 {counts.learning}</span>
                  <span>🔴 {counts["needs-review"]}</span>
                </span>
              </div>
              <ProgressBar
                value={pctMastered}
                tone={pctMastered >= 70 ? "good" : pctMastered >= 40 ? "warn" : "bad"}
              />

              <ul className="mt-4 space-y-2">
                {[...topics]
                  .sort(
                    (a, b) =>
                      ORDER.indexOf(a.status) - ORDER.indexOf(b.status)
                  )
                  .map((m) => {
                    const last = m.history[m.history.length - 1];
                    return (
                      <li
                        key={m.topic}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-ink-soft">
                          <MasteryDot status={m.status} />
                          <span className="truncate">{m.topic}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {MASTERY_LABEL[m.status]} · {last?.score ?? 0}%
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PlanTab() {
  const state = useStore((s) => s);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const updateSubject = useStore((s) => s.updateSubject);
  const updateProfile = useStore((s) => s.updateProfile);
  const toggleTask = useStore((s) => s.toggleTask);

  const subjectId = activeSubjectId || state.subjects[0]?.id || "";
  const subject = state.subjects.find((s) => s.id === subjectId);
  const plan = planFor(state, subjectId);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    try {
      await refreshPlan(subjectId);
    } finally {
      setBusy(false);
    }
  };

  const today = isoDay();

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <Card className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Exam date</label>
            <input
              type="date"
              className="field"
              value={subject?.examDate ?? ""}
              onChange={(e) =>
                updateSubject(subjectId, { examDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">
              Minutes a day: {state.profile.dailyMinutes}
            </label>
            <input
              type="range"
              min={10}
              max={180}
              step={10}
              value={state.profile.dailyMinutes}
              onChange={(e) =>
                updateProfile({ dailyMinutes: Number(e.target.value) })
              }
              className="w-full accent-brand-600"
            />
          </div>
        </div>

        {subject?.examDate && (
          <p className="mt-3 text-sm text-ink-muted">
            {(() => {
              const d = daysUntil(subject.examDate);
              if (d < 0) return "That date has passed.";
              if (d === 0) return "Exam is today.";
              if (d === 1) return "Exam is tomorrow — try Cram Mode.";
              return `${d} days to go.`;
            })()}
          </p>
        )}

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={busy || !subject?.examDate}
          onClick={build}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Planning…
            </>
          ) : (
            <>
              <CalendarDays size={15} />
              {plan ? "Rebuild plan around my latest results" : "Build my study plan"}
            </>
          )}
        </button>
        {!subject?.examDate && (
          <p className="mt-2 text-[11px] text-ink-faint">
            Set an exam date first — the plan works backwards from it.
          </p>
        )}
      </Card>

      {plan && (
        <>
          <SectionTitle>
            {plan.days.length}-day plan to {formatDay(plan.examDate)}
          </SectionTitle>
          <div className="space-y-3">
            {plan.days.map((day) => {
              const isToday = day.date === today;
              return (
                <Card
                  key={day.date}
                  className={cx(isToday && "border-brand-300 ring-2 ring-brand-50")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {formatDay(day.date)}
                        {isToday && (
                          <span className="ml-2 text-xs font-bold text-brand-600">
                            TODAY
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-muted">{day.focus}</p>
                    </div>
                    <Pill tone={day.completed ? "good" : "neutral"}>
                      <Timer size={11} /> {day.estimatedMinutes}m
                    </Pill>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {day.tasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => toggleTask(plan.id, day.date, task.id)}
                          className="flex w-full items-start gap-2.5 text-left"
                        >
                          <span
                            className={cx(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                              task.done
                                ? "border-brand-500 bg-brand-500 text-white"
                                : "border-ink-faint"
                            )}
                          >
                            {task.done && "✓"}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cx(
                                "block text-sm",
                                task.done
                                  ? "text-ink-faint line-through"
                                  : "text-ink-soft"
                              )}
                            >
                              {task.label}
                            </span>
                            <span className="block text-xs text-ink-faint">
                              {task.detail} · {task.minutes} min
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CramTab() {
  const state = useStore((s) => s);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const setCramPlan = useStore((s) => s.setCramPlan);

  const subjectId = activeSubjectId || state.subjects[0]?.id || "";
  const subject = state.subjects.find((s) => s.id === subjectId);
  const existing = state.cramPlans.find((p) => p.subjectId === subjectId);
  const [hours, setHours] = useState(3);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!subject) return;
    setBusy(true);
    try {
      const mastery = state.mastery.filter((m) => m.subjectId === subjectId);
      const result = await api.cram({
        subject: subject.name,
        notes: state.notes
          .filter((n) => n.subjectId === subjectId)
          .map((n) => ({ title: n.title, text: n.rawText.slice(0, 8000) })),
        weakTopics: mastery
          .filter((m) => m.status === "needs-review")
          .map((m) => m.topic),
        strongTopics: mastery
          .filter((m) => m.status === "mastered")
          .map((m) => m.topic),
        recentScore: state.attempts.find((a) => a.subjectId === subjectId)?.score,
        minutesAvailable: hours * 60,
      });
      if (result) {
        const plan: CramPlan = {
          ...result.plan,
          subjectId,
          createdAt: Date.now(),
        };
        setCramPlan(plan);
        useStore.getState().touchStreak();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <Card className="mt-4 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <Zap size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">My test is tomorrow</p>
            <p className="mt-1 text-sm text-ink-soft">
              TutorAI reads everything you&apos;ve uploaded for{" "}
              {subject?.name ?? "this subject"}, cross-references what you keep
              getting wrong, and builds the highest-value review it can fit in
              the time you have left.
            </p>

            <label className="label mt-4">Hours available: {hours}</label>
            <input
              type="range"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-amber-600"
            />

            <button
              type="button"
              className="btn-primary mt-3 w-full"
              disabled={busy}
              onClick={run}
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Prioritising…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Build my cram plan
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      {existing && (
        <>
          <SectionTitle>Tonight&apos;s run order</SectionTitle>
          {existing.schedule.length > 0 && (
            <Card>
              <ol className="space-y-3">
                {existing.schedule.map((block, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {block.block}
                        <span className="ml-2 text-xs font-normal text-ink-faint">
                          {block.minutes} min
                        </span>
                      </p>
                      <p className="text-sm text-ink-muted">{block.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <CramList title="Most important" items={existing.mostImportant} tone="brand" />
          <CramList title="Your weakest" items={existing.weakest} tone="bad" />

          {existing.essentialVocab.length > 0 && (
            <>
              <SectionTitle>Essential vocabulary</SectionTitle>
              <Card>
                <dl className="space-y-2">
                  {existing.essentialVocab.map((v) => (
                    <div key={v.term}>
                      <dt className="text-sm font-semibold text-ink">{v.term}</dt>
                      <dd className="text-sm text-ink-muted">{v.definition}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </>
          )}

          {existing.essentialFormulas.length > 0 && (
            <>
              <SectionTitle>Essential formulas</SectionTitle>
              <Card>
                <div className="space-y-2">
                  {existing.essentialFormulas.map((f) => (
                    <div key={f.name}>
                      <p className="text-sm font-semibold text-ink">{f.name}</p>
                      <p className="rounded bg-surface-sunk px-2 py-1 font-mono text-[13px] text-ink-soft">
                        {f.expression}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">{f.whenToUse}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {existing.confusionPoints.length > 0 && (
            <>
              <SectionTitle>Where people trip up</SectionTitle>
              <Card>
                <ul className="space-y-2">
                  {existing.confusionPoints.map((c, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-ink-soft">{c.cause}</span>
                      <span className="mx-1.5 text-brand-500">→</span>
                      <span className="font-medium text-ink">{c.effect}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}

          <div className="mt-5">
            <Link href="/tests?new=1" className="btn-primary w-full">
              Finish with a full practice test
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function CramList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "brand" | "bad";
}) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Card>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-soft">
              <span
                className={cx(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  tone === "brand" ? "bg-brand-500" : "bg-status-bad"
                )}
              />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */

function YouTab() {
  const profile = useStore((s) => s.profile);
  const stats = useStore((s) => s.stats);
  const updateProfile = useStore((s) => s.updateProfile);
  const resetEverything = useStore((s) => s.resetEverything);
  const [confirming, setConfirming] = useState(false);

  const xp = xpProgress(profile.xp);

  return (
    <div>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold tracking-tight text-ink">
              Level {profile.level}
            </p>
            <p className="text-sm text-ink-muted">{profile.xp} XP total</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600">
            <Flame size={15} /> {profile.streakDays}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={(xp.into / xp.needed) * 100} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          {xp.needed - xp.into} XP to level {profile.level + 1}
        </p>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Cards reviewed" value={stats.cardsReviewed} />
        <Stat label="Questions" value={stats.questionsAnswered} />
        <Stat label="Minutes" value={stats.minutesStudied} />
      </div>

      <SectionTitle>Achievements</SectionTitle>
      {profile.achievements.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Nothing unlocked yet. Add notes, take a test, keep a streak going.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profile.achievements.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-2.5">
                <Award size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-ink">{a.label}</p>
                  <p className="text-xs text-ink-muted">{a.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Settings</SectionTitle>
      <Card>
        <label className="label">Your name</label>
        <input
          className="field"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
        />

        <label className="label mt-4">Level</label>
        <div className="flex flex-wrap gap-2">
          {["Middle school", "High school", "AP / A-level", "College"].map(
            (level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateProfile({ gradeLevel: level })}
                className={cx(
                  "chip",
                  profile.gradeLevel === level && "chip-active"
                )}
              >
                {level}
              </button>
            )
          )}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Sets how the tutor pitches explanations. Your actual results override
          it as you go.
        </p>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center gap-2 text-ink-muted">
          <Settings2 size={15} />
          <span className="section-title">Reset</span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Everything lives in this browser. Resetting clears your notes, cards,
          tests and progress permanently.
        </p>
        {confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary flex-1 bg-status-bad hover:bg-red-700"
              onClick={() => {
                resetEverything();
                setConfirming(false);
              }}
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary btn-sm mt-3"
            onClick={() => setConfirming(true)}
          >
            Reset all data
          </button>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-4 text-center">
      <p className="text-xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}
