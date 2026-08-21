"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  ClipboardList,
  FileQuestion,
  Flame,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useStore, latestAttempt, nextExam, todayTasks, weakTopics } from "@/lib/store";
import { Card, MasteryDot, Pill, ProgressBar, SectionTitle, Skeleton } from "@/components/ui";
import { daysUntil, greeting, xpProgress } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/notes?add=1", label: "Scan Notes", icon: ScanLine },
  { href: "/learn", label: "Ask Tutor", icon: Brain },
  { href: "/practice", label: "Make Quiz", icon: FileQuestion },
  { href: "/tests?new=1", label: "Practice Test", icon: ClipboardList },
];

export default function HomePage() {
  const hydrated = useStore((s) => s.hydrated);
  const state = useStore((s) => s);
  const [hello, setHello] = useState("Ready to study?");

  // Rendered after mount so the server and client markup agree.
  useEffect(() => setHello(greeting()), []);

  if (!hydrated) return <HomeSkeleton />;

  const { profile, subjects } = state;
  const today = todayTasks(state);
  const exam = nextExam(state);
  const weak = weakTopics(state);
  const recent = latestAttempt(state);
  const xp = xpProgress(profile.xp);

  const remaining = today?.day.tasks.filter((t) => !t.done) ?? [];
  const sessionMinutes = remaining.reduce((sum, t) => sum + t.minutes, 0);

  return (
    <div className="animate-fade-up">
      <div className="mb-5 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{hello}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {weak.length > 0
            ? `${weak.length} topic${weak.length === 1 ? "" : "s"} need${
                weak.length === 1 ? "s" : ""
              } another look today.`
            : subjects.length > 0
            ? "Everything's warm. A short session keeps it that way."
            : "Add a subject to get started."}
        </p>
      </div>

      <SectionTitle>Today&apos;s plan</SectionTitle>
      <Card>
        {today && remaining.length > 0 ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{today.day.focus}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {remaining.length} task{remaining.length === 1 ? "" : "s"} left ·{" "}
                  {sessionMinutes} min
                </p>
              </div>
              <Pill tone="brand">
                <Target size={12} /> Planned
              </Pill>
            </div>
            <ul className="mt-3 space-y-1.5">
              {remaining.slice(0, 3).map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-sm text-ink-soft">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span>
                    {task.label}
                    <span className="text-ink-faint"> · {task.minutes} min</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/progress" className="btn-primary mt-4 w-full">
              Start {Math.min(sessionMinutes, profile.dailyMinutes)}-minute session
              <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">No plan yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Set an exam date and TutorAI will build a day-by-day plan that
              shifts as your results come in.
            </p>
            <Link href="/progress" className="btn-secondary mt-4 w-full">
              Build a study plan
            </Link>
          </>
        )}
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <CalendarClock size={15} />
            <span className="section-title">Upcoming test</span>
          </div>
          {exam ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">
                {exam.subject.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {(() => {
                  const d = daysUntil(exam.examDate);
                  if (d < 0) return "Past";
                  if (d === 0) return "Today — good luck";
                  if (d === 1) return "Tomorrow";
                  return `In ${d} days`;
                })()}
              </p>
              <Link href="/progress" className="btn-secondary btn-sm mt-3 w-full">
                View study plan
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-muted">Nothing scheduled.</p>
              <Link href="/progress" className="btn-secondary btn-sm mt-3 w-full">
                Add an exam date
              </Link>
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <Target size={15} />
            <span className="section-title">Needs review</span>
          </div>
          {weak.length > 0 ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">
                {weak.length} topic{weak.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-1.5 space-y-1">
                {weak.slice(0, 3).map((m) => (
                  <li
                    key={`${m.subjectId}-${m.topic}`}
                    className="flex items-center gap-1.5 text-xs text-ink-soft"
                  >
                    <MasteryDot status={m.status} />
                    {m.topic}
                  </li>
                ))}
              </ul>
              <Link href="/practice" className="btn-secondary btn-sm mt-3 w-full">
                Practise these
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-muted">
                Nothing flagged. Take a quiz to find the gaps.
              </p>
              <Link href="/practice" className="btn-secondary btn-sm mt-3 w-full">
                Go to practice
              </Link>
            </>
          )}
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <TrendingUp size={15} />
            <span className="section-title">Recent score</span>
          </div>
          {recent ? (
            <>
              <p className="mt-2 text-3xl font-bold tracking-tight text-ink">
                {recent.score}%
              </p>
              <Link
                href={`/tests/${recent.testId}/results`}
                className="btn-secondary btn-sm mt-3 w-full"
              >
                See breakdown
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-muted">
                No tests taken yet.
              </p>
              <Link href="/tests" className="btn-secondary btn-sm mt-3 w-full">
                Take a practice test
              </Link>
            </>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-ink-muted">
            <Flame size={15} />
            <span className="section-title">Streak &amp; level</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">
            {profile.streakDays} day{profile.streakDays === 1 ? "" : "s"} · Level{" "}
            {profile.level}
          </p>
          <div className="mt-2">
            <ProgressBar value={(xp.into / xp.needed) * 100} />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {xp.into}/{xp.needed} XP to level {profile.level + 1}
          </p>
        </Card>
      </div>

      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="card flex flex-col items-center gap-2 px-3 py-5 text-center transition hover:shadow-pop"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={17} />
            </span>
            <span className="text-xs font-semibold text-ink-soft">{label}</span>
          </Link>
        ))}
      </div>

      {state.notes.length === 0 && (
        <Card className="mt-5 border-brand-200 bg-brand-50/50">
          <div className="flex items-start gap-3">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <p className="text-sm font-semibold text-ink">
                Start with your own notes
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Paste, type or photograph a set of notes and hit{" "}
                <strong>Study This</strong>. TutorAI writes the summary,
                flashcards, a quiz and a study guide from your material — then
                builds everything else around what you get wrong.
              </p>
              <Link href="/notes?add=1" className="btn-primary btn-sm mt-3">
                Add notes
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72" />
      <div className="card space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
