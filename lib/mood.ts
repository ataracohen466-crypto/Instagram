import type { Emotion, Scale10 } from "./types";

export const MOOD_FACES: { min: number; emoji: string; label: string }[] = [
  { min: 0, emoji: "😔", label: "Really tough" },
  { min: 2, emoji: "😕", label: "Rough" },
  { min: 4, emoji: "😐", label: "Okay" },
  { min: 6, emoji: "🙂", label: "Good" },
  { min: 8, emoji: "😄", label: "Great" },
];

export function moodFace(value: Scale10) {
  let match = MOOD_FACES[0];
  for (const f of MOOD_FACES) if (value >= f.min) match = f;
  return match;
}

export function moodColor(value: Scale10): string {
  if (value >= 8) return "var(--good)";
  if (value >= 6) return "var(--primary)";
  if (value >= 4) return "var(--calm)";
  if (value >= 2) return "var(--skin)";
  return "var(--warn)";
}

export const EMOTION_META: Record<Emotion, { emoji: string; label: string }> = {
  happy: { emoji: "😊", label: "Happy" },
  calm: { emoji: "😌", label: "Calm" },
  grateful: { emoji: "🙏", label: "Grateful" },
  hopeful: { emoji: "🌤️", label: "Hopeful" },
  proud: { emoji: "😤", label: "Proud" },
  excited: { emoji: "🤩", label: "Excited" },
  content: { emoji: "🙂", label: "Content" },
  curious: { emoji: "🤔", label: "Curious" },
  loved: { emoji: "🥰", label: "Loved" },
  relieved: { emoji: "😮‍💨", label: "Relieved" },
  tired: { emoji: "😴", label: "Tired" },
  anxious: { emoji: "😰", label: "Anxious" },
  stressed: { emoji: "😖", label: "Stressed" },
  sad: { emoji: "😢", label: "Sad" },
  lonely: { emoji: "🥺", label: "Lonely" },
  angry: { emoji: "😠", label: "Angry" },
  frustrated: { emoji: "😤", label: "Frustrated" },
  overwhelmed: { emoji: "🌊", label: "Overwhelmed" },
  nervous: { emoji: "😬", label: "Nervous" },
  numb: { emoji: "😶", label: "Numb" },
  bored: { emoji: "🥱", label: "Bored" },
  insecure: { emoji: "😟", label: "Insecure" },
};

export const LIFESTYLE_META: Record<string, { emoji: string; label: string }> = {
  exercise: { emoji: "🏃", label: "Exercised" },
  timeOutside: { emoji: "🌳", label: "Time outside" },
  goodSleep: { emoji: "😴", label: "Slept well" },
  socialTime: { emoji: "👯", label: "Time with people" },
  screenTime: { emoji: "📱", label: "Lots of screen time" },
  journaled: { emoji: "📓", label: "Journaled" },
  music: { emoji: "🎧", label: "Listened to music" },
  hydrated: { emoji: "💧", label: "Stayed hydrated" },
  mindfulness: { emoji: "🧘", label: "Mindfulness" },
  ateWell: { emoji: "🥗", label: "Ate well" },
};
