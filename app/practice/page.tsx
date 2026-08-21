"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Dumbbell,
  Layers,
  Loader2,
  Mic,
  MicOff,
  PencilRuler,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import SubjectPicker from "@/components/SubjectPicker";
import {
  Card,
  EmptyState,
  Markdown,
  PageHeader,
  Pill,
  SectionTitle,
} from "@/components/ui";
import { reviewQueue, useStore, weakTopics } from "@/lib/store";
import { targetedPractice } from "@/lib/pipeline";
import * as api from "@/lib/api";
import { describeInterval, ReviewGrade } from "@/lib/srs";
import {
  Dictation,
  speechInputSupported,
  startDictation,
} from "@/lib/speech";
import { ChatMessage } from "@/lib/types";
import { cx } from "@/lib/utils";

type Tab = "cards" | "quiz" | "homework";

const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
  { key: "cards", label: "Flashcards", icon: Layers },
  { key: "quiz", label: "Quiz me", icon: Target },
  { key: "homework", label: "Homework", icon: PencilRuler },
];

export default function PracticePage() {
  const hydrated = useStore((s) => s.hydrated);
  const [tab, setTab] = useState<Tab>("cards");

  if (!hydrated) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Practice"
        subtitle="Short reps on exactly what you're shakiest on."
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

      {tab === "cards" && <Flashcards />}
      {tab === "quiz" && <QuizLauncher />}
      {tab === "homework" && <HomeworkMode />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const GRADES: { key: ReviewGrade; label: string; tone: string }[] = [
  { key: "again", label: "Again", tone: "border-red-200 text-red-700 hover:bg-red-50" },
  { key: "hard", label: "Hard", tone: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { key: "good", label: "Good", tone: "border-green-200 text-green-700 hover:bg-green-50" },
  { key: "easy", label: "Easy", tone: "border-brand-200 text-brand-700 hover:bg-brand-50" },
];

function Flashcards() {
  const state = useStore((s) => s);
  const reviewFlashcard = useStore((s) => s.reviewFlashcard);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const queue = reviewQueue(state);
  const card = queue[0];

  if (state.flashcards.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No flashcards yet"
        body="Add a set of notes and hit STUDY THIS — TutorAI writes the deck from your own material."
        action={
          <Link href="/notes?add=1" className="btn-primary">
            Add notes
          </Link>
        }
      />
    );
  }

  if (!card) {
    return (
      <EmptyState
        icon={Sparkles}
        title="All caught up"
        body="Nothing is due right now. Spaced repetition will bring these back exactly when you're about to forget them."
        action={
          <Link href="/tests" className="btn-secondary">
            Take a practice test instead
          </Link>
        }
      />
    );
  }

  const grade = (g: ReviewGrade) => {
    reviewFlashcard(card.id, g);
    setRevealed(false);
    setDone((n) => n + 1);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-ink-muted">
          {queue.length} in queue
        </span>
        <span className="text-xs text-ink-faint">{done} done this session</span>
      </div>

      <Card className="min-h-[240px]">
        <div className="mb-3 flex items-center gap-2">
          <Pill>{card.topic}</Pill>
          <span className="text-[11px] text-ink-faint">
            {describeInterval(card.srs)}
          </span>
        </div>

        <p className="text-lg font-semibold leading-snug text-ink">
          {card.front}
        </p>

        {revealed ? (
          <div className="mt-4 animate-flip-in border-t border-surface-line pt-4">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {card.back}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary mt-6 w-full"
            onClick={() => setRevealed(true)}
          >
            Show answer
          </button>
        )}
      </Card>

      {revealed && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {GRADES.map(({ key, label, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => grade(key)}
              className={cx(
                "rounded-xl border bg-white py-2.5 text-xs font-semibold transition active:scale-[0.98]",
                tone
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 px-1 text-[11px] text-ink-faint">
        How you grade each card feeds your topic mastery — the weak ones come
        back sooner and show up in your study plan.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuizLauncher() {
  const router = useRouter();
  const state = useStore((s) => s);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);

  const subjectId = activeSubjectId || state.subjects[0]?.id || "";
  const weak = weakTopics(state, subjectId);
  const quizzes = state.tests.filter(
    (t) => t.subjectId === subjectId && t.kind === "practice"
  );
  const [busy, setBusy] = useState(false);

  const startTargeted = async () => {
    setBusy(true);
    try {
      const id = await targetedPractice(
        subjectId,
        weak.slice(0, 4).map((m) => m.topic)
      );
      if (id) router.push(`/tests/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <SectionTitle>Weak topics</SectionTitle>
      {weak.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            Nothing flagged as weak yet. Take a test and TutorAI will find your
            gaps automatically.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap gap-2">
            {weak.map((m) => (
              <Pill key={m.topic} tone="bad">
                🔴 {m.topic}
              </Pill>
            ))}
          </div>
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={busy}
            onClick={startTargeted}
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Building your
                practice set…
              </>
            ) : (
              <>
                <Target size={15} /> Practise these now
              </>
            )}
          </button>
        </Card>
      )}

      <SectionTitle>Quizzes from your notes</SectionTitle>
      {quizzes.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No quizzes yet. Run <strong>STUDY THIS</strong> on a set of notes.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} href={`/tests/${quiz.id}`} className="card block p-4 transition hover:shadow-pop">
              <p className="text-sm font-semibold text-ink">{quiz.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {quiz.questions.length} questions ·{" "}
                {quiz.config.timeLimitMinutes} min
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HomeworkMode() {
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const profile = useStore((s) => s.profile);

  const subjectId = activeSubjectId || subjects[0]?.id || "";
  const subject = subjects.find((s) => s.id === subjectId);
  const key = `homework:${subjectId}`;
  const history = useStore((s) => s.chats[key] ?? []);
  const appendChat = useStore((s) => s.appendChat);
  const clearChat = useStore((s) => s.clearChat);

  const [problem, setProblem] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const dictation = useRef<Dictation | null>(null);

  useEffect(() => {
    setMicOk(speechInputSupported());
    return () => dictation.current?.stop();
  }, []);

  const toggleMic = (onText: (text: string) => void) => {
    if (listening) {
      dictation.current?.stop();
      dictation.current = null;
      setListening(false);
      return;
    }
    const handle = startDictation(onText, () => setListening(false));
    if (handle) {
      dictation.current = handle;
      setListening(true);
    }
  };

  const ask = async (message: string, context?: string) => {
    if (!message.trim() || busy) return;
    const mine: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    appendChat(key, mine);
    setInput("");
    setBusy(true);
    try {
      const result = await api.tutorChat({
        subject: subject?.name ?? "this subject",
        level: profile.gradeLevel,
        history,
        message,
        mode: "homework",
        context: context ?? problem,
      });
      appendChat(key, {
        role: "assistant",
        content:
          result?.reply ?? "I couldn't reach the tutor just then. Try again.",
        timestamp: Date.now(),
      });
      useStore.getState().touchStreak();
      useStore.getState().awardXp(4);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <Card className="mt-4">
        <label className="label">The problem you&apos;re stuck on</label>
        <textarea
          className="field min-h-[100px] resize-y"
          placeholder="Type or paste the question…"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busy || !problem.trim()}
            onClick={() => void ask("Give me a hint to get started — don't solve it for me.")}
          >
            <Sparkles size={14} /> Hint
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy || !problem.trim()}
            onClick={() => void ask("Walk me through the process step by step, pausing so I can try each step.")}
          >
            <BookOpen size={14} /> Walk me through it
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={busy || !problem.trim()}
            onClick={() => void ask("Here's my working — check it and tell me where I went wrong, without giving me the final answer.")}
          >
            <Dumbbell size={14} /> Check my work
          </button>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Homework mode coaches — it won&apos;t just hand over the answer.
        </p>
      </Card>

      <div className="mt-4 space-y-3">
        {history.map((m, i) => (
          <div
            key={i}
            className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cx(
                "max-w-[85%] rounded-2xl px-4 py-3",
                m.role === "user" ? "bg-brand-600 text-white" : "card"
              )}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              ) : (
                <Markdown text={m.content} />
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="card px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </span>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <div className="sticky bottom-24 mt-4 flex gap-2">
            <textarea
              className="field max-h-40 min-h-[46px] resize-y"
              rows={1}
              placeholder={listening ? "Listening…" : "Reply or show your working…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
            />
            {micOk && (
              <button
                type="button"
                onClick={() => toggleMic(setInput)}
                aria-label={listening ? "Stop dictation" : "Start dictation"}
                className={cx(
                  "btn-secondary shrink-0 px-3",
                  listening && "border-brand-400 bg-brand-50 text-brand-700"
                )}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button
              type="button"
              className="btn-primary shrink-0 px-4"
              disabled={busy || !input.trim()}
              onClick={() => void ask(input)}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn-ghost btn-sm mt-3"
            onClick={() => clearChat(key)}
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
