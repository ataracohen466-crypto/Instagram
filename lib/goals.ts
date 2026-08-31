import {
  Moon, Waves, Dumbbell, NotebookPen, Users, Brain, Star, GraduationCap, Smartphone, Sparkle,
  type LucideIcon,
} from "lucide-react";
import type { GoalCategory } from "./types";

export const GOAL_CATEGORY_META: Record<GoalCategory, { label: string; icon: LucideIcon; suggestion: string }> = {
  sleep: { label: "Sleep routine", icon: Moon, suggestion: "Improve my sleep routine" },
  stress: { label: "Stress", icon: Waves, suggestion: "Reduce everyday stress" },
  exercise: { label: "Exercise", icon: Dumbbell, suggestion: "Exercise regularly" },
  journaling: { label: "Journaling", icon: NotebookPen, suggestion: "Journal more often" },
  social: { label: "Social", icon: Users, suggestion: "Spend more time with friends" },
  mindfulness: { label: "Mindfulness", icon: Brain, suggestion: "Practice mindfulness" },
  confidence: { label: "Confidence", icon: Star, suggestion: "Build confidence" },
  "study-life": { label: "Study-life balance", icon: GraduationCap, suggestion: "Improve study-life balance" },
  "screen-time": { label: "Screen time", icon: Smartphone, suggestion: "Have more screen-free time" },
  custom: { label: "Custom", icon: Sparkle, suggestion: "" },
};

export const GOAL_CATEGORIES = Object.keys(GOAL_CATEGORY_META) as GoalCategory[];
