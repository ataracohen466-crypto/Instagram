"use client";

import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import Modal from "./Modal";
import { EditorFont, ThemeName } from "@/lib/types";
import { triggerInstall, useCanInstall, useIsIOS, useIsStandalone } from "@/lib/installPrompt";

const THEMES: { id: ThemeName; label: string; bg: string; fg: string }[] = [
  { id: "light", label: "Paper", bg: "#faf8f4", fg: "#2a2622" },
  { id: "sepia", label: "Sepia", bg: "#f1e7d0", fg: "#3b2f1f" },
  { id: "dark", label: "Ink", bg: "#1a1917", fg: "#ece7de" },
];

const FONTS: { id: EditorFont; label: string; sample: string }[] = [
  { id: "serif", label: "Serif", sample: "font-serif" },
  { id: "sans", label: "Sans", sample: "font-sans" },
  { id: "mono", label: "Mono", sample: "font-mono" },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const canInstall = useCanInstall();
  const isIOS = useIsIOS();
  const isStandalone = useIsStandalone();

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Theme
          </div>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`flex-1 rounded-xl border p-2.5 text-left transition ${
                  settings.theme === t.id
                    ? "border-accent ring-1 ring-accent"
                    : "border-border hover:border-ink-faint"
                }`}
                style={{ background: t.bg }}
              >
                <div
                  className="mb-1.5 h-6 rounded-md border border-black/10"
                  style={{ background: t.bg }}
                />
                <span className="text-xs font-medium" style={{ color: t.fg }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Editor font
          </div>
          <div className="flex gap-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => updateSettings({ font: f.id })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${f.sample} ${
                  settings.font === f.id
                    ? "border-accent bg-accent-soft text-ink ring-1 ring-accent"
                    : "border-border text-ink-soft hover:border-ink-faint"
                }`}
              >
                Aa
                <div className="mt-0.5 text-[11px] opacity-80">{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Manuscript width
          </div>
          <div className="flex gap-2">
            {(["narrow", "normal", "wide"] as const).map((w) => (
              <button
                key={w}
                onClick={() => updateSettings({ editorWidth: w })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition ${
                  settings.editorWidth === w
                    ? "border-accent bg-accent-soft text-ink ring-1 ring-accent"
                    : "border-border text-ink-soft hover:border-ink-faint"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-ink">Typewriter scrolling</span>
          <input
            type="checkbox"
            checked={settings.typewriterMode}
            onChange={(e) => updateSettings({ typewriterMode: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Daily word goal
          </span>
          <input
            type="number"
            min={0}
            step={50}
            value={settings.dailyGoal}
            onChange={(e) => updateSettings({ dailyGoal: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        {!isStandalone && (canInstall || isIOS) && (
          <button
            onClick={() => canInstall && triggerInstall()}
            className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-ink-faint"
          >
            <span className="text-sm text-ink">Install app</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-faint">
              {canInstall ? "Add to this device" : "Share → Add to Home Screen"}
              <Download size={14} />
            </span>
          </button>
        )}
      </div>
    </Modal>
  );
}
