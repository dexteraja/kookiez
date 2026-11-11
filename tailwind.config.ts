import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F3F1EA",
        "paper-2": "#E9E4D8",
        card: "#FFFDF8",
        ink: "#15171C",
        muted: "#5B6068",
        line: "rgba(21, 23, 28, 0.14)",
        accent: "#0038FF",
        "accent-strong": "#0029C7",
        pending: "#8A4B00",
        success: "#0B6B3A",
        danger: "#A62121",
        review: "#6D28D9",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
        "3xl": "16px",
      },
      boxShadow: {
        panel: "0 18px 44px rgba(21, 23, 28, 0.06)",
        float: "0 24px 70px rgba(21, 23, 28, 0.18)",
      },
      maxWidth: {
        page: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sheet-in": "sheet-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
