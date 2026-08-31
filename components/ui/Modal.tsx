"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-glow animate-fade-in sm:rounded-3xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-faint hover:bg-surface-raised">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
