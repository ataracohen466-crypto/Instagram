"use client";

import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Flame,
  Globe2,
  Landmark,
  Languages,
  Layers,
  Leaf,
  Music,
  Palette,
  Sigma,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Flame,
  Globe2,
  Landmark,
  Languages,
  Layers,
  Leaf,
  Music,
  Palette,
  Sigma,
  Star,
  Trophy,
};

export const SUBJECT_ICON_NAMES = [
  "BookOpen",
  "Leaf",
  "FlaskConical",
  "Atom",
  "Sigma",
  "Calculator",
  "Landmark",
  "Globe2",
  "Languages",
  "Palette",
  "Music",
  "Brain",
];

export const SUBJECT_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#16a34a",
  "#b45309",
  "#db2777",
  "#7c3aed",
  "#dc2626",
  "#0f766e",
];

export function subjectIcon(name: string): LucideIcon {
  return SUBJECT_ICONS[name] ?? BookOpen;
}
