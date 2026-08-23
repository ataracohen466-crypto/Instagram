export type EditorFont = "serif" | "sans" | "mono";
export type ThemeName = "light" | "dark" | "sepia";
export type CodexType = "character" | "location" | "item" | "note";

export interface Scene {
  id: string;
  title: string;
  content: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
  collapsed?: boolean;
}

export interface CodexEntry {
  id: string;
  type: CodexType;
  name: string;
  description: string;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  dailyGoal: number;
  chapters: Chapter[];
  codex: CodexEntry[];
}

export interface Settings {
  theme: ThemeName;
  font: EditorFont;
  editorWidth: "narrow" | "normal" | "wide";
  typewriterMode: boolean;
  dailyGoal: number;
}

export const BOOK_COLORS = [
  "#8a6d5c", // walnut
  "#5c6f8a", // slate blue
  "#6f8a5c", // moss
  "#8a5c76", // plum
  "#8a7a5c", // brass
  "#5c8a83", // teal
  "#8a5c5c", // brick
  "#6a5c8a", // violet
];
