"use client";

import { Question } from "@/lib/types";
import { cx } from "@/lib/utils";

const TYPE_LABEL: Record<Question["type"], string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  matching: "Matching",
  "fill-blank": "Fill in the blank",
  "true-false": "True / false",
  essay: "Essay",
};

/** Matching answers are stored as "left=right | left=right". */
function parseMatching(answer: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of answer.split("|")) {
    const [left, right] = pair.split("=");
    if (left && right) out[left.trim()] = right.trim();
  }
  return out;
}

function serializeMatching(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, right]) => right)
    .map(([left, right]) => `${left}=${right}`)
    .join(" | ");
}

export default function QuestionView({
  question,
  index,
  answer,
  onAnswer,
  disabled = false,
}: {
  question: Question;
  index: number;
  answer: string;
  onAnswer: (value: string) => void;
  disabled?: boolean;
}) {
  const choices =
    question.type === "true-false"
      ? question.choices ?? ["True", "False"]
      : question.choices ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="chip chip-active">Q{index + 1}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {TYPE_LABEL[question.type]} · {question.topic}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-ink">
        {question.prompt}
      </p>

      {(question.type === "mcq" || question.type === "true-false") && (
        <div className="space-y-2">
          {choices.map((choice) => {
            const selected = answer === choice;
            return (
              <button
                key={choice}
                type="button"
                disabled={disabled}
                onClick={() => onAnswer(choice)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition",
                  selected
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-surface-line bg-white text-ink-soft hover:bg-surface-sunk",
                  disabled && "opacity-70"
                )}
              >
                <span
                  className={cx(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-brand-500 bg-brand-500" : "border-ink-faint"
                  )}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "fill-blank" && (
        <input
          className="field"
          placeholder="Your answer"
          value={answer}
          disabled={disabled}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}

      {(question.type === "short" || question.type === "essay") && (
        <textarea
          className="field min-h-[120px] resize-y"
          rows={question.type === "essay" ? 8 : 4}
          placeholder={
            question.type === "essay"
              ? "Write your full response…"
              : "Answer in a sentence or two…"
          }
          value={answer}
          disabled={disabled}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}

      {question.type === "matching" && (
        <div className="space-y-2">
          {(question.matchPrompts ?? []).map((left) => {
            const map = parseMatching(answer);
            return (
              <div key={left} className="flex items-center gap-2">
                <span className="w-2/5 shrink-0 text-sm font-medium text-ink-soft">
                  {left}
                </span>
                <select
                  className="field flex-1"
                  disabled={disabled}
                  value={map[left] ?? ""}
                  onChange={(e) =>
                    onAnswer(
                      serializeMatching({ ...map, [left]: e.target.value })
                    )
                  }
                >
                  <option value="">Choose…</option>
                  {(question.choices ?? []).map((right) => (
                    <option key={right} value={right}>
                      {right}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
