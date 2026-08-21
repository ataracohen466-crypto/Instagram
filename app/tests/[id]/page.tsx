"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  HelpCircle,
  Loader2,
  Timer,
} from "lucide-react";
import QuestionView from "@/components/QuestionView";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { refreshPlan } from "@/lib/pipeline";
import * as api from "@/lib/api";
import { TestAttempt } from "@/lib/types";
import { cx, uid } from "@/lib/utils";

export default function ExamSimulatorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const test = useStore((s) => s.tests.find((t) => t.id === id));
  const subject = useStore((s) =>
    s.subjects.find((x) => x.id === test?.subjectId)
  );
  const saveAttempt = useStore((s) => s.saveAttempt);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const limitMs = (test?.config.timeLimitMinutes ?? 0) * 60 * 1000;

  const submit = useCallback(async () => {
    if (!test || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);

    const graded = await api.gradeTest({
      questions: test.questions,
      answers,
      title: test.title,
      subject: subject?.name,
    });

    const attempt: TestAttempt = {
      id: uid("attempt"),
      testId: test.id,
      subjectId: test.subjectId,
      startedAt,
      answers,
      flagged,
      submittedAt: Date.now(),
      score: graded?.score ?? 0,
      strongAreas: graded?.strongAreas ?? [],
      weakAreas: graded?.weakAreas ?? [],
      questionResults: graded?.questionResults ?? [],
      feedback: graded?.feedback,
    };

    // Writing the attempt updates topic mastery, XP and the streak; the plan
    // then rebuilds around whatever just turned weak.
    saveAttempt(attempt);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    useStore.getState().bumpStat("minutesStudied", minutes);
    void refreshPlan(test.subjectId);

    router.push(`/tests/${test.id}/results`);
  }, [test, answers, flagged, startedAt, subject, saveAttempt, router]);

  useEffect(() => {
    if (!limitMs) return;
    const tick = () => {
      const left = limitMs - (Date.now() - startedAt);
      setRemaining(left);
      if (left <= 0) void submit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [limitMs, startedAt, submit]);

  const unanswered = useMemo(
    () =>
      (test?.questions ?? []).filter((q) => !(answers[q.id] ?? "").trim()),
    [test, answers]
  );

  if (!hydrated) return null;

  if (!test) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Test not found"
        body="It may have been deleted."
        action={
          <Link href="/tests" className="btn-primary">
            Back to tests
          </Link>
        }
      />
    );
  }

  const question = test.questions[index];
  const isFlagged = flagged.includes(question.id);
  const low = remaining !== null && remaining < 60_000;

  if (submitting) {
    return (
      <Card className="mt-10">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 size={22} className="animate-spin text-brand-600" />
          <p className="text-sm font-semibold text-ink">Marking your test…</p>
          <p className="max-w-xs text-sm text-ink-muted">
            Objective questions are graded instantly; written answers are marked
            against the rubric for each question.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-ink">
            {test.title}
          </h1>
          <p className="text-xs text-ink-muted">
            Question {index + 1} of {test.questions.length}
          </p>
        </div>
        {remaining !== null && (
          <span
            className={cx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums",
              low ? "bg-red-50 text-red-700" : "bg-surface-sunk text-ink-soft"
            )}
          >
            <Timer size={14} />
            {formatClock(remaining)}
          </span>
        )}
      </div>

      {reviewing ? (
        <ReviewPanel
          unanswered={unanswered.length}
          flagged={flagged.length}
          onBack={() => setReviewing(false)}
          onJump={(qid) => {
            const at = test.questions.findIndex((q) => q.id === qid);
            if (at >= 0) setIndex(at);
            setReviewing(false);
          }}
          unansweredIds={unanswered.map((q) => q.id)}
          flaggedIds={flagged}
          questions={test.questions}
          onSubmit={submit}
        />
      ) : (
        <>
          <Card>
            <QuestionView
              question={question}
              index={index}
              answer={answers[question.id] ?? ""}
              onAnswer={(value) =>
                setAnswers((prev) => ({ ...prev, [question.id]: value }))
              }
            />

            <button
              type="button"
              onClick={() =>
                setFlagged((prev) =>
                  prev.includes(question.id)
                    ? prev.filter((f) => f !== question.id)
                    : [...prev, question.id]
                )
              }
              className={cx(
                "btn-secondary btn-sm mt-4",
                isFlagged && "border-amber-300 bg-amber-50 text-amber-700"
              )}
            >
              <Flag size={13} />
              {isFlagged ? "Flagged for review" : "Flag for review"}
            </button>
          </Card>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft size={15} /> Back
            </button>
            {index < test.questions.length - 1 ? (
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => setIndex((i) => i + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => setReviewing(true)}
              >
                Review &amp; submit
              </button>
            )}
          </div>

          <p className="mb-2 mt-6 px-1 section-title">Question navigator</p>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {test.questions.map((q, i) => {
              const answered = Boolean((answers[q.id] ?? "").trim());
              const flag = flagged.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={cx(
                    "relative aspect-square rounded-lg border text-xs font-semibold transition",
                    i === index
                      ? "border-brand-500 bg-brand-600 text-white"
                      : answered
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-surface-line bg-white text-ink-faint hover:bg-surface-sunk"
                  )}
                >
                  {i + 1}
                  {flag && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-secondary mt-4 w-full"
            onClick={() => setReviewing(true)}
          >
            Review &amp; submit
          </button>
        </>
      )}
    </div>
  );
}

function ReviewPanel({
  unanswered,
  flagged,
  unansweredIds,
  flaggedIds,
  questions,
  onBack,
  onJump,
  onSubmit,
}: {
  unanswered: number;
  flagged: number;
  unansweredIds: string[];
  flaggedIds: string[];
  questions: { id: string; prompt: string }[];
  onBack: () => void;
  onJump: (id: string) => void;
  onSubmit: () => void;
}) {
  const numberOf = (id: string) =>
    questions.findIndex((q) => q.id === id) + 1;

  return (
    <div>
      <PageHeader
        title="Before you submit"
        subtitle="Anything left blank is marked wrong, so it's worth a guess."
      />

      <Card>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-ink">{unanswered}</p>
            <p className="text-xs text-ink-muted">Unanswered</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{flagged}</p>
            <p className="text-xs text-ink-muted">Flagged</p>
          </div>
        </div>
      </Card>

      {unansweredIds.length > 0 && (
        <>
          <p className="mb-2 mt-5 px-1 section-title">Unanswered</p>
          <div className="flex flex-wrap gap-2">
            {unansweredIds.map((id) => (
              <button
                key={id}
                type="button"
                className="chip"
                onClick={() => onJump(id)}
              >
                Q{numberOf(id)}
              </button>
            ))}
          </div>
        </>
      )}

      {flaggedIds.length > 0 && (
        <>
          <p className="mb-2 mt-5 px-1 section-title">Flagged for review</p>
          <div className="flex flex-wrap gap-2">
            {flaggedIds.map((id) => (
              <button
                key={id}
                type="button"
                className="chip border-amber-300 bg-amber-50 text-amber-700"
                onClick={() => onJump(id)}
              >
                <Flag size={11} /> Q{numberOf(id)}
              </button>
            ))}
          </div>
        </>
      )}

      {unanswered > 0 && (
        <Card className="mt-5 border-amber-200 bg-amber-50">
          <div className="flex gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900">
              You still have {unanswered} unanswered question
              {unanswered === 1 ? "" : "s"}.
            </p>
          </div>
        </Card>
      )}

      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onBack}>
          Keep working
        </button>
        <button type="button" className="btn-primary flex-1" onClick={onSubmit}>
          Submit test
        </button>
      </div>
    </div>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${`${s}`.padStart(2, "0")}`;
}
