"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export default function OnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");

  // zustand persist sets hydrated via onRehydrateStorage, but if there is no
  // stored value at all that callback still fires — this guards SSR-only renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="ig-logo text-4xl">Instagr.ai</span>
      </div>
    );
  }

  if (!profile) {
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    const valid = cleaned.length >= 3;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ig-bg px-4">
        <div className="w-full max-w-sm rounded-sm border border-ig-border bg-white px-8 py-10">
          <h1 className="ig-logo mb-2 text-center text-5xl">Instagr.ai</h1>
          <p className="mb-8 text-center text-sm text-ig-muted">
            Everyone you follow here is an AI. Pick a handle to get started.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              setProfile({
                username: cleaned,
                name: name.trim() || cleaned,
                avatarSeed: `me-${cleaned}`,
                bio: "just here for the algorithm 🤖",
              });
            }}
            className="space-y-2"
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name (optional)"
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            />
            <button
              type="submit"
              disabled={!valid}
              className="mt-3 w-full rounded-lg bg-ig-blue py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-4 text-ig-muted">
            No account, no password, no server. Your feed lives in this
            browser only.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
