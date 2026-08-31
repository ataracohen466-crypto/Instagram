"use client";

import { EMOTIONS, type Emotion } from "@/lib/types";
import { EMOTION_META } from "@/lib/mood";

export function EmotionPicker({
  value,
  onChange,
  max = 5,
}: {
  value: Emotion[];
  onChange: (v: Emotion[]) => void;
  max?: number;
}) {
  function toggle(e: Emotion) {
    if (value.includes(e)) {
      onChange(value.filter((x) => x !== e));
    } else if (value.length < max) {
      onChange([...value, e]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {EMOTIONS.map((e) => {
        const meta = EMOTION_META[e];
        const active = value.includes(e);
        return (
          <button
            key={e}
            type="button"
            onClick={() => toggle(e)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface-raised text-ink-soft hover:border-primary/40"
            }`}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
