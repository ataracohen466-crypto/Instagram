"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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
  books: Book[];
  settings: Settings;
  history: Record<string, number>;
  totalWordsCache: number;

  markHydrated: () => void;
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
      books: [],
      settings: DEFAULT_SETTINGS,
      history: {},
      totalWordsCache: 0,

      markHydrated: () => set({ hydrated: true }),

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

      deleteBook: (bookId) =>
        set((s) => ({ books: s.books.filter((b) => b.id !== bookId) })),

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

      deleteChapter: (bookId, chapterId) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id !== bookId
              ? b
              : touch({ ...b, chapters: b.chapters.filter((c) => c.id !== chapterId) })
          ),
        })),

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

      deleteScene: (bookId, chapterId, sceneId) =>
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
        })),

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
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
          : localStorage
      ),
      partialize: (s) => ({
        books: s.books,
        settings: s.settings,
        history: s.history,
        totalWordsCache: s.totalWordsCache,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      version: 1,
    }
  )
);
