"use client";

import { Delete } from "lucide-react";

export default function PasscodePad({
  value,
  onChange,
  length = 6,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
}) {
  const digits = "123456789 0⌫".split("");

  return (
    <div className="flex flex-col items-center gap-8">
      <div className={`flex gap-3 ${error ? "animate-[shake_0.3s]" : ""}`}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
              i < value.length
                ? error
                  ? "border-warn bg-warn"
                  : "border-primary bg-primary"
                : "border-border bg-transparent"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((d, i) =>
          d === "" ? (
            <div key={i} />
          ) : d === "del" ? (
            <button
              key={i}
              type="button"
              aria-label="Delete"
              onClick={() => onChange(value.slice(0, -1))}
              className="flex h-16 w-16 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-raised active:scale-95"
            >
              <Delete size={22} />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => value.length < length && onChange(value + d)}
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-medium text-ink transition hover:bg-surface-raised active:scale-95"
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}
