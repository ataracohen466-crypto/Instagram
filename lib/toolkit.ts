import {
  Wind, Waves, Sparkles, NotebookPen, Sun, Target, MoonStar, Heart, Brain, Leaf,
  type LucideIcon,
} from "lucide-react";

export type ToolKind = "breathing" | "steps" | "prompts" | "timer";

export interface BreathingPhase {
  label: string;
  seconds: number;
}

export interface StepItem {
  title: string;
  body: string;
}

export interface Tool {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  color: string;
  kind: ToolKind;
  durationLabel: string;
  phases?: BreathingPhase[];
  steps?: StepItem[];
  prompts?: string[];
  timerPresets?: number[];
}

export const TOOLS: Tool[] = [
  {
    id: "box-breathing",
    title: "Box breathing",
    category: "Breathing",
    description: "A steady 4-count pattern used to calm the nervous system fast.",
    icon: Wind,
    color: "var(--calm)",
    kind: "breathing",
    durationLabel: "1–3 min",
    phases: [
      { label: "Inhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
      { label: "Exhale", seconds: 4 },
      { label: "Hold", seconds: 4 },
    ],
  },
  {
    id: "478-breathing",
    title: "4-7-8 breathing",
    category: "Breathing",
    description: "A longer exhale to help your body downshift out of stress.",
    icon: Waves,
    color: "var(--primary)",
    kind: "breathing",
    durationLabel: "1–2 min",
    phases: [
      { label: "Inhale", seconds: 4 },
      { label: "Hold", seconds: 7 },
      { label: "Exhale", seconds: 8 },
    ],
  },
  {
    id: "grounding-54321",
    title: "5-4-3-2-1 grounding",
    category: "Grounding",
    description: "Use your senses to come back to the present moment.",
    icon: Leaf,
    color: "var(--good)",
    kind: "steps",
    durationLabel: "2–3 min",
    steps: [
      { title: "5 things you can see", body: "Look around and silently name five things you can see." },
      { title: "4 things you can feel", body: "Notice four things you can physically feel — your feet on the floor, the air, fabric." },
      { title: "3 things you can hear", body: "Listen for three distinct sounds, near or far." },
      { title: "2 things you can smell", body: "Notice two smells, even faint ones — or two things you like the smell of." },
      { title: "1 thing you can taste", body: "Notice one taste in your mouth, or take a sip of something." },
    ],
  },
  {
    id: "mindful-minute",
    title: "Mindful minute",
    category: "Mindfulness",
    description: "A short guided pause to notice your breath without changing it.",
    icon: Brain,
    color: "var(--primary)",
    kind: "timer",
    durationLabel: "1–5 min",
    timerPresets: [60, 120, 300],
  },
  {
    id: "journaling-prompts",
    title: "Journaling prompts",
    category: "Journaling",
    description: "Pick a prompt and write whatever comes up — it saves to your journal.",
    icon: NotebookPen,
    color: "var(--skin)",
    kind: "prompts",
    durationLabel: "3–5 min",
    prompts: [
      "What's weighing on you right now, even a little?",
      "What's something you handled well recently?",
      "If today had a title, what would it be and why?",
      "What do you need more of this week?",
      "Write a note to yourself for a harder day.",
    ],
  },
  {
    id: "muscle-relaxation",
    title: "Progressive muscle relaxation",
    category: "Relaxation",
    description: "Tense and release each muscle group to physically let go of tension.",
    icon: Sparkles,
    color: "var(--calm)",
    kind: "steps",
    durationLabel: "3–5 min",
    steps: [
      { title: "Hands & arms", body: "Clench your fists for 5 seconds, then release and notice the difference." },
      { title: "Shoulders", body: "Raise your shoulders to your ears for 5 seconds, then drop them." },
      { title: "Face", body: "Scrunch your face tightly for 5 seconds, then relax it completely." },
      { title: "Stomach", body: "Tighten your stomach for 5 seconds, then let it go soft." },
      { title: "Legs & feet", body: "Curl your toes and tense your legs for 5 seconds, then release." },
    ],
  },
  {
    id: "focus-reset",
    title: "Focus reset",
    category: "Focus",
    description: "A short reset to help you settle back into a task.",
    icon: Target,
    color: "var(--primary)",
    kind: "timer",
    durationLabel: "2 min",
    timerPresets: [120, 300],
  },
  {
    id: "sleep-winddown",
    title: "Sleep wind-down",
    category: "Sleep support",
    description: "A short routine to signal to your body that it's time to rest.",
    icon: MoonStar,
    color: "var(--calm)",
    kind: "steps",
    durationLabel: "5 min",
    steps: [
      { title: "Dim the lights", body: "Lower screen brightness or switch to a warmer light in the room." },
      { title: "Put devices down", body: "Set your phone somewhere out of reach if you can." },
      { title: "Slow breathing", body: "Try 5 rounds of box breathing lying down." },
      { title: "One-line reflection", body: "Note one thing that happened today — good, hard, or neutral." },
    ],
  },
  {
    id: "positive-reflection",
    title: "Three good things",
    category: "Positive reflection",
    description: "A well-studied way to gently shift attention toward what's working.",
    icon: Sun,
    color: "var(--good)",
    kind: "prompts",
    durationLabel: "2 min",
    prompts: [
      "Name three things that went okay today, even small ones.",
      "What's something someone did that you appreciated recently?",
      "What's a small win from this week?",
    ],
  },
  {
    id: "stress-reframe",
    title: "Quick reframe",
    category: "Stress management",
    description: "A short technique to loosen an all-or-nothing thought.",
    icon: Heart,
    color: "var(--warn)",
    kind: "steps",
    durationLabel: "3 min",
    steps: [
      { title: "Name the thought", body: "What's the exact thought stressing you out right now?" },
      { title: "Check the evidence", body: "What's one piece of evidence for it, and one against it?" },
      { title: "Find a kinder version", body: "How would you say this to a friend in your exact situation?" },
      { title: "Pick one small next step", body: "What's one small, doable thing you could do next?" },
    ],
  },
];

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id);
}
