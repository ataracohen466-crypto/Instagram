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

export interface Post {
  id: string;
  authorUsername: string;
  authorAvatarSeed: string;
  imageSeed: string;
  imageUrl?: string;
  caption: string;
  likedBy: string[];
  comments: Comment[];
  createdAt: number;
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
