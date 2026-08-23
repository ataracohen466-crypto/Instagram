"use client";

import { useState } from "react";
import { Sparkles, WandSparkles, MessageCircleQuestion, Check, X, Loader2 } from "lucide-react";
import { Book, Scene } from "@/lib/types";

type Mode = "continue" | "rewrite" | "brainstorm";

const REWRITE_PRESETS = [
  "Tighten the prose",
  "Make it more vivid",
  "Simplify the language",
  "Raise the tension",
  "Fix grammar and flow",
];

function codexSummary(book: Book): string {
  return book.codex
    .filter((e) => e.description.trim())
    .slice(0, 12)
    .map((e) => `${e.name} (${e.type}): ${e.description}`)
    .join("\n");
}

async function callAI(endpoint: string, body: object): Promise<{ text: string; offline?: boolean }> {
  const res = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export default function AssistantPanel({
  book,
  scene,
  chapterTitle,
  selection,
  onInsert,
}: {
  book: Book;
  scene: Scene;
  chapterTitle: string;
  selection: { text: string } | null;
  onInsert: (text: string, mode: "replaceSelection" | "append") => void;
}) {
  const [mode, setMode] = useState<Mode>("continue");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [instruction, setInstruction] = useState(REWRITE_PRESETS[0]);
  const [question, setQuestion] = useState("");
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);

  const runContinue = async () => {
    setLoading(true);
    setResult(null);
    try {
      const context = scene.content.slice(-1500) || `Chapter: ${chapterTitle}`;
      const r = await callAI("continue", { context, synopsis: book.synopsis, codex: codexSummary(book) });
      setResult(r.text);
      setOffline(Boolean(r.offline));
    } finally {
      setLoading(false);
    }
  };

  const runRewrite = async () => {
    if (!selection?.text) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await callAI("rewrite", { selection: selection.text, instruction });
      setResult(r.text);
      setOffline(Boolean(r.offline));
    } finally {
      setLoading(false);
    }
  };

  const runBrainstorm = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const r = await callAI("brainstorm", {
        question,
        synopsis: book.synopsis,
        codex: codexSummary(book),
        chapterTitle,
      });
      setLog((prev) => [...prev, { q: question, a: r.text }]);
      setOffline(Boolean(r.offline));
      setQuestion("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-border p-2">
        <TabButton active={mode === "continue"} onClick={() => setMode("continue")} icon={<Sparkles size={13} />}>
          Continue
        </TabButton>
        <TabButton active={mode === "rewrite"} onClick={() => setMode("rewrite")} icon={<WandSparkles size={13} />}>
          Rewrite
        </TabButton>
        <TabButton
          active={mode === "brainstorm"}
          onClick={() => setMode("brainstorm")}
          icon={<MessageCircleQuestion size={13} />}
        >
          Brainstorm
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {offline && (
          <p className="mb-3 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[11px] text-ink-soft">
            Running offline — add an ANTHROPIC_API_KEY for real AI responses.
          </p>
        )}

        {mode === "continue" && (
          <div>
            <p className="mb-3 text-xs text-ink-faint">
              Uses the end of this scene, your synopsis, and codex to suggest what happens next.
            </p>
            <button
              onClick={runContinue}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Continue writing
            </button>
            {result && (
              <ResultCard
                text={result}
                onInsert={() => {
                  onInsert(result, "append");
                  setResult(null);
                }}
                onDismiss={() => setResult(null)}
              />
            )}
          </div>
        )}

        {mode === "rewrite" && (
          <div>
            {selection?.text ? (
              <div className="mb-3 rounded-lg border border-border bg-paper-raised p-2.5 text-xs text-ink-soft">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-ink-faint">Selected</span>
                <p className="line-clamp-4">{selection.text}</p>
              </div>
            ) : (
              <p className="mb-3 rounded-lg bg-accent-soft px-2.5 py-2 text-xs text-ink-soft">
                Select some text in the manuscript first.
              </p>
            )}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REWRITE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setInstruction(p)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    instruction === p
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-border text-ink-faint hover:border-ink-faint"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={runRewrite}
              disabled={loading || !selection?.text}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
              Rewrite selection
            </button>
            {result && (
              <ResultCard
                text={result}
                onInsert={() => {
                  onInsert(result, "replaceSelection");
                  setResult(null);
                }}
                onDismiss={() => setResult(null)}
              />
            )}
          </div>
        )}

        {mode === "brainstorm" && (
          <div className="flex h-full flex-col">
            <div className="mb-3 space-y-3">
              {log.map((entry, i) => (
                <div key={i} className="text-xs">
                  <p className="mb-1 font-medium text-ink">{entry.q}</p>
                  <p className="whitespace-pre-wrap text-ink-soft">{entry.a}</p>
                </div>
              ))}
              {log.length === 0 && (
                <p className="text-xs text-ink-faint">
                  Ask about plot, characters, or what to do next — answers are scoped to this book's
                  synopsis and codex.
                </p>
              )}
            </div>
            <div className="mt-auto flex gap-1.5">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runBrainstorm()}
                placeholder="What should happen next?"
                className="flex-1 rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                onClick={runBrainstorm}
                disabled={loading || !question.trim()}
                className="rounded-xl bg-accent px-3 text-accent-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
        active ? "bg-accent-soft text-ink" : "text-ink-faint hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ResultCard({
  text,
  onInsert,
  onDismiss,
}: {
  text: string;
  onInsert: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-paper-raised p-3 animate-fade-in">
      <p className="whitespace-pre-wrap text-sm text-ink-soft">{text}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onInsert}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent py-1.5 text-xs font-medium text-accent-ink transition hover:opacity-90"
        >
          <Check size={12} /> Insert
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-ink-faint transition hover:text-ink"
        >
          <X size={12} /> Dismiss
        </button>
      </div>
    </div>
  );
}
