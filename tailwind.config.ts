import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0b0d",
          900: "#101216",
          800: "#171a1f",
          700: "#20242b",
          600: "#2a2f38",
          500: "#3a414d",
          400: "#5a6270",
          300: "#88909c",
          200: "#b7bec9",
          100: "#e4e7ec",
        },
        gold: {
          400: "#f3c968",
          500: "#e8a93d",
          600: "#c9852a",
          700: "#9c6620",
        },
        teal: {
          400: "#5fd9c4",
          500: "#36bfa8",
          600: "#279a87",
        },
        coral: {
          400: "#f0a98c",
          500: "#e8896a",
          600: "#cf6e4f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -8px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(232,169,61,0.25), 0 8px 32px -8px rgba(232,169,61,0.35)",
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "80%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        rise: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "string-pluck": {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.4)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        rise: "rise 0.35s ease-out both",
        pluck: "string-pluck 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
