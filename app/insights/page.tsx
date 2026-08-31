"use client";

import { useMemo, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Send, Bot, User, Info } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { allFactorInsights, sleepHoursMoodInsight, type FactorInsight, type NumericPairInsight } from "@/lib/insights";
import { askAssistant, SUGGESTED_QUESTIONS, AI_DISCLAIMER, type AssistantAnswer } from "@/lib/assistant";

type Msg = { role: "user" | "assistant"; text?: string; answer?: AssistantAnswer };

export default function InsightsPage() {
  const checkIns = useStore((s) => s.checkIns);
  const data = useStore((s) => s);

  const factorInsights = useMemo(() => allFactorInsights(checkIns), [checkIns]);
  const sleepInsight = useMemo(() => sleepHoursMoodInsight(checkIns), [checkIns]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  function ask(q: string) {
    if (!q.trim()) return;
    const answer = askAssistant(q, data);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", answer }]);
    setInput("");
  }

  if (checkIns.length < 5) {
    return (
      <div>
        <PageHeader title="Patterns & insights" subtitle="Gentle observations from your own data — never medical claims." />
        <EmptyState
          icon={<Sparkles size={20} />}
          title="A few more check-ins needed"
          body="Pattern discovery works best with at least a week of check-ins. Keep going — this page fills in on its own."
          action={
            <Link href="/check-in" className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink">
              Check in
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Patterns & insights" subtitle="Gentle observations from your own data — never medical claims." />

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Pattern discovery</h2>
        <div className="space-y-3">
          {factorInsights.length === 0 && !sleepInsight && (
            <Card>
              <p className="text-sm text-ink-soft">No strong patterns yet — keep tagging lifestyle factors at check-in and this will fill in.</p>
            </Card>
          )}
          {factorInsights.map((f) => (
            <FactorCard key={f.id} insight={f} />
          ))}
          {sleepInsight && <PairCard insight={sleepInsight} />}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Wellness assistant</h2>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Runs on your device</span>
        </div>
        <Card className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-xl bg-surface-raised p-3 text-xs text-ink-soft">
            <Info size={14} className="mt-0.5 shrink-0" />
            {AI_DISCLAIMER}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} onClick={() => ask(q)} className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-primary/40">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex items-start justify-end gap-2">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-ink">{m.text}</div>
                  <User size={16} className="mt-1.5 shrink-0 text-ink-faint" />
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <Bot size={16} className="mt-1.5 shrink-0 text-primary" />
                  <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm bg-surface-raised px-3.5 py-3 text-sm">
                    {m.answer!.observed.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Observed from your data</p>
                        <ul className="space-y-1 text-ink">
                          {m.answer!.observed.map((o, j) => (
                            <li key={j}>• {o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.answer!.possible.length > 0 && (
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Possible explanation</p>
                        <ul className="space-y-1 text-ink-soft">
                          {m.answer!.possible.map((o, j) => (
                            <li key={j}>• {o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your mood, sleep, stress, habits…"
              className="flex-1 rounded-full border border-border bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
            <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
              <Send size={16} />
            </button>
          </form>
        </Card>
      </section>
    </div>
  );
}

function FactorCard({ insight }: { insight: FactorInsight }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <p className="text-sm text-ink">{insight.text}</p>
      <p className="mt-1 text-xs text-ink-faint">Based on {insight.withCount + insight.withoutCount} check-ins · observation, not a diagnosis</p>
      <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
        Why might this be? {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && <p className="mt-2 rounded-xl bg-primary-soft p-3 text-xs text-ink-soft">{insight.why}</p>}
    </Card>
  );
}

function PairCard({ insight }: { insight: NumericPairInsight }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <p className="text-sm text-ink">{insight.text}</p>
      <p className="mt-1 text-xs text-ink-faint">Observation, not a diagnosis</p>
      <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
        Why might this be? {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <p className="mt-2 rounded-xl bg-primary-soft p-3 text-xs text-ink-soft">
          Sleep plays a big role in regulating mood and energy for most people — this pattern in your own data lines up with that.
        </p>
      )}
    </Card>
  );
}
