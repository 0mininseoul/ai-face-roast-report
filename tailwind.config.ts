import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
          raised: "var(--bg-raised)",
        },
        border: {
          DEFAULT: "var(--border)",
          bright: "var(--border-bright)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        accent: {
          info: "var(--accent-info)",
          warn: "var(--accent-warn)",
          bad: "var(--accent-bad)",
          ok: "var(--accent-ok)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 24px 80px rgb(0 0 0 / 0.38), inset 0 1px 0 rgb(255 255 255 / 0.06)",
        panel: "0 18px 44px rgb(0 0 0 / 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config;
