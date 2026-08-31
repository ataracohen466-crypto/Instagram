"use client";

import { useRef, useState } from "react";
import { Download, HardDriveDownload, KeyRound, LogOut, Upload } from "lucide-react";
import { unbindVault, useStore } from "@/lib/store";
import Modal from "./Modal";
import { EditorFont, ThemeName } from "@/lib/types";
import { triggerInstall, useCanInstall, useIsIOS, useIsStandalone } from "@/lib/installPrompt";
import { changePassword, clearSession } from "@/lib/vault";
import { passwordProblem } from "@/lib/crypto";
import { downloadBackup, restoreBackup } from "@/lib/backup";

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
  const signedInAs = useStore((s) => s.signedInAs);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [pwNote, setPwNote] = useState<string | null>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitPasswordChange = async () => {
    const problem = passwordProblem(nextPw);
    if (problem) return setPwNote(problem);
    if (!signedInAs) return;

    const ok = await changePassword(signedInAs, currentPw, nextPw);
    setPwNote(ok ? "Password changed." : "That current password isn't right.");
    if (ok) {
      setCurrentPw("");
      setNextPw("");
      setChangingPassword(false);
    }
  };

  const logOut = () => {
    clearSession();
    unbindVault();
    window.location.reload();
  };

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

        <div className="space-y-2 border-t border-border pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Account
            </span>
            {signedInAs && <span className="text-xs text-ink-soft">{signedInAs}</span>}
          </div>

          <button
            onClick={() => downloadBackup()}
            className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-ink-faint"
          >
            <span className="text-sm text-ink">Download a backup</span>
            <HardDriveDownload size={14} className="text-ink-faint" />
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-ink-faint"
          >
            <span className="text-sm text-ink">Restore from a backup</span>
            <Upload size={14} className="text-ink-faint" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const result = await restoreBackup(file);
              setRestoreNote(result.message);
              e.target.value = "";
            }}
          />
          {restoreNote && <p className="px-1 text-xs text-ink-faint">{restoreNote}</p>}

          <p className="px-1 pb-1 pt-0.5 text-[11px] leading-relaxed text-ink-faint">
            Your writing is saved to this account on this device and stays put
            between visits. It doesn't travel to other devices — keep a backup
            file so a lost or wiped device can't take your book with it.
          </p>

          {changingPassword ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                type="password"
                value={nextPw}
                onChange={(e) => setNextPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitPasswordChange()}
                placeholder="New password"
                className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setChangingPassword(false);
                    setPwNote(null);
                  }}
                  className="flex-1 rounded-lg border border-border py-2 text-xs text-ink-soft transition hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPasswordChange}
                  className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-accent-ink transition hover:opacity-90"
                >
                  Change it
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setChangingPassword(true);
                setPwNote(null);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-ink-faint"
            >
              <span className="text-sm text-ink">Change password</span>
              <KeyRound size={14} className="text-ink-faint" />
            </button>
          )}
          {pwNote && <p className="px-1 text-xs text-ink-faint">{pwNote}</p>}

          <button
            onClick={logOut}
            className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition hover:border-ink-faint"
          >
            <span className="text-sm text-ink">Lock and log out</span>
            <LogOut size={14} className="text-ink-faint" />
          </button>
        </div>

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
