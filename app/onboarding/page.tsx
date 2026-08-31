"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flower2, ShieldCheck, Lock, Sparkles, ChevronRight, Check, HeartHandshake,
} from "lucide-react";
import { useStore, snapshotData } from "@/lib/store";
import { enablePasscode, persist } from "@/lib/persist";
import PasscodePad from "@/components/PasscodePad";
import type { Settings } from "@/lib/types";

const AGE_RANGES: { value: NonNullable<Settings["ageRange"]>; label: string }[] = [
  { value: "13-15", label: "13–15" },
  { value: "16-18", label: "16–18" },
  { value: "19-22", label: "19–22" },
  { value: "23+", label: "23+" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const updateSettings = useStore((s) => s.updateSettings);
  const updatePrivacy = useStore((s) => s.updatePrivacy);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [ageRange, setAgeRange] = useState<Settings["ageRange"]>();
  const [skinEnabled, setSkinEnabled] = useState(true);

  const [wantsLock, setWantsLock] = useState<boolean | null>(null);
  const [encrypt, setEncrypt] = useState(true);
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [mismatch, setMismatch] = useState(false);

  const totalSteps = 5;

  async function finish() {
    updateSettings({ displayName: displayName || undefined, ageRange, skinModuleEnabled: skinEnabled, onboardingComplete: true });
    if (wantsLock && code.length >= 4) {
      await enablePasscode(code, encrypt, { ...snapshotData(), settings: { ...snapshotData().settings, onboardingComplete: true } });
      updatePrivacy({ lockMethod: "passcode", encryptData: encrypt });
    } else {
      // No passcode set: write straight to storage rather than waiting on
      // the debounced autosave, so onboardingComplete survives even if the
      // very next action is a hard navigation.
      await persist(snapshotData());
    }
    router.replace("/");
  }

  function next() {
    setStep((s) => Math.min(totalSteps - 1, s + 1));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-mesh bg-base px-5 py-8 sm:items-center sm:justify-center">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 sm:flex-none">
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col items-center gap-5 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-calm text-white shadow-glow">
              <Flower2 size={30} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Welcome to Bloom</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                A private space to check in with yourself, notice patterns, and see your progress over
                time — for how you're doing, and how your skin is doing too.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-border bg-surface/70 p-4 text-left text-xs text-ink-soft">
              Bloom is a self-awareness and tracking tool — not a diagnosis, not a medical device, and not
              a replacement for therapy or a doctor. If you're ever in crisis, Bloom will always point you
              toward real help.
            </div>
            <PrimaryButton onClick={next}>Get started</PrimaryButton>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <ShieldCheck size={26} />
              </div>
              <h1 className="font-display text-xl font-bold text-ink">Your data stays yours</h1>
            </div>
            <ul className="space-y-3 text-sm text-ink-soft">
              {[
                "Everything you track lives on this device, not on a server.",
                "There's no advertising, and nothing here is used to target you.",
                "The wellness assistant and insights run locally — no journal entry ever leaves your device.",
                "You can lock the app, export everything, or delete everything at any time.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-good" />
                  {t}
                </li>
              ))}
            </ul>
            <PrimaryButton onClick={next}>Continue</PrimaryButton>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Lock size={24} />
              </div>
              <h1 className="font-display text-xl font-bold text-ink">Add a passcode?</h1>
              <p className="text-sm text-ink-soft">Optional, but recommended for something this personal.</p>
            </div>

            {wantsLock === null && (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setWantsLock(true)}
                  className="rounded-2xl border border-primary bg-primary-soft px-4 py-3 text-left text-sm font-medium text-primary"
                >
                  Yes, set a passcode
                </button>
                <button
                  onClick={() => {
                    setWantsLock(false);
                    next();
                  }}
                  className="rounded-2xl border border-border px-4 py-3 text-left text-sm font-medium text-ink-soft"
                >
                  Not right now
                </button>
              </div>
            )}

            {wantsLock === true && (
              <div className="flex flex-col items-center gap-5">
                <p className="text-sm font-medium text-ink">
                  {stage === "enter" ? "Choose a passcode" : "Confirm your passcode"}
                </p>
                <PasscodePad
                  value={stage === "enter" ? code : confirmCode}
                  error={mismatch}
                  onChange={(v) => {
                    setMismatch(false);
                    if (stage === "enter") {
                      setCode(v);
                      if (v.length === 6) setStage("confirm");
                    } else {
                      setConfirmCode(v);
                      if (v.length === 6) {
                        if (v === code) next();
                        else {
                          setMismatch(true);
                          setTimeout(() => {
                            setConfirmCode("");
                          }, 400);
                        }
                      }
                    }
                  }}
                />
                {mismatch && <p className="text-sm text-warn">Those didn't match — try again.</p>}
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} className="accent-primary" />
                  Also encrypt my data at rest on this device
                </label>
                <button
                  onClick={() => {
                    setWantsLock(false);
                    next();
                  }}
                  className="text-xs text-ink-faint underline"
                >
                  Skip this
                </button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles size={24} />
              </div>
              <h1 className="font-display text-xl font-bold text-ink">A little about you</h1>
              <p className="text-sm text-ink-soft">Totally optional — helps nothing more than your own reports.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">What should we call you?</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="First name or nickname"
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">Age range</label>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAgeRange(a.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      ageRange === a.value ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <PrimaryButton onClick={next}>Continue</PrimaryButton>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-skin-soft text-skin">
                <HeartHandshake size={24} />
              </div>
              <h1 className="font-display text-xl font-bold text-ink">One more thing</h1>
              <p className="text-sm text-ink-soft">
                Bloom includes an optional skin wellness tracker — check-ins, routine tracking, and
                progress photos, private by default.
              </p>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3.5">
              <span className="text-sm font-medium text-ink">Enable the Skin section</span>
              <input
                type="checkbox"
                checked={skinEnabled}
                onChange={(e) => setSkinEnabled(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
            </label>
            <p className="text-xs text-ink-faint">You can turn this on or off anytime in Settings.</p>
            <PrimaryButton onClick={finish}>Start using Bloom</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-ink shadow-soft transition hover:opacity-90 active:scale-[0.99]"
    >
      {children}
      <ChevronRight size={16} />
    </button>
  );
}
