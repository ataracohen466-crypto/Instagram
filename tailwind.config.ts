import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ig: {
          blue: "#0095f6",
          text: "#262626",
          muted: "#8e8e8e",
          border: "#dbdbdb",
          bg: "#fafafa",
          red: "#ed4956",
        },
      },
      fontFamily: {
        logo: ["var(--font-logo)", "cursive"],
      },
      keyframes: {
        "heart-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "15%": { transform: "scale(1.2)", opacity: "1" },
          "30%": { transform: "scale(0.95)" },
          "45%": { transform: "scale(1)" },
          "80%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "heart-pop": "heart-pop 1s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
