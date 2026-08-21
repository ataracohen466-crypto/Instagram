import { PERSONAS } from "./personas";
import { photoUrl } from "./seed";
import { uid } from "./seed";

/** How long a story stays viewable before it's treated as expired. */
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface StoryItem {
  id: string;
  kind: "video" | "image";
  /** Encrypted clip in the media store — your own story items. */
  mediaId?: string;
  /** A stock photo seed — the AI personas' seeded stories. */
  seed?: string;
  /** Seconds an image holds for; a video plays its own real length. */
  duration: number;
  createdAt: number;
}

export function isActive(item: StoryItem, now = Date.now()): boolean {
  return now - item.createdAt < STORY_LIFETIME_MS;
}

export function activeItems(items: StoryItem[], now = Date.now()): StoryItem[] {
  return items.filter((item) => isActive(item, now));
}

const PERSONA_STORY_LINES: Record<string, string[]> = {
  travel: ["found this view today", "no plans, best trip"],
  "art & design": ["studio today", "new colour palette"],
  food: ["testing a new recipe", "this smell though"],
  "tech & gaming": ["late night build", "new setup piece"],
  "fitness & wellness": ["morning session", "rest day, still moving"],
  music: ["new loop today", "studio session"],
  "plants & home": ["new growth", "sunday reset"],
  "diy & making": ["today's build", "small project done"],
};

/**
 * Seeded stories for the AI personas — 2-3 stock-photo items each, timed so
 * they read as posted at different points in the last day (not all expiring
 * at once).
 */
export function personaStory(personaId: string): StoryItem[] {
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return [];

  const now = Date.now();
  const lines = PERSONA_STORY_LINES[persona.topic] ?? ["today"];
  const count = 2 + (persona.username.length % 2);

  return Array.from({ length: count }, (_, i) => ({
    id: uid("story"),
    kind: "image" as const,
    seed: `${persona.id}-story-${i}`,
    duration: 5,
    createdAt: now - (count - i) * 2_100_000 - (persona.username.length % 5) * 60_000,
  }));
}

export function storyThumbUrl(item: StoryItem): string {
  return item.seed ? photoUrl(item.seed, 400) : "";
}

export interface StoryFeedEntry {
  ownerId: string;
  username: string;
  avatarSeed: string;
  isMine: boolean;
  items: StoryItem[];
}

/**
 * The ordered list of everyone with an active story right now — your own
 * story first (if you've posted one), then every AI persona.
 */
export function buildStoryFeed(
  profile: { username: string; avatarSeed: string } | null,
  myStory: StoryItem[]
): StoryFeedEntry[] {
  const entries: StoryFeedEntry[] = [];
  const mine = activeItems(myStory);
  if (profile && mine.length) {
    entries.push({
      ownerId: "me",
      username: profile.username,
      avatarSeed: profile.avatarSeed,
      isMine: true,
      items: mine,
    });
  }
  PERSONAS.forEach((p) => {
    const items = activeItems(personaStory(p.id));
    if (items.length) {
      entries.push({
        ownerId: p.id,
        username: p.username,
        avatarSeed: p.avatarSeed,
        isMine: false,
        items,
      });
    }
  });
  return entries;
}
