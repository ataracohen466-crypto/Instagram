import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--base)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        border: "var(--border)",
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        "primary-ink": "var(--primary-ink)",
        calm: "var(--calm)",
        "calm-soft": "var(--calm-soft)",
        good: "var(--good)",
        "good-soft": "var(--good-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        skin: "var(--skin)",
        "skin-soft": "var(--skin-soft)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(0.75)" },
          "50%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease both",
        "pop-in": "pop-in 0.2s ease both",
        breathe: "breathe 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,20,40,0.04), 0 12px 28px -14px rgba(20,20,40,0.14)",
        card: "0 1px 3px rgba(20,20,40,0.05), 0 1px 2px rgba(20,20,40,0.04)",
        glow: "0 0 0 1px var(--border), 0 20px 40px -20px rgba(120,100,220,0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
