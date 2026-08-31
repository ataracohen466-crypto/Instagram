import type { CheckIn } from "./types";
import { avg } from "./insights";

export const REFLECTION_PROMPTS = [
  "What made today easier?",
  "What are you proud of?",
  "What has been taking up most of your mental energy?",
  "What helped you feel calm?",
  "What is something you want to handle differently next time?",
  "Who or what made you smile today?",
  "What's one small thing that went right today?",
];

/** Picks a prompt that changes based on recent check-ins, not fully random. */
export function pickReflectionPrompt(recent: CheckIn[]): string {
  if (recent.length === 0) return REFLECTION_PROMPTS[1];
  const avgAnxiety = avg(recent.slice(-5).map((c) => c.anxiety)) ?? 5;
  const avgMood = avg(recent.slice(-5).map((c) => c.overallMood)) ?? 5;
  if (avgAnxiety >= 7) return "What helped you feel calm?";
  if (avgMood <= 4) return "What made today easier?";
  if (avgMood >= 7) return "What are you proud of?";
  const dayIndex = new Date().getDate() % REFLECTION_PROMPTS.length;
  return REFLECTION_PROMPTS[dayIndex];
}
