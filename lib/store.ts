"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatMessage, Comment, Post, Profile } from "./types";
import { buildSeedFeed, uid } from "./seed";

interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  posts: Post[];
  chats: Record<string, ChatMessage[]>;
  setProfile: (profile: Profile) => void;
  resetEverything: () => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, comment: Comment) => void;
  addPost: (post: Post) => void;
  deletePost: (postId: string) => void;
  appendChat: (personaId: string, message: ChatMessage) => void;
  markHydrated: () => void;
}

const ME = "__me__";

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      profile: null,
      posts: [],
      chats: {},

      markHydrated: () => set({ hydrated: true }),

      setProfile: (profile) =>
        set((state) => ({
          profile,
          posts: state.posts.length ? state.posts : buildSeedFeed(),
        })),

      resetEverything: () => set({ profile: null, posts: [], chats: {} }),

      toggleLike: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likedBy: p.likedBy.includes(ME)
                    ? p.likedBy.filter((u) => u !== ME)
                    : [...p.likedBy, ME],
                }
              : p
          ),
        })),

      addComment: (postId, comment) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
          ),
        })),

      addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

      deletePost: (postId) =>
        set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) })),

      appendChat: (personaId, message) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [personaId]: [...(state.chats[personaId] ?? []), message],
          },
        })),
    }),
    {
      name: "instaai-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        posts: state.posts,
        chats: state.chats,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

export const MY_ID = ME;
export { uid };
