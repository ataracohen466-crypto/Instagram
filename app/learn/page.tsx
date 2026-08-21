"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  HelpCircle,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Send,
  SendHorizonal,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import SubjectPicker from "@/components/SubjectPicker";
import { Card, Markdown, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import {
  Dictation,
  speak,
  speechInputSupported,
  speechOutputSupported,
  startDictation,
  stopSpeaking,
} from "@/lib/speech";
import { ChatMessage, TeachBackResult } from "@/lib/types";
import { cx } from "@/lib/utils";

type Tab = "tutor" | "explain" | "teach-back";

const TABS: { key: Tab; label: string; icon: typeof Brain }[] = [
  { key: "tutor", label: "Ask tutor", icon: Brain },
  { key: "explain", label: "I don't understand", icon: HelpCircle },
  { key: "teach-back", label: "Teach it back", icon: Lightbulb },
];

export default function LearnPage() {
  const hydrated = useStore((s) => s.hydrated);
  const [tab, setTab] = useState<Tab>("tutor");

  if (!hydrated) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Learn"
        subtitle="A tutor that explains the process, not just the answer."
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

      {tab === "tutor" && <TutorChat />}
      {tab === "explain" && <ExplainPanel />}
      {tab === "teach-back" && <TeachBackPanel />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function useVoice() {
  const [listening, setListening] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  const [micOk, setMicOk] = useState(false);
  const [speakerOk, setSpeakerOk] = useState(false);

  useEffect(() => {
    setMicOk(speechInputSupported());
    setSpeakerOk(speechOutputSupported());
    return () => dictation.current?.stop();
  }, []);

  const toggle = (onText: (text: string) => void) => {
    if (listening) {
      dictation.current?.stop();
      dictation.current = null;
      setListening(false);
      return;
    }
    const handle = startDictation(
      (text) => onText(text),
      () => setListening(false)
    );
    if (handle) {
      dictation.current = handle;
      setListening(true);
    }
  };

  return { listening, toggle, micOk, speakerOk };
}

function MicButton({
  listening,
  onClick,
}: {
  listening: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={listening ? "Stop dictation" : "Start dictation"}
      className={cx(
        "btn-secondary shrink-0 px-3",
        listening && "border-brand-400 bg-brand-50 text-brand-700"
      )}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}

/* ------------------------------------------------------------------ */

function TutorChat() {
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const profile = useStore((s) => s.profile);
  const appendChat = useStore((s) => s.appendChat);
  const clearChat = useStore((s) => s.clearChat);

  const subjectId = activeSubjectId || subjects[0]?.id || "";
  const subject = subjects.find((s) => s.id === subjectId);
  const key = `tutor:${subjectId}`;
  const history = useStore((s) => s.chats[key] ?? []);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { listening, toggle, micOk, speakerOk } = useVoice();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, busy]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;

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
      });
      const reply =
        result?.reply ??
        "I couldn't reach the tutor just then. Try asking again.";
      appendChat(key, {
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      });
      useStore.getState().touchStreak();
      useStore.getState().awardXp(3);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <div className="mt-4 space-y-3">
        {history.length === 0 && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Sparkles size={15} />
              </span>
              <div>
                <p className="text-sm text-ink-soft">
                  Ask me anything about <strong>{subject?.name ?? "your subject"}</strong>.
                  I&apos;ll walk you through it step by step — and if you&apos;re
                  working something out, I&apos;ll nudge rather than hand you the
                  answer. Say &ldquo;I still don&apos;t understand&rdquo; as many
                  times as you need; I&apos;ll just explain it another way.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Explain this topic from scratch",
                    "Give me a worked example",
                    "Why do I keep getting this wrong?",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      onClick={() => void send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {history.map((m, i) => (
          <div
            key={i}
            className={cx(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cx(
                "max-w-[85%] rounded-2xl px-4 py-3",
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "card"
              )}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              ) : (
                <>
                  <Markdown text={m.content} />
                  {speakerOk && (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint hover:text-brand-600"
                      onClick={() => {
                        if (speaking) {
                          stopSpeaking();
                          setSpeaking(false);
                        } else {
                          setSpeaking(true);
                          speak(m.content, () => setSpeaking(false));
                        }
                      }}
                    >
                      {speaking ? <Square size={11} /> : <Volume2 size={11} />}
                      {speaking ? "Stop" : "Read aloud"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="card px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 size={14} className="animate-spin" /> Thinking it
                through…
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-24 mt-4 flex gap-2">
        <textarea
          className="field max-h-40 min-h-[46px] resize-y"
          rows={1}
          placeholder={listening ? "Listening…" : "Ask anything…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {micOk && (
          <MicButton listening={listening} onClick={() => toggle(setInput)} />
        )}
        <button
          type="button"
          className="btn-primary shrink-0 px-4"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>

      {history.length > 0 && (
        <button
          type="button"
          className="btn-ghost btn-sm mt-3"
          onClick={() => clearChat(key)}
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const MODES: {
  key: "simple" | "normal" | "detailed" | "example" | "practice-question";
  label: string;
}[] = [
  { key: "simple", label: "Simple" },
  { key: "normal", label: "Normal" },
  { key: "detailed", label: "Detailed" },
  { key: "example", label: "Example" },
  { key: "practice-question", label: "Practice question" },
];

function ExplainPanel() {
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const profile = useStore((s) => s.profile);
  const notes = useStore((s) => s.notes);

  const subjectId = activeSubjectId || subjects[0]?.id || "";
  const subject = subjects.find((s) => s.id === subjectId);

  const [snippet, setSnippet] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("simple");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (nextMode = mode) => {
    if (!snippet.trim()) return;
    setMode(nextMode);
    setBusy(true);
    try {
      const context = notes
        .filter((n) => n.subjectId === subjectId)
        .map((n) => n.rawText)
        .join("\n\n")
        .slice(0, 6000);
      const result = await api.explain({
        snippet: snippet.trim(),
        mode: nextMode,
        subject: subject?.name,
        level: profile.gradeLevel,
        context: context || undefined,
      });
      setAnswer(result?.explanation ?? "Couldn't reach the tutor just then.");
      useStore.getState().touchStreak();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <Card className="mt-4">
        <label className="label">What&apos;s confusing you?</label>
        <textarea
          className="field min-h-[100px] resize-y"
          placeholder="Paste the sentence, formula or question you're stuck on…"
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
        />

        <label className="label mt-4">Explain it…</label>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => void run(key)}
              disabled={busy || !snippet.trim()}
              className={cx(
                "chip shrink-0 disabled:opacity-50",
                mode === key && "chip-active"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {busy && (
        <Card className="mt-3">
          <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 size={14} className="animate-spin" /> Working on a clearer
            way to put it…
          </span>
        </Card>
      )}

      {answer && !busy && (
        <Card className="mt-3">
          <Markdown text={answer} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-line pt-3">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void run("simple")}
            >
              Still don&apos;t get it
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void run("example")}
            >
              Show an example
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void run("practice-question")}
            >
              Give me a practice question
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TeachBackPanel() {
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const setActiveSubject = useStore((s) => s.setActiveSubject);
  const profile = useStore((s) => s.profile);
  const notes = useStore((s) => s.notes);
  const recordMastery = useStore((s) => s.recordMastery);

  const subjectId = activeSubjectId || subjects[0]?.id || "";
  const subject = subjects.find((s) => s.id === subjectId);

  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState<TeachBackResult | null>(null);
  const [busy, setBusy] = useState(false);
  const { listening, toggle, micOk } = useVoice();

  const submit = async () => {
    if (!concept.trim() || !explanation.trim()) return;
    setBusy(true);
    try {
      const reference = notes
        .filter((n) => n.subjectId === subjectId)
        .map((n) => n.rawText)
        .join("\n\n")
        .slice(0, 8000);
      const response = await api.teachBack({
        concept: concept.trim(),
        explanation: explanation.trim(),
        reference: reference || undefined,
        subject: subject?.name,
        level: profile.gradeLevel,
      });
      if (response) {
        setResult(response.result);
        // Explaining is the strongest mastery signal we collect.
        recordMastery(
          subjectId,
          [
            {
              topic: response.result.topic || concept.trim(),
              score: response.result.masteryScore,
            },
          ],
          "teach-back"
        );
        useStore.getState().awardXp(15);
        useStore.getState().touchStreak();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SubjectPicker value={subjectId} onChange={setActiveSubject} />

      <Card className="mt-4">
        <p className="text-sm text-ink-soft">
          Explaining something is the fastest way to find the holes in it. Pick a
          concept and teach it to me in your own words — typed or spoken.
        </p>

        <label className="label mt-4">Concept</label>
        <input
          className="field"
          placeholder="e.g. Why the Krebs cycle matters"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
        />

        <label className="label mt-4">Your explanation</label>
        <div className="flex gap-2">
          <textarea
            className="field min-h-[140px] resize-y"
            placeholder={
              listening ? "Listening…" : "Explain it like you'd explain it to a friend…"
            }
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
          {micOk && (
            <MicButton
              listening={listening}
              onClick={() => toggle(setExplanation)}
            />
          )}
        </div>

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={busy || !concept.trim() || !explanation.trim()}
          onClick={submit}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Marking…
            </>
          ) : (
            <>
              <SendHorizonal size={15} /> Check my understanding
            </>
          )}
        </button>
      </Card>

      {result && (
        <>
          <SectionTitle>Result</SectionTitle>
          <Card>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight text-ink">
                {result.masteryScore}
              </span>
              <span className="text-sm text-ink-muted">/ 100 mastery</span>
              <span className="ml-auto">
                <Pill
                  tone={
                    result.masteryScore >= 80
                      ? "good"
                      : result.masteryScore >= 55
                      ? "warn"
                      : "bad"
                  }
                >
                  {result.masteryScore >= 80
                    ? "🟢 Mastered"
                    : result.masteryScore >= 55
                    ? "🟡 Learning"
                    : "🔴 Needs review"}
                </Pill>
              </span>
            </div>

            <p className="mt-3 text-sm text-ink-soft">{result.feedback}</p>

            {result.correctPoints.length > 0 && (
              <Block
                title="You got right"
                tone="good"
                items={result.correctPoints}
              />
            )}
            {result.missingConcepts.length > 0 && (
              <Block
                title="You missed"
                tone="warn"
                items={result.missingConcepts}
              />
            )}
            {result.misconceptions.length > 0 && (
              <Block
                title="Misconceptions to fix"
                tone="bad"
                items={result.misconceptions}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Block({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "warn" | "bad";
}) {
  const colors = {
    good: "bg-green-50 text-green-900",
    warn: "bg-amber-50 text-amber-900",
    bad: "bg-red-50 text-red-900",
  };
  return (
    <div className={cx("mt-3 rounded-xl p-3", colors[tone])}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
