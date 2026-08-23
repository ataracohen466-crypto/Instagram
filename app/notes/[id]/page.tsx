"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  ClipboardList,
  HelpCircle,
  Layers,
  Loader2,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardSkeleton,
  EmptyState,
  Markdown,
  Pill,
  SectionTitle,
} from "@/components/ui";
import StudioButtons from "@/components/StudioButtons";
import { useStore } from "@/lib/store";
import { ensureStudyGuide, ensureSummary } from "@/lib/pipeline";
import * as api from "@/lib/api";
import { NoteSummary, SummaryLength } from "@/lib/types";
import { cx } from "@/lib/utils";

const LENGTHS: { key: SummaryLength; label: string }[] = [
  { key: "quick", label: "Quick review" },
  { key: "normal", label: "Normal" },
  { key: "detailed", label: "Detailed" },
  { key: "cram", label: "Exam cram" },
];

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const note = useStore((s) => s.notes.find((n) => n.id === id));
  const cards = useStore((s) => s.flashcards.filter((c) => c.noteId === id));
  const quizzes = useStore((s) => s.tests.filter((t) => t.noteId === id));
  const guide = useStore((s) => s.guides.find((g) => g.noteId === id));
  const subject = useStore((s) =>
    s.subjects.find((x) => x.id === note?.subjectId)
  );

  const [length, setLength] = useState<SummaryLength>("normal");
  const [loading, setLoading] = useState(false);
  const [guideBusy, setGuideBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const summary = note?.summary?.[length];

  useEffect(() => {
    if (!note || summary || loading) return;
    setLoading(true);
    void ensureSummary(note.id, length).finally(() => setLoading(false));
    // Re-runs whenever the student switches tabs to an ungenerated length.
  }, [note, length, summary, loading]);

  if (!hydrated) return <CardSkeleton lines={5} />;

  if (!note) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Note not found"
        body="It may have been deleted."
        action={
          <Link href="/notes" className="btn-primary">
            Back to notes
          </Link>
        }
      />
    );
  }

  const makeTest = async () => {
    if (!subject) return;
    setTestBusy(true);
    try {
      const result = await api.generateTest({
        subject: subject.name,
        unit: note.title,
        difficulty: "mixed",
        numQuestions: 15,
        questionTypes: ["mcq", "short", "true-false"],
        timeLimitMinutes: 25,
        material: note.rawText,
        title: `Test — ${note.title}`,
      });
      if (!result) return;
      const test = useStore.getState().addTest({
        subjectId: note.subjectId,
        title: result.title || `Test — ${note.title}`,
        noteId: note.id,
        kind: "test",
        config: {
          unit: note.title,
          difficulty: "mixed",
          numQuestions: result.questions.length,
          questionTypes: ["mcq", "short", "true-false"],
          timeLimitMinutes: 25,
        },
        questions: result.questions,
      });
      router.push(`/tests/${test.id}`);
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <Link
        href="/notes"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} /> Notes
      </Link>

      <div className="mb-4 px-1">
        <h1 className="text-xl font-bold tracking-tight text-ink">{note.title}</h1>
        {subject && (
          <p className="mt-0.5 text-sm text-ink-muted">{subject.name}</p>
        )}
      </div>

      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {LENGTHS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLength(key)}
            className={cx("chip shrink-0", length === key && "chip-active")}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !summary ? (
        <CardSkeleton lines={6} />
      ) : summary ? (
        <SummaryView summary={summary} />
      ) : (
        <Card>
          <p className="text-sm text-ink-muted">
            Couldn&apos;t build this summary. Check your connection and switch
            tabs to try again.
          </p>
        </Card>
      )}

      <SectionTitle
        action={
          <Link href="/practice" className="text-xs font-semibold text-brand-600">
            Review
          </Link>
        }
      >
        Flashcards ({cards.length})
      </SectionTitle>
      {cards.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No cards yet — run <strong>Study This</strong> from the notes list.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {cards.slice(0, 6).map((card) => (
            <Card key={card.id}>
              <p className="text-sm font-medium text-ink">{card.front}</p>
              <p className="mt-1 text-sm text-ink-muted">{card.back}</p>
              <div className="mt-2">
                <Pill>{card.topic}</Pill>
              </div>
            </Card>
          ))}
          {cards.length > 6 && (
            <p className="px-1 text-xs text-ink-faint">
              +{cards.length - 6} more in Practice
            </p>
          )}
        </div>
      )}

      <SectionTitle>Make study material</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {quizzes.length > 0 && (
          <Link href={`/tests/${quizzes[0].id}`} className="card p-4 transition hover:shadow-pop">
            <div className="flex items-center gap-2 text-brand-600">
              <Layers size={15} />
              <span className="text-sm font-semibold">Take the quiz</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {quizzes[0].questions.length} questions from these notes
            </p>
          </Link>
        )}
        <button
          type="button"
          onClick={makeTest}
          disabled={testBusy}
          className="card p-4 text-left transition hover:shadow-pop disabled:opacity-60"
        >
          <div className="flex items-center gap-2 text-brand-600">
            {testBusy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ClipboardList size={15} />
            )}
            <span className="text-sm font-semibold">
              {testBusy ? "Writing test…" : "Make a full test"}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            15 questions, timed, graded with explanations
          </p>
        </button>
      </div>

      <SectionTitle>Studio</SectionTitle>
      <Card>
        <p className="mb-3 text-sm text-ink-muted">
          Listen to these notes as a two-host episode, present them as slides, or
          watch them narrated.
        </p>
        <StudioButtons noteId={note.id} />
      </Card>

      <SectionTitle>Study guide</SectionTitle>
      {guide ? (
        <Card>
          <p className="text-sm font-semibold text-ink">{guide.title}</p>
          {guide.keyConcepts.slice(0, 3).map((section) => (
            <div key={section.heading} className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                {section.heading}
              </p>
              <ul className="mt-1 space-y-1">
                {section.points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {guide.commonMistakes.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Common mistakes
              </p>
              <ul className="mt-1 space-y-1">
                {guide.commonMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-amber-900">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guide.checklist.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                Final checklist
              </p>
              <ul className="mt-1 space-y-1">
                {guide.checklist.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-soft">
                    <span className="text-brand-500">☐</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ink-muted">
            No study guide yet for these notes.
          </p>
          <button
            type="button"
            className="btn-primary btn-sm mt-3"
            disabled={guideBusy}
            onClick={async () => {
              setGuideBusy(true);
              try {
                await ensureStudyGuide(note.id);
              } finally {
                setGuideBusy(false);
              }
            }}
          >
            {guideBusy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Writing…
              </>
            ) : (
              <>
                <BookOpenCheck size={14} /> Make a study guide
              </>
            )}
          </button>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/learn" className="btn-secondary w-full">
          <Wand2 size={15} /> Ask the tutor about these notes
        </Link>
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: NoteSummary }) {
  const lists: { title: string; items: string[] }[] = [
    { title: "Key concepts", items: summary.keyConcepts },
    { title: "Things you MUST know", items: summary.mustKnow },
  ];

  return (
    <div className="space-y-3">
      {summary.overview && (
        <Card>
          <Markdown text={summary.overview} />
        </Card>
      )}

      {lists.map(
        ({ title, items }) =>
          items.length > 0 && (
            <Card key={title}>
              <p
                className={cx(
                  "text-xs font-bold uppercase tracking-wide",
                  title.includes("MUST") ? "text-brand-600" : "text-ink-faint"
                )}
              >
                {title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          )
      )}

      {summary.vocabulary.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Vocabulary
          </p>
          <dl className="mt-2 space-y-2">
            {summary.vocabulary.map((v) => (
              <div key={v.term}>
                <dt className="text-sm font-semibold text-ink">{v.term}</dt>
                <dd className="text-sm text-ink-muted">{v.definition}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {summary.formulas.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Formulas
          </p>
          <div className="mt-2 space-y-2">
            {summary.formulas.map((f) => (
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
      )}

      {summary.importantDates.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Important dates
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.importantDates.map((d, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 font-semibold text-brand-600">
                  {d.date}
                </span>
                <span className="text-ink-soft">{d.what}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.peopleEvents.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            People &amp; events
          </p>
          <dl className="mt-2 space-y-2">
            {summary.peopleEvents.map((p) => (
              <div key={p.name}>
                <dt className="text-sm font-semibold text-ink">{p.name}</dt>
                <dd className="text-sm text-ink-muted">{p.significance}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {summary.causeEffect.length > 0 && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Cause &amp; effect
          </p>
          <ul className="mt-2 space-y-2">
            {summary.causeEffect.map((c, i) => (
              <li key={i} className="text-sm">
                <span className="text-ink-soft">{c.cause}</span>
                <span className="mx-1.5 text-brand-500">→</span>
                <span className="font-medium text-ink">{c.effect}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
