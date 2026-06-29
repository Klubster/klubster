import type { Config } from "tailwindcss";

// DA Klubster — éditorial magazine-carnet. Voir memory: klubster-design-language.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#111111", soft: "#8C8C88", faint: "#C2C2BD" },
        brand: { DEFAULT: "#279B65", dark: "#1E7A4F" }, // vert ACCENT ≤5%
        paper: "#FCFCFA",
        surface: "#FFFFFF",
        "bg-alt": "#F5F5F3",
        line: "rgba(17,17,17,0.07)",
        success: "#279B65",
        warning: "#B8860B",
        danger: "#B23B3B",
        info: "#2D5B7A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        logo: ["var(--font-logo)", "var(--font-mono)", "monospace"],
      },
      maxWidth: { prose: "62ch" },
      letterSpacing: { label: "0.18em" },
    },
  },
  plugins: [],
};
export default config;
