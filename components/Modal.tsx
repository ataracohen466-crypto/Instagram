"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${width} animate-pop-in rounded-2xl border border-border bg-paper-raised p-5 shadow-soft`}
      >
        <div className={`flex items-center justify-between ${title ? "mb-4" : "mb-1 justify-end"}`}>
          {title && <h2 className="font-serif text-lg text-ink">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-faint transition hover:bg-accent-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
