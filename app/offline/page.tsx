"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <WifiOff size={20} />
      </div>
      <p className="font-serif text-lg text-ink">You're offline</p>
      <p className="max-w-xs text-sm text-ink-faint">
        This page hasn't been opened before, so it can't load without a connection. Your books are safe
        in this browser — reconnect and reload to keep writing.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
