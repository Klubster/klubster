import type { Config } from "tailwindcss";

// DA Klubster — éditorial magazine-carnet. Voir memory: klubster-design-language.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens en CSS variables (défauts = mode blanc, voir globals.css) pour permettre
        // les templates blanc/noir des sites clubs (src/lib/themes.ts). Rendu identique par défaut.
        ink: { DEFAULT: "rgb(var(--k-ink) / <alpha-value>)", soft: "var(--k-ink-soft)", faint: "var(--k-ink-faint)" },
        brand: { DEFAULT: "#279B65", dark: "#1E7A4F" }, // vert ACCENT ≤5%
        paper: "rgb(var(--k-paper) / <alpha-value>)",
        surface: "var(--k-surface)",
        "bg-alt": "var(--k-bg-alt)",
        line: "var(--k-line)",
        // Statuts : valeurs choisies pour passer AA (≥ 4,5:1) en petit texte sur papier.
        // `#279B65` (3,1:1) et `#B8860B` (2,9:1) restent pour l'accent graphique (`brand`),
        // jamais pour du texte de statut — c'est la raison des 29 `#8A6508` inline
        // que cette passe résorbe (voir docs/lot-s-inventaire-interface.md).
        success: { DEFAULT: "#1E7A4F", soft: "#F1F7F3" },
        warning: "#8A6508",
        danger: { DEFAULT: "#B23B3B", soft: "#FBEDED" },
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
