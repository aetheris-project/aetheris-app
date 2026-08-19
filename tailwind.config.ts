import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--aetheris-bg) / <alpha-value>)",
        surface: "rgb(var(--aetheris-surface) / <alpha-value>)",
        raised: "rgb(var(--aetheris-raised) / <alpha-value>)",
        edge: "rgb(var(--aetheris-border) / <alpha-value>)",
        ink: "rgb(var(--aetheris-fg) / <alpha-value>)",
        muted: "rgb(var(--aetheris-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--aetheris-accent) / <alpha-value>)",
          strong: "rgb(var(--aetheris-accent-strong) / <alpha-value>)",
          soft: "var(--aetheris-accent-soft)"
        },
        success: "rgb(var(--aetheris-success) / <alpha-value>)",
        danger: "rgb(var(--aetheris-danger) / <alpha-value>)",
        warning: "rgb(var(--aetheris-warning) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
