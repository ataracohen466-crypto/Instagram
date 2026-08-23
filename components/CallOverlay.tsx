"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Send, Sparkles } from "lucide-react";
import { Markdown } from "@/components/ui";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import {
  Dictation,
  speak,
  speechInputSupported,
  startDictation,
  stopSpeaking,
} from "@/lib/speech";
import { cx } from "@/lib/utils";

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface Turn {
  who: "you" | "tutor";
  text: string;
}

/**
 * A hands-free voice call with the tutor: it listens, answers out loud, then
 * listens again, so the student never has to press anything mid-question.
 * Unlike the rest of Learn, this runs in "ask" mode — it will answer anything,
 * not only what's in the student's notes.
 */
export default function CallOverlay({ onClose }: { onClose: () => void }) {
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const profile = useStore((s) => s.profile);
  const notes = useStore((s) => s.notes);

  const subject = subjects.find((s) => s.id === activeSubjectId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [partial, setPartial] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [typed, setTyped] = useState("");
  const [micOk, setMicOk] = useState(false);

  const dictation = useRef<Dictation | null>(null);
  const live = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  useEffect(() => {
    setMicOk(speechInputSupported());
    live.current = true;
    return () => {
      live.current = false;
      dictation.current?.stop();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, phase]);

  const listen = useCallback(() => {
    if (!live.current || !speechInputSupported()) {
      setPhase("idle");
      return;
    }
    stopSpeaking();
    let heard = "";
    const handle = startDictation(
      (text) => {
        heard = text;
        setPartial(text);
      },
      () => {
        if (!live.current) return;
        setPartial("");
        const said = heard.trim();
        if (said) void ask(said);
        else setPhase((p) => (p === "listening" ? "idle" : p));
      }
    );
    if (handle) {
      dictation.current = handle;
      setPhase("listening");
    } else {
      setPhase("idle");
    }
    // `ask` is stable for our purposes — it only reads refs and setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = useCallback(
    async (question: string) => {
      if (!live.current) return;
      dictation.current?.stop();
      dictation.current = null;
      setPhase("thinking");
      setTurns((t) => [...t, { who: "you", text: question }]);

      const context = notes
        .filter((n) => n.subjectId === activeSubjectId)
        .map((n) => n.rawText)
        .join("\n\n")
        .slice(0, 8000);

      const result = await api.tutorChat({
        subject: subject?.name ?? "general studies",
        level: profile.gradeLevel,
        mode: "ask",
        context: context || undefined,
        history: turnsRef.current.map((t) => ({
          role: t.who === "you" ? ("user" as const) : ("assistant" as const),
          content: t.text,
          timestamp: Date.now(),
        })),
        message: question,
      });

      if (!live.current) return;
      const reply =
        result?.reply ??
        "I couldn't reach the tutor just then. Ask me again in a moment.";
      setTurns((t) => [...t, { who: "tutor", text: reply }]);
      useStore.getState().awardXp(3);
      useStore.getState().touchStreak();

      setPhase("speaking");
      speak(reply, () => {
        if (live.current) listen();
      });
    },
    [activeSubjectId, notes, profile.gradeLevel, subject, listen]
  );

  const hangUp = () => {
    live.current = false;
    dictation.current?.stop();
    stopSpeaking();
    onClose();
  };

  const label =
    phase === "listening"
      ? "Listening…"
      : phase === "thinking"
      ? "Working it out…"
      : phase === "speaking"
      ? "Speaking…"
      : micOk
      ? "Tap the mic to talk"
      : "Type your question";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-sunk">
      <div className="flex items-center gap-3 border-b border-surface-line bg-white px-4 py-3">
        <span className="text-sm font-bold text-ink">Tutor call</span>
        <span
          className={cx(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            phase === "listening"
              ? "bg-brand-50 text-brand-700"
              : phase === "speaking"
              ? "bg-green-50 text-green-700"
              : "bg-surface-sunk text-ink-muted"
          )}
        >
          {label}
        </span>
        <div className="flex-1" />
        <button type="button" className="btn-secondary btn-sm" onClick={hangUp}>
          <PhoneOff size={13} /> End
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => (phase === "listening" ? dictation.current?.stop() : listen())}
            disabled={!micOk || phase === "thinking" || phase === "speaking"}
            aria-label="Talk"
            className={cx(
              "relative grid h-32 w-32 place-items-center rounded-full transition disabled:opacity-70",
              phase === "speaking"
                ? "bg-green-50 text-green-700"
                : phase === "thinking"
                ? "bg-amber-50 text-amber-700"
                : "bg-brand-50 text-brand-600"
            )}
          >
            {phase === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-brand-400 opacity-60" />
            )}
            {phase === "speaking" ? <Sparkles size={38} /> : <Mic size={38} />}
          </button>
          <p className="mt-4 min-h-[24px] text-center text-sm text-ink-muted">
            {partial || label}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {turns.map((t, i) => (
            <div
              key={i}
              className={cx("flex", t.who === "you" ? "justify-end" : "justify-start")}
            >
              <div
                className={cx(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  t.who === "you" ? "bg-brand-600 text-white" : "card"
                )}
              >
                {t.who === "you" ? (
                  <p className="text-sm">{t.text}</p>
                ) : (
                  <Markdown text={t.text} />
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {!micOk && (
          <div className="card mt-4 border-amber-200 bg-amber-50 text-sm text-amber-900">
            This browser can&apos;t hear you — speech recognition needs Chrome or
            Edge. Type below instead and the answer will still be read aloud.
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl border-t border-surface-line bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            className="field"
            placeholder="…or type your question"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed.trim()) {
                const q = typed.trim();
                setTyped("");
                void ask(q);
              }
            }}
          />
          <button
            type="button"
            className="btn-primary shrink-0 px-4"
            disabled={!typed.trim() || phase === "thinking"}
            onClick={() => {
              const q = typed.trim();
              setTyped("");
              void ask(q);
            }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          Ask anything — this mode isn&apos;t limited to your notes.
        </p>
      </div>
    </div>
  );
}
