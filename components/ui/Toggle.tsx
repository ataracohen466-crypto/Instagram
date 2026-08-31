"use client";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (!label) return button;

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-soft">{description}</p>}
      </div>
      {button}
    </div>
  );
}
