"use client";

import { type ReactNode } from "react";

export function Slider({
  label,
  value,
  onChange,
  icon,
  lowLabel,
  highLabel,
  color,
  min = 0,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon?: ReactNode;
  lowLabel?: string;
  highLabel?: string;
  color?: string;
  min?: number;
  max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          {icon}
          {label}
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-sm font-semibold"
          style={{ background: color ? `${color}22` : "var(--primary-soft)", color: color || "var(--primary)" }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        className="bloom-slider"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={
          {
            background: `linear-gradient(to right, ${color || "var(--primary)"} ${pct}%, var(--border) ${pct}%)`,
          } as React.CSSProperties
        }
        aria-label={label}
      />
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-xs text-ink-faint">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
