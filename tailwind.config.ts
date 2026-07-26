import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16241E",
        moss: "#445D48",
        "moss-light": "#6E8A70",
        trail: "#8A7C5A",
        gold: "#C99A3D",
        sky: "#4C7A8C",
        paper: "#EDEAE1",
        line: "#D8D3C4",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        contour:
          "repeating-radial-gradient(circle at 20% 30%, rgba(22,36,30,0.05) 0, rgba(22,36,30,0.05) 1px, transparent 1px, transparent 14px)",
      },
    },
  },
  plugins: [],
};

export default config;
