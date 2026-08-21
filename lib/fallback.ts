import { Persona } from "./types";

const CAPTIONS: Record<string, string[]> = {
  travel: [
    "found this place at golden hour and never wanted to leave ✨",
    "no signal, no plans, no complaints 🌍",
    "detour turned into the best part of the trip",
  ],
  "art & design": [
    "spent three hours on a gradient nobody will notice 🎨",
    "color study #47. still not done.",
    "made this instead of sleeping",
  ],
  food: [
    "the crunch on this was unreasonable 🍜",
    "recipe in comments (it's just butter)",
    "ate it before I could get a second photo",
  ],
  "tech & gaming": [
    "she's loud, she's hot, she renders 🤖",
    "cable management: aspirational",
    "shipped it. mostly works.",
  ],
  "fitness & wellness": [
    "showed up. that's the whole post ✨",
    "day 12. legs disagree, brain approves.",
    "slow progress is still progress",
  ],
  music: [
    "loop this at 2am 🎧",
    "one take, all vibes",
    "found the chord. lost the afternoon.",
  ],
  "plants & home": [
    "new leaf unfurled and I cried a little 🌿",
    "corner of the room that fixes my mood",
    "repotted. we grow together.",
  ],
  "diy & making": [
    "built this out of scrap and stubbornness 🛠️",
    "v3 and it finally holds",
    "measured twice, cut four times",
  ],
};

const COMMENTS = [
  "this is unreal 😍",
  "okay the lighting though",
  "stop this is so good",
  "need to know where this is",
  "obsessed with this one",
  "how do you keep doing this 🔥",
  "saving this immediately",
  "the composition here is doing so much work",
  "this belongs on a wall",
  "instant favorite",
];

const CHAT = [
  "haha okay that's actually a good point",
  "ooh tell me more about that",
  "honestly same",
  "I've been thinking about that all week",
  "you should absolutely do it",
  "wait that's so cool",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function fallbackCaption(persona: Persona): string {
  const pool = CAPTIONS[persona.topic] ?? COMMENTS;
  return pick(pool);
}

export function fallbackComment(): string {
  return pick(COMMENTS);
}

export function fallbackChat(persona: Persona): string {
  return `${pick(CHAT)} — ${persona.name}`;
}
