import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mocha: {
          950: "#1C1410",
          900: "#241A14",
          800: "#2E2119",
          700: "#3B2A20",
          600: "#4C3728",
        },
        cream: {
          100: "#FBF3E7",
          200: "#F3E6D2",
          300: "#E4D2B4",
          400: "#B9A88E",
        },
        honey: {
          400: "#F0B860",
          500: "#E8A33D",
          600: "#C97B22",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
