import type { LucideIcon } from "lucide-react";
import {
  Home, CalendarCheck, Activity, Sparkles, Target, NotebookPen,
  HeartHandshake, Droplets, Wand2, Settings, FileBarChart, TrendingUp,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/check-in", label: "Check-In", icon: CalendarCheck },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/toolkit", label: "Toolkit", icon: HeartHandshake },
  { href: "/skin", label: "Skin", icon: Droplets },
  { href: "/story", label: "My Story", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/check-in", label: "Check-In", icon: CalendarCheck },
  { href: "/journal", label: "Journal", icon: NotebookPen },
];
