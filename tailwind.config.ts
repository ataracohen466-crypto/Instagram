import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        ink: {
          DEFAULT: "#101828",
          soft: "#344054",
          muted: "#667085",
          faint: "#98a2b3",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunk: "#f7f8fb",
          line: "#e6e8ef",
        },
        status: {
          good: "#16a34a",
          warn: "#d97706",
          bad: "#dc2626",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.06)",
        pop: "0 8px 30px rgba(16, 24, 40, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
        "flip-in": {
          from: { opacity: "0", transform: "rotateX(-12deg)" },
          to: { opacity: "1", transform: "rotateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.28s ease forwards",
        shimmer: "shimmer 1.4s linear infinite",
        "flip-in": "flip-in 0.25s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
