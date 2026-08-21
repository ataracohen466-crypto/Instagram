import { PERSONAS } from "./personas";
import { Comment } from "./types";
import { fallbackComment } from "./fallback";
import { uid } from "./seed";
import { assetUrl } from "./assets";
import type { TransitionId, FilterId, TextStyleId } from "./reelTemplates";

/** One clip of a template-built reel: the user's media plus its overlay. */
export interface ReelFrame {
  /** Encrypted clip in the media store; the reel only keeps the id. */
  mediaId?: string;
  kind?: "video" | "image";
  /** Legacy photo data URL, kept so reels made before video still play. */
  imageUrl?: string;
  seed: string;
  seconds: number;
  text: string;
}

export interface Reel {
  id: string;
  authorUsername: string;
  authorAvatarSeed: string;
  /** 2-3 photo seeds crossfaded with a slow zoom/pan to fake motion — see the note in ReelCard. */
  frameSeeds: string[];
  caption: string;
  audioLabel: string;
  likedBy: string[];
  comments: Comment[];
  createdAt: number;
  /** Bundled MP4 for the AI personas' own reels. */
  videoSrc?: string;
  /**
   * A template reel is exported to one continuous video at share time; this
   * is that single clip in the media store. `frames` is kept only as the
   * recipe it was built from.
   */
  videoMediaId?: string;
  durationSeconds?: number;
  /** Background music mixed into the exported video. */
  musicMediaId?: string;
  musicTitle?: string;
  /** Present on reels the user built from a template. */
  frames?: ReelFrame[];
  templateId?: string;
  templateName?: string;
  transition?: TransitionId;
  filter?: FilterId;
  textStyle?: TextStyleId;
  isMine?: boolean;
}

const REEL_CAPTIONS: Record<string, string[]> = {
  travel: ["POV: the layover was the best part", "walked here for 20 mins, worth it 🌍"],
  "art & design": ["process > result, always", "3am render, no regrets 🎨"],
  food: ["the sound this makes when you cut it 🔊", "recipe? vibes, mostly"],
  "tech & gaming": ["shipping this at 2am energy", "rate my setup 🤖"],
  "fitness & wellness": ["day 1 vs day 100", "no music needed, the reps talk"],
  music: ["loop this until it's stuck in your head 🎧", "made this in one sitting"],
  "plants & home": ["time-lapse of a very slow Tuesday 🌿", "watch it lean toward the window"],
  "diy & making": ["from scrap pile to actually useful 🛠️", "the moment it finally clicked"],
};

function pick<T>(arr: T[], seedIndex: number): T {
  return arr[seedIndex % arr.length];
}

export function buildSeedReels(): Reel[] {
  const now = Date.now();

  return PERSONAS.map((persona, i) => {
    const commenters = PERSONAS.filter((p) => p.id !== persona.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const comments: Comment[] = commenters.map((c) => ({
      id: uid("rc"),
      authorUsername: c.username,
      authorAvatarSeed: c.avatarSeed,
      text: fallbackComment(),
      createdAt: now - Math.floor(Math.random() * 5_000_000),
    }));

    const pool = REEL_CAPTIONS[persona.topic] ?? ["made this today"];

    return {
      id: uid("r"),
      authorUsername: persona.username,
      authorAvatarSeed: persona.avatarSeed,
      videoSrc: assetUrl(`/clips/${persona.id}.mp4`),
      frameSeeds: [
        `${persona.id}-reel-a`,
        `${persona.id}-reel-b`,
        `${persona.id}-reel-c`,
      ],
      caption: pick(pool, i),
      audioLabel: `${persona.name} · original audio`,
      likedBy: PERSONAS.filter(() => Math.random() > 0.35).map((p) => p.username),
      comments,
      createdAt: now - i * 1_800_000 - Math.floor(Math.random() * 1_800_000),
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}
