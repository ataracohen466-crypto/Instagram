"use client";

const STOPS = [1, 3, 5, 7, 9];
import { moodFace } from "@/lib/mood";

export function MoodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between gap-1.5 sm:gap-2">
      {STOPS.map((v) => {
        const face = moodFace(v);
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 transition ${
              active
                ? "border-primary bg-primary-soft scale-105 shadow-soft"
                : "border-border bg-surface-raised hover:border-primary/40"
            }`}
          >
            <span className="text-2xl sm:text-3xl">{face.emoji}</span>
            <span className={`text-[11px] font-medium ${active ? "text-primary" : "text-ink-faint"}`}>
              {face.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
