"use client";

import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import {
  Book,
  BOOK_COLORS,
  Chapter,
  CodexEntry,
  CodexType,
  Scene,
  Settings,
} from "./types";
import { dateKey, totalWords } from "./words";
import { readVault, writeVault, setActive } from "./vault";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * The store only reads and writes through an unlocked account vault, so it
 * holds nothing until `bindVault` runs after a successful login.
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

/** Attaches an unlocked account and replays its saved books into the store. */
export async function bindVault(username: string, key: CryptoKey): Promise<void> {
  vaultUser = username;
  vaultKey = key;
  setActive(username, key);
  await useStore.persist.rehydrate();
  useStore.getState().markHydrated();
}

const LEGACY_KEY = "inkwell.store";

/**
 * Books written before accounts existed live in plain localStorage. On the
 * first account created, fold them into that account's vault rather than
 * stranding them. The old copy is kept under a renamed key as a safety net.
 */
export async function adoptLegacyBooks(): Promise<boolean> {
  try {
    if (localStorage.getItem(`${LEGACY_KEY}.adopted`)) return false;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as {
      state?: { books?: Book[]; settings?: Settings; history?: Record<string, number> };
    };
    const books = parsed.state?.books;
    if (!Array.isArray(books) || books.length === 0) return false;

    // setState alone persists: zustand writes through to the bound vault on
    // every change, so this lands the adopted books in the account.
    useStore.setState({
      books,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.state?.settings ?? {}) },
      history: parsed.state?.history ?? {},
      totalWordsCache: totalWords(books),
    });
    // The original is deliberately left where it is — it costs a few KB and
    // it is the only copy if anything about this import goes wrong. A flag
    // stops a second account from adopting the same books.
    localStorage.setItem(`${LEGACY_KEY}.adopted`, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/** Drops the account on logout so the next person sees nothing. */
export function unbindVault(): void {
  vaultUser = null;
  vaultKey = null;
  useStore.setState({
    books: [],
    history: {},
    totalWordsCache: 0,
    hydrated: false,
    signedInAs: null,
  });
}

function emptyScene(title: string): Scene {
  const now = Date.now();
  return {
    id: uid(),
    title,
    content: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function emptyChapter(title: string, withScene = true): Chapter {
  return {
    id: uid(),
    title,
    scenes: withScene ? [emptyScene("Scene 1")] : [],
  };
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  font: "serif",
  editorWidth: "normal",
  typewriterMode: false,
  dailyGoal: 500,
};

interface AppState {
  hydrated: boolean;
  /** Whose vault is currently unlocked. Session-only, never persisted. */
  signedInAs: string | null;
  books: Book[];
  settings: Settings;
  history: Record<string, number>;
  totalWordsCache: number;

  markHydrated: () => void;
  setSignedInAs: (username: string | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  createBook: (input: { title: string; genre?: string; synopsis?: string }) => string;
  updateBook: (bookId: string, patch: Partial<Pick<Book, "title" | "genre" | "synopsis" | "dailyGoal" | "color">>) => void;
  deleteBook: (bookId: string) => void;

  addChapter: (bookId: string, title?: string) => string;
  updateChapter: (bookId: string, chapterId: string, patch: Partial<Pick<Chapter, "title" | "collapsed">>) => void;
  deleteChapter: (bookId: string, chapterId: string) => void;
  reorderChapter: (bookId: string, chapterId: string, direction: -1 | 1) => void;

  addScene: (bookId: string, chapterId: string, title?: string) => string;
  updateScene: (
    bookId: string,
    chapterId: string,
    sceneId: string,
    patch: Partial<Pick<Scene, "title" | "content" | "notes">>
  ) => void;
  deleteScene: (bookId: string, chapterId: string, sceneId: string) => void;
  reorderScene: (bookId: string, chapterId: string, sceneId: string, direction: -1 | 1) => void;
  moveSceneToChapter: (bookId: string, fromChapterId: string, sceneId: string, toChapterId: string) => void;

  addCodexEntry: (bookId: string, type: CodexType, name: string) => string;
  updateCodexEntry: (bookId: string, entryId: string, patch: Partial<Pick<CodexEntry, "name" | "description" | "type">>) => void;
  deleteCodexEntry: (bookId: string, entryId: string) => void;

  recordProgress: () => void;
}

function touch<T extends { updatedAt: number }>(obj: T): T {
  return { ...obj, updatedAt: Date.now() };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      signedInAs: null,
      books: [],
      settings: DEFAULT_SETTINGS,
      history: {},
      totalWordsCache: 0,

      markHydrated: () => set({ hydrated: true }),
      setSignedInAs: (username) => set({ signedInAs: username }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      createBook: ({ title, genre = "", synopsis = "" }) => {
        const id = uid();
        const now = Date.now();
        const color = BOOK_COLORS[get().books.length % BOOK_COLORS.length];
        const book: Book = {
          id,
          title: title.trim() || "Untitled Book",
          genre,
          synopsis,
          color,
          createdAt: now,
          updatedAt: now,
          dailyGoal: get().settings.dailyGoal,
          chapters: [emptyChapter("Chapter 1")],
          codex: [],
        };
        set((s) => ({ books: [book, ...s.books] }));
        return id;
      },

      updateBook: (bookId, patch) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === bookId ? touch({ ...b, ...patch }) : b)),
        })),

      deleteBook: (bookId) => {
        set((s) => ({ books: s.books.filter((b) => b.id !== bookId) }));
        get().recordProgress();
      },

      addChapter: (bookId, title) => {
        const id = uid();
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            const chapter = emptyChapter(title?.trim() || `Chapter ${b.chapters.length + 1}`);
            return touch({ ...b, chapters: [...b.chapters, { ...chapter, id }] });
          }),
        }));
        return id;
      },

      updateChapter: (bookId, chapterId, patch) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id !== bookId
              ? b
              : touch({
                  ...b,
                  chapters: b.chapters.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
                })
          ),
        })),

      deleteChapter: (bookId, chapterId) => {
        set((s) => ({
          books: s.books.map((b) =>
            b.id !== bookId
              ? b
              : touch({ ...b, chapters: b.chapters.filter((c) => c.id !== chapterId) })
          ),
        }));
        get().recordProgress();
      },

      reorderChapter: (bookId, chapterId, direction) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            const idx = b.chapters.findIndex((c) => c.id === chapterId);
            const target = idx + direction;
            if (idx < 0 || target < 0 || target >= b.chapters.length) return b;
            const chapters = [...b.chapters];
            [chapters[idx], chapters[target]] = [chapters[target], chapters[idx]];
            return touch({ ...b, chapters });
          }),
        })),

      addScene: (bookId, chapterId, title) => {
        const id = uid();
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            return touch({
              ...b,
              chapters: b.chapters.map((c) => {
                if (c.id !== chapterId) return c;
                const scene = emptyScene(title?.trim() || `Scene ${c.scenes.length + 1}`);
                return { ...c, scenes: [...c.scenes, { ...scene, id }] };
              }),
            });
          }),
        }));
        return id;
      },

      updateScene: (bookId, chapterId, sceneId, patch) => {
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            return touch({
              ...b,
              chapters: b.chapters.map((c) => {
                if (c.id !== chapterId) return c;
                return {
                  ...c,
                  scenes: c.scenes.map((sc) =>
                    sc.id === sceneId ? { ...sc, ...patch, updatedAt: Date.now() } : sc
                  ),
                };
              }),
            });
          }),
        }));
        get().recordProgress();
      },

      deleteScene: (bookId, chapterId, sceneId) => {
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            return touch({
              ...b,
              chapters: b.chapters.map((c) =>
                c.id !== chapterId ? c : { ...c, scenes: c.scenes.filter((sc) => sc.id !== sceneId) }
              ),
            });
          }),
        }));
        get().recordProgress();
      },

      reorderScene: (bookId, chapterId, sceneId, direction) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            return touch({
              ...b,
              chapters: b.chapters.map((c) => {
                if (c.id !== chapterId) return c;
                const idx = c.scenes.findIndex((sc) => sc.id === sceneId);
                const target = idx + direction;
                if (idx < 0 || target < 0 || target >= c.scenes.length) return c;
                const scenes = [...c.scenes];
                [scenes[idx], scenes[target]] = [scenes[target], scenes[idx]];
                return { ...c, scenes };
              }),
            });
          }),
        })),

      moveSceneToChapter: (bookId, fromChapterId, sceneId, toChapterId) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId || fromChapterId === toChapterId) return b;
            const fromChapter = b.chapters.find((c) => c.id === fromChapterId);
            const scene = fromChapter?.scenes.find((sc) => sc.id === sceneId);
            if (!scene) return b;
            return touch({
              ...b,
              chapters: b.chapters.map((c) => {
                if (c.id === fromChapterId) return { ...c, scenes: c.scenes.filter((sc) => sc.id !== sceneId) };
                if (c.id === toChapterId) return { ...c, scenes: [...c.scenes, scene] };
                return c;
              }),
            });
          }),
        })),

      addCodexEntry: (bookId, type, name) => {
        const id = uid();
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            const entry: CodexEntry = {
              id,
              type,
              name: name.trim() || "Untitled",
              description: "",
              createdAt: Date.now(),
            };
            return touch({ ...b, codex: [...b.codex, entry] });
          }),
        }));
        return id;
      },

      updateCodexEntry: (bookId, entryId, patch) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id !== bookId
              ? b
              : touch({
                  ...b,
                  codex: b.codex.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
                })
          ),
        })),

      deleteCodexEntry: (bookId, entryId) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id !== bookId ? b : touch({ ...b, codex: b.codex.filter((e) => e.id !== entryId) })
          ),
        })),

      recordProgress: () => {
        const s = get();
        const now = totalWords(s.books);
        const delta = now - s.totalWordsCache;
        if (delta > 0) {
          const key = dateKey();
          set({
            history: { ...s.history, [key]: (s.history[key] ?? 0) + delta },
            totalWordsCache: now,
          });
        } else if (delta !== 0) {
          set({ totalWordsCache: now });
        }
      },
    }),
    {
      name: "inkwell.store",
      storage: createJSONStorage(() => encryptedStorage),
      // Nothing is loaded until an account is unlocked, so the store must not
      // auto-hydrate on mount — bindVault drives that instead.
      skipHydration: true,
      partialize: (s) => ({
        books: s.books,
        settings: s.settings,
        history: s.history,
        totalWordsCache: s.totalWordsCache,
      }),
      version: 1,
    }
  )
);
