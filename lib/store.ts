"use client";

import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { readVault, writeVault, setActive } from "./vault";
import { clearMediaCache } from "./media";
import { ChatMessage, Comment, Post, Profile } from "./types";
import { buildSeedFeed, uid } from "./seed";
import type { Reel } from "./reels";
import { buildSeedReels } from "./reels";
import type { StoryItem } from "./stories";
import { STORY_LIFETIME_MS } from "./stories";
import type { ReelDraft } from "./drafts";
import type { ReelTemplate } from "./reelTemplates";

interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  posts: Post[];
  reels: Reel[];
  myStory: StoryItem[];
  drafts: ReelDraft[];
  /** Templates the user built themselves. */
  myTemplates: ReelTemplate[];
  /**
   * One sound preference for the whole app — reels, feed posts and
   * stories all follow it, so muting in one place stays muted everywhere.
   */
  reelsMuted: boolean;
  chats: Record<string, ChatMessage[]>;
  setProfile: (profile: Profile) => void;
  addStoryItem: (item: StoryItem) => void;
  removeStoryItem: (id: string) => void;
  saveDraft: (draft: ReelDraft) => void;
  deleteDraft: (id: string) => void;
  setReelsMuted: (muted: boolean) => void;
  saveTemplate: (template: ReelTemplate) => void;
  deleteTemplate: (id: string) => void;
  pruneStories: () => string[];
  setPostArchived: (postId: string, archived: boolean) => void;
  updatePost: (postId: string, patch: Partial<Post>) => void;
  resetEverything: () => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, comment: Comment) => void;
  addPost: (post: Post) => void;
  deletePost: (postId: string) => void;
  toggleReelLike: (reelId: string) => void;
  addReelComment: (reelId: string, comment: Comment) => void;
  addReel: (reel: Reel) => void;
  deleteReel: (reelId: string) => void;
  setReelVideo: (reelId: string, mediaId: string, duration: number) => void;
  appendChat: (personaId: string, message: ChatMessage) => void;
  markHydrated: () => void;
}

const ME = "__me__";

/**
 * The vault key only exists after a successful login, so the store starts
 * with no storage bound. `bindVault` attaches it and replays the account's
 * saved state; `unbindVault` drops it on logout.
 */
let vaultUser: string | null = null;
let vaultKey: CryptoKey | null = null;

const encryptedStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {
    if (!vaultUser || !vaultKey) return null;
    return readVault(vaultUser, vaultKey);
  },
  setItem: async (_name, value): Promise<void> => {
    if (!vaultUser || !vaultKey) return;
    await writeVault(vaultUser, vaultKey, value);
  },
  removeItem: async (): Promise<void> => {
    /* Accounts are removed via deleteAccount, not by clearing state. */
  },
};

export async function bindVault(
  username: string,
  key: CryptoKey
): Promise<void> {
  vaultUser = username;
  vaultKey = key;
  // The media store encrypts clips with this same key.
  setActive(username, key);
  await useApp.persist.rehydrate();
  // A brand-new account has no vault yet, so onRehydrateStorage may not fire.
  useApp.setState({ hydrated: true });
}

export function unbindVault(): void {
  vaultUser = null;
  vaultKey = null;
  // Drop decrypted clip URLs so one account's media can't leak into the next.
  clearMediaCache();
  useApp.setState({ profile: null, posts: [], reels: [], myStory: [], drafts: [], myTemplates: [], chats: {} });
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: null,
      posts: [],
      reels: [],
      myStory: [],
      drafts: [],
      myTemplates: [],
      reelsMuted: true,
      chats: {},

      markHydrated: () => set({ hydrated: true }),

      setProfile: (profile) =>
        set((state) => ({
          profile,
          posts: state.posts.length ? state.posts : buildSeedFeed(),
          reels: state.reels.length ? state.reels : buildSeedReels(),
        })),

      resetEverything: () =>
        set({ profile: null, posts: [], reels: [], myStory: [], drafts: [], myTemplates: [], chats: {} }),

      addStoryItem: (item) =>
        set((state) => ({ myStory: [...state.myStory, item] })),

      removeStoryItem: (id) =>
        set((state) => ({ myStory: state.myStory.filter((s) => s.id !== id) })),

      // Re-saving a draft replaces it in place and floats it to the top.
      saveDraft: (draft) =>
        set((state) => ({
          drafts: [draft, ...state.drafts.filter((d) => d.id !== draft.id)],
        })),

      deleteDraft: (id) =>
        set((state) => ({ drafts: state.drafts.filter((d) => d.id !== id) })),

      setReelsMuted: (muted) => set({ reelsMuted: muted }),

      // Editing a template replaces it rather than adding a near-duplicate.
      saveTemplate: (template) =>
        set((state) => ({
          myTemplates: [
            template,
            ...state.myTemplates.filter((t) => t.id !== template.id),
          ],
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          myTemplates: state.myTemplates.filter((t) => t.id !== id),
        })),

      /**
       * Drops story items past their 24 hours and reports the media ids that
       * went with them, so the caller can free the encrypted blobs too —
       * filtering them out of the UI alone would leave the clips on disk
       * forever.
       */
      pruneStories: () => {
        const now = Date.now();
        const state = get();
        const expired = state.myStory.filter(
          (item) => now - item.createdAt >= STORY_LIFETIME_MS
        );
        if (expired.length === 0) return [];
        set({
          myStory: state.myStory.filter(
            (item) => now - item.createdAt < STORY_LIFETIME_MS
          ),
        });
        return expired
          .map((item) => item.mediaId)
          .filter((id): id is string => Boolean(id));
      },

      setPostArchived: (postId, archived) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, archived } : p
          ),
        })),

      updatePost: (postId, patch) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, ...patch } : p
          ),
        })),

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

      addReel: (reel) => set((state) => ({ reels: [reel, ...state.reels] })),

      deleteReel: (reelId) =>
        set((state) => ({ reels: state.reels.filter((r) => r.id !== reelId) })),

      setReelVideo: (reelId, mediaId, duration) =>
        set((state) => ({
          reels: state.reels.map((r) =>
            r.id === reelId
              ? { ...r, videoMediaId: mediaId, durationSeconds: duration }
              : r
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
      name: "instaai-vault",
      storage: createJSONStorage(() => encryptedStorage),
      // Nothing loads until a password unlocks the vault.
      skipHydration: true,
      partialize: (state) => ({
        profile: state.profile,
        posts: state.posts,
        reels: state.reels,
        myStory: state.myStory,
        drafts: state.drafts,
        myTemplates: state.myTemplates,
        reelsMuted: state.reelsMuted,
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
