"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Flower2, ShieldCheck } from "lucide-react";
import { useStore, snapshotData } from "@/lib/store";
import { bootLoad, verifyAndUnlock, persist } from "@/lib/persist";
import type { AppData } from "@/lib/types";
import PasscodePad from "./PasscodePad";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const locked = useStore((s) => s.locked);
  const hydrate = useStore((s) => s.hydrate);
  const setLocked = useStore((s) => s.setLocked);
  const autoLockMinutes = useStore((s) => s.settings.privacy.autoLockMinutes);
  const lockMethod = useStore((s) => s.settings.privacy.lockMethod);

  // Boot: load whatever we can without a passcode.
  useEffect(() => {
    bootLoad().then(({ data, locked }) => hydrate(data, locked));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave, debounced, only once hydrated and unlocked. A route change is
  // client-side (no reload) so the debounce alone is safe for normal
  // navigation, but a hard reload/tab-close within the debounce window
  // would otherwise lose the last edit — so also flush immediately
  // whenever the page is about to go away or into the background.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || locked) return;

    const flush = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persist(snapshotData()).catch(() => {});
    };

    const unsub = useStore.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 400);
    });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsub();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydrated, locked]);

  // Auto-lock after inactivity.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rearmIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (lockMethod !== "passcode" || !autoLockMinutes) return;
    idleTimer.current = setTimeout(() => setLocked(true), autoLockMinutes * 60_000);
  }, [lockMethod, autoLockMinutes, setLocked]);

  useEffect(() => {
    if (locked || lockMethod !== "passcode" || !autoLockMinutes) return;
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, rearmIdle));
    rearmIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, rearmIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [locked, lockMethod, autoLockMinutes, rearmIdle]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base">
        <div className="animate-pulse text-primary">
          <Flower2 size={36} strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  if (locked) {
    return <LockScreen onUnlock={(data) => hydrate(data, false)} />;
  }

  return <>{children}</>;
}

function LockScreen({ onUnlock }: { onUnlock: (data: AppData) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    verifyAndUnlock(code).then((data) => {
      if (data) {
        onUnlock(data);
      } else {
        setError(true);
        setCode("");
        setTimeout(() => setError(false), 400);
      }
      setBusy(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-base px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck size={26} />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">Welcome back</h1>
        <p className="text-sm text-ink-soft">Enter your passcode to unlock Bloom</p>
      </div>
      <PasscodePad value={code} onChange={setCode} error={error} />
      {error && <p className="text-sm text-warn">That passcode didn't match — try again.</p>}
    </div>
  );
}
