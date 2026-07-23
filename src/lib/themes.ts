// Templates de design des sites clubs — 6 directions typographiques, chacune en blanc ou noir.
// Choisis à l'étape 01 de /creer, stockés sur organisations.theme_template / theme_mode,
// appliqués à la vitrine via <ThemeVitrine> (CSS variables).
// Les polices sont auto-hébergées par next/font (src/lib/polices-vitrines.ts) : les piles
// ci-dessous référencent leurs variables CSS — plus aucune requête vers Google Fonts,
// conformément à la promesse du layout racine et à la politique de confidentialité.
// Inter et Space Mono viennent du layout racine (--kb-inter / --kb-space-mono).
import type { CSSProperties } from "react";

export type ThemeTemplateId = "editorial" | "classique" | "grotesque" | "rond" | "athletique" | "brut";
export type ThemeMode = "blanc" | "noir";

export interface ThemeTemplate {
  id: ThemeTemplateId;
  label: string;
  description: string;
  sans: string; // pile font-family du texte courant
  mono: string; // pile font-family des labels/chiffres
}

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: "editorial",
    label: "Éditorial",
    description: "Magazine sobre, précis. Le style Klubster.",
    sans: 'var(--kb-inter), "Inter", system-ui, sans-serif',
    mono: 'var(--kb-space-mono), "Space Mono", ui-monospace, monospace',
  },
  {
    id: "classique",
    label: "Classique",
    description: "Serif élégant, institutionnel, intemporel.",
    sans: 'var(--gf-source-serif), "Source Serif 4", Georgia, serif',
    mono: 'var(--gf-plex-mono), "IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "grotesque",
    label: "Grotesque",
    description: "Sans-serif affirmé, contemporain, direct.",
    sans: 'var(--gf-archivo), "Archivo", system-ui, sans-serif',
    mono: 'var(--gf-dm-mono), "DM Mono", ui-monospace, monospace',
  },
  {
    id: "rond",
    // « Formes douces » mentait : border-radius: 0 s'applique partout (globals.css),
    // seule la typographie est ronde. La description dit désormais ce que le club aura.
    label: "Rond",
    description: "Typographie ronde, accueillante, familiale.",
    sans: 'var(--gf-nunito), "Nunito", system-ui, sans-serif',
    mono: 'var(--gf-red-hat-mono), "Red Hat Mono", ui-monospace, monospace',
  },
  {
    id: "athletique",
    label: "Athlétique",
    description: "Condensé, énergique, esprit compétition.",
    sans: 'var(--gf-barlow-semi), "Barlow Semi Condensed", system-ui, sans-serif',
    mono: 'var(--gf-plex-mono), "IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "brut",
    label: "Brut",
    description: "Tout en mono, radical, esprit carnet.",
    sans: 'var(--kb-space-mono), "Space Mono", ui-monospace, monospace',
    mono: 'var(--kb-space-mono), "Space Mono", ui-monospace, monospace',
  },
];

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: "blanc", label: "Blanc" },
  { id: "noir", label: "Noir" },
];

// Palettes : mêmes tokens que la DA (voir tailwind.config + globals.css).
// ink / paper en triplets RGB (nécessaires aux modificateurs d'opacité Tailwind).
interface Palette {
  ink: string;
  inkSoft: string;
  inkFaint: string;
  paper: string;
  bgAlt: string;
  surface: string;
  line: string;
}

const PALETTES: Record<ThemeMode, Palette> = {
  blanc: {
    // inkSoft porte le texte de lecture des vitrines : #8C8C88 plafonnait à 3,3:1 sur
    // le papier (sous AA). Même valeur que le token de la plateforme (globals.css).
    ink: "17 17 17",
    inkSoft: "#6f6f6b",
    inkFaint: "#C2C2BD",
    paper: "252 252 250",
    bgAlt: "#F5F5F3",
    surface: "#FFFFFF",
    line: "rgba(17,17,17,0.07)",
  },
  noir: {
    ink: "244 244 241",
    inkSoft: "#9C9C97",
    inkFaint: "#4B4B47",
    paper: "19 19 18",
    bgAlt: "#1C1C1A",
    surface: "#161615",
    line: "rgba(244,244,241,0.14)",
  },
};

export function getTemplate(id: string | null | undefined): ThemeTemplate {
  return THEME_TEMPLATES.find((t) => t.id === id) ?? THEME_TEMPLATES[0];
}

export function getMode(id: string | null | undefined): ThemeMode {
  return id === "noir" ? "noir" : "blanc";
}

// Variables CSS à poser sur le conteneur du site club.
export function themeStyle(templateId: string | null | undefined, modeId: string | null | undefined): CSSProperties {
  const t = getTemplate(templateId);
  const p = PALETTES[getMode(modeId)];
  return {
    "--font-sans": t.sans,
    "--font-mono": t.mono,
    "--k-ink": p.ink,
    "--k-ink-soft": p.inkSoft,
    "--k-ink-faint": p.inkFaint,
    "--k-paper": p.paper,
    "--k-bg-alt": p.bgAlt,
    "--k-surface": p.surface,
    "--k-line": p.line,
  } as CSSProperties;
}
