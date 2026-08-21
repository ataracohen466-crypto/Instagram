import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export default function FeatureTile({
  href,
  title,
  description,
  icon: Icon,
  accent = "gold",
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: "gold" | "teal" | "coral";
}) {
  const ring = { gold: "group-hover:ring-gold-500/40", teal: "group-hover:ring-teal-500/40", coral: "group-hover:ring-coral-500/40" }[accent];
  const iconBg = {
    gold: "bg-gold-500/15 text-gold-400",
    teal: "bg-teal-500/15 text-teal-400",
    coral: "bg-coral-500/15 text-coral-400",
  }[accent];

  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-800/50 p-5 shadow-soft ring-1 ring-transparent transition ${ring} hover:-translate-y-0.5 hover:bg-ink-800`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-ink-100">{title}</h3>
        <p className="mt-1 text-sm text-ink-300">{description}</p>
      </div>
    </Link>
  );
}
