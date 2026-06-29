import type { Config } from "tailwindcss";

// Tokens issus de docs/DESIGN_SYSTEM.md
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0E9F6E", dark: "#0B7A55", tint: "#E7F6F0" },
        ink: { DEFAULT: "#0B1220", soft: "#5B6B66" },
        surface: "#FFFFFF",
        "bg-alt": "#F7F9F8",
        line: "#E6EBE9",
        success: "#0E9F6E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#2563EB",
      },
      fontFamily: {
        // Space Mono = display/accents/chiffres ; Inter = corps
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px", control: "8px" },
      boxShadow: {
        sm: "0 1px 2px rgba(11,18,32,.06)",
        md: "0 8px 24px rgba(11,18,32,.08)",
      },
      letterSpacing: { tightish: "-0.02em" },
      maxWidth: { prose: "70ch" },
    },
  },
  plugins: [],
};
export default config;
