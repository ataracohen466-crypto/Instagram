"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { triggerInstall, useCanInstall, useIsIOS, useIsStandalone } from "@/lib/installPrompt";

const DISMISS_KEY = "bloom.installBannerDismissed";

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
    <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pb-3 pt-3 sm:px-6">
      <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-card">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          {isIOS && !canInstall ? <Share size={16} /> : <Download size={16} />}
        </div>
        <div className="min-w-0 flex-1 text-sm text-ink">
          {canInstall ? (
            <>
              <span className="font-medium">Install Bloom</span>
              <span className="hidden text-ink-faint sm:inline"> — private, on-device, opens like any app.</span>
            </>
          ) : (
            <>
              <span className="font-medium">Add Bloom to your Home Screen</span>
              <span className="text-ink-faint"> — tap Share, then &quot;Add to Home Screen&quot;.</span>
            </>
          )}
        </div>
        {canInstall && (
          <button
            onClick={async () => {
              const accepted = await triggerInstall();
              if (accepted) dismiss();
            }}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-ink transition hover:opacity-90"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-ink-faint transition hover:bg-primary-soft hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
