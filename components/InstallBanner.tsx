"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { triggerInstall, useCanInstall, useIsIOS, useIsStandalone } from "@/lib/installPrompt";

const DISMISS_KEY = "inkwell.installBannerDismissed";

export default function InstallBanner() {
  const canInstall = useCanInstall();
  const isIOS = useIsIOS();
  const isStandalone = useIsStandalone();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — banner just reappears next visit, harmless */
    }
  };

  if (isStandalone || dismissed || !(canInstall || isIOS)) return null;

  return (
    <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 pb-4 pt-1 sm:px-8">
      <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-paper-raised px-4 py-3 shadow-card">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          {isIOS && !canInstall ? <Share size={16} /> : <Download size={16} />}
        </div>
        <div className="min-w-0 flex-1 text-sm text-ink">
          {canInstall ? (
            <>
              <span className="font-medium">Install Inkwell</span>
              <span className="hidden text-ink-faint sm:inline"> — write offline, open it like any app.</span>
            </>
          ) : (
            <>
              <span className="font-medium">Add Inkwell to your Home Screen</span>
              <span className="text-ink-faint"> — tap Share, then "Add to Home Screen".</span>
            </>
          )}
        </div>
        {canInstall && (
          <button
            onClick={async () => {
              const accepted = await triggerInstall();
              if (accepted) dismiss();
            }}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition hover:opacity-90"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-ink-faint transition hover:bg-accent-soft hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
