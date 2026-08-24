export interface Persona {
  id: string;
  username: string;
  name: string;
  avatarSeed: string;
  bio: string;
  topic: string;
  personality: string;
}

export interface Comment {
  id: string;
  authorUsername: string;
  authorAvatarSeed: string;
  text: string;
  createdAt: number;
  isMe?: boolean;
}

/** One slide of a post. A post with several of these renders as a carousel. */
export interface PostMedia {
  id: string;
  kind: "image" | "video";
  /** Encrypted blob in the media store — anything you upload or film. */
  mediaId?: string;
  /** A data URL, used by posts made before the media store existed. */
  url?: string;
  /** A stock-photo seed, used by the seeded AI posts. */
  seed?: string;
}

export interface Post {
  id: string;
  authorUsername: string;
  authorAvatarSeed: string;
  imageSeed: string;
  imageUrl?: string;
  /**
   * The post's slides. Absent on every post made before carousels existed,
   * which is why `postSlides()` falls back to imageUrl/imageSeed rather than
   * this being required.
   */
  media?: PostMedia[];
  caption: string;
  likedBy: string[];
  comments: Comment[];
  createdAt: number;
  /** Unshared: kept and editable, but off the feed. */
  archived?: boolean;
  isMine?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "persona";
  text: string;
  createdAt: number;
}

export interface Profile {
  username: string;
  name: string;
  avatarSeed: string;
  bio: string;
}
