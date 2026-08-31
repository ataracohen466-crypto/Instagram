"use client";

import { useState, useEffect } from "react";
import {
  Moon, Sun, Monitor, HeartPulse, Download, Trash2, Info, ChevronRight, ExternalLink,
} from "lucide-react";
import { useStore, snapshotData } from "@/lib/store";
import { Card, PageHeader, SectionHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import PasscodePad from "@/components/PasscodePad";
import { enablePasscode, disablePasscode, exportDataAsJson, wipeAllLocalData, verifyAndUnlock } from "@/lib/persist";
import { clearAllImages } from "@/lib/db";
import type { ThemeName, Settings as SettingsT } from "@/lib/types";

const AGE_RANGES: NonNullable<SettingsT["ageRange"]>[] = ["13-15", "16-18", "19-22", "23+", "prefer-not-to-say"];

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updatePrivacy = useStore((s) => s.updatePrivacy);
  const resetAllData = useStore((s) => s.resetAllData);

  const [passcodeModal, setPasscodeModal] = useState<"setup" | "remove" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exported, setExported] = useState(false);

  function exportJson() {
    const json = exportDataAsJson(snapshotData());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bloom-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  async function deleteEverything() {
    await clearAllImages();
    wipeAllLocalData();
    resetAllData();
    window.location.href = "/onboarding";
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Settings" subtitle="Your data, your device, your control." />

      <Card>
        <SectionHeader title="Profile" />
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Display name</label>
            <input
              value={settings.displayName ?? ""}
              onChange={(e) => updateSettings({ displayName: e.target.value || undefined })}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Age range</label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((a) => (
                <button
                  key={a}
                  onClick={() => updateSettings({ ageRange: a })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${settings.ageRange === a ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Appearance" />
        <div className="flex gap-2">
          {([
            { v: "light", icon: Sun, label: "Light" },
            { v: "dark", icon: Moon, label: "Dark" },
            { v: "system", icon: Monitor, label: "System" },
          ] as { v: ThemeName; icon: typeof Sun; label: string }[]).map((t) => (
            <button
              key={t.v}
              onClick={() => updateSettings({ theme: t.v })}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-medium ${
                settings.theme === t.v ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
              }`}
            >
              <t.icon size={17} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Privacy & security" />
        <div className="space-y-1">
          <Toggle
            label="Passcode lock"
            description={settings.privacy.lockMethod === "passcode" ? "Bloom locks after inactivity" : "Off"}
            checked={settings.privacy.lockMethod === "passcode"}
            onChange={(v) => {
              if (v) setPasscodeModal("setup");
              else setPasscodeModal("remove");
            }}
          />
          {settings.privacy.lockMethod === "passcode" && (
            <>
              <Toggle
                label="Encrypt data at rest"
                description="AES-256 encryption of everything stored on this device"
                checked={settings.privacy.encryptData}
                onChange={() => setPasscodeModal("setup")}
              />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-ink">Auto-lock after</p>
                  <p className="text-xs text-ink-soft">Locks Bloom when you step away</p>
                </div>
                <select
                  value={settings.privacy.autoLockMinutes}
                  onChange={(e) => updatePrivacy({ autoLockMinutes: Number(e.target.value) })}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm text-ink"
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={30}>30 min</option>
                  <option value={0}>Never</option>
                </select>
              </div>
              <button onClick={() => setPasscodeModal("setup")} className="flex w-full items-center justify-between py-2 text-sm text-primary">
                Change passcode <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Apple Health" subtitle="Optional, and only what you allow" />
        <p className="mb-3 text-sm text-ink-soft">
          On an iPhone build, Bloom can optionally read wellness data from Apple Health. In this web version, this is a
          placeholder toggle — no health data is actually accessed unless you explicitly connect a future native app.
        </p>
        <Toggle
          label="Connect Apple Health"
          checked={settings.privacy.appleHealthConnected}
          onChange={(v) => updatePrivacy({ appleHealthConnected: v })}
        />
        {settings.privacy.appleHealthConnected && (
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            {([
              ["sleep", "Sleep"], ["workouts", "Workouts"], ["steps", "Steps"],
              ["mindfulness", "Mindfulness minutes"], ["stateOfMind", "State of Mind"],
            ] as const).map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                checked={!!settings.privacy.appleHealthScopes[key]}
                onChange={(v) =>
                  updatePrivacy({ appleHealthScopes: { ...settings.privacy.appleHealthScopes, [key]: v } })
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Skin section" />
        <Toggle
          label="Enable the Skin section"
          description="Skin check-ins, routine tracking, and progress photos"
          checked={settings.skinModuleEnabled}
          onChange={(v) => updateSettings({ skinModuleEnabled: v })}
        />
      </Card>

      <Card className="border-primary/20 bg-primary-soft">
        <SectionHeader title="AI & your data" />
        <p className="text-sm text-ink">
          The Wellness Assistant and every insight in Bloom run entirely on this device, using simple statistics over your
          own check-ins. Nothing you write, and no photo you take, is ever sent to a server or used to train any model.
        </p>
      </Card>

      <Card>
        <SectionHeader title="Your data" />
        <div className="space-y-2">
          <button onClick={exportJson} className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium text-ink">
            <span className="flex items-center gap-2"><Download size={15} /> Export all data as JSON</span>
            {exported && <span className="text-xs text-good">Downloaded</span>}
          </button>
          <p className="px-1 text-xs text-ink-faint">Photos are stored separately on this device and aren't included in the JSON export.</p>
          <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
            <Trash2 size={15} /> Delete all my data
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="About & safety" />
        <div className="space-y-2 text-sm text-ink-soft">
          <p className="flex items-start gap-2"><Info size={15} className="mt-0.5 shrink-0" /> Bloom is a self-awareness and tracking tool. It is not therapy, not a medical device, and doesn't diagnose anything.</p>
          <a href="/hard-day" className="flex items-center gap-2 text-primary"><HeartPulse size={15} /> Crisis resources & support <ExternalLink size={12} /></a>
        </div>
        <p className="mt-4 text-xs text-ink-faint">Bloom v1.0 — built as a private, on-device wellness app.</p>
      </Card>

      <PasscodeModal mode={passcodeModal} onClose={() => setPasscodeModal(null)} />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteEverything}
        title="Delete all your data?"
        body="This permanently removes every check-in, journal entry, goal, and photo from this device. This can't be undone."
        confirmLabel="Delete everything"
        danger
      />
    </div>
  );
}

function PasscodeModal({ mode, onClose }: { mode: "setup" | "remove" | null; onClose: () => void }) {
  const updatePrivacy = useStore((s) => s.updatePrivacy);
  const lockMethod = useStore((s) => s.settings.privacy.lockMethod);
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [stage, setStage] = useState<"verify" | "enter" | "confirm">("enter");
  const [encrypt, setEncrypt] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setCode("");
    setConfirmCode("");
    setError(false);
    setStage(lockMethod === "passcode" ? "verify" : "enter");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode) return null;

  const title = mode === "remove" ? "Enter passcode to remove lock" : lockMethod === "passcode" ? "Enter current passcode" : "Set a passcode";

  async function handleVerify(v: string) {
    const data = await verifyAndUnlock(v);
    if (!data) {
      setError(true);
      setCode("");
      setTimeout(() => setError(false), 400);
      return;
    }
    if (mode === "remove") {
      await disablePasscode(data);
      updatePrivacy({ lockMethod: "none", encryptData: false });
      onClose();
    } else {
      setStage("enter");
      setCode("");
    }
  }

  async function handleFinish(v: string) {
    await enablePasscode(v, encrypt, snapshotData());
    updatePrivacy({ lockMethod: "passcode", encryptData: encrypt });
    onClose();
  }

  return (
    <Modal open={!!mode} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-5">
        {stage === "verify" && (
          <PasscodePad
            value={code}
            error={error}
            onChange={(v) => {
              setCode(v);
              if (v.length === 6) handleVerify(v);
            }}
          />
        )}
        {stage === "enter" && (
          <>
            <p className="text-sm text-ink-soft">Choose a new passcode</p>
            <PasscodePad
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) setStage("confirm");
              }}
            />
          </>
        )}
        {stage === "confirm" && (
          <>
            <p className="text-sm text-ink-soft">Confirm your passcode</p>
            <PasscodePad
              value={confirmCode}
              error={error}
              onChange={(v) => {
                setConfirmCode(v);
                if (v.length === 6) {
                  if (v === code) handleFinish(v);
                  else {
                    setError(true);
                    setTimeout(() => {
                      setError(false);
                      setConfirmCode("");
                    }, 400);
                  }
                }
              }}
            />
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} className="accent-primary" />
              Also encrypt my data at rest
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}
