"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guitar, Check } from "lucide-react";
import { useGuitarAI } from "@/lib/store";
import type { OnboardingProfile, GuitarType, SkillLevel, FocusPreference } from "@/lib/types";

const GUITAR_TYPES: { id: GuitarType; label: string }[] = [
  { id: "acoustic", label: "Acoustic" },
  { id: "electric", label: "Electric" },
  { id: "classical", label: "Classical / Nylon" },
  { id: "bass", label: "Bass" },
];

const SKILL_LEVELS: { id: SkillLevel; label: string; sub: string }[] = [
  { id: "absolute-beginner", label: "Absolute Beginner", sub: "Never picked one up" },
  { id: "beginner", label: "Beginner", sub: "Know a few chords" },
  { id: "early-intermediate", label: "Early Intermediate", sub: "Can play simple songs" },
  { id: "intermediate", label: "Intermediate", sub: "Comfortable with barre chords" },
  { id: "advanced", label: "Advanced", sub: "Looking to refine & improvise" },
];

const GENRES = ["Pop", "Rock", "Folk", "Blues", "Jazz", "Classical", "Country", "Metal", "R&B", "Indie"];
const GOALS = ["Play my favorite songs", "Write my own music", "Join a band", "Play for friends/family", "Just for fun & stress relief", "Understand music theory"];
const MINUTES = [5, 10, 15, 20, 30, 45];
const FOCUS: { id: FocusPreference; label: string }[] = [
  { id: "songs", label: "Mostly songs" },
  { id: "technique", label: "Mostly technique" },
  { id: "theory", label: "Mostly theory" },
  { id: "mixture", label: "A mix of everything" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useGuitarAI((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingProfile>({
    name: "",
    guitarType: "acoustic",
    skillLevel: "beginner",
    genres: [],
    artists: "",
    goals: [],
    minutesPerDay: 15,
    focus: "mixture",
    completedAt: null,
  });

  const steps = [
    "Welcome",
    "Your guitar",
    "Skill level",
    "Musical taste",
    "Your goals",
    "Practice time",
    "Focus",
  ];
  const isLast = step === steps.length - 1;

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function next() {
    if (isLast) {
      completeOnboarding(data);
      router.push("/");
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 shadow-glow">
            <Guitar size={22} />
          </div>
          <span className="font-display text-xl font-semibold">Guitar AI</span>
        </div>

        <div className="mb-6 flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-gold-500" : "bg-ink-700"}`} />
          ))}
        </div>

        <div className="card animate-rise p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-semibold">Let's build your practice plan.</h1>
              <p className="text-ink-300">
                A few quick questions so Guitar AI can teach at exactly your level — like sitting down with a real
                instructor for the first time.
              </p>
              <input
                className="input mt-2"
                placeholder="What should we call you?"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">What do you play?</h2>
              <div className="grid grid-cols-2 gap-3">
                {GUITAR_TYPES.map((g) => (
                  <Choice key={g.id} active={data.guitarType === g.id} onClick={() => setData({ ...data, guitarType: g.id })}>
                    {g.label}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Where are you starting from?</h2>
              <div className="space-y-2">
                {SKILL_LEVELS.map((s) => (
                  <Choice
                    key={s.id}
                    active={data.skillLevel === s.id}
                    onClick={() => setData({ ...data, skillLevel: s.id })}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="block text-xs text-ink-400">{s.sub}</span>
                    </span>
                    {data.skillLevel === s.id && <Check size={18} className="text-gold-400" />}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">What music do you love?</h2>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Choice key={g} active={data.genres.includes(g)} onClick={() => setData({ ...data, genres: toggle(data.genres, g) })} className="px-4 py-2 text-sm">
                    {g}
                  </Choice>
                ))}
              </div>
              <input
                className="input"
                placeholder="Favorite artists (optional)"
                value={data.artists}
                onChange={(e) => setData({ ...data, artists: e.target.value })}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">What's your main goal?</h2>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <Choice key={g} active={data.goals.includes(g)} onClick={() => setData({ ...data, goals: toggle(data.goals, g) })} className="w-full text-left">
                    {g}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">How much time can you practice?</h2>
              <div className="grid grid-cols-3 gap-3">
                {MINUTES.map((m) => (
                  <Choice key={m} active={data.minutesPerDay === m} onClick={() => setData({ ...data, minutesPerDay: m })}>
                    {m} min
                  </Choice>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Songs, technique, or theory?</h2>
              <div className="space-y-2">
                {FOCUS.map((f) => (
                  <Choice key={f.id} active={data.focus === f.id} onClick={() => setData({ ...data, focus: f.id })} className="w-full text-left">
                    {f.label}
                  </Choice>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button className="text-sm text-ink-400 disabled:opacity-0" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
            <button className="btn-primary" onClick={next}>
              {isLast ? "Start practicing" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
        active ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-ink-600 bg-ink-900 text-ink-200 hover:border-ink-500"
      } ${className}`}
    >
      {children}
    </button>
  );
}
