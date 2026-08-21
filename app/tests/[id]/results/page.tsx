"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RotateCcw,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Card, EmptyState, MasteryDot, Pill, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { targetedPractice } from "@/lib/pipeline";
import { cx } from "@/lib/utils";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const test = useStore((s) => s.tests.find((t) => t.id === id));
  const attempt = useStore((s) =>
    s.attempts.find((a) => a.testId === id && a.submittedAt)
  );
  const mastery = useStore((s) =>
    s.mastery.filter((m) => m.subjectId === test?.subjectId)
  );
  const [busy, setBusy] = useState(false);

  if (!hydrated) return null;

  if (!test || !attempt) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="No results yet"
        body="Take this test first and the full breakdown will show up here."
        action={
          <Link href="/tests" className="btn-primary">
            Back to tests
          </Link>
        }
      />
    );
  }

  const missed = attempt.questionResults.filter((r) => !r.correct);
  const tone =
    attempt.score >= 80 ? "good" : attempt.score >= 60 ? "warn" : "bad";
  const ring = {
    good: "text-status-good",
    warn: "text-status-warn",
    bad: "text-status-bad",
  }[tone];

  const startPractice = async () => {
    setBusy(true);
    try {
      const newId = await targetedPractice(test.subjectId, attempt.weakAreas);
      if (newId) router.push(`/tests/${newId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <Link
        href="/tests"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> Tests
      </Link>

      <Card className="text-center">
        <p className="section-title">Score</p>
        <p className={cx("mt-1 text-5xl font-bold tracking-tight", ring)}>
          {attempt.score}%
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {attempt.questionResults.filter((r) => r.correct).length} of{" "}
          {attempt.questionResults.length} correct · {test.title}
        </p>
        {attempt.feedback && (
          <p className="mt-3 border-t border-surface-line pt-3 text-sm text-ink-soft">
            {attempt.feedback}
          </p>
        )}
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-status-good">
            <TrendingUp size={15} />
            <span className="section-title">Strong areas</span>
          </div>
          {attempt.strongAreas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {attempt.strongAreas.map((t) => (
                <Pill key={t} tone="good">
                  {t}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              Nothing hit 80% this time — that&apos;s what the practice below is
              for.
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-status-bad">
            <Target size={15} />
            <span className="section-title">Weak areas</span>
          </div>
          {attempt.weakAreas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {attempt.weakAreas.map((t) => (
                <Pill key={t} tone="bad">
                  {t}
                </Pill>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              No weak topics. Strong work.
            </p>
          )}
        </Card>
      </div>

      {attempt.weakAreas.length > 0 && (
        <Card className="mt-3 border-brand-200 bg-brand-50/50">
          <p className="text-sm font-semibold text-ink">
            Turn this into your next session
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            TutorAI will write a short practice set aimed only at{" "}
            {attempt.weakAreas.slice(0, 3).join(", ")}
            {attempt.weakAreas.length > 3 ? " and the rest" : ""} — easier
            questions first, working back up.
          </p>
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            disabled={busy}
            onClick={startPractice}
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Building your
                practice set…
              </>
            ) : (
              <>
                <Target size={15} /> Start targeted practice
              </>
            )}
          </button>
        </Card>
      )}

      {missed.length > 0 && (
        <>
          <SectionTitle>Questions missed ({missed.length})</SectionTitle>
          <div className="space-y-3">
            {missed.map((result) => {
              const question = test.questions.find(
                (q) => q.id === result.questionId
              );
              if (!question) return null;
              return (
                <Card key={result.questionId}>
                  <div className="flex items-start gap-2">
                    <XCircle size={15} className="mt-0.5 shrink-0 text-status-bad" />
                    <p className="text-sm font-medium text-ink">
                      {question.prompt}
                    </p>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-lg bg-red-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
                        You answered
                      </p>
                      <p className="text-red-900">
                        {result.studentAnswer.trim() || "(left blank)"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
                        Correct answer
                      </p>
                      <p className="text-green-900">{result.correctAnswer}</p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-surface-line pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                      Why you got it wrong
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {result.whyWrong}
                    </p>
                  </div>

                  <div className="mt-3">
                    <Pill>{result.topic}</Pill>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {missed.length === 0 && (
        <Card className="mt-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-status-good" />
            <p className="text-sm font-semibold text-ink">
              Every question correct.
            </p>
          </div>
        </Card>
      )}

      {mastery.length > 0 && (
        <>
          <SectionTitle>Mastery after this test</SectionTitle>
          <Card>
            <ul className="space-y-2">
              {mastery.map((m) => (
                <li
                  key={m.topic}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-ink-soft">
                    <MasteryDot status={m.status} />
                    {m.topic}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {m.history[m.history.length - 1]?.score ?? 0}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <div className="mt-5 flex gap-2">
        <Link href={`/tests/${test.id}`} className="btn-secondary flex-1">
          <RotateCcw size={15} /> Retake
        </Link>
        <Link href="/progress" className="btn-secondary flex-1">
          See progress
        </Link>
      </div>
    </div>
  );
}
