"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredEvent = null;
    notify();
  });
}

/** True once the browser has offered an installable-app prompt to defer. */
export function useCanInstall(): boolean {
  const [canInstall, setCanInstall] = useState(() => deferredEvent !== null);
  useEffect(() => {
    const onChange = () => setCanInstall(deferredEvent !== null);
    listeners.add(onChange);
    onChange();
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return canInstall;
}

/** True once the app is already running installed (standalone) rather than in a browser tab. */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
  }, []);
  return standalone;
}

export function useIsIOS(): boolean {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
  }, []);
  return ios;
}

export async function triggerInstall(): Promise<boolean> {
  if (!deferredEvent) return false;
  deferredEvent.prompt();
  const choice = await deferredEvent.userChoice;
  deferredEvent = null;
  notify();
  return choice.outcome === "accepted";
}
