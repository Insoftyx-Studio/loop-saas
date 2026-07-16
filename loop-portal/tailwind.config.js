/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        sunk: "rgb(var(--sunk) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-mute": "rgb(var(--ink-mute) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        edge: "rgb(var(--edge) / <alpha-value>)",
        "edge-soft": "rgb(var(--edge-soft) / <alpha-value>)",
        "edge-strong": "rgb(var(--edge-strong) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        approved: "rgb(var(--approved) / <alpha-value>)",
        pending: "rgb(var(--pending) / <alpha-value>)",
        overdue: "rgb(var(--overdue) / <alpha-value>)",
        todo: "rgb(var(--todo) / <alpha-value>)",
        progress: "rgb(var(--progress) / <alpha-value>)",
        done: "rgb(var(--done) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Satoshi"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Clash Display"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        lift: "0 1px 2px -1px rgb(0 0 0 / 0.05), 0 6px 16px -8px rgb(0 0 0 / 0.10)",
        pop: "0 10px 30px -10px rgb(0 0 0 / 0.20), 0 4px 10px -4px rgb(0 0 0 / 0.10)",
        ring: "0 0 0 1px rgb(var(--edge) / 0.9)",
        glow: "0 10px 40px -8px rgb(var(--accent) / 0.42), 0 2px 10px -2px rgb(var(--accent) / 0.28)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        inout: "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};
