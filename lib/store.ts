"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatMessage, Comment, Post, Profile } from "./types";
import { buildSeedFeed, uid } from "./seed";
import { Reel, buildSeedReels } from "./reels";

interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  posts: Post[];
  reels: Reel[];
  chats: Record<string, ChatMessage[]>;
  setProfile: (profile: Profile) => void;
  resetEverything: () => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, comment: Comment) => void;
  addPost: (post: Post) => void;
  deletePost: (postId: string) => void;
  toggleReelLike: (reelId: string) => void;
  addReelComment: (reelId: string, comment: Comment) => void;
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
      reels: [],
      chats: {},

      markHydrated: () => set({ hydrated: true }),

      setProfile: (profile) =>
        set((state) => ({
          profile,
          posts: state.posts.length ? state.posts : buildSeedFeed(),
          reels: state.reels.length ? state.reels : buildSeedReels(),
        })),

      resetEverything: () => set({ profile: null, posts: [], reels: [], chats: {} }),

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

      toggleReelLike: (reelId) =>
        set((state) => ({
          reels: state.reels.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  likedBy: r.likedBy.includes(ME)
                    ? r.likedBy.filter((u) => u !== ME)
                    : [...r.likedBy, ME],
                }
              : r
          ),
        })),

      addReelComment: (reelId, comment) =>
        set((state) => ({
          reels: state.reels.map((r) =>
            r.id === reelId ? { ...r, comments: [...r.comments, comment] } : r
          ),
        })),

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
        reels: state.reels,
        chats: state.chats,
      }),
      onRehydrateStorage: () => (state) => {
        // Backfills reels for browsers that onboarded before Reels existed.
        if (state && state.profile && state.reels.length === 0) {
          state.reels = buildSeedReels();
        }
        state?.markHydrated();
      },
    }
  )
);

export const MY_ID = ME;
export { uid };
