"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import SubjectPicker from "@/components/SubjectPicker";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import { Difficulty, QuestionType } from "@/lib/types";
import { cx } from "@/lib/utils";

const TYPES: { key: QuestionType; label: string }[] = [
  { key: "mcq", label: "Multiple choice" },
  { key: "short", label: "Short answer" },
  { key: "true-false", label: "True / false" },
  { key: "fill-blank", label: "Fill in the blank" },
  { key: "matching", label: "Matching" },
  { key: "essay", label: "Essay" },
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "mixed"];

export default function TestsPage() {
  return (
    <Suspense fallback={null}>
      <TestsInner />
    </Suspense>
  );
}

function TestsInner() {
  const params = useSearchParams();
  const hydrated = useStore((s) => s.hydrated);
  const tests = useStore((s) => s.tests);
  const attempts = useStore((s) => s.attempts);
  const subjects = useStore((s) => s.subjects);
  const removeTest = useStore((s) => s.removeTest);
  const [creating, setCreating] = useState(params.get("new") === "1");

  if (!hydrated) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Tests"
        subtitle="Full, timed practice tests — generated, graded and broken down."
        right={
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus size={14} /> New
          </button>
        }
      />

      {creating && <TestBuilder onCancel={() => setCreating(false)} />}

      {tests.length === 0 && !creating ? (
        <EmptyState
          icon={ClipboardList}
          title="No tests yet"
          body="Pick a subject, a unit and a length — TutorAI writes a realistic full-length test, grades it, and shows you exactly which topics cost you marks."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreating(true)}
            >
              <Wand2 size={15} /> Create a practice test
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {tests.map((test) => {
            const attempt = attempts.find(
              (a) => a.testId === test.id && a.submittedAt
            );
            const subject = subjects.find((s) => s.id === test.subjectId);
            return (
              <Card key={test.id}>
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={
                      attempt ? `/tests/${test.id}/results` : `/tests/${test.id}`
                    }
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-semibold text-ink">
                      {test.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {subject?.name} · {test.questions.length} questions ·{" "}
                      {test.config.timeLimitMinutes} min
                    </p>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete test"
                    className="btn-ghost btn-sm shrink-0 text-ink-faint hover:text-status-bad"
                    onClick={() => removeTest(test.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill>{test.config.difficulty}</Pill>
                  {test.kind === "practice" && <Pill tone="brand">Practice</Pill>}
                  {attempt ? (
                    <Pill
                      tone={
                        attempt.score >= 80
                          ? "good"
                          : attempt.score >= 60
                          ? "warn"
                          : "bad"
                      }
                    >
                      {attempt.score}%
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Not taken</Pill>
                  )}
                </div>

                <Link
                  href={attempt ? `/tests/${test.id}/results` : `/tests/${test.id}`}
                  className={cx(
                    "mt-3 w-full",
                    attempt ? "btn-secondary" : "btn-primary"
                  )}
                >
                  {attempt ? "See results" : "Start test"}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TestBuilder({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const notes = useStore((s) => s.notes);
  const mastery = useStore((s) => s.mastery);
  const addTest = useStore((s) => s.addTest);
  const setActiveSubject = useStore((s) => s.setActiveSubject);

  const [subjectId, setSubjectId] = useState(activeSubjectId || subjects[0]?.id || "");
  const [unit, setUnit] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [numQuestions, setNumQuestions] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "short"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subject = subjects.find((s) => s.id === subjectId);
  const subjectNotes = notes.filter((n) => n.subjectId === subjectId);

  const toggleType = (type: QuestionType) => {
    setTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const create = async () => {
    if (!subject) {
      setError("Pick a subject first.");
      return;
    }
    if (types.length === 0) {
      setError("Choose at least one question type.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const material = subjectNotes
        .map((n) => `## ${n.title}\n${n.rawText}`)
        .join("\n\n")
        .slice(0, 30000);

      const weak = mastery
        .filter((m) => m.subjectId === subjectId && m.status === "needs-review")
        .map((m) => m.topic);

      const result = await api.generateTest({
        subject: subject.name,
        unit: unit.trim() || "the whole course so far",
        difficulty,
        numQuestions,
        questionTypes: types,
        timeLimitMinutes: minutes,
        material: material || undefined,
        weakTopics: weak,
      });

      if (!result || result.questions.length === 0) {
        setError("Couldn't build that test. Try again in a moment.");
        return;
      }

      const test = addTest({
        subjectId,
        title: result.title || `${subject.name} practice test`,
        kind: "test",
        config: {
          unit: unit.trim(),
          difficulty,
          numQuestions: result.questions.length,
          questionTypes: types,
          timeLimitMinutes: minutes,
        },
        questions: result.questions,
      });
      setActiveSubject(subjectId);
      router.push(`/tests/${test.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-4 border-brand-200">
      <p className="mb-3 text-sm font-semibold text-ink">New practice test</p>

      <label className="label">Subject</label>
      <SubjectPicker value={subjectId} onChange={setSubjectId} />

      <label className="label mt-4">Unit or chapter</label>
      <input
        className="field"
        placeholder="e.g. Unit 3, or chapters 5–8"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      />

      <label className="label mt-4">Difficulty</label>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={cx("chip capitalize", difficulty === d && "chip-active")}
          >
            {d}
          </button>
        ))}
      </div>

      <label className="label mt-4">Question types</label>
      <div className="flex flex-wrap gap-2">
        {TYPES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleType(key)}
            className={cx("chip", types.includes(key) && "chip-active")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Questions: {numQuestions}</label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>
        <div>
          <label className="label">Time limit: {minutes} min</label>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-faint">
        {subjectNotes.length > 0
          ? `Questions will be written from your ${subjectNotes.length} set${
              subjectNotes.length === 1 ? "" : "s"
            } of notes for this subject.`
          : "No notes uploaded for this subject yet — this will be a general test on the unit you named, not from your own material."}
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={busy}
          onClick={create}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Writing your test…
            </>
          ) : (
            <>
              <Wand2 size={15} /> Generate test
            </>
          )}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  );
}
