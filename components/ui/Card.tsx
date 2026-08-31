import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={`rounded-3xl border border-border bg-surface p-5 shadow-card ${className}`}
    >
      {children}
    </As>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-lg text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface-raised px-6 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink-soft">{body}</p>}
      {action}
    </div>
  );
}
